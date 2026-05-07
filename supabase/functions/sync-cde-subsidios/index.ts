import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const RESOURCE_ID = "325c828c-1cde-485e-9571-a412fa64f768";

// Use CKAN datastore_search API with pagination
async function fetchPage(offset: number, limit: number): Promise<{ records: any[]; total: number }> {
  const url = `https://dadosabertos.aneel.gov.br/api/3/action/datastore_search?resource_id=${RESOURCE_ID}&q=CELG&limit=${limit}&offset=${offset}`;
  
  const resp = await fetch(url, {
    headers: { "Accept": "application/json" },
    signal: AbortSignal.timeout(30000),
  });
  
  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`CKAN ${resp.status}: ${body.slice(0, 200)}`);
  }

  const data = await resp.json();
  if (!data.success) throw new Error(`CKAN error: ${JSON.stringify(data.error)}`);

  return {
    records: data.result?.records || [],
    total: data.result?.total || 0,
  };
}

function parseValor(v: string | number | null): number | null {
  if (v == null || v === "") return null;
  if (typeof v === "number") return v;
  const cleaned = v.replace(/\s/g, "");
  if (cleaned.includes(",")) {
    return parseFloat(cleaned.replace(/\./g, "").replace(",", ".")) || null;
  }
  return parseFloat(cleaned) || null;
}

function extractYear(d: string): number | null {
  const m = (d || "").match(/(\d{4})/);
  return m ? parseInt(m[1]) : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    // Fetch all CELG records (about 2703 total, paginated)
    const allRecords: any[] = [];
    let offset = 0;
    const pageSize = 500;

    // First page to get total
    const first = await fetchPage(0, pageSize);
    allRecords.push(...first.records);
    const total = first.total;
    console.log(`Total CELG records: ${total}, got first ${first.records.length}`);

    offset = pageSize;
    while (offset < total && offset < 5000) {
      await new Promise((r) => setTimeout(r, 300));
      const page = await fetchPage(offset, pageSize);
      allRecords.push(...page.records);
      console.log(`Fetched ${allRecords.length}/${total}`);
      if (page.records.length < pageSize) break;
      offset += pageSize;
    }

    // Aggregate by year + tipo_subsidio (monthly data -> annual)
    const aggregated = new Map<string, {
      distribuidora: string;
      ano: number;
      tipo_subsidio: string;
      valor_total: number;
      meses: number;
    }>();

    for (const row of allRecords) {
      const dist = (row.NomAgente || "").trim();
      const tipo = (row.DscTipoSubsidio || "Geral").trim();
      const ano = extractYear(row.DatSubsidio);
      const valor = parseValor(row.VlrSubsidio);

      if (!ano || ano < 2015) continue;

      const key = `${ano}|${tipo}`;
      if (aggregated.has(key)) {
        const agg = aggregated.get(key)!;
        agg.valor_total += valor || 0;
        agg.meses++;
      } else {
        aggregated.set(key, {
          distribuidora: dist || "CELG-D CELG DISTRIBUIÇÃO S.A.",
          ano,
          tipo_subsidio: tipo,
          valor_total: valor || 0,
          meses: 1,
        });
      }
    }

    console.log(`Aggregated ${aggregated.size} groups`);

    let inserted = 0;
    const errors: string[] = [];

    for (const agg of aggregated.values()) {
      const { error } = await supabase
        .from("cde_subsidios")
        .upsert({
          distribuidora: agg.distribuidora,
          uf: "GO",
          ano: agg.ano,
          tipo_subsidio: agg.tipo_subsidio,
          beneficiarios: null,
          valor_subsidio: agg.valor_total || null,
          fonte_url: "https://dadosabertos.aneel.gov.br/dataset/subsidios-tarifarios",
        }, { onConflict: "distribuidora,ano,tipo_subsidio" });

      if (error) {
        errors.push(`${agg.ano}/${agg.tipo_subsidio}: ${error.message}`);
      } else {
        inserted++;
      }
    }

    try {
      await supabase.from("sync_log").insert({
        tipo: "cde_subsidios",
        status: errors.length > 0 ? "partial" : "success",
        detalhes: { inserted, total_records: allRecords.length, aggregated: aggregated.size, errors: errors.length },
        finished_at: new Date().toISOString(),
      });
    } catch (_e) { /* ignore */ }

    return new Response(
      JSON.stringify({ success: true, total_records: allRecords.length, inserted, errors }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);

    try {
      await supabase.from("sync_log").insert({
        tipo: "cde_subsidios",
        status: "error",
        detalhes: { error: error.message },
        finished_at: new Date().toISOString(),
      });
    } catch (_e) { /* ignore */ }

    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

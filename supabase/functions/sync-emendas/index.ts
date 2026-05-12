import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * sync-emendas: Fetches emendas parlamentares estaduais destinadas a Morrinhos
 * from the Goiás Open Data (CKAN) API and upserts into emendas_parlamentares table.
 *
 * Data source: https://dadosabertos.go.gov.br/dataset/emendas-parlamentares
 * API: CKAN Datastore API (no authentication required)
 *
 * Strategy:
 * 1. Discover available datastore resources from the CKAN package
 * 2. For each resource with datastore_active=true, query for MORRINHOS
 * 3. Delete stale estadual CKAN-sourced records, then insert fresh data
 */

const CKAN_BASE = "https://dadosabertos.go.gov.br/api/3/action";
const PACKAGE_ID = "emendas-parlamentares";
const MUNICIPALITY = "MORRINHOS";
const FONTE_URL_PREFIX = "https://dadosabertos.go.gov.br/dataset/emendas-parlamentares";

type CkanRecord = {
  "_id": number;
  "Exercicio (Ano)": string;
  "Numero Emenda": string;
  "Autor (Deputado)": string;
  "Objeto": string;
  "Municipio (Beneficiario)": string;
  "Beneficiario (Nome)": string;
  "Valor Empenho": string;
  "Liquidacao (Saldo)": string;
  "OP (Saldo)": string;
  "Funcao (Nome)": string;
  "Descricao Despesa": string;
  [key: string]: unknown;
};

function parseNumber(val: unknown): number {
  if (val == null || val === "") return 0;
  const s = String(val).replace(/\./g, "").replace(",", ".");
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function cleanObjeto(obj: string, descricao: string, funcao: string): string {
  // If objeto is vague ("A definir", "Custeio", etc.), enrich from descricao
  const vaguePatterns = /^(a definir|custeio|transferência especial)/i;
  let result = obj?.trim() || "";

  if (!result || vaguePatterns.test(result)) {
    // Try to extract meaningful info from Descricao Despesa
    const match = descricao?.match(/Objeto da Emenda[:\s]*(.+?)(?:\.|$)/i);
    if (match && match[1].trim().length > 5) {
      result = match[1].trim();
    }
  }

  // Prefix with area if informative
  if (funcao && !["ADMINISTRAÇÃO"].includes(funcao) && !result.toLowerCase().includes(funcao.toLowerCase())) {
    result = `${funcao} - ${result}`;
  }

  // Capitalize first letter
  if (result) {
    result = result.charAt(0).toUpperCase() + result.slice(1);
  }

  return result || "A definir";
}

function formatAutorNome(raw: string): string {
  // CKAN uses uppercase: "AMAURI RIBEIRO" → "Amauri Ribeiro"
  if (!raw) return raw;
  return raw
    .split(" ")
    .map(w => {
      if (["DA", "DE", "DO", "DAS", "DOS", "E"].includes(w)) return w.toLowerCase();
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    })
    .join(" ");
}

async function fetchCkanRecords(resourceId: string): Promise<CkanRecord[]> {
  const allRecords: CkanRecord[] = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const url = `${CKAN_BASE}/datastore_search?resource_id=${resourceId}&filters=${encodeURIComponent(
      JSON.stringify({ "Municipio (Beneficiario)": MUNICIPALITY })
    )}&limit=${limit}&offset=${offset}`;

    console.log(`Fetching CKAN offset=${offset}...`);
    const resp = await fetch(url);
    if (!resp.ok) {
      console.error(`CKAN API error: ${resp.status}`);
      break;
    }

    const json = await resp.json();
    if (!json.success) {
      console.error("CKAN API returned success=false");
      break;
    }

    const records = json.result?.records || [];
    allRecords.push(...records);

    if (records.length < limit) break;
    offset += limit;
  }

  return allRecords;
}

async function discoverResources(): Promise<{ id: string; name: string }[]> {
  const url = `${CKAN_BASE}/package_show?id=${PACKAGE_ID}`;
  const resp = await fetch(url);
  if (!resp.ok) {
    console.error(`Failed to discover resources: ${resp.status}`);
    return [];
  }
  const json = await resp.json();
  if (!json.success) return [];

  const resources = json.result?.resources || [];
  return resources
    .filter((r: any) => r.datastore_active === true)
    .map((r: any) => ({ id: r.id, name: r.name || r.description || "" }));
}

// === Auth guard: validates CRON_SECRET or service_role bearer ===
function authorize(req: Request): boolean {
  const cronSecret = Deno.env.get("CRON_SECRET");
  const headerCron = req.headers.get("x-cron-secret");
  if (cronSecret && headerCron === cronSecret) return true;
  const auth = req.headers.get("authorization") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (serviceKey && auth === `Bearer ${serviceKey}`) return true;
  return false;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  if (!authorize(req)) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    // 1. Discover which CKAN resources have active datastores
    const resources = await discoverResources();
    console.log(`Found ${resources.length} active datastore resources:`, resources.map(r => r.name));

    if (resources.length === 0) {
      throw new Error("No active CKAN datastore resources found for emendas parlamentares");
    }

    // 2. Fetch all MORRINHOS records from each resource
    const allRecords: CkanRecord[] = [];
    for (const resource of resources) {
      console.log(`Fetching from resource: ${resource.name} (${resource.id})`);
      const records = await fetchCkanRecords(resource.id);
      console.log(`  → ${records.length} records for ${MUNICIPALITY}`);
      allRecords.push(...records);
    }

    // 3. Deduplicate by (Numero Emenda + Exercicio Ano) - keep latest
    const deduped = new Map<string, CkanRecord>();
    for (const r of allRecords) {
      const key = `${r["Numero Emenda"]}|${r["Exercicio (Ano)"]}`;
      deduped.set(key, r);
    }

    const uniqueRecords = [...deduped.values()];
    console.log(`Total unique records after dedup: ${uniqueRecords.length} (from ${allRecords.length} raw)`);

    // 4. Transform into our table format
    const emendas = uniqueRecords.map(r => ({
      parlamentar_nome: formatAutorNome(r["Autor (Deputado)"]),
      parlamentar_esfera: "estadual" as const,
      ano: parseInt(r["Exercicio (Ano)"]) || new Date().getFullYear(),
      valor_empenhado: parseNumber(r["Valor Empenho"]),
      valor_pago: parseNumber(r["OP (Saldo)"]),
      objeto: cleanObjeto(r["Objeto"], r["Descricao Despesa"], r["Funcao (Nome)"]),
      fonte_url: FONTE_URL_PREFIX,
      atualizado_em: new Date().toISOString(),
    }));

    // 5. Delete existing estadual emendas sourced from CKAN (will be replaced)
    const { error: deleteErr } = await supabase
      .from("emendas_parlamentares")
      .delete()
      .eq("parlamentar_esfera", "estadual")
      .like("fonte_url", "%dadosabertos.go.gov.br%");

    if (deleteErr) {
      console.error("Error deleting stale CKAN records:", deleteErr);
      // Also try sislog source
    }

    // Also delete sislog-sourced estadual records (will be replaced by CKAN data)
    await supabase
      .from("emendas_parlamentares")
      .delete()
      .eq("parlamentar_esfera", "estadual")
      .like("fonte_url", "%sislog.go.gov.br%");

    // 6. Insert fresh records in batches of 50
    let inserted = 0;
    const batchSize = 50;
    for (let i = 0; i < emendas.length; i += batchSize) {
      const batch = emendas.slice(i, i + batchSize);
      const { error: insertErr } = await supabase
        .from("emendas_parlamentares")
        .insert(batch);

      if (insertErr) {
        console.error(`Insert error batch ${i}:`, insertErr);
      } else {
        inserted += batch.length;
      }
    }

    // 7. Log sync status
    const { error: logError } = await supabase.from("sync_log").insert({
      tipo: "emendas",
      status: "completed",
      finished_at: new Date().toISOString(),
      detalhes: {
        resources_checked: resources.length,
        raw_records: allRecords.length,
        unique_records: uniqueRecords.length,
        inserted: inserted,
        source: "dadosabertos.go.gov.br CKAN API",
        parlamentares: [...new Set(emendas.map(e => e.parlamentar_nome))],
      },
    });
    if (logError) console.error("Sync log error:", logError);

    console.log(`Sync emendas completed. Inserted: ${inserted} estadual emendas from CKAN.`);

    return new Response(
      JSON.stringify({
        success: true,
        resources_checked: resources.length,
        raw_records: allRecords.length,
        unique_records: uniqueRecords.length,
        inserted,
        parlamentares: [...new Set(emendas.map(e => e.parlamentar_nome))],
        message: "Emendas estaduais sincronizadas com sucesso via API CKAN Dados Abertos GO.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);

    await supabase.from("sync_log").insert({
      tipo: "emendas",
      status: "error",
      finished_at: new Date().toISOString(),
      detalhes: { error: error.message },
    }).catch(() => {});

    return new Response(
      JSON.stringify({ error: error.message || "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

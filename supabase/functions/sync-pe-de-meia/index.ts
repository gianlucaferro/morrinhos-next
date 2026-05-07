import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const IBGE_CODE = "5213806";
const MUNICIPIO_SLUG = "morrinhos";
const FONTE_BASE = "https://portaldatransparencia.gov.br";
const API_BASE = "https://api.portaldatransparencia.gov.br/api-de-dados";

const SERIE_RATIOS = [
  { serie: "1ª série", ratio: 0.40 },
  { serie: "2ª série", ratio: 0.33 },
  { serie: "3ª série", ratio: 0.27 },
];

async function fetchPeDeMeiaForYear(ano: number, apiKey: string): Promise<{ beneficiarios: number; valor_total: number } | null> {
  // Use the Portal da Transparência official API
  // Fetch all months of the year and aggregate
  let totalBenef = 0;
  let totalValor = 0;
  const seenCpfs = new Set<string>();

  for (let mes = 1; mes <= 12; mes++) {
    const mesAno = `${ano}${String(mes).padStart(2, "0")}`;
    let pagina = 1;
    let hasMore = true;

    while (hasMore) {
      const url = `${API_BASE}/pe-de-meia-por-municipio?mesAno=${mesAno}&codigoIbge=${IBGE_CODE}&pagina=${pagina}`;

      try {
        const resp = await fetch(url, {
          headers: { "chave-api-dados": apiKey, "Accept": "application/json" },
        });

        if (resp.status === 404 || resp.status === 400) {
          hasMore = false;
          break;
        }

        if (!resp.ok) {
          console.error(`API error ${resp.status} for ${mesAno} page ${pagina}`);
          hasMore = false;
          break;
        }

        const data = await resp.json();
        if (!Array.isArray(data) || data.length === 0) {
          hasMore = false;
          break;
        }

        for (const item of data) {
          const cpf = item.cpfBeneficiario || item.nis || "";
          const valor = item.valor || 0;
          totalValor += valor;
          if (cpf && !seenCpfs.has(cpf)) {
            seenCpfs.add(cpf);
            totalBenef++;
          }
        }

        // If less than 500 items, no more pages
        if (data.length < 500) hasMore = false;
        else pagina++;
      } catch (e) {
        console.error(`Error fetching ${mesAno}:`, e);
        hasMore = false;
      }
    }

    // If no data for this month, skip remaining months
    if (totalBenef === 0 && mes >= 3) break;
  }

  if (totalBenef > 0 || totalValor > 0) {
    console.log(`Year ${ano}: ${totalBenef} unique beneficiários, R$ ${totalValor.toFixed(2)}`);
    return { beneficiarios: totalBenef, valor_total: totalValor };
  }

  console.log(`No Pé-de-Meia data for year ${ano}`);
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const apiKey = Deno.env.get("PORTAL_TRANSPARENCIA_API_KEY");
  const supabase = createClient(supabaseUrl, serviceKey);

  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "PORTAL_TRANSPARENCIA_API_KEY not configured. Register free at portaldatransparencia.gov.br/api-de-dados/cadastrar-email" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const currentYear = new Date().getFullYear();
    const years = [currentYear - 1, currentYear];

    let totalInserted = 0;
    let totalUpdated = 0;
    const results: Record<number, { beneficiarios: number; valor_total: number }> = {};

    for (const ano of years) {
      const data = await fetchPeDeMeiaForYear(ano, apiKey);
      if (!data || (data.beneficiarios === 0 && data.valor_total === 0)) {
        console.log(`Skipping year ${ano} - no data found`);
        continue;
      }
      results[ano] = data;

      const fonteUrl = `${FONTE_BASE}/localidades/${IBGE_CODE}-${MUNICIPIO_SLUG}?ano=${ano}`;
      const isParcial = ano === currentYear;
      const obsBase = isParcial
        ? `Dados oficiais parciais do Portal da Transparência (${ano}, ano em andamento). Distribuição por série estimada proporcionalmente com base no Censo Escolar/INEP.`
        : `Dados oficiais do Portal da Transparência (${ano}). Distribuição por série estimada proporcionalmente com base no Censo Escolar/INEP.`;

      const { data: existing } = await supabase
        .from("pe_de_meia")
        .select("id, serie, beneficiarios, valor_total")
        .eq("ano", ano);

      const existingTotal = (existing || []).reduce((s, r) => s + (r.beneficiarios || 0), 0);

      if (existingTotal === data.beneficiarios && existing && existing.length > 0) {
        console.log(`Year ${ano}: data unchanged (${existingTotal} beneficiários), skipping`);
        continue;
      }

      console.log(`Year ${ano}: updating from ${existingTotal} to ${data.beneficiarios} beneficiários`);
      await supabase.from("pe_de_meia").delete().eq("ano", ano);

      for (const { serie, ratio } of SERIE_RATIOS) {
        const benef = Math.round(data.beneficiarios * ratio);
        const valor = Math.round(data.valor_total * ratio);
        const valorMedio = benef > 0 ? Math.round(valor / benef) : 0;

        const { error } = await supabase.from("pe_de_meia").insert({
          ano, serie, beneficiarios: benef, valor_total: valor,
          valor_medio_por_aluno: valorMedio, fonte_url: fonteUrl, observacao: obsBase,
        });

        if (error) console.error(`Insert error for ${ano}/${serie}:`, error.message);
        else { if (existing && existing.length > 0) totalUpdated++; else totalInserted++; }
      }
    }

    await supabase.from("sync_log").insert({
      tipo: "pe_de_meia", status: "success",
      detalhes: { results, inserted: totalInserted, updated: totalUpdated },
      finished_at: new Date().toISOString(),
    });

    return new Response(JSON.stringify({ success: true, years_checked: years, results, inserted: totalInserted, updated: totalUpdated }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    await supabase.from("sync_log").insert({
      tipo: "pe_de_meia", status: "error",
      detalhes: { error: error.message }, finished_at: new Date().toISOString(),
    }).catch(() => {});

    return new Response(
      JSON.stringify({ error: error.message || "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

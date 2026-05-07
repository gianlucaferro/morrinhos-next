import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// CKAN API base
const CKAN = "https://dadosabertos.go.gov.br/api/3/action/datastore_search";
const CKAN_SQL = "https://dadosabertos.go.gov.br/api/3/action/datastore_search_sql";
const UA = "morrinhos.ai/1.0 (transparencia municipal)";
const MUNICIPIO = "Morrinhos";

// Resource IDs from dadosabertos.go.gov.br
const RESOURCES = {
  mortalidade_geral: "0d520c63-7e6b-4a79-97c3-bf145d05a1c1",
  mortalidade_infantil: "d403c5a6-cf13-42a8-8eff-ca4d891d74f7",
  mortalidade_infancia: "3ccedf0f-0cf9-4e4b-96cd-2ea67d03f926",
  mortalidade_materna: "b2167f8f-e5f4-4273-8455-bf124f06ea03",
  arbovirose_internacoes: "cd6da1c8-fbe7-42df-ad58-0f583c8f88d9",
};

async function upsertIndicador(sb: any, row: any, errors: string[]) {
  const mesVal = row.mes ?? 0;
  const { data: existing } = await sb
    .from("saude_indicadores")
    .select("id")
    .eq("categoria", row.categoria)
    .eq("indicador", row.indicador)
    .eq("ano", row.ano)
    .eq("mes", mesVal)
    .limit(1);

  if (existing && existing.length > 0) {
    await sb
      .from("saude_indicadores")
      .update({ valor: row.valor, valor_texto: row.valor_texto || null })
      .eq("id", existing[0].id);
  } else {
    const { error: insErr } = await sb.from("saude_indicadores").insert(row);
    if (insErr) errors.push(`${row.categoria}/${row.indicador} ${row.ano}: ${insErr.message}`);
  }
}

// Fetch all pages from CKAN datastore for a given filter
async function fetchCKAN(resourceId: string, filters: Record<string, string>, limit = 1000): Promise<any[]> {
  const all: any[] = [];
  let offset = 0;
  const filterStr = JSON.stringify(filters);

  while (true) {
    const url = `${CKAN}?resource_id=${resourceId}&filters=${encodeURIComponent(filterStr)}&limit=${limit}&offset=${offset}`;
    console.log(`CKAN fetch: offset=${offset}`);
    const resp = await fetch(url, { headers: { "User-Agent": UA } });
    if (!resp.ok) {
      const text = await resp.text();
      console.log(`CKAN error ${resp.status}: ${text.substring(0, 200)}`);
      break;
    }
    const data = await resp.json();
    const records = data?.result?.records || [];
    all.push(...records);
    if (records.length < limit) break;
    offset += limit;
    if (offset > 10000) break; // Safety limit
  }
  return all;
}

// ========== 1. Mortalidade Geral (by year, with CID breakdown) ==========
async function syncMortalidadeGeral(sb: any, errors: string[]) {
  let inserted = 0;
  try {
    const records = await fetchCKAN(RESOURCES.mortalidade_geral, { "Municipio residencia": MUNICIPIO });
    console.log(`Mortalidade geral: ${records.length} registros para ${MUNICIPIO}`);

    // Aggregate total deaths by year
    const yearlyTotals = new Map<number, number>();
    // Also track HIV-related deaths (CID B20-B24)
    const hivDeaths = new Map<number, number>();
    // Track Tuberculosis deaths (CID A15-A19)
    const tbDeaths = new Map<number, number>();
    // Track COVID-19 deaths (CID U07)
    const covidDeaths = new Map<number, number>();

    for (const r of records) {
      const ano = Math.floor(parseFloat(r.ano || r["ano"] || "0"));
      const obitos = parseInt(r["total obitos"] || r["Total obitos"] || "1");
      if (!ano) continue;

      yearlyTotals.set(ano, (yearlyTotals.get(ano) || 0) + obitos);

      // Check for HIV-related CID codes (B20-B24)
      const cid = (r["Cod. CID 10"] || "").toUpperCase();
      if (cid.startsWith("B20") || cid.startsWith("B21") || cid.startsWith("B22") || cid.startsWith("B23") || cid.startsWith("B24")) {
        hivDeaths.set(ano, (hivDeaths.get(ano) || 0) + obitos);
      }

      // Check for Tuberculosis CID codes (A15-A19)
      if (cid.startsWith("A15") || cid.startsWith("A16") || cid.startsWith("A17") || cid.startsWith("A18") || cid.startsWith("A19")) {
        tbDeaths.set(ano, (tbDeaths.get(ano) || 0) + obitos);
      }

      // Check for COVID-19 CID codes (U07)
      if (cid.startsWith("U07")) {
        covidDeaths.set(ano, (covidDeaths.get(ano) || 0) + obitos);
      }
    }

    // Insert total mortality by year
    for (const [ano, total] of yearlyTotals.entries()) {
      await upsertIndicador(sb, {
        categoria: "mortalidade_geral",
        indicador: "obitos_anual",
        ano, mes: null, semana_epidemiologica: null,
        valor: total,
        valor_texto: `${total} óbitos em ${ano}`,
        fonte: "SES-GO / Dados Abertos Goiás",
        fonte_url: "https://dadosabertos.go.gov.br/dataset/mortalidade",
      }, errors);
      inserted++;
    }

    // Insert HIV-specific deaths from SES-GO (more accurate municipal data)
    for (const [ano, total] of hivDeaths.entries()) {
      await upsertIndicador(sb, {
        categoria: "hiv",
        indicador: "obitos_anual",
        ano, mes: null, semana_epidemiologica: null,
        valor: total,
        valor_texto: `${total} óbitos por HIV/AIDS em ${ano}`,
        fonte: "SES-GO / Dados Abertos Goiás (SIM)",
        fonte_url: "https://dadosabertos.go.gov.br/dataset/mortalidade",
      }, errors);
      inserted++;
    }

    // Insert TB-specific deaths
    for (const [ano, total] of tbDeaths.entries()) {
      await upsertIndicador(sb, {
        categoria: "tuberculose",
        indicador: "obitos_anual",
        ano, mes: null, semana_epidemiologica: null,
        valor: total,
        valor_texto: `${total} óbitos por tuberculose em ${ano}`,
        fonte: "SES-GO / Dados Abertos Goiás (SIM)",
        fonte_url: "https://dadosabertos.go.gov.br/dataset/mortalidade",
      }, errors);
      inserted++;
    }

    // Insert COVID-19 deaths
    for (const [ano, total] of covidDeaths.entries()) {
      await upsertIndicador(sb, {
        categoria: "covid",
        indicador: "obitos_anual",
        ano, mes: null, semana_epidemiologica: null,
        valor: total,
        valor_texto: `${total} óbitos por COVID-19 em ${ano}`,
        fonte: "SES-GO / Dados Abertos Goiás (SIM)",
        fonte_url: "https://dadosabertos.go.gov.br/dataset/mortalidade",
      }, errors);
      inserted++;
    }

    console.log(`Mortalidade geral: ${yearlyTotals.size} anos, HIV: ${hivDeaths.size}, TB: ${tbDeaths.size}, COVID: ${covidDeaths.size}`);
  } catch (e) {
    console.error(`Mortalidade geral error: ${e.message}`);
    errors.push(`mortalidade_geral: ${e.message}`);
  }
  return inserted;
}

// ========== 2. Mortalidade Infantil ==========
async function syncMortalidadeInfantil(sb: any, errors: string[]) {
  let inserted = 0;
  try {
    const records = await fetchCKAN(RESOURCES.mortalidade_infantil, { "Municipio residencia": MUNICIPIO });
    console.log(`Mortalidade infantil: ${records.length} registros para ${MUNICIPIO}`);

    const yearlyTotals = new Map<number, number>();
    for (const r of records) {
      const ano = Math.floor(parseFloat(r.ano || r["ano"] || "0"));
      const obitos = parseInt(r["Total obitos infantil"] || r["total obitos infantil"] || "1");
      if (!ano || ano < 2010) continue;
      yearlyTotals.set(ano, (yearlyTotals.get(ano) || 0) + obitos);
    }

    for (const [ano, total] of yearlyTotals.entries()) {
      await upsertIndicador(sb, {
        categoria: "mortalidade_infantil",
        indicador: "obitos_anual",
        ano, mes: null, semana_epidemiologica: null,
        valor: total,
        valor_texto: `${total} óbitos infantis em ${ano}`,
        fonte: "SES-GO / Dados Abertos Goiás (SIM)",
        fonte_url: "https://dadosabertos.go.gov.br/dataset/mortalidade",
      }, errors);
      inserted++;
    }

    console.log(`Mortalidade infantil: ${yearlyTotals.size} anos`);
  } catch (e) {
    console.error(`Mortalidade infantil error: ${e.message}`);
    errors.push(`mortalidade_infantil: ${e.message}`);
  }
  return inserted;
}

// ========== 3. Mortalidade Materna ==========
async function syncMortalidadeMaterna(sb: any, errors: string[]) {
  let inserted = 0;
  try {
    const records = await fetchCKAN(RESOURCES.mortalidade_materna, { "Municipio residencia": MUNICIPIO });
    console.log(`Mortalidade materna: ${records.length} registros para ${MUNICIPIO}`);

    const yearlyTotals = new Map<number, number>();
    for (const r of records) {
      const ano = Math.floor(parseFloat(r.ano || r["ano"] || "0"));
      const obitos = parseInt(r["total obitos maternos"] || r["Total obitos maternos"] || r["total obitos"] || "1");
      if (!ano || ano < 2010) continue;
      yearlyTotals.set(ano, (yearlyTotals.get(ano) || 0) + obitos);
    }

    for (const [ano, total] of yearlyTotals.entries()) {
      await upsertIndicador(sb, {
        categoria: "mortalidade_materna",
        indicador: "obitos_anual",
        ano, mes: null, semana_epidemiologica: null,
        valor: total,
        valor_texto: `${total} óbitos maternos em ${ano}`,
        fonte: "SES-GO / Dados Abertos Goiás (SIM)",
        fonte_url: "https://dadosabertos.go.gov.br/dataset/mortalidade",
      }, errors);
      inserted++;
    }

    console.log(`Mortalidade materna: ${yearlyTotals.size} anos`);
  } catch (e) {
    console.error(`Mortalidade materna error: ${e.message}`);
    errors.push(`mortalidade_materna: ${e.message}`);
  }
  return inserted;
}

// ========== 4. Internações por Arbovirose (SES-GO regulação) ==========
async function syncArboviroseInternacoes(sb: any, errors: string[]) {
  let inserted = 0;
  try {
    const records = await fetchCKAN(RESOURCES.arbovirose_internacoes, { "Paciente Municipio": MUNICIPIO });
    console.log(`Arbovirose internações: ${records.length} registros para ${MUNICIPIO}`);

    // Aggregate by year and CID (A90=dengue, A91=dengue hemorrágica, A920=chikungunya, A928=zika)
    const cidMap: Record<string, string> = {
      "A90": "dengue", "A91": "dengue",
      "A920": "chikungunya", "A921": "chikungunya",
      "A928": "zika", "A929": "zika",
    };

    const yearlyByDisease = new Map<string, number>();

    for (const r of records) {
      const dateStr = r["Data da solicitacao"] || "";
      const date = new Date(dateStr);
      const ano = date.getFullYear();
      if (!ano || ano < 2020) continue;

      const cid = (r["CID"] || "").toUpperCase();
      let disease = "arbovirose";
      for (const [prefix, d] of Object.entries(cidMap)) {
        if (cid.startsWith(prefix)) { disease = d; break; }
      }

      const key = `${disease}-${ano}`;
      yearlyByDisease.set(key, (yearlyByDisease.get(key) || 0) + 1);
    }

    for (const [key, total] of yearlyByDisease.entries()) {
      const [disease, anoStr] = key.split("-");
      const ano = parseInt(anoStr);

      await upsertIndicador(sb, {
        categoria: disease,
        indicador: "internacoes_anual",
        ano, mes: null, semana_epidemiologica: null,
        valor: total,
        valor_texto: `${total} internações por ${disease} em ${ano}`,
        fonte: "SES-GO / Regulação Estadual",
        fonte_url: "https://dadosabertos.go.gov.br/dataset/arbovirose",
      }, errors);
      inserted++;
    }

    console.log(`Arbovirose internações: ${yearlyByDisease.size} registros`);
  } catch (e) {
    console.error(`Arbovirose internações error: ${e.message}`);
    errors.push(`arbovirose_internacoes: ${e.message}`);
  }
  return inserted;
}

// ========== Main ==========
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const { data: log } = await sb
    .from("sync_log")
    .insert({ tipo: "saude_sesgo", status: "running", detalhes: {} })
    .select("id")
    .single();
  const logId = log?.id;

  const errors: string[] = [];
  let totalInserted = 0;

  try {
    // 1. Mortalidade Geral (includes HIV deaths by CID)
    totalInserted += await syncMortalidadeGeral(sb, errors);

    // 2. Mortalidade Infantil
    totalInserted += await syncMortalidadeInfantil(sb, errors);

    // 3. Mortalidade Materna
    totalInserted += await syncMortalidadeMaterna(sb, errors);

    // 4. Internações por Arbovirose (regulação estadual)
    totalInserted += await syncArboviroseInternacoes(sb, errors);

    const result = { totalInserted, errors: errors.slice(0, 15) };
    console.log("Result:", JSON.stringify(result));

    if (logId) {
      await sb.from("sync_log").update({
        status: errors.length > 0 && totalInserted > 0 ? "partial" : totalInserted > 0 ? "success" : "empty",
        detalhes: result,
        finished_at: new Date().toISOString(),
      }).eq("id", logId);
    }

    return new Response(JSON.stringify({ success: true, ...result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Erro:", error);
    if (logId) {
      await sb.from("sync_log").update({
        status: "error",
        detalhes: { error: error.message, errors },
        finished_at: new Date().toISOString(),
      }).eq("id", logId);
    }
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

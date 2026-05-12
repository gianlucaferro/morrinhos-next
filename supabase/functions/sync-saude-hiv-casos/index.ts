import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CKAN_BASE = "https://dadosabertos.go.gov.br/api/3/action/datastore_search";
const MUNICIPIO = "Morrinhos";
const PAGE_SIZE = 100;

// Resource IDs from dadosabertos.go.gov.br/dataset/ist-aids
const RESOURCES = {
  adulto: "9cac6ec3-47f5-4e85-9a2f-ae7acbe94810",
  crianca: "8d563b7f-01b0-4d1e-9be9-eaa39082f204",
  gestante: "89737856-1272-40f9-8bb9-061a8bb933d9",
  gestante_taxa: "03cc41bf-4aa6-4f93-86d9-5cc375bf18a3",
  obitos: "6ed31d56-ffea-48ec-ba78-d6284cc973cc",
};

type RawRecord = {
  data_diagnostico?: string;
  data_obito?: string;
  codigo_ibge: string;
  municipio: string;
  sexo: string;
  raca_cor: string;
  faixa_etaria: string;
  escolaridade: string;
  classificacao: string;
};

async function fetchAllRecords(resourceId: string): Promise<RawRecord[]> {
  const all: RawRecord[] = [];
  let offset = 0;

  while (true) {
    const url = `${CKAN_BASE}?resource_id=${resourceId}&filters=${encodeURIComponent(JSON.stringify({ municipio: MUNICIPIO }))}&limit=${PAGE_SIZE}&offset=${offset}`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`CKAN error ${resp.status}`);
    const json = await resp.json();
    const records = json.result?.records || [];
    all.push(...records);
    if (records.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return all;
}

function extractYear(dateStr: string | undefined): number | null {
  if (!dateStr) return null;
  // Format: DD/MM/YYYY
  const parts = dateStr.split("/");
  if (parts.length === 3) return parseInt(parts[2], 10);
  return null;
}

function aggregateByYear(records: RawRecord[], dateField: "data_diagnostico" | "data_obito"): Map<number, number> {
  const byYear = new Map<number, number>();
  for (const r of records) {
    const year = extractYear(r[dateField]);
    if (year) byYear.set(year, (byYear.get(year) || 0) + 1);
  }
  return byYear;
}

function aggregateBySexAndYear(records: RawRecord[], dateField: "data_diagnostico" | "data_obito"): Map<string, number> {
  const result = new Map<string, number>();
  for (const r of records) {
    const year = extractYear(r[dateField]);
    if (!year) continue;
    const key = `${year}|${r.sexo}`;
    result.set(key, (result.get(key) || 0) + 1);
  }
  return result;
}

function aggregateByAgeAndYear(records: RawRecord[], dateField: "data_diagnostico" | "data_obito"): Map<string, number> {
  const result = new Map<string, number>();
  for (const r of records) {
    const year = extractYear(r[dateField]);
    if (!year) continue;
    const key = `${year}|${r.faixa_etaria}`;
    result.set(key, (result.get(key) || 0) + 1);
  }
  return result;
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
    console.log("Fetching HIV/AIDS data from Dados Abertos GO...");

    // Fetch all datasets in parallel
    const [adultoRecords, obitosRecords, criancaRecords, gestanteRecords] = await Promise.all([
      fetchAllRecords(RESOURCES.adulto),
      fetchAllRecords(RESOURCES.obitos),
      fetchAllRecords(RESOURCES.crianca),
      fetchAllRecords(RESOURCES.gestante),
    ]);

    console.log(`Fetched: ${adultoRecords.length} adulto, ${obitosRecords.length} óbitos, ${criancaRecords.length} criança, ${gestanteRecords.length} gestante`);

    // Combine all diagnosis records
    const allDiagnosticos = [...adultoRecords, ...criancaRecords, ...gestanteRecords];

    // Aggregate data
    const diagByYear = aggregateByYear(allDiagnosticos, "data_diagnostico");
    const obitosByYear = aggregateByYear(obitosRecords, "data_obito");
    const diagBySex = aggregateBySexAndYear(allDiagnosticos, "data_diagnostico");
    const diagByAge = aggregateByAgeAndYear(allDiagnosticos, "data_diagnostico");

    const rows: any[] = [];
    const fonte = "SES-GO / Dados Abertos Goiás (SINAN)";
    const fonteUrl = "https://dadosabertos.go.gov.br/dataset/ist-aids";

    // Diagnósticos por ano
    for (const [year, count] of diagByYear) {
      rows.push({
        categoria: "hiv",
        indicador: "diagnosticos_ano",
        ano: year,
        valor: count,
        fonte,
        fonte_url: fonteUrl,
      });
    }

    // Óbitos por ano
    for (const [year, count] of obitosByYear) {
      rows.push({
        categoria: "hiv",
        indicador: "obitos_anual",
        ano: year,
        valor: count,
        fonte: "SES-GO / Dados Abertos Goiás (SIM)",
        fonte_url: fonteUrl,
      });
    }

    // Diagnósticos por sexo: use mes=1 for MASCULINO, mes=2 for FEMININO to satisfy unique constraint
    const sexoToMes: Record<string, number> = { "MASCULINO": 1, "FEMININO": 2 };
    for (const [key, count] of diagBySex) {
      const [yearStr, sexo] = key.split("|");
      const mesVal = sexoToMes[sexo] || 3;
      rows.push({
        categoria: "hiv",
        indicador: "diagnosticos_sexo",
        ano: parseInt(yearStr),
        mes: mesVal,
        valor: count,
        valor_texto: sexo,
        fonte,
        fonte_url: fonteUrl,
      });
    }

    // Diagnósticos por faixa etária: encode age group as mes (1-9)
    const faixaOrder = ["10 A 14 ANOS", "15 A 19 ANOS", "20 A 29 ANOS", "30 A 39 ANOS", "40 A 49 ANOS", "50 A 59 ANOS", ">= 60 ANOS"];
    for (const [key, count] of diagByAge) {
      const [yearStr, faixa] = key.split("|");
      const mesVal = faixaOrder.indexOf(faixa) + 1 || faixaOrder.length + 1;
      rows.push({
        categoria: "hiv",
        indicador: "diagnosticos_faixa_etaria",
        ano: parseInt(yearStr),
        mes: mesVal,
        valor: count,
        valor_texto: faixa,
        fonte,
        fonte_url: fonteUrl,
      });
    }

    // Gestantes por ano (separate from general diagnostics)
    const gestanteByYear = aggregateByYear(gestanteRecords, "data_diagnostico");
    for (const [year, count] of gestanteByYear) {
      rows.push({
        categoria: "hiv",
        indicador: "gestantes_ano",
        ano: year,
        valor: count,
        fonte,
        fonte_url: fonteUrl,
      });
    }

    // Also fetch gestante_taxa (pre-aggregated rates by municipality)
    try {
      const taxaUrl = `${CKAN_BASE}?resource_id=${RESOURCES.gestante_taxa}&filters=${encodeURIComponent(JSON.stringify({ LOCAL: "MORRINHOS" }))}&limit=100`;
      const taxaResp = await fetch(taxaUrl);
      if (taxaResp.ok) {
        const taxaJson = await taxaResp.json();
        const taxaRecords = taxaJson.result?.records || [];
        for (const r of taxaRecords) {
          const year = parseInt(r.ano, 10);
          if (!year) continue;
          rows.push({
            categoria: "hiv",
            indicador: "gestantes_taxa_deteccao",
            ano: year,
            valor: parseFloat(r.taxa) || 0,
            valor_texto: `${r.qtde} casos em ${r.qtd_nasc} nascidos vivos`,
            fonte: "SES-GO / Dados Abertos Goiás (SINAN)",
            fonte_url: fonteUrl,
          });
        }
        console.log(`Gestante taxa records for Morrinhos: ${taxaRecords.length}`);
      }
    } catch (e) {
      console.warn("Could not fetch gestante_taxa:", e);
    }

    // Totals
    const totalDiag = allDiagnosticos.length;
    const totalObitos = obitosRecords.length;
    const totalGestantes = gestanteRecords.length;
    const latestYear = Math.max(...Array.from(diagByYear.keys()));
    rows.push({
      categoria: "hiv",
      indicador: "total_diagnosticos",
      ano: latestYear,
      valor: totalDiag,
      fonte,
      fonte_url: fonteUrl,
    });
    rows.push({
      categoria: "hiv",
      indicador: "total_obitos",
      ano: latestYear,
      valor: totalObitos,
      fonte: "SES-GO / Dados Abertos Goiás (SIM)",
      fonte_url: fonteUrl,
    });
    rows.push({
      categoria: "hiv",
      indicador: "total_gestantes",
      ano: latestYear,
      valor: totalGestantes,
      fonte,
      fonte_url: fonteUrl,
    });

    // Clear existing HIV data and insert new
    console.log(`Deleting existing HIV indicators...`);
    await supabase.from("saude_indicadores").delete().eq("categoria", "hiv");

    console.log(`Inserting ${rows.length} HIV indicators...`);
    const CHUNK = 50;
    let inserted = 0;
    for (let i = 0; i < rows.length; i += CHUNK) {
      const chunk = rows.slice(i, i + CHUNK);
      const { error } = await supabase.from("saude_indicadores").insert(chunk);
      if (error) {
        console.error("Insert error:", error.message);
      } else {
        inserted += chunk.length;
      }
    }

    console.log(`Done: ${inserted} HIV indicators inserted`);

    return new Response(
      JSON.stringify({
        success: true,
        diagnosticos_adulto: adultoRecords.length,
        diagnosticos_crianca: criancaRecords.length,
        diagnosticos_gestante: gestanteRecords.length,
        obitos: obitosRecords.length,
        indicadores_inseridos: inserted,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

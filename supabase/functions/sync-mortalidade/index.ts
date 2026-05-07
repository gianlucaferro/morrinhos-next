import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CKAN_BASE = "https://dadosabertos.go.gov.br/api/3/action/datastore_search";
const MUNICIPIO = "Morrinhos";
const PAGE_SIZE = 100;

const RESOURCES = {
  mortalidade_geral: "0d520c63-7e6b-4a79-97c3-bf145d05a1c1",
  mortalidade_infantil: "d403c5a6-cf13-42a8-8eff-ca4d891d74f7",
};

type MortRecord = {
  "Municipio residencia": string;
  ano: number | string;
  faixa_etaria: string;
  sexo: string;
  "Cod. CID 10": string;
  dcid_capitulo: string;
  "total obitos"?: number | string;
  "Total obitos infantil"?: number | string;
};

async function fetchAllRecords(resourceId: string): Promise<MortRecord[]> {
  const all: MortRecord[] = [];
  let offset = 0;

  while (true) {
    const filters = JSON.stringify({ "Municipio residencia": MUNICIPIO });
    const url = `${CKAN_BASE}?resource_id=${resourceId}&filters=${encodeURIComponent(filters)}&limit=${PAGE_SIZE}&offset=${offset}`;
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

function parseYear(val: number | string): number | null {
  const n = typeof val === "string" ? parseFloat(val) : val;
  if (!n || isNaN(n)) return null;
  return Math.floor(n);
}

function getObitos(r: MortRecord): number {
  const v = r["total obitos"] ?? r["Total obitos infantil"];
  if (typeof v === "number") return v;
  return parseInt(String(v), 10) || 0;
}

// CID-10 chapter labels
const CID_CHAPTERS: Record<string, string> = {
  I: "Doenças infecciosas e parasitárias",
  II: "Neoplasias (tumores)",
  III: "Sangue e imunidade",
  IV: "Endócrinas e metabólicas",
  V: "Transtornos mentais",
  VI: "Sistema nervoso",
  VII: "Olho e anexos",
  VIII: "Ouvido e apófise mastóide",
  IX: "Aparelho circulatório",
  X: "Aparelho respiratório",
  XI: "Aparelho digestivo",
  XII: "Pele e subcutâneo",
  XIII: "Osteomuscular",
  XIV: "Aparelho geniturinário",
  XV: "Gravidez/parto/puerpério",
  XVI: "Período perinatal",
  XVII: "Malformações congênitas",
  XVIII: "Sinais e sintomas mal definidos",
  XIX: "Lesões e causas externas",
  XX: "Causas externas (V01-Y98)",
  XXI: "Contatos com serviços de saúde",
  XXII: "Códigos especiais",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    console.log("Fetching mortality data from Dados Abertos GO...");

    const [geralRecords, infantilRecords] = await Promise.all([
      fetchAllRecords(RESOURCES.mortalidade_geral),
      fetchAllRecords(RESOURCES.mortalidade_infantil),
    ]);

    console.log(`Fetched: ${geralRecords.length} geral, ${infantilRecords.length} infantil`);

    const rows: any[] = [];
    const fonte = "SES-GO / Dados Abertos Goiás (SIM)";
    const fonteUrl = "https://dadosabertos.go.gov.br/dataset/mortalidade";

    // --- MORTALIDADE GERAL ---
    // Aggregate by year
    const geralByYear = new Map<number, number>();
    const geralBySex = new Map<string, number>();
    const geralByAge = new Map<string, number>();
    const geralByCause = new Map<string, number>();

    for (const r of geralRecords) {
      const year = parseYear(r.ano);
      if (!year) continue;
      const obitos = getObitos(r);
      geralByYear.set(year, (geralByYear.get(year) || 0) + obitos);

      // Sex aggregate
      const sexKey = `${year}|${r.sexo}`;
      geralBySex.set(sexKey, (geralBySex.get(sexKey) || 0) + obitos);

      // Age aggregate
      const ageKey = `${year}|${r.faixa_etaria}`;
      geralByAge.set(ageKey, (geralByAge.get(ageKey) || 0) + obitos);

      // Cause chapter aggregate (all years)
      const chap = r.dcid_capitulo;
      if (chap) {
        geralByCause.set(chap, (geralByCause.get(chap) || 0) + obitos);
      }
    }

    // Óbitos por ano
    for (const [year, count] of geralByYear) {
      rows.push({ categoria: "mortalidade_geral", indicador: "obitos_anual", ano: year, valor: count, fonte, fonte_url: fonteUrl });
    }

    // Óbitos por sexo (mes=1 MASC, mes=2 FEM)
    const sexoToMes: Record<string, number> = { MASCULINO: 1, FEMININO: 2, IGNORADO: 3 };
    for (const [key, count] of geralBySex) {
      const [yearStr, sexo] = key.split("|");
      rows.push({
        categoria: "mortalidade_geral", indicador: "obitos_sexo",
        ano: parseInt(yearStr), mes: sexoToMes[sexo] || 4,
        valor: count, valor_texto: sexo, fonte, fonte_url: fonteUrl,
      });
    }

    // Top causes (aggregated all years), encoded as mes=chapter_index
    const sortedCauses = [...geralByCause.entries()].sort((a, b) => b[1] - a[1]);
    const latestGeralYear = Math.max(...Array.from(geralByYear.keys()));
    for (let i = 0; i < sortedCauses.length; i++) {
      const [chap, count] = sortedCauses[i];
      rows.push({
        categoria: "mortalidade_geral", indicador: "obitos_causa_capitulo",
        ano: latestGeralYear, mes: i + 1,
        valor: count,
        valor_texto: CID_CHAPTERS[chap] || `Cap. ${chap}`,
        fonte, fonte_url: fonteUrl,
      });
    }

    // Totals
    const totalGeral = geralRecords.reduce((s, r) => s + getObitos(r), 0);
    rows.push({ categoria: "mortalidade_geral", indicador: "total_obitos", ano: latestGeralYear, valor: totalGeral, fonte, fonte_url: fonteUrl });

    // --- MORTALIDADE INFANTIL ---
    const infantilByYear = new Map<number, number>();
    const infantilBySex = new Map<string, number>();
    const infantilByAge = new Map<string, number>();
    const infantilByCause = new Map<string, number>();

    for (const r of infantilRecords) {
      const year = parseYear(r.ano);
      if (!year) continue;
      const obitos = getObitos(r);
      infantilByYear.set(year, (infantilByYear.get(year) || 0) + obitos);

      const sexKey = `${year}|${r.sexo}`;
      infantilBySex.set(sexKey, (infantilBySex.get(sexKey) || 0) + obitos);

      const ageKey = `${year}|${r.faixa_etaria}`;
      infantilByAge.set(ageKey, (infantilByAge.get(ageKey) || 0) + obitos);

      const chap = r.dcid_capitulo;
      if (chap) {
        infantilByCause.set(chap, (infantilByCause.get(chap) || 0) + obitos);
      }
    }

    // Óbitos infantis por ano
    for (const [year, count] of infantilByYear) {
      rows.push({ categoria: "mortalidade_infantil", indicador: "obitos_anual", ano: year, valor: count, fonte, fonte_url: fonteUrl });
    }

    // Óbitos infantis por sexo
    for (const [key, count] of infantilBySex) {
      const [yearStr, sexo] = key.split("|");
      rows.push({
        categoria: "mortalidade_infantil", indicador: "obitos_sexo",
        ano: parseInt(yearStr), mes: sexoToMes[sexo] || 4,
        valor: count, valor_texto: sexo, fonte, fonte_url: fonteUrl,
      });
    }

    // Faixa etária infantil
    const infantilAgeOrder = ["0 A 6 DIAS", "7 A 27 DIAS", "28 A 364 DIAS"];
    const latestInfantilYear = Math.max(...Array.from(infantilByYear.keys()));
    // Aggregate across all years for faixa
    const infantilAgeTotals = new Map<string, number>();
    for (const [key, count] of infantilByAge) {
      const faixa = key.split("|")[1];
      infantilAgeTotals.set(faixa, (infantilAgeTotals.get(faixa) || 0) + count);
    }
    for (let i = 0; i < infantilAgeOrder.length; i++) {
      const faixa = infantilAgeOrder[i];
      const count = infantilAgeTotals.get(faixa) || 0;
      if (count > 0) {
        rows.push({
          categoria: "mortalidade_infantil", indicador: "obitos_faixa_etaria",
          ano: latestInfantilYear, mes: i + 1,
          valor: count, valor_texto: faixa, fonte, fonte_url: fonteUrl,
        });
      }
    }

    // Top causes infantil
    const sortedInfCauses = [...infantilByCause.entries()].sort((a, b) => b[1] - a[1]);
    for (let i = 0; i < sortedInfCauses.length; i++) {
      const [chap, count] = sortedInfCauses[i];
      rows.push({
        categoria: "mortalidade_infantil", indicador: "obitos_causa_capitulo",
        ano: latestInfantilYear, mes: i + 1,
        valor: count,
        valor_texto: CID_CHAPTERS[chap] || `Cap. ${chap}`,
        fonte, fonte_url: fonteUrl,
      });
    }

    // Total infantil
    const totalInfantil = infantilRecords.reduce((s, r) => s + getObitos(r), 0);
    rows.push({ categoria: "mortalidade_infantil", indicador: "total_obitos", ano: latestInfantilYear, valor: totalInfantil, fonte, fonte_url: fonteUrl });

    // Clear existing mortality data (preserve taxa_mortalidade_infantil from IBGE)
    console.log("Deleting existing mortality indicators (preserving IBGE taxa)...");
    await supabase.from("saude_indicadores").delete().eq("categoria", "mortalidade_geral");
    await supabase.from("saude_indicadores").delete().eq("categoria", "mortalidade_infantil").neq("indicador", "taxa_mortalidade_infantil");

    console.log(`Inserting ${rows.length} mortality indicators...`);
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

    console.log(`Done: ${inserted} mortality indicators inserted`);

    return new Response(
      JSON.stringify({
        success: true,
        mortalidade_geral_records: geralRecords.length,
        mortalidade_infantil_records: infantilRecords.length,
        indicadores_inseridos: inserted,
        anos_geral: geralByYear.size,
        anos_infantil: infantilByYear.size,
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

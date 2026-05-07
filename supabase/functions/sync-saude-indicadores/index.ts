import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Morrinhos IBGE geocode (confirmed: https://www.ibge.gov.br/cidades-e-estados/go/morrinhos.html)
const GEOCODE = 5213806;
const DISEASES = ["dengue", "chikungunya", "zika"] as const;
const UA = "morrinhos.ai/1.0 (transparencia municipal)";

interface AlertData {
  data_iniSE: string;
  SE: number;
  casos_est: number;
  casos: number;
  nivel: number;
  p_rt1: number;
  tempmin: number;
  tempmed: number;
  tempmax: number;
  umidmin: number;
  umidmed: number;
  umidmax: number;
  Rt: number;
  pop: number;
  receptession: number;
}

async function upsertIndicador(sb: any, row: any, errors: string[]) {
  const { data: existing } = await sb.from("saude_indicadores")
    .select("id")
    .eq("categoria", row.categoria)
    .eq("indicador", row.indicador)
    .eq("ano", row.ano)
    .eq("mes", row.mes ?? 0)
    .limit(1);

  if (existing && existing.length > 0) {
    await sb.from("saude_indicadores").update({
      valor: row.valor,
      valor_texto: row.valor_texto || null,
    }).eq("id", existing[0].id);
  } else {
    const { error: insErr } = await sb.from("saude_indicadores").insert(row);
    if (insErr) errors.push(`${row.categoria} ${row.ano}: ${insErr.message}`);
  }
}

// ========== InfoDengue (dengue, chikungunya, zika) ==========
async function syncInfoDengue(sb: any, startYear: number, endYear: number, errors: string[]) {
  let totalInserted = 0;

  for (const disease of DISEASES) {
    try {
      const apiUrl = `https://info.dengue.mat.br/api/alertcity?geocode=${GEOCODE}&disease=${disease}&format=json&ew_start=1&ew_end=52&ey_start=${startYear}&ey_end=${endYear}`;
      console.log(`Fetching ${disease}: ${apiUrl}`);

      const resp = await fetch(apiUrl, { headers: { "User-Agent": UA } });
      if (!resp.ok) {
        errors.push(`${disease}: HTTP ${resp.status}`);
        continue;
      }

      const data: AlertData[] = await resp.json();
      console.log(`${disease}: ${data.length} semanas`);

      const monthlyMap = new Map<string, { casos: number; nivel_max: number }>();
      for (const d of data) {
        const date = new Date(d.data_iniSE);
        const ano = date.getFullYear();
        const mes = date.getMonth() + 1;
        const key = `${ano}-${mes}`;
        const existing = monthlyMap.get(key) || { casos: 0, nivel_max: 0 };
        existing.casos += d.casos;
        existing.nivel_max = Math.max(existing.nivel_max, d.nivel);
        monthlyMap.set(key, existing);
      }

      for (const [key, val] of monthlyMap.entries()) {
        const [ano, mes] = key.split("-").map(Number);
        await upsertIndicador(sb, {
          categoria: disease,
          indicador: "casos_mes",
          ano, mes,
          semana_epidemiologica: null,
          valor: val.casos,
          valor_texto: `Nível máx: ${val.nivel_max}`,
          fonte: "InfoDengue",
          fonte_url: "https://info.dengue.mat.br/informacoes/informacoes-dengue/",
        }, errors);
        totalInserted++;
      }
      console.log(`${disease}: ${monthlyMap.size} meses inseridos`);
    } catch (e) {
      errors.push(`${disease}: ${e.message}`);
    }
  }
  return totalInserted;
}

// ========== IBGE SIDRA - Mortalidade Infantil ==========
async function syncMortalidadeInfantil(sb: any, errors: string[]) {
  let inserted = 0;
  try {
    const tables = [
      { url: `https://apisidra.ibge.gov.br/values/t/793/n6/${GEOCODE}/v/allxp/p/last%206`, name: "793" },
      { url: `https://apisidra.ibge.gov.br/values/t/21/n6/${GEOCODE}/v/allxp/p/last%206`, name: "21" },
    ];

    for (const table of tables) {
      try {
        console.log(`Trying SIDRA table ${table.name}: ${table.url}`);
        const resp = await fetch(table.url, { headers: { "User-Agent": UA } });
        if (!resp.ok) {
          const text = await resp.text();
          console.log(`SIDRA table ${table.name}: HTTP ${resp.status} - ${text.substring(0, 100)}`);
          continue;
        }
        const data = await resp.json();
        if (!data || data.length <= 1) continue;

        for (let i = 1; i < data.length; i++) {
          const row = data[i];
          const ano = parseInt(row["D3C"] || row["D2C"]);
          const valor = parseFloat(row["V"]);
          if (isNaN(ano) || isNaN(valor)) continue;

          await upsertIndicador(sb, {
            categoria: "mortalidade_infantil",
            indicador: "taxa_anual",
            ano, mes: null, semana_epidemiologica: null,
            valor,
            valor_texto: `${valor.toFixed(2)} por 1.000 nascidos vivos`,
            fonte: "IBGE/SIDRA",
            fonte_url: `https://sidra.ibge.gov.br/tabela/${table.name}`,
          }, errors);
          inserted++;
        }
        if (inserted > 0) break;
      } catch (e) {
        console.log(`SIDRA table ${table.name} error: ${e.message}`);
      }
    }

    if (inserted === 0) {
      console.log("No SIDRA data available for mortalidade infantil at municipal level");
    }
    console.log(`Mortalidade infantil: ${inserted} registros`);
  } catch (e) {
    console.log(`Mortalidade infantil error: ${e.message}`);
    errors.push(`mortalidade_infantil: ${e.message}`);
  }
  return inserted;
}

// ========== DDA - Internações por Diarreia (IBGE Pesquisas API) ==========
async function syncDDA(sb: any, errors: string[]) {
  let inserted = 0;
  try {
    // Indicador 60032 = "Internações por diarreia pelo SUS" (por 100 mil hab.)
    // API de Pesquisas do IBGE - retorna dados do Brasil Cidades/Panorama
    const apiUrl = `https://servicodados.ibge.gov.br/api/v1/pesquisas/-/indicadores/60032/resultados/N6[${GEOCODE}]`;
    console.log(`Fetching DDA: ${apiUrl}`);

    const resp = await fetch(apiUrl, { headers: { "User-Agent": UA } });
    if (!resp.ok) {
      errors.push(`dda: HTTP ${resp.status}`);
      return 0;
    }

    const data = await resp.json();
    console.log(`DDA raw response: ${JSON.stringify(data).substring(0, 500)}`);

    // API format: array with one object per indicator
    // Each has: id, indicador, res (array of localidades)
    // Each localidade has: localidade (geocode), res (object { "2022": "513.7", ... })
    if (!data || !Array.isArray(data) || data.length === 0) {
      errors.push("dda: resposta vazia da API IBGE");
      return 0;
    }

    const indicadorObj = data[0];
    
    // res can be at different levels depending on the API version
    // Try to find the results for our geocode
    let resultados: Record<string, string> | null = null;

    if (indicadorObj.res && Array.isArray(indicadorObj.res)) {
      // IBGE API returns geocode with 6 digits (without check digit)
      const geocode6 = String(GEOCODE).substring(0, 6);
      const loc = indicadorObj.res.find((r: any) => 
        String(r.localidade) === String(GEOCODE) || String(r.localidade) === geocode6
      );
      if (loc?.res) resultados = loc.res;
    } else if (indicadorObj.res && typeof indicadorObj.res === "object" && !Array.isArray(indicadorObj.res)) {
      // Format: { res: { "5213806": { "2022": "513.7" } } }
      resultados = indicadorObj.res[String(GEOCODE)];
    }

    if (!resultados) {
      console.log(`DDA: full response structure keys: ${JSON.stringify(Object.keys(indicadorObj))}`);
      errors.push("dda: resultados de Morrinhos não encontrados na resposta IBGE");
      return 0;
    }

    for (const [anoStr, valorStr] of Object.entries(resultados)) {
      const ano = parseInt(anoStr);
      const valorRaw = String(valorStr).replace(",", ".");
      const valor = parseFloat(valorRaw);
      if (isNaN(ano) || isNaN(valor)) continue;

      await upsertIndicador(sb, {
        categoria: "dda",
        indicador: "internacoes_por_100mil",
        ano,
        mes: null,
        semana_epidemiologica: null,
        valor,
        valor_texto: "internações por 100 mil habitantes",
        fonte: "IBGE Panorama — Morrinhos",
        fonte_url: "https://cidades.ibge.gov.br/brasil/go/morrinhos/panorama",
      }, errors);
      inserted++;
    }

    console.log(`DDA: ${inserted} registros inseridos/atualizados`);
  } catch (e) {
    errors.push(`dda: ${e.message}`);
  }
  return inserted;
}

// ========== Cobertura Vacinal ==========
async function syncCoberturaVacinal(_sb: any, errors: string[]) {
  console.log("Cobertura vacinal: fonte TabNet DATASUS não disponível via API REST.");
  errors.push("vacinacao: dados de cobertura vacinal do PNI/DATASUS disponíveis apenas via TabNet (sem API REST)");
  return 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const { data: log } = await sb.from("sync_log")
    .insert({ tipo: "saude_indicadores", status: "running", detalhes: {} })
    .select("id").single();
  const logId = log?.id;

  const errors: string[] = [];
  let totalInserted = 0;

  try {
    const url = new URL(req.url);
    const currentYear = new Date().getFullYear();
    const startYear = parseInt(url.searchParams.get("start_year") || String(currentYear - 1));
    const endYear = parseInt(url.searchParams.get("end_year") || String(currentYear));

    // 1. Sync InfoDengue (dengue, chikungunya, zika)
    totalInserted += await syncInfoDengue(sb, startYear, endYear, errors);

    // 2. Sync Mortalidade Infantil (IBGE SIDRA)
    totalInserted += await syncMortalidadeInfantil(sb, errors);

    // 3. Sync DDA - Internações por Diarreia (IBGE Pesquisas API)
    totalInserted += await syncDDA(sb, errors);

    // 4. Sync Cobertura Vacinal
    totalInserted += await syncCoberturaVacinal(sb, errors);

    const result = { totalInserted, errors: errors.slice(0, 10) };
    console.log("Result:", JSON.stringify(result));

    if (logId) {
      await sb.from("sync_log").update({
        status: errors.length > 0 ? "partial" : "success",
        detalhes: result, finished_at: new Date().toISOString(),
      }).eq("id", logId);
    }

    return new Response(JSON.stringify({ success: true, ...result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Erro:", error);
    if (logId) {
      await sb.from("sync_log").update({
        status: "error", detalhes: { error: error.message, errors },
        finished_at: new Date().toISOString(),
      }).eq("id", logId);
    }
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

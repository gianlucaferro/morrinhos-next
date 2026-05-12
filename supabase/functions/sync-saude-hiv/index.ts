import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GEOCODE_IBGE = "5213806"; // Morrinhos-GO
const UF = "GO";
const MUNICIPIO = "521710"; // DATASUS uses 6-digit code
const UA = "morrinhos.ai/1.0 (transparencia municipal)";

async function upsertIndicador(sb: any, row: any, errors: string[]) {
  const mesVal = row.mes ?? 0;
  const { data: existing } = await sb.from("saude_indicadores")
    .select("id")
    .eq("categoria", row.categoria)
    .eq("indicador", row.indicador)
    .eq("ano", row.ano)
    .eq("mes", mesVal)
    .limit(1);

  if (existing && existing.length > 0) {
    await sb.from("saude_indicadores").update({
      valor: row.valor,
      valor_texto: row.valor_texto || null,
    }).eq("id", existing[0].id);
  } else {
    const { error: insErr } = await sb.from("saude_indicadores").insert(row);
    if (insErr) errors.push(`${row.indicador} ${row.ano}/${row.mes}: ${insErr.message}`);
  }
}

// ========== DEMAS API - HIV/AIDS indicators ==========
async function syncFromDEMAS(sb: any, errors: string[]) {
  let inserted = 0;

  // Try DEMAS open data API for HIV indicators
  const endpoints = [
    {
      url: `https://apidadosabertos.saude.gov.br/hiv/indicadores?municipio=${GEOCODE_IBGE}&limit=200`,
      name: "indicadores",
    },
    {
      url: `https://apidadosabertos.saude.gov.br/hiv/casos?municipio=${GEOCODE_IBGE}&limit=500`,
      name: "casos",
    },
  ];

  for (const endpoint of endpoints) {
    try {
      console.log(`Fetching DEMAS ${endpoint.name}: ${endpoint.url}`);
      const resp = await fetch(endpoint.url, {
        headers: { "User-Agent": UA, "Accept": "application/json" },
      });

      if (!resp.ok) {
        const text = await resp.text();
        console.log(`DEMAS ${endpoint.name}: HTTP ${resp.status} - ${text.substring(0, 200)}`);
        continue;
      }

      const data = await resp.json();
      const items = Array.isArray(data) ? data : (data.dados || data.resultados || data.casos || []);
      console.log(`DEMAS ${endpoint.name}: ${items.length} registros`);

      for (const item of items) {
        const ano = item.ano || parseInt(item.periodo || item.ano_diagnostico || "0");
        if (!ano || ano < 2010) continue;

        const mes = item.mes || null;
        const valor = parseFloat(item.casos || item.valor || item.quantidade || "0");
        if (isNaN(valor)) continue;

        const indicadorName = endpoint.name === "casos" ? "casos_mes" : (item.indicador || "taxa_anual");

        await upsertIndicador(sb, {
          categoria: "hiv",
          indicador: mes ? "casos_mes" : indicadorName,
          ano,
          mes: mes || null,
          semana_epidemiologica: null,
          valor,
          valor_texto: mes ? `${valor} casos em ${mes}/${ano}` : `${valor} casos em ${ano}`,
          fonte: "DATASUS/SINAN",
          fonte_url: "http://indicadores.aids.gov.br/",
        }, errors);
        inserted++;
      }
    } catch (e) {
      console.log(`DEMAS ${endpoint.name} error: ${e.message}`);
      errors.push(`DEMAS ${endpoint.name}: ${e.message}`);
    }
  }

  return inserted;
}

// ========== TabNet DATASUS scraping (fallback) ==========
async function syncFromTabNet(sb: any, startYear: number, endYear: number, errors: string[]) {
  let inserted = 0;

  // TabNet doesn't have a clean JSON API, so we try the IBGE SIDRA approach
  // for HIV-related mortality data (Table 5457 - deaths by ICD-10 chapter)
  try {
    // ICD-10 B20-B24 = HIV/AIDS
    const url = `https://apisidra.ibge.gov.br/values/t/2681/n6/${GEOCODE_IBGE}/v/allxp/p/last%208`;
    console.log(`Trying SIDRA mortality table: ${url}`);

    const resp = await fetch(url, { headers: { "User-Agent": UA } });
    if (resp.ok) {
      const data = await resp.json();
      if (data && data.length > 1) {
        for (let i = 1; i < data.length; i++) {
          const row = data[i];
          const ano = parseInt(row["D3C"] || row["D2C"]);
          const valor = parseFloat(row["V"]);
          if (isNaN(ano) || isNaN(valor) || ano < 2010) continue;

          await upsertIndicador(sb, {
            categoria: "hiv",
            indicador: "obitos_anual",
            ano,
            mes: null,
            semana_epidemiologica: null,
            valor,
            valor_texto: `${valor} óbitos em ${ano}`,
            fonte: "IBGE/SIDRA",
            fonte_url: "https://sidra.ibge.gov.br/tabela/2681",
          }, errors);
          inserted++;
        }
      }
    } else {
      const text = await resp.text();
      console.log(`SIDRA HIV mortality: HTTP ${resp.status} - ${text.substring(0, 100)}`);
    }
  } catch (e) {
    console.log(`SIDRA HIV error: ${e.message}`);
  }

  // Also try inserting annual aggregates from known Boletim Epidemiológico data
  // This provides a baseline even if APIs are unavailable
  try {
    // Fetch from open data portal (dados.gov.br) for Goiás HIV notifications
    const url = `https://apidadosabertos.saude.gov.br/sinan/hiv?uf=${UF}&municipio_ibge=${GEOCODE_IBGE}&limit=500`;
    console.log(`Trying SINAN HIV API: ${url}`);

    const resp = await fetch(url, {
      headers: { "User-Agent": UA, "Accept": "application/json" },
    });

    if (resp.ok) {
      const data = await resp.json();
      const items = Array.isArray(data) ? data : (data.dados || data.resultados || []);
      console.log(`SINAN HIV: ${items.length} notificações`);

      // Aggregate by year and month
      const monthlyMap = new Map<string, number>();
      const yearlyMap = new Map<number, number>();

      for (const item of items) {
        const dtNotif = item.dt_notificacao || item.data_notificacao || "";
        let ano: number, mes: number;

        if (dtNotif.includes("-")) {
          const parts = dtNotif.split("-");
          ano = parseInt(parts[0]);
          mes = parseInt(parts[1]);
        } else if (dtNotif.includes("/")) {
          const parts = dtNotif.split("/");
          ano = parseInt(parts[2]);
          mes = parseInt(parts[1]);
        } else {
          ano = parseInt(item.ano_notificacao || item.ano || "0");
          mes = parseInt(item.mes_notificacao || item.mes || "0");
        }

        if (!ano || ano < 2010) continue;

        yearlyMap.set(ano, (yearlyMap.get(ano) || 0) + 1);
        if (mes >= 1 && mes <= 12) {
          const key = `${ano}-${mes}`;
          monthlyMap.set(key, (monthlyMap.get(key) || 0) + 1);
        }
      }

      // Insert yearly totals
      for (const [ano, total] of yearlyMap.entries()) {
        await upsertIndicador(sb, {
          categoria: "hiv",
          indicador: "casos_anual",
          ano,
          mes: null,
          semana_epidemiologica: null,
          valor: total,
          valor_texto: `${total} casos notificados em ${ano}`,
          fonte: "DATASUS/SINAN",
          fonte_url: "http://indicadores.aids.gov.br/",
        }, errors);
        inserted++;
      }

      // Insert monthly breakdown
      for (const [key, total] of monthlyMap.entries()) {
        const [ano, mes] = key.split("-").map(Number);
        await upsertIndicador(sb, {
          categoria: "hiv",
          indicador: "casos_mes",
          ano,
          mes,
          semana_epidemiologica: null,
          valor: total,
          valor_texto: `${total} casos em ${mes}/${ano}`,
          fonte: "DATASUS/SINAN",
          fonte_url: "http://indicadores.aids.gov.br/",
        }, errors);
        inserted++;
      }
    } else {
      const text = await resp.text();
      console.log(`SINAN HIV: HTTP ${resp.status} - ${text.substring(0, 200)}`);
    }
  } catch (e) {
    console.log(`SINAN HIV error: ${e.message}`);
    errors.push(`sinan_hiv: ${e.message}`);
  }

  return inserted;
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

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const { data: log } = await sb.from("sync_log")
    .insert({ tipo: "saude_hiv", status: "running", detalhes: {} })
    .select("id").single();
  const logId = log?.id;

  const errors: string[] = [];
  let totalInserted = 0;

  try {
    const url = new URL(req.url);
    const currentYear = new Date().getFullYear();
    const startYear = parseInt(url.searchParams.get("start_year") || String(currentYear - 3));
    const endYear = parseInt(url.searchParams.get("end_year") || String(currentYear));

    // 1. Try DEMAS open data API
    totalInserted += await syncFromDEMAS(sb, errors);

    // 2. Try TabNet / SINAN / SIDRA fallbacks
    totalInserted += await syncFromTabNet(sb, startYear, endYear, errors);

    const result = { totalInserted, errors: errors.slice(0, 10) };
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

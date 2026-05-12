import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CKAN_BASE = "https://dadosabertos.go.gov.br/api/3/action/datastore_search";
const SRAG_RESOURCE_ID = "f7336b71-f38e-45cb-b07d-a20990c37e18";
const MUNICIPIO = "MORRINHOS";
const PAGE_SIZE = 100;

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

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Log sync start
    const { data: logEntry } = await supabase.from("sync_log").insert({
      tipo: "saude_srag",
      status: "running",
    }).select("id").single();

    // Fetch all SRAG records for Morrinhos from CKAN API
    const allRecords: any[] = [];
    let offset = 0;
    let total = Infinity;

    while (offset < total) {
      const url = `${CKAN_BASE}?resource_id=${SRAG_RESOURCE_ID}&filters={"municipio_residencia":"${MUNICIPIO}"}&limit=${PAGE_SIZE}&offset=${offset}`;
      const res = await fetch(url);
      const json = await res.json();

      if (!json.success) throw new Error("CKAN API error");

      total = json.result.total;
      allRecords.push(...json.result.records);
      offset += PAGE_SIZE;
    }

    console.log(`Fetched ${allRecords.length} SRAG records for ${MUNICIPIO}`);

    // Aggregate by year/month and classification
    const monthlyAgg: Record<string, {
      ano: number; mes: number;
      covid_internacoes: number; covid_obitos: number; covid_curas: number;
      total_internacoes: number; total_obitos: number;
      influenza: number; outros_virus: number; nao_especificado: number;
    }> = {};

    for (const rec of allRecords) {
      const dataNotif = rec.data_notificacao || rec.data_sintomas || "";
      if (!dataNotif || dataNotif.length < 6) continue;

      // Date format: YYYYMMDD
      const ano = parseInt(dataNotif.substring(0, 4));
      const mes = parseInt(dataNotif.substring(4, 6));
      if (!ano || !mes || ano < 2020) continue;

      const key = `${ano}-${String(mes).padStart(2, "0")}`;
      if (!monthlyAgg[key]) {
        monthlyAgg[key] = {
          ano, mes,
          covid_internacoes: 0, covid_obitos: 0, covid_curas: 0,
          total_internacoes: 0, total_obitos: 0,
          influenza: 0, outros_virus: 0, nao_especificado: 0,
        };
      }

      const agg = monthlyAgg[key];
      agg.total_internacoes++;

      const classif = (rec.classificao_final || "").toUpperCase();
      const evolucao = (rec.evolucao_final || "").toUpperCase();

      const isObito = evolucao.includes("OBITO") && !evolucao.includes("OUTRAS CAUSAS");

      if (isObito) agg.total_obitos++;

      if (classif.includes("COVID")) {
        agg.covid_internacoes++;
        if (isObito) agg.covid_obitos++;
        if (evolucao === "CURA") agg.covid_curas++;
      } else if (classif.includes("INFLUENZA")) {
        agg.influenza++;
      } else if (classif.includes("OUTRO VIRUS")) {
        agg.outros_virus++;
      } else {
        agg.nao_especificado++;
      }
    }

    // Delete old covid indicators
    await supabase.from("saude_indicadores")
      .delete()
      .eq("categoria", "covid");

    // Insert aggregated data
    const rows: any[] = [];
    const fonteUrl = "https://dadosabertos.go.gov.br/dataset/srag";

    for (const [, agg] of Object.entries(monthlyAgg)) {
      // COVID hospitalizations per month
      rows.push({
        categoria: "covid",
        indicador: "internacoes_covid_mes",
        ano: agg.ano,
        mes: agg.mes,
        valor: agg.covid_internacoes,
        fonte: "SIVEP-Gripe / SES-GO",
        fonte_url: fonteUrl,
      });

      // COVID deaths per month
      rows.push({
        categoria: "covid",
        indicador: "obitos_covid_mes",
        ano: agg.ano,
        mes: agg.mes,
        valor: agg.covid_obitos,
        fonte: "SIVEP-Gripe / SES-GO",
        fonte_url: fonteUrl,
      });

      // Total SRAG hospitalizations (all causes)
      rows.push({
        categoria: "covid",
        indicador: "internacoes_srag_total_mes",
        ano: agg.ano,
        mes: agg.mes,
        valor: agg.total_internacoes,
        valor_texto: JSON.stringify({
          covid: agg.covid_internacoes,
          influenza: agg.influenza,
          outros_virus: agg.outros_virus,
          nao_especificado: agg.nao_especificado,
        }),
        fonte: "SIVEP-Gripe / SES-GO",
        fonte_url: fonteUrl,
      });
    }

    // Also insert annual totals
    const annualAgg: Record<number, { covid: number; obitos: number; total: number }> = {};
    for (const [, agg] of Object.entries(monthlyAgg)) {
      if (!annualAgg[agg.ano]) annualAgg[agg.ano] = { covid: 0, obitos: 0, total: 0 };
      annualAgg[agg.ano].covid += agg.covid_internacoes;
      annualAgg[agg.ano].obitos += agg.covid_obitos;
      annualAgg[agg.ano].total += agg.total_internacoes;
    }

    for (const [ano, totals] of Object.entries(annualAgg)) {
      rows.push({
        categoria: "covid",
        indicador: "internacoes_covid_anual",
        ano: parseInt(ano),
        valor: totals.covid,
        fonte: "SIVEP-Gripe / SES-GO",
        fonte_url: fonteUrl,
      });
      rows.push({
        categoria: "covid",
        indicador: "obitos_covid_anual",
        ano: parseInt(ano),
        valor: totals.obitos,
        fonte: "SIVEP-Gripe / SES-GO",
        fonte_url: fonteUrl,
      });
      rows.push({
        categoria: "covid",
        indicador: "internacoes_srag_anual",
        ano: parseInt(ano),
        valor: totals.total,
        fonte: "SIVEP-Gripe / SES-GO",
        fonte_url: fonteUrl,
      });
    }

    // Batch insert
    const batchSize = 50;
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      const { error } = await supabase.from("saude_indicadores").insert(batch);
      if (error) console.error("Insert error:", error);
    }

    // Update sync log
    if (logEntry?.id) {
      await supabase.from("sync_log").update({
        status: "done",
        finished_at: new Date().toISOString(),
        detalhes: {
          total_registros_fonte: allRecords.length,
          indicadores_inseridos: rows.length,
          meses_com_dados: Object.keys(monthlyAgg).length,
        },
      }).eq("id", logEntry.id);
    }

    return new Response(JSON.stringify({
      success: true,
      total_records: allRecords.length,
      indicators_created: rows.length,
      months: Object.keys(monthlyAgg).length,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Sync error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// sync-clima-historico — popula clima_historico_mensal via Open-Meteo Archive.
//
// Modos:
//   ?action=current (default) — refresha o ANO CORRENTE (jan-hoje).
//                                Idempotente: upsert por (ano, mes).
//   ?action=backfill&from=YYYY  — popula do ano `from` ate o ano corrente.
//                                Usado 1x na criacao da tabela ou pra preencher gap.
//
// Open-Meteo Archive: gratuito, sem auth. Limite ~10k req/dia/IP. Aqui fazemos
// 1 req/ano-coberto (ate ~9 reqs no backfill total) — bem dentro do budget.
//
// Cron weekly: domingo 04:00 UTC chama com action=current. Anos passados ja
// estao imutaveis na tabela, so o ano corrente e' refreshado.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LAT = -17.7311;
const LNG = -49.1058;
const ARCHIVE_BASE = "https://archive-api.open-meteo.com/v1/archive";

interface ArchiveResp {
  daily?: { time: string[]; precipitation_sum: (number | null)[] };
  error?: boolean;
  reason?: string;
}

async function fetchYearPrecipitation(
  ano: number,
  endOverride?: string,
): Promise<Map<number, { acumulado: number; diasComChuva: number }> | null> {
  const today = new Date().toISOString().slice(0, 10);
  const start = `${ano}-01-01`;
  const yearEnd = `${ano}-12-31`;
  const end = endOverride ?? (yearEnd <= today ? yearEnd : today);

  // Ano futuro: nada a buscar
  if (start > today) return new Map();

  const url = `${ARCHIVE_BASE}?latitude=${LAT}&longitude=${LNG}&start_date=${start}&end_date=${end}&daily=precipitation_sum&timezone=America%2FSao_Paulo`;
  const r = await fetch(url);
  if (!r.ok) {
    console.error(`Open-Meteo HTTP ${r.status} for ${ano}: ${(await r.text()).slice(0, 200)}`);
    return null;
  }
  const json = (await r.json()) as ArchiveResp;
  const daily = json.daily;
  if (!daily) return null;

  const porMes = new Map<number, { acumulado: number; diasComChuva: number }>();
  for (let i = 0; i < daily.time.length; i++) {
    const m = parseInt(daily.time[i].slice(5, 7));
    const v = daily.precipitation_sum[i] ?? 0;
    const cur = porMes.get(m) ?? { acumulado: 0, diasComChuva: 0 };
    cur.acumulado += v;
    if (v > 0.1) cur.diasComChuva += 1;
    porMes.set(m, cur);
  }
  return porMes;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  const action = url.searchParams.get("action") ?? "current";
  const fromParam = url.searchParams.get("from");

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const anoCorrente = new Date().getFullYear();

  // Determina range de anos a processar
  let anos: number[];
  if (action === "backfill") {
    const from = fromParam ? parseInt(fromParam) : 2018;
    if (!Number.isFinite(from) || from < 1940 || from > anoCorrente) {
      return new Response(
        JSON.stringify({ success: false, error: `from inválido: ${fromParam}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    anos = [];
    for (let y = from; y <= anoCorrente; y++) anos.push(y);
  } else if (action === "current") {
    anos = [anoCorrente];
  } else {
    return new Response(
      JSON.stringify({ success: false, error: `action inválida: ${action}` }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const { data: log } = await sb.from("sync_log")
    .insert({
      tipo: "clima_historico",
      status: "running",
      detalhes: { action, anos },
    })
    .select("id").single();

  try {
    const upserts: Array<{
      ano: number;
      mes: number;
      precipitacao_acumulada_mm: number;
      dias_com_chuva: number;
    }> = [];

    for (const ano of anos) {
      const porMes = await fetchYearPrecipitation(ano);
      if (!porMes) {
        console.warn(`Skipping ${ano}: fetch failed`);
        continue;
      }
      for (const [mes, dados] of porMes.entries()) {
        upserts.push({
          ano,
          mes,
          precipitacao_acumulada_mm: Math.round(dados.acumulado * 100) / 100,
          dias_com_chuva: dados.diasComChuva,
        });
      }
    }

    // Upsert em batch
    const { error: upError } = await sb
      .from("clima_historico_mensal")
      .upsert(upserts, { onConflict: "ano,mes" });

    if (upError) throw upError;

    const result = {
      action,
      anos_processados: anos,
      meses_upserted: upserts.length,
      sample: upserts.slice(0, 3),
    };
    if (log?.id) {
      await sb.from("sync_log").update({
        status: "success",
        detalhes: result,
        finished_at: new Date().toISOString(),
      }).eq("id", log.id);
    }

    return new Response(JSON.stringify({ success: true, ...result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = (e as Error).message;
    if (log?.id) {
      await sb.from("sync_log").update({
        status: "error",
        detalhes: { error: msg },
        finished_at: new Date().toISOString(),
      }).eq("id", log.id);
    }
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

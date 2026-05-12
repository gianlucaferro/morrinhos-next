// TSE Dados Abertos — candidatos e doadores das ultimas eleicoes municipais
// dadosabertos.tse.jus.br tem CSVs por estado/cargo/ano
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Endpoint CKAN do TSE
const CKAN_BASE = "https://dadosabertos.tse.jus.br/api/3/action";
const COD_TSE_MORRINHOS = "94994"; // codigo TSE do municipio (5 digitos)

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
  const url = new URL(req.url);
  const dryRun = url.searchParams.get("dry_run") === "1";
  const ano = parseInt(url.searchParams.get("ano") || "2024");

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: log } = await sb.from("sync_log")
    .insert({ tipo: "tse_eleicoes", status: "running", detalhes: { ano, municipio: "Morrinhos" } })
    .select("id").single();

  try {
    // Buscar dataset mais recente de candidatos GO no CKAN
    const searchUrl = `${CKAN_BASE}/package_search?q=candidatos+${ano}+goias&rows=5`;
    const r = await fetch(searchUrl);
    if (!r.ok) throw new Error(`TSE CKAN HTTP ${r.status}`);
    const json = await r.json();
    const packages = json?.result?.results ?? [];

    // Localizar resource CSV de GO
    let csvUrl: string | null = null;
    for (const pkg of packages) {
      for (const res of (pkg.resources ?? [])) {
        if (res.format === "CSV" && /go|goias/i.test(res.name)) {
          csvUrl = res.url;
          break;
        }
      }
      if (csvUrl) break;
    }
    if (!csvUrl) throw new Error("CSV GO de candidatos nao localizado");

    // Por padrao TSE retorna ZIP — minimal viable: registrar sync log com URL e contar candidatos GO via fetch ranges
    // Implementacao plena de parse ZIP/CSV fica para iteracao 2 (precisa rodar local em Deno com unzip)
    const result = {
      ano,
      csv_url: csvUrl,
      note: "MVP: URL do CSV GO localizada. Parse completo ZIP/CSV requer iteracao com unzip lib em Deno.",
      next_step: "implementar parse com std/archive em proxima versao",
    };

    if (log?.id) await sb.from("sync_log").update({ status: "partial", detalhes: result, finished_at: new Date().toISOString() }).eq("id", log.id);
    return new Response(JSON.stringify({ success: true, dry_run: dryRun, ...result }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    const msg = (e as Error).message;
    if (log?.id) await sb.from("sync_log").update({ status: "error", detalhes: { error: msg }, finished_at: new Date().toISOString() }).eq("id", log.id);
    return new Response(JSON.stringify({ success: false, error: msg }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

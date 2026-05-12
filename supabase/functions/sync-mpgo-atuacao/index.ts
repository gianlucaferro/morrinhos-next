// MP-GO: atuacao do Ministerio Publico em Morrinhos via FireCrawl
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { firecrawlSearch, firecrawlScrape } from "../_shared/firecrawl.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const QUERY = 'site:mpgo.mp.br "Morrinhos"';

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
  const limit = parseInt(url.searchParams.get("limit") || "10");

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: log } = await sb.from("sync_log")
    .insert({ tipo: "mpgo_atuacao", status: "running", detalhes: { query: QUERY, limit } })
    .select("id").single();

  let creditsUsed = 0;
  try {
    const search = await firecrawlSearch(QUERY, { limit, scrape: false });
    creditsUsed += 1;
    if (!search.success) throw new Error(search.error);
    const results = (search.data ?? []) as Array<{ url: string; title?: string }>;

    const urls = results.map(r => r.url).filter(Boolean);
    const { data: existing } = await sb.from("mpgo_atuacao").select("fonte_url").in("fonte_url", urls);
    const existingSet = new Set((existing ?? []).map(r => r.fonte_url));
    const novas = results.filter(r => r.url && !existingSet.has(r.url));

    const upserted: string[] = [];
    for (const item of novas) {
      const scraped = await firecrawlScrape(item.url, { formats: ["markdown"], onlyMainContent: true });
      creditsUsed += 1;
      if (!scraped.success || !scraped.data) continue;
      const md = (scraped.data.markdown ?? "") as string;

      const titleLower = (item.title || "").toLowerCase();
      let tipo = "outros";
      if (/recomenda[çc][ãa]o/.test(titleLower)) tipo = "recomendacao";
      else if (/a[çc][ãa]o\s+civil|inqu[eé]rito\s+civil|tac/.test(titleLower)) tipo = "acao_civil";
      else if (/promo[çc][ãa]o|denuncia/.test(titleLower)) tipo = "denuncia";
      else if (/not[ií]cia/.test(titleLower)) tipo = "noticia";

      const dataMatch = md.match(/(\d{2})\/(\d{2})\/(\d{4})/);
      const dataPub = dataMatch ? `${dataMatch[3]}-${dataMatch[2]}-${dataMatch[1]}` : new Date().toISOString().slice(0, 10);

      const row = {
        tipo,
        promotoria: null,
        ementa: item.title ?? null,
        data_publicacao: dataPub,
        fonte_url: item.url,
      };

      if (dryRun) { upserted.push(`${tipo}: ${row.ementa?.slice(0, 50)}`); continue; }
      const { error } = await sb.from("mpgo_atuacao").upsert(row, { onConflict: "fonte_url" });
      if (!error) upserted.push(`${tipo}: ${row.ementa?.slice(0, 50)}`);
    }

    const result = { search_results: results.length, novas: novas.length, upserted: upserted.length, credits_used: creditsUsed };
    if (log?.id) await sb.from("sync_log").update({ status: "success", detalhes: result, finished_at: new Date().toISOString() }).eq("id", log.id);
    return new Response(JSON.stringify({ success: true, dry_run: dryRun, ...result }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    const msg = (e as Error).message;
    if (log?.id) await sb.from("sync_log").update({ status: "error", detalhes: { error: msg, credits_used: creditsUsed }, finished_at: new Date().toISOString() }).eq("id", log.id);
    return new Response(JSON.stringify({ success: false, error: msg }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

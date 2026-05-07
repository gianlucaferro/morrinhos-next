// DETRAN-GO via FireCrawl: estatisticas de sinistros e infracoes em Morrinhos
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { firecrawlSearch } from "../_shared/firecrawl.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const QUERIES = [
  'site:detran.go.gov.br "Morrinhos" sinistros',
  'site:detran.go.gov.br "Morrinhos" estatisticas',
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const url = new URL(req.url);
  const dryRun = url.searchParams.get("dry_run") === "1";

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: log } = await sb.from("sync_log")
    .insert({ tipo: "detran_go", status: "running", detalhes: { queries: QUERIES } })
    .select("id").single();

  let creditsUsed = 0;
  try {
    const today = new Date().toISOString().slice(0, 10);
    const upserted: string[] = [];

    for (const q of QUERIES) {
      const search = await firecrawlSearch(q, { limit: 5, scrape: true });
      creditsUsed += 1; // search returns scrape inline; 1 credit + 1 per result
      if (!search.success) continue;
      const results = (search.data ?? []) as Array<{ url: string; title?: string; markdown?: string }>;
      creditsUsed += results.length;

      for (const item of results) {
        const md = item.markdown ?? "";
        // Procurar numeros que possam ser totais
        const sinistroMatch = md.match(/(\d{2,5})\s+sinistros?/i);
        const tipo = sinistroMatch ? "sinistro" : "frota_geral";

        const row = {
          tipo,
          data_referencia: today,
          municipio: "Morrinhos",
          total: sinistroMatch ? parseInt(sinistroMatch[1]) : null,
          detalhes: { titulo: item.title, snippet: md.slice(0, 500) },
          fonte_url: item.url,
        };

        if (dryRun) { upserted.push(`${tipo}: ${row.total ?? "?"}`); continue; }
        const { error } = await sb.from("detran_go_dados").insert(row);
        if (!error) upserted.push(`${tipo}: ${row.total ?? "?"}`);
      }
    }

    const result = { upserted: upserted.length, credits_used: creditsUsed, sample: upserted.slice(0, 5) };
    if (log?.id) await sb.from("sync_log").update({ status: "success", detalhes: result, finished_at: new Date().toISOString() }).eq("id", log.id);
    return new Response(JSON.stringify({ success: true, dry_run: dryRun, ...result }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    const msg = (e as Error).message;
    if (log?.id) await sb.from("sync_log").update({ status: "error", detalhes: { error: msg, credits_used: creditsUsed }, finished_at: new Date().toISOString() }).eq("id", log.id);
    return new Response(JSON.stringify({ success: false, error: msg }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

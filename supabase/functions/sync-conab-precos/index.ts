// CONAB precos agricolas via FireCrawl scrape
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { firecrawlScrape } from "../_shared/firecrawl.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const URLS = [
  { produto: "soja", url: "https://www.conab.gov.br/info-agro/precos/precos-agropecuarios" },
  { produto: "milho", url: "https://www.conab.gov.br/info-agro/precos/precos-agropecuarios" },
];

function parsePrecoBR(s: string): number | null {
  const cleaned = s.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
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
  const url = new URL(req.url);
  const dryRun = url.searchParams.get("dry_run") === "1";

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: log } = await sb.from("sync_log")
    .insert({ tipo: "conab_precos", status: "running" })
    .select("id").single();

  let creditsUsed = 0;
  try {
    const today = new Date().toISOString().slice(0, 10);
    const upserted: string[] = [];

    // Scrape unico (mesma URL pra ambos produtos atualmente)
    const visited = new Set<string>();
    for (const item of URLS) {
      if (visited.has(item.url)) continue;
      visited.add(item.url);
      const scraped = await firecrawlScrape(item.url, { formats: ["markdown"], onlyMainContent: true });
      creditsUsed += 1;
      if (!scraped.success || !scraped.data) continue;
      const md = (scraped.data.markdown ?? "") as string;

      // Heuristica: linhas com produto + valor BRL
      const lines = md.split(/\n+/);
      for (const line of lines) {
        const lineLower = line.toLowerCase();
        for (const produto of ["soja", "milho", "sorgo", "feijao", "feijão", "arroz"]) {
          if (!lineLower.includes(produto)) continue;
          const valueMatch = line.match(/r?\$?\s*(\d{1,3}(?:[.,]\d{2,3})*)/i);
          if (!valueMatch) continue;
          const preco = parsePrecoBR(valueMatch[1]);
          if (!preco || preco < 1) continue;

          const row = {
            produto: produto.replace("ã", "a"),
            unidade: line.match(/\b(saca|kg|ton|@)\b/i)?.[1] ?? "saca 60kg",
            preco,
            data_referencia: today,
            praca: null,
            estado: "GO",
            fonte_url: item.url,
          };
          if (dryRun) { upserted.push(`${row.produto} R$${row.preco}`); continue; }
          const { error } = await sb.from("conab_precos").upsert(row, { onConflict: "produto,data_referencia,praca" });
          if (!error) upserted.push(`${row.produto} R$${row.preco}`);
          break;
        }
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

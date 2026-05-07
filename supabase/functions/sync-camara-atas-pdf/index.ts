// Atas Camara: extrair texto dos PDFs via FireCrawl com dedup
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { firecrawlScrape } from "../_shared/firecrawl.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const url = new URL(req.url);
  const dryRun = url.searchParams.get("dry_run") === "1";
  const limit = parseInt(url.searchParams.get("limit") || "5");

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: log } = await sb.from("sync_log")
    .insert({ tipo: "camara_atas_pdf", status: "running", detalhes: { limit } })
    .select("id").single();

  let creditsUsed = 0;
  try {
    // 1) Buscar PDFs de atas em presenca_sessoes que ainda nao tem texto extraido
    // Tabela presenca_sessoes deve ter campo com URL do PDF — usar flexivelmente
    const { data: sessoes } = await sb.from("presenca_sessoes")
      .select("id, sessao_data, ata_url, pdf_url, fonte_url")
      .order("sessao_data", { ascending: false })
      .limit(50);
    if (!sessoes?.length) throw new Error("Nenhuma sessao em presenca_sessoes");

    const candidatos = sessoes
      .map((s: any) => ({ data: s.sessao_data, url: s.ata_url || s.pdf_url || s.fonte_url }))
      .filter(c => c.url && /\.pdf(\?|$)/i.test(c.url));
    if (!candidatos.length) throw new Error("Nenhum PDF encontrado em presenca_sessoes");

    const urls = candidatos.map(c => c.url);
    const { data: existing } = await sb.from("camara_atas_texto").select("pdf_url").in("pdf_url", urls);
    const existingSet = new Set((existing ?? []).map(r => r.pdf_url));
    const novas = candidatos.filter(c => !existingSet.has(c.url)).slice(0, limit);

    const upserted: string[] = [];
    for (const c of novas) {
      const scraped = await firecrawlScrape(c.url, { formats: ["markdown"], parsePDF: true, onlyMainContent: false });
      creditsUsed += 1;
      if (!scraped.success || !scraped.data) continue;
      const texto = (scraped.data.markdown ?? "") as string;
      if (texto.length < 100) continue;

      const row = { sessao_data: c.data, pdf_url: c.url, texto_completo: texto, topicos_abordados: null };
      if (dryRun) { upserted.push(c.url); continue; }
      const { error } = await sb.from("camara_atas_texto").upsert(row, { onConflict: "pdf_url" });
      if (!error) upserted.push(c.url);
    }

    const result = { candidatos: candidatos.length, novas: novas.length, upserted: upserted.length, credits_used: creditsUsed };
    if (log?.id) await sb.from("sync_log").update({ status: "success", detalhes: result, finished_at: new Date().toISOString() }).eq("id", log.id);
    return new Response(JSON.stringify({ success: true, dry_run: dryRun, ...result }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    const msg = (e as Error).message;
    if (log?.id) await sb.from("sync_log").update({ status: "error", detalhes: { error: msg, credits_used: creditsUsed }, finished_at: new Date().toISOString() }).eq("id", log.id);
    return new Response(JSON.stringify({ success: false, error: msg }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

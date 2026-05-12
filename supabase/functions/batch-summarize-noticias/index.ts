// Processa N notícias sem resumo IA em lote (rate-limited)
// Default: 20 por execução (~3 min com delay 8s entre chamadas, dentro do free tier Gemini 15rpm)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function summarize(titulo: string, resumo: string | null, conteudo: string | null, geminiKey: string): Promise<string> {
  const contexto = [titulo, resumo, conteudo].filter(Boolean).join("\n\n").slice(0, 4000);
  const prompt = `Você é um assistente que explica notícias da Prefeitura de Morrinhos-GO de forma clara para cidadãos.

NOTÍCIA:
${contexto}

Gere um resumo em 2-3 frases curtas explicando: (1) o fato principal em linguagem simples, (2) quem é afetado/beneficiado, (3) por que importa para Morrinhos. Sem jargão. Máximo 100 palavras.`;

  const resp = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${geminiKey}` },
    body: JSON.stringify({
      model: "gemini-2.5-flash-lite",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 400, temperature: 0.3,
    }),
  });
  if (!resp.ok) throw new Error(`Gemini ${resp.status}: ${(await resp.text()).slice(0, 100)}`);
  const data = await resp.json();
  return data.choices?.[0]?.message?.content?.trim() || "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const geminiKey = Deno.env.get("GEMINI_API_KEY");
  if (!geminiKey) return new Response(JSON.stringify({ error: "GEMINI_API_KEY não configurada" }), { status: 500, headers: corsHeaders });
  const sb = createClient(supabaseUrl, serviceKey);

  const url = new URL(req.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "20"), 30);
  const delayMs = parseInt(url.searchParams.get("delay_ms") || "5000");

  const { data: log } = await sb.from("sync_log").insert({ tipo: "batch_summarize_noticias", status: "running", detalhes: { limit, delay_ms: delayMs } }).select("id").single();
  const logId = log?.id;

  try {
    const { data: noticias, error } = await sb.from("prefeitura_noticias")
      .select("id, titulo, resumo, conteudo_md")
      .is("conteudo_resumo_ia", null)
      .not("titulo", "is", null)
      .order("data_publicacao", { ascending: false, nullsFirst: false })
      .limit(limit);
    if (error) throw error;
    if (!noticias || noticias.length === 0) {
      if (logId) await sb.from("sync_log").update({ status: "success", detalhes: { processed: 0, message: "nenhuma notícia sem resumo" }, finished_at: new Date().toISOString() }).eq("id", logId);
      return new Response(JSON.stringify({ success: true, processed: 0, message: "Nenhuma notícia sem resumo" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let success = 0;
    const errors: string[] = [];
    for (const n of noticias) {
      try {
        const resumo = await summarize(n.titulo, n.resumo, n.conteudo_md, geminiKey);
        if (resumo) {
          await sb.from("prefeitura_noticias").update({ conteudo_resumo_ia: resumo }).eq("id", n.id);
          success++;
        }
      } catch (e) {
        errors.push(`${n.id}: ${(e as Error).message.slice(0, 100)}`);
      }
      // Rate limit Gemini Free 15rpm = 1 req cada 4s; usamos 5s pra folga
      await new Promise(r => setTimeout(r, delayMs));
    }
    const result = { processed: noticias.length, success, errors: errors.slice(0, 5) };
    if (logId) await sb.from("sync_log").update({ status: errors.length ? "partial" : "success", detalhes: result, finished_at: new Date().toISOString() }).eq("id", logId);
    return new Response(JSON.stringify({ success: true, ...result }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    const msg = (e as Error).message;
    if (logId) await sb.from("sync_log").update({ status: "error", detalhes: { error: msg }, finished_at: new Date().toISOString() }).eq("id", logId);
    return new Response(JSON.stringify({ success: false, error: msg }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

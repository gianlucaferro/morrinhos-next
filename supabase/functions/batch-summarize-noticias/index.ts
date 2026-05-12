// Processa notícias sem resumo IA em lote
// v2 — retry com backoff em 503, parada graceful em 429 (quota diária), delay 8s padrão
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

class QuotaExceededError extends Error {
  constructor() { super("Gemini daily quota exhausted (429). Try again tomorrow."); }
}

async function callGemini(prompt: string, key: string, retries = 3): Promise<string> {
  for (let attempt = 0; attempt < retries; attempt++) {
    const resp = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}` },
      body: JSON.stringify({
        model: "gemini-2.5-flash-lite",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 400, temperature: 0.3,
      }),
    });
    if (resp.ok) {
      const data = await resp.json();
      return data.choices?.[0]?.message?.content?.trim() || "";
    }
    if (resp.status === 429) {
      const body = (await resp.text()).slice(0, 200);
      // Pode ser RPM (transitório) ou quota diária (parar). Tentamos detectar
      if (body.toLowerCase().includes("quota") && body.toLowerCase().includes("daily")) {
        throw new QuotaExceededError();
      }
      // RPM exceeded — esperar 30s e retry
      if (attempt < retries - 1) {
        await new Promise(r => setTimeout(r, 30000));
        continue;
      }
      throw new QuotaExceededError();
    }
    if (resp.status === 503) {
      // Model overloaded — exponential backoff
      if (attempt < retries - 1) {
        await new Promise(r => setTimeout(r, (attempt + 1) * 5000));
        continue;
      }
      throw new Error(`Gemini 503 (overload after ${retries} retries)`);
    }
    // Outro erro: não tem retry
    throw new Error(`Gemini ${resp.status}: ${(await resp.text()).slice(0, 100)}`);
  }
  throw new Error("Max retries exceeded");
}

async function summarize(titulo: string, resumo: string | null, conteudo: string | null, key: string): Promise<string> {
  const contexto = [titulo, resumo, conteudo].filter(Boolean).join("\n\n").slice(0, 4000);
  const prompt = `Você é um assistente que explica notícias da Prefeitura de Morrinhos-GO de forma clara para cidadãos.

NOTÍCIA:
${contexto}

Gere um resumo em 2-3 frases curtas explicando: (1) o fato principal em linguagem simples, (2) quem é afetado/beneficiado, (3) por que importa para Morrinhos. Sem jargão. Máximo 100 palavras.`;
  return callGemini(prompt, key);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const geminiKey = Deno.env.get("GEMINI_API_KEY");
  if (!geminiKey) return new Response(JSON.stringify({ error: "GEMINI_API_KEY não configurada" }), { status: 500, headers: corsHeaders });
  const sb = createClient(supabaseUrl, serviceKey);

  const url = new URL(req.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "15"), 30);
  const delayMs = parseInt(url.searchParams.get("delay_ms") || "8000"); // 8s = 7.5 rpm

  const { data: log } = await sb.from("sync_log").insert({ tipo: "batch_summarize_noticias", status: "running", detalhes: { limit, delay_ms: delayMs } }).select("id").single();
  const logId = log?.id;

  try {
    const { data: noticias, error } = await sb.from("prefeitura_noticias")
      .select("id, titulo, resumo, conteudo_md")
      .is("conteudo_resumo_ia", null)
      .not("titulo", "is", null)
      .neq("titulo", "")
      .order("data_publicacao", { ascending: false, nullsFirst: false })
      .limit(limit);
    if (error) throw error;
    if (!noticias || noticias.length === 0) {
      if (logId) await sb.from("sync_log").update({ status: "success", detalhes: { processed: 0, message: "nenhuma notícia sem resumo" }, finished_at: new Date().toISOString() }).eq("id", logId);
      return new Response(JSON.stringify({ success: true, processed: 0, message: "Nenhuma notícia sem resumo" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let success = 0;
    const errors: string[] = [];
    let quotaHit = false;
    for (const n of noticias) {
      if (quotaHit) {
        errors.push(`${n.id}: skipped (quota hit)`);
        continue;
      }
      try {
        const resumo = await summarize(n.titulo, n.resumo, n.conteudo_md, geminiKey);
        if (resumo) {
          await sb.from("prefeitura_noticias").update({ conteudo_resumo_ia: resumo }).eq("id", n.id);
          success++;
        }
      } catch (e) {
        if (e instanceof QuotaExceededError) {
          quotaHit = true;
          errors.push(`${n.id}: QUOTA_EXHAUSTED — batch stopped early`);
        } else {
          errors.push(`${n.id}: ${(e as Error).message.slice(0, 80)}`);
        }
      }
      if (!quotaHit) await new Promise(r => setTimeout(r, delayMs));
    }
    const result = { processed: noticias.length, success, quota_exhausted: quotaHit, errors: errors.slice(0, 5) };
    if (logId) await sb.from("sync_log").update({ status: errors.length ? "partial" : "success", detalhes: result, finished_at: new Date().toISOString() }).eq("id", logId);
    return new Response(JSON.stringify({ success: true, ...result }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    const msg = (e as Error).message;
    if (logId) await sb.from("sync_log").update({ status: "error", detalhes: { error: msg }, finished_at: new Date().toISOString() }).eq("id", logId);
    return new Response(JSON.stringify({ success: false, error: msg }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

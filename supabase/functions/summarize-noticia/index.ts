// Resume uma notícia da Prefeitura via Gemini 2.5 Flash Lite
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const geminiKey = Deno.env.get("GEMINI_API_KEY");
  if (!geminiKey) {
    return new Response(JSON.stringify({ error: "GEMINI_API_KEY não configurada" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    const { noticia_id } = await req.json();
    if (!noticia_id) throw new Error("noticia_id é obrigatório");

    const { data: noticia, error } = await supabase
      .from("prefeitura_noticias")
      .select("id, titulo, resumo, conteudo_md, conteudo_resumo_ia, url, fonte_url")
      .eq("id", noticia_id).single();
    if (error || !noticia) throw new Error("Notícia não encontrada");
    if (noticia.conteudo_resumo_ia) {
      return new Response(JSON.stringify({ success: true, resumo: noticia.conteudo_resumo_ia, cached: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const contexto = [noticia.titulo, noticia.resumo, noticia.conteudo_md].filter(Boolean).join("\n\n").slice(0, 4000);
    if (!contexto.trim()) throw new Error("Notícia sem conteúdo");

    const prompt = `Você é um assistente que explica notícias da Prefeitura de Morrinhos-GO de forma clara para cidadãos comuns.

NOTÍCIA:
${contexto}

Gere um resumo em 2-3 frases curtas, explicando:
1. O fato principal em linguagem simples
2. Quem é afetado / quem se beneficia
3. Por que isso importa para o morador de Morrinhos

Sem jargão burocrático. Máximo 100 palavras.`;

    const resp = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${geminiKey}` },
      body: JSON.stringify({
        model: "gemini-flash-lite-latest",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 400, temperature: 0.3,
      }),
    });
    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error(`Gemini ${resp.status}: ${errText.slice(0, 200)}`);
    }
    const data = await resp.json();
    const resumo = data.choices?.[0]?.message?.content?.trim() || "";
    if (!resumo) throw new Error("Resposta vazia do Gemini");

    await supabase.from("prefeitura_noticias").update({ conteudo_resumo_ia: resumo }).eq("id", noticia_id);

    return new Response(JSON.stringify({ success: true, resumo }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

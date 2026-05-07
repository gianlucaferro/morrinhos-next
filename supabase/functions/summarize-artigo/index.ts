import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { artigo_id } = await req.json();
    if (!artigo_id) {
      return new Response(
        JSON.stringify({ error: "artigo_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: artigo, error: fetchError } = await supabase
      .from("lei_organica_artigos")
      .select("*")
      .eq("id", artigo_id)
      .single();

    if (fetchError || !artigo) {
      return new Response(
        JSON.stringify({ error: "Artigo não encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (artigo.resumo_ia) {
      return new Response(
        JSON.stringify({ resumo: artigo.resumo_ia, cached: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "GEMINI_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const context = `Título: ${artigo.titulo}
${artigo.capitulo ? `Capítulo: ${artigo.capitulo}` : ""}
${artigo.secao ? `Seção: ${artigo.secao}` : ""}
Artigo ${artigo.artigo_numero}:
${artigo.artigo_texto}`;

    const aiResponse = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GEMINI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `Você é um assistente jurídico que explica a Lei Orgânica Municipal de Morrinhos para cidadãos comuns.

Gere um resumo CURTO (2-4 frases) explicando:
1. O que este artigo determina em linguagem simples
2. Como isso afeta a vida prática do cidadão de Morrinhos

Use linguagem acessível. Evite jargões jurídicos.
Comece direto com a explicação, sem dizer "Este artigo..." ou "O artigo..."
Seja objetivo e prático.`,
          },
          {
            role: "user",
            content: `Explique este artigo da Lei Orgânica:\n\n${context}`,
          },
        ],
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns segundos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos de IA esgotados." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      console.error("AI error:", status, await aiResponse.text());
      return new Response(
        JSON.stringify({ error: "Erro ao gerar resumo" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    const resumo = aiData.choices?.[0]?.message?.content || "Não foi possível gerar um resumo.";

    // Cache the summary
    await supabase.from("lei_organica_artigos").update({ resumo_ia: resumo }).eq("id", artigo_id);

    return new Response(
      JSON.stringify({ resumo, cached: false }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Summarize artigo error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { titulo, descricao, categoria } = await req.json();

    if ((!descricao || !descricao.trim()) && (!titulo || !titulo.trim())) {
      return new Response(
        JSON.stringify({ error: "Informe um título ou descrição para otimizar." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Serviço de IA não configurado." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userInput = [
      titulo ? `Título: ${titulo.trim()}` : "",
      descricao ? `Descrição do vendedor: ${descricao.trim()}` : "",
      categoria ? `Categoria: ${categoria}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GEMINI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gemini-2.5-flash-lite",
          messages: [
            {
              role: "system",
              content: `Você é um especialista em anúncios de classificados online para uma cidade pequena do interior de Goiás (Morrinhos). Sua tarefa é otimizar a descrição de um anúncio de compra e venda.

Regras:
- Reescreva a descrição de forma profissional, clara e atrativa
- Use APENAS texto puro — NÃO use markdown, asteriscos, hashtags, negrito ou qualquer formatação especial
- Para listas ou tópicos, use apenas quebras de linha e traços simples (-)
- Mantenha o tom amigável e direto, adequado para uma comunidade local
- Destaque pontos fortes do produto/serviço
- Se o vendedor mencionou detalhes técnicos (medidas, modelo, ano, etc), mantenha todos
- Use emojis com moderação (máximo 3-4) para destacar seções
- Mantenha a descrição concisa — máximo 500 caracteres
- NÃO invente informações que o vendedor não mencionou
- NÃO inclua preço nem dados de contato na descrição
- Responda APENAS com o texto da descrição otimizada, sem explicações`,
            },
            {
              role: "user",
              content: userInput,
            },
          ],
          max_tokens: 300,
        }),
      }
    );

    if (!response.ok) {
      const errBody = await response.text();
      console.error("Gemini API error:", response.status, errBody);
      return new Response(
        JSON.stringify({ error: "Falha ao otimizar. Tente novamente." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    let optimized = (data.choices?.[0]?.message?.content?.trim() || "")
      .replace(/\*{1,2}([^*]+)\*{1,2}/g, "$1")
      .replace(/^#{1,6}\s+/gm, "")
      .replace(/^[\*\-]\s*/gm, "- ")
      .trim();

    if (!optimized) {
      return new Response(
        JSON.stringify({ error: "IA não retornou resultado. Tente novamente." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ descricao: optimized }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("optimize-description error:", e);
    return new Response(
      JSON.stringify({ error: "Erro interno ao otimizar descrição." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

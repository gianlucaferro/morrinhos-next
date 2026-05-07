import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function scrapePageContent(url: string): Promise<string> {
  const resp = await fetch(url, {
    headers: { "User-Agent": "seuvereador.ai/1.0 (transparencia legislativa)" },
  });
  if (!resp.ok) throw new Error(`Failed to fetch page: ${resp.status}`);
  const html = await resp.text();

  // Extract main content - try to get the article/post content
  const contentMatch = html.match(
    /class="(?:elementor-widget-container|entry-content|jet-listing-dynamic-field__content)"[^>]*>([\s\S]*?)<\/div>/gi
  );

  let text = "";
  if (contentMatch) {
    text = contentMatch
      .map((m) =>
        m
          .replace(/<[^>]*>/g, " ")
          .replace(/&nbsp;/g, " ")
          .replace(/&amp;/g, "&")
          .replace(/&#8211;/g, "–")
          .replace(/&#8212;/g, "—")
          .replace(/&quot;/g, '"')
          .replace(/\s+/g, " ")
          .trim()
      )
      .filter((t) => t.length > 10)
      .join("\n\n");
  }

  if (text.length < 30) {
    // Fallback: extract all visible text from body
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    if (bodyMatch) {
      text = bodyMatch[1]
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]*>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 3000);
    }
  }

  return text.slice(0, 3000);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { atuacao_id } = await req.json();
    if (!atuacao_id) {
      return new Response(
        JSON.stringify({ error: "atuacao_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Fetch the atuação record
    const { data: atuacao, error: fetchError } = await supabase
      .from("atuacao_parlamentar")
      .select("*")
      .eq("id", atuacao_id)
      .single();

    if (fetchError || !atuacao) {
      return new Response(
        JSON.stringify({ error: "Atuação não encontrada" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Return cached summary if available
    if (atuacao.resumo) {
      return new Response(
        JSON.stringify({ resumo: atuacao.resumo, cached: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Scrape the source page
    let pageContent = "";
    try {
      pageContent = await scrapePageContent(atuacao.fonte_url);
    } catch (e) {
      console.error("Scrape error:", e);
    }

    // Build prompt
    const context = pageContent
      ? `Conteúdo extraído da página oficial:\n${pageContent}`
      : `Título: ${atuacao.tipo} nº ${atuacao.numero}/${atuacao.ano}\nDescrição: ${atuacao.descricao}`;

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "GEMINI_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
            content: `Você é um assistente de transparência legislativa da Câmara Municipal de Morrinhos, GO.
Seu papel é explicar atos legislativos de forma clara e acessível para cidadãos comuns.
Gere um resumo curto (3-5 frases) explicando:
1. O que este ato pede ou propõe
2. Quem será beneficiado
3. Qual o impacto prático para a população

Use linguagem simples e direta. Não use jargões jurídicos. Seja objetivo.
Se não houver informação suficiente, explique o que é possível entender a partir do título.`,
          },
          {
            role: "user",
            content: `Resuma esta ${atuacao.tipo} do vereador ${atuacao.autor_texto}:\n\n${context}`,
          },
        ],
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
      const errorText = await aiResponse.text();
      console.error("AI error:", status, errorText);
      return new Response(
        JSON.stringify({ error: "Erro ao gerar resumo" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    const resumo = aiData.choices?.[0]?.message?.content || "Não foi possível gerar um resumo.";

    // Cache the summary
    await supabase
      .from("atuacao_parlamentar")
      .update({ resumo })
      .eq("id", atuacao_id);

    return new Response(
      JSON.stringify({ resumo, cached: false }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Summarize error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

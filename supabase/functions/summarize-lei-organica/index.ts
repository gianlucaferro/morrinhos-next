import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { lei_id } = await req.json();
    if (!lei_id) {
      return new Response(
        JSON.stringify({ error: "lei_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: lei, error: fetchError } = await supabase
      .from("lei_organica")
      .select("*")
      .eq("id", lei_id)
      .single();

    if (fetchError || !lei) {
      return new Response(
        JSON.stringify({ error: "Documento não encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Return cached summary
    if (lei.resumo_ia) {
      return new Response(
        JSON.stringify({ resumo: lei.resumo_ia, cached: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Try to fetch PDF content if available
    let pdfContent = "";
    if (lei.documento_url) {
      try {
        const pdfResp = await fetch(lei.documento_url, {
          headers: { "User-Agent": "morrinhos.ai/1.0" },
        });
        if (pdfResp.ok) {
          const contentType = pdfResp.headers.get("content-type") || "";
          if (contentType.includes("text/html")) {
            // HTML page — extract text
            const html = await pdfResp.text();
            const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
            if (bodyMatch) {
              pdfContent = bodyMatch[1]
                .replace(/<script[\s\S]*?<\/script>/gi, "")
                .replace(/<style[\s\S]*?<\/style>/gi, "")
                .replace(/<[^>]*>/g, " ")
                .replace(/&nbsp;/g, " ")
                .replace(/\s+/g, " ")
                .trim()
                .slice(0, 4000);
            }
          }
        }
      } catch (e) {
        console.error("PDF fetch error:", e);
      }
    }

    const context = pdfContent
      ? `Documento: ${lei.descricao}\n${lei.observacao ? `Observação: ${lei.observacao}\n` : ""}Data: ${lei.data_publicacao || "não informada"}\n\nConteúdo extraído:\n${pdfContent}`
      : `Documento: ${lei.descricao}\n${lei.observacao ? `Observação: ${lei.observacao}\n` : ""}Data: ${lei.data_publicacao || "não informada"}`;

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
            content: `Você é um assistente jurídico especializado na Lei Orgânica Municipal de Morrinhos, GO.
Seu papel é explicar emendas e alterações à Lei Orgânica de forma clara e acessível para cidadãos comuns.

Gere um resumo curto (3-5 frases) explicando:
1. O que esta emenda altera na Lei Orgânica
2. Qual era a regra anterior (se possível inferir)
3. Qual o impacto prático para o município e os cidadãos

Use linguagem simples e direta. Não use jargões jurídicos desnecessários.
Se houver pouca informação, explique o que é possível entender a partir do título/descrição.
Sempre contextualize o que é a Lei Orgânica para ajudar o cidadão a entender a importância da alteração.`,
          },
          {
            role: "user",
            content: `Resuma esta emenda à Lei Orgânica Municipal:\n\n${context}`,
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
    await supabase.from("lei_organica").update({ resumo_ia: resumo }).eq("id", lei_id);

    return new Response(
      JSON.stringify({ resumo, cached: false }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Summarize lei orgânica error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

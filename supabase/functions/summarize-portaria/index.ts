import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const lovableKey = Deno.env.get("GEMINI_API_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    const { portaria_id } = await req.json();
    if (!portaria_id) throw new Error("portaria_id required");

    const { data: portaria, error } = await supabase
      .from("portarias")
      .select("*")
      .eq("id", portaria_id)
      .single();
    if (error || !portaria) throw new Error("Portaria não encontrada");

    if (portaria.resumo_ia) {
      return new Response(JSON.stringify({ resumo: portaria.resumo_ia }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = `Você é um assistente que explica atos administrativos municipais de Morrinhos-GO para cidadãos comuns.

Portaria: ${portaria.numero}
Data: ${portaria.data_publicacao || "não informada"}
Ementa: ${portaria.ementa}

Escreva um resumo de 2-3 frases em linguagem simples, explicando o impacto prático desta portaria para os moradores. Seja direto e objetivo.`;

    const aiResp = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${lovableKey}`,
      },
      body: JSON.stringify({
        model: "gemini-flash-lite-latest",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 300,
      }),
    });

    if (!aiResp.ok) throw new Error(`AI error: ${aiResp.status}`);
    const aiData = await aiResp.json();
    const resumo = aiData.choices?.[0]?.message?.content?.trim() || "Não foi possível gerar o resumo.";

    await supabase.from("portarias").update({ resumo_ia: resumo }).eq("id", portaria_id);

    return new Response(JSON.stringify({ resumo }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

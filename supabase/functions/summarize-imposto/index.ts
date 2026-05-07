import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { categoria, valorAtual, valorAnterior, anoAtual, perCapita } = await req.json();

    if (!categoria) {
      return new Response(JSON.stringify({ error: "categoria is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check cache first
    const { data: cached } = await supabase
      .from("resumos_ia_cache")
      .select("resumo")
      .eq("contexto", "imposto")
      .eq("chave", categoria)
      .eq("ano", anoAtual)
      .maybeSingle();

    if (cached?.resumo) {
      return new Response(JSON.stringify({ resumo: cached.resumo, cached: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate with AI
    const variacao = valorAnterior > 0
      ? (((valorAtual - valorAnterior) / valorAnterior) * 100).toFixed(1)
      : null;

    const prompt = `Você é um especialista em finanças públicas municipais brasileiras. Explique de forma clara e acessível para um cidadão leigo o que é o tributo/receita "${categoria}" no contexto do município de Morrinhos-GO.

Dados do ano ${anoAtual}:
- Valor arrecadado: R$ ${valorAtual?.toLocaleString("pt-BR") ?? "não disponível"}
${valorAnterior > 0 ? `- Valor no ano anterior: R$ ${valorAnterior?.toLocaleString("pt-BR")}` : ""}
${variacao ? `- Variação: ${variacao}%` : ""}
${perCapita ? `- Per capita: R$ ${perCapita.toFixed(2)}` : ""}

Responda em português, em no máximo 4 frases curtas:
1. O que é esse tributo/receita e quem paga
2. Para que serve / onde é aplicado no município
3. Análise do valor arrecadado (se é alto ou baixo para um município de ~25 mil habitantes)
4. O que o cidadão deve observar

Não use bullet points, escreva em texto corrido. Seja direto e objetivo.`;

    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GEMINI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: "Você é um assistente de transparência pública municipal. Responda sempre em português brasileiro, de forma simples e acessível." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Muitas requisições. Tente novamente em alguns segundos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("Gemini API error:", response.status, t);
      throw new Error("Gemini API error");
    }

    const data = await response.json();
    const resumo = data.choices?.[0]?.message?.content || "Resumo não disponível.";

    // Save to cache (fire-and-forget)
    supabase
      .from("resumos_ia_cache")
      .upsert({
        contexto: "imposto",
        chave: categoria,
        ano: anoAtual,
        resumo,
      }, { onConflict: "contexto,chave,ano" })
      .then(({ error }) => {
        if (error) console.error("Cache write error:", error.message);
      });

    return new Response(JSON.stringify({ resumo, cached: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("summarize-imposto error:", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

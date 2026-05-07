import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { servidor_id } = await req.json();
    if (!servidor_id) {
      return new Response(JSON.stringify({ error: "servidor_id é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch servidor
    const { data: servidor, error: sErr } = await sb
      .from("servidores")
      .select("*")
      .eq("id", servidor_id)
      .single();
    if (sErr || !servidor) {
      return new Response(JSON.stringify({ error: "Servidor não encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch latest remuneração
    const { data: remuneracoes } = await sb
      .from("remuneracao_servidores")
      .select("*")
      .eq("servidor_id", servidor_id)
      .order("competencia", { ascending: false })
      .limit(3);

    const latestRem = remuneracoes?.[0];
    const remInfo = latestRem
      ? `Competência mais recente (${latestRem.competencia}): Bruto R$ ${latestRem.bruto?.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} | Líquido R$ ${latestRem.liquido?.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
      : "Sem dados de remuneração disponíveis.";

    const prompt = `Você é um assistente de transparência pública municipal de Morrinhos, GO.
Gere um resumo curto (3-5 frases) sobre este servidor público, explicando de forma acessível ao cidadão:
- O que faz o cargo "${servidor.cargo || "não informado"}"
- Qual a importância dessa função para o município
- Dados de remuneração MAIS RECENTES (use APENAS os dados abaixo, não invente valores)

Servidor: ${servidor.nome}
Cargo: ${servidor.cargo || "Não informado"}
Remuneração mais recente:
${remInfo}

Responda em português, de forma clara e objetiva. Não invente dados. Sempre mencione a competência (mês/ano) ao citar valores.`;

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY não configurada");

    const aiResponse = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GEMINI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gemini-3-flash-preview",
        messages: [
          { role: "system", content: "Você é um assistente de transparência pública. Seja conciso e informativo." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Muitas requisições. Tente novamente em instantes." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI error: ${status}`);
    }

    const aiData = await aiResponse.json();
    const resumo = aiData.choices?.[0]?.message?.content || "Não foi possível gerar o resumo.";

    return new Response(
      JSON.stringify({
        servidor: {
          nome: servidor.nome,
          cargo: servidor.cargo,
        },
        remuneracoes: remuneracoes || [],
        resumo,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Erro:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CATEGORIAS = [
  "Orçamento e Finanças",
  "Tributação",
  "Administração Pública",
  "Educação",
  "Saúde",
  "Urbanismo e Obras",
  "Meio Ambiente",
  "Cultura e Esporte",
  "Assistência Social",
  "Transporte e Trânsito",
  "Segurança Pública",
  "Denominação e Homenagens",
  "Outros",
];

async function categorizeLei(
  lei: { id: string; numero: string; ementa: string; data_publicacao: string | null },
  lovableKey: string
): Promise<{ id: string; resumo: string; categoria: string }> {
  const prompt = `Você é um assistente que analisa leis municipais de Morrinhos-GO.

Lei Municipal: ${lei.numero}
Data: ${lei.data_publicacao || "não informada"}
Ementa: ${lei.ementa}

Faça duas coisas:
1. Escreva um resumo de 2-3 frases em linguagem simples, explicando o que esta lei muda na prática e como ela afeta os moradores. Seja direto e objetivo.
2. Classifique esta lei em UMA das seguintes categorias: ${CATEGORIAS.join(", ")}

Responda EXATAMENTE neste formato:
RESUMO: [seu resumo aqui]
CATEGORIA: [categoria escolhida]`;

  const aiResp = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${lovableKey}`,
    },
    body: JSON.stringify({
      model: "gemini-flash-lite-latest",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 400,
    }),
  });

  if (!aiResp.ok) {
    const status = aiResp.status;
    if (status === 429) {
      throw new Error("RATE_LIMITED");
    }
    throw new Error(`AI error: ${status}`);
  }

  const aiData = await aiResp.json();
  const content = aiData.choices?.[0]?.message?.content?.trim() || "";

  let resumo = "";
  let categoria = "Outros";

  const resumoMatch = content.match(/RESUMO:\s*([\s\S]*?)(?=\nCATEGORIA:|$)/i);
  if (resumoMatch) resumo = resumoMatch[1].trim();

  const catMatch = content.match(/CATEGORIA:\s*(.+)/i);
  if (catMatch) {
    const parsed = catMatch[1].trim();
    const found = CATEGORIAS.find(c => parsed.toLowerCase().includes(c.toLowerCase()));
    categoria = found || parsed;
  }

  if (!resumo) resumo = "Não foi possível gerar o resumo.";

  return { id: lei.id, resumo, categoria };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const lovableKey = Deno.env.get("GEMINI_API_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    // Fetch all leis without categoria
    const { data: leis, error } = await supabase
      .from("leis_municipais")
      .select("id, numero, ementa, data_publicacao")
      .is("categoria", null)
      .order("data_publicacao", { ascending: false })
      .limit(500);

    if (error) throw error;
    if (!leis || leis.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "Todas as leis já estão categorizadas", processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing ${leis.length} leis sem categoria...`);

    let processed = 0;
    let errors = 0;
    const BATCH = 3; // process 3 at a time to avoid rate limits
    const DELAY_MS = 2000; // 2s delay between batches

    for (let i = 0; i < leis.length; i += BATCH) {
      const batch = leis.slice(i, i + BATCH);

      const results = await Promise.allSettled(
        batch.map(lei => categorizeLei(lei, lovableKey))
      );

      for (const result of results) {
        if (result.status === "fulfilled") {
          const { id, resumo, categoria } = result.value;
          await supabase.from("leis_municipais").update({ resumo_ia: resumo, categoria }).eq("id", id);
          processed++;
        } else {
          errors++;
          if (result.reason?.message === "RATE_LIMITED") {
            console.log(`Rate limited at ${processed}/${leis.length}, waiting 10s...`);
            await new Promise(r => setTimeout(r, 10000));
            // Retry this batch item
            i -= BATCH;
            break;
          }
          console.error("Error:", result.reason?.message);
        }
      }

      if (i + BATCH < leis.length) {
        await new Promise(r => setTimeout(r, DELAY_MS));
      }

      console.log(`Progress: ${processed}/${leis.length} processed, ${errors} errors`);
    }

    console.log(`Done: ${processed} categorized, ${errors} errors`);
    return new Response(
      JSON.stringify({ success: true, total: leis.length, processed, errors }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

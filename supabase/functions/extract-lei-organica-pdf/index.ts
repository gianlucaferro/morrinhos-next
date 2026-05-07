import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PDF_URL = "https://morrinhos.go.gov.br/downloads/lei_organica_atualizada_2020.pdf";

async function callGemini(lovableKey: string, pdfBase64: string, rangePrompt: string): Promise<any[]> {
  const prompt = `Você é um assistente jurídico. Analise este PDF da Lei Orgânica do Município de Morrinhos-GO.

${rangePrompt}

REGRAS IMPORTANTES:
1. Cada artigo deve ter um número DIFERENTE. NÃO repita artigos.
2. O artigo_numero deve ser o número do artigo (ex: Art. 31 → artigo_numero: 31)
3. Inclua TODOS os artigos no range solicitado, sem pular nenhum.
4. Para artigos como "Art. 17-A", use artigo_numero: 1700 + posição (17-A=1701, 17-B=1702)
5. O artigo_texto deve conter o texto COMPLETO do artigo incluindo todos os parágrafos (§), incisos (I, II...) e alíneas (a, b...).

Retorne JSON array com objetos: {"titulo": "TÍTULO X - Nome", "capitulo": "CAPÍTULO Y - Nome" ou null, "secao": "Seção Z - Nome" ou null, "artigo_numero": número_inteiro, "artigo_texto": "texto completo"}

Retorne SOMENTE o JSON array, sem markdown, sem explicações.`;

  const resp = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${lovableKey}`,
    },
    body: JSON.stringify({
      model: "gemini-2.5-flash",
      messages: [{
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: `data:application/pdf;base64,${pdfBase64}` } },
        ],
      }],
      max_tokens: 100000,
      temperature: 0.05,
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`AI error ${resp.status}: ${errText.slice(0, 300)}`);
  }

  const data = await resp.json();
  let content = data.choices?.[0]?.message?.content || "";
  content = content.trim();
  if (content.startsWith("```")) {
    content = content.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
  }
  
  try {
    return JSON.parse(content);
  } catch {
    console.warn("JSON parse failed, attempting repair...");
    const lastCloseBrace = content.lastIndexOf("}");
    if (lastCloseBrace > 0) {
      const repaired = content.slice(0, lastCloseBrace + 1) + "]";
      try {
        const result = JSON.parse(repaired);
        console.log(`Repaired JSON: ${result.length} articles recovered`);
        return result;
      } catch {
        throw new Error("Could not parse AI response even after repair");
      }
    }
    throw new Error("AI response was not valid JSON");
  }
}

const BATCH_PROMPTS: Record<string, string> = {
  "1": "EXTRAIA APENAS os artigos Art. 1 até Art. 30 (trinta). São os artigos do TÍTULO I e início do TÍTULO II. Devem ser exatamente 30 artigos numerados de 1 a 30.",
  "2": "EXTRAIA APENAS os artigos Art. 31 até Art. 60. São artigos do TÍTULO II continuação. Devem ser aproximadamente 30 artigos numerados de 31 a 60.",
  "3": "EXTRAIA APENAS os artigos Art. 61 até Art. 100. Incluindo Art. 79-A se existir. São artigos do TÍTULO II - Poder Executivo e TÍTULO III.",
  "4": "EXTRAIA APENAS os artigos Art. 101 até Art. 152. São artigos do TÍTULO III e TÍTULO IV.",
  "5": "EXTRAIA APENAS os artigos Art. 153 até Art. 200. Incluindo Art. 171-A, 180-A, 191-A se existirem. São artigos do TÍTULO V em diante.",
  "6": "EXTRAIA APENAS os artigos Art. 201 até Art. 233 E depois TODOS os artigos das DISPOSIÇÕES TRANSITÓRIAS (Art. 1 ao Art. 16 das transitórias). Para as transitórias use titulo='DISPOSIÇÕES TRANSITÓRIAS' e artigo_numero começando em 9001 (Art.1=9001, Art.2=9002 etc).",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const lovableKey = Deno.env.get("GEMINI_API_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  let body: any = {};
  try { body = await req.json(); } catch {}
  const batch = body.batch || "1";
  const cleanFirst = body.clean_first === true;

  try {
    // Optionally clean all data first
    if (cleanFirst) {
      console.log("Cleaning all existing articles...");
      await supabase.from("lei_organica_artigos").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    }

    console.log(`Downloading PDF for batch ${batch}...`);
    const pdfResp = await fetch(PDF_URL, { headers: { "User-Agent": "morrinhos.ai/1.0" } });
    if (!pdfResp.ok) throw new Error(`PDF download failed: ${pdfResp.status}`);
    const pdfBytes = new Uint8Array(await pdfResp.arrayBuffer());
    
    const { encode } = await import("https://deno.land/std@0.208.0/encoding/base64.ts");
    const pdfBase64 = encode(pdfBytes);
    console.log(`PDF: ${pdfBytes.length} bytes, processing batch ${batch}...`);

    const prompt = BATCH_PROMPTS[batch];
    if (!prompt) throw new Error(`Invalid batch: ${batch}`);

    const raw = await callGemini(lovableKey, pdfBase64, prompt);
    console.log(`Batch ${batch}: ${raw.length} articles extracted`);
    
    // Deduplicate by artigo_numero
    const seen = new Set<number>();
    const uniqueArticles: any[] = [];
    for (const a of raw) {
      const num = typeof a.artigo_numero === "number" ? a.artigo_numero : parseInt(a.artigo_numero) || 0;
      if (!seen.has(num)) {
        seen.add(num);
        uniqueArticles.push(a);
      }
    }
    console.log(`Batch ${batch}: ${uniqueArticles.length} unique articles after dedup`);

    const articles = uniqueArticles.map((a: any, i: number) => ({
      titulo: a.titulo || "SEM TÍTULO",
      capitulo: a.capitulo || null,
      secao: a.secao || null,
      artigo_numero: typeof a.artigo_numero === "number" ? a.artigo_numero : parseInt(a.artigo_numero) || 0,
      artigo_texto: a.artigo_texto || "",
      ordem: (parseInt(batch) - 1) * 50 + i,
    }));

    // Delete existing articles in this batch's range before inserting
    const minNum = Math.min(...articles.map(a => a.artigo_numero));
    const maxNum = Math.max(...articles.map(a => a.artigo_numero));
    await supabase.from("lei_organica_artigos")
      .delete()
      .gte("artigo_numero", minNum)
      .lte("artigo_numero", maxNum);
    console.log(`Cleaned existing articles ${minNum}-${maxNum}`);

    const CHUNK = 50;
    let inserted = 0;
    for (let i = 0; i < articles.length; i += CHUNK) {
      const chunk = articles.slice(i, i + CHUNK);
      const { error } = await supabase.from("lei_organica_artigos").insert(chunk);
      if (error) console.error(`Insert error: ${error.message}`);
      else inserted += chunk.length;
    }

    console.log(`Batch ${batch}: inserted ${inserted} unique articles (nums ${minNum}-${maxNum})`);
    return new Response(
      JSON.stringify({ success: true, batch, total_articles: inserted, range: `${minNum}-${maxNum}` }),
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

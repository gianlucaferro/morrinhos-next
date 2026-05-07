import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function extractPdfText(url: string): Promise<string | null> {
  try {
    const resp = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!resp.ok) return null;
    const buffer = await resp.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    // Simple PDF text extraction - find text between BT/ET blocks and parentheses
    const text = new TextDecoder("latin1").decode(bytes);
    const extracted: string[] = [];

    // Extract text from PDF streams by looking for text operators
    // Method 1: Extract strings in parentheses (Tj operator)
    const tjRegex = /\(([^)]*)\)/g;
    let match;
    
    // Look for decoded/decompressed content between stream/endstream
    // For simple PDFs, try to extract readable text directly
    const readableChunks: string[] = [];
    
    // Extract any readable ASCII text sequences (common in simple PDFs)
    const lines = text.split('\n');
    for (const line of lines) {
      // Skip binary-looking lines and PDF operators
      if (line.startsWith('%') || line.startsWith('<<') || line.length < 5) continue;
      // Look for text in parentheses (PDF literal strings)
      const matches = line.match(/\(([^)]{2,})\)/g);
      if (matches) {
        for (const m of matches) {
          const inner = m.slice(1, -1)
            .replace(/\\n/g, '\n')
            .replace(/\\r/g, '')
            .replace(/\\\(/g, '(')
            .replace(/\\\)/g, ')')
            .replace(/\\\\/g, '\\');
          if (inner.length > 2 && /[a-zA-ZÀ-ÿ]/.test(inner)) {
            readableChunks.push(inner);
          }
        }
      }
    }

    if (readableChunks.length > 0) {
      return readableChunks.join(' ').slice(0, 8000);
    }

    return null;
  } catch (e) {
    console.error("PDF extraction error:", e);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tipo, conteudo, documento_url } = await req.json();
    if (!tipo || !conteudo) {
      return new Response(JSON.stringify({ error: "tipo e conteudo são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: "GEMINI_API_KEY não configurada" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Try to extract PDF text if URL provided
    let pdfText: string | null = null;
    if (documento_url) {
      console.log("Fetching PDF from:", documento_url);
      pdfText = await extractPdfText(documento_url);
      if (pdfText) {
        console.log(`Extracted ${pdfText.length} chars from PDF`);
      } else {
        console.log("Could not extract text from PDF, using metadata only");
      }
    }

    // If we have a PDF and it's a Pauta or Ata, use a specialized prompt
    const isPautaOrAta = ["Pautas das Sessões", "Atas das Sessões"].includes(tipo);
    
    let prompt: string;
    
    if (pdfText && isPautaOrAta) {
      prompt = `Você é um assistente de transparência pública municipal de Morrinhos, Goiás.
Analise o conteúdo deste documento "${tipo}" da Câmara Municipal e gere um resumo claro e acessível para o cidadão comum.

Metadados do registro:
${conteudo}

Conteúdo extraído do documento PDF:
${pdfText}

Para ${tipo === "Pautas das Sessões" ? "pautas" : "atas"}, destaque:
1. Data e tipo da sessão
2. Principais assuntos/projetos discutidos ou votados
3. Decisões tomadas ou resultados das votações (se houver)
4. Destaques relevantes para a população

Responda em português, de forma objetiva, em no máximo 6 frases. Não invente dados que não estão nos dados fornecidos.`;
    } else if (pdfText) {
      prompt = `Você é um assistente de transparência pública municipal de Morrinhos, Goiás.
Analise o seguinte registro do tipo "${tipo}" e gere um resumo claro e acessível para o cidadão comum, explicando:
1. Do que se trata este registro
2. Qual o possível impacto ou relevância para a população
3. Informações importantes como valores, datas e pessoas envolvidas

Dados do registro:
${conteudo}

Conteúdo extraído do documento PDF:
${pdfText}

Responda em português, de forma objetiva, em no máximo 5 frases. Não invente dados que não estão nos dados fornecidos.`;
    } else {
      prompt = `Você é um assistente de transparência pública municipal de Morrinhos, Goiás.
Analise o seguinte registro do tipo "${tipo}" e gere um resumo claro e acessível para o cidadão comum, explicando:
1. Do que se trata este registro
2. Qual o possível impacto ou relevância para a população
3. Informações importantes como valores, datas e pessoas envolvidas

Dados do registro:
${conteudo}

Responda em português, de forma objetiva, em no máximo 4 frases. Não invente dados que não estão nos dados fornecidos.`;
    }

    const aiResponse = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GEMINI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: "Você é um especialista em transparência pública municipal." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em instantes." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      console.error("Gemini API error:", aiResponse.status, errText);
      return new Response(JSON.stringify({ error: "Erro ao gerar resumo" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const resumo = aiData.choices?.[0]?.message?.content || "Não foi possível gerar o resumo.";

    return new Response(JSON.stringify({ resumo }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("summarize-generic error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

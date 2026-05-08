// 🚨 PARTIAL: esta função consome contratos da tabela contratos/contratos_aditivos.
// O código tem refs a fonte_url do Centi (camaramorrinhos.centi.com.br) que NÃO existem
// pra Morrinhos. Quando os scrapers NucleoGov forem implementados e gravarem fonte_url
// no formato NucleoGov, esta função precisa ser ajustada também.
// Doc: docs/HANDOFF_MORRINHOS.md → seção "Scrapers Centi → NucleoGov"
//
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const UA = "morrinhos.ai/1.0 (transparencia municipal)";

function normalizarCredor(nome: string | null | undefined): string {
  if (!nome) return "";

  return nome
    .replace(/&amp;/gi, "&")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/\b(SOCIEDADE SIMPLES|SOCIEDADE ANONIMA|SOCIEDADE LIMITADA|EIRELI-EPP|EIRELI-ME|EIRELI EPP|EIRELI ME|LTDA-EPP|LTDA-ME|LTDA EPP|LTDA ME|EIRELI|LTDA|S\.A\.|S\/A|S\.A|EPP|ME|MEI)\b\.?/gi, "")
    .replace(/[^A-Z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractContratoOrigemIdFromContratoUrl(url: string | null | undefined): string | null {
  return url?.match(/\/contratos\/contrato\/(\d+)/i)?.[1] ?? null;
}

function extractContratoOrigemIdFromAditivoUrl(url: string | null | undefined): string | null {
  return url?.match(/\/contratos\/contratoaditivo\/(\d+)/i)?.[1] ?? null;
}

function filtrarAditivosDoContrato(aditivos: any[], contrato: { empresa?: string | null; fonte_url?: string | null }) {
  const origemId = extractContratoOrigemIdFromContratoUrl(contrato.fonte_url);
  if (origemId) {
    const byOrigem = aditivos.filter((aditivo) => {
      const aditivoOrigemId = aditivo.centi_id || extractContratoOrigemIdFromAditivoUrl(aditivo.fonte_url);
      return aditivoOrigemId === origemId;
    });
    if (byOrigem.length) return byOrigem;
  }

  const fornecedorNorm = normalizarCredor(contrato.empresa);
  if (fornecedorNorm) {
    const byCredor = aditivos.filter((aditivo) => normalizarCredor(aditivo.credor) === fornecedorNorm);
    if (byCredor.length) return byCredor;
  }

  const grupos = new Set(aditivos.map((aditivo) => `${aditivo.contrato_numero}::${normalizarCredor(aditivo.credor)}`));
  return grupos.size === 1 ? aditivos : [];
}

/**
 * Fetches the contract detail page from Centi and extracts structured info + PDF links.
 */
async function fetchContratoDetailPage(url: string): Promise<{ details: string; pdfUrls: string[] }> {
  try {
    const resp = await fetch(url, { headers: { "User-Agent": UA }, redirect: "follow" });
    if (!resp.ok) return { details: "", pdfUrls: [] };
    const html = await resp.text();

    // Extract all label-value pairs from dialog-label / dialog-text pattern
    const pairs: string[] = [];
    const pairRegex = /<span class="dialog-label">([^<]+)<\/span>\s*<span class="dialog-text">([^<]*)<\/span>/g;
    let m;
    while ((m = pairRegex.exec(html)) !== null) {
      const label = m[1].trim();
      const value = m[2].trim();
      if (value) pairs.push(`${label}: ${value}`);
    }

    // Also look for Objeto specifically with broader pattern
    if (!pairs.some(p => p.startsWith("Objeto"))) {
      const objMatch = html.match(/Objeto\s*<\/(?:b|strong|td|th|label|span)>\s*<[^>]*>([^<]+)/i)
        || html.match(/dialog-text">\s*([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ][^<]{10,})/);
      if (objMatch?.[1]?.trim()) {
        pairs.push(`Objeto: ${objMatch[1].trim()}`);
      }
    }

    // Extract PDF download links
    const pdfUrls: string[] = [];
    const linkRegex = /href="([^"]*\/download\/[^"]*\.PDF[^"]*)"/gi;
    while ((m = linkRegex.exec(html)) !== null) {
      let pdfUrl = m[1];
      if (!pdfUrl.startsWith("http")) pdfUrl = `https://morrinhos.centi.com.br${pdfUrl}`;
      pdfUrls.push(pdfUrl);
    }

    return { details: pairs.join("\n"), pdfUrls };
  } catch (e) {
    console.error("Error fetching detail page:", e);
    return { details: "", pdfUrls: [] };
  }
}

/**
 * Extracts readable text from a PDF binary.
 */
function extractTextFromPdfBytes(bytes: Uint8Array): string | null {
  const rawText = new TextDecoder("latin1").decode(bytes);
  const textChunks: string[] = [];

  // Extract text between parentheses (PDF text objects)
  const regex = /\(([^)]{2,})\)/g;
  let match;
  while ((match = regex.exec(rawText)) !== null) {
    const chunk = match[1]
      .replace(/\\n/g, "\n")
      .replace(/\\r/g, "")
      .replace(/\\\(/g, "(")
      .replace(/\\\)/g, ")")
      .replace(/\\\\/g, "\\")
      .trim();

    const readableChars = chunk.replace(/[^\x20-\x7E\xC0-\xFF]/g, "").length;
    if (readableChars > chunk.length * 0.5 && chunk.length > 1) {
      textChunks.push(chunk);
    }
  }

  if (textChunks.length > 0) {
    return textChunks.join(" ").replace(/\s+/g, " ").trim().substring(0, 4000) || null;
  }
  return null;
}

/**
 * Downloads and extracts text from the first PDF URL available.
 */
async function fetchAndExtractPdf(pdfUrls: string[]): Promise<string | null> {
  for (const url of pdfUrls.slice(0, 2)) {
    try {
      console.log("Downloading PDF:", url);
      const resp = await fetch(url, {
        headers: { "User-Agent": UA },
        redirect: "follow",
      });
      if (!resp.ok) continue;

      const buffer = await resp.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      const text = extractTextFromPdfBytes(bytes);
      if (text && text.length > 50) {
        console.log(`Extracted ${text.length} chars from PDF`);
        return text;
      }
    } catch (e) {
      console.error("Error downloading PDF:", e);
    }
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { contrato_id, is_outlier, outlier_context } = await req.json();
    if (!contrato_id) {
      return new Response(JSON.stringify({ error: "contrato_id é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: contrato, error } = await supabase
      .from("contratos")
      .select("*")
      .eq("id", contrato_id)
      .single();

    if (error || !contrato) {
      return new Response(JSON.stringify({ error: "Contrato não encontrado" }), {
        status: 404,
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

    // Step 1: Fetch contract detail page from Centi portal
    let portalDetails = "";
    let pdfText: string | null = null;

    if (contrato.fonte_url && contrato.fonte_url.includes("centi.com.br/contratos/contrato/")) {
      console.log("Fetching detail page:", contrato.fonte_url);
      const { details, pdfUrls } = await fetchContratoDetailPage(contrato.fonte_url);
      portalDetails = details;

      // Step 2: Try to extract text from contract PDF
      if (pdfUrls.length > 0) {
        pdfText = await fetchAndExtractPdf(pdfUrls);
      }
    }

    // Step 3: Fetch related aditivos from DB usando vínculo definitivo por ID do portal
    let aditivosSection = "";
    if (contrato.numero) {
      const { data: rawAditivos } = await supabase
        .from("contratos_aditivos")
        .select("*")
        .eq("contrato_numero", contrato.numero)
        .order("termo", { ascending: true });

      const aditivos = filtrarAditivosDoContrato(rawAditivos || [], contrato);
      if (aditivos.length > 0) {
        const totalAditivos = aditivos.reduce((sum: number, a: any) => sum + (a.valor || 0), 0);
        const aditivosList = aditivos.map((a: any) => {
          const vl = a.valor ? a.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "sem valor informado";
          return `  - Termo ${a.termo}: ${a.tipo || "Aditivo"} (${a.tipo_aditivo || "não especificado"}) — ${vl} — ${a.data_termo || "?"}`;
        }).join("\n");
        const totalAditivosStr = totalAditivos.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
        const valorOriginal = contrato.valor || 0;
        const valorTotal = valorOriginal + totalAditivos;
        const valorTotalStr = valorTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

        aditivosSection = `\n\n📋 TERMOS ADITIVOS (${aditivos.length} aditivo(s)):
${aditivosList}
Valor total dos aditivos: ${totalAditivosStr}
Valor total do contrato com aditivos: ${valorTotalStr}
Inclua no resumo uma seção "📋 Aditivos" informando quantos aditivos existem, o valor acumulado e o valor total do contrato (original + aditivos).`;
      }
    }

    const valor = contrato.valor
      ? contrato.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
      : "não informado";

    let extraContext = "";
    if (portalDetails) {
      extraContext += `\n\nInformações detalhadas do portal de transparência:\n${portalDetails}`;
    }
    if (pdfText) {
      extraContext += `\n\nTexto extraído do PDF oficial do contrato (use para identificar a finalidade detalhada, cláusulas e condições):\n"""${pdfText}"""`;
    }

    let outlierSection = "";
    if (is_outlier && outlier_context) {
      outlierSection = `\n\n⚠️ ANÁLISE DE VALOR ATÍPICO: Este contrato foi identificado como tendo valor atípico pela análise automatizada.
${outlier_context}
Inclua no final do resumo uma seção separada chamada "📊 Análise de valor" explicando de forma objetiva e neutra:
- Por que o valor deste contrato se destaca em relação aos demais
- Possíveis justificativas legítimas para o valor (ex: complexidade do objeto, duração do contrato, escopo abrangente)
- NÃO faça acusações, NÃO sugira irregularidade. Apenas apresente os fatos comparativos de forma informativa.`;
    }

    const hasExtras = is_outlier || aditivosSection;
    const prompt = `Você é um assistente de transparência pública municipal de Morrinhos, Goiás.
Analise o contrato abaixo e gere um resumo claro e acessível para o cidadão comum, explicando:
1. Qual a finalidade do contrato (o que está sendo contratado) — PRIORIZE as informações do documento PDF e da página de detalhes quando disponíveis
2. Quem é a empresa contratada
3. Qual o valor e período de vigência
4. Qual o possível impacto ou benefício para a população

Dados do contrato no banco de dados:
- Número: ${contrato.numero || "não informado"}
- Empresa: ${contrato.empresa || "não informada"}
- Objeto: ${contrato.objeto || "não informado"}
- Valor: ${valor}
- Status: ${contrato.status || "não informado"}
- Vigência: ${contrato.vigencia_inicio || "?"} a ${contrato.vigencia_fim || "?"}${extraContext}${aditivosSection}${outlierSection}

Responda em português, de forma objetiva. ${hasExtras ? "Pode usar até 10 frases para incluir todas as seções solicitadas." : "Use no máximo 4 frases."} Não invente dados que não estão no contrato ou documento.`;

    const aiResponse = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GEMINI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gemini-3-flash-preview",
        messages: [
          { role: "system", content: "Você é um especialista em transparência pública municipal." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em instantes." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      console.error("Gemini API error:", aiResponse.status, errText);
      return new Response(JSON.stringify({ error: "Erro ao gerar resumo" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const resumo = aiData.choices?.[0]?.message?.content || "Não foi possível gerar o resumo.";

    return new Response(JSON.stringify({ resumo }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("summarize-contrato error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

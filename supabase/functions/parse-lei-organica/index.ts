import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ParsedArticle {
  titulo: string;
  capitulo: string | null;
  secao: string | null;
  artigo_numero: number;
  artigo_texto: string;
  ordem: number;
}

function parseArticles(text: string): ParsedArticle[] {
  const lines = text.split("\n");
  const articles: ParsedArticle[] = [];

  let currentTitulo = "DISPOSIÇÕES PRELIMINARES";
  let currentCapitulo: string | null = null;
  let currentSecao: string | null = null;
  let currentArticle: { numero: number; lines: string[] } | null = null;
  let ordem = 0;

  const flushArticle = () => {
    if (currentArticle && currentArticle.lines.length > 0) {
      const texto = currentArticle.lines.join("\n").trim();
      if (texto) {
        articles.push({
          titulo: currentTitulo,
          capitulo: currentCapitulo,
          secao: currentSecao,
          artigo_numero: currentArticle.numero,
          artigo_texto: texto,
          ordem: ordem++,
        });
      }
    }
    currentArticle = null;
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // Detect TÍTULO
    const tituloMatch = line.match(/^TÍTULO\s+([IVXLCDM]+)\s*(.*)/i);
    if (tituloMatch) {
      flushArticle();
      const rest = tituloMatch[2]?.trim();
      currentTitulo = `TÍTULO ${tituloMatch[1]}${rest ? ` - ${rest}` : ""}`;
      currentCapitulo = null;
      currentSecao = null;
      continue;
    }

    // Detect CAPÍTULO
    const capMatch = line.match(/^CAPÍTULO\s+([IVXLCDM]+)\s*(.*)/i);
    if (capMatch) {
      flushArticle();
      const rest = capMatch[2]?.trim();
      currentCapitulo = `CAPÍTULO ${capMatch[1]}${rest ? ` - ${rest}` : ""}`;
      currentSecao = null;
      continue;
    }

    // Detect section name lines (e.g. "Do Município", "Das Disposições Gerais")
    // These typically follow CAPÍTULO or TÍTULO headers
    if (!currentArticle && /^(Da |Do |Das |Dos |Disposições )/.test(line) && line.length < 120) {
      if (currentCapitulo && !currentCapitulo.includes(" - ")) {
        currentCapitulo += ` - ${line}`;
      } else if (currentTitulo && !currentTitulo.includes(" - ") && !currentCapitulo) {
        currentTitulo += ` - ${line}`;
      }
      continue;
    }

    // Detect SEÇÃO / SUBSEÇÃO
    const secaoMatch = line.match(/^(SUB)?SE[CÇ][ÃA]O\s+([IVXLCDM]+)\s*(.*)/i);
    if (secaoMatch) {
      flushArticle();
      const prefix = secaoMatch[1] ? "SUBSEÇÃO" : "SEÇÃO";
      const rest = secaoMatch[3]?.trim();
      currentSecao = `${prefix} ${secaoMatch[2]}${rest ? ` - ${rest}` : ""}`;
      continue;
    }

    // Detect section name after SEÇÃO header
    if (currentSecao && !currentSecao.includes(" - ") && !currentArticle && /^(Da |Do |Das |Dos |Disposições )/.test(line) && line.length < 120) {
      currentSecao += ` - ${line}`;
      continue;
    }

    // Detect Art. XX
    const artMatch = line.match(/^Art\.?\s*(\d+)[º°.]?\s*(.*)/i);
    if (artMatch) {
      flushArticle();
      const numero = parseInt(artMatch[1], 10);
      const rest = artMatch[2]?.trim() || "";
      currentArticle = { numero, lines: rest ? [`Art. ${numero}º. ${rest}`] : [] };
      continue;
    }

    // Accumulate article content (paragraphs, incisos, alíneas)
    if (currentArticle) {
      currentArticle.lines.push(line);
    }
  }

  // Flush last article
  flushArticle();

  return articles;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { pdf_url, raw_text } = await req.json();
    if (!pdf_url && !raw_text) {
      return new Response(
        JSON.stringify({ error: "Forneça pdf_url ou raw_text" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    let textContent = raw_text || "";

    if (pdf_url && !textContent) {
      try {
        const resp = await fetch(pdf_url, {
          headers: { "User-Agent": "morrinhos.ai/1.0" },
        });
        if (!resp.ok) throw new Error(`Fetch failed: ${resp.status}`);
        const contentType = resp.headers.get("content-type") || "";

        if (contentType.includes("text/html") || contentType.includes("text/plain")) {
          const html = await resp.text();
          // Strip HTML tags if present
          textContent = html
            .replace(/<script[\s\S]*?<\/script>/gi, "")
            .replace(/<style[\s\S]*?<\/style>/gi, "")
            .replace(/<br\s*\/?>/gi, "\n")
            .replace(/<\/?(p|div|h[1-6]|li|tr|td)[^>]*>/gi, "\n")
            .replace(/<[^>]*>/g, " ")
            .replace(/&nbsp;/g, " ")
            .replace(/&amp;/g, "&")
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/&#\d+;/g, "")
            .replace(/\n{3,}/g, "\n\n")
            .trim();
        } else {
          textContent = await resp.text();
        }
      } catch (e) {
        console.error("Fetch error:", e);
        return new Response(
          JSON.stringify({ error: "Não foi possível acessar o documento." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    if (!textContent || textContent.length < 100) {
      return new Response(
        JSON.stringify({ error: "Texto muito curto para processar." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Parsing text with ${textContent.length} chars`);

    const articles = parseArticles(textContent);

    if (articles.length === 0) {
      return new Response(
        JSON.stringify({ error: "Nenhum artigo encontrado. Verifique o formato do texto." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Parsed ${articles.length} articles`);

    // Clear existing articles
    await supabase.from("lei_organica_artigos").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    // Insert in batches
    const BATCH_SIZE = 50;
    let inserted = 0;
    for (let i = 0; i < articles.length; i += BATCH_SIZE) {
      const batch = articles.slice(i, i + BATCH_SIZE);
      const { error } = await supabase.from("lei_organica_artigos").insert(batch);
      if (error) {
        console.error("Insert error:", error);
      } else {
        inserted += batch.length;
      }
    }

    console.log(`Inserted ${inserted} articles`);

    return new Response(
      JSON.stringify({ success: true, total_articles: inserted }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Parse error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

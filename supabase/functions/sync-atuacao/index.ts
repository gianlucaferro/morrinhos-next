import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TIPO_IDS: Record<number, string> = {
  79: "Indicação",
  80: "Moção",
  81: "Requerimento",
};

const WP_VEREADOR_SLUG: Record<number, string> = {
  334: "adriana-pinheiro",
  333: "aparecida-divani",
  335: "douglas-miranda",
  336: "edimar-lopes",
  337: "fernando-abraao",
  339: "marco-antonio",
  342: "reginaldo-moreira",
  338: "sirley-wehbe",
  344: "welton-eterno",
  341: "wennder-trindade",
  343: "yuri-santiago",
};

const WP_VEREADOR_NAMES: Record<number, string> = {
  334: "Adriana Dias Pinheiro",
  333: "Aparecida Divani Rocha Cordeiro",
  335: "Douglas Miranda Silva",
  336: "Edimar Lopes Machado",
  337: "Fernando Abraão Magalhães Silva",
  339: "Marco Antonio Antunes da Cruz",
  340: "Mesa Diretora",
  342: "Reginaldo Moreira da Silva",
  338: "Sirley de Fatima Menezes Wehbe",
  344: "Welton Eterno da Silva",
  341: "Wennder Trindade e Silva",
  343: "Yuri Santiago Alves",
};

function parseTitle(title: string): { tipo: string; numero: number; ano: number } | null {
  const match = title.match(/(Indicação|Moção|Requerimento)\s+n[ºo°]\s*(\d+)\/(\d{4})/i);
  if (!match) return null;
  return { tipo: match[1], numero: parseInt(match[2]), ano: parseInt(match[3]) };
}

// Scrape the main listing HTML page to get descriptions for the first page of each tab
async function scrapeDescriptionsFromListing(): Promise<Map<string, string>> {
  const descs = new Map<string, string>();
  try {
    const resp = await fetch(
      "https://morrinhos.go.leg.br",
      { headers: { "User-Agent": "seuvereador.ai/1.0 (transparencia legislativa)" } }
    );
    if (!resp.ok) return descs;
    const html = await resp.text();

    // Each item in the listing grid follows this pattern:
    // jet-listing-dynamic-field__content with title -> date -> description -> author
    const itemPattern = /jet-listing-dynamic-field__content">((?:Indicação|Moção|Requerimento)[^<]*)<\/div>[\s\S]*?jet-listing-dynamic-field__content">(\d{2}\/\d{2}\/\d{4})<\/div>[\s\S]*?jet-listing-dynamic-field__content"><p>([\s\S]*?)<\/p>/gi;
    
    let match;
    while ((match = itemPattern.exec(html)) !== null) {
      const title = match[1].trim();
      const desc = match[3]
        .replace(/<[^>]*>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      if (desc.length > 5) {
        descs.set(title, desc);
      }
    }
    console.log(`Scraped ${descs.size} descriptions from listing page`);
  } catch (e) {
    console.error("Error scraping listing:", e);
  }
  return descs;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  const { data: logEntry } = await supabase
    .from("sync_log")
    .insert({ tipo: "atuacao", status: "running", detalhes: {} })
    .select()
    .single();
  const logId = logEntry?.id;

  let newCount = 0;
  let skippedCount = 0;
  const errors: string[] = [];

  try {
    const { data: vereadores } = await supabase.from("vereadores").select("id, slug");
    const vereadorMap = new Map((vereadores || []).map((v: any) => [v.slug, v.id]));

    // Scrape listing page for descriptions (recent items)
    const descriptions = await scrapeDescriptionsFromListing();

    const WP_API = "https://morrinhos.go.leg.br";

    // Batch upsert approach: collect all items, then batch insert
    for (const [tipoId, tipoLabel] of Object.entries(TIPO_IDS)) {
      let page = 1;
      let totalPages = 1;

      while (page <= totalPages) {
        const url = `${WP_API}/atos-legislativo?tipo-de-ato-legislativo=${tipoId}&per_page=100&page=${page}&_fields=id,title,date,link,vereador,ano-do-ato-legislativo`;
        console.log(`Fetching ${tipoLabel} page ${page}/${totalPages}`);

        const response = await fetch(url, {
          headers: { "User-Agent": "seuvereador.ai/1.0" },
        });

        if (!response.ok) {
          if (response.status === 400 && page > 1) break;
          errors.push(`HTTP ${response.status} for ${tipoLabel} page ${page}`);
          break;
        }

        const tp = response.headers.get("X-WP-TotalPages");
        if (tp) totalPages = parseInt(tp);

        const posts = await response.json();
        if (posts.length === 0) break;

        // Build batch for insert
        const batch = [];
        for (const post of posts) {
          const parsed = parseTitle(post.title.rendered);
          if (!parsed) continue;

          const wpVereadorId = post.vereador?.[0];
          const autorSlug = wpVereadorId ? WP_VEREADOR_SLUG[wpVereadorId] : undefined;
          const autorVereadorId = autorSlug ? vereadorMap.get(autorSlug) || null : null;
          const autorTexto = wpVereadorId
            ? WP_VEREADOR_NAMES[wpVereadorId] || "Não identificado"
            : "Não identificado";

          // Try to find description from scraped listing page
          const titleKey = post.title.rendered
            .replace(/&nbsp;/g, " ")
            .replace(/&#8211;/g, "–")
            .replace(/&#8212;/g, "—")
            .replace(/&amp;/g, "&")
            .trim();
          const descricao = descriptions.get(titleKey) || post.title.rendered;

          // Use WordPress post date but correct the year if it doesn't match
          // the authoritative year from the title (e.g. "Indicação 551/2025")
          // WP date is when the post was published, NOT when the act happened
          const wpDate = post.date.split("T")[0]; // e.g. "2025-11-06"
          const wpYear = parseInt(wpDate.slice(0, 4));
          let dataFinal = wpDate;
          if (wpYear !== parsed.ano) {
            // Year mismatch: WP date year differs from act year
            // Use Jan 1 of the correct year as fallback since we don't have the real date
            dataFinal = `${parsed.ano}-01-01`;
            console.log(`Date fix: ${parsed.tipo} ${parsed.numero}/${parsed.ano} — WP date ${wpDate} → ${dataFinal}`);
          }

          batch.push({
            tipo: parsed.tipo,
            numero: parsed.numero,
            ano: parsed.ano,
            data: dataFinal,
            descricao,
            autor_texto: autorTexto,
            autor_vereador_id: autorVereadorId,
            fonte_url: post.link,
          });
        }

        if (batch.length > 0) {
          // Use upsert with conflict on (tipo, numero, ano)
          const { data: upserted, error } = await supabase
            .from("atuacao_parlamentar")
            .upsert(batch, { onConflict: "tipo,numero,ano", ignoreDuplicates: true })
            .select("id");

          if (error) {
            errors.push(`Batch insert ${tipoLabel} page ${page}: ${error.message}`);
            console.error("Batch error:", error.message);
          } else {
            const insertedCount = upserted?.length || 0;
            newCount += insertedCount;
            skippedCount += batch.length - insertedCount;
            console.log(`${tipoLabel} page ${page}: ${insertedCount} new, ${batch.length - insertedCount} skipped`);
          }
        }

        page++;
        if (page <= totalPages) {
          await new Promise((r) => setTimeout(r, 200));
        }
      }
    }

    if (logId) {
      await supabase.from("sync_log").update({
        status: errors.length > 0 ? "partial" : "success",
        detalhes: { new_count: newCount, skipped: skippedCount, errors: errors.slice(0, 20) },
        finished_at: new Date().toISOString(),
      }).eq("id", logId);
    }

    return new Response(
      JSON.stringify({ success: true, new: newCount, skipped: skippedCount, errors: errors.slice(0, 10) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Sync atuacao error:", error);
    if (logId) {
      await supabase.from("sync_log").update({
        status: "error",
        detalhes: { error: error.message, new_so_far: newCount, errors },
        finished_at: new Date().toISOString(),
      }).eq("id", logId);
    }
    return new Response(
      JSON.stringify({ success: false, error: error.message, new_so_far: newCount }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

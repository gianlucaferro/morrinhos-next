import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Map author names to slugs for matching
const AUTHOR_SLUG_MAP: Record<string, string> = {
  "adriana dias pinheiro": "adriana-pinheiro",
  "aparecida divani rocha cordeiro": "aparecida-divani",
  "douglas miranda silva": "douglas-miranda",
  "edimar lopes machado": "edimar-lopes",
  "fernando abraão magalhães silva": "fernando-abraao",
  "fernando abraao magalhaes silva": "fernando-abraao",
  "marco antônio antunes da cruz": "marco-antonio",
  "marco antonio antunes da cruz": "marco-antonio",
  "reginaldo moreira da silva": "reginaldo-moreira",
  "sirley de fatima menezes wehbe": "sirley-wehbe",
  "welton eterno da silva": "welton-eterno",
  "wennder trindade e silva": "wennder-trindade",
  "yuri santiago alves": "yuri-santiago",
};

interface ScrapedProject {
  tipo: string;
  numero: string;
  ano: number;
  data: string;
  ementa: string;
  origem: string;
  autor_texto: string;
  fonte_visualizar_url: string;
  fonte_download_url: string | null;
}

function parseProjectsFromHtml(html: string): ScrapedProject[] {
  const projects: ScrapedProject[] = [];

  // Match project blocks - each project has a header, date, description, author, and links
  // Pattern: "Projeto de Lei nº 002/2025 - Legislativo" or "Projeto de Resolução nº 001/2025"
  const projectPattern =
    /(Projeto\s+de\s+(?:Lei|Resolução|Lei Complementar|Emenda à Lei Orgânica|Decreto Legislativo))\s+n[ºo°]\s*(\d+)\/(\d{4})(?:\s*-\s*(Legislativo|Executivo))?/gi;

  let match;
  const htmlLower = html;

  // Split by project headers
  const sections = html.split(
    /(?=<[^>]*>(?:\s*<[^>]*>)*\s*Projeto\s+de\s+(?:Lei|Resolução|Lei Complementar))/i
  );

  for (const section of sections) {
    const headerMatch = section.match(
      /(Projeto\s+de\s+(?:Lei|Resolução|Lei Complementar|Emenda à Lei Orgânica|Decreto Legislativo))\s+n[ºo°]\s*(\d+)\/(\d{4})(?:\s*-\s*(Legislativo|Executivo))?/i
    );

    if (!headerMatch) continue;

    const tipo = headerMatch[1].trim();
    const numero = headerMatch[2];
    const ano = parseInt(headerMatch[3]);
    const origem = headerMatch[4] || "Legislativo";

    // Extract date (DD/MM/YYYY)
    const dateMatch = section.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    const data = dateMatch
      ? `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`
      : "";

    // Extract description - text after date, before author
    const ementaMatch = section.match(
      /\d{2}\/\d{2}\/\d{4}<\/[^>]+>\s*<[^>]+>([\s\S]*?)<\/[^>]+>\s*<[^>]+>/
    );
    let ementa = "";
    if (ementaMatch) {
      ementa = ementaMatch[1].replace(/<[^>]*>/g, "").trim();
    }
    // Fallback: try to find long text
    if (!ementa) {
      const textBlocks = section.match(/>([^<]{50,})</g);
      if (textBlocks) {
        for (const block of textBlocks) {
          const text = block.slice(1, -1).trim();
          if (
            !text.match(/Projeto\s+de/) &&
            !text.match(/^\d{2}\/\d{2}\/\d{4}$/)
          ) {
            ementa = text;
            break;
          }
        }
      }
    }

    // Extract author
    const authorPatterns = [
      /Poder\s+Executivo/i,
      /Mesa\s+Diretora/i,
      ...Object.keys(AUTHOR_SLUG_MAP).map(
        (name) => new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")
      ),
    ];

    let autor_texto = "Não identificado";
    for (const pattern of authorPatterns) {
      const authorMatch = section.match(pattern);
      if (authorMatch) {
        autor_texto = authorMatch[0];
        break;
      }
    }

    // Extract links
    const vizMatch = section.match(
      /href="(https:\/\/acessoainformacao[^"]*projetos[^"]*visualizar[^"]*|https:\/\/acessoainformacao[^"]*projetos\/[^"]*)"[^>]*>\s*(?:Visualizar|Ver)/i
    );
    const vizMatch2 = section.match(
      /href="(https:\/\/acessoainformacao\.camarademorrinhos\.go\.gov\.br\/projetos\/[^"]*)"/i
    );
    const fonte_visualizar_url = vizMatch?.[1] || vizMatch2?.[1] || "";

    const dlMatch = section.match(
      /href="(https:\/\/acessoainformacao[^"]*\.pdf)"/i
    );
    const fonte_download_url = dlMatch?.[1] || null;

    if (data && (ementa || fonte_visualizar_url)) {
      projects.push({
        tipo,
        numero,
        ano,
        data,
        ementa: ementa || `${tipo} nº ${numero}/${ano}`,
        origem,
        autor_texto,
        fonte_visualizar_url,
        fonte_download_url,
      });
    }
  }

  return projects;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  // Create sync log entry
  const { data: logEntry } = await supabase
    .from("sync_log")
    .insert({ tipo: "projetos", status: "running", detalhes: {} })
    .select()
    .single();

  const logId = logEntry?.id;
  let newCount = 0;
  let updatedCount = 0;
  const errors: string[] = [];

  try {
    // Fetch the projects page
    const tipos = [
      { path: "projeto-de-lei", label: "Projeto de Lei" },
      { path: "projeto-de-resolucao", label: "Projeto de Resolução" },
      { path: "projeto-de-lei-complementar", label: "Projeto de Lei Complementar" },
    ];

    // Get all vereadores for author matching
    const { data: vereadores } = await supabase
      .from("vereadores")
      .select("id, nome, slug");

    const vereadorMap = new Map(
      (vereadores || []).map((v: any) => [v.slug, v.id])
    );

    // Fetch the main projects page (HTML) 
    const url = "https://acessoainformacao.camarademorrinhos.go.gov.br/projetos-de-leis/";
    console.log("Fetching:", url);

    let response;
    try {
      response = await fetch(url, {
        headers: {
          "User-Agent": "seuvereador.ai/1.0 (transparencia legislativa)",
        },
      });
    } catch (fetchError) {
      errors.push(`Fetch failed: ${fetchError.message}`);
      throw fetchError;
    }

    if (!response.ok) {
      errors.push(`HTTP ${response.status} from ${url}`);
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    const scraped = parseProjectsFromHtml(html);

    console.log(`Found ${scraped.length} projects in HTML`);

    for (const proj of scraped) {
      // Find author vereador_id
      const authorSlug = AUTHOR_SLUG_MAP[proj.autor_texto.toLowerCase()];
      const autorVereadorId = authorSlug ? vereadorMap.get(authorSlug) || null : null;

      // Check if project already exists
      const { data: existing } = await supabase
        .from("projetos")
        .select("id")
        .eq("tipo", proj.tipo)
        .eq("numero", proj.numero)
        .eq("ano", proj.ano)
        .eq("origem", proj.origem)
        .maybeSingle();

      if (!existing) {
        // Insert new project
        const { error } = await supabase.from("projetos").insert({
          tipo: proj.tipo,
          numero: proj.numero,
          ano: proj.ano,
          data: proj.data,
          ementa: proj.ementa,
          origem: proj.origem,
          autor_vereador_id: autorVereadorId,
          autor_texto: proj.autor_texto,
          status: "em_tramitacao",
          fonte_visualizar_url: proj.fonte_visualizar_url,
          fonte_download_url: proj.fonte_download_url,
          resumo_simples: null,
          tags: [],
        });

        if (error) {
          errors.push(`Insert error: ${error.message}`);
          console.error("Insert error:", error);
        } else {
          newCount++;
          console.log(`New project: ${proj.tipo} ${proj.numero}/${proj.ano}`);
        }
      } else {
        // Update existing if ementa changed
        const { error } = await supabase
          .from("projetos")
          .update({
            ementa: proj.ementa,
            fonte_visualizar_url: proj.fonte_visualizar_url,
            fonte_download_url: proj.fonte_download_url,
          })
          .eq("id", existing.id);

        if (!error) updatedCount++;
      }
    }

    // Update sync log
    if (logId) {
      await supabase
        .from("sync_log")
        .update({
          status: errors.length > 0 ? "partial" : "success",
          detalhes: {
            scraped_count: scraped.length,
            new_count: newCount,
            updated_count: updatedCount,
            errors,
          },
          finished_at: new Date().toISOString(),
        })
        .eq("id", logId);
    }

    return new Response(
      JSON.stringify({
        success: true,
        scraped: scraped.length,
        new: newCount,
        updated: updatedCount,
        errors,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Sync error:", error);

    if (logId) {
      await supabase
        .from("sync_log")
        .update({
          status: "error",
          detalhes: {
            error: error.message,
            errors,
          },
          finished_at: new Date().toISOString(),
        })
        .eq("id", logId);
    }

    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

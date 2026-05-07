import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BASE_URL = "https://morrinhos.centi.com.br";
const ATOS_URL = `${BASE_URL}/transparencia/atosadministrativos`;
const UA = "morrinhos.ai/1.0 (transparencia municipal)";
const TIPO_DECRETO_ID = 4;

// Parse dd/mm/yyyy to yyyy-mm-dd
function parseDateBR(str: string): string | null {
  const m = str.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!m) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

interface ScrapedDecreto {
  numero: string;
  ementa: string;
  data_publicacao: string | null;
  documento_url: string | null;
}

function parseAtosHtml(html: string): ScrapedDecreto[] {
  const items: ScrapedDecreto[] = [];

  const tbodyMatch = html.match(/<tbody>([\s\S]*?)<\/tbody>/);
  if (!tbodyMatch) return items;

  const tbody = tbodyMatch[1];
  const rows = tbody.split("</tr>").filter(r => r.includes("<td"));

  for (const row of rows) {
    const cells: string[] = [];
    const cellPattern = /<td[^>]*>([\s\S]*?)<\/td>/g;
    let cellMatch;
    while ((cellMatch = cellPattern.exec(row)) !== null) {
      cells.push(cellMatch[1].replace(/<[^>]*>/g, "").trim());
    }

    // Extract document download link
    const linkMatch = row.match(/href="([^"]*\/download\/[^"]*)"/);
    const docUrl = linkMatch ? linkMatch[1] : null;

    if (cells.length >= 3) {
      const descricao = cells[0]; // e.g. "DECRETO N 080/2026"
      const observacao = cells[1]; // e.g. "DECRETO N 080/2026 - NOMEIA PARA..."
      const dataPub = cells[2]; // e.g. "13/03/2026"

      // Extract numero from descricao
      const numMatch = descricao.match(/DECRETO\s+N\s+(\S+)/i);
      const numero = numMatch ? numMatch[1] : descricao;

      // Extract ementa from observacao (remove "DECRETO N XXX/YYYY - " prefix)
      let ementa = observacao;
      ementa = ementa.replace(/^DECRETO\s+N\s+\S+\s*[-–]\s*/i, "").trim();
      if (!ementa) ementa = descricao;

      items.push({
        numero,
        ementa,
        data_publicacao: parseDateBR(dataPub),
        documento_url: docUrl,
      });
    }
  }

  return items;
}

async function fetchPage(page: number, perPage: number): Promise<{ html: string; totalResults: number }> {
  const url = `${ATOS_URL}?id=${TIPO_DECRETO_ID}&pagina=${page}&itensporpagina=${perPage}&orderby=DataPublicacao desc, Id desc`;
  console.log(`Fetching page ${page}: ${url}`);
  const resp = await fetch(url, { headers: { "User-Agent": UA } });
  if (!resp.ok) throw new Error(`Centi HTTP ${resp.status}`);
  const html = await resp.text();

  // Extract total results from data-result attribute
  const totalMatch = html.match(/data-result="(\d+)"/);
  const totalResults = totalMatch ? parseInt(totalMatch[1]) : 0;

  return { html, totalResults };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  const reqUrl = new URL(req.url);
  const fullSync = reqUrl.searchParams.get("full") === "1";
  const perPage = fullSync ? 100 : 50; // daily: first 50, full: 100 per page

  try {
    let allItems: ScrapedDecreto[] = [];

    // First page to get total
    const { html: firstHtml, totalResults } = await fetchPage(1, perPage);
    const firstItems = parseAtosHtml(firstHtml);
    allItems = allItems.concat(firstItems);

    console.log(`Total decretos on Centi: ${totalResults}, page 1: ${firstItems.length}`);

    if (fullSync && totalResults > perPage) {
      const totalPages = Math.ceil(totalResults / perPage);
      for (let page = 2; page <= totalPages; page++) {
        try {
          const { html } = await fetchPage(page, perPage);
          const items = parseAtosHtml(html);
          allItems = allItems.concat(items);
          console.log(`Page ${page}: ${items.length} items`);
        } catch (e) {
          console.error(`Error on page ${page}:`, e.message);
          break;
        }
      }
    }

    console.log(`Total decretos scraped: ${allItems.length}`);

    let inserted = 0;
    let updated = 0;

    for (const decreto of allItems) {
      const { data: existing } = await supabase
        .from("decretos")
        .select("id")
        .eq("numero", decreto.numero)
        .maybeSingle();

      if (existing) {
        await supabase.from("decretos").update({
          data_publicacao: decreto.data_publicacao,
          ementa: decreto.ementa,
          fonte_url: decreto.documento_url || `${ATOS_URL}?id=${TIPO_DECRETO_ID}`,
        }).eq("id", existing.id);
        updated++;
      } else {
        const { error } = await supabase.from("decretos").insert({
          numero: decreto.numero,
          ementa: decreto.ementa,
          data_publicacao: decreto.data_publicacao,
          fonte_url: decreto.documento_url || `${ATOS_URL}?id=${TIPO_DECRETO_ID}`,
          orgao: null,
          categoria: null,
        });
        if (error) console.error(`Insert error for ${decreto.numero}:`, error.message);
        else inserted++;
      }
    }

    console.log(`Done: ${inserted} inserted, ${updated} updated`);
    return new Response(
      JSON.stringify({ success: true, source: "centi", total: allItems.length, inserted, updated }),
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

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CENTI_BASE = "https://camaramorrinhos.centi.com.br/transparencia/atosadministrativos";
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Map of tipo_codigo to tipo name
const TIPOS: Record<number, string> = {
  2: "Portaria",
  3: "Decreto",
  7: "Resolução",
  8: "Ata das Sessões Ordinárias",
  12: "Decreto Legislativo",
  14: "Pauta das Sessões",
  24: "Indicação",
};

function toIsoDate(d: string | null | undefined): string | null {
  if (!d) return null;
  const m = d.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  if (/^\d{4}-\d{2}-\d{2}/.test(d)) return d.split("T")[0];
  return null;
}

async function scrapeAtos(tipoCodigo: number): Promise<any[]> {
  const url = `${CENTI_BASE}/${tipoCodigo}`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`HTTP ${resp.status} for tipo ${tipoCodigo}`);
  const html = await resp.text();

  const results: any[] = [];
  // Parse table rows from HTML
  const tbodyMatch = html.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/i);
  if (!tbodyMatch) return results;

  const rows = tbodyMatch[1].split(/<tr[^>]*>/i).filter(r => r.includes("<td"));

  for (const row of rows) {
    const cells: string[] = [];
    const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    let m;
    while ((m = tdRegex.exec(row)) !== null) {
      // Strip HTML tags and trim
      cells.push(m[1].replace(/<[^>]*>/g, "").trim());
    }

    // Extract document link
    const linkMatch = row.match(/href="([^"]*\.(?:pdf|doc|docx|PDF|DOC|DOCX)[^"]*)"/i)
      || row.match(/href="(https:\/\/camaramorrinhos\.centi\.com\.br\/download\/[^"]*)"/i);

    if (cells.length >= 2) {
      results.push({
        numero: cells[0] || null,
        descricao: cells.find(c => c.length > 20) || cells[1] || null,
        data: cells.find(c => /\d{2}\/\d{2}\/\d{4}/.test(c)) || null,
        documento_url: linkMatch ? linkMatch[1] : null,
      });
    }
  }

  return results;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  let body: Record<string, any> = {};
  try { body = await req.json(); } catch { /* ok */ }
  const onlyTipos: number[] | undefined = body?.tipos;

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const currentYear = new Date().getFullYear();
  const errors: string[] = [];
  const counts: Record<string, number> = {};

  const tiposToSync = onlyTipos || Object.keys(TIPOS).map(Number);

  for (const tipoCodigo of tiposToSync) {
    const tipoNome = TIPOS[tipoCodigo] || `Tipo ${tipoCodigo}`;
    counts[tipoNome] = 0;
    try {
      await delay(1000);
      const items = await scrapeAtos(tipoCodigo);
      console.log(`${tipoNome}: ${items.length} items scraped`);

      for (const item of items) {
        const dataIso = toIsoDate(item.data);
        // Extract number and year from strings like "INDICAÇÃO Nº 068/2026"
        const numMatch = (item.numero || "").match(/(\d+)\/(\d{4})/);
        const parsedAno = numMatch ? parseInt(numMatch[2]) : (dataIso ? parseInt(dataIso.slice(0, 4)) : currentYear);
        const ano = parsedAno;
        const centiId = `ato-${tipoCodigo}-${item.numero || "s"}-${ano}`;

        const { error } = await sb.from("camara_atos").upsert({
          centi_id: centiId,
          tipo: tipoNome,
          tipo_codigo: tipoCodigo,
          numero: item.numero,
          descricao: item.descricao?.slice(0, 2000) || null,
          data_publicacao: dataIso,
          ano,
          documento_url: item.documento_url,
          fonte_url: `${CENTI_BASE}/${tipoCodigo}`,
        }, { onConflict: "centi_id" });

        if (error) errors.push(`${tipoNome}: ${error.message}`);
        else counts[tipoNome]++;
      }
    } catch (e) {
      errors.push(`${tipoNome}: ${(e as Error).message?.slice(0, 150)}`);
    }
  }

  return new Response(JSON.stringify({ success: true, counts, errors: errors.slice(0, 10) }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

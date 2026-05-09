import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PREFEITURA_URL = "https://morrinhos.centi.com.br";
const CAMARA_URL = "https://camaramorrinhos.centi.com.br";
const UA = "morrinhos.ai/1.0 (transparencia municipal)";

function parseBRL(str: string): number | null {
  if (!str || str.trim() === "") return null;
  const cleaned = str.replace(/\./g, "").replace(",", ".").trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function parseDateBR(str: string): string | null {
  const m = str.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!m) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

function extractContratoOrigemIdFromAditivoUrl(url: string): string | null {
  return url.match(/\/contratos\/contratoaditivo\/(\d+)/i)?.[1] ?? null;
}

interface ScrapedAditivo {
  contrato_numero: string;
  termo: number;
  tipo: string | null;
  tipo_aditivo: string | null;
  data_termo: string | null;
  prazo: string | null;
  cnpj: string | null;
  credor: string | null;
  valor: number | null;
  fonte_url: string;
}

function parseAditivosHtml(html: string, baseUrl: string): ScrapedAditivo[] {
  const aditivos: ScrapedAditivo[] = [];

  const tbodyMatch = html.match(/<tbody>([\s\S]*?)<\/tbody>/);
  if (!tbodyMatch) return aditivos;

  const tbody = tbodyMatch[1];
  const rows = tbody.split("</tr>").filter(r => r.includes("<td"));

  for (const row of rows) {
    const cells: string[] = [];
    const cellPattern = /<td[^>]*>([\s\S]*?)<\/td>/g;
    let cellMatch;
    while ((cellMatch = cellPattern.exec(row)) !== null) {
      cells.push(cellMatch[1].replace(/<[^>]*>/g, "").trim());
    }

    const linkMatch = row.match(/href="([^"]*contratoaditivo[^"]*)"/);
    const fonteUrl = linkMatch
      ? (linkMatch[1].startsWith("http") ? linkMatch[1] : `${baseUrl}${linkMatch[1]}`)
      : `${baseUrl}/contratos/aditivos`;

    // Columns: Contrato(0), Termo(1), Tipo(2), TipoAditivo(3), DataTermo(4), Prazo(5), CNPJ(6), Credor(7), ValorAditivo(8)
    if (cells.length >= 8) {
      const contratoNumero = cells[0].trim();
      const termo = parseInt(cells[1]) || 1;
      if (!contratoNumero) continue;

      aditivos.push({
        contrato_numero: contratoNumero,
        termo,
        tipo: cells[2] || null,
        tipo_aditivo: cells[3] || null,
        data_termo: parseDateBR(cells[4] || ""),
        prazo: parseDateBR(cells[5] || ""),
        cnpj: cells[6] || null,
        credor: cells[7] || null,
        valor: parseBRL(cells[8] || ""),
        fonte_url: fonteUrl,
      });
    }
  }

  return aditivos;
}

Deno.serve(async (req) => {
  // 🚨 KILL-SWITCH: esta função depende de fonte (Centi) que NÃO existe pra Morrinhos.
  // Está bloqueada via env DISABLED=true até ser reescrita pra NucleoGov.
  if (Deno.env.get("DISABLED") === "true") {
    return new Response(
      JSON.stringify({ ok: false, disabled: true, reason: "needs_nucleogov_rewrite" }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const anoParam = body?.ano;
    const orgaoParam = body?.orgao;
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const sources = [
      { name: "prefeitura", baseUrl: PREFEITURA_URL, orgaos: orgaoParam ? [orgaoParam] : [22, 23, 55, 67, 66, 44, 71, 68, 70, 72, 56] },
      { name: "camara", baseUrl: CAMARA_URL, orgaos: orgaoParam ? [orgaoParam] : [3, 12, 13, 14] },
    ];
    const anos = anoParam ? [anoParam] : [2026, 2025, 2024, 2023, 2022];
    let totalNew = 0;
    let totalUpdated = 0;
    const errors: string[] = [];

    for (const source of sources) {
      for (const ano of anos) {
        for (const orgao of source.orgaos) {
          try {
            let pagina = 1;
            const maxPages = 10;

            while (pagina <= maxPages) {
              const url = `${source.baseUrl}/contratos/aditivos?ano=${ano}&idorgao=${orgao}&pagina=${pagina}&itensporpagina=50`;
              const resp = await fetch(url, { headers: { "User-Agent": UA } });
              if (!resp.ok) {
                if (resp.status !== 404) errors.push(`Aditivos ${source.name}/${ano}/orgao${orgao}/p${pagina}: HTTP ${resp.status}`);
                break;
              }

              const html = await resp.text();
              const scraped = parseAditivosHtml(html, source.baseUrl);

              if (scraped.length === 0) break;

              console.log(`Aditivos ${source.name}/${ano}/orgao${orgao}/p${pagina}: ${scraped.length} encontrados`);

              const toUpsert = scraped.map(a => ({
                contrato_numero: a.contrato_numero,
                termo: a.termo,
                tipo: a.tipo,
                tipo_aditivo: a.tipo_aditivo,
                data_termo: a.data_termo,
                prazo: a.prazo,
                cnpj: a.cnpj,
                centi_id: extractContratoOrigemIdFromAditivoUrl(a.fonte_url),
                credor: a.credor?.trim() || "",
                valor: a.valor,
                ano,
                fonte_url: a.fonte_url,
              }));

              const { error: upsertErr } = await supabase
                .from("contratos_aditivos")
                .upsert(toUpsert, { onConflict: "contrato_numero,termo,ano,credor", ignoreDuplicates: false });

              if (upsertErr) {
                errors.push(`Upsert aditivos ${source.name}/${ano}/orgao${orgao}: ${upsertErr.message}`);
              } else {
                totalNew += toUpsert.length;
              }

              if (scraped.length < 50) break;
              pagina++;
            }
          } catch (e) {
            errors.push(`Aditivos ${source.name}/${ano}/orgao${orgao}: ${e.message}`);
          }
        }
      }
    }

    console.log(`Sync aditivos complete: ${totalNew} new, ${totalUpdated} updated, ${errors.length} errors`);

    return new Response(
      JSON.stringify({ success: true, new: totalNew, updated: totalUpdated, errors: errors.slice(0, 20) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("sync-contratos-aditivos error:", e);
    return new Response(
      JSON.stringify({ success: false, error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

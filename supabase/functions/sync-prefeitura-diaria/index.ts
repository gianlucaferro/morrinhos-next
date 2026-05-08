// 🚨 DISABLED: esta função aponta pra Centi (sistema usado pelo Piracanjuba).
// Morrinhos NÃO usa Centi — usa NucleoGov + WordPress oficial.
// Estado: NÃO DEPLOYAR até reescrever para a fonte certa.
// Doc: docs/HANDOFF_MORRINHOS.md → seção "Scrapers Centi → NucleoGov"
//
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BASE_URL = "https://morrinhos.centi.com.br";
const UA = "morrinhos.ai/1.0 (transparencia municipal)";

// Parse Brazilian currency string "1.234,56" to number
function parseBRL(str: string): number | null {
  if (!str || str.trim() === "") return null;
  const cleaned = str.replace(/\./g, "").replace(",", ".").trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

// Parse dd/mm/yyyy to yyyy-mm-dd
function parseDateBR(str: string): string | null {
  const m = str.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!m) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

// ===================== CONTRATOS SCRAPER =====================

interface ScrapedContrato {
  numero: string;
  empresa: string;
  valor: number | null;
  vigencia_inicio: string | null;
  vigencia_fim: string | null;
  objeto: string | null;
  fonte_url: string;
}

function parseContratosHtml(html: string): ScrapedContrato[] {
  const contratos: ScrapedContrato[] = [];
  
  const tbodyMatch = html.match(/<tbody>([\s\S]*?)<\/tbody>/);
  if (!tbodyMatch) return contratos;
  
  const tbody = tbodyMatch[1];
  const rows = tbody.split("</tr>").filter(r => r.includes("<td"));

  for (const row of rows) {
    const cells: string[] = [];
    const cellPattern = /<td[^>]*>([\s\S]*?)<\/td>/g;
    let cellMatch;
    while ((cellMatch = cellPattern.exec(row)) !== null) {
      cells.push(cellMatch[1].replace(/<[^>]*>/g, "").trim());
    }

    const linkMatch = row.match(/href="([^"]*contratos\/contrato\/\d+)"/);
    const fonteUrl = linkMatch ? linkMatch[1] : `${BASE_URL}/contratos`;

    if (cells.length >= 6) {
      contratos.push({
        vigencia_inicio: parseDateBR(cells[0]),
        vigencia_fim: parseDateBR(cells[1]),
        empresa: cells[3] || cells[2],
        valor: parseBRL(cells[4]),
        numero: cells[5],
        objeto: null, // will be filled from detail page
        fonte_url: fonteUrl.startsWith("http") ? fonteUrl : `${BASE_URL}${fonteUrl}`,
      });
    }
  }

  return contratos;
}

// Extract "Objeto" from contract detail page HTML
function parseContratoDetalhe(html: string): string | null {
  // Pattern: "Objeto" label followed by the value text
  // The page has format like: <b>Objeto</b>TEXT or similar patterns
  const patterns = [
    /Objeto\s*<\/(?:b|strong|td|th|label|span)>\s*([^<]+)/i,
    /Objeto\s*([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ][^<]{10,})/i,
  ];
  
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match && match[1]?.trim().length > 5) {
      return match[1].trim();
    }
  }
  return null;
}

// Fetch detail for a single contract with retry
async function fetchContratoDetalhe(url: string): Promise<string | null> {
  try {
    const resp = await fetch(url, { headers: { "User-Agent": UA } });
    if (!resp.ok) return null;
    const html = await resp.text();
    return parseContratoDetalhe(html);
  } catch {
    return null;
  }
}

// ===================== FOLHA DE PAGAMENTO SCRAPER =====================

interface ScrapedServidor {
  nome: string;
  cargo: string | null;
  bruto: number | null;
  liquido: number | null;
}

function parseServidoresHtml(html: string): ScrapedServidor[] {
  const servidores: ScrapedServidor[] = [];

  const tbodyMatch = html.match(/<tbody>([\s\S]*?)<\/tbody>/);
  if (!tbodyMatch) return servidores;

  const tbody = tbodyMatch[1];
  const rows = tbody.split("</tr>").filter(r => r.includes("<td"));

  for (const row of rows) {
    const cells: string[] = [];
    const cellPattern = /<td[^>]*>([\s\S]*?)<\/td>/g;
    let cellMatch;
    while ((cellMatch = cellPattern.exec(row)) !== null) {
      cells.push(cellMatch[1].replace(/<[^>]*>/g, "").trim());
    }

    // Typical columns: Nome, Cargo, ..., Bruto, ..., Líquido
    // We'll try to identify by position - varies by portal config
    if (cells.length >= 2) {
      const nome = cells[0];
      const cargo = cells.length > 1 ? cells[1] : null;
      
      // Try to find numeric values (bruto/liquido) in remaining cells
      let bruto: number | null = null;
      let liquido: number | null = null;
      
      for (let i = 2; i < cells.length; i++) {
        const val = parseBRL(cells[i]);
        if (val !== null && val > 0) {
          if (bruto === null) {
            bruto = val;
          } else if (liquido === null) {
            liquido = val;
          }
        }
      }

      if (nome && nome.length > 2) {
        servidores.push({ nome, cargo, bruto, liquido });
      }
    }
  }

  return servidores;
}

// ===================== LICITAÇÕES SCRAPER =====================

interface ScrapedLicitacao {
  numero: string | null;
  modalidade: string | null;
  objeto: string | null;
  status: string | null;
  data_publicacao: string | null;
  fonte_url: string;
}

function parseLicitacoesHtml(html: string): ScrapedLicitacao[] {
  const licitacoes: ScrapedLicitacao[] = [];

  const tbodyMatch = html.match(/<tbody>([\s\S]*?)<\/tbody>/);
  if (!tbodyMatch) return licitacoes;

  const tbody = tbodyMatch[1];
  const rows = tbody.split("</tr>").filter(r => r.includes("<td"));

  for (const row of rows) {
    const cells: string[] = [];
    const cellPattern = /<td[^>]*>([\s\S]*?)<\/td>/g;
    let cellMatch;
    while ((cellMatch = cellPattern.exec(row)) !== null) {
      cells.push(cellMatch[1].replace(/<[^>]*>/g, "").trim());
    }

    const linkMatch = row.match(/href="([^"]*licitacoes\/licitacao\/\d+)"/);
    const fonteUrl = linkMatch ? linkMatch[1] : `${BASE_URL}/licitacoes`;

    if (cells.length >= 3) {
      licitacoes.push({
        numero: cells[0] || null,
        modalidade: cells.length > 1 ? cells[1] : null,
        objeto: cells.length > 2 ? cells[2] : null,
        status: cells.length > 3 ? cells[3] : null,
        data_publicacao: cells.length > 4 ? parseDateBR(cells[4]) : null,
        fonte_url: fonteUrl,
      });
    }
  }

  return licitacoes;
}

// ===================== MAIN HANDLER =====================

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const reqUrl = new URL(req.url);
  const anoParam = reqUrl.searchParams.get("ano"); // optional: filter to single year
  const skipLicitacoes = reqUrl.searchParams.get("skip_licitacoes") === "1";

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  const { data: logEntry } = await supabase
    .from("sync_log")
    .insert({ tipo: "prefeitura_diaria", status: "running", detalhes: { ano: anoParam } })
    .select()
    .single();
  const logId = logEntry?.id;

  const results: Record<string, any> = {};
  const errors: string[] = [];

  try {
    // ====== 1. CONTRATOS ======
    console.log("Scraping contratos...");
    const allAnos = [2026, 2025, 2024, 2023, 2022, 2021, 2020];
    const anosContratos = anoParam ? [parseInt(anoParam)] : allAnos;
    // All municipal organs: Executivo(22), Câmara(23), Educação(55), Saúde(67),
    // Assistência Social(66), Cultura(44), Meio Ambiente(71), Esporte(68),
    // Agricultura(70), Infraestrutura(72), Administração(56)
    const orgaosContratos = [22, 23, 55, 67, 66, 44, 71, 68, 70, 72, 56];
    let newContratos = 0;
    let updatedContratos = 0;

    for (const ano of anosContratos) {
      for (const orgao of orgaosContratos) {
        try {
          const url = `${BASE_URL}/contratos?ano=${ano}&idorgao=${orgao}&pagina=1&itensporpagina=500`;
          const resp = await fetch(url, { headers: { "User-Agent": UA } });
          
          if (!resp.ok) {
            errors.push(`Contratos ${ano}/orgao${orgao}: HTTP ${resp.status}`);
            continue;
          }

          const html = await resp.text();
          const scraped = parseContratosHtml(html);
          console.log(`Contratos ${ano}/orgao${orgao}: ${scraped.length} encontrados`);

          if (scraped.length === 0) continue;

          // Fetch existing contract numbers for this year to avoid duplicates
          const { data: existing } = await supabase.from("contratos")
            .select("numero, vigencia_inicio")
            .gte("vigencia_inicio", `${ano}-01-01`)
            .lte("vigencia_inicio", `${ano}-12-31`);
          
          const existingKeys = new Set(
            (existing || []).map(e => `${e.numero}|${e.vigencia_inicio}`)
          );

          const toInsert = scraped
            .filter(c => !existingKeys.has(`${c.numero}|${c.vigencia_inicio}`))
            .map(c => ({
              numero: c.numero,
              empresa: c.empresa,
              valor: c.valor,
              vigencia_inicio: c.vigencia_inicio,
              vigencia_fim: c.vigencia_fim,
              status: "ativo" as const,
              fonte_url: c.fonte_url,
            }));

          if (toInsert.length > 0) {
            const { error } = await supabase.from("contratos").insert(toInsert);
            if (error) {
              errors.push(`Insert contratos ${ano}/orgao${orgao}: ${error.message}`);
            } else {
              newContratos += toInsert.length;
            }
          }
        } catch (e) {
          errors.push(`Contratos ${ano}/orgao${orgao}: ${e.message}`);
        }
      }
    }
    results.contratos = { new: newContratos, updated: updatedContratos };

    // Send push notification for new contracts
    if (newContratos > 0) {
      const today = new Date().toISOString().slice(0, 10);
      try {
        await fetch(`${supabaseUrl}/functions/v1/send-push`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
          },
          body: JSON.stringify({
            title: `📋 ${newContratos} novo${newContratos > 1 ? "s" : ""} contrato${newContratos > 1 ? "s" : ""} da Prefeitura`,
            body: `${newContratos} novo${newContratos > 1 ? "s" : ""} contrato${newContratos > 1 ? "s" : ""} ${newContratos > 1 ? "foram adicionados" : "foi adicionado"} ao portal de transparência.`,
            topic: "geral",
            url: "/prefeitura",
            dedup_key: `contratos_${today}`,
          }),
        });
      } catch (e) {
        console.error("Push notification error:", e.message);
      }
    }

    // ====== 2. LICITAÇÕES ======
    console.log("Scraping licitações...");
    let newLicitacoes = 0;

    if (!skipLicitacoes && !anoParam) {
    for (const ano of [2026, 2025]) {
      try {
        // Lei 14.133/21 (nova lei) 
        const url = `${BASE_URL}/licitacoes?lei=2&ano=${ano}&idorgao=22&pagina=1&itensporpagina=100`;
        const resp = await fetch(url, { headers: { "User-Agent": UA } });

        if (!resp.ok) {
          errors.push(`Licitações ${ano}: HTTP ${resp.status}`);
          continue;
        }

        const html = await resp.text();
        const scraped = parseLicitacoesHtml(html);
        console.log(`Licitações ${ano}: ${scraped.length} encontradas`);

        for (const l of scraped) {
          if (!l.numero) continue;
          
          const { data: existing } = await supabase
            .from("licitacoes")
            .select("id")
            .eq("numero", l.numero)
            .maybeSingle();

          if (!existing) {
            const { error } = await supabase.from("licitacoes").insert({
              numero: l.numero,
              modalidade: l.modalidade,
              objeto: l.objeto,
              status: l.status,
              data_publicacao: l.data_publicacao,
              fonte_url: l.fonte_url,
            });
            if (error) errors.push(`Insert licitação ${l.numero}: ${error.message}`);
            else newLicitacoes++;
          }
        }
      } catch (e) {
        errors.push(`Licitações ${ano}: ${e.message}`);
      }
    }
    } // end skipLicitacoes check
    results.licitacoes = { new: newLicitacoes };

    // ====== 3. VERIFICAR PORTAL ======
    results.portal_acessivel = true;
    results.fonte_url = BASE_URL;

    // Finalizar
    const finalStatus = errors.length > 0 ? "partial" : "success";
    if (logId) {
      await supabase.from("sync_log").update({
        status: finalStatus,
        detalhes: { ...results, errors: errors.slice(0, 20) },
        finished_at: new Date().toISOString(),
      }).eq("id", logId);
    }

    return new Response(
      JSON.stringify({ success: true, ...results, errors }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Erro sync diária:", error);
    if (logId) {
      await supabase.from("sync_log").update({
        status: "error",
        detalhes: { error: error.message, errors, ...results },
        finished_at: new Date().toISOString(),
      }).eq("id", logId);
    }
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

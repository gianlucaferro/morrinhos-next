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

// Câmara de Morrinhos Centi portal (separate from prefeitura)
const BASE_URL = "https://camaramorrinhos.centi.com.br";
const UA = "morrinhos.ai/1.0 (transparencia legislativa)";

function parseBRL(str: string): number | null {
  if (!str || str.trim() === "") return null;
  const cleaned = str.replace(/\./g, "").replace(",", ".").trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

// Column mapping (same structure as prefeitura Centi):
// 0: Mat. | 1: Nome | 2: Data admissão | 3: Decreto | 4: Tipo admissão
// 5: Estabilidade | 6: Cargo | 7: Função | 8: Carga horária | 9: Lotação
// 10: Movimentação | 11: Tp. pagto | 12: Salário base | 13: Total proventos | 14: Total desc.
const COL = { NOME: 1, CARGO: 6, SALARIO_BASE: 12, TOTAL_PROVENTOS: 13, TOTAL_DESCONTOS: 14 };

interface ParsedRow {
  nome: string;
  cargo: string | null;
  subsidio_referencia: number;
  bruto: number | null;
  liquido: number | null;
}

function parseHtml(html: string): ParsedRow[] {
  const results: ParsedRow[] = [];
  const tbodyMatch = html.match(/<tbody>([\s\S]*?)<\/tbody>/);
  if (!tbodyMatch) return results;

  const rows = tbodyMatch[1].split("</tr>").filter(r => r.includes("<td"));
  for (const row of rows) {
    const cells: string[] = [];
    const cellPattern = /<td[^>]*>([\s\S]*?)<\/td>/g;
    let m;
    while ((m = cellPattern.exec(row)) !== null) {
      cells.push(m[1].replace(/<[^>]*>/g, "").trim());
    }
    if (cells.length <= COL.CARGO) continue;

    const nome = cells[COL.NOME];
    const cargo = cells[COL.CARGO] || null;
    const subsidio = cells.length > COL.SALARIO_BASE ? parseBRL(cells[COL.SALARIO_BASE]) : null;
    const bruto = cells.length > COL.TOTAL_PROVENTOS ? parseBRL(cells[COL.TOTAL_PROVENTOS]) : null;
    const descontos = cells.length > COL.TOTAL_DESCONTOS ? parseBRL(cells[COL.TOTAL_DESCONTOS]) : null;
    const liquido = bruto !== null && descontos !== null ? Math.round((bruto - descontos) * 100) / 100 : null;

    // Filter for vereadores only (cargo contains "VEREADOR" or "PRESIDENTE")
    if (nome && nome.length > 2 && !nome.includes("Nenhum resultado")) {
      const cargoUpper = (cargo || "").toUpperCase();
      if (cargoUpper.includes("VEREADOR") || cargoUpper.includes("PRESIDENTE") || cargoUpper.includes("SECRETÁRIO DA MESA")) {
        results.push({
          nome,
          cargo,
          subsidio_referencia: subsidio || 0,
          bruto,
          liquido,
        });
      }
    }
  }
  return results;
}

// Normalize name for matching
function normalizeName(name: string): string {
  return name.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ").trim();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: log } = await sb.from("sync_log")
    .insert({ tipo: "remuneracao_vereadores", status: "running", detalhes: {} })
    .select("id").single();
  const logId = log?.id;

  const errors: string[] = [];
  let newCount = 0;

  const reqUrl = new URL(req.url);
  const now = new Date();
  const defaultMonth = now.getMonth() === 0 ? 12 : now.getMonth();
  const defaultYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const mes = parseInt(reqUrl.searchParams.get("mes") || String(defaultMonth));
  const ano = parseInt(reqUrl.searchParams.get("ano") || String(defaultYear));
  const competencia = `${ano}-${String(mes).padStart(2, "0")}`;

  try {
    // Fetch vereadores from DB for matching
    const { data: vereadores } = await sb.from("vereadores").select("id, nome");
    const vereadorMap = new Map<string, string>();
    for (const v of vereadores || []) {
      vereadorMap.set(normalizeName(v.nome), v.id);
    }

    // Try multiple orgao IDs on the Câmara Centi portal
    // "PODER LEGISLATIVO" is typically the first option
    const ORGAO_IDS = [22, 55, 67, 66, 23, 1, 2, 3];
    let html = "";
    let foundOrgao = false;

    for (const orgaoId of ORGAO_IDS) {
      const body = new URLSearchParams({
        idorgao: String(orgaoId),
        mes: String(mes),
        ano: String(ano),
        nome: "", cargo: "", decreto: "", admissao: "",
        pagina: "1", itensporpagina: "100",
      });

      try {
        const resp = await fetch(`${BASE_URL}/servidor/remuneracao`, {
          method: "POST",
          headers: {
            "User-Agent": UA,
            "Content-Type": "application/x-www-form-urlencoded",
            "X-Requested-With": "XMLHttpRequest",
          },
          body: body.toString(),
        });

        if (!resp.ok) {
          console.log(`Orgao ${orgaoId}: HTTP ${resp.status}`);
          continue;
        }

        const responseHtml = await resp.text();
        const rows = parseHtml(responseHtml);
        if (rows.length > 0) {
          console.log(`Found ${rows.length} vereadores in orgao ${orgaoId}`);
          html = responseHtml;
          foundOrgao = true;
          break;
        }
      } catch (e) {
        console.log(`Orgao ${orgaoId} error: ${e.message}`);
      }
    }

    if (!foundOrgao) {
      // Fallback: try GET request on the page itself
      const resp = await fetch(`${BASE_URL}/servidor/remuneracao`, {
        headers: { "User-Agent": UA },
      });
      if (resp.ok) html = await resp.text();
    }

    const parsed = parseHtml(html);
    console.log(`Vereadores com remuneração em ${competencia}: ${parsed.length}`);

    for (const p of parsed) {
      // Match to vereador
      const normalizedName = normalizeName(p.nome);
      let vereadorId: string | undefined;

      // Try exact match first
      vereadorId = vereadorMap.get(normalizedName);

      // Try partial match
      if (!vereadorId) {
        for (const [key, id] of vereadorMap) {
          if (normalizedName.includes(key) || key.includes(normalizedName)) {
            vereadorId = id;
            break;
          }
          // Try matching last names
          const lastNameScraped = normalizedName.split(" ").pop();
          const lastNameDb = key.split(" ").pop();
          if (lastNameScraped && lastNameDb && lastNameScraped === lastNameDb) {
            // Check first name too
            const firstScraped = normalizedName.split(" ")[0];
            const firstDb = key.split(" ")[0];
            if (firstScraped === firstDb) {
              vereadorId = id;
              break;
            }
          }
        }
      }

      if (!vereadorId) {
        console.log(`Vereador não encontrado: ${p.nome}`);
        errors.push(`Match not found: ${p.nome}`);
        continue;
      }

      if (p.bruto === null) continue;

      const { data: existing } = await sb.from("remuneracao_mensal")
        .select("id")
        .eq("vereador_id", vereadorId)
        .eq("competencia", competencia)
        .maybeSingle();

      if (!existing) {
        const { error } = await sb.from("remuneracao_mensal").insert({
          vereador_id: vereadorId,
          competencia,
          subsidio_referencia: p.subsidio_referencia,
          bruto: p.bruto,
          liquido: p.liquido,
          fonte_url: `${BASE_URL}/servidor/remuneracao`,
        });
        if (error) errors.push(`Insert rem ${p.nome}: ${error.message}`);
        else newCount++;
      } else {
        // Update existing
        await sb.from("remuneracao_mensal").update({
          subsidio_referencia: p.subsidio_referencia,
          bruto: p.bruto,
          liquido: p.liquido,
        }).eq("id", existing.id);
      }
    }

    const result = { competencia, parsed: parsed.length, new: newCount, errors: errors.slice(0, 10) };
    if (logId) {
      await sb.from("sync_log").update({
        status: errors.length > 0 ? "partial" : "success",
        detalhes: result, finished_at: new Date().toISOString(),
      }).eq("id", logId);
    }

    return new Response(JSON.stringify({ success: true, ...result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Erro:", error);
    if (logId) {
      await sb.from("sync_log").update({
        status: "error", detalhes: { error: error.message, errors },
        finished_at: new Date().toISOString(),
      }).eq("id", logId);
    }
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

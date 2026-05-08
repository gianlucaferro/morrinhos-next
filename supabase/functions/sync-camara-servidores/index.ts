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

const BASE_URL = "https://camaramorrinhos.centi.com.br";
const UA = "morrinhos.ai/1.0 (transparencia municipal)";

function parseBRL(str: string): number | null {
  if (!str || str.trim() === "") return null;
  const cleaned = str.replace(/\./g, "").replace(",", ".").trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

const COL = { NOME: 1, CARGO: 6, TOTAL_PROVENTOS: 13, TOTAL_DESCONTOS: 14 };

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
    const bruto = cells.length > COL.TOTAL_PROVENTOS ? parseBRL(cells[COL.TOTAL_PROVENTOS]) : null;
    const descontos = cells.length > COL.TOTAL_DESCONTOS ? parseBRL(cells[COL.TOTAL_DESCONTOS]) : null;
    const liquido = bruto !== null && descontos !== null ? Math.round((bruto - descontos) * 100) / 100 : null;

    if (nome && nome.length > 2 && !nome.includes("Nenhum resultado")) {
      servidores.push({ nome, cargo, bruto, liquido });
    }
  }
  return servidores;
}

async function fetchFolha(idorgao: number, mes: number, ano: number): Promise<ScrapedServidor[]> {
  const body = new URLSearchParams({
    idorgao: String(idorgao), mes: String(mes), ano: String(ano),
    nome: "", cargo: "", decreto: "", admissao: "",
    pagina: "1", itensporpagina: "2000",
  });
  try {
    const r = await fetch(`${BASE_URL}/servidor/remuneracao`, {
      method: "POST",
      headers: { "User-Agent": UA, "Content-Type": "application/x-www-form-urlencoded", "X-Requested-With": "XMLHttpRequest" },
      body: body.toString(),
    });
    if (!r.ok) return [];
    return parseServidoresHtml(await r.text());
  } catch (e) {
    console.error(`Fetch orgao=${idorgao}: ${e.message}`);
    return [];
  }
}

// Câmara Municipal orgão IDs - PODER LEGISLATIVO and Fundo Especial variants
// We'll try common IDs: 1 (Poder Legislativo) and a few others
const ORGAOS = [1, 2, 3, 4];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);

  // Auto-detect: use previous month if no mes/ano provided
  const now = new Date();
  const defaultMonth = now.getMonth() === 0 ? 12 : now.getMonth();
  const defaultYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const mes = parseInt(url.searchParams.get("mes") || String(defaultMonth));
  const ano = parseInt(url.searchParams.get("ano") || String(defaultYear));
  const competencia = `${ano}-${String(mes).padStart(2, "0")}`;

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const { data: log } = await sb.from("sync_log")
    .insert({ tipo: "camara_servidores", status: "running", detalhes: { competencia } })
    .select("id").single();
  const logId = log?.id;

  try {
    // Fetch all orgãos in parallel
    const allResults: ScrapedServidor[][] = [];
    const results = await Promise.all(ORGAOS.map(id => fetchFolha(id, mes, ano)));
    results.forEach((r, j) => {
      allResults.push(r);
      console.log(`Orgao ${ORGAOS[j]}: ${r.length}`);
    });

    // Deduplicate: prefer entries WITH salary data
    const seen = new Map<string, number>();
    const all: ScrapedServidor[] = [];
    for (const srvs of allResults) {
      for (const s of srvs) {
        const existingIdx = seen.get(s.nome);
        if (existingIdx === undefined) {
          seen.set(s.nome, all.length);
          all.push(s);
        } else if (s.bruto !== null && all[existingIdx].bruto === null) {
          all[existingIdx] = s;
        }
      }
    }
    console.log(`Total unique Câmara: ${all.length}`);

    // Batch upsert servidores with orgao_tipo = 'camara'
    const BATCH = 200;
    const srvBatches: Promise<void>[] = [];
    for (let i = 0; i < all.length; i += BATCH) {
      const batch = all.slice(i, i + BATCH).map(s => ({
        nome: s.nome, cargo: s.cargo,
        fonte_url: `${BASE_URL}/servidor/remuneracao`,
        orgao_tipo: "camara",
      }));
      srvBatches.push(
        sb.from("servidores").upsert(batch, { onConflict: "nome" }).then(({ error }) => {
          if (error) console.error(`Srv batch ${i}: ${error.message}`);
        })
      );
    }
    await Promise.all(srvBatches);

    // Fetch Câmara servidor IDs
    const dbSrvs: { id: string; nome: string }[] = [];
    let offset = 0;
    const PAGE = 1000;
    while (true) {
      const { data: page } = await sb.from("servidores")
        .select("id, nome")
        .eq("orgao_tipo", "camara")
        .range(offset, offset + PAGE - 1);
      if (!page || page.length === 0) break;
      dbSrvs.push(...page);
      if (page.length < PAGE) break;
      offset += PAGE;
    }
    const nameMap = new Map(dbSrvs.map(s => [s.nome, s.id]));
    console.log(`nameMap Câmara: ${nameMap.size}`);

    // Build remunerações and upsert
    const rems = all
      .filter(s => s.bruto !== null && nameMap.has(s.nome))
      .map(s => ({
        servidor_id: nameMap.get(s.nome)!,
        competencia, bruto: s.bruto, liquido: s.liquido,
        fonte_url: `${BASE_URL}/servidor/remuneracao`,
      }));

    let remCriadas = 0;
    const remBatches: Promise<number>[] = [];
    for (let i = 0; i < rems.length; i += BATCH) {
      const batch = rems.slice(i, i + BATCH);
      remBatches.push(
        sb.from("remuneracao_servidores").upsert(batch, {
          onConflict: "servidor_id,competencia",
        }).select("id").then(({ data, error }) => {
          if (error) console.error(`Rem batch ${i}: ${error.message}`);
          return (data || []).length;
        })
      );
    }
    const remResults = await Promise.all(remBatches);
    remCriadas = remResults.reduce((a, b) => a + b, 0);

    const result = { competencia, servidores: all.length, remuneracoes: remCriadas, status: "success" };

    if (logId) {
      await sb.from("sync_log").update({
        status: "success", detalhes: result, finished_at: new Date().toISOString(),
      }).eq("id", logId);
    }

    return new Response(JSON.stringify({ success: true, ...result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Erro:", error);
    if (logId) {
      await sb.from("sync_log").update({
        status: "error", detalhes: { error: error.message }, finished_at: new Date().toISOString(),
      }).eq("id", logId);
    }
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BASE_URL = "https://morrinhos.centi.com.br";
const UA = "morrinhos.ai/1.0 (transparencia municipal)";

// Câmara é idorgao=23 — fica fora da rotina de Prefeitura
const ORGAOS_PREFEITURA = [22, 55, 67, 66, 44, 71, 68, 70, 72, 56];

// Volume mínimo para considerar uma competência "publicada" pela Prefeitura
const MIN_PREFEITURA_ROWS = 100;

function parseBRL(str: string): number | null {
  if (!str || str.trim() === "") return null;
  const cleaned = str.replace(/\./g, "").replace(",", ".").trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

// Column mapping from Centi portal (verified via debug):
// 0: Mat. | 1: Nome | 2: Data admissão | 3: Decreto | 4: Tipo admissão
// 5: Estabilidade | 6: Cargo | 7: Função | 8: Carga horária | 9: Lotação
// 10: Movimentação | 11: Tp. pagto | 12: Salário base | 13: Total proventos | 14: Total desc.
const COL = { NOME: 1, CARGO: 6, TIPO_PAGTO: 11, TOTAL_PROVENTOS: 13, TOTAL_DESCONTOS: 14 };

interface ScrapedServidor {
  nome: string;
  cargo: string | null;
  bruto: number | null;
  liquido: number | null;
  tipo_folha: string;
}

interface CompetenciaDetectada {
  mes: number;
  ano: number;
  competencia: string;
  totalFonte: number;
  countsPorOrgao: Record<number, number>;
  forced: boolean;
}

function competenciaKey(ano: number, mes: number) {
  return `${ano}-${String(mes).padStart(2, "0")}`;
}

function parseDataResult(html: string): number {
  const match = html.match(/data-result="(\d+)"/);
  return match ? Number(match[1]) : 0;
}

function buildCandidateMonths(now = new Date()): Array<{ mes: number; ano: number }> {
  const candidates: Array<{ mes: number; ano: number }> = [];
  for (let offset = 0; offset < 6; offset++) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1));
    candidates.push({ mes: d.getUTCMonth() + 1, ano: d.getUTCFullYear() });
  }
  return candidates;
}

async function fetchFolhaCount(idorgao: number, mes: number, ano: number): Promise<number> {
  const body = new URLSearchParams({
    idorgao: String(idorgao),
    mes: String(mes),
    ano: String(ano),
    nome: "",
    cargo: "",
    decreto: "",
    admissao: "",
    pagina: "1",
    itensporpagina: "5",
  });
  try {
    const r = await fetch(`${BASE_URL}/servidor/remuneracao`, {
      method: "POST",
      headers: {
        "User-Agent": UA,
        "Content-Type": "application/x-www-form-urlencoded",
        "X-Requested-With": "XMLHttpRequest",
      },
      body: body.toString(),
    });
    if (!r.ok) return 0;
    return parseDataResult(await r.text());
  } catch (e) {
    console.error(`Count orgao=${idorgao} ${mes}/${ano}: ${(e as Error).message}`);
    return 0;
  }
}

async function descobrirCompetenciaMaisRecente(
  orgaos: number[],
  forcedMes?: number,
  forcedAno?: number,
): Promise<CompetenciaDetectada> {
  const candidates =
    forcedMes && forcedAno
      ? [{ mes: forcedMes, ano: forcedAno }]
      : buildCandidateMonths();

  for (const candidate of candidates) {
    const counts = await Promise.all(
      orgaos.map(async (orgao) => [orgao, await fetchFolhaCount(orgao, candidate.mes, candidate.ano)] as const),
    );
    const countsPorOrgao = Object.fromEntries(counts) as Record<number, number>;
    const totalFonte = Object.values(countsPorOrgao).reduce((sum, count) => sum + count, 0);

    if (forcedMes && forcedAno) {
      return {
        ...candidate,
        competencia: competenciaKey(candidate.ano, candidate.mes),
        totalFonte,
        countsPorOrgao,
        forced: true,
      };
    }

    if (totalFonte >= MIN_PREFEITURA_ROWS) {
      return {
        ...candidate,
        competencia: competenciaKey(candidate.ano, candidate.mes),
        totalFonte,
        countsPorOrgao,
        forced: false,
      };
    }
  }

  throw new Error("Nenhuma competência recente da Prefeitura encontrada no Centi");
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
    const tipoPagto = cells.length > COL.TIPO_PAGTO ? (cells[COL.TIPO_PAGTO] || "").trim().toUpperCase() : "";
    const bruto = cells.length > COL.TOTAL_PROVENTOS ? parseBRL(cells[COL.TOTAL_PROVENTOS]) : null;
    const descontos = cells.length > COL.TOTAL_DESCONTOS ? parseBRL(cells[COL.TOTAL_DESCONTOS]) : null;
    const liquido = bruto !== null && descontos !== null ? Math.round((bruto - descontos) * 100) / 100 : null;

    let tipo_folha = "NORMAL";
    if (tipoPagto.includes("RESCIS")) tipo_folha = "RESCISÃO";
    else if (tipoPagto.includes("13")) tipo_folha = "13º SALÁRIO";
    else if (tipoPagto.includes("FÉRIAS") || tipoPagto.includes("FERIAS")) tipo_folha = "FÉRIAS";

    if (nome && nome.length > 2 && !nome.includes("Nenhum resultado")) {
      servidores.push({ nome, cargo, bruto, liquido, tipo_folha });
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
    console.error(`Fetch orgao=${idorgao}: ${(e as Error).message}`);
    return [];
  }
}

// === Auth guard: validates CRON_SECRET or service_role bearer ===
function authorize(req: Request): boolean {
  const cronSecret = Deno.env.get("CRON_SECRET");
  const headerCron = req.headers.get("x-cron-secret");
  if (cronSecret && headerCron === cronSecret) return true;
  const auth = req.headers.get("authorization") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (serviceKey && auth === `Bearer ${serviceKey}`) return true;
  return false;
}

Deno.serve(async (req) => {
  if (!authorize(req)) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 🚨 KILL-SWITCH: esta função depende de fonte (Centi) que NÃO existe pra Morrinhos.
  // Está bloqueada via env DISABLED=true até ser reescrita pra NucleoGov.
  if (Deno.env.get("DISABLED") === "true") {
    return new Response(
      JSON.stringify({ ok: false, disabled: true, reason: "needs_nucleogov_rewrite" }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }

  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  const orgaoFilter = url.searchParams.get("orgao");
  const forcedMes = url.searchParams.get("mes");
  const forcedAno = url.searchParams.get("ano");
  const dryRun = url.searchParams.get("dry_run") === "1";

  const orgaos = orgaoFilter ? [parseInt(orgaoFilter)] : ORGAOS_PREFEITURA;

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  let detected: CompetenciaDetectada;
  try {
    detected = await descobrirCompetenciaMaisRecente(
      orgaos,
      forcedMes ? parseInt(forcedMes) : undefined,
      forcedAno ? parseInt(forcedAno) : undefined,
    );
  } catch (error) {
    const msg = (error as Error).message;
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const { mes, ano, competencia, totalFonte, countsPorOrgao, forced } = detected;
  console.log(`Competência detectada: ${competencia} (forced=${forced}, totalFonte=${totalFonte})`);

  if (dryRun) {
    return new Response(
      JSON.stringify({ success: true, dry_run: true, detected, orgaos_consultados: orgaos }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const { data: log } = await sb.from("sync_log")
    .insert({
      tipo: "prefeitura_mensal",
      status: "running",
      detalhes: { competencia, totalFonte, countsPorOrgao, forced, orgaos },
    })
    .select("id").single();
  const logId = log?.id;

  try {
    // Fetch all orgãos in parallel (3 at a time to avoid overwhelming the portal)
    const CONCURRENCY = 3;
    const allResults: ScrapedServidor[][] = new Array(orgaos.length);
    for (let i = 0; i < orgaos.length; i += CONCURRENCY) {
      const batch = orgaos.slice(i, i + CONCURRENCY);
      const results = await Promise.all(batch.map(id => fetchFolha(id, mes, ano)));
      results.forEach((r, j) => {
        allResults[i + j] = r;
        console.log(`Orgao ${batch[j]}: ${r.length}`);
      });
    }

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
    console.log(`Total unique: ${all.length}`);

    // Batch upsert servidores marcando orgao_tipo='prefeitura' explicitamente
    // e usando chave composta (nome,orgao_tipo) para permitir homônimo na Câmara
    const BATCH = 200;
    const srvBatches: Promise<void>[] = [];
    for (let i = 0; i < all.length; i += BATCH) {
      const batch = all.slice(i, i + BATCH).map(s => ({
        nome: s.nome,
        cargo: s.cargo,
        fonte_url: `${BASE_URL}/servidor/remuneracao`,
        orgao_tipo: "prefeitura",
      }));
      srvBatches.push(
        sb.from("servidores").upsert(batch, { onConflict: "nome,orgao_tipo" }).then(({ error }) => {
          if (error) console.error(`Srv batch ${i}: ${error.message}`);
        })
      );
    }
    await Promise.all(srvBatches);

    // Buscar IDs de servidores SOMENTE da Prefeitura (nameMap não pode pegar Câmara homônimo)
    const dbSrvs: { id: string; nome: string }[] = [];
    let offset = 0;
    const PAGE = 1000;
    while (true) {
      const { data: page } = await sb
        .from("servidores")
        .select("id, nome")
        .eq("orgao_tipo", "prefeitura")
        .range(offset, offset + PAGE - 1);
      if (!page || page.length === 0) break;
      dbSrvs.push(...page);
      if (page.length < PAGE) break;
      offset += PAGE;
    }
    const nameMap = new Map(dbSrvs.map(s => [s.nome, s.id]));
    console.log(`nameMap (prefeitura): ${nameMap.size}`);

    // Build remunerações e upsert em batches
    const rems = all
      .filter(s => s.bruto !== null && nameMap.has(s.nome))
      .map(s => ({
        servidor_id: nameMap.get(s.nome)!,
        competencia,
        bruto: s.bruto,
        liquido: s.liquido,
        tipo_folha: s.tipo_folha || "NORMAL",
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

    const result = {
      competencia,
      forced,
      totalFonte,
      countsPorOrgao,
      orgaos,
      servidores: all.length,
      remuneracoes: remCriadas,
      status: "success",
    };

    if (logId) {
      await sb.from("sync_log").update({
        status: "success",
        detalhes: result,
        finished_at: new Date().toISOString(),
      }).eq("id", logId);
    }

    // Push notification for new payroll
    if (remCriadas > 0) {
      const meses = ["", "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
      const mesNome = meses[mes] || competencia;
      try {
        await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-push`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
          },
          body: JSON.stringify({
            title: `💰 Folha de ${mesNome}/${ano} disponível`,
            body: `A folha de pagamento de ${mesNome} já está disponível com ${remCriadas} registros.`,
            topic: "geral",
            url: "/prefeitura",
            dedup_key: `folha_${competencia}`,
          }),
        });
      } catch (e) {
        console.error("Push notification error:", (e as Error).message);
      }
    }

    return new Response(JSON.stringify({ success: true, ...result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Erro:", error);
    if (logId) {
      await sb.from("sync_log").update({
        status: "error",
        detalhes: { error: (error as Error).message, competencia, countsPorOrgao },
        finished_at: new Date().toISOString(),
      }).eq("id", logId);
    }
    return new Response(JSON.stringify({ success: false, error: (error as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

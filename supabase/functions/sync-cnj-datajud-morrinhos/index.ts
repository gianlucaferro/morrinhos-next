// Sync de processos judiciais do TJGO em Morrinhos via CNJ Datajud
//
// Endpoint: https://api-publica.datajud.cnj.jus.br/api_publica_tjgo/_search (Elasticsearch)
// Auth: header `Authorization: APIKey <CNJ_DATAJUD_API_KEY>`
// Total descoberto: 10.000 processos em Morrinhos (orgaoJulgador.codigoMunicipioIBGE=5213806)
//
// Paginação via `search_after` (cursor) — recomendado pelo CNJ.
// Idempotente: UNIQUE em numero_processo
// Auth interno: x-cron-secret OU Bearer service_role

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const IBGE_MUN = 5213806;
const DATAJUD_URL = "https://api-publica.datajud.cnj.jus.br/api_publica_tjgo/_search";

function authorize(req: Request): boolean {
  const cronSecret = Deno.env.get("CRON_SECRET");
  const headerCron = req.headers.get("x-cron-secret");
  if (cronSecret && headerCron === cronSecret) return true;
  const auth = req.headers.get("authorization") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (serviceKey && auth === `Bearer ${serviceKey}`) return true;
  return false;
}

interface DatajudHit {
  _id: string;
  _source: {
    numeroProcesso: string;
    classe?: { codigo: number; nome: string };
    assuntos?: Array<{ codigo: number; nome: string }>;
    orgaoJulgador?: { codigo: number; nome: string; codigoMunicipioIBGE: number };
    dataAjuizamento?: string;
    dataHoraUltimaAtualizacao?: string;
    movimentos?: Array<{
      codigo: number;
      nome: string;
      dataHora: string;
    }>;
    valor?: number;
    tribunal?: string;
    grau?: string;
  };
  sort?: number[];
}

async function fetchDatajudPage(
  apiKey: string,
  searchAfter: number[] | null,
  size: number,
): Promise<{ hits: DatajudHit[]; total: number }> {
  const body: any = {
    query: {
      match: { "orgaoJulgador.codigoMunicipioIBGE": IBGE_MUN },
    },
    size,
    // Sort por dataAjuizamento desc (processos mais novos primeiro) — @timestamp não existe no índice TJGO
    sort: [{ "dataAjuizamento": { order: "desc" } }],
    _source: [
      "numeroProcesso",
      "classe",
      "assuntos",
      "orgaoJulgador",
      "dataAjuizamento",
      "dataHoraUltimaAtualizacao",
      "movimentos",
      "valor",
      "tribunal",
      "grau",
    ],
  };
  if (searchAfter) body.search_after = searchAfter;

  const r = await fetch(DATAJUD_URL, {
    method: "POST",
    headers: {
      "Authorization": `APIKey ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!r.ok) {
    const text = await r.text();
    throw new Error(`Datajud HTTP ${r.status}: ${text.slice(0, 200)}`);
  }

  const json = await r.json();
  return {
    hits: json.hits?.hits ?? [],
    total: json.hits?.total?.value ?? 0,
  };
}

// dataAjuizamento vem como "20260331170207" (YYYYMMDDHHMMSS) ou ISO. Normaliza pra YYYY-MM-DD.
function parseDataAjuizamento(raw: string | null | undefined): string | null {
  if (!raw) return null;
  // ISO: 2026-03-31T...
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  // YYYYMMDDHHMMSS
  if (/^\d{14}$/.test(raw)) {
    return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
  }
  // YYYYMMDD
  if (/^\d{8}$/.test(raw)) {
    return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
  }
  return null;
}

function mapHit(h: DatajudHit) {
  const s = h._source;
  const ultMov = (s.movimentos ?? []).slice(-1)[0];
  return {
    numero_processo: s.numeroProcesso,
    classe: s.classe?.nome ?? null,
    assunto: (s.assuntos ?? []).map((a) => a.nome).join("; ") || null,
    orgao_julgador: s.orgaoJulgador?.nome ?? null,
    data_ajuizamento: parseDataAjuizamento(s.dataAjuizamento),
    data_ultimo_movimento: s.dataHoraUltimaAtualizacao ?? null,
    ultimo_movimento: ultMov?.nome ?? null,
    valor_causa: s.valor ?? null,
    fonte: "CNJ Datajud TJGO",
    raw_json: s,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  if (!authorize(req)) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const apiKey = Deno.env.get("CNJ_DATAJUD_API_KEY");
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "CNJ_DATAJUD_API_KEY não configurado" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const url = new URL(req.url);
  const maxPaginas = parseInt(url.searchParams.get("maxPaginas") ?? "5");
  const pageSize = Math.min(parseInt(url.searchParams.get("pageSize") ?? "100"), 1000);

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const startedAt = Date.now();
  let inserted = 0;
  let pagesProcessed = 0;
  let totalDeclared = 0;
  let searchAfter: number[] | null = null;

  try {
    for (let p = 0; p < maxPaginas; p++) {
      const { hits, total } = await fetchDatajudPage(apiKey, searchAfter, pageSize);
      pagesProcessed++;
      if (p === 0) totalDeclared = total;
      if (hits.length === 0) break;

      const rows = hits.map(mapHit).filter((r) => r.numero_processo);
      // Dedup local por numero_processo — search_after por dataAjuizamento com timestamps duplicados
      // pode retornar o mesmo processo em batches diferentes ou repetido na mesma página
      const seen = new Set<string>();
      const deduped = rows.filter((r) => {
        if (seen.has(r.numero_processo)) return false;
        seen.add(r.numero_processo);
        return true;
      });

      if (deduped.length > 0) {
        const { error } = await sb
          .from("cnj_processos")
          .upsert(deduped, { onConflict: "numero_processo" });
        if (error) throw new Error(`Upsert: ${error.message}`);
        inserted += deduped.length;
      }

      // Cursor pra próxima página
      searchAfter = hits[hits.length - 1].sort ?? null;
      if (!searchAfter) break;
      if (hits.length < pageSize) break;

      await new Promise((r) => setTimeout(r, 300));
    }

    return new Response(
      JSON.stringify({
        ok: true,
        inserted,
        pagesProcessed,
        totalDeclared,
        elapsedMs: Date.now() - startedAt,
      }, null, 2),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, error: (e as Error).message, inserted, pagesProcessed }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

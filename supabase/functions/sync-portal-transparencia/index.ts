// Sync de dados federais via Portal da Transparência (CGU)
//   - Novo Bolsa Família (BF)
//   - BPC (Benefício de Prestação Continuada)
//   - Auxílio Brasil (histórico 2021-2022)
//   - Garantia-Safra
//
// Endpoint: api.portaldatransparencia.gov.br/api-de-dados/{recurso}-por-municipio?codigoIbge=5213806&mesAno=YYYYMM
// Auth: header `chave-api-dados: <PORTAL_TRANSPARENCIA_API_KEY>`
// Rate limit: 90 req/min (entre 6h-24h) ou 700 req/min (0h-6h)
//
// Idempotente: UNIQUE em (programa, competencia)
// Auth: x-cron-secret OU Bearer service_role

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const IBGE_MUN = "5213806";

function authorize(req: Request): boolean {
  const cronSecret = Deno.env.get("CRON_SECRET");
  const headerCron = req.headers.get("x-cron-secret");
  if (cronSecret && headerCron === cronSecret) return true;
  const auth = req.headers.get("authorization") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (serviceKey && auth === `Bearer ${serviceKey}`) return true;
  return false;
}

// Gera últimos N meses no formato YYYYMM (não inclui o mês corrente — dados têm delay)
function ultimosMeses(n: number): string[] {
  const meses: string[] = [];
  const hoje = new Date();
  for (let i = 1; i <= n; i++) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
    const ano = d.getFullYear();
    const mes = String(d.getMonth() + 1).padStart(2, "0");
    meses.push(`${ano}${mes}`);
  }
  return meses;
}

interface FonteTransparencia {
  endpoint: string;
  programa: string;
}

const FONTES: FonteTransparencia[] = [
  { endpoint: "novo-bolsa-familia-por-municipio", programa: "Novo Bolsa Família" },
  { endpoint: "bpc-por-municipio",                programa: "BPC" },
  // Histórico (antes do "Novo Bolsa Família" criado em 03/2023):
  { endpoint: "auxilio-brasil-por-municipio",     programa: "Auxílio Brasil" },
];

async function fetchPortal(endpoint: string, mesAno: string, apiKey: string): Promise<any[]> {
  const url = `https://api.portaldatransparencia.gov.br/api-de-dados/${endpoint}?codigoIbge=${IBGE_MUN}&mesAno=${mesAno}&pagina=1`;
  const r = await fetch(url, {
    headers: {
      "chave-api-dados": apiKey,
      "Accept": "application/json",
      "User-Agent": "MorrinhosBot/1.0 (https://morrinhos.ai)",
    },
  });
  if (!r.ok) {
    throw new Error(`PortalTransp ${endpoint} ${mesAno}: HTTP ${r.status}`);
  }
  return r.json();
}

async function syncFonte(
  sb: ReturnType<typeof createClient>,
  fonte: FonteTransparencia,
  meses: string[],
  apiKey: string,
): Promise<{ programa: string; inserted: number; skipped: number; meses_consultados: string[] }> {
  const rows: any[] = [];
  const mesesConsultados: string[] = [];
  let skipped = 0;

  for (const mes of meses) {
    try {
      const data = await fetchPortal(fonte.endpoint, mes, apiKey);
      mesesConsultados.push(mes);
      if (!Array.isArray(data) || data.length === 0) {
        skipped++;
        continue;
      }
      for (const item of data) {
        const dataRef = item.dataReferencia ?? `${mes.slice(0, 4)}-${mes.slice(4)}-01`;
        rows.push({
          municipio: "Morrinhos",
          programa: fonte.programa,
          competencia: dataRef.slice(0, 7), // YYYY-MM
          beneficiarios: item.quantidadeBeneficiados ?? null,
          valor_pago: item.valor ?? null,
          unidade_medida: "BRL",
          fonte_nome: "Portal da Transparência (CGU)",
          fonte_url: `https://portaldatransparencia.gov.br/beneficios/${fonte.endpoint}?codigoIbge=${IBGE_MUN}&mesAno=${mes}`,
          observacoes: item.tipo?.descricaoDetalhada ?? null,
        });
      }
      // Respeitar rate limit (90 req/min = 0.66s entre requests)
      await new Promise((res) => setTimeout(res, 700));
    } catch (e) {
      console.error(`Erro ${fonte.programa} ${mes}: ${(e as Error).message}`);
    }
  }

  if (rows.length > 0) {
    const { error } = await sb
      .from("beneficios_sociais")
      .upsert(rows, { onConflict: "programa,competencia" });
    if (error) throw new Error(`Upsert ${fonte.programa}: ${error.message}`);
  }

  return {
    programa: fonte.programa,
    inserted: rows.length,
    skipped,
    meses_consultados: mesesConsultados,
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

  const apiKey = Deno.env.get("PORTAL_TRANSPARENCIA_API_KEY");
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "PORTAL_TRANSPARENCIA_API_KEY não configurado" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const url = new URL(req.url);
  const mesesParam = parseInt(url.searchParams.get("meses") ?? "12");

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const meses = ultimosMeses(Math.min(mesesParam, 24));
  const startedAt = Date.now();
  const results = [];

  for (const fonte of FONTES) {
    try {
      const r = await syncFonte(sb, fonte, meses, apiKey);
      results.push({ ok: true, ...r });
    } catch (e) {
      results.push({ ok: false, programa: fonte.programa, error: (e as Error).message });
    }
  }

  return new Response(
    JSON.stringify(
      {
        ok: true,
        meses_solicitados: meses.length,
        results,
        elapsedMs: Date.now() - startedAt,
      },
      null,
      2,
    ),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});

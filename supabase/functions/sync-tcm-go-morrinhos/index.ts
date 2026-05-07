// TCM-GO via Apify Website Content Crawler — padrao ASYNC
//
// Por que async (e nao run-sync):
// - Edge function Supabase tem ~150s idle timeout no run-sync.
// - Crawler precisa de 5-10 min pra walk depth=2 a partir do mural+DOEl.
// - run-sync com timeout=140 deu TIMED-OUT consistente (so 5 paginas).
//
// Arquitetura (2 acoes):
// 1. POST /functions/v1/sync-tcm-go-morrinhos?action=trigger
//    -> POST /v2/acts/.../runs (sem run-sync) configurando webhook de callback
//    -> Salva runId em sync_log.detalhes, retorna em ~1s
//    -> Apify roda em background ate 10min, dispara webhook ao terminar
//
// 2. POST /functions/v1/sync-tcm-go-morrinhos?action=fetch (chamado pelo Apify)
//    -> Header x-tcm-secret valida origem do webhook
//    -> Le runId/datasetId/status do payload, baixa items do dataset
//    -> Filtra por Morrinhos, parseia, faz upsert em tcm_go_apontamentos
//    -> Atualiza sync_log com resultado
//
// Memoria: 2048MB (default actor e' 8192MB = pool inteiro do FREE tier).
// Webhook secret: env APIFY_WEBHOOK_SECRET (fallback service_role_key).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-tcm-secret",
};

const APIFY_BASE = "https://api.apify.com/v2";
const ACTOR_ID = "apify~website-content-crawler";

const START_URLS = [
  "https://www.tcm.go.gov.br/site/?p=mural-de-licitacoes",
  "https://www.tcm.go.gov.br/site/?p=diario-oficial-eletronico",
  "https://www.tcm.go.gov.br/site/?s=Morrinhos",
  "https://www.tcm.go.gov.br/cidadao/?s=Morrinhos",
  "https://www.tcm.go.gov.br/site/?p=consulta-de-decisoes",
];

interface DatasetItem {
  url: string;
  title?: string;
  text?: string;
  markdown?: string;
  metadata?: Record<string, unknown>;
}

function parseApontamento(item: DatasetItem) {
  const md = item.markdown ?? item.text ?? "";
  const tit = item.title ?? "";
  const fullText = `${tit}\n${md}`;

  const numMatch =
    fullText.match(/(?:processo|proc\.?\s*n[º°.]?)\s*[:\-]?\s*([\d./]{4,20})/i) ||
    fullText.match(/\b(\d{4,6}[\/.-]\d{2,4})\b/);
  const numero_processo = numMatch
    ? numMatch[1].replace(/\.+$/, "")
    : `tcm_apify_${Date.now()}_${item.url.slice(-12)}`;

  const anoMatch = fullText.match(/\b(20\d{2})\b/);
  const ano = anoMatch ? parseInt(anoMatch[1]) : null;

  const tipoMatch = fullText.match(
    /\b(ac[oó]rd[aã]o|parecer|decis[aã]o|notifica[çc][aã]o|inspe[çc][aã]o|relat[oó]rio|tomada\s+de\s+contas)\b/i,
  );
  const tipo = tipoMatch ? tipoMatch[1].toLowerCase() : null;

  const statusMatch = fullText.match(
    /\b(aprovad[oa]|reprovad[oa]|julgad[oa]\s+regular|julgad[oa]\s+irregular|pendente|em\s+an[áa]lise|arquivad[oa])\b/i,
  );
  const status = statusMatch ? statusMatch[1].toLowerCase() : null;

  const orgaoMatch = fullText.match(
    /\b(prefeitura|c[âa]mara|munic[íi]pio|secretaria|fundo)\s+(?:municipal\s+)?(?:de\s+)?morrinhos/i,
  );
  const orgao_alvo = orgaoMatch ? orgaoMatch[1].toLowerCase() : "prefeitura";

  const ementa = (
    md.split(/\n+/).find((l) => l.trim().length > 50) ??
    md.slice(0, 500)
  ).slice(0, 500);

  const valorMatch = fullText.match(/r\$\s*([\d.,]+)/i);
  const valor_envolvido = valorMatch
    ? parseFloat(valorMatch[1].replace(/\./g, "").replace(",", "."))
    : null;

  const dataMatch = fullText.match(/\b(\d{2})\/(\d{2})\/(\d{4})\b/);
  const data_publicacao = dataMatch
    ? `${dataMatch[3]}-${dataMatch[2]}-${dataMatch[1]}`
    : null;

  return {
    numero_processo,
    ano,
    orgao_alvo,
    tipo,
    status,
    ementa,
    data_publicacao,
    valor_envolvido,
    fonte_url: item.url,
  };
}

// ===== ACTION: trigger =====
async function actionTrigger(req: Request, sb: any, apifyToken: string) {
  const url = new URL(req.url);
  const maxPages = parseInt(url.searchParams.get("max") || "50");

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const webhookUrl = `${supabaseUrl}/functions/v1/sync-tcm-go-morrinhos?action=fetch`;
  const webhookSecret =
    Deno.env.get("APIFY_WEBHOOK_SECRET") ??
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const apifyInput = {
    startUrls: START_URLS.map((u) => ({ url: u })),
    crawlerType: "playwright:adaptive",
    maxCrawlDepth: 2,
    maxCrawlPages: maxPages,
    maxResults: maxPages,
    saveMarkdown: true,
    removeCookieWarnings: true,
    blockMedia: true,
    htmlTransformer: "readableText",
    proxyConfiguration: { useApifyProxy: true },
    requestTimeoutSecs: 30,
    maxRequestRetries: 2,
    saveContentTypes: "application/pdf",
    includeUrlGlobs: [
      "https://www.tcm.go.gov.br/**",
    ],
  };

  // Webhooks ad-hoc devem vir como query param ?webhooks=<URL-encoded base64 JSON>.
  // Pôr no body (apifyInput.webhooks) NAO funciona — a primeira tentativa retornou
  // run com webhooks: 0. Docs: https://docs.apify.com/api/v2/actor-runs-post
  const webhooksJson = JSON.stringify([{
    eventTypes: [
      "ACTOR.RUN.SUCCEEDED",
      "ACTOR.RUN.FAILED",
      "ACTOR.RUN.TIMED_OUT",
      "ACTOR.RUN.ABORTED",
    ],
    requestUrl: webhookUrl,
    headersTemplate: `{"x-tcm-secret": "${webhookSecret}", "Content-Type": "application/json"}`,
    // Apify default payload contem resource (com defaultDatasetId, status, id).
  }]);
  const webhooksB64 = btoa(webhooksJson);

  // Async kick-off: timeout=600s (10min) e' grace pro crawl, NAO bloqueia
  // a edge function pq usa /runs e nao /run-sync-get-dataset-items.
  // memory=2048 cabe no FREE pool de 8192MB.
  const apifyR = await fetch(
    `${APIFY_BASE}/acts/${ACTOR_ID}/runs?token=${apifyToken}&memory=2048&timeout=600&webhooks=${encodeURIComponent(webhooksB64)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(apifyInput),
    },
  );

  if (!apifyR.ok) {
    const txt = await apifyR.text();
    throw new Error(`Apify HTTP ${apifyR.status}: ${txt.slice(0, 300)}`);
  }
  const apifyJson = await apifyR.json();
  const runId = apifyJson?.data?.id;
  const datasetId = apifyJson?.data?.defaultDatasetId;

  const { data: log } = await sb.from("sync_log").insert({
    tipo: "tcm_go",
    status: "running",
    detalhes: {
      fonte: "apify-async",
      runId,
      datasetId,
      start_urls: START_URLS,
      maxPages,
    },
  }).select("id").single();

  return new Response(JSON.stringify({
    success: true,
    mode: "async",
    runId,
    datasetId,
    syncLogId: log?.id,
    message: "Run iniciada. Apify chamara webhook em 1-10min ao terminar.",
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ===== ACTION: fetch (chamado pelo webhook do Apify) =====
async function actionFetch(req: Request, sb: any, apifyToken: string) {
  // Auth via header — Apify nao manda Authorization, entao usamos custom header
  const expected =
    Deno.env.get("APIFY_WEBHOOK_SECRET") ??
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const incoming = req.headers.get("x-tcm-secret");
  if (incoming !== expected) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  // Apify default webhook payload: { userId, createdAt, eventType, eventData, resource }
  const resource = body?.resource ?? body;
  const runId = resource?.id ?? body?.runId;
  const status = resource?.status ?? body?.status;
  const datasetId = resource?.defaultDatasetId ?? body?.datasetId;

  if (!runId || !datasetId) {
    return new Response(JSON.stringify({
      error: "missing runId or datasetId",
      received: { runId, status, datasetId },
    }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Localiza sync_log dessa run
  const { data: log } = await sb.from("sync_log")
    .select("id, detalhes")
    .eq("tipo", "tcm_go")
    .filter("detalhes->>runId", "eq", runId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Run nao terminou bem — registra erro e sai
  if (status !== "SUCCEEDED") {
    if (log?.id) {
      await sb.from("sync_log").update({
        status: "error",
        detalhes: { ...log.detalhes, error: `run ${status}` },
        finished_at: new Date().toISOString(),
      }).eq("id", log.id);
    }
    return new Response(JSON.stringify({ success: false, runId, status }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Run SUCCEEDED — baixa dataset e processa
  const itemsR = await fetch(
    `${APIFY_BASE}/datasets/${datasetId}/items?token=${apifyToken}&format=json&clean=true&limit=1000`,
  );
  if (!itemsR.ok) {
    const txt = await itemsR.text();
    throw new Error(`Apify dataset HTTP ${itemsR.status}: ${txt.slice(0, 200)}`);
  }
  const items = (await itemsR.json()) as DatasetItem[];

  const relevantes = items.filter((it) => {
    const haystack = `${it.title ?? ""} ${it.text ?? ""} ${it.markdown ?? ""}`.toLowerCase();
    return haystack.includes("morrinhos");
  });

  const urls = relevantes.map((r) => r.url).filter(Boolean);
  let existingSet = new Set<string>();
  if (urls.length) {
    const { data: existing } = await sb
      .from("tcm_go_apontamentos")
      .select("fonte_url")
      .in("fonte_url", urls);
    existingSet = new Set((existing ?? []).map((r: any) => r.fonte_url));
  }
  const novas = relevantes.filter((r) => r.url && !existingSet.has(r.url));

  const upserted: string[] = [];
  for (const item of novas) {
    const row = parseApontamento(item);
    const { error } = await sb
      .from("tcm_go_apontamentos")
      .upsert(row, { onConflict: "numero_processo,data_publicacao" });
    if (!error) upserted.push(row.numero_processo);
  }

  const result = {
    crawled: items.length,
    relevantes_morrinhos: relevantes.length,
    novas: novas.length,
    upserted: upserted.length,
    sample: upserted.slice(0, 5),
  };

  if (log?.id) {
    await sb.from("sync_log").update({
      status: "success",
      detalhes: { ...log.detalhes, result },
      finished_at: new Date().toISOString(),
    }).eq("id", log.id);
  }

  return new Response(JSON.stringify({ success: true, runId, ...result }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  const action = url.searchParams.get("action") ?? "trigger";

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const apifyToken = Deno.env.get("APIFY_TOKEN");
  if (!apifyToken) {
    return new Response(JSON.stringify({ success: false, error: "APIFY_TOKEN missing" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    if (action === "trigger") return await actionTrigger(req, sb, apifyToken);
    if (action === "fetch") return await actionFetch(req, sb, apifyToken);
    return new Response(JSON.stringify({ error: `unknown action: ${action}` }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = (e as Error).message;
    return new Response(JSON.stringify({ success: false, action, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

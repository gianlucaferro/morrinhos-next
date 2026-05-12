import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BASE_URL = "https://morrinhos.centi.com.br";
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

interface ScrapedDiaria {
  data: string | null;
  servidor_nome: string;
  motivo: string | null;
  destino: string | null;
  valor: number | null;
}

function parseDiariasHtml(html: string): ScrapedDiaria[] {
  const diarias: ScrapedDiaria[] = [];
  const tbodyMatch = html.match(/<tbody>([\s\S]*?)<\/tbody>/);
  if (!tbodyMatch) return diarias;

  const rows = tbodyMatch[1].split("</tr>").filter(r => r.includes("<td"));
  for (const row of rows) {
    const cells: string[] = [];
    const cellPattern = /<td[^>]*>([\s\S]*?)<\/td>/g;
    let m;
    while ((m = cellPattern.exec(row)) !== null) {
      cells.push(m[1].replace(/<[^>]*>/g, "").trim());
    }
    // Columns: Data | Data Retorno | Credor | Objetivo | Destino | Quantidade | Valor total | Cargo
    if (cells.length >= 7) {
      const nome = cells[2];
      if (nome && nome.length > 2 && !nome.includes("Nenhum resultado")) {
        diarias.push({
          data: parseDateBR(cells[0]),
          servidor_nome: nome,
          motivo: cells[3] || null,
          destino: cells[4] || null,
          valor: parseBRL(cells[6]),
        });
      }
    }
  }
  return diarias;
}

// Orgãos do Centi: Prefeitura e fundos
const ORGAOS = [
  { id: 22, nome: "PODER EXECUTIVO" },
  { id: 55, nome: "FUNDO EDUCAÇÃO" },
  { id: 67, nome: "FUNDO SAÚDE" },
  { id: 66, nome: "FUNDO ASSISTÊNCIA SOCIAL" },
];

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

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: log } = await sb.from("sync_log")
    .insert({ tipo: "diarias", status: "running", detalhes: {} })
    .select("id").single();
  const logId = log?.id;

  const errors: string[] = [];
  let newCount = 0;
  const reqUrl = new URL(req.url);
  const anoParam = reqUrl.searchParams.get("ano");
  const anos = anoParam ? [parseInt(anoParam)] : [2026, 2025];

  try {
    for (const ano of anos) {
      for (const orgao of ORGAOS) {
        try {
          const url = `${BASE_URL}/despesas/diarias?ano=${ano}&idorgao=${orgao.id}`;
          const resp = await fetch(url, { headers: { "User-Agent": UA } });
          if (!resp.ok) continue;

          const html = await resp.text();
          const scraped = parseDiariasHtml(html);
          console.log(`Diárias ${ano}/orgao${orgao.id}: ${scraped.length}`);

          if (scraped.length === 0) continue;

          // Check existing to avoid duplicates
          const { data: existing } = await sb.from("diarias")
            .select("servidor_nome, data, valor")
            .gte("data", `${ano}-01-01`)
            .lte("data", `${ano}-12-31`);

          const existingKeys = new Set(
            (existing || []).map(e => `${e.servidor_nome}|${e.data}|${e.valor}`)
          );

          const toInsert = scraped
            .filter(d => !existingKeys.has(`${d.servidor_nome}|${d.data}|${d.valor}`))
            .map(d => ({
              servidor_nome: d.servidor_nome,
              data: d.data,
              motivo: d.motivo,
              destino: d.destino,
              valor: d.valor,
              fonte_url: `${BASE_URL}/despesas/diarias`,
            }));

          if (toInsert.length > 0) {
            const { error } = await sb.from("diarias").insert(toInsert);
            if (error) errors.push(`Insert diárias ${ano}/orgao${orgao.id}: ${error.message}`);
            else newCount += toInsert.length;
          }
        } catch (e) {
          errors.push(`Diárias ${ano}/orgao${orgao.id}: ${e.message}`);
        }
      }
    }

    const result = { new: newCount, errors: errors.slice(0, 10) };
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

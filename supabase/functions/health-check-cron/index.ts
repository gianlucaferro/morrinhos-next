// Health-check diário: verifica freshness das tabelas-chave e alerta Telegram se houver atraso.
// Resposta direta ao Codex Q12.
//
// Rodar diariamente às 12:00 UTC (09:00 BRT) — depois dos crons matinais.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

interface HealthCheck {
  tabela: string;
  coluna_data: string;
  max_idade_dias: number;
  criticidade: "alta" | "media" | "baixa";
}

const CHECKS: HealthCheck[] = [
  { tabela: "noticias",            coluna_data: "data_publicacao", max_idade_dias: 7,   criticidade: "alta" },
  { tabela: "prefeitura_noticias", coluna_data: "data_publicacao", max_idade_dias: 7,   criticidade: "alta" },
  { tabela: "leis_municipais",     coluna_data: "data_publicacao", max_idade_dias: 60,  criticidade: "media" },
  { tabela: "decretos",            coluna_data: "data_publicacao", max_idade_dias: 30,  criticidade: "alta" },
  { tabela: "portarias",           coluna_data: "data_publicacao", max_idade_dias: 30,  criticidade: "alta" },
  { tabela: "obras",               coluna_data: "data_inicio",     max_idade_dias: 180, criticidade: "media" },
  { tabela: "relatorios_fiscais",  coluna_data: "data_publicacao", max_idade_dias: 120, criticidade: "media" },
  { tabela: "camara_atos",         coluna_data: "data_publicacao", max_idade_dias: 30,  criticidade: "media" },
  { tabela: "projetos",            coluna_data: "data",            max_idade_dias: 30,  criticidade: "media" },
  { tabela: "diarias",             coluna_data: "data",            max_idade_dias: 30,  criticidade: "media" },
  { tabela: "despesas",            coluna_data: "data",            max_idade_dias: 30,  criticidade: "media" },
];

function authorize(req: Request): boolean {
  const cronSecret = Deno.env.get("CRON_SECRET");
  const headerCron = req.headers.get("x-cron-secret");
  if (cronSecret && headerCron === cronSecret) return true;
  const auth = req.headers.get("authorization") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (serviceKey && auth === `Bearer ${serviceKey}`) return true;
  return false;
}

async function sendTelegram(message: string): Promise<void> {
  const token = Deno.env.get("TELEGRAM_BOT_TOKEN");
  const chatId = Deno.env.get("TELEGRAM_CHAT_ID");
  if (!token || !chatId) {
    console.warn("Telegram não configurado — pulando alerta");
    return;
  }
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "Markdown",
        disable_web_page_preview: true,
      }),
    });
  } catch (e) {
    console.error("Falha telegram:", (e as Error).message);
  }
}

interface CheckResult {
  tabela: string;
  status: "ok" | "stale" | "empty";
  ultimo_registro: string | null;
  idade_dias: number | null;
  limite_dias: number;
  criticidade: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  if (!authorize(req)) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const results: CheckResult[] = [];
  const problemas: CheckResult[] = [];

  for (const c of CHECKS) {
    try {
      const { data, error } = await sb
        .from(c.tabela)
        .select(c.coluna_data)
        .order(c.coluna_data, { ascending: false, nullsFirst: false })
        .limit(1);

      if (error) {
        results.push({
          tabela: c.tabela,
          status: "stale",
          ultimo_registro: null,
          idade_dias: null,
          limite_dias: c.max_idade_dias,
          criticidade: c.criticidade,
        });
        continue;
      }

      const row = (data ?? [])[0];
      if (!row) {
        const r: CheckResult = {
          tabela: c.tabela,
          status: "empty",
          ultimo_registro: null,
          idade_dias: null,
          limite_dias: c.max_idade_dias,
          criticidade: c.criticidade,
        };
        results.push(r);
        if (c.criticidade === "alta") problemas.push(r);
        continue;
      }

      const ultimaData = row[c.coluna_data] as string;
      const idadeDias = Math.floor(
        (Date.now() - new Date(ultimaData).getTime()) / (1000 * 60 * 60 * 24),
      );
      const status = idadeDias > c.max_idade_dias ? "stale" : "ok";
      const r: CheckResult = {
        tabela: c.tabela,
        status,
        ultimo_registro: ultimaData,
        idade_dias: idadeDias,
        limite_dias: c.max_idade_dias,
        criticidade: c.criticidade,
      };
      results.push(r);
      if (status === "stale") problemas.push(r);
    } catch (e) {
      console.error(`Erro check ${c.tabela}:`, (e as Error).message);
    }
  }

  // Log do health-check
  await sb.from("sync_log").insert({
    tipo: "health_check",
    status: problemas.length === 0 ? "success" : "warning",
    detalhes: { total_checks: results.length, problemas: problemas.length, problemas_detalhe: problemas },
  });

  // Alerta Telegram se houver problemas críticos
  const criticos = problemas.filter((p) => p.criticidade === "alta");
  if (criticos.length > 0) {
    const lines = criticos.map(
      (p) =>
        `• *${p.tabela}*: ${p.status === "empty" ? "VAZIA" : `${p.idade_dias}d sem atualizar (limite ${p.limite_dias}d)`}`,
    );
    await sendTelegram(
      `⚠️ *Morrinhos.Ai — Health Check*\n\nProblemas detectados em ${criticos.length} tabela(s) crítica(s):\n\n${lines.join("\n")}\n\nVer: https://supabase.com/dashboard/project/pgqztmtimakiikcsvfph/database/tables`,
    );
  }

  return new Response(
    JSON.stringify(
      {
        ok: true,
        total_checks: results.length,
        problemas: problemas.length,
        criticos: criticos.length,
        results,
      },
      null,
      2,
    ),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});

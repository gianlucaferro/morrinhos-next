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

interface ScrapedDespesa {
  data: string;
  favorecido: string;
  valor: number;
  descricao: string | null;
}

function parseDespesasHtml(html: string): ScrapedDespesa[] {
  const despesas: ScrapedDespesa[] = [];
  const tbodyMatch = html.match(/<tbody>([\s\S]*?)<\/tbody>/);
  if (!tbodyMatch) return despesas;

  const rows = tbodyMatch[1].split("</tr>").filter(r => r.includes("<td"));
  for (const row of rows) {
    const cells: string[] = [];
    const cellPattern = /<td[^>]*>([\s\S]*?)<\/td>/g;
    let m;
    while ((m = cellPattern.exec(row)) !== null) {
      cells.push(m[1].replace(/<[^>]*>/g, "").trim());
    }
    // Columns: Nr | Data | Credor | Valor | Anulação | Valor Liquidado | Valor Pago | Saldo
    if (cells.length >= 4) {
      const data = parseDateBR(cells[1]);
      const favorecido = cells[2];
      const valor = parseBRL(cells[3]);
      if (data && favorecido && favorecido.length > 2 && valor !== null && !favorecido.includes("Nenhum resultado")) {
        despesas.push({ data, favorecido, valor, descricao: null });
      }
    }
  }
  return despesas;
}

const ORGAOS = [22, 55, 67, 66];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: log } = await sb.from("sync_log")
    .insert({ tipo: "camara-despesas", status: "running", detalhes: {} })
    .select("id").single();
  const logId = log?.id;

  const errors: string[] = [];
  let newCount = 0;
  const reqUrl = new URL(req.url);
  const anoParam = reqUrl.searchParams.get("ano");
  const mesParam = reqUrl.searchParams.get("mes");

  // Default: current month
  const now = new Date();
  const ano = anoParam ? parseInt(anoParam) : now.getFullYear();
  const mesInicio = mesParam ? parseInt(mesParam) : 1;
  const mesFim = mesParam ? parseInt(mesParam) : now.getMonth() + 1;

  try {
    for (const orgao of ORGAOS) {
      for (let mes = mesInicio; mes <= mesFim; mes++) {
        try {
          const dataInicio = `01/${String(mes).padStart(2, "0")}/${ano}`;
          const lastDay = new Date(ano, mes, 0).getDate();
          const dataFim = `${lastDay}/${String(mes).padStart(2, "0")}/${ano}`;

          const body = new URLSearchParams({
            idorgao: String(orgao),
            datainicio: dataInicio,
            datafim: dataFim,
            ano: String(ano),
            pagina: "1",
            itensporpagina: "500",
          });

          const resp = await fetch(`${BASE_URL}/despesas/orgao`, {
            method: "POST",
            headers: {
              "User-Agent": UA,
              "Content-Type": "application/x-www-form-urlencoded",
              "X-Requested-With": "XMLHttpRequest",
            },
            body: body.toString(),
          });

          if (!resp.ok) continue;

          const html = await resp.text();
          const scraped = parseDespesasHtml(html);
          if (scraped.length > 0) {
            console.log(`Despesas ${ano}/${mes}/orgao${orgao}: ${scraped.length}`);
          }

          if (scraped.length === 0) continue;

          // Check existing
          const mesStr = `${ano}-${String(mes).padStart(2, "0")}`;
          const { data: existing } = await sb.from("camara_despesas")
            .select("credor, data_pagamento, valor")
            .gte("data_pagamento", `${mesStr}-01`)
            .lte("data_pagamento", `${mesStr}-31`);

          const existingKeys = new Set(
            (existing || []).map(e => `${e.credor}|${e.data_pagamento}|${e.valor}`)
          );

          const toInsert = scraped
            .filter(d => !existingKeys.has(`${d.favorecido}|${d.data}|${d.valor}`))
            .map(d => ({
              ano,
              mes,
              credor: d.favorecido,
              data_pagamento: d.data,
              valor: d.valor,
              descricao: d.descricao,
              fonte_url: `${BASE_URL}/despesas/orgao`,
            }));

          if (toInsert.length > 0) {
            const { error } = await sb.from("camara_despesas").insert(toInsert);
            if (error) errors.push(`Insert despesas orgao${orgao}/${mes}: ${error.message}`);
            else newCount += toInsert.length;
          }
        } catch (e) {
          errors.push(`Despesas orgao${orgao}/${mes}: ${e.message}`);
        }
      }
    }

    const result = { new: newCount, ano, errors: errors.slice(0, 10) };
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

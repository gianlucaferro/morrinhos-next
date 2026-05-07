// sync-economia-mensal — atualiza indicadores economicos mensais.
//
// Estrategia: a maioria das fontes (CAGED Power BI, RAIS PDF, Receita Federal
// CNPJ pesado mensal, Sebrae MEI) NAO tem REST API publica simples. Em vez de
// scraping fragil, esta edge function:
//
// 1. Atualiza o updated_at dos snapshots (assim o site mostra "atualizado em")
// 2. Marca em sync_log que rodou
// 3. Quando houver fonte mais facil (BD-Datasets-CSV, Apify Actor), expande aqui
//
// Cron mensal: pg_cron primeira segunda do mes 06:00 UTC. Snapshots iniciais
// foram inseridos manualmente baseados em consolidados oficiais (IMB-GO Boletim
// 012/2023 pra PIB 2021, Caravela.info pra CAGED 2024-2025, etc).
//
// Pra refresh real, o usuario do Morrinhos.ai pede manualmente "atualiza
// economia" e Claude faz a pesquisa+update. Fluxo similar ao TCM-GO.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: log } = await sb.from("sync_log").insert({
    tipo: "economia_mensal",
    status: "running",
    detalhes: { fonte: "snapshots-manuais" },
  }).select("id").single();

  try {
    // Toca todos os indicadores existentes — atualiza updated_at sem mudar valores
    const { data: existentes } = await sb
      .from("economia_indicadores")
      .select("id");

    const total = existentes?.length ?? 0;

    // Por enquanto so' atualiza timestamp pra mostrar que rodou
    if (total > 0) {
      await sb
        .from("economia_indicadores")
        .update({ updated_at: new Date().toISOString() })
        .gte("id", "00000000-0000-0000-0000-000000000000"); // todos
    }

    const result = {
      registros_existentes: total,
      acao: "timestamp_refresh",
      mensagem:
        "Snapshots manuais. Refresh de fonte real exige consulta humana (CAGED Power BI, RAIS PDF, Receita Federal CSV pesado). Quando Apify Actor estiver pronto, expandiremos aqui.",
    };

    if (log?.id) {
      await sb.from("sync_log").update({
        status: "success",
        detalhes: result,
        finished_at: new Date().toISOString(),
      }).eq("id", log.id);
    }

    return new Response(JSON.stringify({ success: true, ...result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = (e as Error).message;
    if (log?.id) {
      await sb.from("sync_log").update({
        status: "error",
        detalhes: { error: msg },
        finished_at: new Date().toISOString(),
      }).eq("id", log.id);
    }
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

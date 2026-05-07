// INEP — escolas de Morrinhos via API QEdu/dadosabertos.mec.gov.br
// QEdu publica detalhes do Censo Escolar em JSON estruturado
// IBGE Morrinhos: codigo 5217203
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const COD_IBGE = "5217203"; // Morrinhos-GO

// QEdu fornece API publica via JSON path; fallback ao endpoint de microdados
const QEDU_BASE = "https://academia.qedu.org.br/dados/api/v1";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const url = new URL(req.url);
  const dryRun = url.searchParams.get("dry_run") === "1";
  const ano = parseInt(url.searchParams.get("ano") || String(new Date().getFullYear() - 1));

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: log } = await sb.from("sync_log")
    .insert({ tipo: "inep_escolas", status: "running", detalhes: { ibge: COD_IBGE, ano } })
    .select("id").single();

  try {
    // Endpoint do QEdu: lista de escolas por municipio
    const u = `${QEDU_BASE}/escolas?cidade=${COD_IBGE}&ano=${ano}`;
    const r = await fetch(u, {
      headers: { "Accept": "application/json", "User-Agent": "Morrinhos.ai/1.0" },
    });
    if (!r.ok) throw new Error(`QEdu HTTP ${r.status} - tente censo escolar via INEP direto`);
    const data = await r.json() as { escolas?: any[] };
    const escolas = data.escolas ?? [];

    let upserted = 0;
    for (const e of escolas) {
      if (!e.cod_inep && !e.codigo_inep) continue;
      const row = {
        ano_censo: ano,
        codigo_inep: String(e.cod_inep || e.codigo_inep),
        nome: e.nome ?? null,
        rede: (e.rede || "").toLowerCase().includes("municipal") ? "municipal" :
              (e.rede || "").toLowerCase().includes("estadual") ? "estadual" :
              (e.rede || "").toLowerCase().includes("federal") ? "federal" : "privada",
        zona: (e.zona || "").toLowerCase().includes("rural") ? "rural" : "urbana",
        matriculas_total: e.matriculas_total ?? e.matriculas ?? null,
        matriculas_creche: e.matriculas_creche ?? null,
        matriculas_pre_escola: e.matriculas_pre_escola ?? null,
        matriculas_fundamental: e.matriculas_fundamental ?? null,
        matriculas_medio: e.matriculas_medio ?? null,
        professores: e.professores ?? null,
        funcionarios: e.funcionarios ?? null,
        tem_biblioteca: e.tem_biblioteca ?? null,
        tem_laboratorio_informatica: e.tem_laboratorio_informatica ?? null,
        tem_laboratorio_ciencias: e.tem_laboratorio_ciencias ?? null,
        tem_quadra_esportes: e.tem_quadra_esportes ?? null,
        tem_acessibilidade_rampa: e.tem_acessibilidade_rampa ?? null,
        tem_alimentacao: e.tem_alimentacao ?? null,
        tem_internet: e.tem_internet ?? null,
        raw_json: e,
      };
      if (dryRun) { upserted++; continue; }
      const { error } = await sb.from("inep_escolas_detalhe").upsert(row, { onConflict: "ano_censo,codigo_inep" });
      if (!error) upserted++;
    }

    const result = { fetched: escolas.length, upserted, ano };
    if (log?.id) await sb.from("sync_log").update({ status: "success", detalhes: result, finished_at: new Date().toISOString() }).eq("id", log.id);
    return new Response(JSON.stringify({ success: true, dry_run: dryRun, ...result }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    const msg = (e as Error).message;
    if (log?.id) await sb.from("sync_log").update({ status: "error", detalhes: { error: msg }, finished_at: new Date().toISOString() }).eq("id", log.id);
    return new Response(JSON.stringify({ success: false, error: msg }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

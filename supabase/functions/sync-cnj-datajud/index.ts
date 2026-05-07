// CNJ DataJud: processos com Prefeitura/Camara de Morrinhos como parte
// Docs: https://datajud-wiki.cnj.jus.br/api-publica/
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// API publica DataJud — TJ-GO endpoint
const DATAJUD_URL = "https://api-publica.datajud.cnj.jus.br/api_publica_tjgo/_search";
// Token publico documentado pelo CNJ
const DATAJUD_TOKEN = "ApiKey cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw==";

const PARTES_BUSCA = [
  "MUNICIPIO DE MORRINHOS",
  "PREFEITURA MUNICIPAL DE MORRINHOS",
  "CAMARA MUNICIPAL DE MORRINHOS",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const url = new URL(req.url);
  const dryRun = url.searchParams.get("dry_run") === "1";
  const size = parseInt(url.searchParams.get("size") || "50");

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: log } = await sb.from("sync_log")
    .insert({ tipo: "cnj_datajud", status: "running", detalhes: { partes: PARTES_BUSCA, size } })
    .select("id").single();

  try {
    let totalUpserted = 0;
    for (const parteNome of PARTES_BUSCA) {
      const body = {
        size,
        sort: [{ "@timestamp": { order: "desc" } }],
        query: {
          bool: {
            should: [
              { match_phrase: { "partes.nome": parteNome } },
              { match_phrase: { "partes.poloAtivo.nome": parteNome } },
              { match_phrase: { "partes.poloPassivo.nome": parteNome } },
            ],
            minimum_should_match: 1,
          },
        },
      };
      const r = await fetch(DATAJUD_URL, {
        method: "POST",
        headers: {
          "Authorization": DATAJUD_TOKEN,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      if (!r.ok) continue;
      const json = await r.json();
      const hits = json?.hits?.hits ?? [];

      for (const h of hits) {
        const src = h._source ?? {};
        const numero = src.numeroProcesso || h._id;
        if (!numero) continue;

        const row = {
          numero_processo: String(numero),
          classe: src.classe?.nome ?? null,
          assunto: Array.isArray(src.assuntos) ? src.assuntos[0]?.nome : null,
          orgao_julgador: src.orgaoJulgador?.nome ?? null,
          data_ajuizamento: src.dataAjuizamento ? src.dataAjuizamento.slice(0, 10) : null,
          data_ultimo_movimento: src["@timestamp"] ?? null,
          ultimo_movimento: Array.isArray(src.movimentos) ? src.movimentos[src.movimentos.length - 1]?.nome : null,
          partes_polo_ativo: Array.isArray(src.partes?.poloAtivo) ? src.partes.poloAtivo.map((p: any) => p.nome) : null,
          partes_polo_passivo: Array.isArray(src.partes?.poloPassivo) ? src.partes.poloPassivo.map((p: any) => p.nome) : null,
          fonte: "datajud",
          raw_json: src,
        };

        if (dryRun) { totalUpserted++; continue; }
        const { error } = await sb.from("cnj_processos").upsert(row, { onConflict: "numero_processo" });
        if (!error) totalUpserted++;
      }
    }

    const result = { upserted: totalUpserted };
    if (log?.id) await sb.from("sync_log").update({ status: "success", detalhes: result, finished_at: new Date().toISOString() }).eq("id", log.id);
    return new Response(JSON.stringify({ success: true, dry_run: dryRun, ...result }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    const msg = (e as Error).message;
    if (log?.id) await sb.from("sync_log").update({ status: "error", detalhes: { error: msg }, finished_at: new Date().toISOString() }).eq("id", log.id);
    return new Response(JSON.stringify({ success: false, error: msg }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

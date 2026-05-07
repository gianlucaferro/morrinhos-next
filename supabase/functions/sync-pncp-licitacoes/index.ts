// PNCP — Portal Nacional de Contratacoes Publicas: licitacoes envolvendo Morrinhos
// Docs: https://pncp.gov.br/api/consulta/swagger-ui/index.html
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PNCP_BASE = "https://pncp.gov.br/api/consulta/v1";
const COD_IBGE = "5217203"; // Morrinhos-GO
const UF = "GO";

function fmt(d: Date): string {
  return d.toISOString().slice(0, 10).replace(/-/g, "");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const url = new URL(req.url);
  const dryRun = url.searchParams.get("dry_run") === "1";
  const days = parseInt(url.searchParams.get("days") || "30");

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: log } = await sb.from("sync_log")
    .insert({ tipo: "pncp_licitacoes", status: "running", detalhes: { uf: UF, ibge: COD_IBGE, days } })
    .select("id").single();

  try {
    const end = new Date();
    const start = new Date(end.getTime() - days * 86400000);
    const dataIni = fmt(start);
    const dataFim = fmt(end);

    // Codigo modalidade 6 = Pregao Eletronico (mais comum); pode iterar varios depois
    const u = `${PNCP_BASE}/contratacoes/publicacao?dataInicial=${dataIni}&dataFinal=${dataFim}&codigoModalidadeContratacao=6&uf=${UF}&pagina=1&tamanhoPagina=50`;
    const r = await fetch(u, { headers: { "Accept": "application/json" } });
    if (!r.ok) throw new Error(`PNCP HTTP ${r.status}`);
    const json = await r.json();
    const items = (json.data ?? []) as any[];

    let upserted = 0;
    let filtered = 0;
    for (const it of items) {
      // Filtrar para licitacoes que afetam Morrinhos: orgao com IBGE codigo OU local execucao
      const orgaoMun = it.orgaoEntidade?.codigoMunicipioIbge;
      const unidadeMun = it.unidadeOrgao?.codigoMunicipioIbge;
      const localMun = it.localExecucao?.codigoMunicipioIbge;
      const matches = [orgaoMun, unidadeMun, localMun].some(c => String(c) === COD_IBGE);
      if (!matches) continue;
      filtered++;

      const numero = it.numeroControlePNCP;
      if (!numero) continue;

      const row = {
        numero_controle_pncp: String(numero),
        modalidade: it.modalidadeNome ?? null,
        orgao: it.orgaoEntidade?.razaoSocial ?? null,
        unidade_compradora: it.unidadeOrgao?.nomeUnidade ?? null,
        objeto: it.objetoCompra ?? null,
        valor_estimado: it.valorTotalEstimado ?? null,
        data_publicacao: it.dataPublicacaoPncp ? it.dataPublicacaoPncp.slice(0, 10) : null,
        data_abertura: it.dataAberturaProposta ?? null,
        status: it.situacaoCompraNome ?? null,
        uf: UF,
        municipio: "Morrinhos",
        fonte_url: `https://pncp.gov.br/app/editais/${encodeURIComponent(numero)}`,
        raw_json: it,
      };
      if (dryRun) { upserted++; continue; }
      const { error } = await sb.from("pncp_licitacoes").upsert(row, { onConflict: "numero_controle_pncp" });
      if (!error) upserted++;
    }

    const result = { fetched: items.length, filtered_municipio: filtered, upserted };
    if (log?.id) await sb.from("sync_log").update({ status: "success", detalhes: result, finished_at: new Date().toISOString() }).eq("id", log.id);
    return new Response(JSON.stringify({ success: true, dry_run: dryRun, ...result }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    const msg = (e as Error).message;
    if (log?.id) await sb.from("sync_log").update({ status: "error", detalhes: { error: msg }, finished_at: new Date().toISOString() }).eq("id", log.id);
    return new Response(JSON.stringify({ success: false, error: msg }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

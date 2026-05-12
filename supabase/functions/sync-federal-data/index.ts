// Sincroniza dados federais sobre Morrinhos-GO (IBGE 5213806):
//   - IBGE SIDRA: PIB, população, valor adicionado bruto
//   - PNCP: contratos da Prefeitura (cnpjOrgao=01789551000149)
//
// Endpoints públicos sem auth.
//
// Idempotente: usa chave estável (PNCP: numero_controle_pncp; IBGE: chave_indicador-ano).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const IBGE_MUN = "5213806"; // Morrinhos-GO
const CNPJ_PREFEITURA = "01789551000149";

// ============= IBGE SIDRA =============
// Agregados: 5938=PIB, 6579=População estimada, 4709=Censo Demográfico
const IBGE_INDICADORES = [
  // PIB Municipal (agregado 5938) — variáveis: 37 PIB total, 498 VAB total, 513 VAB agro
  { agregado: 5938, periodos: ["2021"], variaveis: "37|498|513|517|6575", localidade: IBGE_MUN, categoria: "PIB" },
  // População estimada (agregado 6579, variável 9324) — anos recentes
  { agregado: 6579, periodos: ["2024"], variaveis: "9324", localidade: IBGE_MUN, categoria: "População" },
  { agregado: 6579, periodos: ["2023"], variaveis: "9324", localidade: IBGE_MUN, categoria: "População" },
  { agregado: 6579, periodos: ["2022"], variaveis: "9324", localidade: IBGE_MUN, categoria: "População" },
];

async function fetchIbgeAgregado(agregado: number, periodo: string, variaveis: string, localidade: string) {
  const url = `https://servicodados.ibge.gov.br/api/v3/agregados/${agregado}/periodos/${periodo}/variaveis/${encodeURIComponent(variaveis)}?localidades=N6%5B${localidade}%5D`;
  const r = await fetch(url, {
    headers: { "Accept": "application/json", "User-Agent": "Mozilla/5.0 (compatible; MorrinhosBot/1.0)" },
  });
  if (!r.ok) throw new Error(`IBGE ${agregado}/${periodo} HTTP ${r.status}`);
  return r.json();
}

async function syncIbge(sb: ReturnType<typeof createClient>) {
  let inserted = 0;
  const rows: any[] = [];

  for (const cfg of IBGE_INDICADORES) {
    for (const periodo of cfg.periodos) {
      try {
        const data = await fetchIbgeAgregado(cfg.agregado, periodo, cfg.variaveis, cfg.localidade);
        // data é array de variáveis
        for (const variavel of data) {
          const varId = variavel.id;
          const indicador = variavel.variavel;
          const unidade = variavel.unidade;
          for (const result of (variavel.resultados ?? [])) {
            for (const serie of (result.series ?? [])) {
              for (const [ano, valorRaw] of Object.entries(serie.serie ?? {})) {
                const valor = valorRaw === "..." || valorRaw === "-" || valorRaw === "X" ? null : parseFloat(`${valorRaw}`);
                if (valor === null || isNaN(valor)) continue;
                rows.push({
                  categoria: cfg.categoria,
                  indicador,
                  ano: parseInt(ano),
                  valor,
                  unidade,
                  municipio_ibge: parseInt(IBGE_MUN),
                  fonte: "IBGE",
                  fonte_url: `https://sidra.ibge.gov.br/tabela/${cfg.agregado}`,
                  observacao: `Variável IBGE ${varId}`,
                });
              }
            }
          }
        }
      } catch (e) {
        console.error(`IBGE ${cfg.agregado}/${periodo}: ${(e as Error).message}`);
      }
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  // Upsert: deletar existentes do mesmo município + recriar (não há UNIQUE em economia_indicadores)
  if (rows.length > 0) {
    // Estratégia: delete + insert pra evitar duplicates
    await sb.from("economia_indicadores")
      .delete()
      .eq("municipio_ibge", parseInt(IBGE_MUN))
      .in("categoria", ["PIB", "População"]);

    const { error } = await sb.from("economia_indicadores").insert(rows);
    if (error) throw new Error(`IBGE insert: ${error.message}`);
    inserted = rows.length;
  }

  return { ibge_inserted: inserted };
}

// ============= PNCP =============
function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10).replace(/-/g, "");
}

async function fetchPncp(url: string) {
  const r = await fetch(url, {
    headers: { "Accept": "application/json", "User-Agent": "Mozilla/5.0 (compatible; MorrinhosBot/1.0)" },
  });
  if (!r.ok) throw new Error(`PNCP HTTP ${r.status}: ${await r.text().then((t) => t.slice(0, 200))}`);
  return r.json();
}

async function syncPncpContratos(sb: ReturnType<typeof createClient>) {
  // Buscar contratos da Prefeitura nos últimos 12 meses
  const end = new Date();
  const start = new Date(end.getTime() - 365 * 86400000);
  const dataIni = fmtDate(start);
  const dataFim = fmtDate(end);

  let inserted = 0;
  let pagina = 1;
  const tamanhoPagina = 50;
  let totalPaginas = 1;

  do {
    const url = `https://pncp.gov.br/api/consulta/v1/contratos?dataInicial=${dataIni}&dataFinal=${dataFim}&cnpjOrgao=${CNPJ_PREFEITURA}&pagina=${pagina}&tamanhoPagina=${tamanhoPagina}`;
    const d = await fetchPncp(url);
    totalPaginas = d.totalPaginas ?? 1;
    const items = (d.data ?? []) as any[];

    const rows = items.map((r) => ({
      numero_controle_pncp: String(r.numeroControlePNCP || r.numeroControlePncpCompra || ""),
      modalidade: r.tipoContrato?.nome ?? null,
      orgao: r.orgaoEntidade?.razaoSocial ?? null,
      unidade_compradora: r.unidadeOrgao?.nomeUnidade ?? null,
      objeto: r.objetoContrato ?? null,
      valor_estimado: r.valorGlobal ?? r.valorInicial ?? null,
      data_publicacao: r.dataPublicacaoPncp ? r.dataPublicacaoPncp.slice(0, 10) : null,
      data_abertura: r.dataAssinatura ?? null,
      status: r.tipoContrato?.nome ?? "Contrato",
      uf: "GO",
      municipio: "Morrinhos",
      fonte_url: `https://pncp.gov.br/app/contratos/${encodeURIComponent(r.numeroControlePNCP || "")}`,
      raw_json: r,
    })).filter((r) => r.numero_controle_pncp);

    if (rows.length > 0) {
      const { error } = await sb.from("pncp_licitacoes").upsert(rows, { onConflict: "numero_controle_pncp" });
      if (error) throw new Error(`PNCP upsert: ${error.message}`);
      inserted += rows.length;
    }

    pagina++;
    await new Promise((r) => setTimeout(r, 300));
  } while (pagina <= totalPaginas && pagina <= 10); // cap em 10 páginas = 500 contratos

  return { pncp_inserted: inserted, pncp_paginas: pagina - 1, pncp_total_paginas: totalPaginas };
}

// ============= Handler =============
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  const target = url.searchParams.get("target") ?? "all";

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const results: Record<string, unknown> = {};

  try {
    if (target === "all" || target === "ibge") {
      try {
        results.ibge = await syncIbge(sb);
      } catch (e) {
        results.ibge_error = (e as Error).message;
      }
    }
    if (target === "all" || target === "pncp") {
      try {
        results.pncp = await syncPncpContratos(sb);
      } catch (e) {
        results.pncp_error = (e as Error).message;
      }
    }
    return new Response(JSON.stringify({ ok: true, ...results }, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

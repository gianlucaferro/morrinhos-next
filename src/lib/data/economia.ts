import "server-only";
import { unstable_cache } from "next/cache";
import { createPublicSupabaseClient } from "@/lib/supabase/public";

export type EconomiaIndicador = {
  id: string;
  categoria: string;
  indicador: string;
  setor: string | null;
  ano: number | null;
  mes: number | null;
  municipio_ibge: number | null;
  valor: number | null;
  valor_texto: string | null;
  fonte: string | null;
  fonte_url: string | null;
  observacao: string | null;
  updated_at: string;
};

/**
 * Todos os indicadores economicos. Uma unica query, filtragem em memoria.
 * Tabela e' pequena (<200 rows), sem necessidade de queries especificas.
 */
export const fetchEconomiaIndicadores = unstable_cache(
  async (): Promise<EconomiaIndicador[]> => {
    const supabase = createPublicSupabaseClient();
    const { data, error } = await supabase
      .from("economia_indicadores")
      .select("*")
      .order("ano", { ascending: false });
    if (error) {
      console.error("fetchEconomiaIndicadores error:", error);
      return [];
    }
    return ((data ?? []) as EconomiaIndicador[]).map((r) => ({
      ...r,
      valor: r.valor !== null ? Number(r.valor) : null,
    }));
  },
  ["economia-indicadores"],
  { revalidate: 3600, tags: ["economia"] },
);

// Helpers de extracao
export function getPibComparativo(rows: EconomiaIndicador[]) {
  const cidades = [
    { ibge: 5213806, nome: "Morrinhos", destaque: true },
    { ibge: 5204904, nome: "Caldas Novas" },
    { ibge: 5217708, nome: "Pontalina" },
    { ibge: 5212501, nome: "Marzagão" },
    { ibge: 5218987, nome: "Rio Quente" },
    { ibge: 5200209, nome: "Água Limpa" },
  ];
  return cidades.map((c) => {
    const total = rows.find(
      (r) =>
        r.categoria === "pib" &&
        r.indicador === "pib_total_mil" &&
        r.municipio_ibge === c.ibge,
    );
    const pc = rows.find(
      (r) =>
        r.categoria === "pib" &&
        r.indicador === "pib_per_capita" &&
        r.municipio_ibge === c.ibge,
    );
    return {
      ...c,
      pib_total_mil: total?.valor ?? 0,
      pib_total_texto: total?.valor_texto ?? "—",
      pib_per_capita: pc?.valor ?? 0,
      pib_per_capita_texto: pc?.valor_texto ?? "—",
    };
  });
}

export function getComposicaoSetorial(rows: EconomiaIndicador[]) {
  const setores = ["agropecuaria", "industria", "servicos"] as const;
  return setores.map((s) => {
    const r = rows.find(
      (x) =>
        x.categoria === "composicao_setorial" &&
        x.indicador === s &&
        x.municipio_ibge === 5213806,
    );
    return {
      setor: s,
      valor_mil: r?.valor ?? 0,
      pct_texto: r?.valor_texto ?? "0%",
    };
  });
}

export function getCagedSerie(rows: EconomiaIndicador[]) {
  return rows
    .filter((r) => r.categoria === "caged" && r.indicador === "saldo_anual")
    .map((r) => ({ ano: r.ano!, saldo: r.valor!, valor_texto: r.valor_texto! }))
    .sort((a, b) => a.ano - b.ano);
}

export function getSalariosPorSetor(rows: EconomiaIndicador[]) {
  return rows
    .filter(
      (r) =>
        r.categoria === "rais" &&
        r.indicador === "salario_medio_setor" &&
        r.setor !== null,
    )
    .map((r) => ({
      setor: r.setor!,
      sm: r.valor!,
      texto: r.valor_texto!,
    }))
    .sort((a, b) => b.sm - a.sm);
}

export function getEmpresasMEIs(rows: EconomiaIndicador[]) {
  const empresas = rows.find(
    (r) => r.categoria === "empresas" && r.indicador === "cnpjs_ativos",
  );
  const meis = rows.find(
    (r) => r.categoria === "meis" && r.indicador === "meis_ativos",
  );
  return {
    empresas: empresas
      ? {
          valor: empresas.valor,
          texto: empresas.valor_texto,
          observacao: empresas.observacao,
          ano: empresas.ano,
        }
      : null,
    meis: meis
      ? {
          valor: meis.valor,
          texto: meis.valor_texto,
          observacao: meis.observacao,
          ano: meis.ano,
        }
      : null,
  };
}

export function getTopEmpregadores(rows: EconomiaIndicador[]) {
  return rows
    .filter((r) => r.categoria === "top_empregadores")
    .map((r) => ({
      nome: r.indicador,
      funcionarios: r.valor,
      texto: r.valor_texto,
      cnae: r.observacao,
      fonte: r.fonte,
      fonte_url: r.fonte_url,
    }))
    .sort((a, b) => (b.funcionarios ?? 0) - (a.funcionarios ?? 0));
}

export function getTopOcupacoesCBO(rows: EconomiaIndicador[]) {
  return rows
    .filter((r) => r.categoria === "rais_cbo")
    .map((r) => ({
      ocupacao: r.indicador,
      setor: r.setor,
      empregos: r.valor,
      texto: r.valor_texto,
      observacao: r.observacao,
    }))
    .sort((a, b) => (b.empregos ?? 0) - (a.empregos ?? 0));
}

export function getCagedPorSetor(rows: EconomiaIndicador[]) {
  const setores = ["agropecuaria", "servicos", "industria"] as const;
  return setores.map((s) => {
    const adm = rows.find(
      (r) =>
        r.categoria === "caged_setor" &&
        r.indicador === "admissoes_2025" &&
        r.setor === s,
    );
    const des = rows.find(
      (r) =>
        r.categoria === "caged_setor" &&
        r.indicador === "desligamentos_2025" &&
        r.setor === s,
    );
    const admN = adm?.valor ?? 0;
    const desN = des?.valor ?? 0;
    return {
      setor: s,
      admissoes: admN,
      desligamentos: desN,
      saldo: admN - desN,
      observacao: adm?.observacao,
    };
  });
}

/**
 * CNPJs por bairro (Receita Federal CSV mensal — atualmente apenas Centro
 * com breakdown público; demais bairros agregados como "outros").
 */
export function getCnpjsPorBairro(rows: EconomiaIndicador[]) {
  const filtered = rows.filter((r) => r.categoria === "cnpjs_bairro");
  const total = filtered.find((r) => r.indicador === "Total Município");
  const centro = filtered.find((r) => r.indicador === "Centro");
  const demais = filtered.find((r) => r.indicador === "Demais Bairros");
  return {
    total: total
      ? {
          valor: total.valor ?? 0,
          texto: total.valor_texto ?? "—",
          observacao: total.observacao,
          fonte_url: total.fonte_url,
        }
      : null,
    centro: centro
      ? {
          valor: centro.valor ?? 0,
          texto: centro.valor_texto ?? "—",
          observacao: centro.observacao,
        }
      : null,
    demais: demais
      ? {
          valor: demais.valor ?? 0,
          texto: demais.valor_texto ?? "—",
          observacao: demais.observacao,
        }
      : null,
  };
}

/**
 * Top atividades econômicas (CNAE 4 dígitos) entre os CNPJs ativos.
 */
export function getCnaesTop(rows: EconomiaIndicador[]) {
  return rows
    .filter((r) => r.categoria === "cnae_top")
    .map((r) => ({
      atividade: r.indicador,
      setor: r.setor,
      cnae_codigo: r.valor_texto,
      empresas: r.valor,
      observacao: r.observacao,
    }))
    .sort((a, b) => (b.empresas ?? 0) - (a.empresas ?? 0));
}

/**
 * Cruzamento RAIS × CAGED — estoque 2023 + saldo 2025 por setor agregado.
 * Util pra ver quais setores estão crescendo proporcionalmente ao tamanho.
 */
export function getCruzamentoRaisCaged(rows: EconomiaIndicador[]) {
  const setores = ["agropecuaria", "servicos", "industria"] as const;
  return setores.map((s) => {
    const estoque = rows.find(
      (r) =>
        r.categoria === "rais_caged_cruzamento" &&
        r.setor === s &&
        r.indicador.endsWith("_estoque_2023"),
    );
    const saldo = rows.find(
      (r) =>
        r.categoria === "rais_caged_cruzamento" &&
        r.setor === s &&
        r.indicador.endsWith("_saldo_2025"),
    );
    const estoqueN = estoque?.valor ?? 0;
    const saldoN = saldo?.valor ?? 0;
    const variacaoPct = estoqueN > 0 ? (saldoN / estoqueN) * 100 : 0;
    return {
      setor: s,
      estoque_2023: estoqueN,
      estoque_texto: estoque?.valor_texto ?? "—",
      saldo_2025: saldoN,
      saldo_texto: saldo?.valor_texto ?? "—",
      variacao_pct: variacaoPct,
    };
  });
}

/**
 * Status de coleta CAGED por CNAE detalhado (Power BI MTE — pendente parser).
 */
export function getCagedCnaeDetalhadoStatus(rows: EconomiaIndicador[]) {
  return rows.find(
    (r) =>
      r.categoria === "caged_cnae_detalhado" &&
      r.indicador === "pendente_parser_powerbi",
  );
}

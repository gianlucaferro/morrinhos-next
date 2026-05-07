import "server-only";
import { unstable_cache } from "next/cache";
import { createPublicSupabaseClient } from "@/lib/supabase/public";

export type SaudeIndicador = {
  ano: number;
  mes: number | null;
  valor: number;
  valor_texto: string | null;
};

export type CovidSerieMes = {
  ano: number;
  mes: number;
  internacoes: number;
  obitos: number;
  internacoes_srag: number;
};

/**
 * Serie historica anual de obitos por categoria
 * (mortalidade_geral, mortalidade_infantil)
 */
export const fetchObitosAnuais = unstable_cache(
  async (categoria: string): Promise<SaudeIndicador[]> => {
    const supabase = createPublicSupabaseClient();
    const { data } = await supabase
      .from("saude_indicadores")
      .select("ano, mes, valor, valor_texto")
      .eq("categoria", categoria)
      .eq("indicador", "obitos_anual")
      .order("ano", { ascending: true });
    return ((data ?? []) as SaudeIndicador[]).map((r) => ({
      ...r,
      valor: Number(r.valor),
    }));
  },
  ["obitos-anuais"],
  { revalidate: 86400, tags: ["saude"] },
);

/**
 * COVID-19: serie mensal de internacoes/obitos/SRAG (2020-2026)
 * Junta 3 indicadores em uma struct por mes.
 */
export const fetchCovidSerieMensal = unstable_cache(
  async (): Promise<CovidSerieMes[]> => {
    const supabase = createPublicSupabaseClient();
    const { data } = await supabase
      .from("saude_indicadores")
      .select("ano, mes, indicador, valor")
      .eq("categoria", "covid")
      .in("indicador", ["internacoes_covid_mes", "obitos_covid_mes", "internacoes_srag_total_mes"])
      .order("ano", { ascending: true })
      .order("mes", { ascending: true });

    const map = new Map<string, CovidSerieMes>();
    for (const row of (data ?? []) as { ano: number; mes: number | null; indicador: string; valor: number }[]) {
      if (!row.mes) continue;
      const key = `${row.ano}-${row.mes}`;
      const cur = map.get(key) ?? {
        ano: row.ano,
        mes: row.mes,
        internacoes: 0,
        obitos: 0,
        internacoes_srag: 0,
      };
      const v = Number(row.valor) || 0;
      if (row.indicador === "internacoes_covid_mes") cur.internacoes = v;
      else if (row.indicador === "obitos_covid_mes") cur.obitos = v;
      else if (row.indicador === "internacoes_srag_total_mes") cur.internacoes_srag = v;
      map.set(key, cur);
    }
    return Array.from(map.values()).sort((a, b) =>
      a.ano !== b.ano ? a.ano - b.ano : a.mes - b.mes,
    );
  },
  ["covid-serie-mensal"],
  { revalidate: 86400, tags: ["saude"] },
);

/**
 * Mortes por capitulo CID-10 (2026 — agregado todos os anos disponiveis no DB).
 * Retorna ordenado por valor desc.
 */
export const fetchMortesPorCausaCid = unstable_cache(
  async (): Promise<Array<{ causa: string; total: number }>> => {
    const supabase = createPublicSupabaseClient();
    const { data } = await supabase
      .from("saude_indicadores")
      .select("valor, valor_texto")
      .eq("categoria", "mortalidade_geral")
      .eq("indicador", "obitos_causa_capitulo");
    return ((data ?? []) as { valor: number; valor_texto: string }[])
      .filter((r) => r.valor_texto && Number(r.valor) > 0)
      .map((r) => ({ causa: r.valor_texto, total: Number(r.valor) }))
      .sort((a, b) => b.total - a.total);
  },
  ["mortes-causa-cid"],
  { revalidate: 86400, tags: ["saude"] },
);

/**
 * HIV: serie de diagnosticos por ano em Morrinhos (2010-2026).
 */
export const fetchHIVDiagnosticosAnuais = unstable_cache(
  async (): Promise<SaudeIndicador[]> => {
    const supabase = createPublicSupabaseClient();
    const { data } = await supabase
      .from("saude_indicadores")
      .select("ano, mes, valor, valor_texto")
      .eq("categoria", "hiv")
      .eq("indicador", "diagnosticos_ano")
      .order("ano", { ascending: true });
    return ((data ?? []) as SaudeIndicador[]).map((r) => ({
      ...r,
      valor: Number(r.valor),
    }));
  },
  ["hiv-diagnosticos-anuais"],
  { revalidate: 86400, tags: ["saude"] },
);

/**
 * HIV: agregados por sexo (todos os anos somados).
 */
export const fetchHIVPorSexo = unstable_cache(
  async (): Promise<Array<{ sexo: string; total: number }>> => {
    const supabase = createPublicSupabaseClient();
    const { data } = await supabase
      .from("saude_indicadores")
      .select("valor, valor_texto")
      .eq("categoria", "hiv")
      .eq("indicador", "diagnosticos_sexo");
    const map = new Map<string, number>();
    for (const r of (data ?? []) as { valor: number; valor_texto: string }[]) {
      const k = r.valor_texto || "?";
      map.set(k, (map.get(k) ?? 0) + Number(r.valor));
    }
    return Array.from(map.entries())
      .map(([sexo, total]) => ({ sexo, total }))
      .sort((a, b) => b.total - a.total);
  },
  ["hiv-por-sexo"],
  { revalidate: 86400, tags: ["saude"] },
);

/**
 * HIV: agregados por faixa etaria.
 */
export const fetchHIVPorFaixa = unstable_cache(
  async (): Promise<Array<{ faixa: string; total: number }>> => {
    const supabase = createPublicSupabaseClient();
    const { data } = await supabase
      .from("saude_indicadores")
      .select("valor, valor_texto")
      .eq("categoria", "hiv")
      .eq("indicador", "diagnosticos_faixa_etaria");
    const map = new Map<string, number>();
    for (const r of (data ?? []) as { valor: number; valor_texto: string }[]) {
      const k = r.valor_texto || "?";
      map.set(k, (map.get(k) ?? 0) + Number(r.valor));
    }
    // Ordem natural por idade
    const orderHint = ["0-4", "5-12", "13-19", "20-29", "30-39", "40-49", "50-59", "60+", "Ignorado"];
    return Array.from(map.entries())
      .map(([faixa, total]) => ({ faixa, total }))
      .sort((a, b) => {
        const ia = orderHint.findIndex((h) => a.faixa.includes(h));
        const ib = orderHint.findIndex((h) => b.faixa.includes(h));
        if (ia >= 0 && ib >= 0) return ia - ib;
        return a.faixa.localeCompare(b.faixa);
      });
  },
  ["hiv-por-faixa"],
  { revalidate: 86400, tags: ["saude"] },
);

/**
 * Tuberculose: serie obitos anuais 1997-2020.
 */
export const fetchTuberculoseObitos = unstable_cache(
  async (): Promise<SaudeIndicador[]> => {
    const supabase = createPublicSupabaseClient();
    const { data } = await supabase
      .from("saude_indicadores")
      .select("ano, mes, valor, valor_texto")
      .eq("categoria", "tuberculose")
      .eq("indicador", "obitos_anual")
      .order("ano", { ascending: true });
    return ((data ?? []) as SaudeIndicador[]).map((r) => ({
      ...r,
      valor: Number(r.valor),
    }));
  },
  ["tuberculose-obitos"],
  { revalidate: 86400, tags: ["saude"] },
);

/**
 * DDA (Doencas Diarreicas Agudas): internacoes por 100k hab 2012-2024.
 */
export const fetchDDAInternacoes = unstable_cache(
  async (): Promise<SaudeIndicador[]> => {
    const supabase = createPublicSupabaseClient();
    const { data } = await supabase
      .from("saude_indicadores")
      .select("ano, mes, valor, valor_texto")
      .eq("categoria", "dda")
      .eq("indicador", "internacoes_por_100mil")
      .order("ano", { ascending: true });
    return ((data ?? []) as SaudeIndicador[]).map((r) => ({
      ...r,
      valor: Number(r.valor),
    }));
  },
  ["dda-internacoes"],
  { revalidate: 86400, tags: ["saude"] },
);

/**
 * Mortalidade Infantil: causas (capitulos CID-10).
 */
export const fetchMortInfantilCausas = unstable_cache(
  async (): Promise<Array<{ causa: string; total: number }>> => {
    const supabase = createPublicSupabaseClient();
    const { data } = await supabase
      .from("saude_indicadores")
      .select("valor, valor_texto")
      .eq("categoria", "mortalidade_infantil")
      .eq("indicador", "obitos_causa_capitulo");
    return ((data ?? []) as { valor: number; valor_texto: string }[])
      .filter((r) => r.valor_texto && Number(r.valor) > 0)
      .map((r) => ({ causa: r.valor_texto, total: Number(r.valor) }))
      .sort((a, b) => b.total - a.total);
  },
  ["mort-infantil-causas"],
  { revalidate: 86400, tags: ["saude"] },
);

/**
 * Casos mensais por categoria de arbovirose (dengue/chik/zika).
 * Util pra grafico de sazonalidade ou comparativo.
 */
export const fetchArbovirosesMensal = unstable_cache(
  async (categoria: string): Promise<Array<{ ano: number; mes: number; valor: number }>> => {
    const supabase = createPublicSupabaseClient();
    const { data } = await supabase
      .from("saude_indicadores")
      .select("ano, mes, valor")
      .eq("categoria", categoria)
      .eq("indicador", "casos_mes")
      .order("ano", { ascending: true })
      .order("mes", { ascending: true });
    return ((data ?? []) as { ano: number; mes: number; valor: number }[]).map((r) => ({
      ano: r.ano,
      mes: r.mes,
      valor: Number(r.valor),
    }));
  },
  ["arboviroses-mensal"],
  { revalidate: 3600, tags: ["saude"] },
);

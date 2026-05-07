import "server-only";
import { unstable_cache } from "next/cache";
import { createPublicSupabaseClient } from "@/lib/supabase/public";

const CURRENT_YEAR = new Date().getFullYear();

async function countTable(table: string): Promise<number> {
  const supabase = createPublicSupabaseClient();
  const { count, error } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true });
  if (error) {
    console.error(`countTable(${table}) error:`, error);
    return 0;
  }
  return count ?? 0;
}

async function countWhereYear(table: string, column: string, year: number): Promise<number> {
  const supabase = createPublicSupabaseClient();
  const { count, error } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true })
    .eq(column, year);
  if (error) {
    console.error(`countWhereYear(${table}.${column}=${year}) error:`, error);
    return 0;
  }
  return count ?? 0;
}

export const fetchCamaraOverview = unstable_cache(
  async () => {
    const [
      vereadores,
      projetos,
      projetosAno,
      atuacao,
      atuacaoAno,
      atos,
      sessoesAno,
      contratos,
      diarias,
      ultimoSubsidio,
    ] = await Promise.all([
      countTable("vereadores"),
      countTable("projetos"),
      countWhereYear("projetos", "ano", CURRENT_YEAR),
      countTable("atuacao_parlamentar"),
      countWhereYear("atuacao_parlamentar", "ano", CURRENT_YEAR),
      countTable("camara_atos"),
      (async () => {
        const supabase = createPublicSupabaseClient();
        const { data, error } = await supabase
          .from("presenca_sessoes")
          .select("sessao_data")
          .gte("sessao_data", `${CURRENT_YEAR}-01-01`);
        if (error) return 0;
        const setSessoes = new Set((data || []).map((r) => r.sessao_data));
        return setSessoes.size;
      })(),
      countTable("camara_contratos"),
      countTable("camara_diarias"),
      (async () => {
        const supabase = createPublicSupabaseClient();
        const { data } = await supabase
          .from("remuneracao_mensal")
          .select("subsidio_referencia, competencia, bruto")
          .order("competencia", { ascending: false })
          .limit(1);
        return data?.[0] ?? null;
      })(),
    ]);

    return {
      vereadores,
      projetos,
      projetosAno,
      atuacao,
      atuacaoAno,
      atos,
      sessoesAno,
      contratos,
      diarias,
      ultimoSubsidio,
      ano: CURRENT_YEAR,
    };
  },
  ["camara-overview"],
  { revalidate: 3600, tags: ["camara"] }
);

export const fetchUltimosProjetos = unstable_cache(
  async (limit = 6) => {
    const supabase = createPublicSupabaseClient();
    const { data, error } = await supabase
      .from("projetos")
      .select("id, tipo, numero, ano, ementa, autor_texto, status, data, fonte_visualizar_url")
      .order("data", { ascending: false, nullsFirst: false })
      .limit(limit);
    if (error) {
      console.error("fetchUltimosProjetos error:", error);
      return [];
    }
    return data || [];
  },
  ["camara-ultimos-projetos"],
  { revalidate: 3600, tags: ["projetos"] }
);

export const fetchUltimasAtuacoes = unstable_cache(
  async (limit = 6) => {
    const supabase = createPublicSupabaseClient();
    const { data, error } = await supabase
      .from("atuacao_parlamentar")
      .select("id, tipo, numero, ano, descricao, autor_texto, data, resumo")
      .order("data", { ascending: false, nullsFirst: false })
      .limit(limit);
    if (error) {
      console.error("fetchUltimasAtuacoes error:", error);
      return [];
    }
    return data || [];
  },
  ["camara-ultimas-atuacoes"],
  { revalidate: 3600, tags: ["atuacao_parlamentar"] }
);

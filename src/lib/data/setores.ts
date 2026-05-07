import "server-only";
import { unstable_cache } from "next/cache";
import { createPublicSupabaseClient } from "@/lib/supabase/public";

export const fetchSaudeData = unstable_cache(
  async () => {
    const supabase = createPublicSupabaseClient();
    const [
      { data: indicadores },
      { data: estabelecimentos },
      { data: dengue },
      { data: repasses },
      { data: equipes },
      servidoresSaude,
      despesasSaude,
    ] = await Promise.all([
      supabase
        .from("saude_indicadores")
        .select("*")
        .order("ano", { ascending: false })
        .order("mes", { ascending: false, nullsFirst: false })
        .limit(1000),
      supabase.from("saude_estabelecimentos").select("*").order("nome"),
      supabase
        .from("saude_indicadores")
        .select("ano, mes, semana_epidemiologica, valor, valor_texto, indicador, fonte, fonte_url")
        .eq("categoria", "dengue")
        .eq("indicador", "casos_mes")
        .order("ano", { ascending: false })
        .order("mes", { ascending: false, nullsFirst: false }),
      supabase
        .from("saude_repasses")
        .select("*")
        .order("ano", { ascending: false })
        .order("mes", { ascending: false, nullsFirst: false })
        .limit(200),
      supabase
        .from("saude_equipes")
        .select("*")
        .order("tipo", { ascending: true })
        .limit(200),
      fetchServidoresPorArea("Saúde"),
      fetchDespesasPorSecretaria("Saúde"),
    ]);
    return {
      indicadores: indicadores || [],
      estabelecimentos: estabelecimentos || [],
      dengue: dengue || [],
      repasses: repasses || [],
      equipes: equipes || [],
      servidoresSaude,
      despesasSaude,
    };
  },
  ["saude-data"],
  { revalidate: 3600, tags: ["saude"] }
);

export const fetchEducacaoData = unstable_cache(
  async () => {
    const supabase = createPublicSupabaseClient();
    const [
      { data: indicadores },
      { data: escolas },
      { data: ideb },
      { data: matriculas },
      { data: investimentos },
      { data: programas },
      { data: ensinoSuperiorIes },
      { data: ensinoSuperiorCursos },
      { data: peDeMeia },
    ] = await Promise.all([
      supabase
        .from("educacao_indicadores")
        .select("*")
        .order("ano_referencia", { ascending: false }),
      supabase
        .from("educacao_escolas")
        .select("*")
        .order("matriculas_total", { ascending: false, nullsFirst: false }),
      supabase.from("educacao_ideb").select("*").order("ano", { ascending: true }),
      supabase.from("educacao_matriculas").select("*").order("ano", { ascending: true }),
      supabase.from("educacao_investimentos").select("*").order("ano", { ascending: true }),
      supabase.from("educacao_programas").select("*").order("esfera", { ascending: true }),
      supabase.from("ensino_superior_ies").select("*").order("nome", { ascending: true }),
      supabase.from("ensino_superior_cursos").select("*").order("nome", { ascending: true }),
      supabase.from("pe_de_meia").select("*").order("ano", { ascending: false }),
    ]);
    return {
      indicadores: indicadores || [],
      escolas: escolas || [],
      ideb: ideb || [],
      matriculas: matriculas || [],
      investimentos: investimentos || [],
      programas: programas || [],
      ensinoSuperiorIes: ensinoSuperiorIes || [],
      ensinoSuperiorCursos: ensinoSuperiorCursos || [],
      peDeMeia: peDeMeia || [],
    };
  },
  ["educacao-data"],
  { revalidate: 3600, tags: ["educacao"] }
);

export const fetchSegurancaData = unstable_cache(
  async () => {
    const supabase = createPublicSupabaseClient();
    const { data } = await supabase
      .from("seguranca_indicadores")
      .select("*")
      .eq("municipio", "Morrinhos")
      .order("ano", { ascending: false })
      .order("mes", { ascending: false, nullsFirst: false });
    return data || [];
  },
  ["seguranca-data"],
  { revalidate: 3600, tags: ["seguranca"] }
);

export const fetchAgroData = unstable_cache(
  async () => {
    const supabase = createPublicSupabaseClient();
    const { data } = await supabase
      .from("agro_indicadores")
      .select("*")
      .order("ano_referencia", { ascending: false });
    return data || [];
  },
  ["agro-data"],
  { revalidate: 3600, tags: ["agro"] }
);

export const fetchArrecadacaoData = unstable_cache(
  async () => {
    const supabase = createPublicSupabaseClient();
    const [{ data }, { data: transferencias }, { data: comparativo }, { data: logs }] = await Promise.all([
      supabase
        .from("arrecadacao_municipal")
        .select("*")
        .ilike("municipio", "Morrinhos%")
        .order("ano", { ascending: false }),
      supabase
        .from("transferencias_federais")
        .select("*")
        .order("ano", { ascending: false })
        .order("valor_total", { ascending: false, nullsFirst: false })
        .limit(30),
      supabase.from("arrecadacao_comparativo").select("*").order("ano", { ascending: false }),
      supabase
        .from("arrecadacao_fontes_log")
        .select("*")
        .order("data_execucao", { ascending: false })
        .limit(20),
    ]);
    return {
      arrecadacao: data || [],
      transferencias: transferencias || [],
      comparativo: comparativo || [],
      logs: logs || [],
    };
  },
  ["arrecadacao-data"],
  { revalidate: 3600, tags: ["arrecadacao"] }
);

export const fetchBeneficiosData = unstable_cache(
  async () => {
    const supabase = createPublicSupabaseClient();
    const [{ data }, { data: cde }] = await Promise.all([
      supabase
        .from("beneficios_sociais")
        .select("*")
        .ilike("municipio", "Morrinhos%")
        .order("competencia", { ascending: false }),
      supabase.from("cde_subsidios").select("*").order("ano", { ascending: true }),
    ]);
    return { beneficios: data || [], cde: cde || [] };
  },
  ["beneficios-data"],
  { revalidate: 3600, tags: ["beneficios"] }
);

async function fetchServidoresPorArea(area: string) {
  const supabase = createPublicSupabaseClient();
  const { data: secretarias } = await supabase
    .from("secretarias")
    .select("id")
    .ilike("nome", `%${area}%`)
    .limit(1);
  const secretariaId = secretarias?.[0]?.id;

  let query = supabase
    .from("servidores")
    .select("id, nome, cargo, orgao_tipo", { count: "exact" })
    .eq("orgao_tipo", "prefeitura");

  if (secretariaId) {
    query = query.or(
      `secretaria_id.eq.${secretariaId},cargo.ilike.%saude%,cargo.ilike.%enferm%,cargo.ilike.%medic%,cargo.ilike.%odont%,cargo.ilike.%farmac%,cargo.ilike.%fisioter%,cargo.ilike.%nutrici%,cargo.ilike.%psicolog%,cargo.ilike.%agente%comunit%`
    );
  } else {
    query = query.or(
      "cargo.ilike.%saude%,cargo.ilike.%enferm%,cargo.ilike.%medic%,cargo.ilike.%odont%,cargo.ilike.%farmac%,cargo.ilike.%fisioter%,cargo.ilike.%nutrici%,cargo.ilike.%psicolog%,cargo.ilike.%agente%comunit%"
    );
  }

  const { data, count } = await query.order("nome").limit(500);
  return { data: data || [], count: count ?? 0 };
}

async function fetchDespesasPorSecretaria(area: string) {
  const supabase = createPublicSupabaseClient();
  const { data: secretarias } = await supabase
    .from("secretarias")
    .select("id")
    .ilike("nome", `%${area}%`)
    .limit(1);
  const secretariaId = secretarias?.[0]?.id;
  if (!secretariaId) return [];

  const { data } = await supabase
    .from("despesas")
    .select("*")
    .eq("secretaria_id", secretariaId)
    .order("data", { ascending: false })
    .limit(80);

  return data || [];
}

export const fetchClassificadosAtivos = unstable_cache(
  async () => {
    const supabase = createPublicSupabaseClient();
    const { data } = await supabase
      .from("classificados")
      .select("id, titulo, descricao, preco, preco_tipo, fotos, foto_perfil, categoria, bairro, nome, whatsapp, visualizacoes, created_at")
      .eq("status", "ativo")
      .gt("expira_em", new Date().toISOString())
      .order("created_at", { ascending: false });
    return data || [];
  },
  ["classificados-ativos"],
  { revalidate: 60, tags: ["classificados"] }
);

export const fetchClassificadoById = unstable_cache(
  async (id: string) => {
    const supabase = createPublicSupabaseClient();
    const { data } = await supabase
      .from("classificados")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    return data;
  },
  ["classificado-by-id"],
  { revalidate: 60, tags: ["classificados"] }
);

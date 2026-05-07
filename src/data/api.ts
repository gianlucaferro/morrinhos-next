import { createBrowserSupabaseClient } from "@/lib/supabase/client";
const supabase = createBrowserSupabaseClient();

export type Vereador = {
  id: string;
  nome: string;
  slug: string;
  foto_url: string | null;
  cargo_mesa: string | null;
  partido: string | null;
  email: string | null;
  telefone: string | null;
  instagram: string | null;
  inicio_mandato: string;
  fim_mandato: string;
  fonte_url: string;
  votos_eleicao: number | null;
  ano_eleicao: number | null;
};

export type Projeto = {
  id: string;
  tipo: string;
  numero: string;
  ano: number;
  data: string;
  ementa: string;
  origem: "Legislativo" | "Executivo";
  autor_vereador_id: string | null;
  autor_texto: string;
  status: "apresentado" | "aprovado" | "recusado" | "em_tramitacao";
  fonte_visualizar_url: string;
  fonte_download_url: string | null;
  resumo_simples: string | null;
  tags: string[];
  updated_at?: string;
};

export type AtuacaoParlamentar = {
  id: string;
  tipo: string;
  numero: number;
  ano: number;
  data: string;
  descricao: string;
  autor_texto: string;
  autor_vereador_id: string | null;
  fonte_url: string;
};

export type Remuneracao = {
  vereador_id: string;
  competencia: string;
  bruto: number | null;
  liquido: number | null;
  subsidio_referencia: number;
  fonte_url: string;
};

// Fetch functions
export async function fetchVereadores(): Promise<Vereador[]> {
  const { data, error } = await supabase
    .from("vereadores")
    .select("*")
    .order("nome");
  if (error) throw error;
  return data || [];
}

export async function fetchVereadorBySlug(slug: string): Promise<Vereador | null> {
  const { data, error } = await supabase
    .from("vereadores")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchProjetos(): Promise<Projeto[]> {
  const { data, error } = await supabase
    .from("projetos")
    .select("*")
    .order("data", { ascending: false });
  if (error) throw error;
  return (data || []) as Projeto[];
}

export async function fetchProjetosByVereador(vereadorId: string): Promise<Projeto[]> {
  const { data, error } = await supabase
    .from("projetos")
    .select("*")
    .eq("autor_vereador_id", vereadorId)
    .order("data", { ascending: false });
  if (error) throw error;
  return (data || []) as Projeto[];
}

export async function fetchRemuneracaoByVereador(vereadorId: string): Promise<Remuneracao | null> {
  const { data, error } = await supabase
    .from("remuneracao_mensal")
    .select("*")
    .eq("vereador_id", vereadorId)
    .order("competencia", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as Remuneracao | null;
}

export async function fetchProjetosCountByVereador(vereadorId: string) {
  const { data, error } = await supabase
    .from("projetos")
    .select("status")
    .eq("autor_vereador_id", vereadorId);
  if (error) throw error;
  const projs = data || [];
  return {
    apresentados: projs.length,
    aprovados: projs.filter((p) => p.status === "aprovado").length,
    recusados: projs.filter((p) => p.status === "recusado").length,
    tramitacao: projs.filter((p) => p.status === "em_tramitacao").length,
  };
}

export async function fetchAtuacaoByVereador(vereadorId: string): Promise<AtuacaoParlamentar[]> {
  const { data, error } = await supabase
    .from("atuacao_parlamentar")
    .select("*")
    .eq("autor_vereador_id", vereadorId)
    .order("data", { ascending: false });
  if (error) throw error;
  return (data || []) as AtuacaoParlamentar[];
}

export async function fetchAtuacaoCountByVereador(vereadorId: string) {
  const { data, error } = await supabase
    .from("atuacao_parlamentar")
    .select("tipo")
    .eq("autor_vereador_id", vereadorId);
  if (error) throw error;
  const items = data || [];
  return {
    indicacoes: items.filter((i) => i.tipo === "Indicação").length,
    mocoes: items.filter((i) => i.tipo === "Moção").length,
    requerimentos: items.filter((i) => i.tipo === "Requerimento").length,
    total: items.length,
  };
}

export async function fetchAllAtuacao(): Promise<AtuacaoParlamentar[]> {
  const { data, error } = await supabase
    .from("atuacao_parlamentar")
    .select("*")
    .order("data", { ascending: false });
  if (error) throw error;
  return (data || []) as AtuacaoParlamentar[];
}

export type AtuacaoFilters = {
  tipo?: string;
  vereadorId?: string;
  ano?: number;
  search?: string;
};

const PAGE_SIZE = 30;

// Map camara_atos tipo_codigo to atuação tipo labels
const CENTI_TIPO_MAP: Record<number, string> = {
  24: "Indicação",
};

// Fetch supplementary Indicações from camara_atos (Centi source, has 2026+ data)
async function fetchCentiAtuacao(filters: AtuacaoFilters): Promise<AtuacaoParlamentar[]> {
  // Only fetch Indicações from Centi when relevant
  if (filters.tipo && filters.tipo !== "Indicação") return [];
  // Can't filter by vereador since camara_atos has no author info
  if (filters.vereadorId) return [];

  let query = supabase
    .from("camara_atos")
    .select("*")
    .eq("tipo_codigo", 24);

  if (filters.ano) query = query.eq("ano", filters.ano);
  if (filters.search) {
    query = query.or(`descricao.ilike.%${filters.search}%,numero.ilike.%${filters.search}%`);
  }

  const { data, error } = await query.order("data_publicacao", { ascending: false });
  if (error) return [];

  const today = new Date().toISOString().split("T")[0];

  return (data || []).filter((a) => {
    // Reject items with future dates (Centi portal sometimes has wrong dates)
    if (a.data_publicacao && a.data_publicacao > today) return false;
    return true;
  }).map((a) => {
    // Extract number and year from strings like "INDICAÇÃO Nº 068/2026"
    const numMatch = (a.numero || "").match(/(\d+)\/(\d{4})/);
    const parsedNum = numMatch ? parseInt(numMatch[1]) : 0;
    const parsedAno = numMatch ? parseInt(numMatch[2]) : a.ano;

    // If date is in the future relative to the act's year, use Jan 1
    const rawDate = a.data_publicacao || `${parsedAno}-01-01`;
    const dataFinal = rawDate > today ? `${parsedAno}-01-01` : rawDate;

    return {
      id: `centi-${a.id}`,
      tipo: "Indicação",
      numero: parsedNum,
      ano: parsedAno,
      data: dataFinal,
      descricao: a.descricao || "Sem descrição",
      autor_texto: "Câmara Municipal",
      autor_vereador_id: null,
      fonte_url: a.fonte_url || a.documento_url || "",
    };
  });
}

// Deduplicate: remove Centi items that already exist in atuacao_parlamentar (same tipo+numero+ano)
function deduplicateAtuacao(
  atuacaoItems: AtuacaoParlamentar[],
  centiItems: AtuacaoParlamentar[]
): AtuacaoParlamentar[] {
  const existingKeys = new Set(
    atuacaoItems.map((a) => `${a.tipo}::${a.numero}::${a.ano}`)
  );
  return centiItems.filter(
    (c) => !existingKeys.has(`${c.tipo}::${c.numero}::${c.ano}`)
  );
}

export async function fetchAtuacaoPaginated(
  filters: AtuacaoFilters,
  page: number
): Promise<{ items: AtuacaoParlamentar[]; totalCount: number }> {
  // Fetch both sources in parallel
  let atuacaoQuery = supabase
    .from("atuacao_parlamentar")
    .select("*", { count: "exact" });

  if (filters.tipo) atuacaoQuery = atuacaoQuery.eq("tipo", filters.tipo);
  if (filters.vereadorId) atuacaoQuery = atuacaoQuery.eq("autor_vereador_id", filters.vereadorId);
  if (filters.ano) atuacaoQuery = atuacaoQuery.eq("ano", filters.ano);
  if (filters.search) {
    atuacaoQuery = atuacaoQuery.or(
      `descricao.ilike.%${filters.search}%,autor_texto.ilike.%${filters.search}%`
    );
  }

  const [atuacaoResult, centiItems] = await Promise.all([
    atuacaoQuery.order("data", { ascending: false }),
    fetchCentiAtuacao(filters),
  ]);

  if (atuacaoResult.error) throw atuacaoResult.error;

  const allAtuacao = (atuacaoResult.data || []) as AtuacaoParlamentar[];
  const uniqueCenti = deduplicateAtuacao(allAtuacao, centiItems);

  // Merge, sort by date desc, then paginate
  const merged = [...allAtuacao, ...uniqueCenti].sort(
    (a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()
  );

  const totalCount = merged.length;
  const from = page * PAGE_SIZE;
  const items = merged.slice(from, from + PAGE_SIZE);

  return { items, totalCount };
}

export async function fetchAtuacaoAnos(): Promise<number[]> {
  const [atuacaoRes, atosRes] = await Promise.all([
    supabase.from("atuacao_parlamentar").select("ano"),
    supabase.from("camara_atos").select("ano").eq("tipo_codigo", 24),
  ]);

  const set = new Set<number>();
  (atuacaoRes.data || []).forEach((d: { ano: number }) => set.add(d.ano));
  (atosRes.data || []).forEach((d: { ano: number }) => set.add(d.ano));
  return Array.from(set).sort((a, b) => b - a);
}

export { PAGE_SIZE as ATUACAO_PAGE_SIZE };

export const SUBSIDIO_VEREADOR = 7486.35;

export const statusLabels: Record<string, string> = {
  apresentado: "Apresentado",
  aprovado: "Aprovado",
  recusado: "Recusado",
  em_tramitacao: "Em tramitação",
};

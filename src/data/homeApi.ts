import { createBrowserSupabaseClient } from "@/lib/supabase/client";
const supabase = createBrowserSupabaseClient();

export type Indicador = {
  chave: string;
  valor: number | null;
  valor_texto: string | null;
  ano_referencia: number;
  fonte_url: string | null;
  atualizado_em: string;
};

export type EmendaParlamentar = {
  id: string;
  parlamentar_nome: string;
  parlamentar_esfera: string;
  valor_empenhado: number;
  valor_pago: number;
  objeto: string | null;
  ano: number;
  fonte_url: string | null;
  atualizado_em: string;
};

export async function fetchIndicadores(): Promise<Indicador[]> {
  const { data, error } = await supabase
    .from("indicadores_municipais")
    .select("*");
  if (error) throw error;
  return (data || []) as Indicador[];
}

export type AgroIndicador = {
  categoria: string;
  chave: string;
  valor: number | null;
  valor_texto: string | null;
  unidade: string | null;
  ano_referencia: number;
  fonte_url: string | null;
};

export async function fetchAgroIndicadores(): Promise<AgroIndicador[]> {
  const { data, error } = await supabase
    .from("agro_indicadores")
    .select("*")
    .order("categoria")
    .order("chave");
  if (error) throw error;
  return (data || []) as AgroIndicador[];
}

export async function fetchEmendas(ano?: number): Promise<EmendaParlamentar[]> {
  let query = supabase.from("emendas_parlamentares").select("*");
  if (ano) query = query.eq("ano", ano);
  const { data, error } = await query.order("valor_pago", { ascending: false });
  if (error) throw error;
  return (data || []) as EmendaParlamentar[];
}

export async function fetchContratosResumo() {
  const allData: { empresa: string | null; valor: number | null; status: string | null }[] = [];
  let from = 0;
  const PAGE = 1000;
  while (true) {
    const { data, error } = await supabase
      .from("contratos")
      .select("empresa, valor, status")
      .range(from, from + PAGE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    allData.push(...data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  const contratos = allData;
  const ativos = contratos.filter(c => c.status === "ativo");
  const valorTotal = ativos.reduce((sum, c) => sum + (c.valor || 0), 0);
  
  // Find top supplier
  const fornecedorMap = new Map<string, number>();
  ativos.forEach(c => {
    if (c.empresa) {
      fornecedorMap.set(c.empresa, (fornecedorMap.get(c.empresa) || 0) + (c.valor || 0));
    }
  });
  let maiorFornecedor = { nome: "", valor: 0 };
  fornecedorMap.forEach((valor, nome) => {
    if (valor > maiorFornecedor.valor) maiorFornecedor = { nome, valor };
  });

  return {
    ativos: ativos.length,
    valorTotal,
    maiorFornecedor,
  };
}

export async function fetchLicitacoesResumo() {
  const { data, error } = await supabase
    .from("licitacoes")
    .select("status, data_publicacao");
  if (error) throw error;
  const licitacoes = data || [];
  return {
    abertas: licitacoes.filter(l => l.status === "aberta").length,
    andamento: licitacoes.filter(l => l.status === "em_andamento").length,
    concluidas: licitacoes.filter(l => l.status === "concluida" || l.status === "homologada").length,
    total: licitacoes.length,
  };
}

export async function fetchServidoresResumo() {
  const { count, error } = await supabase
    .from("servidores")
    .select("id", { count: "exact", head: true });
  if (error) throw error;

  const total = count ?? 0;

  // Órgão com mais servidores — skip detailed query since secretaria_id is not populated
  const maiorOrgao = { nome: "", quantidade: 0 };

  return { total, maiorOrgao };
}

export async function fetchAtividadeRecente() {
  const [projetos, atuacao] = await Promise.all([
    supabase.from("projetos").select("*").order("data", { ascending: false }).limit(5),
    supabase.from("atuacao_parlamentar").select("*").order("data", { ascending: false }).limit(5),
  ]);

  const allProjetos = (projetos.data || []);
  const allAtuacao = (atuacao.data || []);

  const ultimoProjeto = allProjetos[0] || null;
  const ultimoAprovado = allProjetos.find(p => p.status === "aprovado") || null;
  const ultimoRequerimento = allAtuacao.find(a => a.tipo === "Requerimento") || null;

  return { ultimoProjeto, ultimoAprovado, ultimoRequerimento };
}

export type ServidorBusca = {
  id: string;
  nome: string;
  cargo: string | null;
  secretaria_id: string | null;
};

export async function fetchServidoresBusca(): Promise<ServidorBusca[]> {
  const allData: ServidorBusca[] = [];
  let from = 0;
  const PAGE = 1000;
  while (true) {
    const { data, error } = await supabase
      .from("servidores")
      .select("id, nome, cargo, secretaria_id")
      .order("nome")
      .range(from, from + PAGE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    allData.push(...(data as ServidorBusca[]));
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return allData;
}

export type LeiMunicipalBusca = {
  id: string;
  numero: string;
  ementa: string;
  categoria: string | null;
  data_publicacao: string | null;
};

export async function fetchLeisMunicipaisBusca(): Promise<LeiMunicipalBusca[]> {
  const { data, error } = await supabase
    .from("leis_municipais")
    .select("id, numero, ementa, categoria, data_publicacao")
    .order("data_publicacao", { ascending: false });
  if (error) throw error;
  return (data || []) as LeiMunicipalBusca[];
}

export type DecretoBusca = {
  id: string;
  numero: string;
  ementa: string;
  data_publicacao: string | null;
};

export async function fetchDecretosBusca(): Promise<DecretoBusca[]> {
  const { data, error } = await supabase
    .from("decretos")
    .select("id, numero, ementa, data_publicacao")
    .order("data_publicacao", { ascending: false });
  if (error) throw error;
  return (data || []) as DecretoBusca[];
}

export type PortariaBusca = {
  id: string;
  numero: string;
  ementa: string;
  data_publicacao: string | null;
};

export async function fetchPortariasBusca(): Promise<PortariaBusca[]> {
  const { data, error } = await supabase
    .from("portarias")
    .select("id, numero, ementa, data_publicacao")
    .order("data_publicacao", { ascending: false });
  if (error) throw error;
  return (data || []) as PortariaBusca[];
}

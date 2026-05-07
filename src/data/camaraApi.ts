import { createBrowserSupabaseClient } from "@/lib/supabase/client";
const supabase = createBrowserSupabaseClient();

// Types
export type CamaraLicitacao = {
  id: string;
  ano: number;
  numero: string | null;
  modalidade: string | null;
  objeto: string | null;
  situacao: string | null;
  data_abertura: string | null;
  valor_estimado: number | null;
  fonte_url: string | null;
};

export type CamaraContrato = {
  id: string;
  ano: number;
  numero: string | null;
  credor: string | null;
  objeto: string | null;
  valor: number | null;
  vigencia_inicio: string | null;
  vigencia_fim: string | null;
  status: string | null;
  fonte_url: string | null;
};

export type CamaraDespesa = {
  id: string;
  ano: number;
  mes: number | null;
  credor: string | null;
  descricao: string | null;
  elemento: string | null;
  valor: number | null;
  data_pagamento: string | null;
  fonte_url: string | null;
};

export type CamaraReceita = {
  id: string;
  ano: number;
  mes: number;
  descricao: string | null;
  valor_previsto: number | null;
  valor_arrecadado: number | null;
  fonte_url: string | null;
};

export type CamaraDiaria = {
  id: string;
  beneficiario: string | null;
  cargo: string | null;
  destino: string | null;
  motivo: string | null;
  valor: number | null;
  data: string | null;
  fonte_url: string | null;
};

export type PresencaSessao = {
  id: string;
  sessao_titulo: string;
  sessao_data: string | null;
  ano: number;
  vereador_id: string | null;
  vereador_nome: string | null;
  presente: boolean | null;
  tipo_sessao: string | null;
  fonte_url: string | null;
  fonte_tipo: string | null;
  status_verificacao: string | null;
  ata_url: string | null;
};

// Fetch functions
export async function fetchCamaraLicitacoes(): Promise<CamaraLicitacao[]> {
  const { data, error } = await supabase
    .from("camara_licitacoes")
    .select("*")
    .order("data_abertura", { ascending: false });
  if (error) throw error;
  return (data || []) as CamaraLicitacao[];
}

export async function fetchCamaraContratos(): Promise<CamaraContrato[]> {
  const { data, error } = await supabase
    .from("camara_contratos")
    .select("*")
    .order("vigencia_inicio", { ascending: false });
  if (error) throw error;
  return (data || []) as CamaraContrato[];
}

export async function fetchCamaraDespesas(ano?: number): Promise<CamaraDespesa[]> {
  let query = supabase.from("camara_despesas").select("*");
  if (ano) query = query.eq("ano", ano);
  const { data, error } = await query.order("data_pagamento", { ascending: false });
  if (error) throw error;
  return (data || []) as CamaraDespesa[];
}

export async function fetchCamaraReceitas(ano?: number): Promise<CamaraReceita[]> {
  let query = supabase.from("camara_receitas").select("*");
  if (ano) query = query.eq("ano", ano);
  const { data, error } = await query.order("mes", { ascending: true });
  if (error) throw error;
  return (data || []) as CamaraReceita[];
}

export async function fetchCamaraDiarias(): Promise<CamaraDiaria[]> {
  const { data, error } = await supabase
    .from("camara_diarias")
    .select("*")
    .order("data", { ascending: false });
  if (error) throw error;
  return (data || []) as CamaraDiaria[];
}

export async function fetchPresencaSessoes(ano?: number): Promise<PresencaSessao[]> {
  let query = supabase.from("presenca_sessoes").select("*");
  if (ano) query = query.eq("ano", ano);
  const { data, error } = await query.order("sessao_data", { ascending: false });
  if (error) throw error;
  return (data || []) as PresencaSessao[];
}

// Fetch total monthly payroll cost of the Câmara (latest competência)
export async function fetchCamaraCustoTotal(): Promise<{ folhaMensal: number; totalServidores: number } | null> {
  // Get all camara servidores IDs
  const { data: servidores } = await supabase
    .from("servidores")
    .select("id")
    .eq("orgao_tipo", "camara");

  if (!servidores?.length) return null;

  const ids = servidores.map((s) => s.id);

  // Get latest competência only among Câmara servidores.
  const { data: latest } = await supabase
    .from("remuneracao_servidores")
    .select("competencia")
    .in("servidor_id", ids)
    .order("competencia", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!latest) return null;

  // Sum bruto for all camara servidores in latest competência
  const { data: remuneracoes } = await supabase
    .from("remuneracao_servidores")
    .select("bruto")
    .eq("competencia", latest.competencia)
    .in("servidor_id", ids);

  const folhaMensal = (remuneracoes || []).reduce((s, r) => s + (r.bruto || 0), 0);
  return { folhaMensal, totalServidores: remuneracoes?.length || 0 };
}

export async function fetchPresencaAnos(): Promise<number[]> {
  const { data, error } = await supabase
    .from("presenca_sessoes")
    .select("ano");
  if (error) throw error;
  const set = new Set((data || []).map((d: { ano: number }) => d.ano));
  return Array.from(set).sort((a, b) => b - a);
}

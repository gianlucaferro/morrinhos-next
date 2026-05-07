import { supabase } from "@/integrations/supabase/client";

export type EducacaoEscola = {
  id: string;
  nome: string;
  rede: string;
  etapas: string[];
  endereco: string | null;
  latitude: number | null;
  longitude: number | null;
  telefone: string | null;
  ideb_ai: number | null;
  ideb_af: number | null;
  ideb_em: number | null;
  matriculas_total: number | null;
  taxa_aprovacao: number | null;
  taxa_reprovacao: number | null;
  taxa_abandono: number | null;
  tem_biblioteca: boolean;
  tem_lab_informatica: boolean;
  tem_lab_ciencias: boolean;
  tem_quadra: boolean;
  tem_internet: boolean;
  tem_alimentacao: boolean;
  tem_acessibilidade: boolean;
  codigo_inep: string | null;
  fonte_url: string | null;
  ano_referencia: number;
  diretor_nome: string | null;
};

export type EducacaoIdeb = {
  id: string;
  ano: number;
  etapa: string;
  rede: string;
  ideb: number | null;
  meta: number | null;
  nota_saeb_pt: number | null;
  nota_saeb_mt: number | null;
  taxa_aprovacao: number | null;
  ambito: string;
  fonte_url: string | null;
};

export type EducacaoIndicador = {
  id: string;
  chave: string;
  categoria: string;
  valor: number | null;
  valor_texto: string | null;
  ano_referencia: number;
  fonte: string | null;
  fonte_url: string | null;
};

export type EducacaoMatricula = {
  id: string;
  ano: number;
  etapa: string;
  rede: string;
  quantidade: number;
  fonte_url: string | null;
};

export type EducacaoInvestimento = {
  id: string;
  ano: number;
  orcamento_total: number | null;
  percentual_orcamento: number | null;
  gasto_por_aluno: number | null;
  fundeb: number | null;
  fonte_url: string | null;
};

export type EducacaoPrograma = {
  id: string;
  nome: string;
  esfera: string;
  descricao: string | null;
  status: string | null;
  fonte_url: string | null;
};

export type EnsinoSuperiorIes = {
  id: string;
  nome: string;
  sigla: string | null;
  tipo: string;
  codigo_emec: string | null;
  conceito_institucional: number | null;
  endereco: string | null;
  telefone: string | null;
  whatsapp: string | null;
  email: string | null;
  site: string | null;
  instagram: string | null;
  facebook: string | null;
  fundacao_ano: number | null;
  docentes_mestres_doutores_pct: number | null;
  alunos_formados: number | null;
  modalidades: string[];
  programas_financiamento: string[];
  fonte_url: string | null;
};

export type EnsinoSuperiorCurso = {
  id: string;
  ies_id: string;
  nome: string;
  grau: string;
  modalidade: string;
  periodo: string | null;
  duracao_anos: number | null;
  conceito_mec: number | null;
  conceito_enade: number | null;
  situacao: string;
  vagas_autorizadas: number | null;
  fonte_url: string | null;
};

export async function fetchEscolas(): Promise<EducacaoEscola[]> {
  const { data, error } = await supabase
    .from("educacao_escolas")
    .select("*")
    .order("nome");
  if (error) throw error;
  return (data || []) as unknown as EducacaoEscola[];
}

export async function fetchIdeb(): Promise<EducacaoIdeb[]> {
  const { data, error } = await supabase
    .from("educacao_ideb")
    .select("*")
    .order("ano");
  if (error) throw error;
  return (data || []) as unknown as EducacaoIdeb[];
}

export async function fetchIndicadores(): Promise<EducacaoIndicador[]> {
  const { data, error } = await supabase
    .from("educacao_indicadores")
    .select("*")
    .order("chave");
  if (error) throw error;
  return (data || []) as unknown as EducacaoIndicador[];
}

export async function fetchMatriculas(): Promise<EducacaoMatricula[]> {
  const { data, error } = await supabase
    .from("educacao_matriculas")
    .select("*")
    .order("ano");
  if (error) throw error;
  return (data || []) as unknown as EducacaoMatricula[];
}

export async function fetchInvestimentos(): Promise<EducacaoInvestimento[]> {
  const { data, error } = await supabase
    .from("educacao_investimentos")
    .select("*")
    .order("ano");
  if (error) throw error;
  return (data || []) as unknown as EducacaoInvestimento[];
}

export async function fetchProgramas(): Promise<EducacaoPrograma[]> {
  const { data, error } = await supabase
    .from("educacao_programas")
    .select("*")
    .order("esfera");
  if (error) throw error;
  return (data || []) as unknown as EducacaoPrograma[];
}

export async function fetchEnsinoSuperiorIes(): Promise<EnsinoSuperiorIes[]> {
  const { data, error } = await supabase
    .from("ensino_superior_ies")
    .select("*")
    .order("nome");
  if (error) throw error;
  return (data || []) as unknown as EnsinoSuperiorIes[];
}

export async function fetchEnsinoSuperiorCursos(): Promise<EnsinoSuperiorCurso[]> {
  const { data, error } = await supabase
    .from("ensino_superior_cursos")
    .select("*")
    .order("nome");
  if (error) throw error;
  return (data || []) as unknown as EnsinoSuperiorCurso[];
}

export type PeDeMeia = {
  id: string;
  ano: number;
  mes: number | null;
  beneficiarios: number | null;
  valor_total: number | null;
  valor_medio_por_aluno: number | null;
  serie: string | null;
  fonte_url: string | null;
  observacao: string | null;
};

export async function fetchPeDeMeia(): Promise<PeDeMeia[]> {
  const { data, error } = await supabase
    .from("pe_de_meia")
    .select("*")
    .order("ano", { ascending: false });
  if (error) throw error;
  return (data || []) as unknown as PeDeMeia[];
}

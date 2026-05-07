import { supabase } from "@/integrations/supabase/client";

export type ArrecadacaoMunicipal = {
  id: string;
  municipio: string;
  tipo: string;
  categoria: string;
  subcategoria: string | null;
  competencia: string;
  ano: number;
  valor: number | null;
  fonte_nome: string;
  fonte_url: string | null;
  data_coleta: string;
  observacoes: string | null;
  updated_at: string;
};

export type ArrecadacaoFonteLog = {
  id: string;
  fonte_nome: string;
  fonte_url: string | null;
  competencia: string | null;
  status: string;
  registros_importados: number;
  mensagem_erro: string | null;
  data_execucao: string;
};

export type ArrecadacaoComparativo = {
  id: string;
  ano: number;
  categoria: string;
  morrinhos_valor: number | null;
  morrinhos_per_capita: number | null;
  media_go_valor: number | null;
  media_go_per_capita: number | null;
  municipios_amostra: number | null;
  municipios_nomes: string[] | null;
  fonte_nome: string;
  fonte_url: string | null;
  updated_at: string;
};

export async function fetchArrecadacao(): Promise<ArrecadacaoMunicipal[]> {
  const { data, error } = await supabase
    .from("arrecadacao_municipal")
    .select("*")
    .order("competencia", { ascending: false });
  if (error) throw error;
  return (data || []) as unknown as ArrecadacaoMunicipal[];
}

export async function fetchArrecadacaoLog(): Promise<ArrecadacaoFonteLog[]> {
  const { data, error } = await supabase
    .from("arrecadacao_fontes_log")
    .select("*")
    .order("data_execucao", { ascending: false })
    .limit(20);
  if (error) throw error;
  return (data || []) as unknown as ArrecadacaoFonteLog[];
}

export async function fetchArrecadacaoComparativo(): Promise<ArrecadacaoComparativo[]> {
  const { data, error } = await supabase
    .from("arrecadacao_comparativo")
    .select("*")
    .order("ano", { ascending: true });
  if (error) throw error;
  return (data || []) as unknown as ArrecadacaoComparativo[];
}

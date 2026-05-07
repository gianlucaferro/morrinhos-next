import { supabase } from "@/integrations/supabase/client";

export type SegurancaIndicador = {
  id: string;
  ano: number;
  mes: number | null;
  municipio: string;
  uf: string;
  indicador: string;
  categoria: string;
  ocorrencias: number | null;
  vitimas: number | null;
  taxa_por_100k: number | null;
  fonte_nome: string;
  fonte_url: string | null;
  updated_at: string;
};

export async function fetchSegurancaIndicadores(): Promise<SegurancaIndicador[]> {
  const { data, error } = await supabase
    .from("seguranca_indicadores")
    .select("*")
    .order("ano", { ascending: false })
    .order("indicador");
  if (error) throw error;
  return (data || []) as SegurancaIndicador[];
}

export async function fetchSegurancaMorrinhos(): Promise<SegurancaIndicador[]> {
  const { data, error } = await supabase
    .from("seguranca_indicadores")
    .select("*")
    .eq("municipio", "Morrinhos")
    .order("ano", { ascending: false })
    .order("indicador");
  if (error) throw error;
  return (data || []) as SegurancaIndicador[];
}

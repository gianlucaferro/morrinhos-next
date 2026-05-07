import { supabase } from "@/integrations/supabase/client";

export type BeneficioSocial = {
  id: string;
  municipio: string;
  programa: string;
  competencia: string;
  beneficiarios: number | null;
  valor_pago: number | null;
  unidade_medida: string | null;
  fonte_nome: string;
  fonte_url: string | null;
  data_coleta: string;
  observacoes: string | null;
  updated_at: string;
};

export async function fetchBeneficiosSociais(): Promise<BeneficioSocial[]> {
  const { data, error } = await supabase
    .from("beneficios_sociais")
    .select("*")
    .order("competencia", { ascending: false });
  if (error) throw error;
  return (data || []) as unknown as BeneficioSocial[];
}

import { supabase } from "@/integrations/supabase/client";

export type CdeSubsidio = {
  id: string;
  distribuidora: string;
  uf: string | null;
  ano: number;
  tipo_subsidio: string;
  beneficiarios: number | null;
  valor_subsidio: number | null;
  fonte_url: string | null;
  updated_at: string;
};

export async function fetchCdeSubsidios(): Promise<CdeSubsidio[]> {
  const { data, error } = await supabase
    .from("cde_subsidios")
    .select("*")
    .order("ano", { ascending: true });
  if (error) throw error;
  return (data || []) as unknown as CdeSubsidio[];
}

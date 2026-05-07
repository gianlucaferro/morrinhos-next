import "server-only";
import { unstable_cache } from "next/cache";
import { createPublicSupabaseClient } from "@/lib/supabase/public";
import type { InfraIndicador } from "./infraestrutura-client";

// Re-export pra compatibilidade (server-only — usado por server components)
export type { InfraIndicador } from "./infraestrutura-client";
export {
  getSaneamento,
  getEnergiaTarifas,
  getTelecom,
  getIluminacaoPavimentacao,
  getPolitica,
  findInfra,
  getSaneamentoDengue,
  getSaneamentoDetalhado,
  getEnergiaQualidade,
  getTelecomDetalhado,
  getIluminacaoPavimentacaoStatus,
} from "./infraestrutura-client";

export const fetchInfraestruturaIndicadores = unstable_cache(
  async (): Promise<InfraIndicador[]> => {
    const supabase = createPublicSupabaseClient();
    const { data } = await supabase
      .from("infraestrutura_indicadores")
      .select("*")
      .order("categoria", { ascending: true });
    return ((data ?? []) as InfraIndicador[]).map((r) => ({
      ...r,
      valor: r.valor !== null ? Number(r.valor) : null,
    }));
  },
  ["infraestrutura-indicadores"],
  { revalidate: 3600, tags: ["infraestrutura"] },
);

import "server-only";
import { unstable_cache } from "next/cache";
import { createPublicSupabaseClient } from "@/lib/supabase/public";

export type MapBiomasRow = {
  ano: number;
  classe_id: number;
  classe_nome: string;
  categoria: string;
  cor_hex: string | null;
  area_ha: number;
};

/**
 * Series completas por classe MapBiomas (1985-2024).
 * Dados da Coleção 10.1 (lancada fev/2026), atualizacao anual.
 */
export const fetchMapbiomasSerie = unstable_cache(
  async (): Promise<MapBiomasRow[]> => {
    const supabase = createPublicSupabaseClient();
    const { data } = await supabase
      .from("mapbiomas_uso_solo_anual")
      .select("ano, classe_id, classe_nome, categoria, cor_hex, area_ha")
      .order("classe_id", { ascending: true })
      .order("ano", { ascending: true });
    return ((data ?? []) as MapBiomasRow[]).map((r) => ({
      ...r,
      area_ha: Number(r.area_ha),
    }));
  },
  ["mapbiomas-serie"],
  { revalidate: 86400, tags: ["mapbiomas"] },
);

/**
 * Snapshot agregado por categoria pra um ano. Usado em cards de resumo.
 */
export async function getMapbiomasSnapshot(serie: MapBiomasRow[], ano: number) {
  const filtered = serie.filter((r) => r.ano === ano);
  const porCategoria: Record<string, number> = {};
  for (const r of filtered) {
    porCategoria[r.categoria] = (porCategoria[r.categoria] ?? 0) + r.area_ha;
  }
  return porCategoria;
}

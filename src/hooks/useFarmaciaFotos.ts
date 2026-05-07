import { useQuery } from "@tanstack/react-query";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
const supabase = createBrowserSupabaseClient();

export type FarmaciaInfo = {
  foto_url: string | null;
  telefone: string | null;
  tipo_telefone: "whatsapp" | "fixo" | null;
};

async function fetchFarmaciaFotos(): Promise<Map<string, FarmaciaInfo>> {
  const { data } = await supabase
    .from("farmacia_fotos")
    .select("nome, foto_url, telefone, tipo_telefone");

  const map = new Map<string, FarmaciaInfo>();
  (data || []).forEach((f: any) => map.set(f.nome, {
    foto_url: f.foto_url || null,
    telefone: f.telefone || null,
    tipo_telefone: f.tipo_telefone || null,
  }));
  return map;
}

export function useFarmaciaFotos() {
  return useQuery({
    queryKey: ["farmacia-fotos"],
    queryFn: fetchFarmaciaFotos,
    staleTime: 30 * 60 * 1000,
  });
}

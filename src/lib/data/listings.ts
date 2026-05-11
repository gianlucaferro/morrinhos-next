import "server-only";
import { unstable_cache } from "next/cache";
import { createPublicSupabaseClient } from "@/lib/supabase/public";

export const fetchNoticias = unstable_cache(
  async (limit = 30) => {
    const supabase = createPublicSupabaseClient();
    const { data, error } = await supabase
      .from("noticias")
      .select("id, title, link, source, pub_date, origem, image_url")
      .order("pub_date", { ascending: false, nullsFirst: false })
      .limit(limit);
    if (error) {
      console.error("fetchNoticias error:", error);
      return [];
    }
    return data || [];
  },
  ["listings-noticias"],
  { revalidate: 1800, tags: ["noticias"] }
);

export const fetchAtuacoesAll = unstable_cache(
  async (limit = 100) => {
    const supabase = createPublicSupabaseClient();
    const { data, error } = await supabase
      .from("atuacao_parlamentar")
      .select("id, tipo, numero, ano, descricao, autor_texto, data, resumo, fonte_url")
      .order("data", { ascending: false, nullsFirst: false })
      .limit(limit);
    if (error) {
      console.error("fetchAtuacoesAll error:", error);
      return [];
    }
    return data || [];
  },
  ["listings-atuacao"],
  { revalidate: 3600, tags: ["atuacao_parlamentar"] }
);

export const fetchEmendas = unstable_cache(
  async () => {
    const supabase = createPublicSupabaseClient();
    const { data, error } = await supabase
      .from("emendas_parlamentares")
      .select("*")
      .order("ano", { ascending: false })
      .order("valor_pago", { ascending: false });
    if (error) {
      console.error("fetchEmendas error:", error);
      return [];
    }
    return data || [];
  },
  ["listings-emendas"],
  { revalidate: 3600, tags: ["emendas"] }
);

export const fetchFarmaciasMeta = unstable_cache(
  async () => {
    const supabase = createPublicSupabaseClient();
    const { data, error } = await supabase
      .from("farmacia_fotos")
      .select("nome, foto_url, telefone, tipo_telefone");
    if (error) {
      console.error("fetchFarmaciasMeta error:", error);
      return [];
    }
    return data || [];
  },
  ["listings-farmacia-fotos"],
  { revalidate: 3600, tags: ["farmacia_fotos"] }
);

export type FarmaciaCadastrada = {
  id: string;
  nome: string;
  endereco: string | null;
  telefone: string | null;
  whatsapp: string | null;
  instagram_handle: string | null;
  facebook_handle: string | null;
  is_24h: boolean | null;
  fonte_url: string | null;
  observacao: string | null;
};

export const fetchFarmaciasCadastradas = unstable_cache(
  async (): Promise<FarmaciaCadastrada[]> => {
    const supabase = createPublicSupabaseClient();
    const { data, error } = await supabase
      .from("farmacias_cadastradas")
      .select("id, nome, endereco, telefone, whatsapp, instagram_handle, facebook_handle, is_24h, fonte_url, observacao")
      .eq("ativo", true)
      .order("nome");
    if (error) {
      console.error("fetchFarmaciasCadastradas error:", error);
      return [];
    }
    return data || [];
  },
  ["listings-farmacias-cadastradas"],
  { revalidate: 1800, tags: ["farmacias_cadastradas"] }
);

export type PlantaoFarmacia = {
  id: string;
  farmacia_nome: string;
  endereco: string | null;
  telefone: string | null;
  data_inicio: string;
  data_fim: string;
  horario_inicio: string | null;
  horario_fim: string | null;
  is_24h: boolean | null;
  fonte_url: string | null;
  observacao: string | null;
};

export const fetchPlantoesAtuaisEFuturos = unstable_cache(
  async (): Promise<PlantaoFarmacia[]> => {
    const supabase = createPublicSupabaseClient();
    const hoje = new Date().toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from("plantao_farmacias")
      .select("id, farmacia_nome, endereco, telefone, data_inicio, data_fim, horario_inicio, horario_fim, is_24h, fonte_url, observacao")
      .gte("data_fim", hoje)
      .order("data_inicio");
    if (error) {
      console.error("fetchPlantoesAtuaisEFuturos error:", error);
      return [];
    }
    return data || [];
  },
  ["listings-plantao-atual"],
  { revalidate: 900, tags: ["plantao_farmacias"] }
);

export const fetchZapEstabelecimentos = unstable_cache(
  async () => {
    const supabase = createPublicSupabaseClient();
    const { data, error } = await supabase
      .from("zap_establishments")
      .select("id, name, whatsapp, category, click_count, created_at")
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .order("name");
    if (error) {
      console.error("fetchZapEstabelecimentos error:", error);
      return [];
    }
    return data || [];
  },
  ["listings-zap"],
  { revalidate: 600, tags: ["zap_establishments"] }
);

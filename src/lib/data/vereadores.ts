import "server-only";
import { unstable_cache } from "next/cache";
import { createPublicSupabaseClient } from "@/lib/supabase/public";

export type Vereador = {
  id: string;
  nome: string;
  slug: string | null;
  foto_url: string | null;
  cargo_mesa: string | null;
  inicio_mandato: string | null;
  fim_mandato: string | null;
  fonte_url: string | null;
  votos_eleicao: number | null;
  ano_eleicao: number | null;
  partido: string | null;
  email: string | null;
  telefone: string | null;
  instagram: string | null;
};

export const fetchVereadoresLista = unstable_cache(
  async (): Promise<Vereador[]> => {
    const supabase = createPublicSupabaseClient();
    const { data, error } = await supabase
      .from("vereadores")
      .select("id, nome, slug, foto_url, cargo_mesa, inicio_mandato, fim_mandato, fonte_url, votos_eleicao, ano_eleicao, partido, email, telefone, instagram")
      .order("nome", { ascending: true });
    if (error) {
      console.error("fetchVereadoresLista error:", error);
      return [];
    }
    return (data || []) as Vereador[];
  },
  ["vereadores-lista"],
  { revalidate: 3600, tags: ["vereadores"] }
);

export const fetchVereadorBySlug = unstable_cache(
  async (slug: string) => {
    const supabase = createPublicSupabaseClient();
    const { data: vereador, error } = await supabase
      .from("vereadores")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();
    if (error || !vereador) {
      console.error("fetchVereadorBySlug error:", error);
      return null;
    }

    const [{ data: remuneracoes }, { data: atuacoes }, { data: projetos }, presencas] = await Promise.all([
      supabase
        .from("remuneracao_mensal")
        .select("competencia, bruto, liquido, subsidio_referencia")
        .eq("vereador_id", vereador.id)
        .order("competencia", { ascending: false })
        .limit(24),
      supabase
        .from("atuacao_parlamentar")
        .select("id, tipo, numero, ano, descricao, data, resumo, fonte_url")
        .eq("autor_vereador_id", vereador.id)
        .order("data", { ascending: false, nullsFirst: false })
        .limit(20),
      supabase
        .from("projetos")
        .select("id, tipo, numero, ano, ementa, status, data, fonte_visualizar_url, resumo_simples")
        .eq("autor_vereador_id", vereador.id)
        .order("data", { ascending: false, nullsFirst: false })
        .limit(20),
      (async () => {
        const { data } = await supabase
          .from("presenca_sessoes")
          .select("presente, sessao_data, sessao_titulo")
          .eq("vereador_id", vereador.id);
        const total = data?.length ?? 0;
        const presentes = (data || []).filter((p) => p.presente).length;
        return {
          total,
          presentes,
          faltas: total - presentes,
          taxa: total > 0 ? Math.round((presentes / total) * 100) : null,
          ultimas: (data || []).slice(0, 10),
        };
      })(),
    ]);

    const custoTotal = (remuneracoes || []).reduce((sum, r) => sum + Number(r.bruto || 0), 0);

    return {
      vereador,
      remuneracoes: remuneracoes || [],
      atuacoes: atuacoes || [],
      projetos: projetos || [],
      presencas,
      custoTotal,
    };
  },
  ["vereador-by-slug"],
  { revalidate: 3600, tags: ["vereadores"] }
);

export async function listVereadorSlugs(): Promise<string[]> {
  const supabase = createPublicSupabaseClient();
  const { data } = await supabase.from("vereadores").select("slug").not("slug", "is", null);
  return (data || []).map((r: { slug: string | null }) => r.slug!).filter(Boolean);
}

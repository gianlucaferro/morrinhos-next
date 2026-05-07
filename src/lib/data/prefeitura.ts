import "server-only";
import { unstable_cache } from "next/cache";
import { createPublicSupabaseClient } from "@/lib/supabase/public";

export const fetchPrefeituraOverview = unstable_cache(
  async () => {
    const supabase = createPublicSupabaseClient();

    const [executivo, secretarias, servidoresCount, contratosResumo, obras, licitacoesAbertas, despesasAno] = await Promise.all([
      supabase.from("executivo").select("*").order("tipo"),
      supabase.from("secretarias").select("id, nome, secretario_nome, foto_url, subsidio, email, telefone").order("nome"),
      (async () => {
        const { count } = await supabase
          .from("servidores")
          .select("*", { count: "exact", head: true })
          .eq("orgao_tipo", "prefeitura");
        return count ?? 0;
      })(),
      (async () => {
        const { count } = await supabase
          .from("contratos")
          .select("*", { count: "exact", head: true })
          .eq("status", "ativo");
        return count ?? 0;
      })(),
      (async () => {
        const { count } = await supabase
          .from("obras")
          .select("*", { count: "exact", head: true });
        return count ?? 0;
      })(),
      (async () => {
        const { count } = await supabase
          .from("licitacoes")
          .select("*", { count: "exact", head: true });
        return count ?? 0;
      })(),
      (async () => {
        const { count } = await supabase
          .from("despesas")
          .select("*", { count: "exact", head: true });
        return count ?? 0;
      })(),
    ]);

    return {
      executivo: executivo.data || [],
      secretarias: secretarias.data || [],
      servidoresCount,
      contratosAtivos: contratosResumo,
      obras,
      licitacoes: licitacoesAbertas,
      despesas: despesasAno,
    };
  },
  ["prefeitura-overview"],
  { revalidate: 3600, tags: ["prefeitura"] }
);

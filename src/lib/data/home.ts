import "server-only";
import { unstable_cache } from "next/cache";
import { createPublicSupabaseClient } from "@/lib/supabase/public";

export type Indicador = {
  chave: string;
  valor: number | null;
  valor_texto: string | null;
  ano_referencia: number;
  fonte_url: string | null;
  atualizado_em: string;
};

export type EmendaParlamentar = {
  id: string;
  parlamentar_nome: string;
  parlamentar_esfera: string;
  valor_empenhado: number;
  valor_pago: number;
  objeto: string | null;
  ano: number;
  fonte_url: string | null;
  atualizado_em: string;
};

export const fetchIndicadores = unstable_cache(
  async (): Promise<Indicador[]> => {
    const supabase = createPublicSupabaseClient();
    const { data, error } = await supabase.from("indicadores_municipais").select("*");
    if (error) {
      console.error("fetchIndicadores error:", error);
      return [];
    }
    return (data || []) as Indicador[];
  },
  ["home-indicadores"],
  { revalidate: 3600, tags: ["indicadores"] }
);

export const fetchEmendas = unstable_cache(
  async (ano?: number): Promise<EmendaParlamentar[]> => {
    const supabase = createPublicSupabaseClient();
    let query = supabase.from("emendas_parlamentares").select("*");
    if (ano) query = query.eq("ano", ano);
    const { data, error } = await query.order("valor_pago", { ascending: false });
    if (error) {
      console.error("fetchEmendas error:", error);
      return [];
    }
    return (data || []) as EmendaParlamentar[];
  },
  ["home-emendas"],
  { revalidate: 3600, tags: ["emendas"] }
);

export const fetchContratosResumo = unstable_cache(
  async () => {
    const supabase = createPublicSupabaseClient();
    const allData: { empresa: string | null; valor: number | null; status: string | null }[] = [];
    let from = 0;
    const PAGE = 1000;
    while (true) {
      const { data, error } = await supabase
        .from("contratos")
        .select("empresa, valor, status")
        .range(from, from + PAGE - 1);
      if (error) {
        console.error("fetchContratosResumo error:", error);
        break;
      }
      if (!data || data.length === 0) break;
      allData.push(...data);
      if (data.length < PAGE) break;
      from += PAGE;
    }
    const ativos = allData.filter((c) => c.status === "ativo");
    const valorTotal = ativos.reduce((sum, c) => sum + (c.valor || 0), 0);

    const fornecedorMap = new Map<string, number>();
    ativos.forEach((c) => {
      if (c.empresa) {
        fornecedorMap.set(c.empresa, (fornecedorMap.get(c.empresa) || 0) + (c.valor || 0));
      }
    });
    let maiorFornecedor = { nome: "", valor: 0 };
    fornecedorMap.forEach((valor, nome) => {
      if (valor > maiorFornecedor.valor) maiorFornecedor = { nome, valor };
    });

    return { ativos: ativos.length, valorTotal, maiorFornecedor };
  },
  ["home-contratos-resumo"],
  { revalidate: 3600, tags: ["contratos"] }
);

export const fetchVereadoresHome = unstable_cache(
  async () => {
    const supabase = createPublicSupabaseClient();
    const { data, error } = await supabase
      .from("vereadores")
      .select("id, nome, slug, partido, foto_url, custo_total")
      .order("custo_total", { ascending: false, nullsFirst: false })
      .limit(10);
    if (error) {
      console.error("fetchVereadoresHome error:", error);
      return [];
    }
    return data || [];
  },
  ["home-vereadores"],
  { revalidate: 3600, tags: ["vereadores"] }
);

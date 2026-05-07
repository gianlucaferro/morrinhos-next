/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from "@/integrations/supabase/client";

// Types
export type SaudeRepasse = {
  id: string;
  ano: number;
  mes: number;
  bloco: string;
  componente: string | null;
  valor: number;
  fonte_url: string | null;
  updated_at: string;
};

export type SaudeEstabelecimento = {
  id: string;
  cnes: string;
  nome: string;
  tipo: string | null;
  endereco: string | null;
  telefone: string | null;
  latitude: number | null;
  longitude: number | null;
  profissionais_count: number | null;
  leitos_count: number | null;
  fonte_url: string | null;
};

export type SaudeIndicador = {
  id: string;
  categoria: string;
  indicador: string;
  ano: number;
  mes: number | null;
  semana_epidemiologica: number | null;
  valor: number | null;
  valor_texto: string | null;
  fonte: string | null;
  fonte_url: string | null;
};

export type SaudeEquipe = {
  id: string;
  tipo: string;
  nome: string | null;
  area: string | null;
  unidade: string | null;
  profissionais: any;
  ativa: boolean;
  fonte_url: string | null;
};

export async function fetchSaudeEstabelecimentos(): Promise<SaudeEstabelecimento[]> {
  const { data, error } = await supabase
    .from("saude_estabelecimentos")
    .select("*")
    .order("nome");
  if (error) throw error;
  return (data || []) as SaudeEstabelecimento[];
}

export async function fetchSaudeIndicadores(categoria?: string, ano?: number, indicador?: string): Promise<SaudeIndicador[]> {
  let query = supabase
    .from("saude_indicadores")
    .select("*")
    .order("ano", { ascending: false })
    .order("mes", { ascending: false });

  if (indicador) {
    query = query.eq("indicador", indicador);
  } else if (categoria && ["dengue", "chikungunya", "zika"].includes(categoria)) {
    query = query.eq("indicador", "casos_mes");
  }
  // For hiv, vacinacao, mortalidade, don't filter by indicador to get all sub-indicators

  if (categoria) query = query.eq("categoria", categoria);
  if (ano) query = query.eq("ano", ano);

  const { data, error } = await query.limit(1000);
  if (error) throw error;
  return (data || []) as SaudeIndicador[];
}

export async function fetchSaudeRepasses(ano?: number): Promise<SaudeRepasse[]> {
  let query = supabase
    .from("saude_repasses")
    .select("*")
    .order("ano", { ascending: false })
    .order("mes", { ascending: false });

  if (ano) query = query.eq("ano", ano);

  const { data, error } = await query.limit(500);
  if (error) throw error;
  return (data || []) as SaudeRepasse[];
}

export async function fetchSaudeEquipes(): Promise<SaudeEquipe[]> {
  const { data, error } = await supabase
    .from("saude_equipes")
    .select("*")
    .order("tipo");
  if (error) throw error;
  return (data || []) as SaudeEquipe[];
}

// Servidores da Saúde (reusa tabela servidores existente)
export async function fetchServidoresSaude(page = 0, pageSize = 30) {
  // Buscar secretaria de saúde
  const { data: secData } = await supabase
    .from("secretarias")
    .select("id")
    .ilike("nome", "%Saúde%")
    .limit(1);

  const secId = secData?.[0]?.id;

  // Buscar servidores com cargo relacionado a saúde ou lotados na sec. saúde
  let query = supabase
    .from("servidores")
    .select("id, nome, cargo, orgao_tipo", { count: "exact" });

  if (secId) {
    query = query.or(`secretaria_id.eq.${secId},cargo.ilike.%saude%,cargo.ilike.%enferm%,cargo.ilike.%medic%,cargo.ilike.%odont%,cargo.ilike.%farmac%,cargo.ilike.%fisioter%,cargo.ilike.%nutrici%,cargo.ilike.%psicologo%,cargo.ilike.%agente%comunit%`);
  } else {
    query = query.or("cargo.ilike.%saude%,cargo.ilike.%enferm%,cargo.ilike.%medic%,cargo.ilike.%odont%,cargo.ilike.%farmac%,cargo.ilike.%fisioter%,cargo.ilike.%nutrici%,cargo.ilike.%psicologo%,cargo.ilike.%agente%comunit%");
  }

  const from = page * pageSize;
  const { data, count, error } = await query
    .eq("orgao_tipo", "prefeitura")
    .order("nome")
    .range(from, from + pageSize - 1);

  if (error) throw error;

  // Get latest remuneracao for each
  const servidores = data || [];
  if (!servidores.length) return { data: [], count: 0 };

  const ids = servidores.map(s => s.id);
  const { data: rems } = await supabase
    .from("remuneracao_servidores")
    .select("servidor_id, bruto, liquido, competencia")
    .in("servidor_id", ids)
    .order("competencia", { ascending: false });

  const remMap = new Map<string, any>();
  for (const r of rems || []) {
    if (!remMap.has(r.servidor_id)) remMap.set(r.servidor_id, r);
  }

  return {
    data: servidores.map(s => ({ ...s, remuneracao: remMap.get(s.id) || null })),
    count: count ?? 0,
  };
}

// Despesas da Saúde
export async function fetchDespesasSaude(ano?: number) {
  const { data: secData } = await supabase
    .from("secretarias")
    .select("id")
    .ilike("nome", "%Saúde%")
    .limit(1);

  const secId = secData?.[0]?.id;
  if (!secId) return [];

  let query = supabase
    .from("despesas")
    .select("*")
    .eq("secretaria_id", secId)
    .order("data", { ascending: false });

  if (ano) {
    query = query.gte("data", `${ano}-01-01`).lte("data", `${ano}-12-31`);
  }

  const { data, error } = await query.limit(500);
  if (error) throw error;
  return data || [];
}

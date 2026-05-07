import { supabase } from "@/integrations/supabase/client";

export type AgroIndicador = {
  id: string;
  categoria: string;
  chave: string;
  valor: number | null;
  valor_texto: string | null;
  unidade: string | null;
  ano_referencia: number;
  fonte_url: string | null;
};

export async function fetchAgroIndicadores(): Promise<AgroIndicador[]> {
  const { data, error } = await supabase
    .from("agro_indicadores")
    .select("*")
    .order("categoria")
    .order("chave");
  if (error) throw error;
  return (data || []) as AgroIndicador[];
}

export type HistoricoSerie = { ano: number; valor: number };
export type HistoricoBovino = HistoricoSerie;

export function extractHistoricoBovino(indicadores: AgroIndicador[]): HistoricoSerie[] {
  return indicadores
    .filter(i => i.categoria === "historico_bovino" && i.valor !== null)
    .map(i => ({ ano: i.ano_referencia, valor: i.valor! }))
    .sort((a, b) => a.ano - b.ano);
}

export function extractHistoricoLeite(indicadores: AgroIndicador[]): HistoricoSerie[] {
  return indicadores
    .filter(i => i.categoria === "historico_leite" && i.valor !== null)
    .map(i => ({ ano: i.ano_referencia, valor: i.valor! }))
    .sort((a, b) => a.ano - b.ano);
}

export type ComparativoMunicipio = { nome: string; valor: number };

export type DadoTrimestral = { trimestre: string; valor: number; ano: number };

export function extractTrimestral(indicadores: AgroIndicador[], categoria: string): DadoTrimestral[] {
  return indicadores
    .filter(i => i.categoria === categoria && i.valor !== null)
    .map(i => {
      const code = i.chave.replace(/^(abate_bov_|leite_go_)/, "");
      const ano = parseInt(code.substring(0, 4));
      const tri = parseInt(code.substring(4, 6));
      return { trimestre: `${tri}ºT/${ano}`, valor: i.valor!, ano };
    })
    .sort((a, b) => a.trimestre.localeCompare(b.trimestre));
}

const VIZINHOS_NOMES: Record<string, string> = {
  "5213806": "Morrinhos",
  "5208004": "Goiatuba",
  "5211404": "Joviânia",
  "5204003": "Bom Jesus de Goiás",
  "5213707": "Morrinhos",
  "5206206": "Cromínia",
  "5214507": "Orizona",
};

export function extractComparativo(indicadores: AgroIndicador[], categoriaPrefix: string): ComparativoMunicipio[] {
  return indicadores
    .filter(i => i.categoria === categoriaPrefix && i.valor !== null)
    .map(i => {
      const codMun = i.chave.replace("viz_", "").replace("leite_", "");
      return { nome: VIZINHOS_NOMES[codMun] || codMun, valor: i.valor! };
    })
    .sort((a, b) => b.valor - a.valor);
}

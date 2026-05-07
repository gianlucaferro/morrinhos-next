import { createBrowserSupabaseClient } from "@/lib/supabase/client";
const supabase = createBrowserSupabaseClient();
import type { Database } from "@/lib/supabase/types";

export type ContratoAditivoRow = Pick<
  Database["public"]["Tables"]["contratos_aditivos"]["Row"],
  "contrato_numero" | "credor" | "valor" | "termo" | "tipo_aditivo" | "cnpj" | "centi_id" | "fonte_url"
>;

const PAGE_SIZE = 1000;

export async function fetchContratosAditivos(): Promise<ContratoAditivoRow[]> {
  const allRows: ContratoAditivoRow[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("contratos_aditivos")
      .select("contrato_numero, credor, valor, termo, tipo_aditivo, cnpj, centi_id, fonte_url")
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;
    if (!data?.length) break;

    allRows.push(...data);

    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return allRows;
}

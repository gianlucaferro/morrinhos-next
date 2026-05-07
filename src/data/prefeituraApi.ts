import { createBrowserSupabaseClient } from "@/lib/supabase/client";
const supabase = createBrowserSupabaseClient();

// Types
export type Executivo = {
  id: string;
  tipo: string;
  nome: string;
  foto_url: string | null;
  partido: string | null;
  mandato_inicio: string;
  mandato_fim: string;
  telefone: string | null;
  email: string | null;
  horario: string | null;
  endereco: string | null;
  fonte_url: string;
  updated_at: string;
};

export type Secretaria = {
  id: string;
  nome: string;
  secretario_nome: string | null;
  contato: string | null;
  email: string | null;
  telefone: string | null;
  foto_url: string | null;
  fonte_url: string | null;
  subsidio: number | null;
  updated_at: string;
};

export type Servidor = {
  id: string;
  nome: string;
  cargo: string | null;
  secretaria_id: string | null;
  fonte_url: string | null;
  updated_at: string;
};

export type RemuneracaoServidor = {
  id: string;
  servidor_id: string;
  competencia: string;
  bruto: number | null;
  liquido: number | null;
  fonte_url: string | null;
  updated_at: string;
};

export type Despesa = {
  id: string;
  data: string;
  favorecido: string | null;
  valor: number;
  descricao: string | null;
  secretaria_id: string | null;
  fonte_url: string | null;
  updated_at: string;
};

export type Contrato = {
  id: string;
  numero: string | null;
  empresa: string | null;
  valor: number | null;
  objeto: string | null;
  vigencia_inicio: string | null;
  vigencia_fim: string | null;
  status: string | null;
  secretaria_id: string | null;
  fonte_url: string | null;
  updated_at: string;
};

export type Licitacao = {
  id: string;
  numero: string | null;
  modalidade: string | null;
  objeto: string | null;
  status: string | null;
  data_publicacao: string | null;
  data_resultado: string | null;
  secretaria_id: string | null;
  fonte_url: string | null;
  updated_at: string;
};

export type Diaria = {
  id: string;
  servidor_id: string | null;
  servidor_nome: string | null;
  destino: string | null;
  motivo: string | null;
  valor: number | null;
  data: string | null;
  fonte_url: string | null;
  updated_at: string;
};

export type Obra = {
  id: string;
  nome: string;
  local: string | null;
  valor: number | null;
  empresa: string | null;
  status: string | null;
  fonte_url: string | null;
  updated_at: string;
};

// Fetch functions
export async function fetchExecutivo(): Promise<Executivo[]> {
  const { data, error } = await supabase
    .from("executivo")
    .select("*")
    .order("tipo");
  if (error) throw error;
  return (data || []) as Executivo[];
}

export type ExecutivoRemuneracao = {
  nome: string;
  bruto: number | null;
  liquido: number | null;
  competencia: string;
};

export async function fetchExecutivoRemuneracao(): Promise<ExecutivoRemuneracao[]> {
  // Get executive names
  const { data: exec } = await supabase.from("executivo").select("nome");
  if (!exec?.length) return [];

  const results: ExecutivoRemuneracao[] = [];
  for (const e of exec) {
    const nameUpper = e.nome.toUpperCase();
    // Find matching servidor — SEMPRE filtrar orgao_tipo='prefeitura'
    // para evitar casar homônimo da Câmara
    const { data: srvs } = await supabase
      .from("servidores")
      .select("id, nome")
      .eq("orgao_tipo", "prefeitura")
      .ilike("nome", `%${nameUpper}%`)
      .limit(1);
    if (!srvs?.length) continue;

    // Get latest remuneracao
    const { data: rem } = await supabase
      .from("remuneracao_servidores")
      .select("bruto, liquido, competencia")
      .eq("servidor_id", srvs[0].id)
      .order("competencia", { ascending: false })
      .limit(1);
    if (rem?.length) {
      results.push({ nome: e.nome, bruto: rem[0].bruto, liquido: rem[0].liquido, competencia: rem[0].competencia });
    }
  }
  return results;
}

export async function fetchSecretarias(): Promise<Secretaria[]> {
  const { data, error } = await supabase
    .from("secretarias")
    .select("*")
    .order("nome");
  if (error) throw error;
  return (data || []) as Secretaria[];
}

export type SecretarioRemuneracao = {
  secretaria_id: string;
  bruto: number | null;
  liquido: number | null;
  competencia: string;
};

function removeAccents(str: string): string {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export async function fetchSecretariosRemuneracao(secretarias: Secretaria[]): Promise<Record<string, SecretarioRemuneracao>> {
  const withNome = secretarias.filter(s => s.secretario_nome);
  if (!withNome.length) return {};

  // Build search terms: extract significant name parts (>2 chars)
  const searchEntries: { sec: Secretaria; parts: string[] }[] = [];
  for (const sec of withNome) {
    const parts = removeAccents(sec.secretario_nome!.toUpperCase())
      .split(/\s+/)
      .filter(p => p.length > 2);
    if (parts.length >= 2) {
      searchEntries.push({ sec, parts });
    }
  }

  if (!searchEntries.length) return {};

  // Fetch all servidores matching any of the first names — APENAS Prefeitura
  // (secretários nunca podem casar com servidor da Câmara)
  const firstNames = [...new Set(searchEntries.map(p => p.parts[0]))];
  const orFilter = firstNames.map(fn => `nome.ilike.${fn}%`).join(",");
  const { data: allServidoresRaw } = await supabase
    .from("servidores")
    .select("id, nome")
    .eq("orgao_tipo", "prefeitura")
    .or(orFilter);
  const allServidores: { id: string; nome: string }[] = allServidoresRaw || [];

  if (!allServidores.length) return {};

  // Match: find best servidor for each secretário using multiple name parts
  // Score = number of significant name parts that appear in the servidor name
  const matched: { secId: string; servidorId: string }[] = [];
  for (const { sec, parts } of searchEntries) {
    let bestMatch: { id: string; score: number } | null = null;
    for (const srv of allServidores) {
      const srvNorm = removeAccents(srv.nome.toUpperCase());
      // Count how many name parts match (exact substring or first 4 chars match)
      let score = 0;
      for (const part of parts) {
        if (srvNorm.includes(part)) {
          score++;
        } else if (part.length >= 4) {
          // Partial match: check if first 4 chars of the part appear as a word start
          const prefix = part.substring(0, 4);
          if (srvNorm.split(/\s+/).some(w => w.startsWith(prefix))) score += 0.5;
        }
      }
      // Require at least first name + one more part to match
      if (score >= 2 && (!bestMatch || score > bestMatch.score)) {
        bestMatch = { id: srv.id, score };
      }
    }
    if (bestMatch) matched.push({ secId: sec.id, servidorId: bestMatch.id });
  }

  if (!matched.length) return {};

  const servidorIds = matched.map(m => m.servidorId);

  // Get latest remuneração for each matched servidor
  const { data: rems } = await supabase
    .from("remuneracao_servidores")
    .select("servidor_id, bruto, liquido, competencia")
    .in("servidor_id", servidorIds)
    .order("competencia", { ascending: false });

  if (!rems?.length) return {};

  const result: Record<string, SecretarioRemuneracao> = {};
  for (const { secId, servidorId } of matched) {
    const latest = rems.find(r => r.servidor_id === servidorId);
    if (latest) {
      result[secId] = {
        secretaria_id: secId,
        bruto: latest.bruto,
        liquido: latest.liquido,
        competencia: latest.competencia,
      };
    }
  }

  return result;
}

export async function fetchServidores(search?: string, secretariaId?: string, page = 0, pageSize = 30, orgaoTipo?: string): Promise<{ data: Servidor[]; count: number }> {
  let query = supabase.from("servidores").select("*", { count: "exact" });
  if (search) query = query.ilike("nome", `%${search}%`);
  if (secretariaId) query = query.eq("secretaria_id", secretariaId);
  if (orgaoTipo) query = query.eq("orgao_tipo", orgaoTipo);
  const from = page * pageSize;
  const to = from + pageSize - 1;
  const { data, error, count } = await query.order("nome").range(from, to);
  if (error) throw error;
  return { data: (data || []) as Servidor[], count: count ?? 0 };
}

export async function fetchDespesas(): Promise<Despesa[]> {
  const { data, error } = await supabase
    .from("despesas")
    .select("*")
    .order("data", { ascending: false });
  if (error) throw error;
  return (data || []) as Despesa[];
}

export async function fetchContratos(): Promise<Contrato[]> {
  const COLS = "id,numero,empresa,valor,objeto,vigencia_inicio,vigencia_fim,status,secretaria_id,fonte_url,updated_at";
  const allData: Contrato[] = [];
  let from = 0;
  const PAGE = 1000;
  while (true) {
    const { data, error } = await supabase
      .from("contratos")
      .select(COLS)
      .order("vigencia_inicio", { ascending: false })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    allData.push(...(data as Contrato[]));
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return allData;
}

export async function fetchLicitacoes(): Promise<Licitacao[]> {
  const { data, error } = await supabase
    .from("licitacoes")
    .select("*")
    .order("data_publicacao", { ascending: false });
  if (error) throw error;
  return (data || []) as Licitacao[];
}

export async function fetchDiarias(): Promise<Diaria[]> {
  const { data, error } = await supabase
    .from("diarias")
    .select("*")
    .order("data", { ascending: false });
  if (error) throw error;
  return (data || []) as Diaria[];
}

export async function fetchObras(): Promise<Obra[]> {
  const { data, error } = await supabase
    .from("obras")
    .select("*")
    .order("nome");
  if (error) throw error;
  return (data || []) as Obra[];
}

export async function fetchProcuradores() {
  const { data: servidores, error } = await supabase
    .from("servidores")
    .select("id, nome, cargo")
    .ilike("cargo", "%procurad%")
    .eq("orgao_tipo", "prefeitura")
    .order("nome");
  if (error) throw error;
  if (!servidores?.length) return [];

  // Fetch latest remuneration for each procurador
  const results = await Promise.all(
    servidores.map(async (s) => {
      const { data: rem } = await supabase
        .from("remuneracao_servidores")
        .select("competencia, bruto, liquido")
        .eq("servidor_id", s.id)
        .order("competencia", { ascending: false })
        .limit(3);
      return { ...s, remuneracoes: rem || [] };
    })
  );
  return results;
}

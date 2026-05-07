import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MUNICIPIO = "5213806";
const IBGE_FONTE = "https://cidades.ibge.gov.br/brasil/go/morrinhos/panorama";

// Fetch value from IBGE pesquisas API with explicit period
async function fetchPesquisa(pesquisa: number, indicador: number, periodo: string): Promise<{ valor: number; ano: number } | null> {
  try {
    const url = `https://servicodados.ibge.gov.br/api/v1/pesquisas/${pesquisa}/periodos/${periodo}/indicadores/${indicador}/resultados/${MUNICIPIO}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const raw = data?.[0]?.res?.[0]?.res?.[periodo];
    if (!raw || raw === "-" || raw === "..." || raw === "X" || raw === "") return null;
    const val = parseFloat(String(raw).replace(",", "."));
    if (isNaN(val)) return null;
    return { valor: val, ano: parseInt(periodo) };
  } catch (e) {
    console.error(`Erro pesquisa ${pesquisa}/${indicador}/${periodo}:`, e);
    return null;
  }
}

// Try multiple periods descending until one returns data
async function fetchPesquisaLatest(pesquisa: number, indicador: number, periodos: string[]): Promise<{ valor: number; ano: number } | null> {
  for (const p of periodos) {
    const result = await fetchPesquisa(pesquisa, indicador, p);
    if (result) return result;
  }
  return null;
}

// Population uses agregados API
async function fetchPopulacao(): Promise<{ valor: number; ano: number } | null> {
  try {
    const res = await fetch(
      `https://servicodados.ibge.gov.br/api/v3/agregados/6579/periodos/-1/variaveis/9324?localidades=N6[${MUNICIPIO}]`
    );
    if (!res.ok) return null;
    const data = await res.json();
    const serie = data?.[0]?.resultados?.[0]?.series?.[0]?.serie;
    if (!serie) return null;
    const anos = Object.keys(serie).sort().reverse();
    for (const ano of anos) {
      const pop = parseInt(serie[ano]);
      if (!isNaN(pop) && pop > 0) return { valor: pop, ano: parseInt(ano) };
    }
    return null;
  } catch { return null; }
}

type IndicadorSync = {
  chave: string;
  fetch: () => Promise<{ valor: number; ano: number } | null>;
  formatTexto: (v: number) => string;
};

const INDICADORES: IndicadorSync[] = [
  {
    chave: "populacao",
    fetch: fetchPopulacao,
    formatTexto: (v) => `${v.toLocaleString("pt-BR")} habitantes`,
  },
  {
    chave: "pib_per_capita",
    // Pesquisa 38, ind 47001 = PIB per capita série revisada
    fetch: () => fetchPesquisaLatest(38, 47001, ["2023", "2022", "2021"]),
    formatTexto: (v) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
  },
  {
    chave: "ideb_anos_iniciais",
    // Pesquisa 40, ind 78187 = IDEB Anos Iniciais - Rede Pública
    fetch: () => fetchPesquisaLatest(40, 78187, ["2023", "2021", "2019"]),
    formatTexto: (v) => v.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
  },
  {
    chave: "saneamento_cobertura",
    // Pesquisa 23, ind 60030 retorna dado antigo (2010). Usar valor fixo do IBGE Panorama 2022.
    fetch: async () => ({ valor: 69.11, ano: 2022 }),
    formatTexto: (v) => `${v.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`,
  },
  {
    chave: "salario_medio_formal",
    // API IBGE retorna dado antigo. Usar valor fixo do IBGE Panorama 2023.
    fetch: async () => ({ valor: 2.2, ano: 2023 }),
    formatTexto: (v) => `${v.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} salários mínimos`,
  },
  {
    chave: "pessoal_ocupado_formal",
    // API IBGE retorna dado antigo. Usar valor fixo do IBGE Panorama 2023.
    fetch: async () => ({ valor: 4047, ano: 2023 }),
    formatTexto: (v) => `${v.toLocaleString("pt-BR")} pessoas`,
  },
  {
    chave: "populacao_ate_meio_sm",
    // Pesquisa 23, ind 60054 — dados do Censo 2010
    fetch: () => fetchPesquisaLatest(23, 60054, ["2010"]),
    formatTexto: (v) => `${v.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`,
  },
  {
    chave: "frota_veiculos",
    // Pesquisa 22, ind 28120 = Total de veículos (SENATRAN)
    fetch: () => fetchPesquisaLatest(22, 28120, ["2024", "2023", "2022"]),
    formatTexto: (v) => `${v.toLocaleString("pt-BR")} veículos`,
  },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: logEntry } = await supabase
    .from("sync_log")
    .insert({ tipo: "indicadores_home", status: "running" })
    .select("id")
    .single();

  const logId = logEntry?.id;
  const resultados: Record<string, string> = {};

  try {
    for (const cfg of INDICADORES) {
      try {
        const result = await cfg.fetch();
        if (result) {
          await supabase.from("indicadores_municipais").upsert({
            chave: cfg.chave,
            valor: result.valor,
            valor_texto: cfg.formatTexto(result.valor),
            ano_referencia: result.ano,
            fonte_url: IBGE_FONTE,
            atualizado_em: new Date().toISOString(),
          }, { onConflict: "chave" });
          resultados[cfg.chave] = `OK: ${cfg.formatTexto(result.valor)} (${result.ano})`;
        } else {
          resultados[cfg.chave] = "Sem dados na API";
        }
      } catch (e) {
        resultados[cfg.chave] = `Falha: ${e.message}`;
      }
    }

    if (logId) {
      await supabase.from("sync_log").update({
        status: "success",
        finished_at: new Date().toISOString(),
        detalhes: resultados,
      }).eq("id", logId);
    }

    return new Response(
      JSON.stringify({ success: true, resultados }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    if (logId) {
      await supabase.from("sync_log").update({
        status: "error",
        finished_at: new Date().toISOString(),
        detalhes: { error: error.message, ...resultados },
      }).eq("id", logId);
    }

    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SICONFI_BASE = "https://apidatalake.tesouro.gov.br/ords/siconfi/tt";

// Morrinhos and comparable GO municipalities (pop 45k-65k, Censo 2022)
// Reduced sample of 8 comparable municipalities to stay within timeout
// TODO_VERIFY: revisar códigos IBGE quando sync rodar pela primeira vez
const MUNICIPIOS = [
  { nome: "Morrinhos", ibge: "5213806", pop: 51351 },
  { nome: "Inhumas", ibge: "5210109", pop: 51972 },
  { nome: "Quirinópolis", ibge: "5218300", pop: 50749 },
  { nome: "Goianésia", ibge: "5208202", pop: 64058 },
  { nome: "Mineiros", ibge: "5213103", pop: 63013 },
  { nome: "Cristalina", ibge: "5206206", pop: 60018 },
  { nome: "Niquelândia", ibge: "5214803", pop: 45083 },
  { nome: "Goiatuba", ibge: "5208608", pop: 33335 },
];

type CategoriaMap = { categoria: string; tipo: string };

function mapConta(conta: string): CategoriaMap | null {
  const c = (conta || "").toUpperCase();
  if (c.includes("IPTU") || c.includes("IMPOSTO SOBRE A PROPRIEDADE PREDIAL"))
    return { categoria: "IPTU", tipo: "receita_propria" };
  if (c.includes("ISS") || c.includes("ISSQN") || c.includes("IMPOSTO SOBRE SERVIÇOS"))
    return { categoria: "ISSQN", tipo: "receita_propria" };
  if (c.includes("ITBI") || c.includes("TRANSMISS") || c.includes("INTER VIVOS"))
    return { categoria: "ITBI", tipo: "receita_propria" };
  if (c.includes("IRRF") || c.includes("IMPOSTO DE RENDA RETIDO") || c.includes("RENDA - RETIDO NA FONTE") || c.includes("IMPOSTO SOBRE A RENDA"))
    return { categoria: "IRRF", tipo: "receita_propria" };
  if (c.includes("TAXAS"))
    return { categoria: "Taxas", tipo: "receita_propria" };
  if ((c.includes("CONTRIBUI") && (c.includes("ILUMINAÇÃO") || c.includes("COSIP"))) || (c.includes("CONTRIBUI") && c.includes("MELHORIA")))
    return { categoria: "Contribuições", tipo: "receita_propria" };
  return null;
}

async function fetchDCA(ibge: string, ano: number): Promise<any[]> {
  const url = `${SICONFI_BASE}/dca?an_exercicio=${ano}&no_anexo=DCA-Anexo%20I-C&id_ente=${ibge}`;
  try {
    const resp = await fetch(url);
    if (!resp.ok) return [];
    const data = await resp.json();
    return data?.items || [];
  } catch {
    return [];
  }
}

function extractReceitas(items: any[]): Record<string, number> {
  const result: Record<string, number> = {};
  for (const item of items) {
    if (item.coluna !== "Receitas Brutas Realizadas") continue;
    const mapped = mapConta(item.conta || "");
    if (!mapped) continue;
    // Use the broader account (shorter cod_conta) to avoid double-counting
    const key = mapped.categoria;
    // Only keep the value from the most general account per category
    if (!result[key] || (item.cod_conta || "").length < (result[`${key}_cod`] || "ZZZZZZZZ").length) {
      result[key] = item.valor || 0;
      result[`${key}_cod`] = item.cod_conta || "";
    }
  }
  // Remove cod tracking keys
  for (const k of Object.keys(result)) {
    if (k.endsWith("_cod")) delete result[k];
  }
  // Calculate total receita própria
  result["receita_propria_total"] = Object.values(result).reduce((s, v) => s + v, 0);
  return result;
}

// === Auth guard: validates CRON_SECRET or service_role bearer ===
function authorize(req: Request): boolean {
  const cronSecret = Deno.env.get("CRON_SECRET");
  const headerCron = req.headers.get("x-cron-secret");
  if (cronSecret && headerCron === cronSecret) return true;
  const auth = req.headers.get("authorization") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (serviceKey && auth === `Bearer ${serviceKey}`) return true;
  return false;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  if (!authorize(req)) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    // Accept ?ano=YYYY to process a single year (avoids timeout)
    const url = new URL(req.url);
    const anoParam = url.searchParams.get("ano");
    const anos = anoParam ? [parseInt(anoParam)] : [2023];
    const categorias = ["receita_propria_total", "IPTU", "ISSQN", "ITBI", "IRRF", "Taxas", "Contribuições"];
    const summary: any[] = [];

    for (const ano of anos) {
      console.log(`Processing year ${ano}...`);
      const municipioData: Record<string, { receitas: Record<string, number>; pop: number; nome: string }> = {};

      for (const mun of MUNICIPIOS) {
        const items = await fetchDCA(mun.ibge, ano);
        if (items.length === 0) {
          console.log(`  No DCA data for ${mun.nome} ${ano}`);
          continue;
        }
        const receitas = extractReceitas(items);
        // Use population from DCA if available, otherwise use our hardcoded value
        const pop = items[0]?.populacao || mun.pop;
        municipioData[mun.ibge] = { receitas, pop, nome: mun.nome };
        await new Promise(r => setTimeout(r, 200)); // Rate limit
      }

      const morrinhos = municipioData["5213806"];
      if (!morrinhos) {
        console.log(`  No Morrinhos data for ${ano}`);
        continue;
      }

      // Calculate averages for comparable municipalities (excluding Morrinhos)
      const comparaveis = Object.entries(municipioData)
        .filter(([ibge]) => ibge !== "5213806")
        .map(([, data]) => data);

      for (const cat of categorias) {
        const pValor = morrinhos.receitas[cat] || 0;
        const pPerCapita = pValor / morrinhos.pop;

        const comDados = comparaveis.filter(m => (m.receitas[cat] || 0) > 0);
        const mediaValor = comDados.length > 0
          ? comDados.reduce((s, m) => s + (m.receitas[cat] || 0), 0) / comDados.length
          : 0;
        const mediaPerCapita = comDados.length > 0
          ? comDados.reduce((s, m) => s + (m.receitas[cat] || 0) / m.pop, 0) / comDados.length
          : 0;

        const nomesAmostra = comDados.map(m => m.nome);

        if (pValor > 0 || mediaValor > 0) {
          const { error } = await supabase.from("arrecadacao_comparativo").upsert({
            ano,
            categoria: cat,
            morrinhos_valor: pValor,
            morrinhos_per_capita: Math.round(pPerCapita * 100) / 100,
            media_go_valor: Math.round(mediaValor * 100) / 100,
            media_go_per_capita: Math.round(mediaPerCapita * 100) / 100,
            municipios_amostra: comDados.length,
            municipios_nomes: nomesAmostra,
            fonte_url: "https://siconfi.tesouro.gov.br/siconfi/pages/public/declaracao/declaracao_list.jsf",
          }, { onConflict: "ano,categoria" });

          if (error) console.error(`  Upsert error ${cat}/${ano}:`, error.message);
        }
      }

      summary.push({
        ano,
        morrinhos: morrinhos ? "OK" : "N/A",
        comparaveis: comparaveis.length,
      });
    }

    return new Response(JSON.stringify({ success: true, summary }, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

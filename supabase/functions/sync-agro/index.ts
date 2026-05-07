import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SIDRA_BASE = "https://apisidra.ibge.gov.br/values";
const MUNICIPIO = "5213806"; // Morrinhos

// Municípios vizinhos para comparativo
const VIZINHOS: Record<string, string> = {
  "5213806": "Morrinhos",
  "5208004": "Goiatuba",
  "5211404": "Joviânia",
  "5204003": "Bom Jesus de Goiás",
  "5213707": "Morrinhos",
  "5206206": "Cromínia",
  "5214507": "Orizona",
};

const REBANHO_IDS: Record<string, string> = {
  bovino: "2670",
  bubalino: "2675",
  equino: "2672",
  suino: "32794",
  caprino: "2681",
  ovino: "2677",
  galinaceos: "32796",
};

const LAVOURA_IDS: Record<string, string> = {
  soja: "40124",
  tomate: "40126",
  milho: "40122",
  sorgo: "40125",
  girassol: "40114",
  cana_de_acucar: "40106",
  mandioca: "40119",
};

const PRODUTO_ANIMAL_IDS: Record<string, string> = {
  leite: "2516",
  ovos: "2515",
  mel: "2517",
};

function parseNumber(v: string): number | null {
  if (!v || v === "-" || v === ".." || v === "..." || v === "X") return null;
  return Number(v.replace(/\./g, "").replace(",", "."));
}

function formatToneladas(v: number): string {
  if (v >= 1000) return `${(v / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil ton`;
  return `${v.toLocaleString("pt-BR")} ton`;
}

function formatCabecas(v: number): string {
  if (v >= 1000) return `${(v / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} mil`;
  return v.toLocaleString("pt-BR");
}

function formatMilReais(v: number): string {
  if (v >= 1000) return `R$ ${(v / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} mi`;
  return `R$ ${v.toLocaleString("pt-BR")} mil`;
}

function formatLitros(v: number): string {
  if (v >= 1000) return `${(v / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} mil litros`;
  return `${v.toLocaleString("pt-BR")} litros`;
}

function formatDuzias(v: number): string {
  if (v >= 1000) return `${(v / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} mil dz`;
  return `${v.toLocaleString("pt-BR")} dz`;
}

function formatKg(v: number): string {
  if (v >= 1000) return `${(v / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} ton`;
  return `${v.toLocaleString("pt-BR")} kg`;
}

function extractAno(row: Record<string, string>): number {
  for (const key of ["D3C", "D2C", "Ano (Código)", "Ano"]) {
    const v = row[key];
    if (v && /^\d{4}$/.test(v)) return parseInt(v);
  }
  for (const v of Object.values(row)) {
    if (typeof v === "string" && /^\d{4}$/.test(v)) return parseInt(v);
  }
  return new Date().getFullYear();
}

function extractMunicipio(row: Record<string, string>): string | null {
  for (const key of ["D1C", "Município (Código)"]) {
    if (row[key]) return row[key];
  }
  return null;
}

type Result = {
  categoria: string;
  chave: string;
  valor: number | null;
  valor_texto: string | null;
  unidade: string;
  ano: number;
  fonte_url: string;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const results: Result[] = [];

    // 1. Pecuária - Efetivo dos rebanhos (tabela 3939, variável 105) - último ano
    const rebanhoIds = Object.values(REBANHO_IDS).join(",");
    const pecuariaUrl = `${SIDRA_BASE}/t/3939/n6/${MUNICIPIO}/v/105/p/last%201/c79/${rebanhoIds}`;
    
    try {
      const resp = await fetch(pecuariaUrl);
      const data = await resp.json();
      if (Array.isArray(data) && data.length > 1) {
        for (let i = 1; i < data.length; i++) {
          const row = data[i];
          const valor = parseNumber(row.V);
          const ano = extractAno(row);
          const codigoRebanho = row.D4C;
          const chave = Object.entries(REBANHO_IDS).find(([, v]) => v === codigoRebanho)?.[0];
          if (!chave) continue;
          results.push({
            categoria: "pecuaria",
            chave,
            valor,
            valor_texto: valor ? formatCabecas(valor) : null,
            unidade: "Cabeças",
            ano,
            fonte_url: `https://cidades.ibge.gov.br/brasil/go/morrinhos/pesquisa/18/16459`,
          });
        }
      }
    } catch (e) {
      console.error("Erro ao buscar pecuária:", e);
    }

    // 2. HISTÓRICO bovino - últimos 10 anos (tabela 3939, variável 105, bovino=2670)
    try {
      const histUrl = `${SIDRA_BASE}/t/3939/n6/${MUNICIPIO}/v/105/p/last%2010/c79/2670`;
      const resp = await fetch(histUrl);
      const data = await resp.json();
      console.log("Histórico bovino response:", Array.isArray(data) ? data.length : "not array");
      if (Array.isArray(data) && data.length > 1) {
        for (let i = 1; i < data.length; i++) {
          const row = data[i];
          const valor = parseNumber(row.V);
          const ano = extractAno(row);
          if (valor === null) continue;
          results.push({
            categoria: "historico_bovino",
            chave: `bovino_${ano}`,
            valor,
            valor_texto: formatCabecas(valor),
            unidade: "Cabeças",
            ano,
            fonte_url: `https://cidades.ibge.gov.br/brasil/go/morrinhos/pesquisa/18/16459`,
          });
        }
      }
    } catch (e) {
      console.error("Erro ao buscar histórico bovino:", e);
    }

    // 3. COMPARATIVO com vizinhos - rebanho bovino último ano
    const vizinhosIds = Object.keys(VIZINHOS).join(",");
    try {
      const compUrl = `${SIDRA_BASE}/t/3939/n6/${vizinhosIds}/v/105/p/last%201/c79/2670`;
      const resp = await fetch(compUrl);
      const data = await resp.json();
      console.log("Comparativo vizinhos response:", Array.isArray(data) ? data.length : "not array");
      if (Array.isArray(data) && data.length > 1) {
        for (let i = 1; i < data.length; i++) {
          const row = data[i];
          const valor = parseNumber(row.V);
          const ano = extractAno(row);
          const codMun = extractMunicipio(row);
          if (valor === null || !codMun) continue;
          const nomeMun = VIZINHOS[codMun] || codMun;
          results.push({
            categoria: "comparativo_bovino",
            chave: `viz_${codMun}`,
            valor,
            valor_texto: `${nomeMun}: ${formatCabecas(valor)}`,
            unidade: "Cabeças",
            ano,
            fonte_url: `https://cidades.ibge.gov.br/brasil/go/morrinhos/pesquisa/18/16459`,
          });
        }
      }
    } catch (e) {
      console.error("Erro ao buscar comparativo vizinhos:", e);
    }

    // 4. COMPARATIVO vizinhos - leite (vacas ordenhadas, tabela 94, variável 107)
    try {
      const compLeiteUrl = `${SIDRA_BASE}/t/94/n6/${vizinhosIds}/v/107/p/last%201`;
      const resp = await fetch(compLeiteUrl);
      const data = await resp.json();
      console.log("Comparativo leite response:", Array.isArray(data) ? data.length : "not array");
      if (Array.isArray(data) && data.length > 1) {
        for (let i = 1; i < data.length; i++) {
          const row = data[i];
          const valor = parseNumber(row.V);
          const ano = extractAno(row);
          const codMun = extractMunicipio(row);
          if (valor === null || !codMun) continue;
          const nomeMun = VIZINHOS[codMun] || codMun;
          results.push({
            categoria: "comparativo_leite",
            chave: `viz_leite_${codMun}`,
            valor,
            valor_texto: `${nomeMun}: ${formatCabecas(valor)} vacas`,
            unidade: "Cabeças (vacas ordenhadas)",
            ano,
            fonte_url: `https://cidades.ibge.gov.br/brasil/go/morrinhos/pesquisa/18/16459`,
          });
        }
      }
    } catch (e) {
      console.error("Erro comparativo leite:", e);
    }

    // 5. Valor da produção animal (tabela 74, variável 215, total)
    try {
      const valorAnimalUrl = `${SIDRA_BASE}/t/74/n6/${MUNICIPIO}/v/215/p/last%201`;
      const resp = await fetch(valorAnimalUrl);
      const data = await resp.json();
      if (Array.isArray(data) && data.length > 1) {
        const row = data[1];
        const valor = parseNumber(row.V);
        const ano = extractAno(row);
        results.push({
          categoria: "pecuaria",
          chave: "valor_producao_animal",
          valor,
          valor_texto: valor ? formatMilReais(valor) : null,
          unidade: "Mil Reais",
          ano,
          fonte_url: `https://cidades.ibge.gov.br/brasil/go/morrinhos/pesquisa/18/16459`,
        });
      }
    } catch (e) {
      console.error("Erro ao buscar valor produção animal:", e);
    }

    // 6. Vacas ordenhadas (tabela 94, variável 107)
    try {
      const vacasUrl = `${SIDRA_BASE}/t/94/n6/${MUNICIPIO}/v/107/p/last%201?formato=json`;
      const resp = await fetch(vacasUrl);
      const data = await resp.json();
      if (Array.isArray(data) && data.length > 1) {
        const row = data[1];
        const valor = parseNumber(row.V);
        const ano = extractAno(row);
        if (valor) {
          results.push({
            categoria: "producao_animal",
            chave: "vacas_ordenhadas",
            valor,
            valor_texto: formatCabecas(valor),
            unidade: "Cabeças",
            ano,
            fonte_url: `https://cidades.ibge.gov.br/brasil/go/morrinhos/pesquisa/18/16459`,
          });

          const produtividadeEstimada = 2500;
          const leiteEstimado = Math.round((valor * produtividadeEstimada) / 1000);
          results.push({
            categoria: "producao_animal",
            chave: "leite_estimado",
            valor: leiteEstimado,
            valor_texto: `${(leiteEstimado / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} mi litros`,
            unidade: "Mil litros (estimativa)",
            ano,
            fonte_url: `https://cidades.ibge.gov.br/brasil/go/morrinhos/pesquisa/18/16459`,
          });
        }
      }
    } catch (e) {
      console.error("Erro ao buscar vacas ordenhadas:", e);
    }

    // 7. Produção de origem animal (tabela 74)
    const produtoAnimalIds = Object.values(PRODUTO_ANIMAL_IDS).join(",");
    try {
      const prodAnimalUrl = `${SIDRA_BASE}/t/74/n6/${MUNICIPIO}/v/106,215/p/last%201/c80/${produtoAnimalIds}?formato=json`;
      const resp = await fetch(prodAnimalUrl);
      const data = await resp.json();
      if (Array.isArray(data) && data.length > 1) {
        for (let i = 1; i < data.length; i++) {
          const row = data[i];
          const valor = parseNumber(row.V);
          if (valor === null) continue;
          const ano = extractAno(row);
          const codigoProduto = row.D4C;
          const codigoVariavel = row.D2C;
          const chave = Object.entries(PRODUTO_ANIMAL_IDS).find(([, v]) => v === codigoProduto)?.[0];
          if (!chave) continue;
          const isQuantidade = codigoVariavel === "106";
          const suffix = isQuantidade ? "" : "_valor";
          let unidade = "Mil Reais";
          let texto = valor ? formatMilReais(valor) : null;
          if (isQuantidade) {
            if (chave === "leite") { unidade = "Mil litros"; texto = valor ? formatLitros(valor) : null; }
            else if (chave === "ovos") { unidade = "Mil dúzias"; texto = valor ? formatDuzias(valor) : null; }
            else if (chave === "mel") { unidade = "Quilogramas"; texto = valor ? formatKg(valor) : null; }
          }
          results.push({ categoria: "producao_animal", chave: chave + suffix, valor, valor_texto: texto, unidade, ano, fonte_url: `https://cidades.ibge.gov.br/brasil/go/morrinhos/pesquisa/18/16459` });
        }
      }
    } catch (e) {
      console.error("Erro ao buscar produção animal:", e);
    }

    // 8. Lavouras - produção e valor
    const lavouraIds = Object.values(LAVOURA_IDS).join(",");
    try {
      const lavouraUrl = `${SIDRA_BASE}/t/5457/n6/${MUNICIPIO}/v/214,215/p/last%201/c782/${lavouraIds}`;
      const resp = await fetch(lavouraUrl);
      const data = await resp.json();
      if (Array.isArray(data) && data.length > 1) {
        for (let i = 1; i < data.length; i++) {
          const row = data[i];
          const valor = parseNumber(row.V);
          const ano = extractAno(row);
          const codigoProduto = row.D4C;
          const codigoVariavel = row.D2C;
          const chave = Object.entries(LAVOURA_IDS).find(([, v]) => v === codigoProduto)?.[0];
          if (!chave) continue;
          const isQuantidade = codigoVariavel === "214";
          const suffix = isQuantidade ? "" : "_valor";
          results.push({ categoria: "lavoura", chave: chave + suffix, valor, valor_texto: valor ? (isQuantidade ? formatToneladas(valor) : formatMilReais(valor)) : null, unidade: isQuantidade ? "Toneladas" : "Mil Reais", ano, fonte_url: `https://cidades.ibge.gov.br/brasil/go/morrinhos/pesquisa/24/76693` });
        }
      }
    } catch (e) {
      console.error("Erro ao buscar lavouras:", e);
    }

    // 9. Área plantada
    try {
      const areaUrl = `${SIDRA_BASE}/t/5457/n6/${MUNICIPIO}/v/216/p/last%201/c782/${lavouraIds}`;
      const resp = await fetch(areaUrl);
      const data = await resp.json();
      if (Array.isArray(data) && data.length > 1) {
        for (let i = 1; i < data.length; i++) {
          const row = data[i];
          const valor = parseNumber(row.V);
          const ano = extractAno(row);
          const codigoProduto = row.D4C;
          const chave = Object.entries(LAVOURA_IDS).find(([, v]) => v === codigoProduto)?.[0];
          if (!chave) continue;
          results.push({ categoria: "lavoura", chave: chave + "_area", valor, valor_texto: valor ? `${valor.toLocaleString("pt-BR")} ha` : null, unidade: "Hectares", ano, fonte_url: `https://cidades.ibge.gov.br/brasil/go/morrinhos/pesquisa/24/76693` });
        }
      }
    } catch (e) {
      console.error("Erro ao buscar área plantada:", e);
    }

    // 10. Abate bovino trimestral - Goiás (tabela 1092, variável 284, bovino total=115236)
    // Dados trimestrais disponíveis antes da PPM anual — mais recentes!
    try {
      const abateUrl = `${SIDRA_BASE}/t/1092/n3/52/v/284/p/last%208/c12716/115236`;
      const resp = await fetch(abateUrl);
      const data = await resp.json();
      console.log("Abate trimestral GO response:", Array.isArray(data) ? data.length : "not array");
      if (Array.isArray(data) && data.length > 1) {
        for (let i = 1; i < data.length; i++) {
          const row = data[i];
          const valor = parseNumber(row.V);
          if (valor === null) continue;
          // Extract trimestre code like "202501" -> ano=2025, tri=1
          const triCode = row.D3C; // e.g. "202503"
          const ano = parseInt(triCode.substring(0, 4));
          const tri = parseInt(triCode.substring(4, 6));
          const triLabel = `${tri}º tri ${ano}`;
          results.push({
            categoria: "abate_trimestral_go",
            chave: `abate_bov_${triCode}`,
            valor,
            valor_texto: `${(valor / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} mil cabeças`,
            unidade: "Cabeças abatidas",
            ano,
            fonte_url: `https://sidra.ibge.gov.br/tabela/1092`,
          });
        }
      }
    } catch (e) {
      console.error("Erro ao buscar abate trimestral GO:", e);
    }

    // 11. Pesquisa Trimestral do Leite - Goiás (tabela 1086, variável 282)
    try {
      const leiteTriUrl = `${SIDRA_BASE}/t/1086/n3/52/v/282/p/last%208`;
      const resp = await fetch(leiteTriUrl);
      const data = await resp.json();
      console.log("Leite trimestral GO response:", Array.isArray(data) ? data.length : "not array");
      if (Array.isArray(data) && data.length > 1) {
        for (let i = 1; i < data.length; i++) {
          const row = data[i];
          const valor = parseNumber(row.V);
          if (valor === null) continue;
          const triCode = row.D3C;
          const ano = parseInt(triCode.substring(0, 4));
          results.push({
            categoria: "leite_trimestral_go",
            chave: `leite_go_${triCode}`,
            valor,
            valor_texto: `${(valor / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} mil litros`,
            unidade: "Mil litros",
            ano,
            fonte_url: `https://sidra.ibge.gov.br/tabela/1086`,
          });
        }
      }
    } catch (e) {
      console.error("Erro ao buscar leite trimestral GO:", e);
    }

    // 12. HISTÓRICO vacas ordenhadas → estimativa de produção de leite — Morrinhos
    // Nota: tabela 74 (produção de leite) retorna "..." para Morrinhos (dado suprimido).
    // Usamos tabela 94, variável 107 (vacas ordenhadas) × produtividade média (2.500 L/vaca/ano) como estimativa.
    try {
      const histVacasUrl = `${SIDRA_BASE}/t/94/n6/${MUNICIPIO}/v/107/p/last%2010`;
      const resp = await fetch(histVacasUrl);
      const data = await resp.json();
      console.log("Histórico vacas ordenhadas response:", Array.isArray(data) ? data.length : "not array");
      if (Array.isArray(data) && data.length > 1) {
        const produtividadeMedia = 2500; // litros/vaca/ano
        for (let i = 1; i < data.length; i++) {
          const row = data[i];
          const vacas = parseNumber(row.V);
          const ano = extractAno(row);
          if (vacas === null) continue;
          const leiteEstimado = Math.round((vacas * produtividadeMedia) / 1000); // em mil litros
          results.push({
            categoria: "historico_leite",
            chave: `leite_${ano}`,
            valor: leiteEstimado,
            valor_texto: `${(leiteEstimado / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} mi litros`,
            unidade: "Mil litros (estimativa)",
            ano,
            fonte_url: `https://cidades.ibge.gov.br/brasil/go/morrinhos/pesquisa/18/16459`,
          });
        }
      }
    } catch (e) {
      console.error("Erro ao buscar histórico leite:", e);
    }

    // Upsert all results
    let inserted = 0;
    let errors = 0;
    for (const r of results) {
      if (r.valor === null) continue;
      const { error } = await supabase
        .from("agro_indicadores")
        .upsert({
          categoria: r.categoria,
          chave: r.chave,
          valor: r.valor,
          valor_texto: r.valor_texto,
          unidade: r.unidade,
          ano_referencia: r.ano,
          fonte_url: r.fonte_url,
          updated_at: new Date().toISOString(),
        }, { onConflict: "categoria,chave,ano_referencia" });

      if (error) {
        console.error(`Erro upsert ${r.chave}:`, error);
        errors++;
      } else {
        inserted++;
      }
    }

    console.log(`Sync agro concluído: ${inserted} inseridos, ${errors} erros de ${results.length} total`);

    return new Response(
      JSON.stringify({ success: true, total: results.length, inserted, errors }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Erro sync-agro:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

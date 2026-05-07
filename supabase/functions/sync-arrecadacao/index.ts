import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ENTE_ID = "5213806";
const SICONFI_BASE = "https://apidatalake.tesouro.gov.br/ords/siconfi/tt";

// Fetch RREO data trying multiple periods (latest first)
async function fetchRREO(ano: number, anexo: string): Promise<{ items: any[]; periodo: number }> {
  const periods = [6, 5, 4, 3, 2, 1];
  for (const periodo of periods) {
    const url = `${SICONFI_BASE}/rreo?an_exercicio=${ano}&nr_periodo=${periodo}&co_tipo_demonstrativo=RREO&no_anexo=${encodeURIComponent(anexo)}&id_ente=${ENTE_ID}`;
    try {
      const resp = await fetch(url);
      if (!resp.ok) continue;
      const data = await resp.json();
      const items = data?.items || [];
      if (items.length > 0) {
        console.log(`RREO ${anexo} ${ano} period ${periodo}: ${items.length} records`);
        return { items, periodo };
      }
    } catch (e) {
      console.error(`Error RREO ${ano}/${periodo}:`, e);
    }
  }
  return { items: [], periodo: 0 };
}

async function fetchDCA(ano: number): Promise<any[]> {
  const url = `${SICONFI_BASE}/dca?an_exercicio=${ano}&no_anexo=DCA-Anexo%20I-C&id_ente=${ENTE_ID}`;
  try {
    const resp = await fetch(url);
    if (!resp.ok) return [];
    const data = await resp.json();
    return data?.items || [];
  } catch { return []; }
}

// Map cod_conta (camelCase) to categories  
function mapCodConta(cod: string): { categoria: string; tipo: string; subcategoria?: string } | null {
  const c = (cod || "");
  // RREO Anexo 03 patterns (exact cod_conta values)
  if (c === "RREO3CotaParteDoFPM") {
    return { categoria: "FPM", tipo: "outro_repasse", subcategoria: "Fundo de Participação dos Municípios" };
  }
  if (c === "RREO3CotaParteDoIPVA") {
    return { categoria: "Cota-parte IPVA", tipo: "repasse_ipva" };
  }
  if (c === "RREO3CotaParteDoICMS") {
    return { categoria: "Cota-parte ICMS", tipo: "outro_repasse", subcategoria: "Repasse estadual" };
  }
  if (c === "RREO3CotaParteDoITR") {
    return { categoria: "Cota-parte ITR", tipo: "outro_repasse", subcategoria: "Imposto Territorial Rural" };
  }
  if (c === "RREO3TransferenciasDoFUNDEB") {
    return { categoria: "FUNDEB", tipo: "outro_repasse", subcategoria: "Fundo de Manutenção da Educação Básica" };
  }
  // RREO Anexo 01 own revenue patterns
  if (c === "IPTULiquidoExcetoTransferenciasEFUNDEB" || c === "IPTU") {
    return { categoria: "IPTU", tipo: "receita_propria" };
  }
  if (c === "ISSLiquidoExcetoTransferenciasEFUNDEB" || c === "ISS") {
    return { categoria: "ISSQN", tipo: "receita_propria" };
  }
  if (c === "ITBILiquidoExcetoTransferenciasEFUNDEB" || c === "ITBI") {
    return { categoria: "ITBI", tipo: "receita_propria", subcategoria: "Imposto sobre Transmissão Inter Vivos" };
  }
  if (c === "IRRFLiquidoExcetoTransferenciasEFUNDEB" || c === "IRRF") {
    return { categoria: "IRRF", tipo: "receita_propria", subcategoria: "Imposto de Renda Retido na Fonte" };
  }
  // Generic fallback patterns
  const cl = c.toLowerCase();
  if (cl.includes("fpm") && cl.includes("cota")) {
    return { categoria: "FPM", tipo: "outro_repasse", subcategoria: "Fundo de Participação dos Municípios" };
  }
  if (cl.includes("ipva") && (cl.includes("cota") || cl.includes("transfer"))) {
    return { categoria: "Cota-parte IPVA", tipo: "repasse_ipva" };
  }
  if (cl.includes("icms") && (cl.includes("cota") || cl.includes("transfer"))) {
    return { categoria: "Cota-parte ICMS", tipo: "outro_repasse", subcategoria: "Repasse estadual" };
  }
  return null;
}

// Map conta text (description) to categories
function mapContaText(conta: string): { categoria: string; tipo: string; subcategoria?: string } | null {
  const c = (conta || "").toUpperCase().trim();
  
  // Own revenue
  if (c.includes("IPTU") || c.includes("IMPOSTO SOBRE A PROPRIEDADE PREDIAL")) {
    return { categoria: "IPTU", tipo: "receita_propria" };
  }
  if (c.includes("ISS") || c.includes("ISSQN") || c.includes("IMPOSTO SOBRE SERVIÇOS")) {
    return { categoria: "ISSQN", tipo: "receita_propria" };
  }
  if (c.includes("ITBI") || c.includes("TRANSMISS") || c.includes("INTER VIVOS")) {
    return { categoria: "ITBI", tipo: "receita_propria", subcategoria: "Imposto sobre Transmissão Inter Vivos" };
  }
  if (c.includes("IRRF") || c.includes("IMPOSTO DE RENDA RETIDO") || c.includes("IMPOSTO SOBRE A RENDA") || c.includes("RENDA - RETIDO NA FONTE")) {
    return { categoria: "IRRF", tipo: "receita_propria", subcategoria: "Imposto de Renda Retido na Fonte" };
  }
  if (c === "TAXAS" || (c.includes("TAXAS") && !c.includes("TRANSFERÊNCIA"))) {
    return { categoria: "Taxas", tipo: "receita_propria" };
  }
  if (c.includes("CONTRIBUI") && (c.includes("ILUMINAÇÃO") || c.includes("COSIP"))) {
    return { categoria: "Contribuições", tipo: "receita_propria", subcategoria: "COSIP" };
  }
  if (c.includes("CONTRIBUI") && c.includes("MELHORIA")) {
    return { categoria: "Contribuições", tipo: "receita_propria", subcategoria: "Contribuição de Melhoria" };
  }
  // Transfers
  if (c.includes("COTA-PARTE") && c.includes("IPVA")) {
    return { categoria: "Cota-parte IPVA", tipo: "repasse_ipva" };
  }
  if (c.includes("COTA-PARTE") && c.includes("ICMS")) {
    return { categoria: "Cota-parte ICMS", tipo: "outro_repasse", subcategoria: "Repasse estadual" };
  }
  if ((c.includes("COTA-PARTE") && c.includes("FPM")) || c.includes("FUNDO DE PARTICIPAÇÃO DOS MUNICÍPIOS") || c.includes("FUNDO DE PARTICIPACAO DOS MUNICIPIOS")) {
    return { categoria: "FPM", tipo: "outro_repasse", subcategoria: "Fundo de Participação dos Municípios" };
  }
  if (c.includes("FUNDEB") || (c.includes("FUNDO DE MANUTENÇÃO") && c.includes("EDUCAÇÃO"))) {
    return { categoria: "FUNDEB", tipo: "outro_repasse", subcategoria: "Fundo de Manutenção da Educação Básica" };
  }
  if (c.includes("COTA-PARTE") && c.includes("ITR")) {
    return { categoria: "Cota-parte ITR", tipo: "outro_repasse", subcategoria: "Imposto Territorial Rural" };
  }
  // Aggregated transfer categories from RREO Anexo 01
  if (c === "TRANSFERÊNCIAS CORRENTES" || c === "TRANSFERENCIAS CORRENTES") {
    return null; // skip aggregate, use sub-items
  }
  // Use aggregated transfers from states as Cota-parte ICMS+IPVA if no breakdown available
  return null;
}

function processItems(items: any[], ano: number, source: string, periodoInfo: string, records: Map<string, any>) {
  // RREO Anexo 01 uses "Até o Bimestre (c)", Anexo 03 uses "TOTAL (ÚLTIMOS 12 MESES)"
  // DCA has no coluna field
  
  for (const item of items) {
    // Filter to cumulative columns only
    if (item.coluna) {
      const col = item.coluna;
      if (!col.includes("Até o Bimestre") && !col.includes("TOTAL (ÚLTIMOS 12 MESES)")) continue;
    }
    
    const conta = item.conta || "";
    const codConta = item.cod_conta || "";
    
    // Try mapping by cod_conta first (more reliable), then by text
    let mapped = mapCodConta(codConta);
    if (!mapped) mapped = mapContaText(conta);
    if (!mapped) continue;

    const valor = item.valor || 0;
    if (valor === 0) continue;

    const competencia = `${ano}-12`;
    const key = `${mapped.tipo}|${mapped.categoria}|${competencia}`;

    if (records.has(key)) {
      records.get(key).valor += valor;
    } else {
      records.set(key, {
        municipio: "Morrinhos-GO",
        tipo: mapped.tipo,
        categoria: mapped.categoria,
        subcategoria: mapped.subcategoria || null,
        competencia,
        ano,
        valor,
        fonte_nome: `Tesouro Nacional - ${source}`,
        fonte_url: "https://siconfi.tesouro.gov.br/siconfi/pages/public/declaracao/declaracao_list.jsf",
        observacoes: `Dados do ${source}${periodoInfo} - exercício ${ano}`,
      });
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let y = 2020; y <= currentYear; y++) years.push(y);

    let totalInserted = 0;
    const errors: string[] = [];

    for (const ano of years) {
      const records: Map<string, any> = new Map();
      let source = "";
      let periodoInfo = "";
      
      // 1) Try DCA first (annual, most detailed)
      const dcaItems = await fetchDCA(ano);
      if (dcaItems.length > 0) {
        source = "SICONFI/DCA";
        processItems(dcaItems, ano, source, "", records);
      }
      
      // 2) Always try RREO Anexo 03 (Receita Corrente Líquida - has FPM/ICMS/IPVA breakdown)
      const rreo3 = await fetchRREO(ano, "RREO-Anexo 03");
      if (rreo3.items.length > 0) {
        periodoInfo = ` (período ${rreo3.periodo})`;
        const src = "SICONFI/RREO-Anexo03";
        
        processItems(rreo3.items, ano, src, periodoInfo, records);
        if (!source) source = src;
      }
      
      // 3) Also try RREO Anexo 01 for own revenue if DCA didn't have it
      if (dcaItems.length === 0) {
        const rreo1 = await fetchRREO(ano, "RREO-Anexo 01");
        if (rreo1.items.length > 0) {
          periodoInfo = ` (período ${rreo1.periodo})`;
          const src = "SICONFI/RREO-Anexo01";
          processItems(rreo1.items, ano, src, periodoInfo, records);
          if (!source) source = src;
        }
      }

      if (records.size === 0) {
        console.log(`No mappable data for ${ano}`);
        continue;
      }

      console.log(`${ano}: ${records.size} categories mapped from ${source}`);
      for (const [key, rec] of records) {
        console.log(`  ${key}: R$ ${rec.valor?.toLocaleString("pt-BR")}`);
      }

      // Upsert records
      for (const record of records.values()) {
        const { error } = await supabase
          .from("arrecadacao_municipal")
          .upsert(record, { onConflict: "municipio,tipo,categoria,competencia" });
        
        if (error) {
          console.error(`Upsert error:`, error.message);
          errors.push(`${ano}/${record.categoria}: ${error.message}`);
        } else {
          totalInserted++;
        }
      }

      await new Promise(r => setTimeout(r, 500));
    }

    // Log
    await supabase.from("arrecadacao_fontes_log").insert({
      fonte_nome: "SICONFI/Tesouro Nacional",
      fonte_url: SICONFI_BASE,
      status: errors.length > 0 ? "parcial" : "sucesso",
      registros_importados: totalInserted,
      mensagem_erro: errors.length > 0 ? errors.join("; ") : null,
    });

    await supabase.from("sync_log").insert({
      tipo: "arrecadacao",
      status: "success",
      detalhes: { inserted: totalInserted, errors: errors.length },
      finished_at: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({ success: true, years_checked: years, inserted: totalInserted, errors }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    
    await supabase.from("arrecadacao_fontes_log").insert({
      fonte_nome: "SICONFI/Tesouro Nacional",
      status: "erro",
      mensagem_erro: error.message,
    });

    await supabase.from("sync_log").insert({
      tipo: "arrecadacao",
      status: "error",
      detalhes: { error: error.message },
      finished_at: new Date().toISOString(),
    }).catch(() => {});

    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

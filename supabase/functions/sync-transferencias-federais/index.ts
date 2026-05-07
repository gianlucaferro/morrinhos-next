import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const IBGE_CODE = "5213806"; // Morrinhos-GO
const API_BASE = "https://api.portaldatransparencia.gov.br/api-de-dados";

async function fetchAPI(endpoint: string, params: Record<string, string>, apiKey: string) {
  const url = new URL(`${API_BASE}/${endpoint}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  
  const res = await fetch(url.toString(), {
    headers: { "chave-api-dados": apiKey, Accept: "application/json" },
  });
  
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${endpoint} retornou ${res.status}: ${text}`);
  }
  
  return res.json();
}

async function syncConvenios(supabase: any, apiKey: string) {
  let page = 1;
  let total = 0;
  
  while (true) {
    const data = await fetchAPI("convenios", {
      codigoIBGE: IBGE_CODE,
      pagina: String(page),
    }, apiKey);
    
    if (!data || !Array.isArray(data) || data.length === 0) break;
    
    for (const c of data) {
      const record = {
        tipo: "convenio",
        portal_id: String(c.id || c.numero),
        numero: c.numero || null,
        orgao_concedente: c.orgaoSuperior?.nome || c.orgaoConcedente?.nome || null,
        objeto: c.objeto || null,
        valor_total: c.valorConvenio || c.valor || null,
        valor_liberado: c.valorLiberado || null,
        valor_empenhado: c.valorEmpenhado || null,
        situacao: c.situacao?.descricao || c.situacao || null,
        data_inicio: c.dataInicioVigencia || c.dataPublicacao || null,
        data_fim: c.dataFimVigencia || null,
        fonte_url: `https://portaldatransparencia.gov.br/convenios/${c.id || ""}`,
        fonte_api: "portal_transparencia",
        ano: c.dataInicioVigencia ? parseInt(c.dataInicioVigencia.slice(0, 4)) : new Date().getFullYear(),
      };
      
      await supabase.from("transferencias_federais").upsert(record, {
        onConflict: "portal_id,tipo",
      });
      total++;
    }
    
    if (data.length < 15) break; // default page size
    page++;
    // Rate limiting
    await new Promise(r => setTimeout(r, 500));
  }
  
  return total;
}

async function syncBolsaFamilia(supabase: any, apiKey: string) {
  let total = 0;
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  
  // Sync last 6 months
  for (let i = 0; i < 6; i++) {
    let month = currentMonth - i;
    let year = currentYear;
    if (month <= 0) { month += 12; year--; }
    
    const mesAno = `${year}${String(month).padStart(2, "0")}`;
    
    try {
      const data = await fetchAPI("novo-bolsa-familia-por-municipio", {
        codigoIbge: IBGE_CODE,
        mesAno,
        pagina: "1",
      }, apiKey);
      
      if (data && Array.isArray(data) && data.length > 0) {
        const item = data[0];
        const competencia = `${year}-${String(month).padStart(2, "0")}`;
        
        await supabase.from("beneficios_sociais").upsert({
          programa: "Bolsa Família",
          competencia,
          municipio: "Morrinhos-GO",
          beneficiarios: item.quantidadeBeneficiados || null,
          valor_pago: item.valor || null,
          fonte_nome: "Portal da Transparência - API Federal",
          fonte_url: `https://portaldatransparencia.gov.br/beneficios/bolsa-familia?municipio=${IBGE_CODE}`,
        }, { onConflict: "programa,competencia,municipio" });
        total++;
      }
    } catch (e) {
      console.error(`Erro BF ${mesAno}:`, e.message);
    }
    
    await new Promise(r => setTimeout(r, 300));
  }
  
  return total;
}

async function syncBPC(supabase: any, apiKey: string) {
  let total = 0;
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  
  for (let i = 0; i < 6; i++) {
    let month = currentMonth - i;
    let year = currentYear;
    if (month <= 0) { month += 12; year--; }
    
    const mesAno = `${year}${String(month).padStart(2, "0")}`;
    
    try {
      const data = await fetchAPI("bpc-por-municipio", {
        codigoIbge: IBGE_CODE,
        mesAno,
        pagina: "1",
      }, apiKey);
      
      if (data && Array.isArray(data) && data.length > 0) {
        const item = data[0];
        const competencia = `${year}-${String(month).padStart(2, "0")}`;
        
        await supabase.from("beneficios_sociais").upsert({
          programa: "BPC - Benefício de Prestação Continuada",
          competencia,
          municipio: "Morrinhos-GO",
          beneficiarios: item.quantidadeBeneficiados || null,
          valor_pago: item.valor || null,
          fonte_nome: "Portal da Transparência - API Federal",
          fonte_url: `https://portaldatransparencia.gov.br/beneficios/bpc?municipio=${IBGE_CODE}`,
        }, { onConflict: "programa,competencia,municipio" });
        total++;
      }
    } catch (e) {
      console.error(`Erro BPC ${mesAno}:`, e.message);
    }
    
    await new Promise(r => setTimeout(r, 300));
  }
  
  return total;
}

async function syncGarantiaSafra(supabase: any, apiKey: string) {
  let total = 0;
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  
  for (let i = 0; i < 6; i++) {
    let month = currentMonth - i;
    let year = currentYear;
    if (month <= 0) { month += 12; year--; }
    
    const mesAno = `${year}${String(month).padStart(2, "0")}`;
    
    try {
      const data = await fetchAPI("safra-por-municipio", {
        codigoIbge: IBGE_CODE,
        mesAno,
        pagina: "1",
      }, apiKey);
      
      if (data && Array.isArray(data) && data.length > 0) {
        const item = data[0];
        const competencia = `${year}-${String(month).padStart(2, "0")}`;
        
        await supabase.from("beneficios_sociais").upsert({
          programa: "Garantia-Safra",
          competencia,
          municipio: "Morrinhos-GO",
          beneficiarios: item.quantidadeBeneficiados || null,
          valor_pago: item.valor || null,
          fonte_nome: "Portal da Transparência - API Federal",
          fonte_url: `https://portaldatransparencia.gov.br/beneficios/garantia-safra?municipio=${IBGE_CODE}`,
        }, { onConflict: "programa,competencia,municipio" });
        total++;
      }
    } catch (e) {
      console.error(`Erro Safra ${mesAno}:`, e.message);
    }
    
    await new Promise(r => setTimeout(r, 300));
  }
  
  return total;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const apiKey = Deno.env.get("PORTAL_TRANSPARENCIA_API_KEY");
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "PORTAL_TRANSPARENCIA_API_KEY não configurada" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const resultados: Record<string, string> = {};

    // Sync convênios
    try {
      const n = await syncConvenios(supabase, apiKey);
      resultados.convenios = `${n} registros`;
    } catch (e) {
      resultados.convenios = `Erro: ${e.message}`;
    }

    // Sync Bolsa Família
    try {
      const n = await syncBolsaFamilia(supabase, apiKey);
      resultados.bolsa_familia = `${n} meses`;
    } catch (e) {
      resultados.bolsa_familia = `Erro: ${e.message}`;
    }

    // Sync BPC
    try {
      const n = await syncBPC(supabase, apiKey);
      resultados.bpc = `${n} meses`;
    } catch (e) {
      resultados.bpc = `Erro: ${e.message}`;
    }

    // Sync Garantia-Safra
    try {
      const n = await syncGarantiaSafra(supabase, apiKey);
      resultados.garantia_safra = `${n} meses`;
    } catch (e) {
      resultados.garantia_safra = `Erro: ${e.message}`;
    }

    return new Response(JSON.stringify({ success: true, resultados }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

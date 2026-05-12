import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ID_ENTE = "5213806"; // Morrinhos-GO
const SICONFI_BASE = "https://apidatalake.tesouro.gov.br/ords/siconfi/tt";

// Fetch DCA (Declaração de Contas Anuais) - receitas e despesas declaradas
async function syncDCA(supabase: any, exercicio: number) {
  let total = 0;
  
  // Anexo I-D = Balanço Patrimonial / Anexo I-C = Receita  
  const anexos = [
    "DCA-Anexo I-C",  // Receita Corrente Líquida
    "DCA-Anexo I-D",  // Balanço Patrimonial
    "DCA-Anexo I-E",  // Demonstrativo de Receitas e Despesas
    "DCA-Anexo I-F",  // Resultado Nominal/Primário
    "DCA-Anexo I-HI", // Investimentos
  ];
  
  for (const anexo of anexos) {
    try {
      const url = `${SICONFI_BASE}/dca?an_exercicio=${exercicio}&no_anexo=${encodeURIComponent(anexo)}&id_ente=${ID_ENTE}`;
      const res = await fetch(url);
      
      if (!res.ok) {
        console.log(`DCA ${anexo} ${exercicio}: HTTP ${res.status}`);
        continue;
      }
      
      const data = await res.json();
      const items = data?.items || [];
      
      for (const item of items) {
          if (!item.conta || item.valor === null || item.valor === undefined) continue;
          
          const contaKey = item.cod_conta ? `${item.cod_conta}::${item.conta}` : item.conta;
          
          await supabase.from("contas_publicas").upsert({
            demonstrativo: "DCA",
            anexo: anexo,
            exercicio: exercicio,
            periodo: 0,
            conta: contaKey,
            valor: parseFloat(String(item.valor)) || 0,
            coluna: item.coluna || "Valor",
            fonte_url: `https://siconfi.tesouro.gov.br/siconfi/pages/public/conteudo.jsf?id=1`,
          }, { onConflict: "demonstrativo,anexo,exercicio,periodo,conta,coluna" });
          total++;
        }
    } catch (e) {
      console.error(`Erro DCA ${anexo} ${exercicio}:`, e.message);
    }
    
    await new Promise(r => setTimeout(r, 500));
  }
  
  return total;
}

// Fetch RREO (Relatório Resumido de Execução Orçamentária)
async function syncRREO(supabase: any, exercicio: number) {
  let total = 0;
  
  const anexos = [
    "RREO-Anexo 01",   // Balanço Orçamentário
    "RREO-Anexo 02",   // Despesa por Função e Subfunção
    "RREO-Anexo 03",   // Receita Corrente Líquida
    "RREO-Anexo 06",   // Resultados Primário e Nominal
    "RREO-Anexo 07",   // Restos a Pagar
    "RREO-Anexo 08",   // Despesas com Manutenção e Desenvolvimento do Ensino
    "RREO-Anexo 12",   // Despesas com Saúde
  ];
  
  // Try all 6 bimesters
  for (let periodo = 1; periodo <= 6; periodo++) {
    for (const anexo of anexos) {
      try {
        const url = `${SICONFI_BASE}/rreo?an_exercicio=${exercicio}&nr_periodo=${periodo}&co_tipo_demonstrativo=RREO&no_anexo=${encodeURIComponent(anexo)}&id_ente=${ID_ENTE}`;
        const res = await fetch(url);
        
        if (!res.ok) continue;
        
        const data = await res.json();
        const items = data?.items || [];
        
        for (const item of items) {
          if (!item.conta) continue;
          
          const contaKey = item.cod_conta ? `${item.cod_conta}::${item.conta}` : item.conta;
          
          await supabase.from("contas_publicas").upsert({
            demonstrativo: "RREO",
            anexo: anexo,
            exercicio: exercicio,
            periodo: periodo,
            conta: contaKey,
            valor: parseFloat(String(item.valor)) || 0,
            coluna: item.coluna || "Valor",
            fonte_url: `https://siconfi.tesouro.gov.br/siconfi/pages/public/conteudo.jsf?id=1`,
          }, { onConflict: "demonstrativo,anexo,exercicio,periodo,conta,coluna" });
          total++;
        }
      } catch (e) {
        console.error(`Erro RREO ${anexo} P${periodo} ${exercicio}:`, e.message);
      }
      
      await new Promise(r => setTimeout(r, 300));
    }
  }
  
  return total;
}

// Fetch RGF (Relatório de Gestão Fiscal)
async function syncRGF(supabase: any, exercicio: number) {
  let total = 0;
  
  const anexos = [
    "RGF-Anexo 01",  // Despesa com Pessoal
    "RGF-Anexo 02",  // Dívida Consolidada
    "RGF-Anexo 03",  // Garantias e Contragarantias
    "RGF-Anexo 06",  // Demonstrativo Simplificado
  ];
  
  // RGF is quadrimestral (3 periods)
  for (let periodo = 1; periodo <= 3; periodo++) {
    for (const anexo of anexos) {
      try {
        const url = `${SICONFI_BASE}/rgf?an_exercicio=${exercicio}&nr_periodo=${periodo}&co_tipo_demonstrativo=RGF&no_anexo=${encodeURIComponent(anexo)}&id_ente=${ID_ENTE}&co_poder=E`;
        const res = await fetch(url);
        
        if (!res.ok) continue;
        
        const data = await res.json();
        const items = data?.items || [];
        
        for (const item of items) {
          if (!item.conta) continue;
          
          const contaKey = item.cod_conta ? `${item.cod_conta}::${item.conta}` : item.conta;
          
          await supabase.from("contas_publicas").upsert({
            demonstrativo: "RGF",
            anexo: anexo,
            exercicio: exercicio,
            periodo: periodo,
            conta: contaKey,
            valor: parseFloat(String(item.valor)) || 0,
            coluna: item.coluna || "Valor",
            fonte_url: `https://siconfi.tesouro.gov.br/siconfi/pages/public/conteudo.jsf?id=1`,
          }, { onConflict: "demonstrativo,anexo,exercicio,periodo,conta,coluna" });
          total++;
        }
      } catch (e) {
        console.error(`Erro RGF ${anexo} P${periodo} ${exercicio}:`, e.message);
      }
      
      await new Promise(r => setTimeout(r, 300));
    }
  }
  
  return total;
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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });

  if (!authorize(req)) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let body: any = {};
  try { body = await req.json(); } catch { /* ignore */ }
  
  const targetYear = body?.ano || new Date().getFullYear();
  const tipo = body?.tipo || "dca"; // "dca", "rreo", "rgf"

  try {
    const resultados: Record<string, string> = {};

    if (tipo === "dca") {
      const n = await syncDCA(supabase, targetYear);
      resultados[`dca_${targetYear}`] = `${n} registros`;
    } else if (tipo === "rreo") {
      const n = await syncRREO(supabase, targetYear);
      resultados[`rreo_${targetYear}`] = `${n} registros`;
    } else if (tipo === "rgf") {
      const n = await syncRGF(supabase, targetYear);
      resultados[`rgf_${targetYear}`] = `${n} registros`;
    }

    return new Response(JSON.stringify({ success: true, ano: targetYear, resultados }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

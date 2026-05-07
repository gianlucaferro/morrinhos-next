import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function consultarCNPJ(cnpj: string): Promise<any | null> {
  const clean = cnpj.replace(/\D/g, "");
  if (clean.length !== 14) return null;

  // Try BrasilAPI first
  try {
    const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${clean}`);
    if (res.ok) {
      const data = await res.json();
      return {
        cnpj: clean,
        razao_social: data.razao_social || null,
        nome_fantasia: data.nome_fantasia || null,
        data_abertura: data.data_inicio_atividade || null,
        situacao_cadastral: data.descricao_situacao_cadastral || null,
        natureza_juridica: data.natureza_juridica || null,
        porte: data.porte || null,
        capital_social: data.capital_social || null,
        cnae_principal: data.cnae_fiscal?.toString() || null,
        cnae_descricao: data.cnae_fiscal_descricao || null,
        logradouro: [data.descricao_tipo_de_logradouro, data.logradouro, data.numero, data.complemento]
          .filter(Boolean).join(" ") || null,
        municipio: data.municipio || null,
        uf: data.uf || null,
        cep: data.cep || null,
        telefone: data.ddd_telefone_1 || null,
        email: data.email || null,
        socios: data.qsa || [],
      };
    }
  } catch (e) {
    console.warn(`BrasilAPI failed for ${clean}:`, e);
  }

  // Fallback: OpenCNPJ
  try {
    const res = await fetch(`https://api.opencnpj.org/${clean}`);
    if (res.ok) {
      const data = await res.json();
      return {
        cnpj: clean,
        razao_social: data.razao_social || null,
        nome_fantasia: data.nome_fantasia || null,
        data_abertura: data.data_inicio_atividade || null,
        situacao_cadastral: data.situacao_cadastral || null,
        natureza_juridica: data.natureza_juridica || null,
        porte: data.porte || null,
        capital_social: data.capital_social ? parseFloat(data.capital_social) : null,
        cnae_principal: data.cnae_fiscal || null,
        cnae_descricao: data.cnae_fiscal_descricao || null,
        logradouro: data.logradouro || null,
        municipio: data.municipio || null,
        uf: data.uf || null,
        cep: data.cep || null,
        telefone: data.telefone || null,
        email: data.email || null,
        socios: data.qsa || [],
      };
    }
  } catch (e) {
    console.warn(`OpenCNPJ failed for ${clean}:`, e);
  }

  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const body = await req.json().catch(() => ({}));
    const batchSize = body?.batch_size || 10;
    const forceRefresh = body?.force === true;

    // 1. Collect all unique CNPJs from contratos_aditivos
    const { data: aditivos, error: aErr } = await supabase
      .from("contratos_aditivos")
      .select("cnpj")
      .not("cnpj", "is", null);
    if (aErr) throw aErr;

    const allCnpjs = [...new Set(
      (aditivos || [])
        .map((a: any) => a.cnpj?.replace(/\D/g, ""))
        .filter((c: string) => c && c.length === 14)
    )];

    if (!allCnpjs.length) {
      return new Response(
        JSON.stringify({ success: true, consulted: 0, total: 0, message: "Nenhum CNPJ encontrado nos aditivos." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Get already cached CNPJs
    let alreadyCached = new Set<string>();
    if (!forceRefresh) {
      const { data: existing } = await supabase
        .from("fornecedores_cnpj")
        .select("cnpj");
      if (existing) {
        alreadyCached = new Set(existing.map((r: any) => r.cnpj));
      }
    }

    const toConsult = allCnpjs.filter((c: string) => !alreadyCached.has(c)).slice(0, batchSize);

    if (!toConsult.length) {
      return new Response(
        JSON.stringify({ success: true, consulted: 0, total: allCnpjs.length, cached: alreadyCached.size, message: "Todos os CNPJs já foram consultados." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Consult each CNPJ
    let consulted = 0;
    const errors: string[] = [];

    for (const cnpj of toConsult) {
      try {
        const result = await consultarCNPJ(cnpj);
        if (result) {
          const { error: uErr } = await supabase
            .from("fornecedores_cnpj")
            .upsert({
              ...result,
              consultado_em: new Date().toISOString(),
            }, { onConflict: "cnpj" });

          if (uErr) {
            errors.push(`Upsert ${cnpj}: ${uErr.message}`);
          } else {
            consulted++;
          }
        } else {
          errors.push(`CNPJ ${cnpj}: não encontrado nas APIs`);
        }

        // Rate limit: 1 req/sec for BrasilAPI
        await new Promise(r => setTimeout(r, 1200));
      } catch (e) {
        errors.push(`CNPJ ${cnpj}: ${(e as Error).message}`);
      }
    }

    console.log(`CNPJ sync: ${consulted} consulted, ${errors.length} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        consulted,
        remaining: allCnpjs.length - alreadyCached.size - consulted,
        total: allCnpjs.length,
        errors: errors.slice(0, 10),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("sync-fornecedores-cnpj error:", e);
    return new Response(
      JSON.stringify({ success: false, error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

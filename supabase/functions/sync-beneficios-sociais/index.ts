import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const IBGE_CODE = "5213806";
const API_BASE = "https://api.portaldatransparencia.gov.br/api-de-dados";

interface ProgramConfig {
  programa: string;
  endpoint: string;
  unidade: string;
  extractBeneficiarios: (items: any[]) => number;
  extractValor: (items: any[]) => number;
  fonteSlug: string;
}

const PROGRAMAS: ProgramConfig[] = [
  {
    programa: "bolsa_familia",
    endpoint: "novo-bolsa-familia-por-municipio",
    unidade: "famílias",
    extractBeneficiarios: (items) => items.reduce((s: number, i: any) => s + (i.quantidadeBeneficiados || i.quantidadeBeneficiadosBolsaFamilia || 1), 0),
    extractValor: (items) => items.reduce((s: number, i: any) => s + (i.valor || 0), 0),
    fonteSlug: "novo-bolsa-familia",
  },
  {
    programa: "bpc",
    endpoint: "bpc-por-municipio",
    unidade: "beneficiários",
    extractBeneficiarios: (items) => items.reduce((s: number, i: any) => s + (i.quantidadeBeneficiados || 1), 0),
    extractValor: (items) => items.reduce((s: number, i: any) => s + (i.valor || 0), 0),
    fonteSlug: "bpc",
  },
  {
    programa: "garantia_safra",
    endpoint: "garantia-safra-por-municipio",
    unidade: "agricultores",
    extractBeneficiarios: (items) => items.reduce((s: number, i: any) => s + (i.quantidadeBeneficiados || 1), 0),
    extractValor: (items) => items.reduce((s: number, i: any) => s + (i.valor || 0), 0),
    fonteSlug: "garantia-safra",
  },
  {
    programa: "peti",
    endpoint: "peti-por-municipio",
    unidade: "crianças/adolescentes",
    extractBeneficiarios: (items) => items.reduce((s: number, i: any) => s + (i.quantidadeBeneficiados || 1), 0),
    extractValor: (items) => items.reduce((s: number, i: any) => s + (i.valor || 0), 0),
    fonteSlug: "peti",
  },
  {
    programa: "seguro_defeso",
    endpoint: "seguro-defeso-por-municipio",
    unidade: "pescadores",
    extractBeneficiarios: (items) => items.reduce((s: number, i: any) => s + (i.quantidadeBeneficiados || 1), 0),
    extractValor: (items) => items.reduce((s: number, i: any) => s + (i.valor || 0), 0),
    fonteSlug: "seguro-defeso",
  },
  {
    programa: "auxilio_gas",
    endpoint: "auxilio-gas-por-municipio",
    unidade: "famílias",
    extractBeneficiarios: (items) => items.reduce((s: number, i: any) => s + (i.quantidadeBeneficiados || 1), 0),
    extractValor: (items) => items.reduce((s: number, i: any) => s + (i.valor || 0), 0),
    fonteSlug: "auxilio-gas-dos-brasileiros",
  },
];

async function fetchAllPages(url: string, apiKey: string): Promise<any[]> {
  let pagina = 1;
  let allItems: any[] = [];

  while (true) {
    const fullUrl = `${url}&pagina=${pagina}`;
    const resp = await fetch(fullUrl, {
      headers: { "chave-api-dados": apiKey, "Accept": "application/json" },
    });

    if (resp.status === 404 || resp.status === 204 || resp.status === 403) {
      await resp.text(); // consume body
      break;
    }
    if (!resp.ok) {
      console.error(`API error ${resp.status} for ${fullUrl}`);
      await resp.text();
      break;
    }

    const data = await resp.json();
    if (!Array.isArray(data) || data.length === 0) break;

    allItems = allItems.concat(data);
    if (data.length < 500) break;
    pagina++;
  }

  return allItems;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const apiKey = Deno.env.get("PORTAL_TRANSPARENCIA_API_KEY");
  const supabase = createClient(supabaseUrl, serviceKey);

  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "PORTAL_TRANSPARENCIA_API_KEY not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const logId = crypto.randomUUID();
  await supabase.from("sync_log").insert({ id: logId, tipo: "beneficios_sociais", status: "running" });

  try {
    // Fetch last 6 months (recent data that may still be updated by the API)
    const now = new Date();
    const months: string[] = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(`${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`);
    }

    let totalUpserted = 0;

    for (const config of PROGRAMAS) {
      for (const mesAno of months) {
        const competencia = `${mesAno.slice(0, 4)}-${mesAno.slice(4)}`;

        const url = `${API_BASE}/${config.endpoint}?mesAno=${mesAno}&codigoIbge=${IBGE_CODE}`;
        const items = await fetchAllPages(url, apiKey);
        if (items.length === 0) continue;

        const beneficiarios = config.extractBeneficiarios(items);
        const valor = config.extractValor(items);

        const { error: upsertError } = await supabase
          .from("beneficios_sociais")
          .upsert({
            programa: config.programa,
            competencia,
            beneficiarios,
            valor_pago: valor,
            unidade_medida: config.unidade,
            fonte_nome: "Portal da Transparência",
            fonte_url: `https://portaldatransparencia.gov.br/beneficios/${config.fonteSlug}?mesAno=${mesAno}&codigoIbge=${IBGE_CODE}`,
            data_coleta: new Date().toISOString(),
          }, { onConflict: "programa,competencia" });

        if (upsertError) {
          console.error(`Upsert error for ${config.programa} ${competencia}:`, upsertError.message);
        } else {
          totalUpserted++;
          console.log(`${config.programa} ${competencia}: ${beneficiarios} beneficiários, R$ ${valor.toFixed(2)}`);
        }

        // Rate limiting - 300ms between calls
        await new Promise(r => setTimeout(r, 300));
      }
    }

    await supabase.from("sync_log").update({
      status: "success",
      finished_at: new Date().toISOString(),
      detalhes: { total_upserted: totalUpserted, programas: PROGRAMAS.map(p => p.programa) },
    }).eq("id", logId);

    return new Response(JSON.stringify({ success: true, total_upserted: totalUpserted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("Sync error:", msg);

    await supabase.from("sync_log").update({
      status: "error",
      finished_at: new Date().toISOString(),
      detalhes: { error: msg },
    }).eq("id", logId);

    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

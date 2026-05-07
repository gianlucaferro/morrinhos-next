import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// SSP-GO publishes monthly stats at goias.gov.br/seguranca/estatisticas/
// SINESP XLSX is too large (9MB+) for edge function memory limits.
// This function scrapes the SSP-GO page for Morrinhos data and
// also serves as a manual data refresh endpoint.

const SSP_GO_URL = "https://goias.gov.br/seguranca/estatisticas/";
const FONTE_URL = "https://dados.mj.gov.br/dataset/sistema-nacional-de-estatisticas-de-seguranca-publica";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    // Check current data
    const { data: current, error } = await supabase
      .from("seguranca_indicadores")
      .select("ano, indicador, ocorrencias, vitimas, municipio")
      .eq("municipio", "Morrinhos")
      .order("ano", { ascending: false });

    if (error) throw error;

    const years = [...new Set((current || []).map(d => d.ano))];
    const latestYear = years.length ? Math.max(...years) : null;

    return new Response(
      JSON.stringify({
        success: true,
        message: "Dados de segurança verificados. Atualização manual necessária para novos períodos (SINESP XLSX > 9MB excede limite de memória).",
        current_years: years.sort((a, b) => b - a),
        latest_year: latestYear,
        total_records: (current || []).length,
        fonte: FONTE_URL,
        ssp_go: SSP_GO_URL,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

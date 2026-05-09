import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

Deno.serve(async (req) => {
  // 🚨 KILL-SWITCH: esta função depende de fonte (Centi) que NÃO existe pra Morrinhos.
  // Está bloqueada via env DISABLED=true até ser reescrita pra NucleoGov.
  if (Deno.env.get("DISABLED") === "true") {
    return new Response(
      JSON.stringify({ ok: false, disabled: true, reason: "needs_nucleogov_rewrite" }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }

  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // Get contracts missing creditor
  const { data: contracts } = await sb
    .from("camara_contratos")
    .select("id, centi_id, numero, ano")
    .is("credor", null)
    .order("ano", { ascending: false });

  if (!contracts?.length) {
    return new Response(JSON.stringify({ success: true, message: "No contracts to enrich", count: 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let enriched = 0;
  const errors: string[] = [];

  for (const contract of contracts) {
    try {
      // Extract numeric centi ID from centi_id format: ctr-{id}-{year}
      const match = contract.centi_id?.match(/^ctr-(\d+)-/);
      if (!match) continue;

      const centiNumericId = match[1];
      const detailUrl = `https://camaramorrinhos.centi.com.br/contratos/contrato/${centiNumericId}`;

      await delay(800);
      const resp = await fetch(detailUrl);
      if (!resp.ok) continue;

      const html = await resp.text();

      // Extract Prestador from detail page
      const prestadorMatch = html.match(/Prestador\s*<\/(?:span|label|div|th|dt)[^>]*>\s*(?:<[^>]+>)*\s*([^<]+)/i)
        || html.match(/Prestador\s*(?:<\/[^>]+>)?\s*(?:<[^>]+>)?\s*([^<]{3,100})/i);

      if (prestadorMatch) {
        const credor = prestadorMatch[1].trim();
        if (credor && credor.length > 2) {
          const { error } = await sb
            .from("camara_contratos")
            .update({ credor })
            .eq("id", contract.id);

          if (error) errors.push(`Update ${contract.numero}: ${error.message}`);
          else enriched++;
        }
      }
    } catch (e) {
      errors.push(`Contract ${contract.numero}: ${(e as Error).message?.slice(0, 100)}`);
    }
  }

  return new Response(
    JSON.stringify({ success: true, total: contracts.length, enriched, errors: errors.slice(0, 10) }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const UA = "morrinhos.ai/1.0 (transparencia municipal)";

function parseContratoDetalhe(html: string): string | null {
  // Structure: <span class="dialog-label">Objeto</span>\n<span class="dialog-text">VALUE</span>
  const match = html.match(/dialog-label">Objeto<\/span>\s*<span[^>]*class="dialog-text"[^>]*>([\s\S]*?)<\/span>/i);
  if (match && match[1]?.trim().length > 5) {
    return match[1].replace(/<[^>]*>/g, "").trim();
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  // Get contracts missing objeto (limit 10 per run to avoid timeout)
  const { data: contratos, error } = await supabase
    .from("contratos")
    .select("id, numero, fonte_url")
    .is("objeto", null)
    .not("fonte_url", "is", null)
    .limit(10);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!contratos || contratos.length === 0) {
    return new Response(JSON.stringify({ message: "Todos os contratos já possuem objeto.", enriched: 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let enriched = 0;
  const errors: string[] = [];

  for (const c of contratos) {
    try {
      console.log(`Fetching detalhe contrato ${c.numero} → ${c.fonte_url}`);
      const resp = await fetch(c.fonte_url!, { headers: { "User-Agent": UA } });
      if (!resp.ok) {
        errors.push(`Contrato ${c.numero}: HTTP ${resp.status}`);
        continue;
      }
      const html = await resp.text();
      const objeto = parseContratoDetalhe(html);

      if (objeto) {
        await supabase.from("contratos").update({ objeto }).eq("id", c.id);
        enriched++;
        console.log(`✓ Contrato ${c.numero}: ${objeto.substring(0, 80)}...`);
      } else {
        console.log(`✗ Contrato ${c.numero}: objeto não encontrado na página`);
        // Mark with empty string to avoid re-fetching
        await supabase.from("contratos").update({ objeto: "(não disponível)" }).eq("id", c.id);
      }

      // Respectful delay
      await new Promise(r => setTimeout(r, 500));
    } catch (e) {
      errors.push(`Contrato ${c.numero}: ${e.message}`);
    }
  }

  return new Response(
    JSON.stringify({ enriched, remaining: contratos.length - enriched, errors }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});

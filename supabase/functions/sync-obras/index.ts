import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const UA = "morrinhos.ai/1.0 (transparencia municipal)";
const PREFEITURA_URL = "https://morrinhos.go.gov.br";
const CENTI_URL = "https://morrinhos.centi.com.br";

function parseBRL(str: string): number | null {
  if (!str || str.trim() === "") return null;
  const cleaned = str.replace(/\./g, "").replace(",", ".").trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

interface ScrapedObra {
  nome: string;
  local: string | null;
  empresa: string | null;
  valor: number | null;
  status: string | null;
  fonte_url: string;
}

// Try to find obras data from contratos that reference construction/works
async function findObrasFromContratos(sb: any): Promise<ScrapedObra[]> {
  const obras: ScrapedObra[] = [];

  // Search contratos for construction-related terms
  const keywords = [
    "construção", "reforma", "pavimentação", "obra", "edificação",
    "infraestrutura", "ponte", "estrada", "asfalto", "drenagem",
    "saneamento", "manutenção predial", "ampliação",
  ];

  const { data: contratos } = await sb.from("contratos")
    .select("*")
    .order("vigencia_inicio", { ascending: false });

  for (const c of contratos || []) {
    const objeto = (c.objeto || "").toLowerCase();
    const isObra = keywords.some(k => objeto.includes(k));
    if (isObra) {
      obras.push({
        nome: c.objeto || `Contrato ${c.numero}`,
        local: null,
        empresa: c.empresa,
        valor: c.valor,
        status: c.status === "ativo" ? "em_andamento" : "concluida",
        fonte_url: c.fonte_url || `${CENTI_URL}/contratos`,
      });
    }
  }

  return obras;
}

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
  const { data: log } = await sb.from("sync_log")
    .insert({ tipo: "obras", status: "running", detalhes: {} })
    .select("id").single();
  const logId = log?.id;

  const errors: string[] = [];
  let newCount = 0;
  let updatedCount = 0;

  try {
    // 1. Try prefeitura website for obras info
    let prefeituraObras: ScrapedObra[] = [];
    try {
      // Try common paths for obras pages
      const obrasPaths = ["/obras", "/obras-publicas", "/infraestrutura"];
      for (const path of obrasPaths) {
        try {
          const resp = await fetch(`${PREFEITURA_URL}${path}`, {
            headers: { "User-Agent": UA },
            redirect: "follow",
          });
          if (resp.ok) {
            const html = await resp.text();
            console.log(`Prefeitura ${path}: ${html.length} bytes`);
            // Parse if we find structured data
            // Most prefeitura sites use WordPress with custom post types
          }
        } catch {
          // Path doesn't exist, continue
        }
      }
    } catch (e) {
      errors.push(`Prefeitura obras: ${e.message}`);
    }

    // 2. Cross-reference with contratos to find construction works
    const obrasFromContratos = await findObrasFromContratos(sb);
    console.log(`Obras inferidas de contratos: ${obrasFromContratos.length}`);

    // 3. Update existing obras status from contratos
    const { data: existingObras } = await sb.from("obras").select("*");
    for (const obra of existingObras || []) {
      // Check if any related contrato has status info
      if (obra.empresa) {
        const { data: relatedContratos } = await sb.from("contratos")
          .select("status, vigencia_fim")
          .ilike("empresa", `%${obra.empresa.split(" ")[0]}%`)
          .order("vigencia_inicio", { ascending: false })
          .limit(1);

        if (relatedContratos?.[0]) {
          const contrato = relatedContratos[0];
          let newStatus = obra.status;
          if (contrato.vigencia_fim) {
            const fimDate = new Date(contrato.vigencia_fim);
            if (fimDate < new Date()) {
              newStatus = "concluida";
            }
          }
          if (newStatus !== obra.status) {
            await sb.from("obras").update({ status: newStatus }).eq("id", obra.id);
            updatedCount++;
          }
        }
      }
    }

    // 4. Add new obras from contratos that aren't already tracked
    const existingNames = new Set((existingObras || []).map(o => o.nome.toLowerCase()));
    for (const obra of obrasFromContratos.slice(0, 50)) { // Limit to 50 most recent
      if (!existingNames.has(obra.nome.toLowerCase())) {
        // Check if very similar name exists
        const similar = [...existingNames].some(n =>
          n.includes(obra.nome.toLowerCase().substring(0, 30)) ||
          obra.nome.toLowerCase().includes(n.substring(0, 30))
        );
        if (!similar) {
          const { error } = await sb.from("obras").insert({
            nome: obra.nome.substring(0, 500),
            local: obra.local,
            empresa: obra.empresa,
            valor: obra.valor,
            status: obra.status,
            fonte_url: obra.fonte_url,
          });
          if (error) errors.push(`Insert obra: ${error.message}`);
          else newCount++;
        }
      }
    }

    const result = { new: newCount, updated: updatedCount, inferred: obrasFromContratos.length, errors: errors.slice(0, 10) };
    if (logId) {
      await sb.from("sync_log").update({
        status: errors.length > 0 ? "partial" : "success",
        detalhes: result, finished_at: new Date().toISOString(),
      }).eq("id", logId);
    }

    return new Response(JSON.stringify({ success: true, ...result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Erro:", error);
    if (logId) {
      await sb.from("sync_log").update({
        status: "error", detalhes: { error: error.message, errors },
        finished_at: new Date().toISOString(),
      }).eq("id", logId);
    }
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

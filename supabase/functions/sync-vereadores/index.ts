import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const UA = "morrinhos.ai/1.0 (transparencia municipal)";
const WP_API = "https://acessoainformacao.camarademorrinhos.go.gov.br/wp-json/wp/v2";
const VEREADORES_PAGE = "https://acessoainformacao.camarademorrinhos.go.gov.br/vereadores/";

// Map WP slugs to our DB slugs
const SLUG_MAP: Record<string, string> = {
  "adriana-dias-pinheiro": "adriana-pinheiro",
  "aparecida-divani-rocha-cordeiro": "aparecida-divani",
  "douglas-miranda-silva": "douglas-miranda",
  "edimar-lopes-machado": "edimar-lopes",
  "fernando-abraao-magalhaes-silva": "fernando-abraao",
  "marco-antonio-antunes-da-cruz": "marco-antonio",
  "reginaldo-moreira-da-silva": "reginaldo-moreira",
  "sirley-de-fatima-menezes-wehbe": "sirley-wehbe",
  "welton-eterno-da-silva": "welton-eterno",
  "wennder-trindade-e-silva": "wennder-trindade",
  "yuri-santiago-alves": "yuri-santiago",
};

// Known cargo_mesa from the vereadores page
const CARGO_MAP: Record<string, string> = {
  "fernando-abraao": "Presidente",
  "douglas-miranda": "Vice-Presidente",
  "reginaldo-moreira": "1º Secretário",
  "aparecida-divani": "2ª Secretária",
};

async function getMediaUrl(mediaId: number): Promise<string | null> {
  if (!mediaId || mediaId === 0) return null;
  try {
    const resp = await fetch(`${WP_API}/media/${mediaId}?_fields=source_url`, {
      headers: { "User-Agent": UA },
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    return data.source_url || null;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: log } = await sb.from("sync_log")
    .insert({ tipo: "vereadores", status: "running", detalhes: {} })
    .select("id").single();
  const logId = log?.id;

  const errors: string[] = [];
  let updated = 0;

  try {
    // Fetch vereadores from WP API
    const resp = await fetch(
      `${WP_API}/vereador?per_page=20&_fields=id,title,link,slug,featured_media`,
      { headers: { "User-Agent": UA } }
    );
    if (!resp.ok) throw new Error(`WP API HTTP ${resp.status}`);
    const wpVereadores = await resp.json();

    // Also scrape the vereadores page for cargo_mesa info
    let pageHtml = "";
    try {
      const pageResp = await fetch(VEREADORES_PAGE, { headers: { "User-Agent": UA } });
      if (pageResp.ok) pageHtml = await pageResp.text();
    } catch (e) {
      errors.push(`Page scrape: ${e.message}`);
    }

    for (const wpV of wpVereadores) {
      if (wpV.slug === "mesa-diretora") continue; // Skip non-person entry

      const dbSlug = SLUG_MAP[wpV.slug] || wpV.slug;
      const nome = wpV.title.rendered;

      // Get photo URL from WP media
      const fotoUrl = await getMediaUrl(wpV.featured_media);

      // Determine cargo_mesa from our map or scrape
      let cargoMesa = CARGO_MAP[dbSlug] || null;

      // Try to find cargo from page HTML
      if (!cargoMesa && pageHtml) {
        const nameEscaped = nome.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const cargoPattern = new RegExp(
          `${nameEscaped}[\\s\\S]{0,200}?(Presidente|Vice-Presidente|Secretári[oa]|1[ºª]\\s*Secretári[oa]|2[ºª]\\s*Secretári[oa]|Vereador[a]?)`,
          "i"
        );
        const match = pageHtml.match(cargoPattern);
        if (match && match[1] && !match[1].match(/^Vereador/i)) {
          cargoMesa = match[1].trim();
        }
      }

      // Update existing vereador
      const { data: existing } = await sb.from("vereadores")
        .select("id")
        .eq("slug", dbSlug)
        .maybeSingle();

      if (existing) {
        const updateData: Record<string, any> = {
          nome,
          fonte_url: wpV.link,
        };
        if (fotoUrl) updateData.foto_url = fotoUrl;
        if (cargoMesa) updateData.cargo_mesa = cargoMesa;

        const { error } = await sb.from("vereadores")
          .update(updateData)
          .eq("id", existing.id);

        if (error) errors.push(`Update ${nome}: ${error.message}`);
        else updated++;
      } else {
        // Insert new vereador
        const { error } = await sb.from("vereadores").insert({
          nome,
          slug: dbSlug,
          foto_url: fotoUrl,
          cargo_mesa: cargoMesa,
          fonte_url: wpV.link,
          inicio_mandato: "2025-01-01",
          fim_mandato: "2028-12-31",
        });
        if (error) errors.push(`Insert ${nome}: ${error.message}`);
        else updated++;
      }
    }

    const result = { updated, errors: errors.slice(0, 10) };
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

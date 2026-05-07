import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const UA = "morrinhos.ai/1.0 (transparencia municipal)";
// Subsídio base NÃO deve ser alterado pela sync — é fixado anualmente (2026: R$ 9.357,00)
// A sync busca apenas o nome do secretário, sem sobrescrever o subsídio base.
const SECRETARIADO_URL = "https://morrinhos.go.gov.br/secretariado/";

// Normalize for matching
function normalize(s: string): string {
  return s.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();
}

// Match secretaria name from website heading to DB secretaria
function matchSecretariaByName(heading: string, secretarias: any[]): any | null {
  const hNorm = normalize(heading);
  for (const sec of secretarias) {
    const secNorm = normalize(sec.nome);
    // Extract keywords from both, ignoring "SECRETARIA DE/DO/DA"
    const cleanH = hNorm.replace(/SECRETARIA\s+(DE|DO|DA|MUNICIPAL\s+DE)\s*/g, "").trim();
    const cleanS = secNorm.replace(/SECRETARIA\s+(DE|DO|DA|MUNICIPAL\s+DE)\s*/g, "").trim();
    
    // Check if one contains the other or significant overlap
    if (cleanS.includes(cleanH) || cleanH.includes(cleanS)) return sec;
    
    // Check first significant word match
    const hWords = cleanH.split(/[\s,]+/).filter(w => w.length > 3);
    const sWords = cleanS.split(/[\s,]+/).filter(w => w.length > 3);
    const matches = hWords.filter(w => sWords.some(sw => sw.includes(w) || w.includes(sw)));
    if (matches.length >= 1) return sec;
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: log } = await sb.from("sync_log")
    .insert({ tipo: "executivo_secretarias", status: "running", detalhes: {} })
    .select("id").single();
  const logId = log?.id;

  const errors: string[] = [];
  let updated = 0;

  try {
    // 1. Verify executivo data
    const { data: executivos } = await sb.from("executivo").select("*");
    console.log(`Executivos no banco: ${(executivos || []).length}`);

    // 2. Fetch secretarias from DB
    const { data: secretarias } = await sb.from("secretarias").select("*");
    console.log(`Secretarias no banco: ${(secretarias || []).length}`);

    // 3. Scrape secretariado page for names (PRIMARY SOURCE)
    try {
      const resp = await fetch(SECRETARIADO_URL, {
        headers: { "User-Agent": UA },
        redirect: "follow",
      });
      
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const html = await resp.text();
      console.log("Secretariado page fetched successfully");

      // Parse: find pairs of heading (h2) + name (jet-listing-dynamic-field__content)
      // The page structure: h2 with secretaria name, then further down the name in dynamic field
      const sections = html.split(/<h2[^>]*class="elementor-heading-title[^"]*"[^>]*>/);
      
      for (let i = 1; i < sections.length; i++) {
        const section = sections[i];
        // Get secretaria heading
        const headingMatch = section.match(/^(.*?)<\/h2>/s);
        if (!headingMatch) continue;
        const heading = headingMatch[1].replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
        
        if (!heading.toLowerCase().includes("secretari")) continue;

        // Get the secretário name from dynamic field
        const nameMatch = section.match(/jet-listing-dynamic-field__content">(.*?)<\/div>/);
        if (!nameMatch) continue;
        const secretarioNome = nameMatch[1].replace(/\u2060/g, "").trim(); // Remove zero-width chars

        // Match to DB secretaria
        const sec = matchSecretariaByName(heading, secretarias || []);
        if (sec) {
          // Find servidor for remuneração
          const nomeUpper = normalize(secretarioNome);
          const { data: servidorRows } = await sb.from("servidores")
            .select("id, nome")
            .order("nome");
          
          // Fuzzy match servidor by name
          let servidorId: string | null = null;
          for (const srv of servidorRows || []) {
            if (normalize(srv.nome) === nomeUpper) {
              servidorId = srv.id;
              break;
            }
          }
          // Try partial match if exact failed
          if (!servidorId) {
            const nameParts = nomeUpper.split(" ");
            for (const srv of servidorRows || []) {
              const srvNorm = normalize(srv.nome);
              // Match if first and last name match
              if (nameParts.length >= 2 && srvNorm.includes(nameParts[0]) && srvNorm.includes(nameParts[nameParts.length - 1])) {
                servidorId = srv.id;
                break;
              }
            }
          }

          // Apenas atualiza o nome do secretário — subsídio base é fixo anualmente
          const { error } = await sb.from("secretarias").update({
            secretario_nome: secretarioNome,
          }).eq("id", sec.id);
          if (error) {
            errors.push(`Update ${sec.nome}: ${error.message}`);
          } else {
            updated++;
            console.log(`✓ ${sec.nome} → ${secretarioNome}`);
          }
        } else {
          console.log(`✗ Sem match DB para: "${heading}"`);
        }
      }
    } catch (e) {
      errors.push(`Secretariado scrape: ${e.message}`);
      console.error("Erro no scrape:", e.message);
    }

    console.log(`Total updated: ${updated}`);

    const result = {
      executivos: (executivos || []).length,
      secretarias: (secretarias || []).length,
      updated,
      errors: errors.slice(0, 10),
    };

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

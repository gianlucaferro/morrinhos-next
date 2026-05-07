import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const UA = "morrinhos.ai/1.0 (transparencia legislativa)";
const WP_API = "https://acessoainformacao.camarademorrinhos.go.gov.br/wp-json/wp/v2";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: log } = await sb.from("sync_log")
    .insert({ tipo: "presenca-sessoes", status: "running", detalhes: {} })
    .select("id").single();
  const logId = log?.id;

  const errors: string[] = [];
  let newCount = 0;

  try {
    // Get all vereadores for matching
    const { data: vereadores } = await sb.from("vereadores").select("id, nome, slug");
    const vereadorMap = new Map<string, { id: string; nome: string }>();
    for (const v of vereadores || []) {
      // Index by normalized name parts for fuzzy matching
      const parts = v.nome.toLowerCase().split(/\s+/);
      for (const part of parts) {
        if (part.length > 3) vereadorMap.set(part, { id: v.id, nome: v.nome });
      }
      vereadorMap.set(v.nome.toLowerCase(), { id: v.id, nome: v.nome });
    }

    // Fetch lista-de-presenca posts from WP API (paginated)
    let page = 1;
    let hasMore = true;
    const allPosts: any[] = [];

    while (hasMore) {
      const resp = await fetch(
        `${WP_API}/lista-de-presenca?per_page=50&page=${page}&_fields=id,title,link,date,content,ano-da-sessao,tipo-de-sessao&_embed`,
        { headers: { "User-Agent": UA } }
      );
      
      if (!resp.ok) {
        if (resp.status === 400) { hasMore = false; break; }
        throw new Error(`WP API HTTP ${resp.status}`);
      }
      
      const posts = await resp.json();
      if (!Array.isArray(posts) || posts.length === 0) { hasMore = false; break; }
      allPosts.push(...posts);
      
      const totalPages = parseInt(resp.headers.get("x-wp-totalpages") || "1");
      if (page >= totalPages) hasMore = false;
      page++;
    }

    console.log(`Lista de presença: ${allPosts.length} posts encontrados`);

    for (const post of allPosts) {
      const titulo = post.title?.rendered || "";
      const wpPostId = post.id;
      const postDate = post.date?.split("T")[0];
      
      // Extract year from title or taxonomy
      const yearMatch = titulo.match(/(\d{4})/);
      const ano = yearMatch ? parseInt(yearMatch[1]) : (postDate ? parseInt(postDate.split("-")[0]) : new Date().getFullYear());

      // Determine session type from title
      let tipoSessao = "ordinária";
      if (/extraordin/i.test(titulo)) tipoSessao = "extraordinária";
      else if (/especial/i.test(titulo)) tipoSessao = "especial";
      else if (/solene/i.test(titulo)) tipoSessao = "solene";

      // Try to extract date from title
      let sessaoData: string | null = null;
      const dateInTitle = titulo.match(/(\d{1,2})\s*(?:de\s+)?(\w+)\s*(?:de\s+)?(\d{4})/i);
      if (dateInTitle) {
        const meses: Record<string, string> = {
          janeiro: "01", fevereiro: "02", março: "03", marco: "03", abril: "04",
          maio: "05", junho: "06", julho: "07", agosto: "08", setembro: "09",
          outubro: "10", novembro: "11", dezembro: "12",
        };
        const mesNum = meses[dateInTitle[2].toLowerCase()];
        if (mesNum) {
          sessaoData = `${dateInTitle[3]}-${mesNum}-${dateInTitle[1].padStart(2, "0")}`;
        }
      }

      // Fetch post content to find vereador names
      let content = post.content?.rendered || "";
      if (!content) {
        try {
          const detailResp = await fetch(`${WP_API}/lista-de-presenca/${wpPostId}?_fields=content`, {
            headers: { "User-Agent": UA },
          });
          if (detailResp.ok) {
            const detail = await detailResp.json();
            content = detail.content?.rendered || "";
          }
        } catch { /* skip */ }
      }

      // Parse the content to find vereador names
      const textContent = content.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ");
      
      // Match vereador names in content
      const matchedVereadores = new Set<string>();
      for (const v of vereadores || []) {
        // Check if vereador name appears in content
        const nameParts = v.nome.split(/\s+/);
        const firstName = nameParts[0];
        const lastName = nameParts[nameParts.length - 1];
        
        if (textContent.toLowerCase().includes(v.nome.toLowerCase()) ||
            (firstName.length > 3 && lastName.length > 3 && 
             textContent.toLowerCase().includes(firstName.toLowerCase()) &&
             textContent.toLowerCase().includes(lastName.toLowerCase()))) {
          matchedVereadores.add(v.id);
          
          const { error } = await sb.from("presenca_sessoes").upsert({
            wp_post_id: wpPostId,
            vereador_nome: v.nome,
            sessao_titulo: titulo,
            sessao_data: sessaoData,
            tipo_sessao: tipoSessao,
            ano,
            vereador_id: v.id,
            presente: true,
            fonte_url: post.link || `https://acessoainformacao.camarademorrinhos.go.gov.br/lista-de-presenca/${post.slug}/`,
          }, { onConflict: "wp_post_id,vereador_nome" });
          
          if (error) errors.push(`Presença ${v.nome}: ${error.message}`);
          else newCount++;
        }
      }

      // If no vereadores matched in content, just log the session without individual records
      if (matchedVereadores.size === 0 && titulo) {
        // Insert a summary record
        const { error } = await sb.from("presenca_sessoes").upsert({
          wp_post_id: wpPostId,
          vereador_nome: "SESSÃO",
          sessao_titulo: titulo,
          sessao_data: sessaoData,
          tipo_sessao: tipoSessao,
          ano,
          presente: true,
          fonte_url: post.link || `https://acessoainformacao.camarademorrinhos.go.gov.br/lista-de-presenca/`,
        }, { onConflict: "wp_post_id,vereador_nome" });
        if (error) errors.push(`Sessão: ${error.message}`);
        else newCount++;
      }
    }

    const result = { posts: allPosts.length, records: newCount, errors: errors.slice(0, 10) };
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

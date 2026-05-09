import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const UA = "morrinhos.ai/1.0 (transparencia legislativa)";
const VOTACOES_URL = "https://morrinhos.go.leg.br";

interface ScrapedVotacao {
  titulo: string;
  data: string;
  resultado: string;
  fonte_url: string;
}

function parseVotacoesHtml(html: string): ScrapedVotacao[] {
  const votacoes: ScrapedVotacao[] = [];

  // The votações page uses a jet-listing grid similar to atuação parlamentar
  // Each item has: title (projeto reference), date, result
  const itemPattern = /jet-listing-dynamic-field__content">([\s\S]*?)<\/div>/gi;
  const items: string[] = [];
  let m;
  while ((m = itemPattern.exec(html)) !== null) {
    items.push(m[1].replace(/<[^>]*>/g, "").trim());
  }

  // Group items in sets (title, date, description, etc.)
  // Try to find project references and voting results
  const projectPattern = /(Projeto\s+de\s+(?:Lei|Resolução|Lei Complementar)[^,]*?\d+\/\d{4})/i;
  const datePattern = /(\d{2})\/(\d{2})\/(\d{4})/;
  const resultPattern = /(aprovad[oa]|rejeitad[oa]|arquivad[oa]|retirad[oa]|unanimidade|maioria)/i;

  // Also try link-based approach
  const linkPattern = /href="([^"]*resultado[^"]*)"[^>]*>[\s\S]*?<\/a>/gi;
  const links: string[] = [];
  let lm;
  while ((lm = linkPattern.exec(html)) !== null) {
    links.push(lm[1]);
  }

  // Parse structured blocks from the page
  const blockPattern = /<article[^>]*>([\s\S]*?)<\/article>/gi;
  let block;
  while ((block = blockPattern.exec(html)) !== null) {
    const content = block[1];
    const titleMatch = content.match(projectPattern);
    const dateMatch = content.match(datePattern);

    if (titleMatch && dateMatch) {
      const data = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`;
      const resultMatch = content.match(resultPattern);
      const resultado = resultMatch ? resultMatch[1] : "Votado";

      const linkMatch = content.match(/href="([^"]*)"/);
      const fonteUrl = linkMatch ? linkMatch[1] : VOTACOES_URL;

      votacoes.push({
        titulo: titleMatch[1].trim(),
        data,
        resultado,
        fonte_url: fonteUrl.startsWith("http") ? fonteUrl : `https://morrinhos.go.leg.br      });
    }
  }

  // Fallback: try simpler pattern for grid-based layouts
  if (votacoes.length === 0) {
    const gridItems = html.split(/class="[^"]*jet-listing-grid__item/);
    for (const item of gridItems.slice(1)) {
      const titleMatch = item.match(projectPattern);
      const dateMatch = item.match(datePattern);
      if (titleMatch && dateMatch) {
        const data = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`;
        const resultMatch = item.match(resultPattern);
        const linkMatch = item.match(/href="([^"]*)"/);
        votacoes.push({
          titulo: titleMatch[1].trim(),
          data,
          resultado: resultMatch ? resultMatch[1] : "Votado",
          fonte_url: linkMatch?.[1] || VOTACOES_URL,
        });
      }
    }
  }

  return votacoes;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: log } = await sb.from("sync_log")
    .insert({ tipo: "votacoes", status: "running", detalhes: {} })
    .select("id").single();
  const logId = log?.id;

  const errors: string[] = [];
  let newCount = 0;

  try {
    // Fetch the votações page
    const resp = await fetch(VOTACOES_URL, { headers: { "User-Agent": UA } });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const html = await resp.text();

    const scraped = parseVotacoesHtml(html);
    console.log(`Votações encontradas: ${scraped.length}`);

    // Get existing projetos to match
    const { data: projetos } = await sb.from("projetos").select("id, tipo, numero, ano");
    const projetoMap = new Map(
      (projetos || []).map(p => [`${p.tipo}|${p.numero}|${p.ano}`, p.id])
    );

    for (const v of scraped) {
      // Try to match projeto
      const projMatch = v.titulo.match(/(Projeto\s+de\s+(?:Lei|Resolução|Lei Complementar))\s+n[ºo°]\s*(\d+)\/(\d{4})/i);
      if (!projMatch) continue;

      const key = `${projMatch[1]}|${projMatch[2]}|${parseInt(projMatch[3])}`;
      const projetoId = projetoMap.get(key);
      if (!projetoId) {
        console.log(`Projeto não encontrado: ${v.titulo}`);
        continue;
      }

      // Check if votação already exists
      const { data: existing } = await sb.from("votacoes")
        .select("id")
        .eq("projeto_id", projetoId)
        .eq("data", v.data)
        .maybeSingle();

      if (!existing) {
        const { error } = await sb.from("votacoes").insert({
          projeto_id: projetoId,
          data: v.data,
          resultado: v.resultado,
          fonte_url: v.fonte_url,
        });
        if (error) errors.push(`Insert votação: ${error.message}`);
        else newCount++;
      }
    }

    const result = { scraped: scraped.length, new: newCount, errors: errors.slice(0, 10) };
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

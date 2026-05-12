import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CENTI_URL = "https://camaramorrinhos.centi.com.br/transparencia/atosadministrativos/6";
const UA = "morrinhos.ai/1.0 (transparencia municipal)";

interface ScrapedDoc {
  descricao: string;
  observacao: string | null;
  data_publicacao: string | null;
  documento_url: string | null;
}

function parseDate(dateStr: string): string | null {
  // Format: dd/mm/yyyy -> yyyy-mm-dd
  const match = dateStr.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  return `${match[3]}-${match[2]}-${match[1]}`;
}

function parseDocuments(html: string): ScrapedDoc[] {
  const docs: ScrapedDoc[] = [];
  const tbodyMatch = html.match(/<tbody>([\s\S]*?)<\/tbody>/);
  if (!tbodyMatch) return docs;

  const rows = tbodyMatch[1].split("</tr>").filter(r => r.includes("<td"));
  for (const row of rows) {
    const cells: string[] = [];
    const cellPattern = /<td[^>]*>([\s\S]*?)<\/td>/g;
    let m;
    while ((m = cellPattern.exec(row)) !== null) {
      cells.push(m[1].trim());
    }
    if (cells.length < 3) continue;

    const descricao = cells[0].replace(/<[^>]*>/g, "").trim();
    const observacao = cells[1]?.replace(/<[^>]*>/g, "").trim() || null;
    const dataStr = cells[2]?.replace(/<[^>]*>/g, "").trim() || "";
    const data_publicacao = parseDate(dataStr);

    // Extract document URL from anchor tag
    let documento_url: string | null = null;
    const linkMatch = cells[3]?.match(/href="([^"]+)"/);
    if (linkMatch) {
      documento_url = linkMatch[1];
      if (documento_url.startsWith("/")) {
        documento_url = `https://camaramorrinhos.centi.com.br${documento_url}`;
      }
    }

    if (descricao && descricao.length > 3 && !descricao.includes("Nenhum resultado")) {
      docs.push({ descricao, observacao: observacao || null, data_publicacao, documento_url });
    }
  }
  return docs;
}

// === Auth guard: validates CRON_SECRET or service_role bearer ===
function authorize(req: Request): boolean {
  const cronSecret = Deno.env.get("CRON_SECRET");
  const headerCron = req.headers.get("x-cron-secret");
  if (cronSecret && headerCron === cronSecret) return true;
  const auth = req.headers.get("authorization") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (serviceKey && auth === `Bearer ${serviceKey}`) return true;
  return false;
}

Deno.serve(async (req) => {
  if (!authorize(req)) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

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
    .insert({ tipo: "lei_organica", status: "running" })
    .select("id").single();
  const logId = log?.id;

  try {
    // Fetch the Centi portal page for "EMENDA À LEI ORGÂNICA MUNICIPAL"
    const resp = await fetch(CENTI_URL, {
      headers: { "User-Agent": UA },
    });
    if (!resp.ok) throw new Error(`Centi fetch failed: ${resp.status}`);
    const html = await resp.text();

    const docs = parseDocuments(html);
    console.log(`Parsed ${docs.length} lei orgânica documents`);

    if (docs.length === 0) {
      const result = { status: "success", documents: 0, message: "No documents found" };
      if (logId) {
        await sb.from("sync_log").update({
          status: "success", detalhes: result, finished_at: new Date().toISOString(),
        }).eq("id", logId);
      }
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Deduplicate by descricao (portal may have duplicates)
    const uniqueMap = new Map<string, ScrapedDoc>();
    for (const doc of docs) {
      if (!uniqueMap.has(doc.descricao)) {
        uniqueMap.set(doc.descricao, doc);
      }
    }
    const uniqueDocs = Array.from(uniqueMap.values());
    console.log(`Unique docs: ${uniqueDocs.length}`);

    // Upsert documents based on descricao (unique identifier)
    let upserted = 0;
    const BATCH = 50;
    for (let i = 0; i < uniqueDocs.length; i += BATCH) {
      const batch = uniqueDocs.slice(i, i + BATCH);
      const { error } = await sb.from("lei_organica").upsert(batch, {
        onConflict: "descricao",
        ignoreDuplicates: false,
      });
      if (error) {
        console.error(`Upsert batch ${i}: ${error.message}`);
      } else {
        upserted += batch.length;
      }
    }

    const result = { status: "success", parsed: docs.length, upserted };
    console.log(JSON.stringify(result));

    if (logId) {
      await sb.from("sync_log").update({
        status: "success", detalhes: result, finished_at: new Date().toISOString(),
      }).eq("id", logId);
    }

    return new Response(JSON.stringify({ success: true, ...result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Sync lei orgânica error:", error);
    if (logId) {
      await sb.from("sync_log").update({
        status: "error", detalhes: { error: error.message }, finished_at: new Date().toISOString(),
      }).eq("id", logId);
    }
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

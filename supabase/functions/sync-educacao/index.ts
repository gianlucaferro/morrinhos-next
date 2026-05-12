import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/** Parse QEdu static HTML to extract school metadata */
function parseQeduHtml(html: string) {
  const result: Record<string, unknown> = {};

  // Status (paralisada, extinta, ativa)
  if (/escola\s+paralisada/i.test(html)) result.status = "paralisada";
  else if (/escola\s+extinta/i.test(html)) result.status = "extinta";
  else result.status = "ativa";

  // Etapas
  const etapasMatch = html.match(/Etapas:\s*<\/[^>]+>\s*<[^>]+>([^<]+)/i)
    || html.match(/Etapas:[^]*?<[^>]+>([^<]+)/i);
  if (etapasMatch) {
    const etapasText = etapasMatch[1].trim();
    result.etapas_texto = etapasText;
  }

  // Localização
  const locMatch = html.match(/Localiza[çc][aã]o:\s*<\/[^>]+>\s*<[^>]+>([^<]+)/i)
    || html.match(/Localiza[çc][aã]o:[^]*?<[^>]+>\s*(Rural|Urbana)/i);
  if (locMatch) result.localizacao = locMatch[1].trim();

  // NSE
  const nseMatch = html.match(/Classifica[çc][aã]o NSE\s*(\d)/i);
  if (nseMatch) result.nse = parseInt(nseMatch[1]);

  // Endereço
  const endMatch = html.match(/<li[^>]*>\s*((?:RUA|AV|RODOVIA|POVOADO|FAZENDA)[^<]{10,})/i);
  if (endMatch) result.endereco = endMatch[1].trim().replace(/\s+/g, " ");

  // Telefone
  const telMatch = html.match(/tel:\/\/(\d+)/);
  if (telMatch) {
    const t = telMatch[1];
    result.telefone = `(${t.slice(0, 2)}) ${t.slice(2, 6)}-${t.slice(6)}`;
  }

  // Matrículas (from static HTML "XXMatriculas" pattern - works when server-rendered)
  const matMatch = html.match(/(\d+)\s*Matr[íi]culas/i);
  if (matMatch) {
    const val = parseInt(matMatch[1]);
    if (val > 0) result.matriculas = val;
  }

  return result;
}

/** Map QEdu etapas text to our etapas array */
/** Create a URL-safe slug from school name */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

function mapEtapas(text: string): string[] {
  const etapas: string[] = [];
  const lower = text.toLowerCase();
  if (lower.includes("creche")) etapas.push("creche");
  if (lower.includes("pré-escola") || lower.includes("pre-escola") || lower.includes("infantil")) etapas.push("pre_escola");
  if (lower.includes("fundamental")) etapas.push("ensino_fundamental");
  if (lower.includes("médio") || lower.includes("medio")) etapas.push("ensino_medio");
  if (lower.includes("eja") || lower.includes("jovens e adultos")) etapas.push("eja");
  if (lower.includes("especial")) etapas.push("educacao_especial");
  return etapas.length > 0 ? etapas : [];
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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });

  if (!authorize(req)) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const logId = crypto.randomUUID();
  await supabase.from("sync_log").insert({
    id: logId,
    tipo: "educacao",
    status: "running",
  });

  try {
    let totalSynced = 0;
    const errors: string[] = [];

    // 1. Fetch schools with missing data only
    const { data: escolas } = await supabase
      .from("educacao_escolas")
      .select("id, nome, codigo_inep, matriculas_total, etapas, endereco, telefone")
      .not("codigo_inep", "is", null)
      .or("matriculas_total.is.null,matriculas_total.eq.0,endereco.is.null")
      .order("nome");

    if (escolas && escolas.length > 0) {
      console.log(`Processing ${escolas.length} schools with missing data`);
      // 2. For each school, try to fetch QEdu page for metadata
      for (const escola of escolas) {
        try {
          const slug = slugify(escola.nome);
          const qeduUrl = `https://qedu.org.br/escola/${escola.codigo_inep}-${slug}`;
          const response = await fetch(qeduUrl, {
            headers: {
              "User-Agent": "Mozilla/5.0 (compatible; MorrinhosAI/1.0; +https://www.morrinhos.ai)",
              "Accept": "text/html",
            },
          });

          if (!response.ok) {
            console.log(`QEdu ${escola.codigo_inep}: HTTP ${response.status}`);
            continue;
          }

          const html = await response.text();
          const parsed = parseQeduHtml(html);
          const updates: Record<string, unknown> = {};

          // Update etapas if we got them from QEdu
          if (parsed.etapas_texto) {
            const newEtapas = mapEtapas(parsed.etapas_texto as string);
            if (newEtapas.length > 0) updates.etapas = newEtapas;
          }

          // Update address if we don't have one or QEdu has better data
          if (parsed.endereco && !escola.endereco) {
            updates.endereco = parsed.endereco;
          }

          // Update phone if we don't have one
          if (parsed.telefone && !escola.telefone) {
            updates.telefone = parsed.telefone;
          }

          // Update matriculas only if we got a positive value and current is 0/null
          if (parsed.matriculas && (!escola.matriculas_total || escola.matriculas_total === 0)) {
            updates.matriculas_total = parsed.matriculas;
          }

          if (Object.keys(updates).length > 0) {
            const { error } = await supabase
              .from("educacao_escolas")
              .update(updates)
              .eq("id", escola.id);

            if (error) {
              console.error(`Update error for ${escola.nome}:`, error);
              errors.push(`${escola.nome}: ${error.message}`);
            } else {
              totalSynced++;
              console.log(`Updated ${escola.nome}:`, JSON.stringify(updates));
            }
          }

          // Rate limit: wait 500ms between requests
          await new Promise((r) => setTimeout(r, 500));
        } catch (e) {
          console.log(`QEdu error for ${escola.nome}: ${e}`);
          errors.push(`${escola.nome}: ${String(e)}`);
        }
      }
    }

    // 3. Sync IBGE education indicators
    try {
      const ibgeRes = await fetch(
        "https://servicodados.ibge.gov.br/api/v1/pesquisas/indicadores/60029|60030|60041/resultados/5213806"
      );
      if (ibgeRes.ok) {
        const ibgeData = await ibgeRes.json();
        for (const pesquisa of ibgeData) {
          for (const indicador of pesquisa.indicador || []) {
            const series = indicador.res?.[0]?.res || {};
            for (const [ano, valor] of Object.entries(series)) {
              if (!valor || valor === "-" || valor === "...") continue;
              const chave = `ibge_${indicador.id}_${ano}`;
              await supabase.from("educacao_indicadores").upsert({
                chave,
                categoria: "social",
                valor: parseFloat(String(valor).replace(",", ".")),
                ano_referencia: parseInt(ano),
                fonte: "IBGE",
                fonte_url: "https://cidades.ibge.gov.br/brasil/go/morrinhos/panorama",
              }, { onConflict: "chave,ano_referencia" });
              totalSynced++;
            }
          }
        }
      } else {
        await ibgeRes.text(); // consume body
      }
    } catch (e) {
      console.log("IBGE API error (non-fatal):", e);
      errors.push(`IBGE: ${String(e)}`);
    }

    await supabase
      .from("sync_log")
      .update({
        status: "done",
        finished_at: new Date().toISOString(),
        detalhes: { totalSynced, errors: errors.slice(0, 10), fonte: "QEdu/IBGE" },
      })
      .eq("id", logId);

    return new Response(
      JSON.stringify({ ok: true, totalSynced, errors: errors.slice(0, 10) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Sync educacao error:", error);
    await supabase
      .from("sync_log")
      .update({
        status: "error",
        finished_at: new Date().toISOString(),
        detalhes: { error: String(error) },
      })
      .eq("id", logId);

    return new Response(
      JSON.stringify({ ok: false, error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

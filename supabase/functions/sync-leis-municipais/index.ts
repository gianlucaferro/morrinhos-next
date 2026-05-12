import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const WP_API = "https://morrinhos.go.gov.br/wp-json/wp/v2";
const TIPO_LEI_MUNICIPAL_ID = 56;

async function fetchLeiPage(url: string): Promise<{ ementa: string; data_pub: string | null }> {
  try {
    const resp = await fetch(url, { headers: { "User-Agent": "morrinhos.ai/1.0" } });
    if (!resp.ok) return { ementa: "", data_pub: null };
    const html = await resp.text();

    // Extract ementa from jet-listing-dynamic-field__content after "Ementa da Lei"
    let ementa = "";
    const ementaSection = html.match(/Ementa da Lei[\s\S]*?jet-listing-dynamic-field__content[^>]*>([\s\S]*?)<\/div>/i);
    if (ementaSection) {
      ementa = ementaSection[1].replace(/<[^>]+>/g, "").trim();
    }
    if (!ementa) {
      const altMatch = html.match(/jet-listing-dynamic-field__content[^>]*>([^<]{20,})<\/div>/i);
      if (altMatch) ementa = altMatch[1].trim();
    }
    // Remove leading "LEI MUNICIPAL Nº XXX/YYYY - " prefix
    ementa = ementa.replace(/^LEI\s+MUNICIPAL\s+N[ºo°]\s*\S+\s*[-–]\s*/i, "").trim();

    // Extract date
    const dateMatch = html.match(/Data da Promulga[çc]\w+[\s\S]*?jet-listing-dynamic-field__content[^>]*>(\d{2}\/\d{2}\/\d{4})/i);
    let data_pub: string | null = null;
    if (dateMatch) {
      const [d, m, y] = dateMatch[1].split("/");
      data_pub = `${y}-${m}-${d}`;
    }

    return { ementa, data_pub };
  } catch (e) {
    console.error(`Error fetching ${url}:`, e);
    return { ementa: "", data_pub: null };
  }
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
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  if (!authorize(req)) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    let allPosts: any[] = [];
    let page = 1;
    const perPage = 100;

    while (true) {
      const url = `${WP_API}/leis-municipais?tipo-de-lei=${TIPO_LEI_MUNICIPAL_ID}&per_page=${perPage}&page=${page}`;
      console.log(`Fetching page ${page}: ${url}`);
      const resp = await fetch(url, { headers: { "User-Agent": "morrinhos.ai/1.0" } });

      if (!resp.ok) {
        if (resp.status === 400) break;
        throw new Error(`WP API error: ${resp.status}`);
      }

      const posts = await resp.json();
      if (!posts.length) break;
      allPosts = allPosts.concat(posts);

      const totalPages = parseInt(resp.headers.get("X-WP-TotalPages") || "1");
      if (page >= totalPages) break;
      page++;
    }

    console.log(`Total leis municipais from WP: ${allPosts.length}`);

    const BATCH = 10;
    let inserted = 0;
    let updated = 0;

    for (let i = 0; i < allPosts.length; i += BATCH) {
      const batch = allPosts.slice(i, i + BATCH);

      const results = await Promise.all(batch.map(async (post: any) => {
        const title = post.title?.rendered || "";
        const link = post.link || "";
        const wpDate = post.date ? post.date.split("T")[0] : null;

        const { ementa, data_pub } = await fetchLeiPage(link);

        return {
          numero: title.replace(/^Lei Municipal n[ºo]\s*/i, "").trim(),
          data_publicacao: data_pub || wpDate,
          ementa: ementa || title,
          orgao: null as string | null,
          categoria: null as string | null,
          fonte_url: link,
        };
      }));

      for (const lei of results) {
        const { data: existing } = await supabase
          .from("leis_municipais")
          .select("id")
          .eq("numero", lei.numero)
          .maybeSingle();

        if (existing) {
          await supabase.from("leis_municipais").update({
            data_publicacao: lei.data_publicacao,
            ementa: lei.ementa,
            fonte_url: lei.fonte_url,
          }).eq("id", existing.id);
          updated++;
        } else {
          const { error } = await supabase.from("leis_municipais").insert(lei);
          if (error) console.error(`Insert error for ${lei.numero}:`, error.message);
          else inserted++;
        }
      }

      console.log(`Processed ${Math.min(i + BATCH, allPosts.length)}/${allPosts.length}`);
    }

    console.log(`Done: ${inserted} inserted, ${updated} updated`);
    return new Response(
      JSON.stringify({ success: true, total: allPosts.length, inserted, updated }),
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

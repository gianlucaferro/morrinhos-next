import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: ads } = await supabase
    .from("classificados")
    .select("id, updated_at")
    .eq("status", "ativo")
    .order("updated_at", { ascending: false })
    .limit(500);

  const today = new Date().toISOString().slice(0, 10);

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

  // Main listing page
  xml += `  <url>\n    <loc>https://morrinhos.ai/compra-e-venda</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>0.9</priority>\n  </url>\n`;

  // Individual ads
  for (const ad of ads || []) {
    const lastmod = ad.updated_at ? ad.updated_at.slice(0, 10) : today;
    xml += `  <url>\n    <loc>https://morrinhos.ai/compra-e-venda/${ad.id}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.6</priority>\n  </url>\n`;
  }

  xml += `</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=3600",
    },
  });
});

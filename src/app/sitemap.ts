import type { MetadataRoute } from "next";
import { createPublicSupabaseClient } from "@/lib/supabase/public";

const SITE_URL = "https://morrinhos.ai";

export const revalidate = 3600; // 1 hora

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // Páginas estáticas
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "daily", priority: 1.0 },
    { url: `${SITE_URL}/camara`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE_URL}/vereadores`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE_URL}/atuacao-parlamentar`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/prefeitura`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE_URL}/saude`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/educacao`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/agro`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/seguranca`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/beneficios-sociais`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/arrecadacao`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/emendas`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/contatos`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/coleta-lixo`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/plantao-farmacias`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/zap-mhs`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/compra-e-venda`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/anuncie`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/sobre`, lastModified: now, changeFrequency: "yearly", priority: 0.5 },
    { url: `${SITE_URL}/noticias`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
  ];

  // Anúncios ativos do classificados (dinâmico)
  const dynamicRoutes: MetadataRoute.Sitemap = [];

  try {
    const supabase = createPublicSupabaseClient();

    const { data: ads } = await supabase
      .from("classificados")
      .select("id, updated_at")
      .eq("status", "ativo")
      .order("updated_at", { ascending: false })
      .limit(500);

    if (ads) {
      for (const ad of ads) {
        dynamicRoutes.push({
          url: `${SITE_URL}/compra-e-venda/${ad.id}`,
          lastModified: ad.updated_at ? new Date(ad.updated_at) : now,
          changeFrequency: "weekly",
          priority: 0.6,
        });
      }
    }

    // Vereadores
    const { data: vereadores } = await supabase
      .from("vereadores")
      .select("slug, updated_at")
      .not("slug", "is", null)
      .limit(50);

    if (vereadores) {
      for (const v of vereadores) {
        if (!v.slug) continue;
        dynamicRoutes.push({
          url: `${SITE_URL}/vereadores/${v.slug}`,
          lastModified: v.updated_at ? new Date(v.updated_at) : now,
          changeFrequency: "weekly",
          priority: 0.7,
        });
      }
    }
  } catch (e) {
    // Se DB falhar, retorna só rotas estáticas
    console.error("Sitemap dynamic routes failed:", e);
  }

  return [...staticRoutes, ...dynamicRoutes];
}

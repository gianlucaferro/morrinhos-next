import Image from "next/image";
import { Newspaper, ExternalLink } from "lucide-react";
import { pageMetadata } from "@/lib/seo";
import { fetchNoticias } from "@/lib/data/listings";

export const metadata = pageMetadata({
  title: "Notícias de Morrinhos GO",
  description:
    "Notícias e atualizações sobre Morrinhos e a região, agregadas de fontes oficiais e veículos locais.",
  path: "/noticias",
});

export const revalidate = 1800;

function fmtDate(d: string | null) {
  if (!d) return "";
  try {
    return new Date(d).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

export default async function NoticiasPage() {
  const noticias = await fetchNoticias(50);
  return (
    <>
      <section className="bg-gradient-to-br from-primary/15 to-primary/5 border-b border-border">
        <div className="container py-10 md:py-14">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
            <Newspaper className="w-8 h-8 text-primary" />
            Notícias de Morrinhos
          </h1>
          <p className="mt-3 text-muted-foreground max-w-2xl">
            Agregador automático de notícias sobre Morrinhos e região.
            {noticias.length > 0 && ` ${noticias.length} notícias recentes.`}
          </p>
        </div>
      </section>

      <div className="container py-8">
        {noticias.length === 0 ? (
          <p className="text-muted-foreground text-center py-12">
            Nenhuma notícia encontrada ainda.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {noticias.map((n) => (
              <a
                key={n.id}
                href={n.link}
                target="_blank"
                rel="noopener noreferrer"
                className="stat-card card-hover flex flex-col group"
              >
                {n.image_url && (
                  <div className="relative w-full h-40 -mx-5 -mt-5 mb-3 overflow-hidden rounded-t-lg bg-muted">
                    <Image
                      src={n.image_url}
                      alt={n.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform"
                      unoptimized
                    />
                  </div>
                )}
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {n.source || n.origem || "Fonte"}
                  {n.pub_date && ` · ${fmtDate(n.pub_date)}`}
                </p>
                <h2 className="text-base font-semibold text-foreground mt-1 line-clamp-3 group-hover:text-primary transition-colors">
                  {n.title}
                </h2>
                <p className="text-xs text-primary mt-auto pt-2 inline-flex items-center gap-1">
                  Ler matéria <ExternalLink className="w-3 h-3" />
                </p>
              </a>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

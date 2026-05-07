"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

type Anuncio = {
  id: string;
  nome_empresa: string;
  plano: string;
  imagem_url: string | null;
  link_destino: string | null;
  whatsapp: string | null;
};

async function fetchAnunciosAtivos(): Promise<Anuncio[]> {
  const supabase = createBrowserSupabaseClient();
  const { data } = await supabase
    .from("anuncios")
    .select("id, nome_empresa, plano, imagem_url, link_destino, whatsapp")
    .eq("ativo", true)
    .order("plano", { ascending: false });
  return (data || []) as Anuncio[];
}

function trackImpression(id: string) {
  const supabase = createBrowserSupabaseClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase.rpc("increment_anuncio_impressao" as any, { anuncio_id: id }).then(() => {});
}

function trackClick(id: string) {
  const supabase = createBrowserSupabaseClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase.rpc("increment_anuncio_clique" as any, { anuncio_id: id }).then(() => {});
}

function AnuncioCard({ anuncio }: { anuncio: Anuncio }) {
  useEffect(() => {
    trackImpression(anuncio.id);
  }, [anuncio.id]);

  const href =
    anuncio.link_destino ||
    (anuncio.whatsapp ? `https://wa.me/${anuncio.whatsapp.replace(/\D/g, "")}` : null);
  const isDestaque = anuncio.plano === "destaque";

  if (!anuncio.imagem_url && !href) return null;

  return (
    <a
      href={href || "#"}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => trackClick(anuncio.id)}
      className={`block rounded-xl overflow-hidden transition-all hover:shadow-md ${
        isDestaque ? "ring-1 ring-primary/20" : ""
      }`}
    >
      {anuncio.imagem_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={anuncio.imagem_url}
          alt={`Anúncio: ${anuncio.nome_empresa}`}
          className="w-full h-auto rounded-xl"
          loading="lazy"
          decoding="async"
          width={isDestaque ? 1200 : 700}
          height={isDestaque ? 300 : 180}
          sizes={isDestaque ? "(max-width: 768px) 100vw, 800px" : "(max-width: 768px) 100vw, 600px"}
        />
      ) : (
        <div className={`stat-card ${isDestaque ? "border-primary/20 bg-primary/5" : ""}`}>
          <p className="text-sm font-medium text-foreground">{anuncio.nome_empresa}</p>
          <span className="inline-block text-[9px] mt-1 px-2 py-0.5 rounded bg-muted text-muted-foreground">
            Patrocinado
          </span>
        </div>
      )}
    </a>
  );
}

export function AnuncioBannerDestaque() {
  const { data: anuncios } = useQuery({
    queryKey: ["anuncios-ativos"],
    queryFn: fetchAnunciosAtivos,
  });
  const destaques = anuncios?.filter((a) => a.plano === "destaque") || [];
  if (destaques.length === 0) return null;
  const anuncio = destaques[Math.floor(Math.random() * destaques.length)];
  return (
    <section aria-label="Anúncio patrocinado">
      <AnuncioCard anuncio={anuncio} />
    </section>
  );
}

export function AnuncioBannerPadrao() {
  const { data: anuncios } = useQuery({
    queryKey: ["anuncios-ativos"],
    queryFn: fetchAnunciosAtivos,
  });
  const padroes = anuncios?.filter((a) => a.plano === "padrao") || [];
  if (padroes.length === 0) return null;
  const anuncio = padroes[Math.floor(Math.random() * padroes.length)];
  return (
    <section aria-label="Anúncio patrocinado">
      <AnuncioCard anuncio={anuncio} />
    </section>
  );
}

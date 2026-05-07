import { notFound } from "next/navigation";
import { pageMetadata } from "@/lib/seo";
import { fetchClassificadoById } from "@/lib/data/setores";
import AnuncioDetalheClient from "@/components/classificados/AnuncioDetalheWrapper";

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const anuncio = await fetchClassificadoById(id);
  if (!anuncio) {
    return pageMetadata({
      title: "Anúncio não encontrado — Morrinhos.ai",
      description: "Este anúncio não foi encontrado ou já expirou.",
      path: `/compra-e-venda/${id}`,
    });
  }
  const preco =
    anuncio.preco != null
      ? ` por ${Number(anuncio.preco).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`
      : "";
  return pageMetadata({
    title: `${anuncio.titulo}${preco} — Compra e Venda Morrinhos`,
    description:
      anuncio.descricao?.slice(0, 160) ||
      `Anúncio em Morrinhos na categoria ${anuncio.categoria}.`,
    path: `/compra-e-venda/${id}`,
    image: anuncio.fotos?.[0] || undefined,
  });
}

export default async function AnuncioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const anuncio = await fetchClassificadoById(id);
  if (!anuncio) notFound();
  return <AnuncioDetalheClient initialAnuncio={anuncio} />;
}

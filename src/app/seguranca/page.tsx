import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";
import { pageMetadata } from "@/lib/seo";
import { fetchSegurancaData } from "@/lib/data/setores";
import SegurancaClient from "./SegurancaClient";

export const metadata = pageMetadata({
  title: "Segurança Pública de Morrinhos GO",
  description:
    "Indicadores de segurança pública de Morrinhos: ocorrências, histórico, seletor de ano, telefones de emergência e metodologia.",
  path: "/seguranca",
});

export const revalidate = 3600;

export default async function SegurancaPage() {
  const queryClient = new QueryClient();
  queryClient.setQueryData(["seguranca-indicadores"], await fetchSegurancaData());

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <SegurancaClient />
    </HydrationBoundary>
  );
}

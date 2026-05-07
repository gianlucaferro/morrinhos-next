import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";
import { pageMetadata } from "@/lib/seo";
import { fetchArrecadacaoData } from "@/lib/data/setores";
import ArrecadacaoClient from "./ArrecadacaoClient";

export const metadata = pageMetadata({
  title: "Arrecadação Municipal — Morrinhos GO",
  description:
    "Arrecadação de Morrinhos: receitas próprias, IPTU, ISS, IPVA, transferências, per capita, comparativos e metodologia.",
  path: "/arrecadacao",
});

export const revalidate = 3600;

export default async function ArrecadacaoPage() {
  const data = await fetchArrecadacaoData();
  const queryClient = new QueryClient();
  queryClient.setQueryData(["arrecadacao"], data.arrecadacao);
  queryClient.setQueryData(["arrecadacao-comparativo"], data.comparativo);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ArrecadacaoClient />
    </HydrationBoundary>
  );
}

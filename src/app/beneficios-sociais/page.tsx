import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";
import { pageMetadata } from "@/lib/seo";
import { fetchBeneficiosData } from "@/lib/data/setores";
import BeneficiosSociaisClient from "./BeneficiosSociaisClient";

export const metadata = pageMetadata({
  title: "Benefícios Sociais em Morrinhos GO",
  description:
    "Programas sociais, Bolsa Família, BPC, Tarifa Social, calendário e orientações de cadastro em Morrinhos.",
  path: "/beneficios-sociais",
});

export const revalidate = 3600;

export default async function BeneficiosSociaisPage() {
  const data = await fetchBeneficiosData();
  const queryClient = new QueryClient();
  queryClient.setQueryData(["beneficios-sociais"], data.beneficios);
  queryClient.setQueryData(["cde-subsidios"], data.cde);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <BeneficiosSociaisClient />
    </HydrationBoundary>
  );
}

import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";
import { pageMetadata } from "@/lib/seo";
import { fetchEducacaoData } from "@/lib/data/setores";
import EducacaoClient from "./EducacaoClient";

export const metadata = pageMetadata({
  title: "Educação em Morrinhos GO",
  description:
    "Indicadores de educação de Morrinhos: escolas, IDEB, matrículas, programas, ensino superior e Pé-de-Meia.",
  path: "/educacao",
});

export const revalidate = 3600;

export default async function EducacaoPage() {
  const data = await fetchEducacaoData();
  const queryClient = new QueryClient();
  queryClient.setQueryData(["educacao-escolas"], data.escolas);
  queryClient.setQueryData(["educacao-ideb"], data.ideb);
  queryClient.setQueryData(["educacao-indicadores"], data.indicadores);
  queryClient.setQueryData(["educacao-matriculas"], data.matriculas);
  queryClient.setQueryData(["educacao-investimentos"], data.investimentos);
  queryClient.setQueryData(["educacao-programas"], data.programas);
  queryClient.setQueryData(["ensino-superior-ies"], data.ensinoSuperiorIes);
  queryClient.setQueryData(["ensino-superior-cursos"], data.ensinoSuperiorCursos);
  queryClient.setQueryData(["pe-de-meia"], data.peDeMeia);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <EducacaoClient />
    </HydrationBoundary>
  );
}

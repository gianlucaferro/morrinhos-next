import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";
import { pageMetadata, datasetJsonLd, SCHEMA_IDS } from "@/lib/seo";
import { fetchAgroData } from "@/lib/data/setores";
import {
  fetchChuvaHistoricaMensal,
  fetchChuvaMediaHistorica,
  fetchChuvaUltimosDias,
} from "@/lib/data/clima";
import AgroClient from "./AgroClient";

export const metadata = pageMetadata({
  title: "Agro em Morrinhos GO",
  description:
    "Dados agropecuários de Morrinhos: produção, pecuária, lavouras, chuva acumulada vs média histórica, calendário de plantio (ZARC/MAPA + Embrapa) e comparativos.",
  path: "/agro",
});

export const revalidate = 3600;

const SITE_URL = "https://morrinhos.ai";
const today = new Date().toISOString().slice(0, 10);

const agroDatasets = [
  datasetJsonLd({
    name: "Indicadores agropecuários de Morrinhos",
    description:
      "Rebanhos (bovinos, suínos, galináceos, etc), lavouras (soja, milho, tomate, sorgo, cana, mandioca), produção de leite, ovos e mel, e comparativo regional. Dados IBGE PPM/PAM e CONAB.",
    url: `${SITE_URL}/agro`,
    creator: {
      type: "GovernmentOrganization",
      name: "IBGE + CONAB",
      url: "https://www.ibge.gov.br/",
    },
    dateModified: today,
    keywords: [
      "agropecuária",
      "Morrinhos",
      "soja",
      "milho",
      "rebanho bovino",
      "leite",
      "IBGE PPM",
      "IBGE PAM",
    ],
  }),
  datasetJsonLd({
    name: "Chuva acumulada e calendário agrícola de Morrinhos",
    description:
      "Precipitação mensal acumulada em Morrinhos (2018-presente) versus média histórica, com cruzamento direto pro calendário de plantio Cerrado (ZARC/MAPA + Embrapa). Inclui status hídrico (déficit/normal/excesso), últimos 30/60/90 dias e janelas oficiais por cultura.",
    url: `${SITE_URL}/agro`,
    creator: {
      type: "Organization",
      name: "Open-Meteo Archive (ERA5/ERA5-Land) + INMET",
      url: "https://open-meteo.com/",
    },
    dateModified: today,
    keywords: [
      "chuva",
      "precipitação",
      "Morrinhos",
      "agropecuária",
      "ZARC",
      "Embrapa",
      "calendário de plantio",
      "Cerrado",
    ],
    variableMeasured: [
      "precipitação acumulada mensal (mm)",
      "média histórica 2018-2025",
      "últimos 30/60/90 dias",
      "status hídrico",
      "janela de plantio por cultura",
    ],
  }),
];

export default async function AgroPage() {
  const queryClient = new QueryClient();
  const ano = new Date().getFullYear();

  // Fetch tudo em paralelo: agro data + chuva ano corrente + media historica + ultimos N dias
  const [agroData, chuvaAnoCorrente, mediaHistMensal, u30, u60, u90] = await Promise.all([
    fetchAgroData(),
    fetchChuvaHistoricaMensal(ano),
    fetchChuvaMediaHistorica(2018, 2025),
    fetchChuvaUltimosDias(30),
    fetchChuvaUltimosDias(60),
    fetchChuvaUltimosDias(90),
  ]);

  queryClient.setQueryData(["agro-indicadores-page"], agroData);

  return (
    <>
      {agroDatasets.map((d, i) => (
        <script
          key={`ds-${i}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(d) }}
        />
      ))}
      <HydrationBoundary state={dehydrate(queryClient)}>
        <AgroClient
          chuvaAnoCorrente={chuvaAnoCorrente}
          mediaHistMensal={mediaHistMensal}
          ultimos30={u30.total}
          ultimos60={u60.total}
          ultimos90={u90.total}
          ano={ano}
          mesAtual={new Date().getMonth() + 1}
        />
      </HydrationBoundary>
    </>
  );
}

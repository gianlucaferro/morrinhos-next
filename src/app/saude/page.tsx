import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";
import { pageMetadata, datasetJsonLd } from "@/lib/seo";
import { fetchSaudeData } from "@/lib/data/setores";
import { fetchChuvaHistoricaMensal } from "@/lib/data/clima";
import {
  fetchObitosAnuais,
  fetchCovidSerieMensal,
  fetchMortesPorCausaCid,
  fetchHIVDiagnosticosAnuais,
  fetchHIVPorSexo,
  fetchHIVPorFaixa,
  fetchTuberculoseObitos,
  fetchDDAInternacoes,
  fetchMortInfantilCausas,
  fetchArbovirosesMensal,
} from "@/lib/data/saude";
import SaudeClient from "./SaudeClient";
import ClimaSaudeCard from "@/components/clima/ClimaSaudeCard";

export const metadata = pageMetadata({
  title: "Saúde Pública de Morrinhos GO",
  description:
    "Indicadores de saúde de Morrinhos: dengue (InfoDengue), estabelecimentos CNES, profissionais, leitos e dados SES-GO.",
  path: "/saude",
});

export const revalidate = 3600;

const SITE_URL = "https://morrinhos.ai";
const today = new Date().toISOString().slice(0, 10);

// Datasets de saude — sources externas oficiais (Fiocruz, MS, INMET).
const saudeDatasets = [
  datasetJsonLd({
    name: "Casos de dengue, chikungunya e zika em Morrinhos",
    description:
      "Casos confirmados de arboviroses (dengue, chikungunya, zika) em Morrinhos-GO, agregados mensalmente via InfoDengue (Fiocruz) e dados do Ministério da Saúde. Inclui correlação com precipitação acumulada via Open-Meteo.",
    url: `${SITE_URL}/saude`,
    creator: {
      type: "Organization",
      name: "InfoDengue (Fiocruz) + Ministério da Saúde + Open-Meteo",
      url: "https://info.dengue.mat.br/",
    },
    dateModified: today,
    keywords: [
      "dengue",
      "Morrinhos",
      "saúde pública",
      "arbovirose",
      "InfoDengue",
      "Fiocruz",
      "epidemiologia",
    ],
    variableMeasured: [
      "casos confirmados",
      "casos suspeitos",
      "óbitos",
      "incidência por 100k habitantes",
      "precipitação acumulada (mm)",
    ],
  }),
  datasetJsonLd({
    name: "Profissionais e estabelecimentos de saúde em Morrinhos",
    description:
      "Médicos, enfermeiros, dentistas, agentes comunitários, farmacêuticos e demais profissionais de saúde lotados na rede municipal de Morrinhos, agregados via folha de pagamento e CNES (Cadastro Nacional de Estabelecimentos de Saúde).",
    url: `${SITE_URL}/saude`,
    creator: {
      type: "Organization",
      name: "DataSUS / CNES + Prefeitura de Morrinhos",
      url: "https://cnes.datasus.gov.br/",
    },
    dateModified: today,
    keywords: [
      "saúde",
      "Morrinhos",
      "CNES",
      "profissionais de saúde",
      "DataSUS",
      "UBS",
    ],
    variableMeasured: [
      "número de profissionais por categoria",
      "estabelecimentos de saúde",
      "leitos",
    ],
  }),
];

const HEALTH_CATEGORIES = [
  "dengue",
  "chikungunya",
  "zika",
  "meningite",
  "dda",
  "hiv",
  "mortalidade_geral",
  "mortalidade_infantil",
];

function summarizeHealthWorkers(
  servidores: { cargo: string | null }[],
): { total: number; counts: Record<string, number> } {
  const counts: Record<string, number> = {};
  for (const servidor of servidores) {
    const cargo = (servidor.cargo || "").toUpperCase();
    if (cargo.includes("ENFERM")) counts["Enfermeiros"] = (counts["Enfermeiros"] || 0) + 1;
    else if (cargo.includes("ODONT")) counts["Dentistas"] = (counts["Dentistas"] || 0) + 1;
    else if (cargo.includes("AGENTE COMUNIT")) counts["Agentes de Saúde"] = (counts["Agentes de Saúde"] || 0) + 1;
    else if (cargo.includes("FISIOT")) counts["Fisioterapeutas"] = (counts["Fisioterapeutas"] || 0) + 1;
    else if (cargo.includes("PSICOL")) counts["Psicólogos"] = (counts["Psicólogos"] || 0) + 1;
    else if (cargo.includes("FARMAC")) counts["Farmacêuticos"] = (counts["Farmacêuticos"] || 0) + 1;
    else if (cargo.includes("NUTRI")) counts["Nutricionistas"] = (counts["Nutricionistas"] || 0) + 1;
  }
  return { total: servidores.length, counts };
}

export default async function SaudePage() {
  const data = await fetchSaudeData();
  const currentYear = new Date().getFullYear();
  const years = [currentYear - 2, currentYear - 1, currentYear];
  const queryClient = new QueryClient();

  queryClient.setQueryData(["servidores-saude-count"], summarizeHealthWorkers(data.servidoresSaude.data));
  queryClient.setQueryData(["saude-estabelecimentos"], data.estabelecimentos);

  for (const categoria of HEALTH_CATEGORIES) {
    for (const year of years) {
      const indicador = ["dengue", "chikungunya", "zika"].includes(categoria) ? "casos_mes" : undefined;
      queryClient.setQueryData(
        ["saude-indicadores", categoria, year, indicador],
        data.indicadores.filter((item) => {
          if (item.categoria !== categoria) return false;
          if (indicador && item.indicador !== indicador) return false;
          return indicador ? item.ano === year : true;
        }),
      );
    }
  }

  // Prefetch chuva mensal historica pros 3 anos disponiveis no filtro.
  // Lido da tabela clima_historico_mensal (cron weekly atualiza ano corrente).
  // Hidratado via React Query — ChuvaDengueChart consome via useQuery.
  await Promise.all(
    years.map(async (year) => {
      const chuvaPorMes = await fetchChuvaHistoricaMensal(year);
      queryClient.setQueryData(["chuva-historica-mensal", year], chuvaPorMes);
    }),
  );

  // Prefetch dados de Mortalidade & Doencas — alimentam aba Mortalidade
  // (componente MortalidadeTab consome via useQuery com mesmo queryKey).
  // Tudo em paralelo pra otimizar latencia.
  const [
    mortInfantil,
    mortGeral,
    covidMes,
    mortesCausa,
    mortInfCausas,
    hivAnuais,
    hivSexo,
    hivFaixa,
    tbObitos,
    ddaInternacoes,
    dengueMensal,
  ] = await Promise.all([
    fetchObitosAnuais("mortalidade_infantil"),
    fetchObitosAnuais("mortalidade_geral"),
    fetchCovidSerieMensal(),
    fetchMortesPorCausaCid(),
    fetchMortInfantilCausas(),
    fetchHIVDiagnosticosAnuais(),
    fetchHIVPorSexo(),
    fetchHIVPorFaixa(),
    fetchTuberculoseObitos(),
    fetchDDAInternacoes(),
    fetchArbovirosesMensal("dengue"),
  ]);
  const [chikMensal, zikaMensal] = await Promise.all([
    fetchArbovirosesMensal("chikungunya"),
    fetchArbovirosesMensal("zika"),
  ]);
  queryClient.setQueryData(["saude-mortalidade-infantil"], mortInfantil);
  queryClient.setQueryData(["saude-mortalidade-geral"], mortGeral);
  queryClient.setQueryData(["saude-covid-mensal"], covidMes);
  queryClient.setQueryData(["saude-mortes-causa"], mortesCausa);
  queryClient.setQueryData(["saude-mort-infantil-causas"], mortInfCausas);
  queryClient.setQueryData(["saude-hiv-anuais"], hivAnuais);
  queryClient.setQueryData(["saude-hiv-sexo"], hivSexo);
  queryClient.setQueryData(["saude-hiv-faixa"], hivFaixa);
  queryClient.setQueryData(["saude-tuberculose-obitos"], tbObitos);
  queryClient.setQueryData(["saude-dda-internacoes"], ddaInternacoes);
  queryClient.setQueryData(["saude-dengue-mensal-multianos"], dengueMensal);
  queryClient.setQueryData(["saude-chik-mensal"], chikMensal);
  queryClient.setQueryData(["saude-zika-mensal"], zikaMensal);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      {saudeDatasets.map((d, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(d) }}
        />
      ))}
      <div className="container py-4 space-y-4">
        <ClimaSaudeCard />
      </div>
      <SaudeClient />
    </HydrationBoundary>
  );
}

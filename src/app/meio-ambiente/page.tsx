import { Trees } from "lucide-react";
import { pageMetadata, datasetJsonLd } from "@/lib/seo";
import MapBiomasPanel from "@/components/meio-ambiente/MapBiomasPanel";
import IndicadoresAmbientaisPanel from "@/components/meio-ambiente/IndicadoresAmbientaisPanel";
import AnaliseAmbientalIntegrada from "@/components/meio-ambiente/AnaliseAmbientalIntegrada";
import { fetchMapbiomasSerie } from "@/lib/data/meio-ambiente";
import {
  fetchChuvaUltimosDias,
  fetchChuvaHistoricaMensal,
  fetchChuvaMediaHistorica,
} from "@/lib/data/clima";
import { fetchIndicadores } from "@/lib/data/home";

export const metadata = pageMetadata({
  title: "Meio Ambiente em Morrinhos GO — Uso do solo MapBiomas + análise integrada",
  description:
    "Análise ambiental de Morrinhos: risco de fogo, pressão agrícola, uso do solo MapBiomas 1985-2024, emissões CO2 da frota e saúde hídrica. Cruzamento de dados oficiais.",
  path: "/meio-ambiente",
});

export const revalidate = 86400;

const SITE_URL = "https://morrinhos.ai";
const today = new Date().toISOString().slice(0, 10);

const datasets = [
  datasetJsonLd({
    name: "Uso e cobertura do solo de Morrinhos (1985-2024)",
    description:
      "Série temporal anual de uso e cobertura do solo em Morrinhos-GO via MapBiomas Coleção 10.1. 14 classes do MapBiomas (Floresta, Cerrado, Pastagem, Soja, Cana, Mosaico, Urbano, Água etc.) cobrindo 40 anos.",
    url: `${SITE_URL}/meio-ambiente`,
    creator: {
      type: "Organization",
      name: "MapBiomas Brasil",
      url: "https://brasil.mapbiomas.org/",
    },
    dateModified: today,
    keywords: [
      "MapBiomas",
      "uso do solo",
      "Morrinhos",
      "desmatamento",
      "cerrado",
      "soja",
      "Landsat",
    ],
  }),
  datasetJsonLd({
    name: "Análise Ambiental Integrada de Morrinhos",
    description:
      "Indicadores ambientais derivados via cruzamento de MapBiomas (uso do solo) + Open-Meteo Archive (chuva histórica) + INMET (clima diário) + SENATRAN (frota): risco de fogo atual, pressão agrícola sobre o Cerrado, estimativa de emissões CO2, saúde hídrica anual.",
    url: `${SITE_URL}/meio-ambiente`,
    creator: {
      type: "Organization",
      name: "MapBiomas + Open-Meteo + INMET + SENATRAN",
    },
    dateModified: today,
    keywords: [
      "Morrinhos",
      "risco de fogo",
      "pressão agrícola",
      "emissões CO2",
      "saúde hídrica",
      "cerrado",
    ],
  }),
];

export default async function MeioAmbientePage() {
  const ano = new Date().getFullYear();
  const mesAtual = new Date().getMonth() + 1;

  // Fetch tudo em paralelo
  const [rows, chuva90, chuvaMediaHistMensal, chuvaAnoCorrente, indicadores] = await Promise.all([
    fetchMapbiomasSerie(),
    fetchChuvaUltimosDias(90),
    fetchChuvaMediaHistorica(2018, 2025),
    fetchChuvaHistoricaMensal(ano),
    fetchIndicadores(),
  ]);

  // Total chuva ano corrente YTD
  const chuvaTotalAnoCorrente = Object.values(chuvaAnoCorrente).reduce(
    (s, v) => s + (Number(v) || 0),
    0,
  );
  // Média histórica anual completa
  const chuvaMediaHistAnoCompleto = Object.values(chuvaMediaHistMensal).reduce(
    (s, v) => s + (Number(v) || 0),
    0,
  );
  const chuvaMediaHistMesAtual = chuvaMediaHistMensal[mesAtual] ?? 0;

  // Frota
  const frotaInd = indicadores.find((i) => i.chave === "frota_veiculos");
  const frotaNum = frotaInd
    ? Number(frotaInd.valor) || (frotaInd.valor_texto ? parseInt(frotaInd.valor_texto.replace(/\D/g, "")) : null)
    : null;

  return (
    <div className="container py-6 max-w-5xl">
      {datasets.map((d, i) => (
        <script
          key={`ds-${i}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(d) }}
        />
      ))}

      <header className="mb-6">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Trees className="w-6 h-6 text-emerald-700" />
          Meio Ambiente
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Análise ambiental integrada de Morrinhos: risco de fogo, pressão agrícola,
          evolução do uso do solo e emissões.
        </p>
      </header>

      {/* Painel novo: análise integrada cruzando dados que ja temos */}
      {rows.length > 0 && (
        <section className="mb-10">
          <AnaliseAmbientalIntegrada
            mapbiomasRows={rows}
            chuva90Dias={chuva90.total}
            chuvaMediaHistMesAtual={chuvaMediaHistMesAtual}
            chuvaTotalAnoCorrente={chuvaTotalAnoCorrente}
            chuvaMediaHistAnoCompleto={chuvaMediaHistAnoCompleto}
            frotaVeiculos={frotaNum}
            ano={ano}
          />
        </section>
      )}

      {/* Painel MapBiomas — serie 1985-2024 com gráfico + cards + insights */}
      {rows.length > 0 ? <MapBiomasPanel rows={rows} /> : null}

      {/* Painel "Indicadores Ambientais" com 5 fontes oficiais. */}
      <div className="mt-10">
        <IndicadoresAmbientaisPanel />
      </div>
    </div>
  );
}

import { pageMetadata, datasetJsonLd, SCHEMA_IDS } from "@/lib/seo";
import CamaraClient from "@/components/camara/CamaraClient";

export const dynamic = "force-dynamic";

export const metadata = pageMetadata({
  title: "Câmara Municipal de Morrinhos GO",
  description:
    "Dados da Câmara Municipal de Morrinhos: vereadores, servidores, contratos, projetos, atuação parlamentar, atos, despesas, receitas, diárias e licitações.",
  path: "/camara",
});

const SITE_URL = "https://morrinhos.ai";
const today = new Date().toISOString().slice(0, 10);

const camaraDatasets = [
  datasetJsonLd({
    name: "Vereadores e atuação parlamentar da Câmara de Morrinhos",
    description:
      "Vereadores em exercício na Câmara Municipal de Morrinhos, com biografia, contatos, projetos de lei autorados, padrão de votação, atos administrativos e atuação parlamentar.",
    url: `${SITE_URL}/camara?tab=vereadores`,
    creatorId: SCHEMA_IDS.camara,
    dateModified: today,
    keywords: [
      "vereadores",
      "Câmara Municipal",
      "Morrinhos",
      "transparência",
      "atuação parlamentar",
    ],
    variableMeasured: [
      "nome",
      "partido",
      "mandato",
      "projetos de lei",
      "presença em sessões",
      "votos",
    ],
  }),
  datasetJsonLd({
    name: "Atos da Câmara Municipal de Morrinhos",
    description:
      "Resoluções, decretos legislativos, indicações, requerimentos e demais atos publicados pela Câmara Municipal de Morrinhos. Cada ato traz resumo gerado por IA e link para o documento original.",
    url: `${SITE_URL}/camara?tab=atos`,
    creatorId: SCHEMA_IDS.camara,
    dateModified: today,
    keywords: [
      "atos legislativos",
      "Câmara Municipal",
      "Morrinhos",
      "transparência",
    ],
    variableMeasured: [
      "número do ato",
      "tipo (resolução, decreto, indicação)",
      "data",
      "ementa",
      "autoria",
    ],
  }),
  datasetJsonLd({
    name: "Atas das sessões da Câmara de Morrinhos",
    description:
      "Atas das sessões ordinárias e extraordinárias da Câmara Municipal de Morrinhos, com pauta, votações, registros de fala e decisões. Inclui resumo gerado por IA.",
    url: `${SITE_URL}/camara?tab=atas`,
    creatorId: SCHEMA_IDS.camara,
    dateModified: today,
    keywords: [
      "atas legislativas",
      "sessão da câmara",
      "Morrinhos",
      "transparência",
    ],
  }),
  datasetJsonLd({
    name: "Contratos e licitações da Câmara de Morrinhos",
    description:
      "Contratos firmados pela Câmara Municipal de Morrinhos e licitações abertas, com fornecedores, valores, vigência e modalidade.",
    url: `${SITE_URL}/camara?tab=contratos`,
    creatorId: SCHEMA_IDS.camara,
    dateModified: today,
    keywords: [
      "contratos públicos",
      "Câmara Municipal",
      "Morrinhos",
      "licitação",
    ],
  }),
];

export default function CamaraPage() {
  return (
    <>
      {camaraDatasets.map((d, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(d) }}
        />
      ))}
      <CamaraClient />
    </>
  );
}

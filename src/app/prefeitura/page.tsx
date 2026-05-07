import { pageMetadata, datasetJsonLd, articleJsonLd, SCHEMA_IDS } from "@/lib/seo";
import { createPublicSupabaseClient } from "@/lib/supabase/public";
import PrefeituraClient from "@/components/prefeitura/PrefeituraClient";

export const dynamic = "force-dynamic";

export const metadata = pageMetadata({
  title: "Prefeitura de Morrinhos GO",
  description:
    "Dados da Prefeitura de Morrinhos: prefeito, vice, secretarias, servidores, contratos, despesas, obras, licitações, decretos e portarias.",
  path: "/prefeitura",
});

const SITE_URL = "https://morrinhos.ai";
const today = new Date().toISOString().slice(0, 10);

// Schemas Dataset — um por aba estruturada da pagina /prefeitura.
const datasets = [
  datasetJsonLd({
    name: "Apontamentos do TCM-GO sobre Morrinhos",
    description:
      "Acórdãos, pareceres, notificações, decisões e relatórios do Tribunal de Contas dos Municípios do Estado de Goiás envolvendo a Prefeitura, Câmara, fundos e órgãos do município de Morrinhos. Cada apontamento traz resumo gerado por IA e link direto para o PDF original publicado no domínio tcm.go.gov.br.",
    url: `${SITE_URL}/prefeitura?tab=tcm-go`,
    creatorId: SCHEMA_IDS.tcmGo,
    dateModified: today,
    keywords: [
      "transparência",
      "TCM-GO",
      "Morrinhos",
      "acórdão",
      "fiscalização municipal",
      "contas públicas",
    ],
    variableMeasured: [
      "número do processo",
      "ano",
      "tipo de documento",
      "status do julgamento",
      "órgão alvo",
      "ementa",
      "valor envolvido",
    ],
  }),
  datasetJsonLd({
    name: "Contratos da Prefeitura de Morrinhos",
    description:
      "Contratos firmados pela Prefeitura Municipal de Morrinhos com fornecedores e prestadores de serviço, incluindo valor, vigência, modalidade de licitação e aditivos. Dados extraídos do portal de transparência da Prefeitura.",
    url: `${SITE_URL}/prefeitura?tab=contratos`,
    creatorId: SCHEMA_IDS.prefeitura,
    dateModified: today,
    keywords: [
      "contratos públicos",
      "Morrinhos",
      "licitação",
      "fornecedores",
      "transparência",
    ],
    variableMeasured: [
      "número do contrato",
      "fornecedor",
      "objeto",
      "valor",
      "vigência",
      "modalidade",
    ],
  }),
  datasetJsonLd({
    name: "Servidores Municipais de Morrinhos",
    description:
      "Folha de pagamento dos servidores da Prefeitura Municipal de Morrinhos, incluindo cargo, lotação, remuneração bruta e líquida.",
    url: `${SITE_URL}/prefeitura?tab=servidores`,
    creatorId: SCHEMA_IDS.prefeitura,
    dateModified: today,
    keywords: [
      "servidores públicos",
      "Morrinhos",
      "folha de pagamento",
      "remuneração",
      "transparência",
    ],
    variableMeasured: [
      "nome",
      "cargo",
      "lotação",
      "remuneração bruta",
      "remuneração líquida",
    ],
  }),
  datasetJsonLd({
    name: "Frota de Veículos da Prefeitura de Morrinhos",
    description:
      "Veículos do poder executivo municipal de Morrinhos (placa, modelo, ano, secretaria responsável) coletados via DETRAN-GO e dados de transparência municipal.",
    url: `${SITE_URL}/prefeitura?tab=veiculos`,
    creator: {
      type: "GovernmentOrganization",
      name: "DETRAN-GO + Prefeitura de Morrinhos",
    },
    dateModified: today,
    keywords: ["frota municipal", "DETRAN", "Morrinhos", "transparência"],
  }),
];

// ===== Article schemas pra cada apontamento TCM-GO =====
//
// Fetched server-side pra rendering inicial. Cada apontamento vira um Article
// que cita TCM-GO via sourceOrganization e link pro PDF via isBasedOn —
// rastreabilidade que LLMs adoram pra GEO.
type Apontamento = {
  id: string;
  numero_processo: string;
  ano: number | null;
  orgao_alvo: string | null;
  tipo: string | null;
  status: string | null;
  ementa: string | null;
  ementa_resumo_ia: string | null;
  data_publicacao: string | null;
  fonte_url: string | null;
};

/**
 * Mapeia orgao_alvo (texto livre) pra @id da entidade governamental.
 * Se nao for prefeitura/camara, retorna undefined (nao adiciona @id ref).
 */
function orgaoAlvoMention(orgao: string | null): string | undefined {
  if (!orgao) return undefined;
  const lower = orgao.toLowerCase();
  if (lower.includes("prefeitura") || lower.includes("fundo") || lower.includes("secretaria"))
    return SCHEMA_IDS.prefeitura;
  if (lower.includes("câmara") || lower.includes("camara")) return SCHEMA_IDS.camara;
  return undefined;
}

/** Extrai nomes de pessoas mencionadas na ementa via heuristica simples. */
function extractPersonNames(text: string | null): Array<{ name: string; jobTitle?: string }> {
  if (!text) return [];
  const persons: Array<{ name: string; jobTitle?: string }> = [];
  const seen = new Set<string>();

  // "Sr. NOME" ou "Sra. NOME" — captura ate 4 palavras maiusculas
  const titleRegex = /\bSrs?\.\s+([A-Z][a-záéíóúâêôãç]+(?:\s+(?:de|da|dos|das|do)\s+|\s+)){1,4}/g;
  for (const m of text.matchAll(titleRegex)) {
    const name = m[0].replace(/^Srs?\.\s+/, "").trim();
    if (!seen.has(name) && name.length >= 5 && name.length <= 60) {
      persons.push({ name });
      seen.add(name);
    }
  }

  // "Prefeito NOME" ou "Presidente da Câmara NOME"
  const roleRegex =
    /\b(Prefeito|Vice-Prefeito|Presidente da Câmara|Vereador|Gestor|Secretário)(?:\s+do\s+\w+)?[,:]?\s+([A-Z][a-záéíóúâêôãç]+(?:\s+(?:de|da|dos|das|do)\s+|\s+)){1,4}/g;
  for (const m of text.matchAll(roleRegex)) {
    const role = m[1];
    const name = m[0].replace(roleRegex, "$2").trim();
    if (!seen.has(name) && name.length >= 5 && name.length <= 60) {
      persons.push({ name, jobTitle: role });
      seen.add(name);
    }
  }

  return persons.slice(0, 5); // limita a 5 pra nao poluir
}

async function fetchApontamentos(): Promise<Apontamento[]> {
  try {
    const supabase = createPublicSupabaseClient();
    const { data } = await supabase
      .from("tcm_go_apontamentos")
      .select(
        "id, numero_processo, ano, orgao_alvo, tipo, status, ementa, ementa_resumo_ia, data_publicacao, fonte_url"
      )
      .order("data_publicacao", { ascending: false, nullsFirst: false })
      .limit(50);
    return (data ?? []) as Apontamento[];
  } catch {
    return [];
  }
}

function buildArticleSchema(a: Apontamento) {
  const tipoLabel = a.tipo ? a.tipo.charAt(0).toUpperCase() + a.tipo.slice(1) : "Apontamento";
  const headline =
    `${tipoLabel} TCM-GO ${a.numero_processo}${a.ano ? `/${a.ano}` : ""}` +
    (a.status ? ` — ${a.status}` : "");

  const mentions: Array<string | { type: string; name: string; url?: string; jobTitle?: string }> = [
    SCHEMA_IDS.tcmGo, // sempre menciona TCM-GO
  ];
  const orgaoId = orgaoAlvoMention(a.orgao_alvo);
  if (orgaoId) mentions.push(orgaoId);

  // Pessoas extraidas da ementa
  const persons = extractPersonNames(a.ementa);
  for (const p of persons) {
    mentions.push({ type: "Person", name: p.name, jobTitle: p.jobTitle });
  }

  const articleBody = a.ementa_resumo_ia || a.ementa || "";

  return articleJsonLd({
    headline,
    url: `${SITE_URL}/prefeitura?tab=tcm-go&id=${a.id}`,
    articleBody,
    description: a.ementa?.slice(0, 200) || undefined,
    articleSection: "Transparência Pública / TCM-GO",
    datePublished: a.data_publicacao || undefined,
    dateModified: today,
    isBasedOn: a.fonte_url || undefined,
    sourceOrganizationId: SCHEMA_IDS.tcmGo,
    mentions,
    type: "Article",
  });
}

export default async function PrefeituraPage() {
  const apontamentos = await fetchApontamentos();
  const articles = apontamentos
    .filter((a) => a.ementa_resumo_ia || a.ementa) // so emite article se tiver corpo
    .map(buildArticleSchema);

  return (
    <>
      {/* Datasets — uma vez cada */}
      {datasets.map((d, i) => (
        <script
          key={`ds-${i}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(d) }}
        />
      ))}
      {/* Articles — um por apontamento TCM, server-rendered pra crawlers */}
      {articles.map((art, i) => (
        <script
          key={`art-${i}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(art) }}
        />
      ))}
      <PrefeituraClient />
    </>
  );
}

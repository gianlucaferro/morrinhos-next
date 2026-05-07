import { TrendingUp } from "lucide-react";
import { pageMetadata, datasetJsonLd } from "@/lib/seo";
import EmColetaSection from "@/components/EmColetaSection";
import EconomiaPanel from "@/components/economia/EconomiaPanel";
import { fetchIndicadores } from "@/lib/data/home";
import {
  fetchEconomiaIndicadores,
  getPibComparativo,
  getComposicaoSetorial,
  getCagedSerie,
  getSalariosPorSetor,
  getEmpresasMEIs,
  getTopEmpregadores,
  getTopOcupacoesCBO,
  getCagedPorSetor,
  getCnpjsPorBairro,
  getCnaesTop,
  getCruzamentoRaisCaged,
  getCagedCnaeDetalhadoStatus,
} from "@/lib/data/economia";
import { fetchChuvaHistoricaMensal } from "@/lib/data/clima";

export const metadata = pageMetadata({
  title: "Economia Local de Morrinhos GO — PIB, CAGED, RAIS, MEIs",
  description:
    "PIB municipal, comparativo com vizinhos, CAGED mensal, RAIS salários por setor, empresas ativas, MEIs em Morrinhos. Composição setorial e cruzamento safra×empregos.",
  path: "/economia",
});

export const revalidate = 3600;

const SITE_URL = "https://morrinhos.ai";

const economiaDataset = datasetJsonLd({
  name: "Economia Local de Morrinhos (PIB + CAGED + RAIS + MEIs)",
  description:
    "Indicadores socioeconômicos integrados de Morrinhos: PIB municipal e comparativo com 5 vizinhos diretos (Hidrolândia, Bela Vista de Goiás, Pontalina, Cristianópolis, Cromínia), composição setorial 2021, saldo CAGED 2024-2025, salários médios por setor RAIS 2023, empresas ativas e MEIs.",
  url: `${SITE_URL}/economia`,
  creator: {
    type: "GovernmentOrganization",
    name: "IBGE + IMB-GO + MTE/CAGED + RAIS + Receita Federal + Sebrae",
  },
  dateModified: new Date().toISOString().slice(0, 10),
  keywords: [
    "PIB",
    "Morrinhos",
    "CAGED",
    "RAIS",
    "MEIs",
    "empregos formais",
    "salário médio",
    "comparativo municipal",
  ],
});

export default async function EconomiaPage() {
  const ano = new Date().getFullYear();

  const [econRows, todosInd, chuvaAnoCorrente] = await Promise.all([
    fetchEconomiaIndicadores(),
    fetchIndicadores(),
    fetchChuvaHistoricaMensal(ano),
  ]);

  // Indicadores derivados
  const pibComparativo = getPibComparativo(econRows);
  const composicaoSetorial = getComposicaoSetorial(econRows);
  const cagedSerie = getCagedSerie(econRows);
  const salariosPorSetor = getSalariosPorSetor(econRows);
  const empresasMEIs = getEmpresasMEIs(econRows);
  const topEmpregadores = getTopEmpregadores(econRows);
  const topOcupacoes = getTopOcupacoesCBO(econRows);
  const cagedPorSetor = getCagedPorSetor(econRows);
  const cnpjsBairro = getCnpjsPorBairro(econRows);
  const cnaesTop = getCnaesTop(econRows);
  const cruzamentoRaisCaged = getCruzamentoRaisCaged(econRows);
  const cagedCnaeRaw = getCagedCnaeDetalhadoStatus(econRows);
  const cagedCnaeStatus = cagedCnaeRaw
    ? {
        observacao: cagedCnaeRaw.observacao,
        fonte_url: cagedCnaeRaw.fonte_url,
      }
    : null;
  const pibMediaGoiasRow = econRows.find(
    (r) => r.indicador === "pib_per_capita_estado",
  );
  const pibMediaGoias = Number(pibMediaGoiasRow?.valor ?? 37414);

  // Cards de stats da home pra topo da pagina
  const findVal = (chave: string) =>
    todosInd.find((i) => i.chave === chave);
  const m = (chave: string, rotulo: string) => {
    const ind = findVal(chave);
    if (!ind) return null;
    return {
      rotulo,
      valor: ind.valor_texto || "—",
      fonte: ind.fonte_url ? `IBGE ${ind.ano_referencia}` : undefined,
      fonteUrl: ind.fonte_url || undefined,
    };
  };

  const indicadoresHome = [
    m("pib_per_capita", "PIB per capita"),
    m("pessoal_ocupado_formal", "Empregos formais"),
    m("salario_medio_formal", "Salário médio (SM)"),
    m("populacao_ate_meio_sm", "Pop. até ½ salário mín."),
    m("populacao", "População"),
  ].filter((x): x is NonNullable<typeof x> => x !== null);

  return (
    <div className="container py-6 max-w-5xl">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(economiaDataset) }}
      />
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-emerald-600" />
          Economia Local
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          PIB, CAGED, RAIS, empresas ativas e MEIs — análise integrada da economia
          de Morrinhos.
        </p>
      </header>

      {/* Painel principal — 6 paineis com dados reais consolidados */}
      <section className="mb-10">
        <EconomiaPanel
          pibComparativo={pibComparativo}
          composicaoSetorial={composicaoSetorial}
          cagedSerie={cagedSerie}
          salariosPorSetor={salariosPorSetor}
          empresasMEIs={empresasMEIs}
          chuvaMensal={chuvaAnoCorrente}
          pibMediaGoias={pibMediaGoias}
          topEmpregadores={topEmpregadores}
          topOcupacoes={topOcupacoes}
          cagedPorSetor={cagedPorSetor}
          cnpjsBairro={cnpjsBairro}
          cnaesTop={cnaesTop}
          cruzamentoRaisCaged={cruzamentoRaisCaged}
          cagedCnaeStatus={cagedCnaeStatus}
        />
      </section>

      {/* Bloco antigo (em coleta + fontes oficiais) — mantém pra usuario poder
          consultar fontes primarias e validar */}
      <EmColetaSection
        titulo="Outros indicadores econômicos — fontes oficiais"
        descricao="Pra explorar dados além do que mostramos aqui (CAGED por CNAE específico, RAIS por ocupação, lista detalhada de CNPJs, pesquisas Sebrae), consulte as fontes oficiais:"
        iconBg="bg-emerald-500/10"
        indicadores={indicadoresHome}
        exemplosCruzamentos={[
          "CAGED mensal detalhado por CNAE (futuro: parser direto Power BI)",
          "RAIS por ocupação CBO (Classificação Brasileira de Ocupações)",
          "Lista de CNPJs ativos por bairro (Receita Federal CSV mensal)",
          "Empresas que mais contratam (cruzamento RAIS × CAGED)",
        ]}
        fontes={[
          {
            nome: "IBGE Cidades — Morrinhos",
            url: "https://cidades.ibge.gov.br/brasil/go/morrinhos/panorama",
            descricao: "PIB municipal, PIB per capita, empregos, salário médio, população.",
          },
          {
            nome: "Novo CAGED — Ministério do Trabalho",
            url: "https://app.powerbi.com/view?r=eyJrIjoiNWI5NWI0ODEtYmZiYy00Mjg3LWJhNjMtMzVkOTAyNTIzNzhmIiwidCI6ImNkZWUyNDA1LTk5ZmItNDQ4Mi05ZmFhLTVhMzVjOWE5NzA1NCJ9",
            descricao: "Empregos admitidos e desligados por mês, setor e ocupação.",
          },
          {
            nome: "RAIS — Relação Anual de Informações Sociais",
            url: "http://pdet.mte.gov.br/rais",
            descricao: "Estoque anual de empregos formais e remuneração por CNAE.",
          },
          {
            nome: "Receita Federal — Consulta CNPJ",
            url: "https://solucoes.receita.fazenda.gov.br/Servicos/cnpjreva/cnpjreva_solicitacao.asp",
            descricao: "Empresas ativas, situação cadastral, atividade econômica.",
          },
          {
            nome: "Portal SEBRAE — MEI",
            url: "https://www.gov.br/empresas-e-negocios/pt-br/empreendedor",
            descricao: "Microempreendedores Individuais ativos e novos cadastros.",
          },
          {
            nome: "IMB-GO Boletins Econômicos",
            url: "https://goias.gov.br/imb/",
            descricao: "Instituto Mauro Borges (Goiás) — relatórios consolidados de PIB, emprego, salário.",
          },
        ]}
      />
    </div>
  );
}

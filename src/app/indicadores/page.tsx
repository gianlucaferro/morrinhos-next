import { TrendingUp, ExternalLink } from "lucide-react";
import Link from "next/link";
import { pageMetadata } from "@/lib/seo";
import { fetchIndicadores } from "@/lib/data/home";

export const metadata = pageMetadata({
  title: "Indicadores Municipais de Morrinhos GO",
  description:
    "Indicadores socioeconômicos consolidados de Morrinhos: população, PIB per capita, IDEB, IDHM, frota, salário médio, saneamento e empregos formais.",
  path: "/indicadores",
});

export const revalidate = 3600;

const SITE_URL = "https://morrinhos.ai";

type Indicador = {
  chave: string;
  valor_texto?: string | null;
  ano_referencia?: number | null;
};

function StatCard({
  label,
  value,
  sub,
  fonte,
  fonteUrl,
}: {
  label: string;
  value: string;
  sub?: string;
  fonte?: string;
  fonteUrl?: string;
}) {
  return (
    <div className="stat-card">
      <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-extrabold text-foreground mt-1">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      {fonte && (
        <p className="text-[10px] text-muted-foreground mt-2">
          Fonte:{" "}
          {fonteUrl ? (
            <a
              href={fonteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline inline-flex items-center gap-1"
            >
              {fonte} <ExternalLink className="w-2.5 h-2.5" />
            </a>
          ) : (
            fonte
          )}
        </p>
      )}
    </div>
  );
}

function findIndicador(indicadores: Indicador[], chave: string): Indicador | undefined {
  return indicadores.find((i) => i.chave === chave);
}

export default async function IndicadoresPage() {
  const indicadores = (await fetchIndicadores()) as Indicador[];

  const get = (chave: string) => findIndicador(indicadores, chave);
  const dash = (i?: Indicador) => i?.valor_texto || "—";
  const ano = (i?: Indicador) => (i?.ano_referencia ? `${i.ano_referencia}` : "");

  const pop = get("populacao");
  const pib = get("pib_per_capita");
  const pibTotal = get("pib_total");
  // Novos: breakdown setorial PIB IBGE + contratos PNCP (sincronizados via sync-federal-data)
  const pibAgro = get("pib_vab_agro");
  const pibIndustria = get("pib_vab_industria");
  const pibServicos = get("pib_vab_servicos");
  const pncpTotal = get("pncp_contratos_total");
  const pncpValor = get("pncp_contratos_valor");
  const ideb = get("ideb_anos_iniciais");
  const idebFinais = get("ideb_anos_finais");
  const idhm = get("idhm");
  const idhmEdu = get("idhm_educacao");
  const idhmRenda = get("idhm_renda");
  const idhmLong = get("idhm_longevidade");
  const saneamento = get("saneamento");
  const salarioMedio = get("salario_medio_formal");
  const pessoalOcupado = get("pessoal_ocupado");
  const popMeioSm = get("populacao_meio_salario_minimo");
  const frota = get("frota_veiculos");
  const area = get("area_municipio");
  const densidade = get("densidade_demografica");

  return (
    <div className="container py-6 max-w-5xl">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-primary" />
          Indicadores do Município
        </h1>
        <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
          Indicadores socioeconômicos oficiais consolidados de Morrinhos — IBGE, INEP, PNUD,
          SENATRAN. Dados atualizados conforme cada fonte (anuais ou periódicos).
        </p>
      </header>

      {/* Demográficos */}
      <section className="mb-6">
        <h2 className="text-base font-semibold text-foreground mb-3">Demografia</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <StatCard
            label="População"
            value={dash(pop)}
            sub={`Estimativa ${ano(pop)}`}
            fonte="IBGE"
            fonteUrl="https://cidades.ibge.gov.br/brasil/go/morrinhos"
          />
          <StatCard
            label="Área do município"
            value={dash(area)}
            sub="km²"
            fonte="IBGE"
          />
          <StatCard
            label="Densidade demográfica"
            value={dash(densidade)}
            sub="hab/km²"
            fonte="IBGE"
          />
        </div>
      </section>

      {/* Economia */}
      <section className="mb-6">
        <h2 className="text-base font-semibold text-foreground mb-3">Economia</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <StatCard
            label="PIB total"
            value={dash(pibTotal)}
            sub={`IBGE ${ano(pibTotal)}`}
            fonte="IBGE Cidades"
            fonteUrl="https://cidades.ibge.gov.br/brasil/go/morrinhos/panorama"
          />
          <StatCard
            label="PIB per capita"
            value={dash(pib)}
            sub={`IBGE ${ano(pib)}`}
            fonte="IBGE"
          />
          <StatCard
            label="Salário médio formal"
            value={dash(salarioMedio)}
            sub={`Salários mínimos · ${ano(salarioMedio)}`}
            fonte="IBGE Cidades"
          />
          <StatCard
            label="Empregos formais"
            value={dash(pessoalOcupado)}
            sub={`Pessoas ocupadas · ${ano(pessoalOcupado)}`}
            fonte="IBGE"
          />
          <StatCard
            label="População até ½ salário mínimo"
            value={dash(popMeioSm)}
            sub={`Censo ${ano(popMeioSm)}`}
            fonte="IBGE Censo"
          />
          <StatCard
            label="Frota de veículos"
            value={dash(frota)}
            sub={`SENATRAN ${ano(frota)}`}
            fonte="SENATRAN"
            fonteUrl="https://www.gov.br/senatran/pt-br/assuntos/estatisticas/frota-de-veiculos-1"
          />
        </div>

        {/* Breakdown setorial do PIB (IBGE SIDRA via sync-federal-data) */}
        {(pibAgro || pibIndustria || pibServicos) && (
          <div className="mt-4">
            <h3 className="text-sm font-semibold text-foreground/80 mb-2">
              PIB por setor (Valor Adicionado Bruto)
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <StatCard
                label="Agropecuária"
                value={dash(pibAgro)}
                sub={`IBGE ${ano(pibAgro)}`}
                fonte="IBGE SIDRA 5938"
                fonteUrl="https://sidra.ibge.gov.br/tabela/5938"
              />
              <StatCard
                label="Indústria"
                value={dash(pibIndustria)}
                sub={`IBGE ${ano(pibIndustria)}`}
                fonte="IBGE SIDRA 5938"
              />
              <StatCard
                label="Serviços"
                value={dash(pibServicos)}
                sub={`IBGE ${ano(pibServicos)}`}
                fonte="IBGE SIDRA 5938"
              />
            </div>
          </div>
        )}

        {/* Contratos PNCP da Prefeitura (últimos 12 meses) */}
        {(pncpTotal || pncpValor) && (
          <div className="mt-4">
            <h3 className="text-sm font-semibold text-foreground/80 mb-2">
              Contratos publicados via PNCP (Prefeitura, últimos 12 meses)
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <StatCard
                label="Contratos publicados"
                value={dash(pncpTotal)}
                sub="Portal Nacional de Contratações Públicas"
                fonte="PNCP"
                fonteUrl="https://pncp.gov.br/app/contratos?cnpj=01789551000149"
              />
              <StatCard
                label="Valor total"
                value={dash(pncpValor)}
                sub="Valor global dos contratos"
                fonte="PNCP"
              />
            </div>
          </div>
        )}
      </section>

      {/* Desenvolvimento humano */}
      <section className="mb-6">
        <h2 className="text-base font-semibold text-foreground mb-3">Desenvolvimento humano</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            label="IDHM"
            value={dash(idhm)}
            sub={`PNUD ${ano(idhm)}`}
            fonte="PNUD/IPEA/FJP"
            fonteUrl="http://www.atlasbrasil.org.br/ranking"
          />
          <StatCard
            label="IDHM Educação"
            value={dash(idhmEdu)}
            sub={`PNUD ${ano(idhmEdu)}`}
            fonte="PNUD"
          />
          <StatCard
            label="IDHM Renda"
            value={dash(idhmRenda)}
            sub={`PNUD ${ano(idhmRenda)}`}
            fonte="PNUD"
          />
          <StatCard
            label="IDHM Longevidade"
            value={dash(idhmLong)}
            sub={`PNUD ${ano(idhmLong)}`}
            fonte="PNUD"
          />
        </div>
      </section>

      {/* Educação */}
      <section className="mb-6">
        <h2 className="text-base font-semibold text-foreground mb-3">Educação</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <StatCard
            label="IDEB Anos Iniciais"
            value={dash(ideb)}
            sub={`Rede pública · ${ano(ideb)}`}
            fonte="INEP"
            fonteUrl="https://www.gov.br/inep/pt-br/areas-de-atuacao/pesquisas-estatisticas-e-indicadores/ideb"
          />
          <StatCard
            label="IDEB Anos Finais"
            value={dash(idebFinais)}
            sub={`Rede pública · ${ano(idebFinais)}`}
            fonte="INEP"
          />
        </div>
        <Link
          href="/educacao"
          className="text-sm text-primary hover:underline inline-flex items-center gap-1 mt-3"
        >
          Ver dados de educação completos →
        </Link>
      </section>

      {/* Saneamento */}
      <section className="mb-6">
        <h2 className="text-base font-semibold text-foreground mb-3">Saneamento</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <StatCard
            label="Saneamento"
            value={dash(saneamento)}
            sub={`Cobertura ${ano(saneamento)}`}
            fonte="IBGE / SNIS"
            fonteUrl="http://www.snis.gov.br/"
          />
        </div>
      </section>

      <p className="text-xs text-muted-foreground italic mt-8">
        Os indicadores acima são consolidados via{" "}
        <a
          href={`${SITE_URL}/sobre`}
          className="text-primary hover:underline"
        >
          sincronizações automáticas
        </a>{" "}
        com IBGE, INEP, PNUD/Atlas Brasil, SENATRAN e SNIS. Cada card aponta para a fonte original.
      </p>
    </div>
  );
}

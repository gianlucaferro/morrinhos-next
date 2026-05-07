import { Building } from "lucide-react";
import { pageMetadata, datasetJsonLd } from "@/lib/seo";
import EmColetaSection from "@/components/EmColetaSection";
import InfraestruturaPanel from "@/components/infraestrutura/InfraestruturaPanel";
import { fetchIndicadores } from "@/lib/data/home";
import { fetchInfraestruturaIndicadores } from "@/lib/data/infraestrutura";
import { fetchArbovirosesMensal } from "@/lib/data/saude";

export const metadata = pageMetadata({
  title: "Infraestrutura Urbana de Morrinhos GO — SNIS, ANEEL, ANATEL",
  description:
    "Saneamento básico (água 73%, esgoto 69%, lixo 55%), tarifa Equatorial Goiás, cobertura 4G/5G, pavimentação e cruzamento saneamento × dengue em Morrinhos.",
  path: "/infraestrutura",
});

export const revalidate = 3600;

const SITE_URL = "https://morrinhos.ai";

const infraDataset = datasetJsonLd({
  name: "Infraestrutura Urbana de Morrinhos (SNIS + ANEEL + ANATEL)",
  description:
    "Indicadores consolidados de saneamento básico SNIS 2023, tarifa de energia elétrica Equatorial Goiás 2025, cobertura móvel ANATEL 4G/5G, pavimentação, drenagem urbana e política municipal de saneamento de Morrinhos.",
  url: `${SITE_URL}/infraestrutura`,
  creator: {
    type: "GovernmentOrganization",
    name: "SNIS + ANEEL + ANATEL + IBGE + Prefeitura Municipal de Morrinhos",
  },
  dateModified: new Date().toISOString().slice(0, 10),
  keywords: [
    "infraestrutura",
    "Morrinhos",
    "saneamento",
    "água",
    "esgoto",
    "energia",
    "Equatorial Goiás",
    "4G",
    "5G",
    "SNIS",
    "ANEEL",
    "ANATEL",
  ],
});

export default async function InfraestruturaPage() {
  const [infraRows, todosInd, dengueMensal] = await Promise.all([
    fetchInfraestruturaIndicadores(),
    fetchIndicadores(),
    fetchArbovirosesMensal("dengue"),
  ]);

  // Agrega dengue por ano (2024-2026 pra cruzamento com saneamento)
  const dengueAgg = new Map<number, number>();
  for (const r of dengueMensal) {
    if (r.ano < 2024) continue;
    dengueAgg.set(r.ano, (dengueAgg.get(r.ano) ?? 0) + Number(r.valor || 0));
  }
  const dengue2024_2026 = Array.from(dengueAgg.entries())
    .map(([ano, total]) => ({ ano, total }))
    .sort((a, b) => a.ano - b.ano);

  // Indicadores residuais da home pra bloco de fontes
  const findVal = (chave: string) =>
    todosInd.find((i) => i.chave === chave);

  const indicadoresExtras: Array<{
    rotulo: string;
    valor?: string;
    fonte?: string;
    fonteUrl?: string;
  }> = [];

  const sane = findVal("saneamento_cobertura");
  if (sane) {
    indicadoresExtras.push({
      rotulo: "Saneamento (cobertura agregada IBGE)",
      valor: sane.valor_texto || "—",
      fonte: `IBGE ${sane.ano_referencia}`,
      fonteUrl: sane.fonte_url || undefined,
    });
  }

  const frota = findVal("frota_veiculos");
  if (frota) {
    indicadoresExtras.push({
      rotulo: "Frota de veículos",
      valor: frota.valor_texto || "—",
      fonte: `SENATRAN ${frota.ano_referencia}`,
      fonteUrl:
        frota.fonte_url ||
        "https://www.gov.br/senatran/pt-br/assuntos/estatisticas/frota-de-veiculos-1",
    });
  }

  return (
    <div className="container py-6 max-w-5xl">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(infraDataset) }}
      />
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Building className="w-6 h-6 text-slate-600" />
          Infraestrutura Urbana
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Saneamento, energia, conectividade, drenagem e pavimentação — base
          consolidada SNIS 2023 + ANEEL 2025 + ANATEL 2025 com dados oficiais de
          Morrinhos.
        </p>
      </header>

      {/* Painel principal — 9 painéis com dados reais */}
      <section className="mb-10">
        <InfraestruturaPanel
          rows={infraRows}
          dengue2024_2026={dengue2024_2026}
        />
      </section>

      {/* Bloco antigo (em coleta + fontes oficiais) — pra usuário consultar
          fontes primárias e validar */}
      <EmColetaSection
        titulo="Outros indicadores e fontes oficiais"
        descricao="Pra explorar dados além do que mostramos aqui (interrupções por bairro, qualidade de sinal por operadora, ranking de reclamações Procon-GO), consulte as fontes oficiais:"
        iconBg="bg-slate-500/10"
        indicadores={indicadoresExtras}
        exemplosCruzamentos={[
          "Cobertura de água tratada e esgoto sanitário (SNIS — atualização anual)",
          "Coleta de lixo: dias por semana, % atendimento (SNIS + Prefeitura)",
          "Tarifa de energia elétrica + interrupções por bairro (ANEEL)",
          "Cobertura 4G/5G por bairro + reclamações (ANATEL)",
          "Iluminação pública: pontos LED instalados, manutenção pendente (LAI à Prefeitura)",
          "Pavimentação: km asfaltados por bairro, ano de implantação (LAI)",
          "Internet pública (Wi-Fi gratuito) em pontos da cidade",
          "Cruzamento saneamento × dengue × bairros mais afetados",
        ]}
        fontes={[
          {
            nome: "SNIS — Sistema Nacional de Informações sobre Saneamento",
            url: "http://www.snis.gov.br/painel-informacoes-saneamento-brasil/web/painel-municipal",
            descricao:
              "Cobertura água, esgoto, lixo, perdas, tarifas. Atualização anual. Painel municipal disponível.",
          },
          {
            nome: "Instituto Água e Saneamento — Painel Município",
            url: "https://www.aguaesaneamento.org.br/municipios/go/morrinhos",
            descricao:
              "Agregador SNIS amigável: ficha completa de Morrinhos com indicadores, alertas e comparativos.",
          },
          {
            nome: "ANEEL — Tarifas Equatorial Goiás",
            url: "https://www.gov.br/aneel/pt-br/assuntos/consumidor/tarifas",
            descricao:
              "Tarifas vigentes residenciais B1, baixa renda, reajustes anuais. Ano-base 2025.",
          },
          {
            nome: "Equatorial Goiás (concessionária)",
            url: "https://go.equatorialenergia.com.br/",
            descricao:
              "Tarifas vigentes, atendimento, faturas. Concessionária responsável por Morrinhos.",
          },
          {
            nome: "ANATEL — Painel de Cobertura",
            url: "https://informacoes.anatel.gov.br/paineis/acessos/cobertura-municipal",
            descricao:
              "Cobertura 4G/5G por município, qualidade do sinal, operadoras ativas.",
          },
          {
            nome: "Painel Ouvidoria — Procon-GO",
            url: "https://www.procon.go.gov.br/",
            descricao:
              "Reclamações ranking por categoria (energia, telefonia, internet) em Goiás.",
          },
          {
            nome: "Plano Municipal de Saneamento Básico — Morrinhos",
            url: "https://www.morrinhos.go.gov.br/",
            descricao:
              "Plano vigente (Lei 1.628/2014). Política, conselho e fundo municipal — verificar atualização.",
          },
        ]}
      />
    </div>
  );
}

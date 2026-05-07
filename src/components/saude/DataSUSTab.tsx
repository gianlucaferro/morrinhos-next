"use client";

import {
  Activity,
  Heart,
  Baby,
  Syringe,
  Skull,
  Users,
  ExternalLink,
  Info,
  Stethoscope,
} from "lucide-react";

/**
 * Aba "DataSUS" — agrega os principais painéis nacionais de saúde pública
 * disponíveis pelo TabNet/DATASUS, com links diretos pra Morrinhos.
 *
 * NÃO faz fetch de dados em tempo real — DATASUS/TabNet não tem API REST
 * estável nem CORS-friendly. Em vez disso, oferecemos:
 * - Cards explicando cada base de dados (SIH, SIM, SINASC, SI-PNI, e-SUS)
 * - Links DIRETOS pros painéis filtrados por Morrinhos quando possível
 * - Instruções de como navegar no TabNet pra extrair dados específicos
 *
 * Fase 2 (futuro): integrar via parser de OpenDataSUS (CSV em
 * https://opendatasus.saude.gov.br/) com cron mensal.
 */

const sistemas = [
  {
    titulo: "SIH/SUS — Internações Hospitalares",
    icon: Heart,
    iconColor: "text-red-500",
    iconBg: "bg-red-500/10",
    descricao:
      "Sistema de Informações Hospitalares do SUS. Registra todas as internações financiadas pelo SUS — causa, idade, sexo, óbito hospitalar, valor pago, dias de internação.",
    indicadoresPossiveis: [
      "Internações por dengue, IRA, diabetes, hipertensão",
      "Internações por AVC e infarto (mortalidade evitável)",
      "Internações materno-infantis (cesárea %, prematuridade)",
      "Custo médio por internação ao SUS",
    ],
    linkTabNet: "http://tabnet.datasus.gov.br/cgi/deftohtm.exe?sih/cnv/qiGO.def",
    linkDescricao: "TabNet SIH/SUS Goiás — selecionar Morrinhos como filtro",
  },
  {
    titulo: "SIM — Mortalidade",
    icon: Skull,
    iconColor: "text-slate-700",
    iconBg: "bg-slate-500/10",
    descricao:
      "Sistema de Informações sobre Mortalidade. Óbitos por causa básica (CID-10), idade, sexo, raça, local de ocorrência. Base anual.",
    indicadoresPossiveis: [
      "Mortalidade infantil por 1.000 nascidos vivos",
      "Óbitos por causas externas (acidente, homicídio)",
      "Óbitos por doenças do coração e câncer",
      "Mortalidade materna",
    ],
    linkTabNet: "http://tabnet.datasus.gov.br/cgi/deftohtm.exe?sim/cnv/obt10GO.def",
    linkDescricao: "TabNet SIM Goiás — filtrar Morrinhos",
  },
  {
    titulo: "SINASC — Nascidos Vivos",
    icon: Baby,
    iconColor: "text-pink-500",
    iconBg: "bg-pink-500/10",
    descricao:
      "Sistema de Informações sobre Nascidos Vivos. Cobertura praticamente universal: peso ao nascer, prematuridade, tipo de parto (cesárea/normal), idade da mãe, escolaridade.",
    indicadoresPossiveis: [
      "Total de nascimentos por ano",
      "% de partos cesárea (padrão é menos de 25%)",
      "% de prematuridade",
      "% baixo peso ao nascer (<2.500g)",
    ],
    linkTabNet: "http://tabnet.datasus.gov.br/cgi/deftohtm.exe?sinasc/cnv/nvGO.def",
    linkDescricao: "TabNet SINASC Goiás — filtrar Morrinhos",
  },
  {
    titulo: "SI-PNI — Cobertura Vacinal",
    icon: Syringe,
    iconColor: "text-emerald-600",
    iconBg: "bg-emerald-500/10",
    descricao:
      "Sistema de Informações do Programa Nacional de Imunizações. Cobertura por imunobiológico em crianças, adolescentes, gestantes e idosos.",
    indicadoresPossiveis: [
      "Cobertura tríplice viral (sarampo) — meta ≥95%",
      "Cobertura poliomielite — meta ≥95%",
      "Cobertura BCG, Hepatite B, Pentavalente",
      "HPV em adolescentes",
    ],
    linkTabNet: "http://tabnet.datasus.gov.br/cgi/dhdat.exe?bd_pni/cpnigo.def",
    linkDescricao: "TabNet SI-PNI Goiás — filtrar Morrinhos",
  },
  {
    titulo: "e-SUS APS — Atenção Primária",
    icon: Stethoscope,
    iconColor: "text-blue-500",
    iconBg: "bg-blue-500/10",
    descricao:
      "e-SUS Atenção Primária à Saúde. Cobertura da Estratégia Saúde da Família (ESF), consultas médicas ambulatoriais, visitas dos Agentes Comunitários de Saúde.",
    indicadoresPossiveis: [
      "% da população coberta pela ESF",
      "Consultas médicas/ano por habitante",
      "Visitas domiciliares ACS/mês",
      "Hipertensos e diabéticos cadastrados",
    ],
    linkTabNet: "https://sisaps.saude.gov.br/painelsaps/saude-debate",
    linkDescricao: "Painel APS Saúde — filtrar Morrinhos GO",
  },
  {
    titulo: "CNES — Estabelecimentos",
    icon: Activity,
    iconColor: "text-purple-500",
    iconBg: "bg-purple-500/10",
    descricao:
      "Cadastro Nacional dos Estabelecimentos de Saúde. UBS, hospitais, clínicas, equipes de saúde, leitos por especialidade, equipamentos disponíveis.",
    indicadoresPossiveis: [
      "Número de UBS e equipes saúde da família",
      "Leitos hospitalares por especialidade",
      "Profissionais por categoria (médicos, enfermeiros, ACS)",
      "Equipamentos de média e alta complexidade",
    ],
    linkTabNet: "https://cnes.datasus.gov.br/pages/estabelecimentos/consulta.jsp",
    linkDescricao: "CNES — buscar por Morrinhos/GO",
  },
];

const cruzamentosFuturos = [
  "Casos de dengue × internações por dengue × óbitos por dengue × custo SUS",
  "Mortalidade infantil × cobertura ESF × renda familiar média por bairro",
  "Cobertura vacinal × surto de doenças preveníveis (sarampo, polio)",
  "Internações maternal × nascimentos cesárea × resultado neonatal",
  "Despesas com saúde × indicadores de resultado (óbitos evitáveis)",
];

export default function DataSUSTab() {
  return (
    <div className="space-y-6">
      {/* Header explicativo */}
      <div className="stat-card border-blue-500/30 bg-blue-500/5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
            <Info className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground mb-1">
              Painéis DataSUS — Saúde detalhada de Morrinhos
            </h2>
            <p className="text-sm text-foreground/85 leading-relaxed">
              O Ministério da Saúde mantém{" "}
              <strong>6 grandes bases de dados</strong> com cobertura nacional sobre saúde
              pública municipal — internações, óbitos, nascimentos, vacinação, atenção primária
              e estabelecimentos. Cada card abaixo aponta direto para o painel oficial filtrado
              por Goiás (selecione Morrinhos). Estamos trabalhando para integrar esses
              dados aqui automaticamente em fase próxima.
            </p>
          </div>
        </div>
      </div>

      {/* Cards de sistemas DataSUS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {sistemas.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.titulo} className="stat-card flex flex-col">
              <div className="flex items-start gap-3 mb-3">
                <div
                  className={`w-10 h-10 rounded-xl ${s.iconBg} flex items-center justify-center shrink-0`}
                >
                  <Icon className={`w-5 h-5 ${s.iconColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground text-sm">{s.titulo}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                    {s.descricao}
                  </p>
                </div>
              </div>
              <div className="text-xs text-foreground/85 mb-3 flex-1">
                <p className="font-semibold mb-1.5">Indicadores possíveis:</p>
                <ul className="list-disc list-inside space-y-0.5 text-muted-foreground leading-snug pl-1">
                  {s.indicadoresPossiveis.map((i) => (
                    <li key={i}>{i}</li>
                  ))}
                </ul>
              </div>
              <a
                href={s.linkTabNet}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1.5 mt-auto pt-2 border-t border-border"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                {s.linkDescricao}
              </a>
            </div>
          );
        })}
      </div>

      {/* Cruzamentos planejados */}
      <section className="stat-card border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-transparent">
        <h3 className="text-base font-semibold text-foreground mb-2 flex items-center gap-1.5">
          <Users className="w-4 h-4 text-emerald-600" />
          Cruzamentos planejados (em desenvolvimento)
        </h3>
        <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
          Quando os syncs DATASUS estiverem ativos, estes cruzamentos vão aparecer
          automaticamente:
        </p>
        <ul className="space-y-2">
          {cruzamentosFuturos.map((c, i) => (
            <li
              key={i}
              className="text-sm text-foreground/85 leading-relaxed flex items-start gap-2"
            >
              <span className="text-primary font-bold mt-0.5 shrink-0">•</span>
              <span>{c}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Disclaimer */}
      <p className="text-[10px] text-muted-foreground italic leading-relaxed">
        Fonte: Ministério da Saúde / DATASUS. As bases acima são públicas e gratuitas, com
        atualização mensal (SIH/SINASC/SIM) ou diária (e-SUS APS, CNES). O Morrinhos.ai está
        construindo integração automática via{" "}
        <a
          href="https://opendatasus.saude.gov.br/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
        >
          OpenDataSUS
        </a>{" "}
        (downloads CSV) para apresentar séries históricas e cruzamentos de forma consolidada.
      </p>
    </div>
  );
}

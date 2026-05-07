"use client";

import {
  Flame,
  TreesIcon,
  ShieldAlert,
  Droplets,
  AlertTriangle,
  ExternalLink,
  Info,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * Painel "Indicadores Ambientais" — substitui o "Em coleta" no /meio-ambiente.
 *
 * Padrao similar ao DataSUSTab: cada card descreve uma base de dados ambiental
 * publica e oficial, com link DIRETO pro dashboard/portal filtrado por
 * Morrinhos sempre que possivel. Sem inventar numeros — oferece caminho
 * curto pro cidadao consultar a fonte primaria.
 *
 * Por que esse approach: as APIs do INPE (DETER, BDQueimadas), IBAMA,
 * SICAR e ANA nao tem REST estavel sem auth. Os portais oficiais retornam
 * dashboards interativos. Em vez de pirateaer scraping fragil, direcionamos
 * pra fonte com instrucao clara — quando o INPE/IBAMA expor API estavel,
 * sincronizamos com cron.
 */

type FonteCard = {
  titulo: string;
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
  descricao: string;
  oqueMostra: string[];
  comoAcessar: string;
  url: string;
  urlLabel: string;
  observacao?: string;
};

const fontes: FonteCard[] = [
  {
    titulo: "Focos de queimadas — INPE BDQueimadas",
    icon: Flame,
    iconColor: "text-orange-500",
    iconBg: "bg-orange-500/10",
    descricao:
      "Detecção de focos de calor (queimadas) por satélite, atualizada a cada 3 horas. INPE monitora desde 1998 — a base mais completa do Brasil.",
    oqueMostra: [
      "Focos diários/mensais/anuais por município",
      "Comparação com anos anteriores",
      "Mapa interativo com cada foco geolocalizado",
      "Risco de fogo previsto (cor) por região",
    ],
    comoAcessar:
      "No mapa, escolha 'Município' nos filtros e digite Morrinhos. Selecione período (último ano ou personalizado) e veja contagem + mapa.",
    url: "https://terrabrasilis.dpi.inpe.br/queimadas/bdqueimadas/",
    urlLabel: "Abrir BDQueimadas",
    observacao: "Atualizado a cada 3 horas, todos os dias",
  },
  {
    titulo: "Alertas de desmatamento — DETER/INPE",
    icon: TreesIcon,
    iconColor: "text-red-600",
    iconBg: "bg-red-500/10",
    descricao:
      "Alertas mensais de desmatamento e degradação florestal detectados por satélite. DETER cobre Cerrado desde 2018, Amazônia desde 2004.",
    oqueMostra: [
      "Polígonos de desmatamento por município (área em hectares)",
      "Tipo: corte raso, degradação progressiva, fogo",
      "Mapa com data de detecção de cada polígono",
      "Tendência mensal — picos de desmatamento",
    ],
    comoAcessar:
      "Busque por município no portal TerraBrasilis. Selecione 'DETER Cerrado' (Morrinhos é Cerrado 100%) e período desejado.",
    url: "http://terrabrasilis.dpi.inpe.br/app/dashboard/alerts/legal/cerrado/aggregated/",
    urlLabel: "Abrir DETER Cerrado",
    observacao: "Cobertura Cerrado — boletins mensais",
  },
  {
    titulo: "Cadastro Ambiental Rural — SICAR",
    icon: ShieldAlert,
    iconColor: "text-emerald-700",
    iconBg: "bg-emerald-500/10",
    descricao:
      "Cadastro Ambiental Rural (CAR) é obrigatório para todos os imóveis rurais. Mostra área de Reserva Legal (RL), Áreas de Preservação Permanente (APP) e uso consolidado.",
    oqueMostra: [
      "Total de imóveis cadastrados em Morrinhos",
      "% da área municipal com CAR ativo",
      "Imóveis com RL/APP regularizadas vs pendentes",
      "Sobreposições (mesmo imóvel cadastrado duas vezes)",
    ],
    comoAcessar:
      "No painel, vá em 'Estatísticas' → selecione Goiás → Morrinhos. Mostra total de imóveis rurais cadastrados e área coberta.",
    url: "https://www.car.gov.br/publico/imoveis/index",
    urlLabel: "Abrir SICAR Painel Público",
    observacao: "Atualizado mensalmente pelo Serviço Florestal Brasileiro",
  },
  {
    titulo: "Embargos ambientais — IBAMA",
    icon: AlertTriangle,
    iconColor: "text-red-700",
    iconBg: "bg-red-500/10",
    descricao:
      "Lista pública de áreas embargadas por infrações ambientais — desmatamento ilegal, queimada criminosa, ou descumprimento de licença. Áreas embargadas não podem ter atividade econômica até regularização.",
    oqueMostra: [
      "Imóveis com embargo ativo em Morrinhos",
      "Motivo do embargo (CIM/CTF)",
      "Data do auto de infração",
      "Área embargada em hectares",
    ],
    comoAcessar:
      "Na consulta pública, filtre por UF=GO e Município=Morrinhos. Lista pública de todos os embargos.",
    url: "https://servicos.ibama.gov.br/ctf/publico/areasembargadas/ConsultaPublicaAreasEmbargadas.php",
    urlLabel: "Consultar Embargos IBAMA",
    observacao: "Lista pública de transparência ambiental",
  },
  {
    titulo: "Qualidade da água — ANA",
    icon: Droplets,
    iconColor: "text-cyan-600",
    iconBg: "bg-cyan-500/10",
    descricao:
      "Agência Nacional de Águas mantém estações de monitoramento de qualidade e quantidade nos rios brasileiros. Para Morrinhos, o foco é o Rio Morrinhos (afluente do Rio Meia Ponte).",
    oqueMostra: [
      "Vazão mensal/anual do Rio Morrinhos",
      "Qualidade da água — IQA (Índice Qualidade da Água)",
      "Outorgas de uso da água (irrigação, abastecimento)",
      "Eventos críticos (estiagem, enchente)",
    ],
    comoAcessar:
      "No portal HidroWeb, busque por 'Rio Morrinhos' ou estações da bacia do Meia Ponte. Dados disponíveis em CSV.",
    url: "https://www.snirh.gov.br/hidroweb/",
    urlLabel: "Abrir HidroWeb ANA",
    observacao: "Estação Saneago + monitoramento ANA",
  },
];

const cruzamentos = [
  "Focos de queimadas × Estiagem (chuva acumulada baixa) — risco aumenta na seca",
  "Desmatamento DETER × Expansão da soja (MapBiomas) — onde o avanço agrícola está pressionando mata",
  "Embargos IBAMA × Imóveis com CAR ativo — produtor regularizado tem menos infrações",
  "Qualidade da água × Lançamentos não tratados (SNIS esgoto) — saneamento e meio ambiente conectados",
  "Área queimada × Regeneração florestal (MapBiomas) — quanto da mata se recupera após fogo",
];

export default function IndicadoresAmbientaisPanel() {
  return (
    <div className="space-y-6">
      <div className="stat-card border-emerald-500/30 bg-emerald-500/5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
            <Info className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground mb-1">
              Indicadores Ambientais — fontes oficiais filtráveis por Morrinhos
            </h2>
            <p className="text-sm text-foreground/85 leading-relaxed">
              5 grandes bases nacionais de dados ambientais com cobertura municipal. Cada
              card abaixo aponta direto pro portal oficial. As APIs do INPE/IBAMA/SICAR/ANA
              não têm REST estável pública, então direcionamos pra fonte primária com
              instruções de filtro. Quando expuserem API, faremos sync automático.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {fontes.map((f) => {
          const Icon = f.icon;
          return (
            <div key={f.titulo} className="stat-card flex flex-col">
              <div className="flex items-start gap-3 mb-3">
                <div className={`w-10 h-10 rounded-xl ${f.iconBg} flex items-center justify-center shrink-0`}>
                  <Icon className={`w-5 h-5 ${f.iconColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground text-sm">{f.titulo}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                    {f.descricao}
                  </p>
                </div>
              </div>

              <div className="text-xs mb-3">
                <p className="font-semibold text-foreground/85 mb-1">O que dá pra ver:</p>
                <ul className="list-disc list-inside space-y-0.5 text-muted-foreground leading-snug pl-1">
                  {f.oqueMostra.map((i) => (
                    <li key={i}>{i}</li>
                  ))}
                </ul>
              </div>

              <div className="text-xs mb-3 p-2 rounded-md bg-muted/50 border border-border/50">
                <p className="font-semibold text-foreground/85 mb-0.5 text-[11px]">
                  Como filtrar Morrinhos:
                </p>
                <p className="text-muted-foreground leading-snug">{f.comoAcessar}</p>
              </div>

              <a
                href={f.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1.5 mt-auto pt-2 border-t border-border"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                {f.urlLabel}
              </a>
              {f.observacao && (
                <p className="text-[10px] text-muted-foreground mt-1 italic">
                  {f.observacao}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Cruzamentos */}
      <section className="stat-card border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-transparent">
        <h3 className="text-base font-semibold text-foreground mb-2 flex items-center gap-1.5">
          <TreesIcon className="w-4 h-4 text-emerald-600" />
          Cruzamentos planejados
        </h3>
        <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
          Quando essas bases tiverem API estável, vão se conectar com dados que já temos
          (MapBiomas, chuva, agro) pra gerar análises do tipo:
        </p>
        <ul className="space-y-2">
          {cruzamentos.map((c, i) => (
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
    </div>
  );
}

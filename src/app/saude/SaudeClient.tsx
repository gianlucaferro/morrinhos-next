/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any */
"use client";

import Layout from "@/components/Layout";
import SEO from "@/components/SEO";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Heart, Building2, Bug, Users, DollarSign,
  ExternalLink, MapPin, Phone, Activity, TrendingUp,
  AlertTriangle, CheckCircle, Stethoscope, Droplets, Info,
} from "lucide-react";
import {
  fetchSaudeEstabelecimentos, fetchSaudeIndicadores,
  fetchServidoresSaude, fetchDespesasSaude,
  type SaudeEstabelecimento, type SaudeIndicador,
} from "@/data/saudeApi";
import { supabase } from "@/integrations/supabase/client";
import { Share2, Navigation } from "lucide-react";
import { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, ReferenceLine,
} from "recharts";
import ChuvaDengueChart from "@/components/saude/ChuvaDengueChart";
import DataSUSTab from "@/components/saude/DataSUSTab";
import MortalidadeTab from "@/components/saude/MortalidadeTab";
import DengueSazonalidadeChart from "@/components/saude/DengueSazonalidadeChart";
import ArbovirosesComparativoChart from "@/components/saude/ArbovirosesComparativoChart";

function formatCurrency(val: number | null) {
  if (val === null || val === undefined) return "—";
  return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const MESES = ["", "Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function EmptyState({ icon: Icon, title, description, fonteUrl }: {
  icon: any; title: string; description: string; fonteUrl?: string;
}) {
  return (
    <div className="stat-card flex flex-col items-center justify-center py-12 text-center">
      <Icon className="w-10 h-10 text-muted-foreground mb-3" />
      <h3 className="font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-md">{description}</p>
      {fonteUrl && (
        <a href={fonteUrl} target="_blank" rel="noopener noreferrer"
          className="mt-3 text-xs text-primary hover:underline inline-flex items-center gap-1">
          <ExternalLink className="w-3 h-3" /> Verificar na fonte
        </a>
      )}
    </div>
  );
}

const POPULACAO = 51351;

function SaudeResumo() {
  const { data: servidoresSaude } = useQuery({
    queryKey: ["servidores-saude-count"],
    queryFn: async () => {
      const cargos = ["ENFERM", "ODONT", "AGENTE COMUNIT", "FISIOT", "NUTRI", "PSICOL", "FARMAC"];
      const conditions = cargos.map(c => `cargo.ilike.%${c}%`).join(",");
      const { data, error } = await supabase
        .from("servidores")
        .select("cargo")
        .or(conditions)
        .eq("orgao_tipo", "prefeitura");
      if (error) return null;
      const counts: Record<string, number> = {};
      for (const s of data || []) {
        const cargo = (s.cargo || "").toUpperCase();
        if (cargo.includes("ENFERM")) counts["Enfermeiros"] = (counts["Enfermeiros"] || 0) + 1;
        else if (cargo.includes("ODONT")) counts["Dentistas"] = (counts["Dentistas"] || 0) + 1;
        else if (cargo.includes("AGENTE COMUNIT")) counts["Agentes de Saúde"] = (counts["Agentes de Saúde"] || 0) + 1;
        else if (cargo.includes("FISIOT")) counts["Fisioterapeutas"] = (counts["Fisioterapeutas"] || 0) + 1;
        else if (cargo.includes("PSICOL")) counts["Psicólogos"] = (counts["Psicólogos"] || 0) + 1;
        else if (cargo.includes("FARMAC")) counts["Farmacêuticos"] = (counts["Farmacêuticos"] || 0) + 1;
        else if (cargo.includes("NUTRI")) counts["Nutricionistas"] = (counts["Nutricionistas"] || 0) + 1;
      }
      return { total: data?.length || 0, counts };
    },
    staleTime: 30 * 60 * 1000,
  });

  const { data: estabelecimentos } = useQuery({
    queryKey: ["saude-estabelecimentos"],
    queryFn: fetchSaudeEstabelecimentos,
  });

  if (!servidoresSaude) return null;

  const ratio = servidoresSaude.total > 0 ? (POPULACAO / servidoresSaude.total).toFixed(0) : null;
  const totalEstab = estabelecimentos?.length || 0;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      <div className="stat-card text-center">
        <p className="text-xs text-muted-foreground">Profissionais de saúde</p>
        <p className="text-2xl font-bold text-primary">{servidoresSaude.total}</p>
        {ratio && <p className="text-[10px] text-muted-foreground">1 para cada {ratio} hab.</p>}
      </div>
      <div className="stat-card text-center">
        <p className="text-xs text-muted-foreground">Estabelecimentos</p>
        <p className="text-2xl font-bold text-foreground">{totalEstab}</p>
        <p className="text-[10px] text-muted-foreground">cadastrados no CNES</p>
      </div>
      {Object.entries(servidoresSaude.counts).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([cargo, count]) => (
        <div key={cargo} className="stat-card text-center">
          <p className="text-xs text-muted-foreground">{cargo}</p>
          <p className="text-2xl font-bold text-foreground">{count}</p>
          <p className="text-[10px] text-muted-foreground">1:{Math.round(POPULACAO / count)} hab.</p>
        </div>
      ))}
    </div>
  );
}

// ========== ESTABELECIMENTOS TAB ==========
function EstabelecimentosTab() {
  const { data: estabelecimentos, isLoading } = useQuery({
    queryKey: ["saude-estabelecimentos"],
    queryFn: fetchSaudeEstabelecimentos,
  });
  const [filtroTipo, setFiltroTipo] = useState<string | null>(null);

  if (isLoading) return <div className="stat-card animate-pulse h-40" />;
  if (!estabelecimentos?.length) {
    return <EmptyState icon={Building2} title="Sem dados de estabelecimentos"
      description="Dados serão carregados após a primeira sincronização com o CNES/DATASUS."
      fonteUrl="https://cnes.datasus.gov.br/" />;
  }

  const tipoCategory = (tipo: string | null): string => {
    if (!tipo) return "Outros";
    const t = tipo.toLowerCase();
    if (t.includes("hospital")) return "Hospitais";
    if (t.includes("usf") || t.includes("unidade de saúde") || t.includes("centro de saúde") || t.includes("posto de saúde")) return "Atenção Primária";
    if (t.includes("caps") || t.includes("especialidade") || t.includes("clínic") || t.includes("odontológic") || t.includes("oftalmológic") || t.includes("reabilitação") || t.includes("infantil") || t.includes("domiciliar") || t.includes("academia")) return "Clínicas e Especialidades";
    if (t.includes("farmácia") || t.includes("drogaria") || t.includes("droga")) return "Farmácias";
    if (t.includes("laboratório")) return "Laboratórios";
    if (t.includes("samu")) return "Urgência";
    if (t.includes("vigilância") || t.includes("regulação") || t.includes("gestão") || t.includes("secretaria") || t.includes("comissão")) return "Gestão e Vigilância";
    return "Outros";
  };

  const tipoCategoryColors: Record<string, string> = {
    "Hospitais": "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
    "Atenção Primária": "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
    "Clínicas e Especialidades": "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
    "Farmácias": "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
    "Laboratórios": "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
    "Urgência": "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
    "Gestão e Vigilância": "bg-slate-100 text-slate-800 dark:bg-slate-900/40 dark:text-slate-300",
    "Outros": "bg-muted text-muted-foreground",
  };

  const categoryCounts = estabelecimentos.reduce((acc, est) => {
    const cat = tipoCategory(est.tipo);
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const categoryOrder = ["Hospitais", "Urgência", "Atenção Primária", "Clínicas e Especialidades", "Laboratórios", "Farmácias", "Gestão e Vigilância", "Outros"];
  const sortedCategories = categoryOrder.filter(c => categoryCounts[c]);

  const filtered = filtroTipo
    ? estabelecimentos.filter(est => tipoCategory(est.tipo) === filtroTipo)
    : estabelecimentos;

  // Sort: by category order, then alphabetically
  const sorted = [...filtered].sort((a, b) => {
    const catA = categoryOrder.indexOf(tipoCategory(a.tipo));
    const catB = categoryOrder.indexOf(tipoCategory(b.tipo));
    if (catA !== catB) return catA - catB;
    return a.nome.localeCompare(b.nome);
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="outline" className="gap-1">
          <Building2 className="w-3 h-3" /> {estabelecimentos.length} estabelecimentos
        </Badge>
        {sortedCategories.map(cat => (
          <Badge
            key={cat}
            className={`gap-1 cursor-pointer transition-opacity ${filtroTipo === cat ? "ring-2 ring-primary" : filtroTipo ? "opacity-50" : ""} ${tipoCategoryColors[cat]}`}
            variant="secondary"
            onClick={() => setFiltroTipo(filtroTipo === cat ? null : cat)}
          >
            {cat} ({categoryCounts[cat]})
          </Badge>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sorted.map((est) => {
          const cat = tipoCategory(est.tipo);
          return (
            <div key={est.id} className="stat-card space-y-2">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-foreground text-sm">{est.nome}</h3>
                {est.fonte_url && (
                  <a href={est.fonte_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-3.5 h-3.5 text-muted-foreground hover:text-primary shrink-0" />
                  </a>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {est.tipo && (
                  <Badge className={tipoCategoryColors[cat] || "bg-muted text-muted-foreground"} variant="secondary">
                    {est.tipo}
                  </Badge>
                )}
              </div>
              <div className="space-y-1 text-xs text-muted-foreground">
                {est.endereco && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3 h-3 shrink-0" /> {est.endereco}
                  </div>
                )}
                {est.telefone && (
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3 h-3 shrink-0" />
                    <a href={`tel:${est.telefone.replace(/[^\d+]/g, "")}`} className="hover:text-primary hover:underline">
                      {est.telefone}
                    </a>
                  </div>
                )}
                {est.cnes && !est.cnes.startsWith("0000") && (
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[10px]">CNES: {est.cnes}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground">
        Fonte: <a href="https://cnes.datasus.gov.br/" target="_blank" rel="noopener noreferrer"
          className="text-primary hover:underline inline-flex items-center gap-1">
          <ExternalLink className="w-3 h-3" /> CNES/DATASUS
        </a> e fontes complementares
      </p>
    </div>
  );
}

// ========== INDICADORES EPIDEMIOLÓGICOS TAB ==========
function EpidemiologiaTab() {
  const [categoria, setCategoria] = useState("dengue");
  const currentYear = new Date().getFullYear();
  const [ano, setAno] = useState(currentYear);

  const isArbovirose = ["dengue", "chikungunya", "zika"].includes(categoria);
  const isDDA = categoria === "dda";
  const isHiv = categoria === "hiv";
  const isMeningite = categoria === "meningite";
  const isMonthlyCases = isArbovirose;
  const isIndicatorBased = isDDA || isHiv || ["mortalidade_geral", "mortalidade_infantil"].includes(categoria);
  const indicador = isMonthlyCases ? "casos_mes" : undefined;

  const { data: indicadores, isLoading } = useQuery({
    queryKey: ["saude-indicadores", categoria, ano, indicador],
    queryFn: () => fetchSaudeIndicadores(categoria, isMonthlyCases ? ano : undefined, isIndicatorBased ? undefined : indicador),
  });

  if (isLoading) return <div className="stat-card animate-pulse h-40" />;

  const nivelLabel = (texto: string | null) => {
    if (!texto) return null;
    const match = texto.match(/Nível máx: (\d)/);
    if (!match) return null;
    const nivel = parseInt(match[1]);
    const labels: Record<number, { text: string; color: string; icon: any }> = {
      1: { text: "Verde", color: "text-green-600", icon: CheckCircle },
      2: { text: "Amarelo", color: "text-yellow-600", icon: AlertTriangle },
      3: { text: "Laranja", color: "text-orange-600", icon: AlertTriangle },
      4: { text: "Vermelho", color: "text-red-600", icon: AlertTriangle },
    };
    return labels[nivel] || null;
  };

  const diseaseLabels: Record<string, string> = {
    dengue: "Dengue",
    chikungunya: "Chikungunya",
    zika: "Zika",
    meningite: "Meningite",
    dda: "Diarreia (DDA)",
    hiv: "HIV/AIDS",
    mortalidade_geral: "Mortalidade Geral",
    mortalidade_infantil: "Mortalidade Infantil",

  };

  const diseaseIcons: Record<string, any> = {
    dengue: Bug,
    chikungunya: Bug,
    zika: Bug,
    meningite: AlertTriangle,
    dda: Droplets,
    hiv: Activity,
    mortalidade_geral: Heart,
    mortalidade_infantil: Heart,

  };

  const fonteUrls: Record<string, string> = {
    dengue: "https://info.dengue.mat.br/",
    chikungunya: "https://info.dengue.mat.br/",
    zika: "https://info.dengue.mat.br/",
    meningite: "https://goias.gov.br/saude-reforca-importancia-da-vacinacao-e-diagnostico-precoce-da-meningite/",
    dda: "https://cidades.ibge.gov.br/brasil/go/morrinhos/panorama",
    hiv: "https://dadosabertos.go.gov.br/dataset/ist-aids",
    mortalidade_geral: "https://dadosabertos.go.gov.br/dataset/mortalidade",
    mortalidade_infantil: "https://dadosabertos.go.gov.br/dataset/mortalidade",

  };

  const fonteLabels: Record<string, string> = {
    dengue: "InfoDengue — Ministério da Saúde / Fiocruz",
    chikungunya: "InfoDengue — Ministério da Saúde / Fiocruz",
    zika: "InfoDengue — Ministério da Saúde / Fiocruz",
    meningite: "SES-GO / Portal goias.gov.br / O Hoje",
    dda: "IBGE Panorama — Morrinhos",
    hiv: "SES-GO / Dados Abertos Goiás (SINAN + SIM)",
    mortalidade_geral: "SES-GO / Dados Abertos Goiás (SIM)",
    mortalidade_infantil: "SES-GO / Dados Abertos Goiás (SIM)",

  };

  return (
    <div className="space-y-4">
      {/* Category buttons */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(diseaseLabels).map(([key, label]) => {
          const Icon = diseaseIcons[key] || Bug;
          return (
            <button
              key={key}
              onClick={() => { setCategoria(key); setAno(currentYear); }}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors inline-flex items-center gap-1.5 ${
                categoria === key
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          );
        })}
      </div>

      {/* Year filter (for monthly cases categories) */}
      {isMonthlyCases && (
        <div className="flex gap-2">
          {[currentYear - 2, currentYear - 1, currentYear].map((y) => (
            <button
              key={y}
              onClick={() => setAno(y)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                ano === y
                  ? "bg-accent text-accent-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {y}
            </button>
          ))}
        </div>
      )}

      {isMeningite ? (
        <MeningiteView />
      ) : !indicadores?.length ? (
        <EmptyState
          icon={diseaseIcons[categoria] || Bug}
          title={`Sem dados de ${diseaseLabels[categoria]}${isMonthlyCases ? ` em ${ano}` : ''}`}
          description={
            categoria === "hiv"
              ? "Os dados serão carregados após a sincronização com os Dados Abertos da SES-GO."
              : ["mortalidade_geral", "mortalidade_infantil"].includes(categoria)
              ? "Os dados serão carregados após a sincronização com os Dados Abertos da SES-GO (SIM)."
              : categoria === "dda"
              ? "Os dados de Doenças Diarreicas Agudas serão carregados após a sincronização com o SINAN/DATASUS."
              : "Os dados serão carregados após a sincronização com o sistema InfoDengue do Ministério da Saúde."
          }
          fonteUrl={fonteUrls[categoria]}
        />
      ) : isDDA ? (
        <DDAView indicadores={indicadores} />
      ) : isHiv ? (
        <HivFullView indicadores={indicadores} />
      ) : categoria === "mortalidade_geral" || categoria === "mortalidade_infantil" ? (
        <MortalidadeFullView indicadores={indicadores} categoria={categoria} />
      ) : isMonthlyCases ? (
        <ArboviroseView indicadores={indicadores} categoria={categoria} ano={ano} diseaseLabels={diseaseLabels} nivelLabel={nivelLabel} />
      ) : null}

      <p className="text-xs text-muted-foreground">
        Fonte: <a href={fonteUrls[categoria]} target="_blank" rel="noopener noreferrer"
          className="text-primary hover:underline inline-flex items-center gap-1">
          <ExternalLink className="w-3 h-3" /> {fonteLabels[categoria]}
        </a>
      </p>
    </div>
  );
}

// ===== Meningite (dados estaduais verificados) =====

const MENINGITE_GO = [
  { ano: 2024, casos: 290, obitos: 50, letalidade: "17,2%" },
  { ano: 2025, casos: 245, obitos: 34, letalidade: "13,9%" },
  { ano: 2026, casos: 16, obitos: null, letalidade: "—", nota: "até março" },
];

const MENINGITE_VACINAS = [
  { nome: "Meningocócica C (< 2 anos)", cobertura: 89.94, meta: 95 },
  { nome: "Meningocócica ACWY (11-14 anos)", cobertura: 70.14, meta: 95 },
];

function MeningiteView() {
  return (
    <div className="space-y-4">
      {/* Alert */}
      <div className="stat-card border-orange-500/30 bg-orange-50 dark:bg-orange-500/5">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-foreground">Alerta: Meningite em Goiás</p>
            <p className="text-xs text-muted-foreground mt-1">
              Goiás registrou 290 casos de meningite em 2024 e 245 em 2025. A cobertura vacinal
              da Meningocócica ACWY (adolescentes 11-14 anos) está em apenas 70%, bem abaixo
              da meta de 95%. A vacinação é a principal forma de prevenção.
            </p>
          </div>
        </div>
      </div>

      {/* Casos estaduais */}
      <div className="stat-card">
        <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          Casos confirmados em Goiás
        </h3>
        <p className="text-xs text-muted-foreground mb-3">
          Dados da Secretaria de Estado de Saúde de Goiás (SES-GO). Dados municipais de
          Morrinhos disponíveis no DATASUS/SINAN (TabNet).
        </p>
        <div className="space-y-2">
          {MENINGITE_GO.map((d) => (
            <div key={d.ano} className="flex items-center gap-3">
              <span className="text-xs font-medium text-foreground w-12">
                {d.ano}{d.nota ? "*" : ""}
              </span>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <div className="flex-1 bg-muted rounded-full h-6 overflow-hidden">
                    <div
                      className="h-full bg-orange-500/70 rounded-full flex items-center justify-end pr-2 transition-all"
                      style={{ width: `${Math.max((d.casos / 300) * 100, 10)}%` }}
                    >
                      <span className="text-[10px] font-bold text-white">{d.casos} casos</span>
                    </div>
                  </div>
                  {d.obitos !== null && (
                    <span className="text-xs text-destructive font-medium shrink-0">{d.obitos} óbitos</span>
                  )}
                </div>
              </div>
              {d.letalidade !== "—" && (
                <span className="text-[10px] text-muted-foreground shrink-0">Let. {d.letalidade}</span>
              )}
            </div>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground mt-2">* Dados parciais (até março de 2026)</p>
      </div>

      {/* Cobertura vacinal */}
      <div className="stat-card">
        <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-primary" />
          Cobertura vacinal em Goiás (2025)
        </h3>
        <div className="space-y-3">
          {MENINGITE_VACINAS.map((v) => {
            const abaixoMeta = v.cobertura < v.meta;
            const pct = (v.cobertura / 100) * 100;
            const metaPct = (v.meta / 100) * 100;
            return (
              <div key={v.nome}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-foreground font-medium">{v.nome}</span>
                  <span className={`text-xs font-bold ${abaixoMeta ? "text-orange-500" : "text-green-600"}`}>
                    {v.cobertura.toFixed(1)}%
                  </span>
                </div>
                <div className="relative bg-muted rounded-full h-4 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${abaixoMeta ? "bg-orange-500/70" : "bg-green-500/70"}`}
                    style={{ width: `${pct}%` }}
                  />
                  <div
                    className="absolute top-0 h-full w-0.5 bg-foreground/40"
                    style={{ left: `${metaPct}%` }}
                    title={`Meta: ${v.meta}%`}
                  />
                </div>
                <div className="flex justify-between mt-0.5">
                  <span className="text-[10px] text-muted-foreground">0%</span>
                  <span className="text-[10px] text-muted-foreground">Meta: {v.meta}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sintomas e prevenção */}
      <div className="stat-card">
        <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
          <Info className="w-4 h-4 text-primary" />
          Sintomas e prevenção
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-muted-foreground">
          <div>
            <p className="font-medium text-foreground mb-1.5">Sintomas de alerta:</p>
            <ul className="space-y-1 list-disc list-inside">
              <li>Febre alta e repentina</li>
              <li>Dor de cabeça intensa</li>
              <li>Rigidez no pescoço (nuca dura)</li>
              <li>Náuseas e vômitos</li>
              <li>Confusão mental e sonolência</li>
              <li>Manchas vermelhas na pele (petéquias)</li>
              <li>Sensibilidade à luz</li>
            </ul>
            <p className="text-destructive font-medium mt-2">
              Procure atendimento médico imediatamente. Meningite pode ser fatal em horas.
            </p>
          </div>
          <div>
            <p className="font-medium text-foreground mb-1.5">Prevenção:</p>
            <ul className="space-y-1 list-disc list-inside">
              <li><strong>Vacinação</strong> — principal forma de prevenção</li>
              <li>Meningo C: aos 3, 5 e 12 meses (reforço aos 4 anos)</li>
              <li>Meningo ACWY: dose única aos 11-14 anos</li>
              <li>Evitar ambientes fechados e aglomerados</li>
              <li>Lavar as mãos frequentemente</li>
              <li>Não compartilhar copos, talheres e alimentos</li>
            </ul>
            <p className="text-primary font-medium mt-2">
              Vacinas disponíveis gratuitamente nos postos de saúde (SUS).
            </p>
          </div>
        </div>
      </div>

      {/* Fontes */}
      <div className="text-[10px] text-muted-foreground space-y-0.5">
        <p>Fontes dos dados estaduais:</p>
        <p>
          • SES-GO via{" "}
          <a href="https://goias.gov.br/saude-reforca-importancia-da-vacinacao-e-diagnostico-precoce-da-meningite/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
            Portal goias.gov.br (22/04/2025)
          </a>
        </p>
        <p>
          • SES-GO via{" "}
          <a href="https://ohoje.com/2026/03/25/goias-registra-16-casos-e-6-mortes-por-meningite-em-2026/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
            Jornal O Hoje (25/03/2026)
          </a>
        </p>
        <p>• Dados municipais de Morrinhos disponíveis em <a href="http://tabnet.datasus.gov.br/cgi/tabcgi.exe?sinannet/cnv/meninbr.def" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">TabNet SINAN — DATASUS</a></p>
      </div>
    </div>
  );
}

// ===== Arboviroses (dengue, chik, zika) =====
function ArboviroseView({ indicadores, categoria, ano, diseaseLabels, nivelLabel }: any) {
  const totalCasos = indicadores?.reduce((sum: number, i: any) => sum + (i.valor || 0), 0) || 0;
  const casosPorMes = (indicadores ?? []).map((i: any) => ({
    mes: i.mes ?? 0,
    valor: i.valor ?? 0,
  }));
  // Chuva historica mensal pre-hidratada por /saude/page.tsx via React Query.
  // Sem chamada externa em runtime — leve e instantaneo.
  const { data: chuvaPorMes = {} } = useQuery({
    queryKey: ["chuva-historica-mensal", ano],
    queryFn: () => Promise.resolve({} as Record<number, number>),
    staleTime: Infinity,
  });
  // Dados multi-anos pra grafico de sazonalidade (so dengue)
  const { data: dengueMensalMultianos = [] } = useQuery<Array<{ ano: number; mes: number; valor: number }>>({
    queryKey: ["saude-dengue-mensal-multianos"],
    queryFn: () => Promise.resolve([]),
    staleTime: Infinity,
  });
  // Dados de chikungunya/zika pra comparativo arboviroses
  const { data: chikMensal = [] } = useQuery<Array<{ ano: number; mes: number; valor: number }>>({
    queryKey: ["saude-chik-mensal"],
    queryFn: () => Promise.resolve([]),
    staleTime: Infinity,
  });
  const { data: zikaMensal = [] } = useQuery<Array<{ ano: number; mes: number; valor: number }>>({
    queryKey: ["saude-zika-mensal"],
    queryFn: () => Promise.resolve([]),
    staleTime: Infinity,
  });
  return (
    <>
      {/* Grafico Chuva x Dengue - so para dengue (correlacao mais forte) */}
      {categoria === "dengue" && (
        <ChuvaDengueChart casosPorMes={casosPorMes} chuvaPorMes={chuvaPorMes} ano={ano} />
      )}
      {/* Sazonalidade — sobrepoe casos mensais dos ultimos anos */}
      {categoria === "dengue" && dengueMensalMultianos.length > 0 && (
        <div className="my-4">
          <DengueSazonalidadeChart rows={dengueMensalMultianos} categoria={categoria} />
        </div>
      )}
      {/* Comparativo arboviroses (dengue+chik+zika) — so na aba dengue */}
      {categoria === "dengue" && (dengueMensalMultianos.length > 0 || chikMensal.length > 0 || zikaMensal.length > 0) && (
        <div className="my-4">
          <ArbovirosesComparativoChart
            dengue={dengueMensalMultianos}
            chikungunya={chikMensal}
            zika={zikaMensal}
          />
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="stat-card text-center">
          <p className="text-2xl font-bold text-foreground">{totalCasos}</p>
          <p className="text-xs text-muted-foreground">Total de casos em {ano}</p>
        </div>
        <div className="stat-card text-center">
          <p className="text-2xl font-bold text-foreground">{indicadores.length}</p>
          <p className="text-xs text-muted-foreground">Meses com dados</p>
        </div>
        <div className="stat-card text-center col-span-2 md:col-span-1">
          <p className="text-2xl font-bold text-foreground">
            {Math.max(...indicadores.map((i: any) => i.valor || 0))}
          </p>
          <p className="text-xs text-muted-foreground">Pico mensal</p>
        </div>
      </div>

      <div className="stat-card">
        <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          Casos por mês — {diseaseLabels[categoria]} {ano}
        </h3>
        <div className="space-y-2">
          {indicadores
            .sort((a: any, b: any) => (a.mes || 0) - (b.mes || 0))
            .map((ind: any) => {
              const maxVal = Math.max(...indicadores.map((i: any) => i.valor || 1), 1);
              const pct = ((ind.valor || 0) / maxVal) * 100;
              const nivel = nivelLabel(ind.valor_texto);
              return (
                <div key={ind.id} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-8">{MESES[ind.mes || 0]}</span>
                  <div className="flex-1 bg-muted rounded-full h-5 overflow-hidden">
                    <div
                      className="h-full bg-primary/80 rounded-full flex items-center justify-end pr-2 transition-all"
                      style={{ width: `${Math.max(pct, 8)}%` }}
                    >
                      <span className="text-[10px] font-bold text-primary-foreground">
                        {ind.valor || 0}
                      </span>
                    </div>
                  </div>
                  {nivel && <nivel.icon className={`w-3.5 h-3.5 ${nivel.color}`} />}
                </div>
              );
            })}
        </div>
      </div>
    </>
  );
}

// ===== DDA (Doenças Diarreicas Agudas) View =====
function DDAView({ indicadores }: { indicadores: SaudeIndicador[] }) {
  const sorted = [...indicadores].sort((a, b) => a.ano - b.ano);
  const latest = [...indicadores].sort((a, b) => b.ano - a.ano)[0];
  const oldest = sorted[0];

  // Média nacional e estadual de referência
  const MEDIA_NACIONAL = 130;
  const MEDIA_ESTADUAL = 220;

  // Evolução temporal
  const chartData = sorted.map(ind => ({
    ano: String(ind.ano),
    valor: ind.valor || 0,
  }));

  // Calcular tendência
  const recentYears = sorted.slice(-3);
  const trend = recentYears.length >= 2
    ? (recentYears[recentYears.length - 1]?.valor || 0) - (recentYears[0]?.valor || 0)
    : 0;

  // Pico e mínimo
  const pico = sorted.reduce((max, ind) => (ind.valor || 0) > (max.valor || 0) ? ind : max, sorted[0]);
  const minimo = sorted.reduce((min, ind) => (ind.valor || 0) < (min.valor || 0) ? ind : min, sorted[0]);

  return (
    <div className="space-y-4">
      {/* Cards de destaque */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="stat-card text-center">
          <p className="text-2xl font-bold text-foreground">
            {latest?.valor?.toLocaleString("pt-BR", { minimumFractionDigits: 1 })}
          </p>
          <p className="text-[10px] text-muted-foreground">por 100 mil hab. ({latest?.ano})</p>
        </div>
        <div className="stat-card text-center">
          <p className="text-2xl font-bold text-foreground">{sorted.length}</p>
          <p className="text-[10px] text-muted-foreground">anos de dados</p>
        </div>
        <div className="stat-card text-center">
          <p className="text-2xl font-bold text-destructive">
            {pico?.valor?.toLocaleString("pt-BR", { minimumFractionDigits: 1 })}
          </p>
          <p className="text-[10px] text-muted-foreground">pico ({pico?.ano})</p>
        </div>
        <div className="stat-card text-center">
          <p className="text-2xl font-bold text-green-600">
            {minimo?.valor?.toLocaleString("pt-BR", { minimumFractionDigits: 1 })}
          </p>
          <p className="text-[10px] text-muted-foreground">mínimo ({minimo?.ano})</p>
        </div>
      </div>

      {/* Gráfico de evolução */}
      {chartData.length > 1 && (
        <div className="stat-card">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            Evolução — Internações por diarreia (por 100 mil hab.)
          </h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="ano" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip
                  formatter={(value: number) => [value.toLocaleString("pt-BR", { minimumFractionDigits: 1 }), "Internações/100 mil"]}
                  labelFormatter={(label) => `Ano: ${label}`}
                  contentStyle={{ fontSize: 12 }}
                />
                <ReferenceLine y={MEDIA_NACIONAL} stroke="hsl(var(--chart-3))" strokeDasharray="5 5" label={{ value: "Média BR", position: "right", fontSize: 9, fill: "hsl(var(--chart-3))" }} />
                <ReferenceLine y={MEDIA_ESTADUAL} stroke="hsl(var(--chart-4))" strokeDasharray="5 5" label={{ value: "Média GO", position: "right", fontSize: 9, fill: "hsl(var(--chart-4))" }} />
                <Bar dataKey="valor" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Morrinhos" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">
            Linhas tracejadas: média nacional (~130) e estadual GO (~220) de referência
          </p>
        </div>
      )}

      {/* Alerta de nível */}
      <div className="stat-card border-l-4 border-destructive bg-destructive/5">
        <h3 className="font-semibold text-destructive mb-2 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          Índice muito alto
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          A taxa de Morrinhos é <strong className="text-destructive">3 a 5 vezes maior</strong> que a média nacional 
          (~130 internações/100 mil hab.) e significativamente acima da média estadual de Goiás (~220/100 mil hab.). 
          Esse indicador reflete a qualidade do saneamento básico, abastecimento de água e condições de higiene do município.
        </p>
      </div>

      {/* Fonte */}
      <p className="text-[10px] text-muted-foreground">
        Fonte: <a href={latest?.fonte_url || "https://cidades.ibge.gov.br/brasil/go/morrinhos/panorama"} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
          <ExternalLink className="w-3 h-3" /> {latest?.fonte || "IBGE Panorama — Morrinhos"}
        </a>
      </p>
    </div>
  );
}

// ===== HIV/AIDS Full View (Diagnósticos + Óbitos) =====
function HivFullView({ indicadores }: { indicadores: SaudeIndicador[] }) {
  const diagAnuais = indicadores.filter(i => i.indicador === "diagnosticos_ano").sort((a, b) => a.ano - b.ano);
  const obitosAnuais = indicadores.filter(i => i.indicador === "obitos_anual").sort((a, b) => a.ano - b.ano);
  const diagSexo = indicadores.filter(i => i.indicador === "diagnosticos_sexo");
  const diagFaixa = indicadores.filter(i => i.indicador === "diagnosticos_faixa_etaria");
  const totalDiag = indicadores.find(i => i.indicador === "total_diagnosticos");
  const totalObitos = indicadores.find(i => i.indicador === "total_obitos");
  const totalGestantes = indicadores.find(i => i.indicador === "total_gestantes");
  const gestantesAnuais = indicadores.filter(i => i.indicador === "gestantes_ano").sort((a, b) => a.ano - b.ano);
  const gestantesTaxa = indicadores.filter(i => i.indicador === "gestantes_taxa_deteccao").sort((a, b) => a.ano - b.ano);

  // Chart data: diagnósticos + óbitos por ano
  const allYears = [...new Set([...diagAnuais.map(d => d.ano), ...obitosAnuais.map(d => d.ano)])].sort();
  const chartData = allYears.map(year => ({
    ano: year,
    diagnosticos: diagAnuais.find(d => d.ano === year)?.valor || 0,
    obitos: obitosAnuais.find(d => d.ano === year)?.valor || 0,
  }));

  // Aggregate sex data across all years
  const sexTotals: Record<string, number> = {};
  for (const d of diagSexo) {
    const sexo = d.valor_texto || "IGNORADO";
    sexTotals[sexo] = (sexTotals[sexo] || 0) + (d.valor || 0);
  }

  // Aggregate age data across all years
  const ageTotals: Record<string, number> = {};
  for (const d of diagFaixa) {
    const faixa = d.valor_texto || "IGNORADO";
    ageTotals[faixa] = (ageTotals[faixa] || 0) + (d.valor || 0);
  }
  const ageOrder = ["10 A 14 ANOS", "15 A 19 ANOS", "20 A 29 ANOS", "30 A 39 ANOS", "40 A 49 ANOS", "50 A 59 ANOS", ">= 60 ANOS"];
  const ageChartData = ageOrder
    .filter(f => ageTotals[f])
    .map(f => ({ faixa: f.replace(" ANOS", ""), casos: ageTotals[f] }));

  const latestYearDiag = diagAnuais[diagAnuais.length - 1];
  const latestYearObitos = obitosAnuais[obitosAnuais.length - 1];

  return (
    <>
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="stat-card text-center">
          <p className="text-2xl font-bold text-foreground">{totalDiag?.valor || "—"}</p>
          <p className="text-xs text-muted-foreground">Casos diagnosticados</p>
          <p className="text-[10px] text-muted-foreground">acumulado 2010–{latestYearDiag?.ano}</p>
        </div>
        <div className="stat-card text-center">
          <p className="text-2xl font-bold text-foreground">{totalObitos?.valor || "—"}</p>
          <p className="text-xs text-muted-foreground">Óbitos registrados</p>
          <p className="text-[10px] text-muted-foreground">acumulado 2012–{latestYearObitos?.ano}</p>
        </div>
        <div className="stat-card text-center">
          <p className="text-2xl font-bold text-foreground">{latestYearDiag?.valor || "—"}</p>
          <p className="text-xs text-muted-foreground">Diagnósticos em {latestYearDiag?.ano}</p>
        </div>
        <div className="stat-card text-center">
          <p className="text-2xl font-bold text-foreground">{diagAnuais.length}</p>
          <p className="text-xs text-muted-foreground">Anos com dados</p>
        </div>
      </div>

      {/* Nota explicativa */}
      <div className="stat-card border-l-4 border-primary/60 bg-primary/5">
        <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
          <Info className="w-5 h-5 text-primary" />
          Sobre estes dados
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Dados de <strong className="text-foreground">casos diagnosticados</strong> (notificações SINAN) e{" "}
          <strong className="text-foreground">óbitos</strong> (SIM) de HIV/AIDS em Morrinhos, 
          obtidos do Portal de Dados Abertos de Goiás (SES-GO). Cada registro representa uma notificação individual 
          — os números refletem diagnósticos, não o total de pessoas vivendo com HIV no município.
        </p>
      </div>

      {/* Chart: Diagnósticos + Óbitos por ano */}
      {chartData.length > 0 && (
        <div className="stat-card">
          <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            Evolução anual — Diagnósticos e Óbitos
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="ano" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
              <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" allowDecimals={false} />
              <Tooltip
                contentStyle={{ fontSize: 12 }}
                formatter={(value: number, name: string) => [value, name === "diagnosticos" ? "Diagnósticos" : "Óbitos"]}
              />
              <Legend formatter={(value: string) => value === "diagnosticos" ? "Diagnósticos" : "Óbitos"} />
              <Bar dataKey="diagnosticos" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="obitos" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Demographics row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* By sex */}
        {Object.keys(sexTotals).length > 0 && (
          <div className="stat-card">
            <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              Por sexo (acumulado)
            </h3>
            <div className="space-y-2">
              {Object.entries(sexTotals)
                .sort((a, b) => b[1] - a[1])
                .map(([sexo, count]) => {
                  const total = Object.values(sexTotals).reduce((s, v) => s + v, 0);
                  const pct = (count / total) * 100;
                  return (
                    <div key={sexo} className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-20 capitalize">{sexo.toLowerCase()}</span>
                      <div className="flex-1 bg-muted rounded-full h-5 overflow-hidden">
                        <div
                          className="h-full bg-primary/70 rounded-full flex items-center justify-end pr-2 transition-all"
                          style={{ width: `${Math.max(pct, 12)}%` }}
                        >
                          <span className="text-[10px] font-bold text-primary-foreground">{count}</span>
                        </div>
                      </div>
                      <span className="text-[10px] text-muted-foreground w-10">{pct.toFixed(0)}%</span>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* By age */}
        {ageChartData.length > 0 && (
          <div className="stat-card">
            <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              Por faixa etária (acumulado)
            </h3>
            <div className="space-y-2">
              {ageChartData.map(({ faixa, casos }) => {
                const maxVal = Math.max(...ageChartData.map(d => d.casos));
                const pct = (casos / maxVal) * 100;
                return (
                  <div key={faixa} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-20">{faixa}</span>
                    <div className="flex-1 bg-muted rounded-full h-5 overflow-hidden">
                      <div
                        className="h-full bg-accent/70 rounded-full flex items-center justify-end pr-2 transition-all"
                        style={{ width: `${Math.max(pct, 12)}%` }}
                      >
                        <span className="text-[10px] font-bold text-accent-foreground">{casos}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
      </div>

      {/* Gestantes HIV/AIDS section */}
      <div className="stat-card border-l-4 border-pink-500/60">
        <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
          <Heart className="w-4 h-4 text-pink-500" />
          Gestantes com HIV/AIDS
        </h3>
        {gestantesTaxa.length > 0 ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {gestantesTaxa.map((g) => (
                <div key={g.id} className="bg-muted/50 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-foreground">{g.valor?.toFixed(1)}</p>
                  <p className="text-[10px] text-muted-foreground">por mil nasc. vivos ({g.ano})</p>
                  {g.valor_texto && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">{g.valor_texto}</p>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Taxa de detecção de HIV em gestantes por mil nascidos vivos, conforme notificações SINAN.
            </p>
          </div>
        ) : gestantesAnuais.length > 0 ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">{totalGestantes?.valor || gestantesAnuais.reduce((s, g) => s + (g.valor || 0), 0)}</strong> caso(s) registrado(s) em gestantes no período.
            </p>
            <div className="space-y-1.5">
              {[...gestantesAnuais].reverse().map((g) => (
                <div key={g.id} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-10">{g.ano}</span>
                  <div className="flex-1 bg-muted rounded-full h-4 overflow-hidden">
                    <div
                      className="h-full bg-pink-500/60 rounded-full flex items-center justify-end pr-2 transition-all"
                      style={{ width: `${Math.max(((g.valor || 0) / Math.max(...gestantesAnuais.map(x => x.valor || 1))) * 100, 15)}%` }}
                    >
                      <span className="text-[10px] font-bold text-foreground">{g.valor}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 py-2">
            <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
            <div>
              <p className="text-sm text-foreground font-medium">Nenhum caso registrado</p>
              <p className="text-xs text-muted-foreground">
                Não há registros de HIV em gestantes de Morrinhos no Portal de Dados Abertos de Goiás (SINAN).
                A taxa de detecção pré-calculada pela SES-GO também não possui dados para o município.
              </p>
            </div>
          </div>
        )}
      </div>
          </div>
        )}
      </div>

      {/* Year-by-year bar list for diagnósticos */}
      <div className="stat-card">
        <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          Diagnósticos por ano
        </h3>
        <div className="space-y-2">
          {[...diagAnuais].reverse().map((ind) => {
            const maxVal = Math.max(...diagAnuais.map(i => i.valor || 1));
            const pct = ((ind.valor || 0) / maxVal) * 100;
            return (
              <div key={ind.id} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-10">{ind.ano}</span>
                <div className="flex-1 bg-muted rounded-full h-5 overflow-hidden">
                  <div
                    className="h-full bg-primary/70 rounded-full flex items-center justify-end pr-2 transition-all"
                    style={{ width: `${Math.max(pct, 12)}%` }}
                  >
                    <span className="text-[10px] font-bold text-primary-foreground">{ind.valor}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

// ===== Mortalidade Full View (Geral + Infantil with demographics) =====
function MortalidadeFullView({ indicadores, categoria }: { indicadores: SaudeIndicador[]; categoria: string }) {
  const isInfantil = categoria === "mortalidade_infantil";
  const obitosAnuais = indicadores.filter(i => i.indicador === "obitos_anual").sort((a, b) => a.ano - b.ano);
  const totalObitosInd = indicadores.find(i => i.indicador === "total_obitos");
  const taxaIbge = indicadores.find(i => i.indicador === "taxa_mortalidade_infantil");
  const obitosSexo = indicadores.filter(i => i.indicador === "obitos_sexo");
  const obitosCausa = indicadores.filter(i => i.indicador === "obitos_causa_capitulo").sort((a, b) => (b.valor || 0) - (a.valor || 0));
  const obitosFaixa = indicadores.filter(i => i.indicador === "obitos_faixa_etaria").sort((a, b) => (a.mes || 0) - (b.mes || 0));

  const currentYear = new Date().getFullYear();
  const latestYear = obitosAnuais[obitosAnuais.length - 1];
  const chartData = obitosAnuais.map(d => ({ ano: d.ano, obitos: d.valor || 0 }));

  const sexTotals: Record<string, number> = {};
  for (const d of obitosSexo) {
    const sexo = d.valor_texto || "IGNORADO";
    sexTotals[sexo] = (sexTotals[sexo] || 0) + (d.valor || 0);
  }

  return (
    <>
      {isInfantil && taxaIbge && (
        <div className="stat-card border-l-4 border-primary mb-2">
          <p className="text-2xl font-bold text-foreground">{taxaIbge.valor?.toFixed(2).replace('.', ',')}</p>
          <p className="text-xs text-muted-foreground">óbitos por mil nascidos vivos ({taxaIbge.ano})</p>
          <p className="text-[10px] text-muted-foreground mt-1">
            Fonte: <a href={taxaIbge.fonte_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{taxaIbge.fonte}</a>
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="stat-card text-center">
          <p className="text-2xl font-bold text-foreground">{totalObitosInd?.valor?.toLocaleString("pt-BR") || "—"}</p>
          <p className="text-xs text-muted-foreground">Total de óbitos</p>
          <p className="text-[10px] text-muted-foreground">acumulado {obitosAnuais[0]?.ano}–{latestYear?.ano}</p>
        </div>
        <div className="stat-card text-center">
          <p className="text-2xl font-bold text-foreground">{latestYear?.valor || "—"}</p>
          <p className="text-xs text-muted-foreground">Óbitos em {latestYear?.ano}</p>
          {latestYear?.ano >= currentYear && <p className="text-[10px] text-muted-foreground italic">parcial</p>}
        </div>
        <div className="stat-card text-center">
          <p className="text-2xl font-bold text-foreground">{obitosAnuais.length}</p>
          <p className="text-xs text-muted-foreground">Anos com dados</p>
        </div>
        {obitosAnuais.length >= 3 && (
          <div className="stat-card text-center">
            {(() => {
              const completeYears = obitosAnuais.filter(d => d.ano < currentYear);
              const avg = completeYears.length > 0
                ? completeYears.reduce((s, d) => s + (d.valor || 0), 0) / completeYears.length
                : 0;
              return (
                <>
                  <p className="text-2xl font-bold text-foreground">{avg.toFixed(0)}</p>
                  <p className="text-xs text-muted-foreground">Média anual</p>
                </>
              );
            })()}
          </div>
        )}
      </div>

      {chartData.length > 0 && (
        <div className="stat-card">
          <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            Evolução anual — {isInfantil ? "Mortalidade Infantil" : "Mortalidade Geral"}
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="ano" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
              <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" allowDecimals={false} />
              <Tooltip contentStyle={{ fontSize: 12 }} formatter={(value: number) => [value, "Óbitos"]} />
              <Bar dataKey="obitos" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.keys(sexTotals).length > 0 && (
          <div className="stat-card">
            <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              Por sexo (acumulado)
            </h3>
            <div className="space-y-2">
              {Object.entries(sexTotals)
                .sort((a, b) => b[1] - a[1])
                .map(([sexo, count]) => {
                  const total = Object.values(sexTotals).reduce((s, v) => s + v, 0);
                  const pct = (count / total) * 100;
                  return (
                    <div key={sexo} className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-20 capitalize">{sexo.toLowerCase()}</span>
                      <div className="flex-1 bg-muted rounded-full h-5 overflow-hidden">
                        <div
                          className="h-full bg-destructive/60 rounded-full flex items-center justify-end pr-2 transition-all"
                          style={{ width: `${Math.max(pct, 12)}%` }}
                        >
                          <span className="text-[10px] font-bold text-destructive-foreground">{count.toLocaleString("pt-BR")}</span>
                        </div>
                      </div>
                      <span className="text-[10px] text-muted-foreground w-10">{pct.toFixed(0)}%</span>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {isInfantil && obitosFaixa.length > 0 && (
          <div className="stat-card">
            <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              Por faixa etária (acumulado)
            </h3>
            <div className="space-y-2">
              {obitosFaixa.map((d) => {
                const maxVal = Math.max(...obitosFaixa.map(x => x.valor || 1));
                const pct = ((d.valor || 0) / maxVal) * 100;
                const faixaLabels: Record<string, string> = {
                  "0 A 6 DIAS": "Neonatal precoce (0-6d)",
                  "7 A 27 DIAS": "Neonatal tardio (7-27d)",
                  "28 A 364 DIAS": "Pós-neonatal (28-364d)",
                };
                return (
                  <div key={d.id} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-36">{faixaLabels[d.valor_texto || ""] || d.valor_texto}</span>
                    <div className="flex-1 bg-muted rounded-full h-5 overflow-hidden">
                      <div
                        className="h-full bg-accent/70 rounded-full flex items-center justify-end pr-2 transition-all"
                        style={{ width: `${Math.max(pct, 15)}%` }}
                      >
                        <span className="text-[10px] font-bold text-accent-foreground">{d.valor}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {obitosCausa.length > 0 && (
        <div className="stat-card">
          <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <Stethoscope className="w-4 h-4 text-primary" />
            Principais causas de óbito (CID-10, acumulado)
          </h3>
          <div className="space-y-2">
            {obitosCausa.slice(0, 8).map((d) => {
              const maxVal = obitosCausa[0]?.valor || 1;
              const pct = ((d.valor || 0) / maxVal) * 100;
              return (
                <div key={d.id} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-40 truncate" title={d.valor_texto || ""}>{d.valor_texto}</span>
                  <div className="flex-1 bg-muted rounded-full h-5 overflow-hidden">
                    <div
                      className="h-full bg-primary/60 rounded-full flex items-center justify-end pr-2 transition-all"
                      style={{ width: `${Math.max(pct, 12)}%` }}
                    >
                      <span className="text-[10px] font-bold text-primary-foreground">{d.valor?.toLocaleString("pt-BR")}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}

// ========== SERVIDORES DA SAÚDE TAB ==========
function ServidoresSaudeTab() {
  const [page, setPage] = useState(0);
  const { data, isLoading } = useQuery({
    queryKey: ["servidores-saude", page],
    queryFn: () => fetchServidoresSaude(page),
  });

  if (isLoading) return <div className="stat-card animate-pulse h-40" />;
  if (!data?.data?.length) {
    return <EmptyState icon={Users} title="Sem dados de servidores da saúde"
      description="Nenhum servidor com cargo relacionado à saúde encontrado."
      fonteUrl="https://morrinhos.go.gov.br/" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="gap-1">
          <Users className="w-3 h-3" /> {data.count} servidores da saúde
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {data.data.map((s: any) => (
          <div key={s.id} className="stat-card space-y-1.5">
            <h4 className="font-semibold text-foreground text-sm">{s.nome}</h4>
            {s.cargo && <Badge variant="secondary" className="text-[10px]">{s.cargo}</Badge>}
            {s.remuneracao && (
              <div className="flex items-center gap-2 text-xs">
                <DollarSign className="w-3 h-3 text-accent" />
                <span className="font-semibold">{formatCurrency(s.remuneracao.bruto)}</span>
                <span className="text-muted-foreground">({s.remuneracao.competencia})</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {data.count > 30 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="px-3 py-1 text-xs rounded bg-secondary text-secondary-foreground disabled:opacity-50"
          >
            Anterior
          </button>
          <span className="text-xs text-muted-foreground">
            Página {page + 1} de {Math.ceil(data.count / 30)}
          </span>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={(page + 1) * 30 >= data.count}
            className="px-3 py-1 text-xs rounded bg-secondary text-secondary-foreground disabled:opacity-50"
          >
            Próxima
          </button>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Fonte: <a href="https://morrinhos.go.gov.br/" target="_blank" rel="noopener noreferrer"
          className="text-primary hover:underline inline-flex items-center gap-1">
          <ExternalLink className="w-3 h-3" /> Portal de Transparência
        </a>
      </p>
    </div>
  );
}

// ========== DESPESAS TAB ==========
function DespesasSaudeTab() {
  const currentYear = new Date().getFullYear();
  const [ano, setAno] = useState(currentYear);
  const { data: despesas, isLoading } = useQuery({
    queryKey: ["despesas-saude", ano],
    queryFn: () => fetchDespesasSaude(ano),
  });

  if (isLoading) return <div className="stat-card animate-pulse h-40" />;

  const totalDespesas = despesas?.reduce((sum: number, d: any) => sum + (d.valor || 0), 0) || 0;

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {[currentYear - 2, currentYear - 1, currentYear].map((y) => (
          <button
            key={y}
            onClick={() => setAno(y)}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              ano === y
                ? "bg-accent text-accent-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {y}
          </button>
        ))}
      </div>

      {!despesas?.length ? (
        <EmptyState icon={DollarSign} title={`Sem despesas da saúde em ${ano}`}
          description="Dados de despesas da Secretaria de Saúde não disponíveis para este período."
          fonteUrl="https://morrinhos.go.gov.br/" />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="stat-card text-center">
              <p className="text-xl font-bold text-foreground">{formatCurrency(totalDespesas)}</p>
              <p className="text-xs text-muted-foreground">Total de despesas em {ano}</p>
            </div>
            <div className="stat-card text-center">
              <p className="text-xl font-bold text-foreground">{despesas.length}</p>
              <p className="text-xs text-muted-foreground">Registros</p>
            </div>
          </div>

          <div className="stat-card">
            <h3 className="font-semibold text-foreground mb-3">Últimas despesas</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {despesas.slice(0, 50).map((d: any) => (
                <div key={d.id} className="flex items-start justify-between gap-2 py-2 border-b border-border last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-foreground truncate">{d.descricao || "Sem descrição"}</p>
                    <p className="text-[10px] text-muted-foreground">{d.favorecido} • {d.data}</p>
                  </div>
                  <span className="text-xs font-semibold text-foreground whitespace-nowrap">
                    {formatCurrency(d.valor)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      <p className="text-xs text-muted-foreground">
        Fonte: <a href="https://morrinhos.go.gov.br/" target="_blank" rel="noopener noreferrer"
          className="text-primary hover:underline inline-flex items-center gap-1">
          <ExternalLink className="w-3 h-3" /> Portal de Transparência
        </a>
      </p>
    </div>
  );
}

// ========== MAIN PAGE ==========
const tabs = [
  { value: "epidemiologia", label: "Epidemiologia", icon: Bug },
  { value: "mortalidade", label: "Mortalidade", icon: Heart },
  { value: "estabelecimentos", label: "Estabelecimentos", icon: Building2 },
  { value: "servidores", label: "Servidores", icon: Stethoscope },
  { value: "despesas", label: "Despesas", icon: DollarSign },
  { value: "datasus", label: "DataSUS", icon: Activity },
];

export default function Saude() {
  return (
    <Layout>
      <SEO
        title="Saúde Pública de Morrinhos GO"
        description="Morrinhos GO — Saúde pública: UBS, hospitais, equipes, indicadores epidemiológicos, dengue, vacinação e repasses do SUS. Dados oficiais do DATASUS."
        path="/saude"
      />

      <div className="container py-8">
        <h1 className="text-2xl font-bold text-foreground mb-1">Saúde Pública</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Dados oficiais de saúde pública de Morrinhos — fontes: Ministério da Saúde, InfoDengue, CNES/DATASUS e Portal de Transparência.
        </p>

        <SaudeResumo />

        <Tabs defaultValue="epidemiologia" className="w-full">
          <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 mb-6 scrollbar-hide">
            <TabsList className="inline-flex w-max md:w-full md:flex-wrap h-auto gap-1 bg-transparent p-0">
              {tabs.map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg px-3 py-2.5 border border-border data-[state=active]:border-primary whitespace-nowrap flex-shrink-0"
                >
                  <tab.icon className="w-3.5 h-3.5 mr-1.5" />
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <TabsContent value="epidemiologia"><EpidemiologiaTab /></TabsContent>
          <TabsContent value="mortalidade"><MortalidadeTab /></TabsContent>
          <TabsContent value="estabelecimentos"><EstabelecimentosTab /></TabsContent>
          <TabsContent value="servidores"><ServidoresSaudeTab /></TabsContent>
          <TabsContent value="despesas"><DespesasSaudeTab /></TabsContent>
          <TabsContent value="datasus"><DataSUSTab /></TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}

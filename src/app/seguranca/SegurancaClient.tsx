/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any */
"use client";

import { useState, useCallback, type ElementType } from "react";
import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import SEO from "@/components/SEO";
import PullToRefresh from "@/components/PullToRefresh";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ExternalLink, ShieldAlert, ShieldCheck, AlertTriangle, TrendingDown, TrendingUp,
  BarChart3, Info, Phone, Scale
} from "lucide-react";
import { fetchSegurancaIndicadores, type SegurancaIndicador } from "@/data/segurancaApi";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from "recharts";

function formatNumber(n: number | null) {
  if (n == null) return "—";
  return n.toLocaleString("pt-BR");
}

const INDICATOR_ICONS: Record<string, ElementType> = {
  "Homicídio Doloso": ShieldAlert,
  "Latrocínio": AlertTriangle,
  "Estupro": AlertTriangle,
  "Furto de Veículo": ShieldCheck,
  "Roubo de Veículo": ShieldCheck,
};

const INDICATOR_COLORS: Record<string, string> = {
  "Homicídio Doloso": "text-destructive",
  "Latrocínio": "text-destructive",
  "Estupro": "text-orange-500",
  "Lesão Corporal Seguida de Morte": "text-destructive",
  "Furto de Veículo": "text-primary",
  "Roubo de Veículo": "text-primary",
  "Roubo a Instituição Financeira": "text-accent",
  "Roubo de Carga": "text-accent",
};

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(var(--destructive))",
  "#f59e0b",
  "#10b981",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
];

function OverviewCards({ data, ano }: { data: SegurancaIndicador[]; ano: number }) {
  const source = data.filter(d => d.municipio === "Morrinhos" && d.ano === ano);
  
  if (!source.length) {
    return (
      <div className="stat-card flex flex-col items-center justify-center py-12 text-center">
        <div className="p-4 rounded-2xl bg-muted mb-4">
          <Info className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="font-semibold text-foreground mb-1">Sem dados para {ano}</h3>
        <p className="text-sm text-muted-foreground max-w-md">
          Os dados municipais do SINESP para este ano ainda não estão disponíveis.
        </p>
      </div>
    );
  }

  const totalOcorrencias = source.reduce((sum, d) => sum + (d.ocorrencias || 0), 0);
  const homicidios = source.find(d => d.indicador === "Homicídio Doloso");
  const latrocinios = source.find(d => d.indicador === "Latrocínio");
  const estupros = source.find(d => d.indicador === "Estupro");

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="stat-card text-center">
        <ShieldAlert className="w-6 h-6 text-destructive mx-auto mb-2" />
        <p className="text-2xl font-bold text-foreground">{formatNumber(homicidios?.ocorrencias ?? null)}</p>
        <p className="text-xs text-muted-foreground">Homicídios dolosos</p>
        <p className="text-[10px] text-muted-foreground mt-1">{ano}</p>
      </div>
      <div className="stat-card text-center">
        <AlertTriangle className="w-6 h-6 text-orange-500 mx-auto mb-2" />
        <p className="text-2xl font-bold text-foreground">{formatNumber(estupros?.ocorrencias ?? null)}</p>
        <p className="text-xs text-muted-foreground">Estupros</p>
        <p className="text-[10px] text-muted-foreground mt-1">{ano}</p>
      </div>
      <div className="stat-card text-center">
        <Scale className="w-6 h-6 text-primary mx-auto mb-2" />
        <p className="text-2xl font-bold text-foreground">{formatNumber(latrocinios?.ocorrencias ?? 0)}</p>
        <p className="text-xs text-muted-foreground">Latrocínios</p>
        <p className="text-[10px] text-muted-foreground mt-1">{ano}</p>
      </div>
      <div className="stat-card text-center">
        <ShieldCheck className="w-6 h-6 text-green-600 mx-auto mb-2" />
        <p className="text-2xl font-bold text-foreground">{formatNumber(totalOcorrencias)}</p>
        <p className="text-xs text-muted-foreground">Ocorrências totais</p>
        <p className="text-[10px] text-muted-foreground mt-1">{ano}</p>
      </div>
    </div>
  );
}

function IndicatorTable({ data, ano }: { data: SegurancaIndicador[]; ano: number }) {
  const source = data.filter(d => d.municipio === "Morrinhos" && d.ano === ano);
  const prevYear = data.filter(d => d.municipio === "Morrinhos" && d.ano === ano - 1);

  if (!source.length) return null;

  return (
    <div className="stat-card overflow-x-auto">
      <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-primary" />
        Indicadores Criminais — Morrinhos {ano}
      </h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-2 text-muted-foreground font-medium">Indicador</th>
            <th className="text-right py-2 text-muted-foreground font-medium">Ocorrências</th>
            <th className="text-right py-2 text-muted-foreground font-medium">Vítimas</th>
            <th className="text-right py-2 text-muted-foreground font-medium">Variação</th>
          </tr>
        </thead>
        <tbody>
          {source.map((ind) => {
            const prev = prevYear.find(p => p.indicador === ind.indicador);
            const prevVal = prev?.ocorrencias ?? prev?.vitimas;
            const currVal = ind.ocorrencias ?? ind.vitimas;
            let variacao: number | null = null;
            if (prevVal && prevVal > 0 && currVal != null) {
              variacao = ((currVal - prevVal) / prevVal) * 100;
            }
            const colorClass = INDICATOR_COLORS[ind.indicador] || "text-foreground";
            const Icon = INDICATOR_ICONS[ind.indicador] || ShieldCheck;

            return (
              <tr key={ind.id} className="border-b border-border/50 last:border-0">
                <td className="py-2.5">
                  <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${colorClass} flex-shrink-0`} />
                    <span className="text-foreground">{ind.indicador}</span>
                  </div>
                </td>
                <td className="text-right py-2.5 font-medium text-foreground">
                  {formatNumber(ind.ocorrencias)}
                </td>
                <td className="text-right py-2.5 font-medium text-foreground">
                  {formatNumber(ind.vitimas)}
                </td>
                <td className="text-right py-2.5">
                  {variacao != null ? (
                    <span className={`inline-flex items-center gap-1 text-xs font-medium ${variacao > 0 ? "text-destructive" : variacao < 0 ? "text-green-600" : "text-muted-foreground"}`}>
                      {variacao > 0 ? <TrendingUp className="w-3 h-3" /> : variacao < 0 ? <TrendingDown className="w-3 h-3" /> : null}
                      {variacao > 0 ? "+" : ""}{variacao.toFixed(0)}%
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}


function HistoricalChart({ data }: { data: SegurancaIndicador[] }) {
  const morrinhos = data.filter(d => d.municipio === "Morrinhos");
  if (!morrinhos.length) return null;

  // Get unique years and indicators
  const years = [...new Set(morrinhos.map(d => d.ano))].sort();
  const indicators = [...new Set(morrinhos.map(d => d.indicador))].sort();

  // Build chart data: { ano, indicator1: value, indicator2: value, ... }
  const chartData = years.map(ano => {
    const row: Record<string, any> = { ano };
    for (const ind of indicators) {
      const record = morrinhos.find(d => d.ano === ano && d.indicador === ind);
      row[ind] = record?.ocorrencias ?? record?.vitimas ?? 0;
    }
    return row;
  });

  // Only show main indicators
  const mainIndicators = indicators.filter(i =>
    ["Homicídio Doloso", "Estupro", "Furto de Veículo", "Roubo de Veículo"].includes(i)
  );

  if (!mainIndicators.length) return null;

  return (
    <div className="stat-card">
      <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-primary" />
        Evolução Histórica
      </h3>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis dataKey="ano" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "12px",
              }}
            />
            <Legend wrapperStyle={{ fontSize: "11px" }} />
            {mainIndicators.map((ind, i) => (
              <Line
                key={ind}
                type="monotone"
                dataKey={ind}
                stroke={CHART_COLORS[i % CHART_COLORS.length]}
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function ComparisonChart({ data, ano }: { data: SegurancaIndicador[]; ano: number }) {
  const yearData = data.filter(d => d.ano === ano);
  const municipalities = [...new Set(yearData.map(d => d.municipio))];
  
  if (municipalities.length < 2) return null;

  // Build comparison for homicídio doloso
  const indicator = "Homicídio Doloso";
  const chartData = municipalities.map(mun => {
    const record = yearData.find(d => d.municipio === mun && d.indicador === indicator);
    return {
      municipio: mun,
      ocorrencias: record?.ocorrencias ?? 0,
      vitimas: record?.vitimas ?? 0,
    };
  }).sort((a, b) => (b.ocorrencias || 0) - (a.ocorrencias || 0));

  if (!chartData.some(d => d.ocorrencias > 0 || d.vitimas > 0)) return null;

  return (
    <div className="stat-card">
      <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-primary" />
        Comparativo Regional — {indicator} ({ano})
      </h3>
      <div className="h-60">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis dataKey="municipio" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "12px",
              }}
            />
            <Bar dataKey="ocorrencias" name="Ocorrências" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            <Bar dataKey="vitimas" name="Vítimas" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function EmergencyNumbers() {
  const numbers = [
    { name: "Polícia Militar", number: "190", desc: "Emergências e crimes em andamento", whatsapp: null },
    { name: "PM Morrinhos (WhatsApp)", number: "(64) 99971-9063", desc: "Contato direto com a PM local", whatsapp: "5564999719063" },
    { name: "Bombeiros Morrinhos", number: "(62) 98494-0249", desc: "WhatsApp direto", whatsapp: "5562984940249" },
    { name: "SAMU", number: "192", desc: "Emergências médicas", whatsapp: null },
    { name: "Polícia Civil", number: "197", desc: "Denúncias e registros de ocorrência", whatsapp: null },
    { name: "Delegacia de Morrinhos", number: "(64) 3405-1275", desc: "Delegacia Regional", whatsapp: null },
    { name: "Disque Denúncia", number: "181", desc: "Denúncias anônimas", whatsapp: null },
  ];

  return (
    <div className="stat-card">
      <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
        <Phone className="w-5 h-5 text-destructive" />
        Telefones de Emergência
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {numbers.map((n) => (
          <a
            key={n.number}
            href={n.whatsapp ? `https://wa.me/${n.whatsapp}` : `tel:${n.number.replace(/\D/g, "")}`}
            target={n.whatsapp ? "_blank" : undefined}
            rel={n.whatsapp ? "noopener noreferrer" : undefined}
            className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${n.whatsapp ? "bg-[#25D366]/10" : "bg-destructive/10"}`}>
              <Phone className={`w-4 h-4 ${n.whatsapp ? "text-[#25D366]" : "text-destructive"}`} />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-foreground text-sm">{n.number}</p>
              <p className="text-xs text-muted-foreground">{n.name}</p>
              <p className="text-[10px] text-muted-foreground">{n.desc}</p>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

export default function Seguranca() {
  const queryClient = useQueryClient();
  const { data: indicadores, isLoading } = useQuery({
    queryKey: ["seguranca-indicadores"],
    queryFn: fetchSegurancaIndicadores,
  });

  const years = indicadores
    ? [...new Set(indicadores.map(d => d.ano))].sort((a, b) => b - a)
    : [];
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const ano = selectedYear ?? (years[0] || new Date().getFullYear());
  const anos_atraso = new Date().getFullYear() - ano;

  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["seguranca-indicadores"] });
  }, [queryClient]);

  return (
    <Layout>
      <SEO
        title="Segurança Pública de Morrinhos GO"
        description="Morrinhos GO — Segurança pública: ocorrências criminais, homicídios, furtos, roubos e indicadores do SINESP. Dados oficiais."
        path="/seguranca"
      />
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="container py-8 space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground mb-1">Segurança Pública</h1>
              <p className="text-sm text-muted-foreground">
                Indicadores criminais de Morrinhos — dados oficiais do SINESP/MJ.
              </p>
            </div>
            {years.length > 0 && (
              <Select value={String(ano)} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Data freshness alert */}
          {!isLoading && anos_atraso > 1 && (
            <div className="rounded-lg bg-warning/10 border border-warning/20 p-3 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-warning">Dados de {ano}</p>
                <p className="text-xs text-foreground">
                  O SINESP (Ministério da Justiça) publica dados municipais com atraso de 1 a 2 anos. Os dados mais recentes disponíveis para Morrinhos são de {ano}.
                </p>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="stat-card animate-pulse h-28" />
              ))}
            </div>
          ) : (
            <>
              <OverviewCards data={indicadores || []} ano={ano} />
              <IndicatorTable data={indicadores || []} ano={ano} />
              

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <HistoricalChart data={indicadores || []} />
                <ComparisonChart data={indicadores || []} ano={ano} />
              </div>

              <EmergencyNumbers />

              {/* Methodology note */}
              <div className="stat-card bg-muted/30">
                <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                  <Info className="w-4 h-4 text-muted-foreground" />
                  Sobre os dados
                </h3>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>
                    <strong>Dados municipais (2018–2023):</strong> extraídos do <strong>SINESP</strong> (Sistema Nacional de Informações de Segurança Pública),
                    mantido pelo Ministério da Justiça. Os dados municipais mais recentes disponíveis são de 2023.
                  </p>
                  <p>
                    As categorias incluem: homicídio doloso, latrocínio, estupro, furtos e roubos de veículos, 
                    roubos a instituições financeiras e de carga.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3 mt-3">
                  <a href="https://dados.mj.gov.br/dataset/sistema-nacional-de-estatisticas-de-seguranca-publica"
                    target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                    <ExternalLink className="w-3 h-3" /> SINESP — Dados Abertos (MJ)
                  </a>
                  <a href="https://goias.gov.br/seguranca/estatisticas/"
                    target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                    <ExternalLink className="w-3 h-3" /> SSP Goiás — Estatísticas
                  </a>
                </div>
              </div>
            </>
          )}
        </div>
      </PullToRefresh>
    </Layout>
  );
}

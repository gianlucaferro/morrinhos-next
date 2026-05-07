/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any, react-hooks/preserve-manual-memoization, react/no-unescaped-entities */
"use client";

import Layout from "@/components/Layout";
import SEO from "@/components/SEO";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  ExternalLink, Download, TrendingUp, TrendingDown,
  Info, BarChart3, Link2, FileText, DollarSign, Building2,
  Car, Receipt, Landmark, Calculator, HelpCircle, AlertTriangle,
  Calendar, Users, Sparkles, Loader2, ChevronDown,
} from "lucide-react";
import { fetchArrecadacao, fetchArrecadacaoLog, fetchArrecadacaoComparativo, type ArrecadacaoMunicipal, type ArrecadacaoComparativo } from "@/data/arrecadacaoApi";
import { useState, useMemo, useCallback } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Legend, PieChart, Pie, Cell, ComposedChart,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const POPULACAO_IBGE = 25_373; // IBGE Estimativa 2025

const CATEGORIA_LABELS: Record<string, string> = {
  "IPTU": "IPTU",
  "ISSQN": "ISSQN (ISS)",
  "ITBI": "ITBI",
  "IRRF": "IRRF",
  "Taxas": "Taxas",
  "Contribuições": "Contribuições",
  "Tarifas": "Tarifas",
  "Outras": "Outras receitas",
  "Cota-parte IPVA": "Cota-parte IPVA",
  "Cota-parte ICMS": "Cota-parte ICMS",
  "FPM": "FPM",
  "Cota-parte ITR": "Cota-parte ITR",
  "FUNDEB": "FUNDEB",
};

const CATEGORIA_ICONS: Record<string, any> = {
  "IPTU": Building2,
  "ISSQN": Receipt,
  "ITBI": Landmark,
  "IRRF": Calculator,
  "Taxas": FileText,
  "Contribuições": DollarSign,
  "Cota-parte IPVA": Car,
  "FPM": Landmark,
  "Cota-parte ITR": FileText,
  "FUNDEB": Building2,
};

const PIE_COLORS = [
  "hsl(220, 60%, 50%)", "hsl(152, 55%, 45%)", "hsl(25, 90%, 55%)",
  "hsl(280, 50%, 55%)", "hsl(45, 80%, 50%)", "hsl(340, 60%, 50%)",
  "hsl(180, 50%, 45%)", "hsl(0, 60%, 50%)",
];

function formatCurrency(v: number | null) {
  if (v == null) return "Não disponível";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatCompact(v: number | null) {
  if (v == null) return "N/D";
  if (Math.abs(v) >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}k`;
  return formatCurrency(v);
}

function formatNumber(v: number | null) {
  if (v == null) return "N/D";
  return v.toLocaleString("pt-BR");
}

// ========== CARDS DE RESUMO ==========
function CardsResumo({ dados, anoSelecionado }: { dados: ArrecadacaoMunicipal[]; anoSelecionado: number }) {
  const dadosAno = useMemo(() => dados.filter(d => d.ano === anoSelecionado), [dados, anoSelecionado]);
  const dadosAnoAnterior = useMemo(() => dados.filter(d => d.ano === anoSelecionado - 1), [dados, anoSelecionado]);

  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [resumos, setResumos] = useState<Record<string, string>>({});
  const [loadingResumo, setLoadingResumo] = useState<string | null>(null);

  function totalPorCategoria(items: ArrecadacaoMunicipal[], cat: string): number {
    return items.filter(d => d.categoria === cat).reduce((s, d) => s + (d.valor || 0), 0);
  }

  function totalPorTipo(items: ArrecadacaoMunicipal[], tipo: string): number {
    return items.filter(d => d.tipo === tipo).reduce((s, d) => s + (d.valor || 0), 0);
  }

  const receitaPropria = totalPorTipo(dadosAno, "receita_propria");
  const receitaPropriaAnterior = totalPorTipo(dadosAnoAnterior, "receita_propria");

  const repasses = dadosAno.filter(d => d.tipo !== "receita_propria").reduce((s, d) => s + (d.valor || 0), 0);
  const repassesAnterior = dadosAnoAnterior.filter(d => d.tipo !== "receita_propria").reduce((s, d) => s + (d.valor || 0), 0);

  const receitaTotal = receitaPropria + repasses;
  const receitaTotalAnterior = receitaPropriaAnterior + repassesAnterior;

  const categorias = [
    { key: "IPTU", icon: Building2 },
    { key: "ISSQN", icon: Receipt },
    { key: "ITBI", icon: Landmark },
    { key: "IRRF", icon: Calculator },
    { key: "Taxas", icon: FileText },
    { key: "Contribuições", icon: DollarSign },
    { key: "Cota-parte IPVA", icon: Car },
    { key: "Cota-parte ICMS", icon: Landmark },
    { key: "FPM", icon: Landmark },
    { key: "Cota-parte ITR", icon: FileText },
    { key: "FUNDEB", icon: Building2 },
  ];

  function variacao(atual: number, anterior: number): { pct: number; label: string } | null {
    if (anterior === 0) return null;
    const pct = ((atual - anterior) / anterior) * 100;
    return { pct, label: `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%` };
  }

  const cards = [
    {
      label: "Receita Total",
      valor: receitaTotal,
      anterior: receitaTotalAnterior,
      icon: Landmark,
    },
    {
      label: "Arrecadação Própria Total",
      valor: receitaPropria,
      anterior: receitaPropriaAnterior,
      icon: DollarSign,
    },
    ...categorias.map(c => ({
      label: CATEGORIA_LABELS[c.key] || c.key,
      valor: totalPorCategoria(dadosAno, c.key),
      anterior: totalPorCategoria(dadosAnoAnterior, c.key),
      icon: c.icon,
    })),
  ];

  const fonte = dadosAno[0];

  const handleCardClick = useCallback(async (label: string, valor: number, anterior: number) => {
    if (expandedCard === label) {
      setExpandedCard(null);
      return;
    }
    setExpandedCard(label);

    if (resumos[label]) return; // already loaded

    setLoadingResumo(label);
    try {
      const perCapita = valor > 0 ? valor / POPULACAO_IBGE : undefined;
      const { data, error } = await supabase.functions.invoke("summarize-imposto", {
        body: {
          categoria: label,
          valorAtual: valor,
          valorAnterior: anterior,
          anoAtual: anoSelecionado,
          perCapita,
        },
      });
      if (error) throw error;
      setResumos(prev => ({ ...prev, [label]: data.resumo }));
    } catch (e) {
      console.error("Erro ao gerar resumo:", e);
      toast.error("Não foi possível gerar o resumo. Tente novamente.");
      setExpandedCard(null);
    } finally {
      setLoadingResumo(null);
    }
  }, [expandedCard, resumos, anoSelecionado]);

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <BarChart3 className="w-4 h-4 text-primary" />
        Resumo — {anoSelecionado}
        <span className="text-[10px] font-normal text-muted-foreground ml-1 flex items-center gap-0.5">
          <Sparkles className="w-3 h-3" /> Clique no card para resumo IA
        </span>
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map(c => {
          const Icon = c.icon;
          const v = variacao(c.valor, c.anterior);
          const isExpanded = expandedCard === c.label;
          const isLoading = loadingResumo === c.label;
          return (
            <Card
              key={c.label}
              className={`relative overflow-hidden cursor-pointer transition-all hover:ring-1 hover:ring-primary/30 ${isExpanded ? "ring-1 ring-primary/50" : ""}`}
              onClick={() => handleCardClick(c.label, c.valor, c.anterior)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground mb-1">{c.label}</p>
                    <p className="text-xl font-bold text-foreground">
                      {c.valor > 0 ? formatCompact(c.valor) : <span className="text-muted-foreground text-sm">Não disponível</span>}
                    </p>
                    {v && c.valor > 0 && (
                      <div className={`flex items-center gap-1 mt-1 text-xs ${v.pct >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                        {v.pct >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        <span>{v.label} vs {anoSelecionado - 1}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <ChevronDown className={`w-3 h-3 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                  </div>
                </div>

                {/* AI Summary expanded area */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-border">
                    {isLoading ? (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                        <span>Gerando resumo com IA...</span>
                      </div>
                    ) : resumos[c.label] ? (
                      <div className="space-y-1.5">
                        <p className="text-[10px] font-medium text-primary flex items-center gap-1">
                          <Sparkles className="w-3 h-3" /> Resumo IA
                        </p>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {resumos[c.label]}
                        </p>
                      </div>
                    ) : null}
                  </div>
                )}

                {fonte?.fonte_url && (
                  <p className="text-[10px] text-muted-foreground mt-2">
                    <a href={fonte.fonte_url} target="_blank" rel="noopener noreferrer" className="hover:underline inline-flex items-center gap-0.5" onClick={e => e.stopPropagation()}>
                      Fonte oficial <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ========== GRÁFICOS ==========
function GraficosSection({ dados, anoSelecionado }: { dados: ArrecadacaoMunicipal[]; anoSelecionado: number }) {
  const [visao, setVisao] = useState<"total" | "anual" | "categorias">("total");

  const chartTotal = useMemo(() => {
    const anos = [...new Set(dados.map(d => d.ano))].sort();
    return anos.map(ano => {
      const items = dados.filter(d => d.ano === ano);
      const propria = items.filter(d => d.tipo === "receita_propria").reduce((s, d) => s + (d.valor || 0), 0);
      const repasses = items.filter(d => d.tipo !== "receita_propria").reduce((s, d) => s + (d.valor || 0), 0);
      return { ano: String(ano), "Receita Própria": propria, "Repasses": repasses, "Receita Total": propria + repasses };
    });
  }, [dados]);

  const chartAnual = useMemo(() => {
    const anos = [...new Set(dados.map(d => d.ano))].sort();
    return anos.map(ano => {
      const items = dados.filter(d => d.ano === ano);
      const propria = items.filter(d => d.tipo === "receita_propria").reduce((s, d) => s + (d.valor || 0), 0);
      const ipva = items.filter(d => d.categoria === "Cota-parte IPVA").reduce((s, d) => s + (d.valor || 0), 0);
      return { ano: String(ano), "Receita Própria": propria, "Cota-parte IPVA": ipva };
    });
  }, [dados]);

  const chartPie = useMemo(() => {
    const items = dados.filter(d => d.ano === anoSelecionado);
    const byCat: Record<string, number> = {};
    for (const d of items) {
      const cat = d.categoria;
      byCat[cat] = (byCat[cat] || 0) + (d.valor || 0);
    }
    return Object.entries(byCat)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({ name: CATEGORIA_LABELS[name] || name, value }))
      .sort((a, b) => b.value - a.value);
  }, [dados, anoSelecionado]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          Evolução da Arrecadação
        </h2>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setVisao("total")}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${visao === "total" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"}`}
          >
            Receita Total
          </button>
          <button
            onClick={() => setVisao("anual")}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${visao === "anual" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"}`}
          >
            Própria vs IPVA
          </button>
          <button
            onClick={() => setVisao("categorias")}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${visao === "categorias" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"}`}
          >
            Por Categoria
          </button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-4">
          {visao === "total" && chartTotal.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart data={chartTotal}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="ano" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `R$ ${(v / 1_000_000).toFixed(1)}M`} />
                <Tooltip formatter={(v: any) => formatCurrency(v)} />
                <Legend />
                <Bar dataKey="Receita Própria" stackId="total" fill="hsl(220, 60%, 50%)" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Repasses" stackId="total" fill="hsl(152, 55%, 45%)" radius={[4, 4, 0, 0]} />
                <Line type="monotone" dataKey="Receita Total" stroke="hsl(25, 90%, 55%)" strokeWidth={2} dot={{ r: 4 }} />
              </ComposedChart>
            </ResponsiveContainer>
          ) : visao === "anual" && chartAnual.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={chartAnual}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="ano" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `R$ ${(v / 1_000_000).toFixed(1)}M`} />
                <Tooltip formatter={(v: any) => formatCurrency(v)} />
                <Legend />
                <Bar dataKey="Receita Própria" fill="hsl(220, 60%, 50%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Cota-parte IPVA" fill="hsl(152, 55%, 45%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : visao === "categorias" && chartPie.length > 0 ? (
            <div className="flex flex-col md:flex-row items-center gap-4">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={chartPie}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {chartPie.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: any) => formatCurrency(v)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">Sem dados disponíveis para gráficos</p>
          )}
          <p className="text-[10px] text-muted-foreground mt-2">Fonte: Tesouro Nacional - SICONFI</p>
        </CardContent>
      </Card>
    </div>
  );
}

// ========== TABELA DETALHADA ==========
function TabelaDetalhada({ dados }: { dados: ArrecadacaoMunicipal[] }) {
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [filtroCategoria, setFiltroCategoria] = useState("todos");
  const categorias = [...new Set(dados.map(d => d.categoria))].sort();

  const filtrados = useMemo(() => {
    let result = dados;
    if (filtroTipo !== "todos") result = result.filter(d => d.tipo === filtroTipo);
    if (filtroCategoria !== "todos") result = result.filter(d => d.categoria === filtroCategoria);
    return result;
  }, [dados, filtroTipo, filtroCategoria]);

  const exportCSV = () => {
    const bom = "\uFEFF";
    const header = "Categoria;Subcategoria;Período;Ano;Valor (R$);Tipo;Fonte;Observações\n";
    const rows = filtrados.map(d =>
      `"${d.categoria}";"${d.subcategoria || ""}";"${d.competencia}";"${d.ano}";"${d.valor ?? ""}";"${d.tipo}";"${d.fonte_url || ""}";"${d.observacoes || ""}"`
    ).join("\n");
    const blob = new Blob([bom + header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `arrecadacao-morrinhos.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyLink = () => {
    const params = new URLSearchParams();
    if (filtroTipo !== "todos") params.set("tipo", filtroTipo);
    if (filtroCategoria !== "todos") params.set("categoria", filtroCategoria);
    const url = `${window.location.origin}/arrecadacao${params.toString() ? "?" + params.toString() : ""}`;
    navigator.clipboard.writeText(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" />
          Tabela Detalhada
        </h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV} className="text-xs">
            <Download className="w-3 h-3 mr-1" /> Baixar CSV
          </Button>
          <Button variant="outline" size="sm" onClick={copyLink} className="text-xs">
            <Link2 className="w-3 h-3 mr-1" /> Copiar link
          </Button>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Select value={filtroTipo} onValueChange={setFiltroTipo}>
          <SelectTrigger className="w-[180px] h-9 text-xs">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os tipos</SelectItem>
            <SelectItem value="receita_propria">Receita própria</SelectItem>
            <SelectItem value="repasse_ipva">Repasse IPVA</SelectItem>
            <SelectItem value="outro_repasse">Outros repasses</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
          <SelectTrigger className="w-[180px] h-9 text-xs">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas as categorias</SelectItem>
            {categorias.map(c => (
              <SelectItem key={c} value={c}>{CATEGORIA_LABELS[c] || c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Categoria</TableHead>
                <TableHead className="text-xs">Subcategoria</TableHead>
                <TableHead className="text-xs">Período</TableHead>
                <TableHead className="text-xs text-right">Valor (R$)</TableHead>
                <TableHead className="text-xs">Tipo</TableHead>
                <TableHead className="text-xs">Fonte</TableHead>
                <TableHead className="text-xs">Obs.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtrados.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">
                    Nenhum dado disponível
                  </TableCell>
                </TableRow>
              ) : (
                filtrados.slice(0, 100).map(d => (
                  <TableRow key={d.id}>
                    <TableCell className="text-xs font-medium">{CATEGORIA_LABELS[d.categoria] || d.categoria}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{d.subcategoria || "—"}</TableCell>
                    <TableCell className="text-xs">{d.ano}</TableCell>
                    <TableCell className="text-xs text-right font-medium">
                      {d.valor != null ? formatCurrency(d.valor) : <span className="text-muted-foreground">N/D</span>}
                    </TableCell>
                    <TableCell className="text-xs">
                      <Badge variant="secondary" className="text-[9px]">
                        {d.tipo === "receita_propria" ? "Própria" : d.tipo === "repasse_ipva" ? "IPVA" : "Repasse"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      {d.fonte_url ? (
                        <a href={d.fonte_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-0.5">
                          Fonte <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      ) : d.fonte_nome}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate">
                      {d.observacoes || "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      {filtrados.length > 100 && (
        <p className="text-xs text-muted-foreground text-center">Mostrando 100 de {filtrados.length} registros. Use o CSV para dados completos.</p>
      )}
    </div>
  );
}

// ========== SEÇÃO IPVA ==========
function SecaoIPVA({ dados }: { dados: ArrecadacaoMunicipal[] }) {
  const ipvaData = useMemo(() => {
    return dados
      .filter(d => d.categoria === "Cota-parte IPVA")
      .sort((a, b) => a.ano - b.ano);
  }, [dados]);

  const chartData = ipvaData.map(d => ({
    ano: String(d.ano),
    valor: d.valor || 0,
  }));

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <Car className="w-4 h-4 text-primary" />
        Cota-parte do IPVA para Morrinhos
      </h2>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="bg-secondary/50 rounded-lg p-3 text-xs text-muted-foreground space-y-2">
            <p className="font-medium text-foreground flex items-center gap-1">
              <Info className="w-3.5 h-3.5 text-primary" /> O que é a cota-parte do IPVA?
            </p>
            <p>
              O IPVA (Imposto sobre a Propriedade de Veículos Automotores) é um tributo estadual. 
              Por lei, <strong>50% do valor arrecadado</strong> pelo estado é repassado ao município onde o veículo foi registrado (emplacado).
            </p>
            <p>
              O valor exibido aqui é o <strong>repasse oficial</strong> realizado pelo Estado de Goiás ao município de Morrinhos, 
              conforme declarado nos demonstrativos contábeis enviados ao Tesouro Nacional (SICONFI).
            </p>
            <p className="text-destructive flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> 
              Este valor <strong>não é calculado</strong> a partir da frota. É o dado oficial de repasse.
            </p>
          </div>

          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="ano" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `R$ ${(v / 1_000).toFixed(0)}k`} />
                <Tooltip formatter={(v: any) => formatCurrency(v)} />
                <Bar dataKey="valor" fill="hsl(152, 55%, 45%)" radius={[4, 4, 0, 0]} name="Cota-parte IPVA" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">Dados de repasse IPVA ainda não disponíveis</p>
          )}

          {ipvaData.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Ano</TableHead>
                  <TableHead className="text-xs text-right">Valor Repassado</TableHead>
                  <TableHead className="text-xs">Fonte</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ipvaData.map(d => (
                  <TableRow key={d.id}>
                    <TableCell className="text-xs font-medium">{d.ano}</TableCell>
                    <TableCell className="text-xs text-right font-medium">{formatCurrency(d.valor)}</TableCell>
                    <TableCell className="text-xs">
                      {d.fonte_url ? (
                        <a href={d.fonte_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-0.5">
                          Fonte oficial <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      ) : d.fonte_nome}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          <p className="text-[10px] text-muted-foreground">
            Fonte principal: <a href="https://goias.gov.br/economia/repasse-aos-municipios/" target="_blank" rel="noopener noreferrer" className="hover:underline">
              Secretaria da Economia de Goiás — Repasse aos Municípios <ExternalLink className="w-2.5 h-2.5 inline" />
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// ========== INDICADORES PER CAPITA ==========
function IndicadoresPerCapita({ dados }: { dados: ArrecadacaoMunicipal[] }) {
  const latestAno = Math.max(...dados.map(d => d.ano), 0);
  const dadosAno = dados.filter(d => d.ano === latestAno);

  const receitaPropria = dadosAno.filter(d => d.tipo === "receita_propria").reduce((s, d) => s + (d.valor || 0), 0);
  const iptu = dadosAno.filter(d => d.categoria === "IPTU").reduce((s, d) => s + (d.valor || 0), 0);
  const iss = dadosAno.filter(d => d.categoria === "ISSQN").reduce((s, d) => s + (d.valor || 0), 0);

  const perCapita = receitaPropria > 0 ? receitaPropria / POPULACAO_IBGE : null;
  const iptuPc = iptu > 0 ? iptu / POPULACAO_IBGE : null;
  const issPc = iss > 0 ? iss / POPULACAO_IBGE : null;

  if (receitaPropria === 0) return null;

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <Users className="w-4 h-4 text-primary" />
        Indicadores por Habitante — {latestAno}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Arrecadação própria per capita</p>
            <p className="text-2xl font-bold text-foreground">{perCapita ? formatCurrency(perCapita) : "N/D"}</p>
            <p className="text-[10px] text-muted-foreground mt-1">/habitante</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">IPTU per capita</p>
            <p className="text-2xl font-bold text-foreground">{iptuPc ? formatCurrency(iptuPc) : "N/D"}</p>
            <p className="text-[10px] text-muted-foreground mt-1">/habitante</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">ISS per capita</p>
            <p className="text-2xl font-bold text-foreground">{issPc ? formatCurrency(issPc) : "N/D"}</p>
            <p className="text-[10px] text-muted-foreground mt-1">/habitante</p>
          </CardContent>
        </Card>
      </div>
      <p className="text-[10px] text-muted-foreground">
        Fórmula: valor arrecadado ÷ população ({formatNumber(POPULACAO_IBGE)} hab. — IBGE Estimativa 2025). 
        <a href="https://ftp.ibge.gov.br/Estimativas_de_Populacao/Estimativas_2025/estimativa_dou_2025.pdf" target="_blank" rel="noopener noreferrer" className="hover:underline ml-1">
          Fonte IBGE <ExternalLink className="w-2.5 h-2.5 inline" />
        </a>
      </p>
    </div>
  );
}

// ========== COMPARATIVO PER CAPITA ==========
function ComparativoPerCapita({ comparativo }: { comparativo: ArrecadacaoComparativo[] }) {
  const [anoComp, setAnoComp] = useState<number>(0);
  const anos = [...new Set(comparativo.map(c => c.ano))].sort((a, b) => b - a);
  const anoAtivo = anoComp || anos[0] || 0;

  const dadosAno = useMemo(() =>
    comparativo.filter(c => c.ano === anoAtivo && c.categoria !== "receita_propria_total"),
    [comparativo, anoAtivo]
  );

  const totalAno = useMemo(() =>
    comparativo.find(c => c.ano === anoAtivo && c.categoria === "receita_propria_total"),
    [comparativo, anoAtivo]
  );

  const chartData = useMemo(() =>
    dadosAno
      .filter(d => (d.morrinhos_per_capita || 0) > 0 || (d.media_go_per_capita || 0) > 0)
      .map(d => ({
        name: CATEGORIA_LABELS[d.categoria] || d.categoria,
        Morrinhos: d.morrinhos_per_capita || 0,
        "Média GO (mesmo porte)": d.media_go_per_capita || 0,
      })),
    [dadosAno]
  );

  // Evolution chart: total per capita over years
  const evolucaoData = useMemo(() =>
    comparativo
      .filter(c => c.categoria === "receita_propria_total")
      .sort((a, b) => a.ano - b.ano)
      .map(c => ({
        ano: String(c.ano),
        Morrinhos: c.morrinhos_per_capita || 0,
        "Média GO": c.media_go_per_capita || 0,
      })),
    [comparativo]
  );

  if (comparativo.length === 0) return null;

  const amostraNomes = dadosAno[0]?.municipios_nomes || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-primary" />
          Comparativo Per Capita — Municípios GO de Mesmo Porte
        </h2>
        {anos.length > 1 && (
          <Select value={String(anoAtivo)} onValueChange={v => setAnoComp(Number(v))}>
            <SelectTrigger className="w-[100px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {anos.map(a => (
                <SelectItem key={a} value={String(a)}>{a}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Summary card */}
      {totalAno && (
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Morrinhos — Per capita</p>
                <p className="text-2xl font-bold text-foreground">
                  {totalAno.morrinhos_per_capita ? formatCurrency(totalAno.morrinhos_per_capita) : "N/D"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Média GO (mesmo porte)</p>
                <p className="text-2xl font-bold text-foreground">
                  {totalAno.media_go_per_capita ? formatCurrency(totalAno.media_go_per_capita) : "N/D"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Diferença</p>
                {totalAno.morrinhos_per_capita && totalAno.media_go_per_capita ? (() => {
                  const diff = ((totalAno.morrinhos_per_capita - totalAno.media_go_per_capita) / totalAno.media_go_per_capita) * 100;
                  return (
                    <div className={`flex items-center gap-1 ${diff >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                      {diff >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                      <p className="text-2xl font-bold">{diff >= 0 ? "+" : ""}{diff.toFixed(1)}%</p>
                    </div>
                  );
                })() : <p className="text-lg text-muted-foreground">N/D</p>}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bar chart comparison */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Arrecadação per capita por tributo — {anoAtivo}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData} layout="vertical" margin={{ left: 60 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => `R$ ${v.toFixed(0)}`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={70} />
                <Tooltip formatter={(v: any) => formatCurrency(v)} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Morrinhos" fill="hsl(220, 60%, 50%)" radius={[0, 4, 4, 0]} />
                <Bar dataKey="Média GO (mesmo porte)" fill="hsl(25, 80%, 55%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Evolution chart */}
      {evolucaoData.length > 1 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Evolução da arrecadação própria per capita
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={evolucaoData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="ano" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `R$ ${v.toFixed(0)}`} />
                <Tooltip formatter={(v: any) => formatCurrency(v)} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="Morrinhos" stroke="hsl(220, 60%, 50%)" strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="Média GO" stroke="hsl(25, 80%, 55%)" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Methodology note */}
      <div className="bg-secondary/50 rounded-lg p-3 text-[10px] text-muted-foreground space-y-1">
        <p className="font-medium text-foreground text-xs flex items-center gap-1">
          <Info className="w-3 h-3 text-primary" /> Metodologia do comparativo
        </p>
        <p>
          Amostra de <strong>{amostraNomes.length}</strong> municípios goianos com população entre 15 mil e 35 mil habitantes (mesmo porte de Morrinhos):
          {" "}{amostraNomes.join(", ")}.
        </p>
        <p>
          Dados extraídos do <strong>DCA — Anexo I-C</strong> (Declaração de Contas Anuais) enviado ao Tesouro Nacional via SICONFI.
          Valores per capita calculados com a população informada no próprio DCA de cada município.
        </p>
        <p>
          <a href="https://siconfi.tesouro.gov.br/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-0.5">
            Fonte: SICONFI — Tesouro Nacional <ExternalLink className="w-2.5 h-2.5" />
          </a>
        </p>
      </div>
    </div>
  );
}

// ========== METODOLOGIA ==========
function MetodologiaSection() {
  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <Info className="w-4 h-4 text-primary" />
        Metodologia e Transparência
      </h2>
      <Card>
        <CardContent className="p-4 text-xs text-muted-foreground space-y-3">
          <div>
            <p className="font-medium text-foreground mb-1">Fontes oficiais utilizadas</p>
            <ul className="space-y-1 list-disc list-inside">
              <li>
                <a href="https://siconfi.tesouro.gov.br/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  SICONFI — Tesouro Nacional <ExternalLink className="w-2.5 h-2.5 inline" />
                </a>
                {" "}— Demonstrativos contábeis (DCA e RREO) enviados pelo município
              </li>
              <li>
                <a href="https://goias.gov.br/economia/repasse-aos-municipios/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  Secretaria da Economia de Goiás <ExternalLink className="w-2.5 h-2.5 inline" />
                </a>
                {" "}— Repasses de IPVA e ICMS aos municípios
              </li>
              <li>
                <a href="https://cidades.ibge.gov.br/brasil/go/morrinhos/panorama" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  IBGE Cidades <ExternalLink className="w-2.5 h-2.5 inline" />
                </a>
                {" "}— População para cálculo per capita
              </li>
            </ul>
          </div>

          <div>
            <p className="font-medium text-foreground mb-1">O que é "arrecadação própria"?</p>
            <p>Soma dos tributos municipais: IPTU, ISSQN (ISS), ITBI, IRRF retido, taxas, contribuições (como COSIP) e tarifas. Não inclui transferências de outras esferas (FPM, ICMS, IPVA).</p>
          </div>

          <div>
            <p className="font-medium text-foreground mb-1">Periodicidade de atualização</p>
            <p>Os dados do SICONFI são atualizados anualmente, conforme as declarações contábeis do município. A coleta automática é realizada mensalmente no dia 5.</p>
          </div>

          <div>
            <p className="font-medium text-foreground mb-1">Limitações</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>A granularidade é anual (SICONFI não publica dados mensais de receita por município)</li>
              <li>Quando o município não enviou a declaração ao Tesouro, o dado aparece como "Não disponível"</li>
              <li>Mudanças na classificação orçamentária entre exercícios podem afetar comparações históricas</li>
              <li>Valores nominais (não ajustados pela inflação)</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ========== PÁGINA PRINCIPAL ==========
export default function Arrecadacao() {
  const { data: dados = [], isLoading, error } = useQuery({
    queryKey: ["arrecadacao"],
    queryFn: fetchArrecadacao,
    staleTime: 1000 * 60 * 30,
  });

  const { data: comparativo = [] } = useQuery({
    queryKey: ["arrecadacao-comparativo"],
    queryFn: fetchArrecadacaoComparativo,
    staleTime: 1000 * 60 * 60,
  });

  const anos = [...new Set(dados.map(d => d.ano))].sort((a, b) => b - a);
  const [anoSelecionado, setAnoSelecionado] = useState<number>(0);
  const anoAtivo = anoSelecionado || anos[0] || new Date().getFullYear();

  const ultimaAtualizacao = dados.length > 0
    ? new Date(Math.max(...dados.map(d => new Date(d.updated_at).getTime()))).toLocaleDateString("pt-BR")
    : null;

  return (
    <Layout>
      <SEO
        title="Impostos e Arrecadação de Morrinhos GO"
        description="Morrinhos GO — Arrecadação municipal: IPTU, ISS, ITBI, FPM, ICMS e receitas. Comparativo com municípios de Goiás. Dados do Tesouro Nacional."
        path="/arrecadacao"
      />
      <div className="container py-6 space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <DollarSign className="w-6 h-6 text-primary" />
                Impostos em Morrinhos
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Receitas municipais e repasses, com dados oficiais e links diretos.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {anos.length > 0 && (
                <Select value={String(anoAtivo)} onValueChange={v => setAnoSelecionado(Number(v))}>
                  <SelectTrigger className="w-[120px] h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {anos.map(a => (
                      <SelectItem key={a} value={String(a)}>{a}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {ultimaAtualizacao && (
                <Badge variant="outline" className="text-[9px]">
                  <Calendar className="w-2.5 h-2.5 mr-1" />
                  Atualizado: {ultimaAtualizacao}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Loading / Error states */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        )}

        {error && (
          <Card>
            <CardContent className="p-6 text-center">
              <AlertTriangle className="w-8 h-8 text-destructive mx-auto mb-2" />
              <p className="text-sm text-destructive">Erro ao carregar dados de arrecadação</p>
              <p className="text-xs text-muted-foreground mt-1">Tente novamente mais tarde</p>
            </CardContent>
          </Card>
        )}

        {!isLoading && !error && dados.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <HelpCircle className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground">Dados de arrecadação ainda não disponíveis</p>
              <p className="text-xs text-muted-foreground mt-1">
                Os dados serão carregados automaticamente a partir do Tesouro Nacional (SICONFI).
              </p>
            </CardContent>
          </Card>
        )}

        {!isLoading && !error && dados.length > 0 && (
          <>
            <CardsResumo dados={dados} anoSelecionado={anoAtivo} />
            <GraficosSection dados={dados} anoSelecionado={anoAtivo} />
            <TabelaDetalhada dados={dados} />
            <SecaoIPVA dados={dados} />
            <IndicadoresPerCapita dados={dados} />
            <ComparativoPerCapita comparativo={comparativo} />
          </>
        )}

        {/* Metodologia always visible */}
        <MetodologiaSection />
      </div>
    </Layout>
  );
}

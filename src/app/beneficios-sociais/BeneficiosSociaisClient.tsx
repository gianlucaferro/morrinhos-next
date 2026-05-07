/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps */
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
  Heart, Users, DollarSign, ExternalLink, Download, TrendingUp,
  Info, AlertTriangle, BarChart3, Link2, Flame, Zap, HelpCircle,
  Calendar, FileText, Lightbulb, Phone, Share2, MapPin, ClipboardList,
} from "lucide-react";
import { fetchBeneficiosSociais, type BeneficioSocial } from "@/data/beneficiosSociaisApi";
import { fetchCdeSubsidios, type CdeSubsidio } from "@/data/cdeApi";
import { useState, useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Legend,
} from "recharts";

const PROGRAMA_LABELS: Record<string, string> = {
  "bolsa_familia": "Bolsa Família",
  "gas_do_povo": "Gás do Povo",
  "auxilio_gas": "Auxílio Gás",
  "bpc": "BPC (Benefício de Prestação Continuada)",
  "tarifa_social": "Luz Social (Tarifa Social de Energia)",
  
};

const PROGRAMA_ICONS: Record<string, any> = {
  "bolsa_familia": Heart,
  "gas_do_povo": Flame,
  "auxilio_gas": Flame,
  "bpc": Users,
  "tarifa_social": Zap,
  
};

const PROGRAMA_CORES: Record<string, string> = {
  "bolsa_familia": "hsl(220, 60%, 25%)",
  "gas_do_povo": "hsl(25, 90%, 55%)",
  "auxilio_gas": "hsl(25, 90%, 55%)",
  "bpc": "hsl(152, 55%, 38%)",
  "tarifa_social": "hsl(45, 80%, 50%)",
  
};

function formatCompetencia(c: string) {
  const [ano, mes] = c.split("-");
  const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  return `${meses[parseInt(mes) - 1]}/${ano}`;
}

function formatCurrency(v: number | null) {
  if (v == null) return "Não disponível";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatNumber(v: number | null) {
  if (v == null) return "Não disponível";
  return v.toLocaleString("pt-BR");
}

// ========== CARD INDICADOR ==========
function IndicadorCard({ icon: Icon, label, valor, sufixo, fonte, fonteUrl, cor }: {
  icon: any; label: string; valor: string | null; sufixo?: string;
  fonte?: string | null; fonteUrl?: string | null; cor?: string;
}) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground mb-1">{label}</p>
            <p className="text-2xl font-bold text-foreground">
              {valor ?? "—"}{sufixo && <span className="text-sm font-normal text-muted-foreground ml-1">{sufixo}</span>}
            </p>
          </div>
          <div className={`p-2 rounded-lg ${cor || "bg-primary/10"}`}>
            <Icon className="w-5 h-5 text-primary" />
          </div>
        </div>
        {fonte && (
          <p className="text-[10px] text-muted-foreground mt-2">
            Fonte: {fonteUrl ? (
              <a href={fonteUrl} target="_blank" rel="noopener noreferrer" className="hover:underline inline-flex items-center gap-0.5">
                {fonte} <ExternalLink className="w-2.5 h-2.5" />
              </a>
            ) : fonte}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ========== VISÃO GERAL ==========
function VisaoGeralSection({ dados }: { dados: BeneficioSocial[] }) {
  const programas = ["bolsa_familia", "bpc", "tarifa_social"];
  
  const latestByPrograma = useMemo(() => {
    const map: Record<string, BeneficioSocial> = {};
    for (const p of programas) {
      const items = dados.filter(d => d.programa === p);
      if (items.length > 0) map[p] = items[0]; // already sorted desc
    }
    return map;
  }, [dados]);

  // Gás do Povo estimate: ~85% of Bolsa Família families
  const gasDoPovoEstimativa = useMemo(() => {
    const bf = dados.find(d => d.programa === "bolsa_familia");
    if (!bf?.beneficiarios) return null;
    return {
      beneficiarios: Math.round(bf.beneficiarios * 0.85),
      competencia: bf.competencia,
    };
  }, [dados]);

  const outrosProgramas = useMemo(() => {
    const known = new Set([...programas, "gas_do_povo", "auxilio_gas"]);
    const outros: Record<string, BeneficioSocial> = {};
    for (const d of dados) {
      if (!known.has(d.programa) && !outros[d.programa]) {
        outros[d.programa] = d;
      }
    }
    return Object.values(outros);
  }, [dados]);

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <BarChart3 className="w-4 h-4 text-primary" />
        Visão Geral — Dados mais recentes
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {programas.map(p => {
          const d = latestByPrograma[p];
          const Icon = PROGRAMA_ICONS[p] || HelpCircle;
          return (
            <Card key={p} className="relative overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">{PROGRAMA_LABELS[p]}</p>
                    {d ? (
                      <Badge variant="secondary" className="text-[9px]">
                        {formatCompetencia(d.competencia)}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[9px] text-destructive">
                        Sem dados
                      </Badge>
                    )}
                  </div>
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                </div>
                {d ? (
                  <>
                    <div className="space-y-1 mt-2">
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3 h-3 text-muted-foreground" />
                        <span className="text-lg font-bold text-foreground">
                          {formatNumber(d.beneficiarios)}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {d.unidade_medida || "famílias"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <DollarSign className="w-3 h-3 text-muted-foreground" />
                        <span className="text-sm font-semibold text-foreground">
                          {formatCurrency(d.valor_pago)}
                        </span>
                      </div>
                    </div>
                    {d.fonte_url && (
                      <p className="text-[10px] text-muted-foreground mt-2">
                        <a href={d.fonte_url} target="_blank" rel="noopener noreferrer" className="hover:underline inline-flex items-center gap-0.5">
                          Fonte oficial <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </p>
                    )}
                    {d.observacoes && (
                      <p className="text-[10px] text-destructive mt-1 flex items-center gap-1">
                        <AlertTriangle className="w-2.5 h-2.5" /> {d.observacoes}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground mt-3">
                    Dados ainda não disponíveis para este programa.
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}

        {/* Gás do Povo — Estimativa */}
        <Card className="relative overflow-hidden border-orange-500/30">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Gás do Povo</p>
                {gasDoPovoEstimativa ? (
                  <Badge variant="outline" className="text-[9px] border-orange-500/50 text-orange-600">
                    Estimativa
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[9px] text-destructive">
                    Sem dados
                  </Badge>
                )}
              </div>
              <div className="p-2 rounded-lg bg-orange-500/10">
                <Flame className="w-5 h-5 text-orange-500" />
              </div>
            </div>
            {gasDoPovoEstimativa ? (
              <>
                <div className="space-y-1 mt-2">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3 h-3 text-muted-foreground" />
                    <span className="text-lg font-bold text-foreground">
                      ~{formatNumber(gasDoPovoEstimativa.beneficiarios)}
                    </span>
                    <span className="text-[10px] text-muted-foreground">famílias</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Gratuidade no botijão de gás (13kg)
                  </p>
                </div>
                <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
                  <Info className="w-2.5 h-2.5" /> Estimativa: ~85% das famílias do Bolsa Família
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  <a href="https://gasdopovo.mds.gov.br/" target="_blank" rel="noopener noreferrer" className="hover:underline inline-flex items-center gap-0.5">
                    Consultar por CPF <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </p>
              </>
            ) : (
              <p className="text-xs text-muted-foreground mt-3">
                Dados ainda não disponíveis.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Nota sobre transição Auxílio Gás → Gás do Povo */}
      <Card className="border-orange-500/30 bg-orange-500/5">
        <CardContent className="p-4">
          <div className="flex gap-2 items-start">
            <Flame className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" />
            <div className="text-xs text-muted-foreground space-y-1">
              <p><strong>Gás do Povo</strong> — Novo programa do Governo Federal (criado em setembro/2025) que substituiu o Auxílio Gás dos Brasileiros.</p>
              <p>O programa oferece <strong>gratuidade na recarga do botijão de gás (13kg)</strong> para famílias inscritas no CadÚnico com renda per capita de até ½ salário mínimo. Atende cerca de 15,5 milhões de famílias em todo o Brasil.</p>
              <p>⚠️ Dados municipais do Gás do Povo ainda não estão disponíveis em bases abertas. A estimativa acima é baseada em ~85% das famílias do Bolsa Família, critério de elegibilidade do programa.</p>
              <p className="flex items-center gap-1">
                <a href="https://gasdopovo.mds.gov.br/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-0.5">
                  Consulta individual por CPF no site oficial <ExternalLink className="w-2.5 h-2.5" />
                </a>
                {" • "}
                <a href="https://www.gov.br/mds/pt-br/acoes-e-programas/gas-do-povo" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-0.5">
                  Saiba mais <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {outrosProgramas.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-muted-foreground" />
              Outros programas detectados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {outrosProgramas.map(d => (
                <div key={d.programa} className="flex items-center justify-between text-sm">
                  <span className="text-foreground">{PROGRAMA_LABELS[d.programa] || d.programa}</span>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span>{formatCompetencia(d.competencia)}</span>
                    {d.fonte_url && (
                      <a href={d.fonte_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ========== SÉRIE HISTÓRICA ==========
function SerieHistoricaSection({ dados }: { dados: BeneficioSocial[] }) {
  const [metrica, setMetrica] = useState<"beneficiarios" | "valor_pago">("beneficiarios");
  const programas = [...new Set(dados.map(d => d.programa))].sort();

  const chartData = useMemo(() => {
    const competencias = [...new Set(dados.map(d => d.competencia))].sort();
    // last 24
    const last24 = competencias.slice(-24);
    return last24.map(c => {
      const entry: any = { competencia: formatCompetencia(c) };
      for (const p of programas) {
        const item = dados.find(d => d.competencia === c && d.programa === p);
        entry[PROGRAMA_LABELS[p] || p] = item ? (item[metrica] ?? null) : null;
      }
      return entry;
    });
  }, [dados, metrica, programas]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          Séries Históricas (últimos 24 meses)
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => setMetrica("beneficiarios")}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${metrica === "beneficiarios" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"}`}
          >
            Beneficiários
          </button>
          <button
            onClick={() => setMetrica("valor_pago")}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${metrica === "valor_pago" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"}`}
          >
            Valores (R$)
          </button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-4">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="competencia" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => metrica === "valor_pago" ? `R$ ${(v / 1000).toFixed(0)}k` : v.toLocaleString("pt-BR")} />
                <Tooltip
                  formatter={(value: any) => metrica === "valor_pago" ? formatCurrency(value) : formatNumber(value)}
                />
                <Legend />
                {programas.map((p, i) => (
                  <Line
                    key={p}
                    type="monotone"
                    dataKey={PROGRAMA_LABELS[p] || p}
                    stroke={PROGRAMA_CORES[p] || `hsl(${i * 60}, 50%, 50%)`}
                    strokeWidth={2}
                    dot={{ r: 2 }}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">Sem dados históricos disponíveis</p>
          )}
          <p className="text-[10px] text-muted-foreground mt-2">Fonte: Portal da Transparência do Governo Federal</p>
        </CardContent>
      </Card>
    </div>
  );
}

// ========== TABELA DETALHADA ==========
function TabelaDetalhadaSection({ dados }: { dados: BeneficioSocial[] }) {
  const [filtroPrograma, setFiltroPrograma] = useState<string>("todos");
  const programas = [...new Set(dados.map(d => d.programa))].sort();

  const filtrados = useMemo(() => {
    let result = dados;
    if (filtroPrograma !== "todos") result = result.filter(d => d.programa === filtroPrograma);
    return result;
  }, [dados, filtroPrograma]);

  const exportCSV = () => {
    const bom = "\uFEFF";
    const header = "Programa;Competência;Beneficiários;Valor Pago (R$);Unidade;Fonte;Observações\n";
    const rows = filtrados.map(d =>
      `"${PROGRAMA_LABELS[d.programa] || d.programa}";"${d.competencia}";"${d.beneficiarios ?? ""}";"${d.valor_pago ?? ""}";"${d.unidade_medida || ""}";"${d.fonte_url || ""}";"${d.observacoes || ""}"`
    ).join("\n");
    const blob = new Blob([bom + header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `beneficios-sociais-morrinhos.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyLink = () => {
    const params = new URLSearchParams();
    if (filtroPrograma !== "todos") params.set("programa", filtroPrograma);
    const url = `${window.location.origin}/beneficios-sociais${params.toString() ? "?" + params.toString() : ""}`;
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
        <Select value={filtroPrograma} onValueChange={setFiltroPrograma}>
          <SelectTrigger className="w-[200px] h-9 text-xs">
            <SelectValue placeholder="Filtrar programa" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os programas</SelectItem>
            {programas.map(p => (
              <SelectItem key={p} value={p}>{PROGRAMA_LABELS[p] || p}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Programa</TableHead>
                <TableHead className="text-xs">Competência</TableHead>
                <TableHead className="text-xs text-right">Beneficiários</TableHead>
                <TableHead className="text-xs text-right">Valor Pago</TableHead>
                <TableHead className="text-xs">Fonte</TableHead>
                <TableHead className="text-xs">Obs.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtrados.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">
                    Nenhum dado disponível
                  </TableCell>
                </TableRow>
              ) : (
                filtrados.slice(0, 100).map(d => (
                  <TableRow key={d.id}>
                    <TableCell className="text-xs font-medium">{PROGRAMA_LABELS[d.programa] || d.programa}</TableCell>
                    <TableCell className="text-xs">{formatCompetencia(d.competencia)}</TableCell>
                    <TableCell className="text-xs text-right">
                      {d.beneficiarios != null ? formatNumber(d.beneficiarios) : <span className="text-muted-foreground">N/D</span>}
                    </TableCell>
                    <TableCell className="text-xs text-right">
                      {d.valor_pago != null ? formatCurrency(d.valor_pago) : <span className="text-muted-foreground">N/D</span>}
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

// ========== CONTEXTO DO MUNICÍPIO ==========
function ContextoSection({ dados }: { dados: BeneficioSocial[] }) {
  const populacao = 25_373;
  const latestBF = dados.find(d => d.programa === "bolsa_familia");
  const latestBPC = dados.find(d => d.programa === "bpc");

  const bfBenef = latestBF?.beneficiarios || 0;
  const bfPctPop = bfBenef > 0 ? ((bfBenef / populacao) * 100).toFixed(1) : null;
  const bfPerCapita = latestBF?.valor_pago ? (latestBF.valor_pago / populacao).toFixed(2) : null;

  // Total anual recebido de todos os programas
  const anoAtual = new Date().getFullYear();
  const totalAnual = dados
    .filter(d => d.competencia?.startsWith(String(anoAtual)))
    .reduce((s, d) => s + (d.valor_pago || 0), 0);
  const totalAnualAnterior = dados
    .filter(d => d.competencia?.startsWith(String(anoAtual - 1)))
    .reduce((s, d) => s + (d.valor_pago || 0), 0);

  const shareText = `Morrinhos recebeu ${formatCurrency(totalAnual > 0 ? totalAnual : totalAnualAnterior)} em benefícios sociais em ${totalAnual > 0 ? anoAtual : anoAtual - 1}. ${bfPctPop}% da população recebe Bolsa Família (${bfBenef.toLocaleString("pt-BR")} famílias).`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Info className="w-4 h-4 text-primary" />
          Morrinhos em números
        </h2>
        <a href={`https://wa.me/?text=${encodeURIComponent(shareText + "\n\nVeja mais em: https://morrinhos.ai/beneficios-sociais")}`}
          target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-[#25D366] hover:underline font-medium">
          <Share2 className="w-3 h-3" /> Compartilhar
        </a>
      </div>

      {/* Total recebido */}
      {(totalAnual > 0 || totalAnualAnterior > 0) && (
        <Card className="border-accent/20 bg-gradient-to-r from-accent/5 to-transparent">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total recebido do governo federal em {totalAnual > 0 ? anoAtual : anoAtual - 1}</p>
            <p className="text-2xl font-bold text-foreground mt-1">
              {formatCurrency(totalAnual > 0 ? totalAnual : totalAnualAnterior)}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Soma de Bolsa Família, BPC, Gás do Povo e outros programas federais que entraram no município.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <IndicadorCard icon={Users} label="População" valor={populacao.toLocaleString("pt-BR")} fonte="IBGE est. 2025" />
        {bfPctPop && (
          <IndicadorCard icon={Heart} label="Recebem Bolsa Família" valor={`${bfPctPop}%`} sufixo={`(${bfBenef.toLocaleString("pt-BR")} famílias)`} fonte="Portal da Transparência" />
        )}
        {latestBPC && (
          <IndicadorCard icon={Users} label="Recebem BPC" valor={latestBPC.beneficiarios?.toLocaleString("pt-BR") || "—"} sufixo="pessoas" fonte="Portal da Transparência" />
        )}
        {bfPerCapita && (
          <IndicadorCard icon={DollarSign} label="Bolsa Família per capita" valor={`R$ ${bfPerCapita}`} sufixo="/mês por hab." fonte="Cálculo: valor total ÷ população" />
        )}
      </div>
    </div>
  );
}

// ========== CDE / TARIFA SOCIAL REGIONAL ==========
function CdeRegionalSection({ cdeData }: { cdeData: CdeSubsidio[] }) {
  const tarifaSocial = useMemo(() => 
    cdeData.filter(d => d.tipo_subsidio.toLowerCase().includes("baixa renda")), 
    [cdeData]
  );
  const rural = useMemo(() => 
    cdeData.filter(d => d.tipo_subsidio === "Rural"), 
    [cdeData]
  );
  const irrigacao = useMemo(() => 
    cdeData.filter(d => d.tipo_subsidio.toLowerCase().includes("irrigação")), 
    [cdeData]
  );

  const chartData = useMemo(() => {
    const anos = [...new Set(cdeData.map(d => d.ano))].sort();
    return anos.map(ano => {
      const ts = tarifaSocial.find(d => d.ano === ano);
      const ru = rural.find(d => d.ano === ano);
      const ir = irrigacao.find(d => d.ano === ano);
      return {
        ano: String(ano),
        "Tarifa Social (Baixa Renda)": ts?.valor_subsidio ? ts.valor_subsidio / 1_000_000 : null,
        "Rural": ru?.valor_subsidio ? ru.valor_subsidio / 1_000_000 : null,
        "Irrigação e Aquicultura": ir?.valor_subsidio ? ir.valor_subsidio / 1_000_000 : null,
      };
    });
  }, [cdeData, tarifaSocial, rural, irrigacao]);

  const latestTS = tarifaSocial.length > 0 ? tarifaSocial[tarifaSocial.length - 1] : null;

  if (cdeData.length === 0) return null;

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <Lightbulb className="w-4 h-4 text-yellow-500" />
        Referência Regional — Subsídios CDE (ENEL/CELG Goiás)
      </h2>
      <p className="text-xs text-muted-foreground">
        Dados da Conta de Desenvolvimento Energético (CDE) para a distribuidora ENEL/CELG em Goiás.
        Inclui a <strong>Tarifa Social de Energia Elétrica</strong> (desconto para famílias de baixa renda) e outros subsídios.
        Dados agregados por distribuidora — não há recorte municipal disponível na fonte oficial.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <IndicadorCard
          icon={Zap}
          label={`Tarifa Social GO (${latestTS?.ano || "—"})`}
          valor={latestTS?.valor_subsidio ? `R$ ${(latestTS.valor_subsidio / 1_000_000).toFixed(0)} mi` : null}
          fonte="ANEEL — Dados Abertos"
          fonteUrl="https://dadosabertos.aneel.gov.br/dataset/subsidios-tarifarios"
          cor="bg-yellow-500/10"
        />
        {rural.length > 0 && (
          <IndicadorCard
            icon={Calendar}
            label={`Subsídio Rural GO (${rural[rural.length - 1].ano})`}
            valor={rural[rural.length - 1].valor_subsidio ? `R$ ${(rural[rural.length - 1].valor_subsidio! / 1_000_000).toFixed(0)} mi` : null}
            fonte="ANEEL — Dados Abertos"
            fonteUrl="https://dadosabertos.aneel.gov.br/dataset/subsidios-tarifarios"
          />
        )}
        {irrigacao.length > 0 && (
          <IndicadorCard
            icon={DollarSign}
            label={`Irrigação GO (${irrigacao[irrigacao.length - 1].ano})`}
            valor={irrigacao[irrigacao.length - 1].valor_subsidio ? `R$ ${(irrigacao[irrigacao.length - 1].valor_subsidio! / 1_000_000).toFixed(0)} mi` : null}
            fonte="ANEEL — Dados Abertos"
            fonteUrl="https://dadosabertos.aneel.gov.br/dataset/subsidios-tarifarios"
          />
        )}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Evolução dos Subsídios CDE — ENEL/CELG Goiás (R$ milhões)</CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="ano" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `R$ ${v}M`} />
                <Tooltip formatter={(v: any) => `R$ ${Number(v).toFixed(1)} mi`} />
                <Legend />
                <Bar dataKey="Tarifa Social (Baixa Renda)" fill="hsl(45, 80%, 50%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Rural" fill="hsl(152, 55%, 38%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Irrigação e Aquicultura" fill="hsl(200, 60%, 45%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">Sem dados disponíveis</p>
          )}
        </CardContent>
      </Card>

      <Card className="border-yellow-500/30 bg-yellow-500/5">
        <CardContent className="p-4">
          <div className="flex gap-2 items-start">
            <Info className="w-4 h-4 text-yellow-600 mt-0.5 shrink-0" />
            <div className="text-xs text-muted-foreground space-y-1">
              <p><strong>Nota:</strong> Os dados da CDE são agregados por distribuidora (ENEL/CELG — todo o estado de Goiás), não por município. A ANEEL não disponibiliza recorte municipal nesta base.</p>
              <p>A Tarifa Social concede descontos de até 65% na conta de energia para famílias inscritas no CadÚnico com renda ≤ ½ salário mínimo per capita, idosos (65+) do BPC e portadores de deficiência.</p>
              <p>
                <a href="https://dadosabertos.aneel.gov.br/dataset/subsidios-tarifarios" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-0.5">
                  Fonte: ANEEL Dados Abertos — Subsídios Tarifários <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ========== METODOLOGIA ==========
function MetodologiaSection() {
  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <FileText className="w-4 h-4 text-primary" />
        Metodologia e Fontes
      </h2>
      <Card>
        <CardContent className="p-4 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-1">De onde vêm os dados?</h3>
            <ul className="text-xs text-muted-foreground space-y-1.5 list-disc pl-4">
              <li>
                <strong>Bolsa Família (Novo Bolsa Família):</strong> Portal da Transparência do Governo Federal —{" "}
                <a href="https://portaldatransparencia.gov.br" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  portaldatransparencia.gov.br
                </a>
              </li>
              <li>
                <strong>Gás do Povo (estimativa):</strong> Programa federal que substituiu o Auxílio Gás em set/2025. Dados municipais ainda indisponíveis — estimativa baseada em 85% do Bolsa Família.{" "}
                <a href="https://gasdopovo.mds.gov.br/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  gasdopovo.mds.gov.br
                </a>
              </li>
              <li>
                <strong>BPC (Benefício de Prestação Continuada):</strong> Portal da Transparência do Governo Federal
              </li>
              <li>
                <strong>Garantia-Safra, Seguro Defeso:</strong> Portal da Transparência do Governo Federal
              </li>
              <li>
                <strong>Tarifa Social de Energia (CDE):</strong> ANEEL Dados Abertos —{" "}
                <a href="https://dadosabertos.aneel.gov.br/dataset/subsidios-tarifarios" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  dadosabertos.aneel.gov.br
                </a>
                {" "}(recorte por distribuidora ENEL/CELG Goiás)
              </li>
              <li>
                <strong>Dados populacionais:</strong> IBGE — Estimativa da População 2025
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-foreground mb-1">Periodicidade</h3>
            <p className="text-xs text-muted-foreground">
              Os dados são atualizados automaticamente todo dia 5 de cada mês (ou no primeiro dia útil posterior).
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-foreground mb-1">Limitações</h3>
            <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
              <li>A Tarifa Social de Energia (CDE/ANEEL) só disponibiliza dados por distribuidora, não por município.</li>
              <li>Dados de BPC podem ter atraso de 1-2 meses.</li>
              <li>Mudanças metodológicas nos programas federais podem afetar a comparabilidade histórica.</li>
            </ul>
          </div>

          <div className="pt-2 border-t">
            <p className="text-[10px] text-muted-foreground">
              Dados públicos obtidos exclusivamente de fontes oficiais.
              Este aplicativo não tem vínculo com nenhum órgão governamental.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ========== PÁGINA PRINCIPAL ==========
// ========== CONTATOS DE ASSISTÊNCIA SOCIAL ==========
function ContatosSociaisSection() {
  const contatos = [
    { nome: "CadÚnico / Bolsa Família", telefone: "(64) 99984-9676", whatsapp: "5564999849676", desc: "Cadastro e consulta de benefícios" },
    { nome: "CREAS", telefone: "(64) 99602-389", whatsapp: "556499602389", desc: "Centro de Referência — atendimento a famílias" },
    { nome: "Sec. Assistência Social", telefone: "(64) 99238-2040", whatsapp: "5564992382040", desc: "Secretaria Municipal" },
  ];

  return (
    <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
      <CardContent className="p-4">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
          <Phone className="w-4 h-4 text-primary" />
          Precisa de ajuda? Ligue agora
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {contatos.map((c) => (
            <a key={c.nome} href={`https://wa.me/${c.whatsapp}`} target="_blank" rel="noopener noreferrer"
              className="stat-card card-hover flex items-center gap-3 group">
              <div className="w-9 h-9 rounded-full bg-[#25D366]/10 flex items-center justify-center shrink-0">
                <svg viewBox="0 0 24 24" className="w-4 h-4 text-[#25D366] fill-current">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">{c.nome}</p>
                <p className="text-xs text-muted-foreground">{c.desc}</p>
                <p className="text-xs text-[#25D366]">{c.telefone}</p>
              </div>
            </a>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ========== CALENDÁRIO DE PAGAMENTO ==========
function CalendarioPagamentoSection() {
  const now = new Date();
  const mesAtual = now.toLocaleDateString("pt-BR", { month: "long" });
  const anoAtual = now.getFullYear();

  // Bolsa Família payment schedule follows last digit of NIS
  // Typically paid in last 10 business days of the month
  const calendario = [
    { nis: "1", periodo: "Dias 18-20 do mês" },
    { nis: "2", periodo: "Dias 18-20 do mês" },
    { nis: "3", periodo: "Dias 21-23 do mês" },
    { nis: "4", periodo: "Dias 21-23 do mês" },
    { nis: "5", periodo: "Dias 24-25 do mês" },
    { nis: "6", periodo: "Dias 24-25 do mês" },
    { nis: "7", periodo: "Dias 26-27 do mês" },
    { nis: "8", periodo: "Dias 26-27 do mês" },
    { nis: "9", periodo: "Dias 28-29 do mês" },
    { nis: "0", periodo: "Dias 28-31 do mês" },
  ];

  const shareText = `Calendário Bolsa Família ${mesAtual}/${anoAtual}:\n\n${calendario.map(c => `NIS final ${c.nis}: ${c.periodo}`).join("\n")}\n\nVeja mais em: https://morrinhos.ai/beneficios-sociais`;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            Calendário Bolsa Família — {mesAtual}/{anoAtual}
          </h3>
          <a href={`https://wa.me/?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-[#25D366] hover:underline font-medium">
            <Share2 className="w-3 h-3" /> Compartilhar
          </a>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          O depósito é feito conforme o último dígito do NIS (Número de Identificação Social). Datas aproximadas — podem variar.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {calendario.map((c) => (
            <div key={c.nis} className="rounded-lg bg-muted/50 p-2 text-center">
              <p className="text-lg font-bold text-primary">NIS {c.nis}</p>
              <p className="text-[10px] text-muted-foreground">{c.periodo}</p>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground mt-2">
          Fonte: Calendário oficial do Ministério do Desenvolvimento Social.
          Confira sempre no app Caixa Tem ou ligue 111 (Caixa).
        </p>
      </CardContent>
    </Card>
  );
}

// ========== COMO SE CADASTRAR ==========
function ComoSeCadastrarSection() {
  const passos = [
    { num: 1, titulo: "Reúna os documentos", desc: "CPF, RG, comprovante de endereço e renda de todos da família. Certidão de nascimento das crianças." },
    { num: 2, titulo: "Vá ao CRAS ou CadÚnico", desc: "Procure o CRAS de Morrinhos ou ligue para (64) 99984-9676 para agendar o cadastro no CadÚnico." },
    { num: 3, titulo: "Faça a entrevista", desc: "Um atendente vai perguntar sobre a renda, composição familiar e condições de moradia." },
    { num: 4, titulo: "Aguarde a análise", desc: "Após o cadastro, o governo federal analisa o perfil. A inclusão no Bolsa Família leva 30 a 90 dias." },
    { num: 5, titulo: "Acompanhe pelo app", desc: "Baixe o app Caixa Tem para acompanhar pagamentos. Mantenha dados atualizados a cada 2 anos." },
  ];

  return (
    <Card>
      <CardContent className="p-4">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
          <ClipboardList className="w-4 h-4 text-accent" />
          Como se cadastrar nos programas sociais
        </h3>
        <p className="text-xs text-muted-foreground mb-4">
          Para receber Bolsa Família, BPC, Tarifa Social e outros benefícios, o primeiro passo é estar inscrito no CadÚnico.
        </p>
        <div className="space-y-3">
          {passos.map((p) => (
            <div key={p.num} className="flex gap-3">
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-primary">{p.num}</span>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{p.titulo}</p>
                <p className="text-xs text-muted-foreground">{p.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 p-3 rounded-lg bg-accent/10 border border-accent/20">
          <p className="text-xs text-foreground">
            <strong>Quem tem direito?</strong> Famílias com renda mensal de até R$ 218 por pessoa. Famílias com renda de até meio salário mínimo por pessoa também podem se cadastrar no CadÚnico para acessar outros programas.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function BeneficiosSociais() {
  const { data: dados = [], isLoading } = useQuery({
    queryKey: ["beneficios-sociais"],
    queryFn: fetchBeneficiosSociais,
    staleTime: 1000 * 60 * 10,
  });

  const { data: cdeData = [] } = useQuery({
    queryKey: ["cde-subsidios"],
    queryFn: fetchCdeSubsidios,
    staleTime: 1000 * 60 * 30,
  });

  return (
    <Layout>
      <SEO
        title="Benefícios Sociais em Morrinhos GO"
        description="Morrinhos GO — Programas sociais: Bolsa Família, BPC, Pé-de-Meia, Gás do Povo. Beneficiários, valores pagos e dados oficiais verificáveis."
        path="/beneficios-sociais"
      />

      <div className="container py-6 space-y-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            Benefícios Sociais em Morrinhos
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Dados oficiais e verificáveis, com links diretos para as fontes.
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map(i => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="animate-pulse space-y-3">
                    <div className="h-3 bg-muted rounded w-2/3" />
                    <div className="h-6 bg-muted rounded w-1/2" />
                    <div className="h-2 bg-muted rounded w-full" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : dados.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <AlertTriangle className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <h2 className="text-lg font-semibold text-foreground mb-1">
                Dados em fase de coleta
              </h2>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                A sincronização automática com o Portal da Transparência foi configurada.
                Os dados serão populados na próxima execução da rotina de coleta.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <VisaoGeralSection dados={dados} />
            <SerieHistoricaSection dados={dados} />
            <TabelaDetalhadaSection dados={dados} />
            <ContextoSection dados={dados} />
          </>
        )}

        {/* Contatos de Assistência Social */}
        <ContatosSociaisSection />

        {/* Calendário de Pagamento */}
        <CalendarioPagamentoSection />

        {/* Como se cadastrar */}
        <ComoSeCadastrarSection />

        <CdeRegionalSection cdeData={cdeData} />
        <MetodologiaSection />
      </div>
    </Layout>
  );
}

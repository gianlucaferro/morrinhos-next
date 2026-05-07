/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps */
"use client";

import Layout from "@/components/Layout";
import SEO from "@/components/SEO";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  GraduationCap, School, Users, BookOpen, TrendingUp,
  ExternalLink, BarChart3, Building2, DollarSign,
  Library, Monitor, FlaskConical, Dumbbell, Wifi,
  Utensils, Accessibility, Award, Search, Globe, Phone,
  Mail, MapPin, Clock, Star, Briefcase, Banknote, Info, AlertTriangle, CheckCircle2,
} from "lucide-react";
import {
  fetchEscolas, fetchIdeb, fetchIndicadores,
  fetchMatriculas, fetchInvestimentos, fetchProgramas,
  fetchEnsinoSuperiorIes, fetchEnsinoSuperiorCursos,
  fetchPeDeMeia,
  type EducacaoIdeb, type EducacaoIndicador,
  type EnsinoSuperiorIes, type EnsinoSuperiorCurso,
  type PeDeMeia,
} from "@/data/educacaoApi";
import { useState, useMemo, useEffect, useRef } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Legend, PieChart, Pie, Cell,
} from "recharts";

const ETAPA_LABELS: Record<string, string> = {
  creche: "Creche",
  pre_escola: "Pré-escola",
  anos_iniciais: "Anos Iniciais",
  anos_finais: "Anos Finais",
  ensino_medio: "Ensino Médio",
  eja: "EJA",
  educacao_especial: "Ed. Especial",
  ai: "Anos Iniciais",
  af: "Anos Finais",
  em: "Ensino Médio",
};

const CORES = ["hsl(220, 60%, 25%)", "hsl(152, 55%, 38%)", "hsl(25, 90%, 55%)", "hsl(280, 50%, 50%)", "hsl(0, 72%, 51%)", "hsl(200, 60%, 45%)", "hsl(45, 80%, 50%)"];

function getIndicador(indicadores: EducacaoIndicador[], chave: string) {
  return indicadores.find((i) => i.chave === chave);
}

function IndicadorCard({ icon: Icon, label, valor, sufixo, fonte, fonteUrl, cor }: {
  icon: any; label: string; valor: string | number | null; sufixo?: string;
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
function VisaoGeralTab({ indicadores, matriculas, escolas }: { indicadores: EducacaoIndicador[]; matriculas: any[]; escolas: any[] }) {
  const total = getIndicador(indicadores, "escolas_total");
  const mun = getIndicador(indicadores, "escolas_municipais");
  const est = getIndicador(indicadores, "escolas_estaduais");
  const priv = getIndicador(indicadores, "escolas_privadas");
  const alunos = getIndicador(indicadores, "alunos_matriculados");
  const profs = getIndicador(indicadores, "professores_total");
  const ioeb = getIndicador(indicadores, "ioeb");
  const escol = getIndicador(indicadores, "taxa_escolarizacao_6_14");
  const idh = getIndicador(indicadores, "idh_educacao");

  const matriculasAno = matriculas.filter((m) => m.ano === Math.max(...matriculas.map((x: any) => x.ano)));
  const pieData = matriculasAno.map((m: any) => ({
    name: ETAPA_LABELS[m.etapa] || m.etapa,
    value: m.quantidade,
  }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <IndicadorCard icon={School} label="Total de Escolas" valor={total?.valor} fonte={total?.fonte} fonteUrl={total?.fonte_url} />
        <IndicadorCard icon={Users} label="Alunos Matriculados" valor={alunos?.valor?.toLocaleString("pt-BR")} fonte={alunos?.fonte} fonteUrl={alunos?.fonte_url} />
        <IndicadorCard icon={GraduationCap} label="Professores" valor={profs?.valor} fonte={profs?.fonte} fonteUrl={profs?.fonte_url} />
        <IndicadorCard icon={Award} label="Ioeb" valor={ioeb?.valor?.toFixed(2)} fonte={ioeb?.fonte} fonteUrl={ioeb?.fonte_url} />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Escolas por rede */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Escolas por Rede</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: "Municipais", val: mun?.valor, color: "bg-primary" },
              { label: "Estaduais", val: est?.valor, color: "bg-accent" },
              { label: "Privadas", val: priv?.valor, color: "bg-orange-500" },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="font-semibold">{item.val ?? 0}</span>
                </div>
                <Progress value={((item.val ?? 0) / (total?.valor ?? 1)) * 100} className="h-2" />
              </div>
            ))}
            <p className="text-[10px] text-muted-foreground">Fonte: Censo Escolar/INEP • {total?.ano_referencia}</p>
          </CardContent>
        </Card>

        {/* Matrículas por etapa */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Matrículas por Etapa</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={2} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    {pieData.map((_: any, i: number) => (
                      <Cell key={i} fill={CORES[i % CORES.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-muted-foreground text-center py-8">Sem dados disponíveis</p>}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <IndicadorCard icon={BookOpen} label="Taxa de Escolarização (6-14 anos)" valor={escol?.valor ? `${escol.valor}%` : null} fonte={escol?.fonte} fonteUrl={escol?.fonte_url} />
        <IndicadorCard icon={TrendingUp} label="IDH Educação" valor={idh?.valor?.toFixed(3)} fonte={idh?.fonte} fonteUrl={idh?.fonte_url} />
        <IndicadorCard icon={School} label="Escolas Municipais" valor={mun?.valor} fonte="Censo Escolar/INEP" />
      </div>

      {/* Cards das escolas com IDEB */}
      {escolas.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Award className="w-4 h-4 text-primary" />
            IDEB por Escola — 2023
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {escolas
              .filter((e: any) => e.ideb_ai || e.ideb_af || e.ideb_em)
              .sort((a: any, b: any) => {
                const notaA = a.ideb_ai || a.ideb_af || a.ideb_em || 0;
                const notaB = b.ideb_ai || b.ideb_af || b.ideb_em || 0;
                return notaB - notaA;
              })
              .map((e: any) => {
                const redeColors: Record<string, string> = {
                  municipal: "bg-primary/10 text-primary",
                  estadual: "bg-accent/10 text-accent-foreground",
                  privada: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
                };
                const bestIdeb = Math.max(e.ideb_ai || 0, e.ideb_af || 0, e.ideb_em || 0);
                const idebColor = bestIdeb >= 6 ? "text-green-600 dark:text-green-400" : bestIdeb >= 5 ? "text-primary" : "text-destructive";
                return (
                  <Card key={e.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h4 className="font-semibold text-xs leading-tight text-foreground flex-1">{e.nome}</h4>
                        <Badge variant="secondary" className={`text-[9px] shrink-0 ${redeColors[e.rede] || ""}`}>
                          {e.rede.charAt(0).toUpperCase() + e.rede.slice(1)}
                        </Badge>
                      </div>
                      <div className="flex items-end gap-3 mt-1">
                        {e.ideb_ai && (
                          <div className="text-center">
                            <p className={`text-xl font-bold ${idebColor}`}>{Number(e.ideb_ai).toFixed(1)}</p>
                            <p className="text-[9px] text-muted-foreground">Anos Iniciais</p>
                          </div>
                        )}
                        {e.ideb_af && (
                          <div className="text-center">
                            <p className={`text-xl font-bold ${idebColor}`}>{Number(e.ideb_af).toFixed(1)}</p>
                            <p className="text-[9px] text-muted-foreground">Anos Finais</p>
                          </div>
                        )}
                        {e.ideb_em && (
                          <div className="text-center">
                            <p className={`text-xl font-bold ${idebColor}`}>{Number(e.ideb_em).toFixed(1)}</p>
                            <p className="text-[9px] text-muted-foreground">Ensino Médio</p>
                          </div>
                        )}
                      </div>
                      {e.matriculas_total > 0 && (
                        <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {e.matriculas_total.toLocaleString("pt-BR")} matrículas
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            {escolas
              .filter((e: any) => !e.ideb_ai && !e.ideb_af && !e.ideb_em)
              .map((e: any) => {
                const etapas = (e.etapas || []) as string[];
                const isCreche = etapas.length > 0 && etapas.every((et: string) => ["creche", "pre_escola"].includes(et));
                const isEspecial = etapas.length > 0 && etapas.every((et: string) => et === "educacao_especial");
                const badgeLabel = isCreche ? "Educação Infantil" : isEspecial ? "Ed. Especial" : "Sem dados Saeb";
                const badgeClass = isCreche
                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                  : isEspecial
                  ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                  : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300";
                const redeColors: Record<string, string> = {
                  municipal: "bg-primary/10 text-primary",
                  estadual: "bg-accent/10 text-accent-foreground",
                  privada: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
                };
                return (
                  <Card key={e.id} className="hover:shadow-md transition-shadow opacity-80">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h4 className="font-semibold text-xs leading-tight text-foreground flex-1">{e.nome}</h4>
                        <Badge variant="secondary" className={`text-[9px] shrink-0 ${redeColors[e.rede] || ""}`}>
                          {e.rede.charAt(0).toUpperCase() + e.rede.slice(1)}
                        </Badge>
                      </div>
                      <Badge variant="outline" className={`text-[9px] ${badgeClass}`}>
                        {badgeLabel}
                      </Badge>
                      {e.matriculas_total > 0 && (
                        <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {e.matriculas_total.toLocaleString("pt-BR")} matrículas
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">Fonte: IDEB/INEP 2023 via QEdu</p>
        </div>
      )}
    </div>
  );
}

// ========== IDEB ==========
function IdebTab({ idebData }: { idebData: EducacaoIdeb[] }) {
  const [etapa, setEtapa] = useState("anos_iniciais");

  const chartData = useMemo(() => {
    const anos = [...new Set(idebData.filter((d) => d.etapa === etapa).map((d) => d.ano))].sort();
    return anos.map((ano) => {
      const mun = idebData.find((d) => d.ano === ano && d.etapa === etapa && d.ambito === "municipio");
      const est = idebData.find((d) => d.ano === ano && d.etapa === etapa && d.ambito === "estado");
      const bra = idebData.find((d) => d.ano === ano && d.etapa === etapa && d.ambito === "brasil");
      return {
        ano,
        Morrinhos: mun?.ideb ?? null,
        Meta: mun?.meta ?? null,
        Goiás: est?.ideb ?? null,
        Brasil: bra?.ideb ?? null,
      };
    });
  }, [idebData, etapa]);

  const latest = idebData.find((d) => d.etapa === etapa && d.ambito === "municipio" && d.ano === Math.max(...idebData.filter((x) => x.etapa === etapa && x.ambito === "municipio").map((x) => x.ano)));

  return (
    <div className="space-y-6">
      <div className="flex gap-2 flex-wrap">
        {["anos_iniciais", "anos_finais", "ensino_medio"].map((e) => (
          <button key={e} onClick={() => setEtapa(e)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${etapa === e ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"}`}>
            {ETAPA_LABELS[e]}
          </button>
        ))}
      </div>

      {latest && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <IndicadorCard icon={Award} label={`IDEB ${ETAPA_LABELS[etapa]}`} valor={latest.ideb?.toFixed(1)} fonte="INEP" fonteUrl={latest.fonte_url} />
          {latest.meta && <IndicadorCard icon={TrendingUp} label="Meta MEC" valor={latest.meta.toFixed(1)} fonte="INEP" />}
          {latest.nota_saeb_pt && <IndicadorCard icon={BookOpen} label="Saeb Português" valor={latest.nota_saeb_pt.toFixed(1)} fonte="INEP" />}
          {latest.nota_saeb_mt && <IndicadorCard icon={BarChart3} label="Saeb Matemática" valor={latest.nota_saeb_mt.toFixed(1)} fonte="INEP" />}
        </div>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Evolução do IDEB — {ETAPA_LABELS[etapa]}</CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="ano" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 10]} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="Morrinhos" stroke="hsl(220, 60%, 25%)" strokeWidth={3} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="Goiás" stroke="hsl(152, 55%, 38%)" strokeWidth={2} strokeDasharray="5 5" />
                <Line type="monotone" dataKey="Brasil" stroke="hsl(25, 90%, 55%)" strokeWidth={2} strokeDasharray="5 5" />
                <Line type="monotone" dataKey="Meta" stroke="hsl(0, 72%, 51%)" strokeWidth={1} strokeDasharray="3 3" dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-muted-foreground text-center py-8">Sem dados disponíveis</p>}
          <p className="text-[10px] text-muted-foreground mt-2">Fonte: IDEB/INEP • 2007–2023</p>
        </CardContent>
      </Card>
    </div>
  );
}

// ========== INFRAESTRUTURA ==========
function InfraestruturaTab({ indicadores }: { indicadores: EducacaoIndicador[] }) {
  const infraItems = [
    { chave: "infra_acessibilidade", label: "Acessibilidade", icon: Accessibility },
    { chave: "infra_alimentacao", label: "Alimentação Escolar", icon: Utensils },
    { chave: "infra_biblioteca", label: "Biblioteca", icon: Library },
    { chave: "infra_lab_informatica", label: "Lab. Informática", icon: Monitor },
    { chave: "infra_lab_ciencias", label: "Lab. Ciências", icon: FlaskConical },
    { chave: "infra_quadra", label: "Quadra Esportiva", icon: Dumbbell },
    { chave: "infra_internet", label: "Banda Larga", icon: Wifi },
    { chave: "infra_agua_tratada", label: "Água Tratada", icon: Building2 },
    { chave: "infra_energia", label: "Energia Elétrica", icon: Building2 },
    { chave: "infra_esgoto", label: "Esgoto Rede Pública", icon: Building2 },
  ];

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Percentual de escolas públicas com cada recurso de infraestrutura.</p>
      <div className="grid gap-3">
        {infraItems.map(({ chave, label, icon: Icon }) => {
          const ind = getIndicador(indicadores, chave);
          const val = ind?.valor ?? 0;
          const isLow = val < 50;
          return (
            <div key={chave} className="flex items-center gap-3 p-3 rounded-lg bg-card border">
              <Icon className={`w-5 h-5 shrink-0 ${isLow ? "text-destructive" : "text-accent"}`} />
              <div className="flex-1 min-w-0">
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium truncate">{label}</span>
                  <span className={`font-bold ${isLow ? "text-destructive" : "text-accent"}`}>{val}%</span>
                </div>
                <Progress value={val} className="h-2" />
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-[10px] text-muted-foreground">Fonte: Censo Escolar/INEP • 2025</p>
    </div>
  );
}

// ========== MATRÍCULAS ==========
function MatriculasTab({ matriculas }: { matriculas: any[] }) {
  const latestYear = matriculas.length > 0 ? Math.max(...matriculas.map((m: any) => m.ano)) : null;
  const latestData = matriculas.filter((m: any) => m.ano === latestYear);

  const barData = latestData.map((m: any) => ({
    etapa: ETAPA_LABELS[m.etapa] || m.etapa,
    quantidade: m.quantidade,
  }));

  // Historical trend: total enrollment per year
  const trendData = useMemo(() => {
    const byYear = new Map<number, number>();
    matriculas.forEach((m: any) => {
      byYear.set(m.ano, (byYear.get(m.ano) || 0) + m.quantidade);
    });
    return Array.from(byYear.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([ano, total]) => ({ ano: String(ano), total }));
  }, [matriculas]);

  const totalAlunos = latestData.reduce((s: number, m: any) => s + m.quantidade, 0);

  return (
    <div className="space-y-6">
      {/* Investment per student */}
      {totalAlunos > 0 && (
        <InvestimentoPorAluno totalAlunos={totalAlunos} />
      )}

      {barData.length > 0 ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Matrículas por Etapa — {latestYear}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="etapa" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="quantidade" fill="hsl(220, 60%, 25%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <p className="text-[10px] text-muted-foreground mt-2">Fonte: Censo Escolar/INEP • {latestYear}</p>
          </CardContent>
        </Card>
      ) : <p className="text-sm text-muted-foreground text-center py-8">Sem dados de matrículas</p>}

      {/* Historical trend */}
      {trendData.length > 1 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Evolução das matrículas</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="ano" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="total" stroke="hsl(220, 60%, 25%)" strokeWidth={2} dot={{ r: 3 }} name="Total de matrículas" />
              </LineChart>
            </ResponsiveContainer>
            {trendData.length >= 2 && (() => {
              const first = trendData[0].total;
              const last = trendData[trendData.length - 1].total;
              const pct = ((last - first) / first * 100).toFixed(1);
              const growing = last >= first;
              return (
                <p className={`text-xs mt-2 font-medium ${growing ? "text-accent" : "text-destructive"}`}>
                  {growing ? "↑" : "↓"} {growing ? "Crescimento" : "Redução"} de {Math.abs(Number(pct))}% no período ({trendData[0].ano}–{trendData[trendData.length - 1].ano})
                </p>
              );
            })()}
          </CardContent>
        </Card>
      )}

      {latestData.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {latestData.map((m: any) => (
            <Card key={m.etapa}>
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground">{ETAPA_LABELS[m.etapa] || m.etapa}</p>
                <p className="text-xl font-bold text-foreground mt-1">{m.quantidade.toLocaleString("pt-BR")}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// Investment per student
function InvestimentoPorAluno({ totalAlunos }: { totalAlunos: number }) {
  const { data: despesas } = useQuery({
    queryKey: ["despesas-educacao-total"],
    queryFn: async () => {
      const { data } = await (await import("@/integrations/supabase/client")).supabase
        .from("contas_publicas")
        .select("valor")
        .eq("coluna", "Despesas Empenhadas")
        .like("conta", "TotalDespesas::12%")
        .order("exercicio", { ascending: false })
        .limit(1)
        .single();
      return data?.valor || null;
    },
    staleTime: 30 * 60 * 1000,
  });

  if (!despesas || totalAlunos === 0) return null;

  const porAluno = despesas / totalAlunos;
  const porAlunoMes = porAluno / 12;

  return (
    <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10">
            <DollarSign className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Investimento por aluno</p>
            <p className="text-2xl font-bold text-foreground mt-1">
              R$ {porAlunoMes.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ".")}<span className="text-sm font-normal text-muted-foreground">/mês</span>
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              R$ {porAluno.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ".")}/ano · {totalAlunos.toLocaleString("pt-BR")} alunos matriculados · Fonte: SICONFI + Censo Escolar
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ========== PROGRAMAS ==========
function ProgramasTab({ programas }: { programas: any[] }) {
  const esferaColors: Record<string, string> = {
    federal: "bg-primary text-primary-foreground",
    estadual: "bg-accent text-accent-foreground",
    municipal: "bg-orange-500 text-white",
  };

  return (
    <div className="space-y-4">
      {["federal", "estadual", "municipal"].map((esf) => {
        const items = programas.filter((p: any) => p.esfera === esf);
        if (items.length === 0) return null;
        return (
          <div key={esf}>
            <h3 className="text-sm font-semibold text-foreground mb-2 capitalize">Programas {esf === "federal" ? "Federais" : esf === "estadual" ? "Estaduais" : "Municipais"}</h3>
            <div className="space-y-2">
              {items.map((p: any) => (
                <Card key={p.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Badge className={esferaColors[esf] || "bg-secondary"}>{esf.charAt(0).toUpperCase() + esf.slice(1)}</Badge>
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm">{p.nome}</h4>
                        {p.descricao && <p className="text-xs text-muted-foreground mt-1">{p.descricao}</p>}
                      </div>
                      {p.fonte_url && (
                        <a href={p.fonte_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ========== ESCOLAS + MAPA ==========
function EscolasTab({ escolas }: { escolas: any[] }) {
  const [busca, setBusca] = useState("");
  const [filtroRede, setFiltroRede] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const filtered = useMemo(() => {
    return escolas.filter((e: any) => {
      if (busca && !e.nome.toLowerCase().includes(busca.toLowerCase())) return false;
      if (filtroRede && e.rede !== filtroRede) return false;
      return true;
    });
  }, [escolas, busca, filtroRede]);

  const escolasComCoordenadas = filtered.filter((e: any) => e.latitude && e.longitude);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text" placeholder="Buscar escola..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border bg-card text-sm"
            value={busca} onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <div className="flex gap-1">
          {[null, "municipal", "estadual", "privada"].map((r) => (
            <button key={r ?? "all"} onClick={() => setFiltroRede(r)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filtroRede === r ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
              {r ? r.charAt(0).toUpperCase() + r.slice(1) : "Todas"}
            </button>
          ))}
        </div>
      </div>

      {/* Map */}
      {escolasComCoordenadas.length > 0 && (
        <Card>
          <CardContent className="p-0 overflow-hidden rounded-lg" style={{ height: 350 }}>
            <MapaEscolas escolas={escolasComCoordenadas} selectedId={selectedId} onMarkerClick={(id) => {
              setSelectedId(id);
              setTimeout(() => {
                const el = cardRefs.current.get(id);
                if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
              }, 100);
            }} />
          </CardContent>
        </Card>
      )}

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          {escolas.length === 0 ? "Dados de escolas individuais serão carregados na próxima sincronização." : "Nenhuma escola encontrada."}
        </p>
      ) : (
        <div className="space-y-2">
          {filtered.map((e: any) => (
            <Card
              key={e.id}
              ref={(el: HTMLDivElement | null) => { if (el) cardRefs.current.set(e.id, el); else cardRefs.current.delete(e.id); }}
              className={`cursor-pointer transition-all ${selectedId === e.id ? "ring-2 ring-primary shadow-md" : "hover:shadow-sm"}`}
              onClick={() => setSelectedId(selectedId === e.id ? null : e.id)}
            >
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-semibold text-sm">{e.nome}</h4>
                    {e.diretor_nome && (
                      <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                        <Users className="w-3 h-3" /> Dir.: {e.diretor_nome}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                      <Badge variant="outline" className="text-[10px]">{e.rede}</Badge>
                      {(() => {
                        const ideb = e.ideb_ai || e.ideb_af || e.ideb_em;
                        if (!ideb) return null;
                        const v = Number(ideb);
                        const label = v >= 6 ? "Excelente" : v >= 5 ? "Bom" : v >= 4 ? "Regular" : "Abaixo da meta";
                        const color = v >= 6 ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300" : v >= 5 ? "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300" : v >= 4 ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300" : "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300";
                        return <Badge className={`text-[10px] ${color}`}>{label}</Badge>;
                      })()}
                      {e.ideb_ai && <Badge variant="secondary" className="text-[10px]">AI: {Number(e.ideb_ai).toFixed(1)}</Badge>}
                      {e.ideb_af && <Badge variant="secondary" className="text-[10px]">AF: {Number(e.ideb_af).toFixed(1)}</Badge>}
                      {e.ideb_em && <Badge variant="secondary" className="text-[10px]">EM: {Number(e.ideb_em).toFixed(1)}</Badge>}
                      {e.matriculas_total > 0 && <span className="text-[10px] text-muted-foreground">{e.matriculas_total} alunos</span>}
                    </div>
                  </div>
                  {e.fonte_url && (
                    <a href={e.fonte_url} target="_blank" rel="noopener noreferrer" onClick={(ev) => ev.stopPropagation()}>
                      <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                    </a>
                  )}
                </div>
                {/* Contato e endereço */}
                {(e.endereco || e.telefone) && (
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                    {e.endereco && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {e.endereco}</span>}
                    {e.telefone && (
                      <a href={`tel:${e.telefone}`} className="flex items-center gap-1 text-primary hover:underline" onClick={(ev) => ev.stopPropagation()}>
                        <Phone className="w-3 h-3" /> {e.telefone}
                      </a>
                    )}
                  </div>
                )}
                {/* Infraestrutura */}
                {(e.tem_biblioteca !== null || e.tem_lab_informatica !== null || e.tem_quadra !== null || e.tem_internet !== null || e.tem_alimentacao !== null) && (
                  <div className="flex flex-wrap gap-1.5">
                    {e.tem_biblioteca != null && <span className={`text-[10px] px-1.5 py-0.5 rounded ${e.tem_biblioteca ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-muted text-muted-foreground line-through"}`}>📚 Biblioteca</span>}
                    {e.tem_lab_informatica != null && <span className={`text-[10px] px-1.5 py-0.5 rounded ${e.tem_lab_informatica ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-muted text-muted-foreground line-through"}`}>💻 Lab Info</span>}
                    {e.tem_lab_ciencias != null && <span className={`text-[10px] px-1.5 py-0.5 rounded ${e.tem_lab_ciencias ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-muted text-muted-foreground line-through"}`}>🔬 Lab Ciências</span>}
                    {e.tem_quadra != null && <span className={`text-[10px] px-1.5 py-0.5 rounded ${e.tem_quadra ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-muted text-muted-foreground line-through"}`}>🏃 Quadra</span>}
                    {e.tem_internet != null && <span className={`text-[10px] px-1.5 py-0.5 rounded ${e.tem_internet ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-muted text-muted-foreground line-through"}`}>📶 Internet</span>}
                    {e.tem_alimentacao != null && <span className={`text-[10px] px-1.5 py-0.5 rounded ${e.tem_alimentacao ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-muted text-muted-foreground line-through"}`}>🍽️ Alimentação</span>}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ========== MAPA LEAFLET ==========
function MapaEscolas({ escolas, selectedId, onMarkerClick }: { escolas: any[]; selectedId: string | null; onMarkerClick?: (id: string) => void }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markersRef = useRef<Map<string, any>>(new Map());

  // Initialize map once
  useEffect(() => {
    if (!mapRef.current || escolas.length === 0) return;
    let cancelled = false;

    (async () => {
      const L = await import("leaflet");
      await import("leaflet/dist/leaflet.css");
      if (cancelled || !mapRef.current) return;
      if (mapInstance.current) { mapInstance.current.remove(); }

      const map = L.map(mapRef.current).setView([escolas[0].latitude, escolas[0].longitude], 13);
      mapInstance.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© OpenStreetMap',
      }).addTo(map);

      const redeColors: Record<string, string> = { municipal: "#1e3a5f", estadual: "#2d8a56", privada: "#e67e22" };
      markersRef.current.clear();

      escolas.forEach((e: any) => {
        const color = redeColors[e.rede] || "#666";
        const icon = L.divIcon({
          className: "",
          html: `<div style="width:12px;height:12px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,.3);transition:all .2s"></div>`,
          iconSize: [12, 12],
        });
        const marker = L.marker([e.latitude, e.longitude], { icon })
          .addTo(map)
          .bindPopup(`<b>${e.nome}</b><br/>${e.rede}`);
        marker.on("click", () => { if (onMarkerClick) onMarkerClick(e.id); });
        markersRef.current.set(e.id, { marker, color });
      });
    })();

    return () => {
      cancelled = true;
      if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null; }
    };
  }, [escolas]);

  // Highlight selected marker
  useEffect(() => {
    if (!mapInstance.current) return;

    (async () => {
      const L = await import("leaflet");
      const redeColors: Record<string, string> = { municipal: "#1e3a5f", estadual: "#2d8a56", privada: "#e67e22" };

      markersRef.current.forEach(({ marker, color }, id) => {
        const isSelected = id === selectedId;
        const size = isSelected ? 22 : 12;
        const border = isSelected ? 3 : 2;
        const zIdx = isSelected ? 1000 : 1;
        const shadow = isSelected ? "0 0 8px 2px rgba(59,130,246,.6)" : "0 1px 3px rgba(0,0,0,.3)";

        marker.setIcon(L.divIcon({
          className: "",
          html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:${border}px solid ${isSelected ? '#3b82f6' : 'white'};box-shadow:${shadow};transition:all .2s"></div>`,
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        }));
        marker.setZIndexOffset(zIdx);

        if (isSelected) {
          marker.openPopup();
          mapInstance.current.setView([marker.getLatLng().lat, marker.getLatLng().lng], 15, { animate: true });
        }
      });
    })();
  }, [selectedId]);

  return <div ref={mapRef} style={{ width: "100%", height: "100%" }} />;
}

// ========== ENSINO SUPERIOR ==========
function EnsinoSuperiorTab({ ies, cursos }: { ies: EnsinoSuperiorIes[]; cursos: EnsinoSuperiorCurso[] }) {
  const [filtroModalidade, setFiltroModalidade] = useState<string | null>(null);

  const GRAU_LABELS: Record<string, string> = {
    bacharelado: "Bacharelado",
    licenciatura: "Licenciatura",
    tecnologo: "Tecnólogo",
  };

  return (
    <div className="space-y-6">
      {ies.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">Dados de ensino superior serão carregados na próxima sincronização.</p>
      ) : (
        ies.map((inst) => {
          const instCursos = cursos
            .filter((c) => c.ies_id === inst.id && c.situacao === "ativo")
            .filter((c) => !filtroModalidade || c.modalidade === filtroModalidade);
          const presenciais = cursos.filter((c) => c.ies_id === inst.id && c.modalidade === "presencial" && c.situacao === "ativo").length;
          const ead = cursos.filter((c) => c.ies_id === inst.id && c.modalidade === "ead" && c.situacao === "ativo").length;

          return (
            <div key={inst.id} className="space-y-4">
              {/* Cabeçalho da IES */}
              <Card className="border-primary/20">
                <CardContent className="p-5">
                  <div className="flex flex-col md:flex-row md:items-start gap-4">
                    <div className="flex-1 space-y-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-lg font-bold text-foreground">{inst.nome}</h3>
                          {inst.sigla && <Badge variant="secondary" className="text-xs font-semibold">{inst.sigla}</Badge>}
                          <Badge variant="outline" className="text-[10px]">{inst.tipo === "privada" ? "Privada" : "Pública"}</Badge>
                        </div>
                        {inst.fundacao_ano && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Fundada em {inst.fundacao_ano} • {inst.alunos_formados ? `${inst.alunos_formados.toLocaleString("pt-BR")}+ alunos formados` : ""}
                          </p>
                        )}
                      </div>

                      {/* Conceito MEC */}
                      {inst.conceito_institucional && (
                        <div className="flex items-center gap-2">
                          <Award className="w-4 h-4 text-primary" />
                          <span className="text-sm font-medium text-foreground">Conceito Institucional MEC:</span>
                          <span className="text-lg font-bold text-primary">{inst.conceito_institucional.toFixed(2)}</span>
                          <div className="flex gap-0.5">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star key={s} className={`w-3.5 h-3.5 ${s <= Math.round(inst.conceito_institucional!) ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground/30"}`} />
                            ))}
                          </div>
                        </div>
                      )}

                      {inst.docentes_mestres_doutores_pct && (
                        <p className="text-xs text-muted-foreground">
                          {inst.docentes_mestres_doutores_pct}% do corpo docente com mestrado ou doutorado
                        </p>
                      )}

                      {/* Contato */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted-foreground">
                        {inst.endereco && (
                          <div className="flex items-start gap-1.5">
                            <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                            <span>{inst.endereco}</span>
                          </div>
                        )}
                        {inst.telefone && (
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 shrink-0" />
                            <span>{inst.telefone}</span>
                            {inst.whatsapp && <span className="text-muted-foreground/60">• WhatsApp: {inst.whatsapp}</span>}
                          </div>
                        )}
                        {inst.email && (
                          <div className="flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5 shrink-0" />
                            <a href={`mailto:${inst.email}`} className="hover:underline">{inst.email}</a>
                          </div>
                        )}
                        {inst.site && (
                          <div className="flex items-center gap-1.5">
                            <Globe className="w-3.5 h-3.5 shrink-0" />
                            <a href={inst.site} target="_blank" rel="noopener noreferrer" className="hover:underline text-primary">{inst.site.replace(/https?:\/\/(www\.)?/, "")}</a>
                          </div>
                        )}
                      </div>

                      {/* Programas de financiamento */}
                      {inst.programas_financiamento.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          <span className="text-[10px] text-muted-foreground mr-1">Financiamento:</span>
                          {inst.programas_financiamento.map((p) => (
                            <Badge key={p} variant="outline" className="text-[10px]">{p}</Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Links */}
                    <div className="flex gap-2 shrink-0">
                      {inst.instagram && (
                        <a href={inst.instagram} target="_blank" rel="noopener noreferrer" className="p-2 rounded-md hover:bg-secondary transition-colors" aria-label="Instagram">
                          <ExternalLink className="w-4 h-4 text-muted-foreground" />
                        </a>
                      )}
                      {inst.fonte_url && (
                        <a href={inst.fonte_url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary hover:underline flex items-center gap-1">
                          e-MEC <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Filtros de modalidade */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground">Cursos de Graduação</span>
                <span className="text-xs text-muted-foreground">({presenciais} presenciais, {ead} EAD)</span>
                <div className="flex gap-1 ml-auto">
                  {[null, "presencial", "ead"].map((m) => (
                    <button key={m ?? "all"} onClick={() => setFiltroModalidade(m)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filtroModalidade === m ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
                      {m === "presencial" ? "Presencial" : m === "ead" ? "EAD" : "Todos"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Lista de cursos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {instCursos.map((curso) => (
                  <Card key={curso.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-semibold text-sm text-foreground">{curso.nome}</h4>
                        {curso.fonte_url && (
                          <a href={curso.fonte_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                            <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                          </a>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        <Badge variant="outline" className="text-[10px]">
                          {GRAU_LABELS[curso.grau] || curso.grau}
                        </Badge>
                        <Badge variant={curso.modalidade === "ead" ? "default" : "secondary"} className="text-[10px]">
                          {curso.modalidade === "ead" ? "EAD" : "Presencial"}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {curso.periodo && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {curso.periodo.charAt(0).toUpperCase() + curso.periodo.slice(1)}
                          </span>
                        )}
                        {curso.duracao_anos && (
                          <span className="flex items-center gap-1">
                            <Briefcase className="w-3 h-3" /> {curso.duracao_anos} anos
                          </span>
                        )}
                      </div>

                      {curso.conceito_mec && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-muted-foreground">MEC:</span>
                          <div className="flex gap-0.5">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star key={s} className={`w-3 h-3 ${s <= curso.conceito_mec! ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground/30"}`} />
                            ))}
                          </div>
                          <span className="text-xs font-bold text-foreground">{curso.conceito_mec}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>

              <p className="text-[10px] text-muted-foreground">Fonte: e-MEC/MEC • Site institucional FAP</p>
            </div>
          );
        })
      )}
    </div>
  );
}

// ========== PÉ DE MEIA ==========
function PeDeMeiaTab({ dados }: { dados: PeDeMeia[] }) {
  const anos = [...new Set(dados.map((d) => d.ano))].sort((a, b) => b - a);
  const [anoSel, setAnoSel] = useState(anos[0] || 2025);
  const anoData = dados.filter((d) => d.ano === anoSel);
  const totalBenef = anoData.reduce((s, d) => s + (d.beneficiarios || 0), 0);
  const totalValor = anoData.reduce((s, d) => s + (d.valor_total || 0), 0);
  // Detecta dados incompletos: se o valor médio/aluno é muito baixo (< R$ 500), provavelmente só captou parcelas iniciais
  const valorMedioAluno = totalBenef > 0 ? totalValor / totalBenef : 0;
  const isDadosIncompletos = valorMedioAluno > 0 && valorMedioAluno < 500;
  const isEstimativa = false; // All years now have official data

  const barData = anoData
    .filter((d) => d.serie)
    .sort((a, b) => (a.serie || "").localeCompare(b.serie || ""))
    .map((d) => ({
      serie: d.serie,
      beneficiarios: d.beneficiarios || 0,
      valor: d.valor_total || 0,
    }));

  return (
    <div className="space-y-6">
      {/* Info banner */}
      <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-foreground">Programa Pé-de-Meia</p>
              <p className="text-xs text-muted-foreground mt-1">
                Incentivo financeiro-educacional do Governo Federal para estudantes do ensino médio público inscritos no CadÚnico.
                O aluno recebe depósitos mensais por frequência e bônus anuais por aprovação e participação no ENEM.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Disclaimer */}
      {isDadosIncompletos ? (
        <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
          <CardContent className="p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                <span className="font-semibold text-amber-700 dark:text-amber-300">Dados incompletos.</span>{" "}
                Os valores de {anoSel} capturaram apenas as parcelas iniciais (matrícula). O valor total do ano (frequência + aprovação + ENEM) 
                será atualizado após re-sincronização com o Portal da Transparência. O programa prevê até R$ 3.000/aluno/ano para quem cumpre todos os requisitos.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20">
          <CardContent className="p-3">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                <span className="font-semibold text-green-700 dark:text-green-300">Dados oficiais.</span>{" "}
                Total de beneficiários e valor global conforme o Portal da Transparência ({anoSel}). 
                A distribuição por série é estimada proporcionalmente com base no Censo Escolar/INEP.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Year selector */}
      <div className="flex gap-2">
        {anos.map((a) => {
          const aData = dados.filter((d) => d.ano === a);
          const aTotalBenef = aData.reduce((s, d) => s + (d.beneficiarios || 0), 0);
          const aTotalValor = aData.reduce((s, d) => s + (d.valor_total || 0), 0);
          const aIncompleto = aTotalBenef > 0 && (aTotalValor / aTotalBenef) < 500;
          return (
            <button key={a} onClick={() => setAnoSel(a)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${anoSel === a ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"}`}>
              {a}
              {aIncompleto && <span className="ml-1 text-[9px] opacity-70">incompleto</span>}
            </button>
          );
        })}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <IndicadorCard icon={Users} label="Alunos Beneficiados" valor={totalBenef.toLocaleString("pt-BR")} fonte="Portal da Transparência" fonteUrl="https://portaldatransparencia.gov.br/pe-de-meia" />
        <IndicadorCard icon={Banknote} label={isDadosIncompletos ? "Valor Total (incompleto)" : "Valor Total"} valor={totalValor >= 1_000_000 ? `R$ ${(totalValor / 1_000_000).toFixed(2).replace(".", ",")} mi` : `R$ ${(totalValor / 1000).toFixed(0)} mil`} fonte="Portal da Transparência" fonteUrl="https://portaldatransparencia.gov.br/pe-de-meia" />
        <IndicadorCard icon={DollarSign} label="Valor Médio/Aluno/Ano" valor={totalBenef > 0 ? `R$ ${(totalValor / totalBenef).toFixed(0)}` : "—"} fonte="Cálculo estimado" />
      </div>

      {/* Bar chart by serie */}
      {barData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Beneficiários por Série — {anoSel}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="serie" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: number) => v.toLocaleString("pt-BR")} />
                <Bar dataKey="beneficiarios" name="Beneficiários" fill="hsl(220, 60%, 25%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <p className="text-[10px] text-muted-foreground mt-2">Fonte: Portal da Transparência / MEC • {anoSel}</p>
          </CardContent>
        </Card>
      )}

      {/* Details per serie */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {anoData.filter((d) => d.serie).sort((a, b) => (a.serie || "").localeCompare(b.serie || "")).map((d) => (
          <Card key={d.id}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-1">{d.serie} do Ensino Médio</p>
              <p className="text-xl font-bold text-foreground">{(d.beneficiarios || 0).toLocaleString("pt-BR")}</p>
              <p className="text-[10px] text-muted-foreground">alunos beneficiados</p>
              {d.valor_total && (
                <p className="text-sm font-semibold text-primary mt-2">
                  R$ {d.valor_total >= 1_000_000 ? `${(d.valor_total / 1_000_000).toFixed(2).replace(".", ",")} mi` : `${(d.valor_total / 1000).toFixed(0)} mil`}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* How it works */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Como Funciona o Pé-de-Meia</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {[
              { label: "Incentivo Matrícula", valor: "R$ 200", desc: "Pago no ato da matrícula" },
              { label: "Incentivo Frequência", valor: "R$ 200/mês", desc: "80% de frequência mínima" },
              { label: "Incentivo Conclusão", valor: "R$ 1.000/ano", desc: "Aprovação ao final do ano" },
              { label: "Incentivo ENEM", valor: "R$ 200", desc: "Participação no exame (3ª série)" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 border">
                <Banknote className="w-4 h-4 text-primary shrink-0" />
                <div>
                  <p className="font-semibold text-foreground">{item.label}: <span className="text-primary">{item.valor}</span></p>
                  <p className="text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground mt-3">
            Fonte: <a href="https://www.gov.br/mec/pt-br/pe-de-meia" target="_blank" rel="noopener noreferrer" className="hover:underline inline-flex items-center gap-0.5">MEC — Programa Pé-de-Meia <ExternalLink className="w-2.5 h-2.5" /></a>
          </p>
        </CardContent>
      </Card>

      <p className="text-[10px] text-muted-foreground italic">
        ⚠️ Dados estimados com base nas matrículas do ensino médio público de Morrinhos e na cobertura nacional do programa. Valores oficiais por município podem ser consultados no Portal da Transparência.
      </p>
    </div>
  );
}

// ========== MAIN PAGE ==========
const tabs = [
  { value: "visao", label: "Visão Geral", icon: School },
  { value: "ideb", label: "IDEB", icon: Award },
  { value: "matriculas", label: "Matrículas", icon: Users },
  { value: "infraestrutura", label: "Infraestrutura", icon: Building2 },
  { value: "escolas", label: "Escolas", icon: Search },
  { value: "pedemeia", label: "Pé-de-Meia", icon: Banknote },
  { value: "superior", label: "Ensino Superior", icon: GraduationCap },
  { value: "programas", label: "Programas", icon: BookOpen },
];

export default function Educacao() {
  const { data: escolas = [] } = useQuery({ queryKey: ["educacao-escolas"], queryFn: fetchEscolas });
  const { data: idebData = [] } = useQuery({ queryKey: ["educacao-ideb"], queryFn: fetchIdeb });
  const { data: indicadores = [] } = useQuery({ queryKey: ["educacao-indicadores"], queryFn: fetchIndicadores });
  const { data: matriculas = [] } = useQuery({ queryKey: ["educacao-matriculas"], queryFn: fetchMatriculas });
  const { data: investimentos = [] } = useQuery({ queryKey: ["educacao-investimentos"], queryFn: fetchInvestimentos });
  const { data: programas = [] } = useQuery({ queryKey: ["educacao-programas"], queryFn: fetchProgramas });
  const { data: ies = [] } = useQuery({ queryKey: ["ensino-superior-ies"], queryFn: fetchEnsinoSuperiorIes });
  const { data: cursos = [] } = useQuery({ queryKey: ["ensino-superior-cursos"], queryFn: fetchEnsinoSuperiorCursos });
  const { data: peDeMeia = [] } = useQuery({ queryKey: ["pe-de-meia"], queryFn: fetchPeDeMeia });

  return (
    <Layout>
      <SEO
        title="Educação em Morrinhos GO — Escolas, IDEB, Matrículas"
        description="Morrinhos GO — Educação: escolas municipais e estaduais, IDEB, matrículas, infraestrutura, ensino superior e programas educacionais. Dados do INEP."
        path="/educacao"
      />

      <div className="container py-8">
        <h1 className="text-2xl font-bold text-foreground mb-1">Educação</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Indicadores educacionais de Morrinhos — dados oficiais do INEP, QEdu e IBGE.
        </p>

        <Tabs defaultValue="visao" className="w-full">
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

          <TabsContent value="visao">
            <VisaoGeralTab indicadores={indicadores} matriculas={matriculas} escolas={escolas} />
          </TabsContent>
          <TabsContent value="ideb">
            <IdebTab idebData={idebData} />
          </TabsContent>
          <TabsContent value="matriculas">
            <MatriculasTab matriculas={matriculas} />
          </TabsContent>
          <TabsContent value="infraestrutura">
            <InfraestruturaTab indicadores={indicadores} />
          </TabsContent>
          <TabsContent value="escolas">
            <EscolasTab escolas={escolas} />
          </TabsContent>
          <TabsContent value="pedemeia">
            <PeDeMeiaTab dados={peDeMeia} />
          </TabsContent>
          <TabsContent value="superior">
            <EnsinoSuperiorTab ies={ies} cursos={cursos} />
          </TabsContent>
          <TabsContent value="programas">
            <ProgramasTab programas={programas} />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}

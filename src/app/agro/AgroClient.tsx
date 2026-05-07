/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useMemo, type ElementType } from "react";
import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import SEO from "@/components/SEO";
import {
  Wheat, Beef, Milk, Egg, TreePine, BarChart3,
  ExternalLink, TrendingUp, Leaf, DollarSign, MapPin, Share2, Trophy, Ruler,
} from "lucide-react";
import {
  fetchAgroIndicadores, type AgroIndicador,
  extractHistoricoBovino, extractHistoricoLeite, extractComparativo, extractTrimestral,
} from "@/data/agroApi";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LineChart, Line, Area, AreaChart,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import ChuvaSafraPanel from "@/components/agro/ChuvaSafraPanel";

/* ── helpers ── */
function formatNum(v: number | null): string {
  if (v === null) return "—";
  return v.toLocaleString("pt-BR");
}

/* ── sub-components ── */
function SectionHeader({ title, icon: Icon, description }: { title: string; icon: ElementType; description?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        {title}
      </h2>
      {description && <p className="text-xs text-muted-foreground mt-1 ml-10">{description}</p>}
    </div>
  );
}

function StatCard({ label, value, sub, icon: Icon, accent }: {
  label: string; value: string; sub?: string; icon?: ElementType; accent?: string;
}) {
  return (
    <div className="stat-card flex flex-col gap-1">
      <div className="flex items-center gap-2">
        {Icon && <Icon className={`w-4 h-4 ${accent || "text-primary"}`} />}
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <span className="text-lg font-bold text-foreground">{value}</span>
      {sub && <span className="text-[10px] text-muted-foreground">{sub}</span>}
    </div>
  );
}

const BAR_COLORS = [
  "hsl(var(--primary))",
  "hsl(142, 76%, 36%)",
  "hsl(45, 93%, 47%)",
  "hsl(25, 95%, 53%)",
  "hsl(0, 84%, 60%)",
  "hsl(262, 83%, 58%)",
  "hsl(199, 89%, 48%)",
];

type AgroProps = {
  chuvaAnoCorrente: Record<number, number>;
  mediaHistMensal: Record<number, number>;
  ultimos30: number;
  ultimos60: number;
  ultimos90: number;
  ano: number;
  mesAtual: number;
};

export default function Agro({
  chuvaAnoCorrente,
  mediaHistMensal,
  ultimos30,
  ultimos60,
  ultimos90,
  ano: anoProp,
  mesAtual,
}: AgroProps) {
  const { data: indicadores = [], isLoading } = useQuery({
    queryKey: ["agro-indicadores-page"],
    queryFn: fetchAgroIndicadores,
    staleTime: 10 * 60 * 1000,
  });

  const agro = useMemo(() => {
    const m = new Map<string, AgroIndicador>();
    indicadores.forEach(a => m.set(`${a.categoria}:${a.chave}`, a));
    return m;
  }, [indicadores]);

  const get = (cat: string, chave: string) => agro.get(`${cat}:${chave}`);

  const ano = get("pecuaria", "bovino")?.ano_referencia || get("lavoura", "soja")?.ano_referencia || 2024;

  // Histórico bovino
  const historicoBovino = useMemo(() => extractHistoricoBovino(indicadores), [indicadores]);
  const historicoLeite = useMemo(() => extractHistoricoLeite(indicadores), [indicadores]);

  // Comparativo vizinhos
  const compBovino = useMemo(() => extractComparativo(indicadores, "comparativo_bovino"), [indicadores]);
  const compLeite = useMemo(() => extractComparativo(indicadores, "comparativo_leite"), [indicadores]);

  // Dados trimestrais 2025
  const abateTrimestral = useMemo(() => extractTrimestral(indicadores, "abate_trimestral_go"), [indicadores]);
  const leiteTrimestral = useMemo(() => extractTrimestral(indicadores, "leite_trimestral_go"), [indicadores]);
  const tem2025 = abateTrimestral.some(d => d.ano >= 2025) || leiteTrimestral.some(d => d.ano >= 2025);

  // Lavouras
  const lavourasProducao = [
    { nome: "Soja", chave: "soja", cor: "#22c55e" },
    { nome: "Tomate", chave: "tomate", cor: "#ef4444" },
    { nome: "Milho", chave: "milho", cor: "#eab308" },
    { nome: "Sorgo", chave: "sorgo", cor: "#f97316" },
    { nome: "Girassol", chave: "girassol", cor: "#a855f7" },
    { nome: "Cana", chave: "cana_de_acucar", cor: "#06b6d4" },
    { nome: "Mandioca", chave: "mandioca", cor: "#8b5cf6" },
  ].map(l => ({
    ...l,
    producao: get("lavoura", l.chave)?.valor || 0,
    valor: get("lavoura", l.chave + "_valor")?.valor || 0,
    area: get("lavoura", l.chave + "_area")?.valor || 0,
    producaoTexto: get("lavoura", l.chave)?.valor_texto || "—",
    valorTexto: get("lavoura", l.chave + "_valor")?.valor_texto || "—",
    areaTexto: get("lavoura", l.chave + "_area")?.valor_texto || "—",
  })).filter(l => l.producao > 0).sort((a, b) => b.producao - a.producao);

  const lavourasValor = [...lavourasProducao].sort((a, b) => b.valor - a.valor);

  // Rebanhos
  const rebanhos = [
    { nome: "Bovinos", chave: "bovino", cor: "#8b4513" },
    { nome: "Galináceos", chave: "galinaceos", cor: "#f97316" },
    { nome: "Suínos", chave: "suino", cor: "#ec4899" },
    { nome: "Equinos", chave: "equino", cor: "#0ea5e9" },
    { nome: "Ovinos", chave: "ovino", cor: "#a3a3a3" },
    { nome: "Caprinos", chave: "caprino", cor: "#84cc16" },
    { nome: "Bubalinos", chave: "bubalino", cor: "#6366f1" },
  ].map(r => ({
    ...r,
    valor: get("pecuaria", r.chave)?.valor || 0,
    texto: get("pecuaria", r.chave)?.valor_texto || "—",
  })).filter(r => r.valor > 0).sort((a, b) => b.valor - a.valor);

  // Produção animal
  const leite = get("producao_animal", "leite") || get("producao_animal", "leite_estimado");
  const leiteValor = get("producao_animal", "leite_valor");
  const ovos = get("producao_animal", "ovos");
  const ovosValor = get("producao_animal", "ovos_valor");
  const mel = get("producao_animal", "mel");
  const vacasOrdenhadas = get("producao_animal", "vacas_ordenhadas");
  const isLeiteEstimado = !get("producao_animal", "leite") && !!get("producao_animal", "leite_estimado");
  const valorProdAnimal = get("pecuaria", "valor_producao_animal");

  const valorTotalLavouras = lavourasProducao.reduce((sum, l) => sum + l.valor, 0);

  return (
    <Layout>
      <SEO
        title="Agropecuária de Morrinhos GO — Rebanhos, Leite, Lavouras"
        description={`Morrinhos GO — Agropecuária: rebanho bovino, produção de leite, lavouras, área plantada e comparativo regional. Dados IBGE ${ano}.`}
        path="/agro"
      />
      <div className="container py-6 space-y-8">
        {/* Hero */}
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Wheat className="w-6 h-6 text-primary" />
            Agropecuária
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Panorama produtivo de Morrinhos-GO — Dados IBGE ({ano})
          </p>
          <div className="flex flex-wrap gap-2 mt-3">
            <Badge variant="outline" className="text-xs">
              <MapPin className="w-3 h-3 mr-1" /> Morrinhos, GO
            </Badge>
            <Badge variant="outline" className="text-xs">
              <BarChart3 className="w-3 h-3 mr-1" /> IBGE PPM/PAM {ano}
            </Badge>
          </div>
        </div>

        {/* Painel Chuva e safra — dados de chuva mensal vs media historica + */}
        {/* status hidrico + calendario de plantio Cerrado. SSR via /agro/page.tsx. */}
        <ChuvaSafraPanel
          chuvaAnoCorrente={chuvaAnoCorrente}
          mediaHistMensal={mediaHistMensal}
          ultimos30={ultimos30}
          ultimos60={ultimos60}
          ultimos90={ultimos90}
          ano={anoProp}
          mesAtual={mesAtual}
        />

        {/* Cross link pra /meio-ambiente — onde mostramos a transicao 1985-2024 */}
        <a
          href="/meio-ambiente"
          className="stat-card card-hover flex items-center justify-between gap-4 group"
        >
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground inline-flex items-center gap-1.5">
              🌱 Como o solo de Morrinhos mudou em 40 anos?
            </p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Pastagem caiu 52%, agricultura subiu 4.049% (1985→2024). Veja a transição
              completa via MapBiomas — floresta, cerrado, soja, cana, área urbana.
            </p>
          </div>
          <span className="text-sm text-primary font-medium whitespace-nowrap group-hover:translate-x-1 transition-transform">
            Ver no Meio Ambiente →
          </span>
        </a>

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="stat-card animate-pulse h-24" />
            ))}
          </div>
        ) : (
          <>
            {/* Resumo rápido */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard label="Rebanho bovino" value={get("pecuaria", "bovino")?.valor_texto || "—"} sub={`cabeças • ${ano}`} icon={Beef} accent="text-amber-700" />
              <StatCard label="Produção de leite" value={leite?.valor_texto || "—"} sub={leiteValor ? `${leiteValor.valor_texto} • ${ano}` : `${ano}`} icon={Milk} accent="text-sky-600" />
              <StatCard label="Produção de soja" value={get("lavoura", "soja")?.valor_texto || "—"} sub={`PAM • ${ano}`} icon={Leaf} accent="text-green-600" />
              <StatCard label="Valor prod. animal" value={valorProdAnimal?.valor_texto || "—"} sub={`PPM • ${ano}`} icon={DollarSign} accent="text-emerald-600" />
            </div>

            {/* ===== PIB AGRO TOTAL ===== */}
            {(() => {
              const valorPecuaria = valorProdAnimal?.valor || 0;
              const valorLavouras = valorTotalLavouras;
              const leiteVal = leiteValor?.valor || 0;
              const pibAgro = valorPecuaria + valorLavouras + leiteVal;
              const bovinos = get("pecuaria", "bovino")?.valor || 0;
              const sojaVal = get("lavoura", "soja")?.valor || 0;

              // Posição no ranking regional de bovinos
              const posicaoBovino = compBovino.length > 0
                ? compBovino.findIndex(c => c.nome === "Morrinhos") + 1
                : 0;

              const shareText = `Panorama Agro de Morrinhos (${ano}):\n\n🐄 ${formatNum(bovinos)} cabeças de gado${posicaoBovino > 0 ? ` (${posicaoBovino}º entre vizinhos)` : ""}\n🥛 ${leite?.valor_texto || "—"} de leite\n🌱 Soja: R$ ${sojaVal > 0 ? (sojaVal / 1000).toFixed(0) + " mi" : "—"}\n💰 Valor total agro: R$ ${pibAgro > 0 ? (pibAgro / 1000).toFixed(0) + " milhões" : "—"}\n\nDados IBGE ${ano}.`;

              return pibAgro > 0 ? (
                <section>
                  <div className="stat-card border-primary/20 bg-gradient-to-r from-green-50 to-transparent dark:from-green-950/20 dark:to-transparent">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start gap-3">
                        <div className="p-2.5 rounded-xl bg-green-600/10">
                          <DollarSign className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">Valor Bruto da Produção Agropecuária</p>
                          <p className="text-3xl font-bold text-green-700 dark:text-green-400 mt-1">
                            R$ {(pibAgro / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} milhões
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Pecuária: R$ {(valorPecuaria / 1000).toFixed(0)} mi · Lavouras: R$ {(valorLavouras / 1000).toFixed(0)} mi · Leite: R$ {(leiteVal / 1000).toFixed(0)} mi · IBGE {ano}
                          </p>
                        </div>
                      </div>
                      <a href={`https://wa.me/?text=${encodeURIComponent(shareText + "\n\nVeja mais em: https://morrinhos.ai/agro")}`}
                        target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-[#25D366] hover:underline font-medium shrink-0">
                        <Share2 className="w-3 h-3" /> Compartilhar
                      </a>
                    </div>

                    {/* Mini ranking + produtividade */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                      {posicaoBovino > 0 && (
                        <div className="rounded-lg bg-background p-2.5 text-center">
                          <Trophy className={`w-4 h-4 mx-auto mb-1 ${posicaoBovino <= 3 ? "text-yellow-500" : "text-muted-foreground"}`} />
                          <p className="text-lg font-bold text-foreground">{posicaoBovino}º</p>
                          <p className="text-[10px] text-muted-foreground">Ranking bovino regional</p>
                        </div>
                      )}
                      {lavourasProducao.length > 0 && lavourasProducao[0].area > 0 && (
                        <div className="rounded-lg bg-background p-2.5 text-center">
                          <Ruler className="w-4 h-4 mx-auto mb-1 text-green-600" />
                          <p className="text-lg font-bold text-foreground">
                            {(lavourasProducao[0].producao / lavourasProducao[0].area).toFixed(1)}
                          </p>
                          <p className="text-[10px] text-muted-foreground">ton/ha {lavourasProducao[0].nome}</p>
                        </div>
                      )}
                      {vacasOrdenhadas?.valor && leite?.valor && (
                        <div className="rounded-lg bg-background p-2.5 text-center">
                          <Milk className="w-4 h-4 mx-auto mb-1 text-sky-500" />
                          <p className="text-lg font-bold text-foreground">
                            {((leite.valor / vacasOrdenhadas.valor) * 1000).toFixed(0)}
                          </p>
                          <p className="text-[10px] text-muted-foreground">litros/vaca/ano</p>
                        </div>
                      )}
                      {lavourasProducao.length > 0 && (
                        <div className="rounded-lg bg-background p-2.5 text-center">
                          <Leaf className="w-4 h-4 mx-auto mb-1 text-green-500" />
                          <p className="text-lg font-bold text-foreground">
                            {lavourasProducao.reduce((s, l) => s + l.area, 0).toLocaleString("pt-BR")}
                          </p>
                          <p className="text-[10px] text-muted-foreground">hectares plantados</p>
                        </div>
                      )}
                    </div>
                  </div>
                </section>
              ) : null;
            })()}

            {/* Produtividade das lavouras */}
            {lavourasProducao.some(l => l.area > 0) && (
              <section>
                <SectionHeader title="Produtividade das Lavouras" icon={Ruler} description={`Rendimento por hectare — PAM/IBGE ${ano}`} />
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {lavourasProducao.filter(l => l.area > 0).map(l => {
                    const produtividade = l.producao / l.area;
                    return (
                      <div key={l.chave} className="stat-card">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: l.cor }} />
                          <span className="text-xs text-muted-foreground">{l.nome}</span>
                        </div>
                        <p className="text-xl font-bold text-foreground">{produtividade.toFixed(1)}</p>
                        <p className="text-[10px] text-muted-foreground">ton/hectare</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{formatNum(l.area)} ha plantados</p>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* ===== PECUÁRIA ===== */}
            <section>
              <SectionHeader title="Pecuária" icon={Beef} description={`Efetivo dos rebanhos do município — PPM/IBGE ${ano}`} />
              {rebanhos.length > 0 && (
                <div className="stat-card mb-4">
                  <h3 className="text-sm font-semibold text-foreground mb-3">Efetivo dos rebanhos (cabeças)</h3>
                  <ResponsiveContainer width="100%" height={Math.max(200, rebanhos.length * 44)}>
                    <BarChart data={rebanhos} layout="vertical" margin={{ left: 0, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis type="number" tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}mil` : v} />
                      <YAxis type="category" dataKey="nome" width={90} tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(v: number) => [formatNum(v) + " cabeças", "Efetivo"]} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                      <Bar dataKey="valor" radius={[0, 6, 6, 0]}>
                        {rebanhos.map(r => <Cell key={r.chave} fill={r.cor} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <p className="text-[10px] text-muted-foreground mt-2">Fonte: IBGE — Pesquisa Pecuária Municipal ({ano})</p>
                </div>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {rebanhos.map(r => (
                  <div key={r.chave} className="stat-card flex flex-col gap-0.5">
                    <span className="text-xs text-muted-foreground">{r.nome}</span>
                    <span className="text-base font-bold text-foreground">{r.texto}</span>
                    <span className="text-[10px] text-muted-foreground">cabeças</span>
                  </div>
                ))}
              </div>
            </section>

            {/* ===== EVOLUÇÃO HISTÓRICA BOVINO ===== */}
            {historicoBovino.length > 1 && (
              <section>
                <SectionHeader title="Evolução do Rebanho Bovino" icon={TrendingUp} description="Série histórica do efetivo bovino — PPM/IBGE" />
                <div className="stat-card">
                  <h3 className="text-sm font-semibold text-foreground mb-3">
                    Efetivo bovino ({historicoBovino[0].ano}–{historicoBovino[historicoBovino.length - 1].ano})
                  </h3>
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={historicoBovino} margin={{ left: 0, right: 10, top: 5, bottom: 5 }}>
                      <defs>
                        <linearGradient id="gradBovino" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8b4513" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#8b4513" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="ano" tick={{ fontSize: 12 }} />
                      <YAxis tickFormatter={v => `${(v/1000).toFixed(0)}mil`} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => [formatNum(v) + " cabeças", "Efetivo"]} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                      <Area type="monotone" dataKey="valor" stroke="#8b4513" strokeWidth={2} fill="url(#gradBovino)" />
                    </AreaChart>
                  </ResponsiveContainer>
                  {historicoBovino.length >= 2 && (() => {
                    const first = historicoBovino[0].valor;
                    const last = historicoBovino[historicoBovino.length - 1].valor;
                    const pct = ((last - first) / first * 100).toFixed(1);
                    const grew = last >= first;
                    return (
                      <p className={`text-xs mt-2 font-medium ${grew ? "text-green-600" : "text-red-600"}`}>
                        {grew ? "↑" : "↓"} {grew ? "+" : ""}{pct}% no período ({formatNum(first)} → {formatNum(last)} cabeças)
                      </p>
                    );
                  })()}
                  <p className="text-[10px] text-muted-foreground mt-1">Fonte: IBGE — Pesquisa Pecuária Municipal</p>
                </div>
              </section>
            )}

            {/* ===== EVOLUÇÃO HISTÓRICA LEITE ===== */}
            {historicoLeite.length > 1 && (
              <section>
                <SectionHeader title="Evolução da Produção de Leite" icon={Milk} description="Estimativa baseada em vacas ordenhadas × produtividade média — PPM/IBGE" />
                <div className="stat-card">
                  <h3 className="text-sm font-semibold text-foreground mb-3">
                    Produção estimada de leite ({historicoLeite[0].ano}–{historicoLeite[historicoLeite.length - 1].ano})
                  </h3>
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={historicoLeite} margin={{ left: 0, right: 10, top: 5, bottom: 5 }}>
                      <defs>
                        <linearGradient id="gradLeite" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="ano" tick={{ fontSize: 12 }} />
                      <YAxis tickFormatter={v => `${(v/1000).toFixed(0)}mi`} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => [`${(v / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} mi litros`, "Produção estimada"]} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                      <Area type="monotone" dataKey="valor" stroke="#0ea5e9" strokeWidth={2} fill="url(#gradLeite)" />
                    </AreaChart>
                  </ResponsiveContainer>
                  {historicoLeite.length >= 2 && (() => {
                    const first = historicoLeite[0].valor;
                    const last = historicoLeite[historicoLeite.length - 1].valor;
                    const pct = ((last - first) / first * 100).toFixed(1);
                    const grew = last >= first;
                    return (
                      <p className={`text-xs mt-2 font-medium ${grew ? "text-green-600" : "text-red-600"}`}>
                        {grew ? "↑" : "↓"} {grew ? "+" : ""}{pct}% no período ({(first / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} → {(last / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} mi litros)
                      </p>
                    );
                  })()}
                  <p className="text-[10px] text-muted-foreground mt-1">Fonte: IBGE — PPM (vacas ordenhadas × produtividade média 2.500 L/vaca/ano)</p>
                </div>
              </section>
            )}

            {/* ===== COMPARATIVO COM VIZINHOS ===== */}
            {compBovino.length > 1 && (
              <section>
                <SectionHeader title="Comparativo Regional — Bovinos" icon={MapPin} description="Rebanho bovino: Morrinhos vs municípios vizinhos" />
                <div className="stat-card">
                  <h3 className="text-sm font-semibold text-foreground mb-3">Efetivo bovino — municípios vizinhos ({ano})</h3>
                  <ResponsiveContainer width="100%" height={Math.max(200, compBovino.length * 44)}>
                    <BarChart data={compBovino} layout="vertical" margin={{ left: 0, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis type="number" tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}mil` : String(v)} />
                      <YAxis type="category" dataKey="nome" width={120} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => [formatNum(v) + " cabeças", "Efetivo"]} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                      <Bar dataKey="valor" radius={[0, 6, 6, 0]}>
                        {compBovino.map((m, i) => (
                          <Cell key={m.nome} fill={m.nome === "Morrinhos" ? "hsl(var(--primary))" : "#a3a3a3"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <p className="text-[10px] text-muted-foreground mt-2">Fonte: IBGE — PPM ({ano})</p>
                </div>
              </section>
            )}

            {compLeite.length > 1 && (
              <section>
                <SectionHeader title="Comparativo Regional — Leite" icon={Milk} description="Vacas ordenhadas: Morrinhos vs vizinhos" />
                <div className="stat-card">
                  <h3 className="text-sm font-semibold text-foreground mb-3">Vacas ordenhadas — municípios vizinhos ({ano})</h3>
                  <ResponsiveContainer width="100%" height={Math.max(200, compLeite.length * 44)}>
                    <BarChart data={compLeite} layout="vertical" margin={{ left: 0, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis type="number" tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}mil` : String(v)} />
                      <YAxis type="category" dataKey="nome" width={120} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => [formatNum(v) + " vacas", "Ordenhadas"]} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                      <Bar dataKey="valor" radius={[0, 6, 6, 0]}>
                        {compLeite.map(m => (
                          <Cell key={m.nome} fill={m.nome === "Morrinhos" ? "#0ea5e9" : "#a3a3a3"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <p className="text-[10px] text-muted-foreground mt-2">Fonte: IBGE — PPM ({ano})</p>
                </div>
              </section>
            )}

            {/* ===== DADOS TRIMESTRAIS 2025 (GO) ===== */}
            {abateTrimestral.length > 0 && (
              <section>
                <SectionHeader title="Abate Bovino — Goiás (Trimestral)" icon={Beef} description="Pesquisa Trimestral do Abate — dados estaduais mais recentes, incluindo 2025" />
                {tem2025 && (
                  <div className="mb-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                    <p className="text-xs text-primary font-medium">🆕 Dados de 2025 disponíveis! Os dados trimestrais estaduais (Goiás) são publicados antes da PPM municipal anual.</p>
                  </div>
                )}
                <div className="stat-card">
                  <h3 className="text-sm font-semibold text-foreground mb-3">Bovinos abatidos por trimestre — Goiás</h3>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={abateTrimestral} margin={{ left: 0, right: 10, top: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="trimestre" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" height={50} />
                      <YAxis tickFormatter={v => `${(v / 1000000).toFixed(1)}mi`} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => [`${(v / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} mil cabeças`, "Abate"]} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                      <Bar dataKey="valor" radius={[6, 6, 0, 0]}>
                        {abateTrimestral.map((d, i) => (
                          <Cell key={i} fill={d.ano >= 2025 ? "hsl(var(--primary))" : "#a3a3a3"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <p className="text-[10px] text-muted-foreground mt-2">Fonte: IBGE — Pesquisa Trimestral do Abate de Animais (tabela 1092). Barras coloridas = 2025.</p>
                </div>
              </section>
            )}

            {leiteTrimestral.length > 0 && (
              <section>
                <SectionHeader title="Leite Industrializado — Goiás (Trimestral)" icon={Milk} description="Pesquisa Trimestral do Leite — dados estaduais mais recentes" />
                <div className="stat-card">
                  <h3 className="text-sm font-semibold text-foreground mb-3">Leite industrializado por trimestre — Goiás (mil litros)</h3>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={leiteTrimestral} margin={{ left: 0, right: 10, top: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="trimestre" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" height={50} />
                      <YAxis tickFormatter={v => `${(v / 1000).toFixed(0)}mi`} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => [`${(v / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} mil litros`, "Leite"]} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                      <Bar dataKey="valor" radius={[6, 6, 0, 0]}>
                        {leiteTrimestral.map((d, i) => (
                          <Cell key={i} fill={d.ano >= 2025 ? "#0ea5e9" : "#a3a3a3"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <p className="text-[10px] text-muted-foreground mt-2">Fonte: IBGE — Pesquisa Trimestral do Leite (tabela 1086). Barras coloridas = 2025.</p>
                </div>
              </section>
            )}

            {/* ===== PRODUÇÃO DE LEITE ===== */}
            <section>
              <SectionHeader title="Produção de Leite" icon={Milk} description="Morrinhos: tradição leiteira reconhecida nacionalmente" />
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {leite && (
                  <div className="stat-card border-l-4 border-l-sky-500">
                    <span className="text-xs text-muted-foreground">Produção de leite {isLeiteEstimado ? "(estimativa)" : ""}</span>
                    <p className="text-2xl font-bold text-foreground mt-1">{leite.valor_texto}</p>
                    <p className="text-[10px] text-muted-foreground">{leite.unidade} • {leite.ano_referencia}</p>
                    {isLeiteEstimado && <p className="text-[10px] text-amber-600 mt-1">Estimativa baseada em vacas ordenhadas × produtividade média GO</p>}
                  </div>
                )}
                {leiteValor && (
                  <div className="stat-card border-l-4 border-l-emerald-500">
                    <span className="text-xs text-muted-foreground">Valor da produção de leite</span>
                    <p className="text-2xl font-bold text-foreground mt-1">{leiteValor.valor_texto}</p>
                    <p className="text-[10px] text-muted-foreground">{leiteValor.unidade} • {leiteValor.ano_referencia}</p>
                  </div>
                )}
                {vacasOrdenhadas && (
                  <div className="stat-card border-l-4 border-l-amber-500">
                    <span className="text-xs text-muted-foreground">Vacas ordenhadas</span>
                    <p className="text-2xl font-bold text-foreground mt-1">{vacasOrdenhadas.valor_texto}</p>
                    <p className="text-[10px] text-muted-foreground">{vacasOrdenhadas.unidade} • {vacasOrdenhadas.ano_referencia}</p>
                  </div>
                )}
              </div>

              {leite?.valor && vacasOrdenhadas?.valor && (
                <div className="stat-card mt-3 bg-sky-50 dark:bg-sky-950/20 border-sky-200 dark:border-sky-800">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="w-4 h-4 text-sky-600" />
                    <span className="text-sm font-semibold text-foreground">Produtividade leiteira</span>
                  </div>
                  <p className="text-lg font-bold text-sky-700 dark:text-sky-400">
                    {((leite.valor / vacasOrdenhadas.valor) * 1000).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} litros/vaca/ano
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Calculado: {leite.valor_texto} ÷ {vacasOrdenhadas.valor_texto} vacas
                  </p>
                </div>
              )}

              {(ovos || mel) && (
                <div className="mt-4">
                  <h3 className="text-sm font-semibold text-foreground mb-2">Outros produtos de origem animal</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {ovos && (
                      <div className="stat-card">
                        <span className="text-xs text-muted-foreground">Produção de ovos</span>
                        <p className="text-base font-bold text-foreground mt-1">{ovos.valor_texto}</p>
                        <p className="text-[10px] text-muted-foreground">{ovos.unidade}</p>
                      </div>
                    )}
                    {ovosValor && (
                      <div className="stat-card">
                        <span className="text-xs text-muted-foreground">Valor ovos</span>
                        <p className="text-base font-bold text-foreground mt-1">{ovosValor.valor_texto}</p>
                      </div>
                    )}
                    {mel && (
                      <div className="stat-card">
                        <span className="text-xs text-muted-foreground">Produção de mel</span>
                        <p className="text-base font-bold text-foreground mt-1">{mel.valor_texto}</p>
                        <p className="text-[10px] text-muted-foreground">{mel.unidade}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </section>

            {/* ===== LAVOURAS ===== */}
            <section>
              <SectionHeader title="Lavouras" icon={Leaf} description={`Produção Agrícola Municipal — PAM/IBGE ${ano}`} />
              {lavourasProducao.length > 0 && (
                <div className="stat-card mb-4">
                  <h3 className="text-sm font-semibold text-foreground mb-3">Produção por cultura (toneladas)</h3>
                  <ResponsiveContainer width="100%" height={Math.max(200, lavourasProducao.length * 44)}>
                    <BarChart data={lavourasProducao} layout="vertical" margin={{ left: 0, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis type="number" tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}mil` : String(v)} />
                      <YAxis type="category" dataKey="nome" width={80} tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(v: number) => [formatNum(v) + " ton", "Produção"]} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                      <Bar dataKey="producao" radius={[0, 6, 6, 0]}>
                        {lavourasProducao.map(l => <Cell key={l.chave} fill={l.cor} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <p className="text-[10px] text-muted-foreground mt-2">Fonte: IBGE — Produção Agrícola Municipal ({ano})</p>
                </div>
              )}

              {lavourasValor.length > 0 && (
                <div className="stat-card mb-4">
                  <h3 className="text-sm font-semibold text-foreground mb-3">Valor da produção por cultura (R$ mil)</h3>
                  <ResponsiveContainer width="100%" height={Math.max(200, lavourasValor.length * 44)}>
                    <BarChart data={lavourasValor} layout="vertical" margin={{ left: 0, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis type="number" tickFormatter={v => v >= 1000 ? `R$${(v/1000).toFixed(0)}mi` : `R$${v}mil`} />
                      <YAxis type="category" dataKey="nome" width={80} tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(v: number) => [`R$ ${formatNum(v)} mil`, "Valor"]} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                      <Bar dataKey="valor" radius={[0, 6, 6, 0]}>
                        {lavourasValor.map(l => <Cell key={l.chave} fill={l.cor} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              <div className="stat-card overflow-x-auto">
                <h3 className="text-sm font-semibold text-foreground mb-3">Detalhamento por cultura</h3>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground text-xs">
                      <th className="text-left py-2 pr-4">Cultura</th>
                      <th className="text-right py-2 px-2">Produção</th>
                      <th className="text-right py-2 px-2">Área</th>
                      <th className="text-right py-2 px-2">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lavourasProducao.map(l => (
                      <tr key={l.chave} className="border-b border-border/50 last:border-0">
                        <td className="py-2 pr-4 font-medium text-foreground flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: l.cor }} />
                          {l.nome}
                        </td>
                        <td className="text-right py-2 px-2 text-foreground">{l.producaoTexto}</td>
                        <td className="text-right py-2 px-2 text-muted-foreground">{l.areaTexto}</td>
                        <td className="text-right py-2 px-2 text-foreground">{l.valorTexto}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {valorTotalLavouras > 0 && (
                <div className="stat-card mt-3 bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-semibold text-foreground">Valor total das lavouras</span>
                  </div>
                  <p className="text-lg font-bold text-green-700 dark:text-green-400 mt-1">
                    R$ {(valorTotalLavouras / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} milhões
                  </p>
                  <p className="text-[10px] text-muted-foreground">Soma do valor bruto de todas as culturas listadas</p>
                </div>
              )}
            </section>

            {/* Fontes */}
            <section className="stat-card bg-muted/30">
              <h3 className="text-sm font-semibold text-foreground mb-2">Fontes oficiais</h3>
              <div className="space-y-2 text-xs text-muted-foreground">
                <p>
                  Os dados desta página são obtidos automaticamente via API SIDRA do IBGE (Pesquisa Pecuária Municipal — PPM
                  e Produção Agrícola Municipal — PAM), referentes ao ano de <strong>{ano}</strong>.
                  Os comparativos regionais incluem municípios vizinhos: Goiatuba, Joviânia, Bom Jesus de Goiás, Morrinhos, Cromínia e Orizona.
                </p>
                <div className="flex flex-wrap gap-3 mt-2">
                  <a href="https://cidades.ibge.gov.br/brasil/go/morrinhos/pesquisa/18/16459" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                    <ExternalLink className="w-3 h-3" /> PPM — Pecuária
                  </a>
                  <a href="https://cidades.ibge.gov.br/brasil/go/morrinhos/pesquisa/24/76693" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                    <ExternalLink className="w-3 h-3" /> PAM — Lavouras
                  </a>
                  <a href="https://sidra.ibge.gov.br/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                    <ExternalLink className="w-3 h-3" /> SIDRA/IBGE
                  </a>
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </Layout>
  );
}

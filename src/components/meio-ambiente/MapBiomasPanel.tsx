"use client";

import { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  Trees,
  Wheat,
  Beef,
  Building2,
  Droplets,
  TrendingUp,
  TrendingDown,
  Info,
  ExternalLink,
} from "lucide-react";

type Row = {
  ano: number;
  classe_id: number;
  classe_nome: string;
  categoria: string;
  cor_hex: string | null;
  area_ha: number;
};

// Categorias agregadas com cores e icones
const CATEGORIAS = [
  { key: "floresta",    label: "Floresta nativa",   icon: Trees,     cor: "#1f8d49" },
  { key: "cerrado",     label: "Cerrado/Savana",    icon: Trees,     cor: "#7dc975" },
  { key: "pastagem",    label: "Pastagem",          icon: Beef,      cor: "#edde8e" },
  { key: "agricultura", label: "Agricultura",       icon: Wheat,     cor: "#e7a4ad" },
  { key: "mosaico",     label: "Mosaico de Usos",   icon: Wheat,     cor: "#e974ed" },
  { key: "urbano",      label: "Área Urbana",       icon: Building2, cor: "#d4271e" },
  { key: "agua",        label: "Água",              icon: Droplets,  cor: "#0000ff" },
  { key: "outros",      label: "Outros",            icon: Info,      cor: "#999999" },
] as const;

const CAT_COLOR: Record<string, string> = Object.fromEntries(
  CATEGORIAS.map((c) => [c.key, c.cor]),
);

function fmt(ha: number): string {
  if (ha >= 1000) return `${(ha / 1000).toFixed(1)} mil ha`;
  return `${Math.round(ha)} ha`;
}

function fmtPct(n: number): string {
  return `${n >= 0 ? "+" : ""}${n.toFixed(0)}%`;
}

export default function MapBiomasPanel({ rows }: { rows: Row[] }) {
  const { chartData, snapshot1985, snapshot2024, totalHa, mudancas } = useMemo(() => {
    // Agrupa por (ano, categoria)
    const porAnoCategoria: Record<number, Record<string, number>> = {};
    for (const r of rows) {
      porAnoCategoria[r.ano] = porAnoCategoria[r.ano] ?? {};
      porAnoCategoria[r.ano][r.categoria] = (porAnoCategoria[r.ano][r.categoria] ?? 0) + r.area_ha;
    }

    const anos = Object.keys(porAnoCategoria).map(Number).sort((a, b) => a - b);
    const chartData = anos.map((ano) => {
      const row: Record<string, number | string> = { ano };
      for (const cat of CATEGORIAS) {
        row[cat.key] = porAnoCategoria[ano][cat.key] ?? 0;
      }
      return row;
    });

    const snap85 = porAnoCategoria[1985] || {};
    const snap24 = porAnoCategoria[2024] || {};
    const total = CATEGORIAS.reduce((s, c) => s + (snap24[c.key] ?? 0), 0);

    // Calcula mudanças por categoria
    const mudancasCalc = CATEGORIAS.map((c) => {
      const v85 = snap85[c.key] ?? 0;
      const v24 = snap24[c.key] ?? 0;
      const diff = v24 - v85;
      const pct = v85 > 0 ? ((v24 - v85) / v85) * 100 : v24 > 0 ? Infinity : 0;
      return { ...c, v85, v24, diff, pct, pct_total: total > 0 ? (v24 / total) * 100 : 0 };
    });

    return {
      chartData,
      snapshot1985: snap85,
      snapshot2024: snap24,
      totalHa: total,
      mudancas: mudancasCalc,
    };
  }, [rows]);

  // Insights ordenados pela maior mudança absoluta
  const topMudancas = [...mudancas]
    .filter((m) => Math.abs(m.diff) > 100)
    .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));

  return (
    <div className="space-y-6">
      {/* Header */}
      <header>
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Trees className="w-5 h-5 text-emerald-700" />
          Uso e cobertura do solo · 1985–2024
        </h2>
        <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
          Como o território de Morrinhos mudou em 40 anos. Dados oficiais do{" "}
          <a
            href="https://brasil.mapbiomas.org/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline inline-flex items-center gap-1"
          >
            MapBiomas Coleção 10.1 <ExternalLink className="w-3 h-3" />
          </a>
          {" "}— reanálise de imagens Landsat por satélite. Total do município:{" "}
          <strong>{fmt(totalHa)}</strong> ({(totalHa / 100).toFixed(0)} km²).
        </p>
      </header>

      {/* Cards principais — comparativo 1985 vs 2024 */}
      <section>
        <h3 className="text-base font-semibold text-foreground mb-3">
          Como o solo era em 1985 vs hoje (2024)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {topMudancas.slice(0, 8).map((m) => {
            const Icon = m.icon;
            const isPositive = m.diff > 0;
            const isMata = m.key === "floresta" || m.key === "cerrado";
            // pra floresta/cerrado, perda é ruim (vermelho); pra agricultura/urbano, ganho é "expansão"
            const colorClass = isMata
              ? isPositive
                ? "border-green-500/30 bg-green-500/5 text-green-700"
                : "border-red-500/30 bg-red-500/5 text-red-600"
              : isPositive
              ? "border-amber-500/30 bg-amber-500/5 text-amber-700"
              : "border-slate-300/30 bg-slate-100/40 text-slate-700 dark:bg-slate-800/40 dark:text-slate-300";
            return (
              <div
                key={m.key}
                className={`stat-card border ${colorClass}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="w-4 h-4" />
                  <span className="text-xs uppercase tracking-wider opacity-80">
                    {m.label}
                  </span>
                </div>
                <p className="text-xl font-extrabold">{fmt(m.v24)}</p>
                <p className="text-[11px] opacity-80 mt-0.5">
                  Era {fmt(m.v85)} em 1985
                </p>
                <p className="text-xs font-semibold mt-1.5 inline-flex items-center gap-1">
                  {isPositive ? (
                    <TrendingUp className="w-3.5 h-3.5" />
                  ) : (
                    <TrendingDown className="w-3.5 h-3.5" />
                  )}
                  {Number.isFinite(m.pct) ? fmtPct(m.pct) : "novo desde 1985"}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Gráfico stacked area — evolução temporal */}
      <section>
        <h3 className="text-base font-semibold text-foreground mb-1">
          Evolução do uso do solo — 40 anos
        </h3>
        <p className="text-xs text-muted-foreground mb-3">
          Cada cor representa uma categoria de uso. Empilhado mostra como{" "}
          <strong>1 categoria avança e outra recua</strong> ao longo dos anos.
        </p>
        <div className="stat-card">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 8, right: 10, bottom: 0, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis
                  dataKey="ano"
                  tick={{ fontSize: 10 }}
                  ticks={[1985, 1990, 1995, 2000, 2005, 2010, 2015, 2020, 2024]}
                />
                <YAxis
                  tick={{ fontSize: 10 }}
                  tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
                  width={42}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(value: number, name: string) => {
                    const cat = CATEGORIAS.find((c) => c.key === name);
                    return [`${fmt(value)}`, cat?.label || name];
                  }}
                  labelFormatter={(label) => `Ano ${label}`}
                />
                <Legend
                  wrapperStyle={{ fontSize: 11, paddingTop: 4 }}
                  formatter={(value: string) => {
                    const cat = CATEGORIAS.find((c) => c.key === value);
                    return cat?.label || value;
                  }}
                />
                {CATEGORIAS.map((cat) => (
                  <Area
                    key={cat.key}
                    type="monotone"
                    dataKey={cat.key}
                    stackId="1"
                    name={cat.key}
                    fill={cat.cor}
                    stroke={cat.cor}
                    fillOpacity={0.85}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Distribuição atual em barra horizontal */}
      <section>
        <h3 className="text-base font-semibold text-foreground mb-3">
          Distribuição atual (2024)
        </h3>
        <div className="stat-card">
          <div className="space-y-2">
            {mudancas
              .filter((m) => m.v24 > 0)
              .sort((a, b) => b.v24 - a.v24)
              .map((m) => {
                const pct = m.pct_total;
                return (
                  <div key={m.key} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-foreground inline-flex items-center gap-1.5">
                        <span
                          className="w-3 h-3 rounded-sm shrink-0"
                          style={{ backgroundColor: m.cor }}
                          aria-hidden
                        />
                        {m.label}
                      </span>
                      <span className="text-muted-foreground tabular-nums">
                        <strong className="text-foreground">{fmt(m.v24)}</strong>
                        {" · "}
                        {pct.toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.max(pct, 0.5)}%`,
                          backgroundColor: m.cor,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </section>

      {/* Insights / story */}
      <section className="stat-card border-emerald-700/20 bg-gradient-to-br from-emerald-700/5 to-transparent">
        <h3 className="text-base font-semibold text-foreground mb-2 flex items-center gap-1.5">
          <Info className="w-4 h-4 text-emerald-700" />
          O que esses dados nos contam
        </h3>
        <ul className="text-sm text-foreground/85 space-y-2.5 leading-relaxed list-none">
          {(() => {
            const florM = mudancas.find((m) => m.key === "floresta");
            const cerrM = mudancas.find((m) => m.key === "cerrado");
            const pastM = mudancas.find((m) => m.key === "pastagem");
            const agriM = mudancas.find((m) => m.key === "agricultura");
            const urbM = mudancas.find((m) => m.key === "urbano");
            const insights: string[] = [];
            if (florM && florM.diff < 0) {
              insights.push(
                `🌲 Morrinhos perdeu ${fmt(Math.abs(florM.diff))} de floresta nativa em 40 anos (${fmtPct(florM.pct)}).`
              );
            }
            if (cerrM && cerrM.diff < 0) {
              insights.push(
                `🌾 O Cerrado/Savana recuou ${fmt(Math.abs(cerrM.diff))} (${fmtPct(cerrM.pct)}) — bioma mais ameaçado do Brasil.`
              );
            }
            if (agriM && agriM.diff > 1000) {
              insights.push(
                `🌱 Agricultura cresceu ${fmt(agriM.diff)} (${fmtPct(agriM.pct)}) — Morrinhos virou polo agrícola.`
              );
            }
            if (pastM && pastM.diff < 0) {
              insights.push(
                `🐄 Pastagem reduziu ${fmt(Math.abs(pastM.diff))} (${fmtPct(pastM.pct)}) — terras migrando da pecuária pra agricultura.`
              );
            }
            if (urbM && urbM.diff > 100) {
              insights.push(
                `🏘️ Área urbana cresceu ${fmtPct(urbM.pct)} — expansão da cidade nesses 40 anos.`
              );
            }
            return insights.map((i, idx) => <li key={idx}>{i}</li>);
          })()}
        </ul>
      </section>

      <p className="text-[10px] text-muted-foreground italic leading-relaxed">
        Fonte: MapBiomas Coleção 10.1 (lançada fev/2026), reanálise anual de imagens Landsat
        com classificação por inteligência artificial. 14 classes de cobertura do MapBiomas
        agrupadas em 8 categorias para visualização. Atualização anual conforme nova coleção.
      </p>
    </div>
  );
}

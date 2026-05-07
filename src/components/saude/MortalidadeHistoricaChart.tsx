"use client";

import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Baby, TrendingDown, ExternalLink } from "lucide-react";

type Row = { ano: number; valor: number };

/**
 * Grafico Mortalidade Infantil + Geral — serie historica 30 anos (1996-2026).
 * Mostra a tendencia de melhoria da saude publica em Morrinhos.
 */
export default function MortalidadeHistoricaChart({
  infantil,
  geral,
}: {
  infantil: Row[];
  geral: Row[];
}) {
  // Merge por ano
  const anos = new Set<number>();
  for (const r of infantil) anos.add(r.ano);
  for (const r of geral) anos.add(r.ano);
  const data = Array.from(anos)
    .sort((a, b) => a - b)
    .filter((ano) => ano >= 1996 && ano <= new Date().getFullYear())
    .map((ano) => {
      const inf = infantil.find((r) => r.ano === ano);
      const g = geral.find((r) => r.ano === ano);
      return {
        ano,
        infantil: inf?.valor ?? null,
        geral: g?.valor ?? null,
      };
    });

  // Stats
  const totalInfantil = infantil.reduce((s, r) => s + (r.valor || 0), 0);
  const totalGeral = geral.reduce((s, r) => s + (r.valor || 0), 0);
  const ultimoInfantil = infantil.filter((r) => r.valor > 0).at(-1);
  const ultimoGeral = geral.filter((r) => r.valor > 0).at(-1);
  const primeiroInfantil = infantil.find((r) => r.valor > 0);

  // Trend da mortalidade infantil (compara primeiros 5 anos com ultimos 5)
  const primeiros5 = infantil.filter((r) => r.ano >= 1996 && r.ano <= 2000);
  const ultimos5 = infantil.filter((r) => r.ano >= 2020 && r.ano <= 2025 && r.valor > 0);
  const mediaPrimeiros = primeiros5.length
    ? primeiros5.reduce((s, r) => s + r.valor, 0) / primeiros5.length
    : 0;
  const mediaUltimos = ultimos5.length
    ? ultimos5.reduce((s, r) => s + r.valor, 0) / ultimos5.length
    : 0;
  const melhoria = mediaPrimeiros > 0 ? ((mediaUltimos - mediaPrimeiros) / mediaPrimeiros) * 100 : 0;

  return (
    <div className="stat-card border-pink-500/20 bg-gradient-to-br from-pink-500/5 via-transparent to-slate-500/5">
      <div className="mb-3">
        <h3 className="font-semibold text-foreground text-base flex items-center gap-2">
          <Baby className="w-4 h-4 text-pink-500" />
          Mortalidade em Morrinhos — 30 anos
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
          Série histórica 1996-{new Date().getFullYear()} de óbitos infantis e gerais.
          Mortalidade infantil é o principal indicador de qualidade da saúde pública municipal —
          mostra a tendência de melhoria do acesso a pré-natal, parto seguro e atenção primária.
        </p>
      </div>

      {/* Stats compactos */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className="stat-card border-pink-500/30">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Óbitos infantis (30 anos)</p>
          <p className="text-xl font-extrabold text-foreground mt-0.5">{totalInfantil}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">crianças &lt;1 ano</p>
        </div>
        <div className="stat-card border-slate-500/30">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Óbitos totais (30 anos)</p>
          <p className="text-xl font-extrabold text-foreground mt-0.5">{totalGeral.toLocaleString("pt-BR")}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">todas as idades</p>
        </div>
        {ultimoInfantil && (
          <div className="stat-card">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Último ano</p>
            <p className="text-xl font-extrabold text-foreground mt-0.5">
              {ultimoInfantil.valor} <span className="text-xs font-normal">infantis</span>
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{ultimoInfantil.ano}</p>
          </div>
        )}
        {melhoria < 0 && primeiroInfantil && (
          <div className="stat-card border-green-500/30 bg-green-500/5 text-green-700 dark:text-green-400">
            <p className="text-[10px] uppercase tracking-wider opacity-80">Tendência</p>
            <p className="text-xl font-extrabold mt-0.5 inline-flex items-center gap-1">
              <TrendingDown className="w-4 h-4" />
              {melhoria.toFixed(0)}%
            </p>
            <p className="text-[10px] opacity-80 mt-0.5">
              vs média 96-2000 ({mediaPrimeiros.toFixed(0)} óbitos/ano)
            </p>
          </div>
        )}
      </div>

      {/* Grafico */}
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 10, bottom: 0, left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis dataKey="ano" tick={{ fontSize: 10 }} />
            <YAxis
              yAxisId="infantil"
              orientation="left"
              tick={{ fontSize: 10, fill: "hsl(330, 81%, 60%)" }}
              width={36}
            />
            <YAxis
              yAxisId="geral"
              orientation="right"
              tick={{ fontSize: 10, fill: "hsl(215, 20%, 50%)" }}
              width={42}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(value: number | null, name: string) => {
                if (value === null) return ["—", name];
                return [`${value} óbitos`, name];
              }}
              labelFormatter={(label) => `Ano ${label}`}
            />
            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 4 }} iconType="line" />
            <Bar
              yAxisId="infantil"
              dataKey="infantil"
              name="Óbitos infantis (<1 ano)"
              fill="hsl(330, 81%, 60%)"
              fillOpacity={0.85}
              radius={[2, 2, 0, 0]}
            />
            <Line
              yAxisId="geral"
              type="monotone"
              dataKey="geral"
              name="Óbitos totais (todas idades)"
              stroke="hsl(215, 20%, 40%)"
              strokeWidth={2}
              dot={{ r: 2, fill: "hsl(215, 20%, 40%)" }}
              activeDot={{ r: 4 }}
              connectNulls
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <p className="text-[10px] text-muted-foreground mt-3 leading-relaxed">
        Eixo esquerdo (rosa): óbitos infantis. Eixo direito (cinza): óbitos totais.
        Fonte:{" "}
        <a
          href="http://tabnet.datasus.gov.br/cgi/deftohtm.exe?sim/cnv/obt10GO.def"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline inline-flex items-center gap-1"
        >
          DATASUS/SIM — TabNet Goiás <ExternalLink className="w-2.5 h-2.5" />
        </a>
      </p>
    </div>
  );
}

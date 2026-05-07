"use client";

import { useMemo } from "react";
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
import { Activity, Skull, ExternalLink } from "lucide-react";

type CovidRow = {
  ano: number;
  mes: number;
  internacoes: number;
  obitos: number;
  internacoes_srag: number;
};

const MESES_CURTOS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

/**
 * Grafico COVID-19 em Morrinhos — serie mensal 2020-2026.
 * Mostra a "narrativa visual" da pandemia local: 1ª onda, 2ª onda Gamma,
 * Omicron e o esfriamento atual.
 */
export default function CovidMorrinhosChart({ rows }: { rows: CovidRow[] }) {
  const { data, totals } = useMemo(() => {
    const data = rows.map((r) => ({
      label: `${MESES_CURTOS[r.mes - 1]}/${String(r.ano).slice(2)}`,
      ano: r.ano,
      mes: r.mes,
      internacoes: r.internacoes,
      obitos: r.obitos,
      srag: r.internacoes_srag,
    }));
    const totals = {
      internacoes: rows.reduce((s, r) => s + r.internacoes, 0),
      obitos: rows.reduce((s, r) => s + r.obitos, 0),
      srag: rows.reduce((s, r) => s + r.internacoes_srag, 0),
      pico_internacoes: rows.reduce(
        (max, r) => (r.internacoes > max.v ? { v: r.internacoes, ano: r.ano, mes: r.mes } : max),
        { v: 0, ano: 0, mes: 0 },
      ),
      pico_obitos: rows.reduce(
        (max, r) => (r.obitos > max.v ? { v: r.obitos, ano: r.ano, mes: r.mes } : max),
        { v: 0, ano: 0, mes: 0 },
      ),
    };
    return { data, totals };
  }, [rows]);

  if (data.length === 0) {
    return (
      <div className="stat-card text-sm text-muted-foreground">
        Sem dados de COVID-19 disponíveis ainda.
      </div>
    );
  }

  return (
    <div className="stat-card border-purple-500/20 bg-gradient-to-br from-purple-500/5 via-transparent to-red-500/5">
      <div className="mb-3">
        <h3 className="font-semibold text-foreground text-base flex items-center gap-2">
          <Activity className="w-4 h-4 text-purple-500" />
          COVID-19 em Morrinhos · 2020-{new Date().getFullYear()}
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
          Internações por SRAG, internações por COVID-19 e óbitos por COVID-19, dados mensais.
          Captura as ondas pandêmicas locais e a queda atual com vacinação consolidada.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className="stat-card border-purple-500/30">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Internações COVID</p>
          <p className="text-xl font-extrabold text-foreground mt-0.5">{totals.internacoes}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">total acumulado</p>
        </div>
        <div className="stat-card border-red-500/30">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground inline-flex items-center gap-1">
            <Skull className="w-3 h-3" /> Óbitos COVID
          </p>
          <p className="text-xl font-extrabold text-red-600 mt-0.5">{totals.obitos}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">total acumulado</p>
        </div>
        <div className="stat-card">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">SRAG</p>
          <p className="text-xl font-extrabold text-foreground mt-0.5">{totals.srag}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">síndrome resp. aguda grave</p>
        </div>
        {totals.pico_internacoes.v > 0 && (
          <div className="stat-card border-amber-500/30 bg-amber-500/5">
            <p className="text-[10px] uppercase tracking-wider opacity-80">Pico</p>
            <p className="text-xl font-extrabold mt-0.5">{totals.pico_internacoes.v}</p>
            <p className="text-[10px] opacity-80 mt-0.5">
              internações em {MESES_CURTOS[totals.pico_internacoes.mes - 1]}/{totals.pico_internacoes.ano}
            </p>
          </div>
        )}
      </div>

      {/* Grafico */}
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 10, bottom: 0, left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 9 }}
              interval={5}
            />
            <YAxis
              yAxisId="internacoes"
              orientation="left"
              tick={{ fontSize: 10, fill: "hsl(262, 83%, 58%)" }}
              width={36}
            />
            <YAxis
              yAxisId="obitos"
              orientation="right"
              tick={{ fontSize: 10, fill: "hsl(0, 84%, 60%)" }}
              width={32}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(value: number, name: string) => {
                return [value, name];
              }}
            />
            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 4 }} iconType="line" />
            <Bar
              yAxisId="internacoes"
              dataKey="srag"
              name="SRAG"
              fill="hsl(215, 20%, 60%)"
              fillOpacity={0.6}
              radius={[2, 2, 0, 0]}
            />
            <Bar
              yAxisId="internacoes"
              dataKey="internacoes"
              name="Internações COVID"
              fill="hsl(262, 83%, 58%)"
              fillOpacity={0.85}
              radius={[2, 2, 0, 0]}
            />
            <Line
              yAxisId="obitos"
              type="monotone"
              dataKey="obitos"
              name="Óbitos COVID"
              stroke="hsl(0, 84%, 50%)"
              strokeWidth={2.5}
              dot={{ r: 2, fill: "hsl(0, 84%, 50%)" }}
              activeDot={{ r: 5 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <p className="text-[10px] text-muted-foreground mt-3 leading-relaxed">
        Eixo esquerdo (roxo): internações. Eixo direito (vermelho): óbitos. Fonte:{" "}
        <a
          href="https://opendatasus.saude.gov.br/dataset/srag-2021-e-2022"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline inline-flex items-center gap-1"
        >
          OpenDataSUS / SIVEP-Gripe <ExternalLink className="w-2.5 h-2.5" />
        </a>
        . SRAG inclui COVID-19, gripe (influenza) e outros vírus respiratórios.
      </p>
    </div>
  );
}

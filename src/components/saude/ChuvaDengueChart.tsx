"use client";

import { useMemo } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { CloudRain } from "lucide-react";

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

type CasoMes = { mes: number; valor: number };

/**
 * Chart Chuva x Casos de Dengue.
 *
 * IMPORTANTE: nao chama mais Open-Meteo direto do browser. Os dados de chuva
 * vem por props do server (que le da tabela clima_historico_mensal, populada
 * pelo cron weekly sync-clima-historico). Isso evita:
 * - HTTP 400 quando end_date > hoje
 * - rate limits do Open-Meteo
 * - latencia visivel pro user (era 1-2s de loading)
 */
export default function ChuvaDengueChart({
  casosPorMes,
  chuvaPorMes,
  ano,
}: {
  casosPorMes: CasoMes[];
  chuvaPorMes: Record<number, number>;
  ano: number;
}) {
  const chartData = useMemo(() => {
    const casosMap: Record<number, number> = {};
    for (const c of casosPorMes) casosMap[c.mes] = c.valor;
    return Array.from({ length: 12 }, (_, i) => {
      const m = i + 1;
      return {
        mes: MESES[i],
        chuva: Math.round((chuvaPorMes[m] ?? 0) * 10) / 10,
        casos: casosMap[m] ?? 0,
      };
    });
  }, [chuvaPorMes, casosPorMes]);

  const totalChuva = chartData.reduce((s, d) => s + d.chuva, 0);
  const totalCasos = chartData.reduce((s, d) => s + d.casos, 0);

  return (
    <div className="stat-card border-sky-500/20 bg-gradient-to-br from-sky-500/5 via-transparent to-red-500/5">
      <div className="flex items-start justify-between gap-3 mb-1">
        <div>
          <h3 className="font-semibold text-foreground text-base flex items-center gap-2">
            <CloudRain className="w-4 h-4 text-sky-500" />
            Chuvas × Casos de Dengue · {ano}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Correlação mensal entre precipitação acumulada (mm) e casos confirmados de dengue.
            Períodos de muita chuva costumam preceder picos de dengue em 2 a 6 semanas.
          </p>
        </div>
      </div>

      {/* Stats compactos */}
      <div className="flex flex-wrap gap-3 mb-4 mt-3">
        <div className="inline-flex items-center gap-2 text-xs">
          <span className="w-3 h-3 rounded-full bg-sky-500" aria-hidden />
          <span className="text-muted-foreground">Total chuva no ano:</span>
          <span className="font-semibold text-foreground">{Math.round(totalChuva)} mm</span>
        </div>
        <div className="inline-flex items-center gap-2 text-xs">
          <span className="w-3 h-3 rounded-full bg-red-500" aria-hidden />
          <span className="text-muted-foreground">Total casos no ano:</span>
          <span className="font-semibold text-foreground">{totalCasos}</span>
        </div>
      </div>

      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 8, right: 10, bottom: 0, left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
            <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
            <YAxis
              yAxisId="chuva"
              orientation="left"
              tick={{ fontSize: 10, fill: "hsl(199, 89%, 48%)" }}
              tickFormatter={(v: number) => `${v}mm`}
              width={48}
            />
            <YAxis
              yAxisId="casos"
              orientation="right"
              tick={{ fontSize: 10, fill: "hsl(0, 84%, 60%)" }}
              allowDecimals={false}
              width={36}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(value: number, name: string) => {
                if (name === "Chuva (mm)") return [`${value.toFixed(1)} mm`, "Chuva"];
                if (name === "Casos de Dengue") return [`${value} casos`, "Dengue"];
                return [value, name];
              }}
              labelFormatter={(label) => `${label}/${ano}`}
            />
            <Legend
              wrapperStyle={{ fontSize: 12, paddingTop: 4 }}
              iconType="line"
            />
            <Line
              yAxisId="chuva"
              type="monotone"
              dataKey="chuva"
              name="Chuva (mm)"
              stroke="hsl(199, 89%, 48%)"
              strokeWidth={2.5}
              dot={{ r: 3, fill: "hsl(199, 89%, 48%)" }}
              activeDot={{ r: 5 }}
            />
            <Line
              yAxisId="casos"
              type="monotone"
              dataKey="casos"
              name="Casos de Dengue"
              stroke="hsl(0, 84%, 60%)"
              strokeWidth={2.5}
              dot={{ r: 3, fill: "hsl(0, 84%, 60%)" }}
              activeDot={{ r: 5 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <p className="text-[10px] text-muted-foreground mt-3 leading-relaxed">
        Eixo esquerdo (azul): chuva mensal acumulada em mm. Eixo direito (vermelho): casos
        confirmados de dengue. Fontes: Open-Meteo (precipitação histórica, sync semanal) +
        InfoDengue/Ministério da Saúde (casos).
      </p>
    </div>
  );
}

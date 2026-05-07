"use client";

import { useMemo } from "react";
import { Cloud, CloudRain, Droplets, Sun, Wind, Thermometer } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import type { ClimaDia, ResumoMes } from "@/lib/data/clima";

function shortDate(s: string) {
  const [, m, d] = s.split("-");
  return `${d}/${m}`;
}

export default function ClimaClient({
  dias,
  resumo,
}: {
  dias: ClimaDia[];
  resumo: ResumoMes | null;
}) {
  const dataChart = useMemo(
    () =>
      dias.map((d) => ({
        data: shortDate(d.data),
        chuva: Number(d.precipitacao_mm ?? 0),
        tmax: Number(d.temperatura_max ?? 0),
        tmin: Number(d.temperatura_min ?? 0),
        tmed: Number(d.temperatura_media ?? 0),
        umid: Number(d.umidade_media ?? 0),
      })),
    [dias],
  );

  const ultimoDia = dias[dias.length - 1];
  const ultimoChuva = Number(ultimoDia?.precipitacao_mm ?? 0);

  return (
    <div className="space-y-8">
      {/* Hero — clima atual */}
      <section className="stat-card border-sky-500/30 bg-gradient-to-br from-sky-500/10 to-transparent">
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-3">
            {ultimoChuva > 1 ? (
              <CloudRain className="w-12 h-12 text-sky-500" />
            ) : ultimoChuva > 0.1 ? (
              <Cloud className="w-12 h-12 text-sky-400" />
            ) : (
              <Sun className="w-12 h-12 text-amber-500" />
            )}
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Hoje em Morrinhos</p>
              <p className="text-4xl font-extrabold text-foreground">
                {Math.round(Number(ultimoDia?.temperatura_media ?? 0))}°C
              </p>
              <p className="text-xs text-muted-foreground">
                Mín {Math.round(Number(ultimoDia?.temperatura_min ?? 0))}° · Máx{" "}
                {Math.round(Number(ultimoDia?.temperatura_max ?? 0))}°
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="inline-flex items-center gap-2">
              <CloudRain className="w-4 h-4 text-sky-500" />
              <span className="text-muted-foreground">Chuva:</span>
              <span className="font-semibold text-foreground">{ultimoChuva.toFixed(1)} mm</span>
            </div>
            <div className="inline-flex items-center gap-2">
              <Droplets className="w-4 h-4 text-sky-400" />
              <span className="text-muted-foreground">Umidade:</span>
              <span className="font-semibold text-foreground">
                {Math.round(Number(ultimoDia?.umidade_media ?? 0))}%
              </span>
            </div>
            <div className="inline-flex items-center gap-2">
              <Wind className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Vento:</span>
              <span className="font-semibold text-foreground">
                {Math.round(Number(ultimoDia?.vento_velocidade_max ?? 0))} km/h
              </span>
            </div>
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground mt-3">
          Fonte: Open-Meteo. Atualizado diariamente.
        </p>
      </section>

      {/* Resumo do mês */}
      {resumo && (
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="stat-card text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Chuva no mês</p>
            <p className="text-2xl font-extrabold text-sky-500 mt-1">{resumo.acumulado_mm} mm</p>
            <p className="text-[10px] text-muted-foreground">{resumo.dias_com_chuva} dias com chuva</p>
          </div>
          <div className="stat-card text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Temp. média</p>
            <p className="text-2xl font-extrabold text-emerald-500 mt-1">{resumo.temperatura_media}°C</p>
            <p className="text-[10px] text-muted-foreground">no mês</p>
          </div>
          <div className="stat-card text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Máxima</p>
            <p className="text-2xl font-extrabold text-orange-500 mt-1">
              {Math.round(resumo.temperatura_max_absoluta)}°C
            </p>
            <p className="text-[10px] text-muted-foreground">no mês</p>
          </div>
          <div className="stat-card text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Mínima</p>
            <p className="text-2xl font-extrabold text-sky-600 mt-1">
              {Math.round(resumo.temperatura_min_absoluta)}°C
            </p>
            <p className="text-[10px] text-muted-foreground">no mês</p>
          </div>
        </section>
      )}

      {/* Gráfico chuva */}
      <section>
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-3">
          <CloudRain className="w-5 h-5 text-sky-500" /> Chuva diária (últimos {dias.length} dias)
        </h2>
        <div className="stat-card h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dataChart} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="data" fontSize={11} />
              <YAxis fontSize={11} unit=" mm" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(v: number) => [`${v.toFixed(1)} mm`, "Chuva"]}
              />
              <Bar dataKey="chuva" fill="hsl(199, 89%, 48%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Gráfico temperatura */}
      <section>
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-3">
          <Thermometer className="w-5 h-5 text-orange-500" /> Temperatura diária (últimos {dias.length} dias)
        </h2>
        <div className="stat-card h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dataChart} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="data" fontSize={11} />
              <YAxis fontSize={11} unit="°C" domain={["dataMin - 2", "dataMax + 2"]} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(v: number, name: string) => [`${v.toFixed(1)}°C`, name === "tmax" ? "Máxima" : name === "tmin" ? "Mínima" : "Média"]}
              />
              <ReferenceLine y={28} stroke="hsl(20, 90%, 50%)" strokeDasharray="3 3" opacity={0.4} />
              <Line type="monotone" dataKey="tmax" stroke="hsl(20, 90%, 55%)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="tmed" stroke="hsl(160, 60%, 45%)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="tmin" stroke="hsl(199, 89%, 48%)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          🟧 Máxima · 🟢 Média · 🟦 Mínima
        </p>
      </section>
    </div>
  );
}

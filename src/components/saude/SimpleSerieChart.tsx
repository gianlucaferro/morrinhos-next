"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import type { LucideIcon } from "lucide-react";
import { ExternalLink } from "lucide-react";

type Row = { ano: number; valor: number };

/**
 * Componente reutilizavel pra series temporais simples ano-a-ano.
 * Usado em: Tuberculose obitos, DDA internacoes, etc.
 */
export default function SimpleSerieChart({
  titulo,
  descricao,
  rows,
  icon: Icon,
  iconColor,
  borderColor,
  bgGradient,
  cor,
  unidade,
  fonteUrl,
  fonteLabel,
  variant = "line",
}: {
  titulo: string;
  descricao: string;
  rows: Row[];
  icon: LucideIcon;
  iconColor: string;
  borderColor: string;
  bgGradient: string;
  cor: string; // hex pra linha
  unidade: string; // "óbitos", "internações por 100k hab"
  fonteUrl?: string;
  fonteLabel?: string;
  variant?: "line" | "area";
}) {
  if (rows.length === 0) return null;

  const total = rows.reduce((s, r) => s + (r.valor || 0), 0);
  const ultimo = rows.filter((r) => r.valor > 0).at(-1);
  const primeiro = rows.find((r) => r.valor > 0);
  const diff =
    primeiro && ultimo && primeiro.valor > 0
      ? ((ultimo.valor - primeiro.valor) / primeiro.valor) * 100
      : null;

  return (
    <div className={`stat-card border ${borderColor} ${bgGradient}`}>
      <div className="mb-3">
        <h3 className="font-semibold text-foreground text-base flex items-center gap-2">
          <Icon className={`w-4 h-4 ${iconColor}`} />
          {titulo}
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
          {descricao}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
        <div className="stat-card">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Total no período</p>
          <p className="text-xl font-extrabold text-foreground mt-0.5">{Math.round(total)}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{unidade}</p>
        </div>
        {ultimo && (
          <div className="stat-card">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Último ano</p>
            <p className="text-xl font-extrabold text-foreground mt-0.5">{ultimo.valor}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{ultimo.ano}</p>
          </div>
        )}
        {diff !== null && (
          <div
            className={`stat-card ${
              diff < 0
                ? "border-green-500/30 bg-green-500/5 text-green-700 dark:text-green-400"
                : "border-amber-500/30 bg-amber-500/5 text-amber-700"
            }`}
          >
            <p className="text-[10px] uppercase tracking-wider opacity-80">Variação</p>
            <p className="text-xl font-extrabold mt-0.5">
              {diff >= 0 ? "+" : ""}
              {diff.toFixed(0)}%
            </p>
            <p className="text-[10px] opacity-80 mt-0.5">
              {primeiro?.ano} ({primeiro?.valor}) → {ultimo?.ano} ({ultimo?.valor})
            </p>
          </div>
        )}
      </div>

      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          {variant === "area" ? (
            <AreaChart data={rows} margin={{ top: 8, right: 10, bottom: 0, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="ano" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} width={36} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(v: number) => [`${v.toFixed(1)} ${unidade}`, titulo]}
                labelFormatter={(ano) => `Ano ${ano}`}
              />
              <Area
                type="monotone"
                dataKey="valor"
                stroke={cor}
                fill={cor}
                fillOpacity={0.25}
                strokeWidth={2.5}
              />
            </AreaChart>
          ) : (
            <LineChart data={rows} margin={{ top: 8, right: 10, bottom: 0, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="ano" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} width={36} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(v: number) => [`${v} ${unidade}`, titulo]}
                labelFormatter={(ano) => `Ano ${ano}`}
              />
              <Line
                type="monotone"
                dataKey="valor"
                stroke={cor}
                strokeWidth={2.5}
                dot={{ r: 3, fill: cor }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>

      {fonteUrl && (
        <p className="text-[10px] text-muted-foreground mt-3 leading-relaxed">
          Fonte:{" "}
          <a
            href={fonteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline inline-flex items-center gap-1"
          >
            {fonteLabel || "DATASUS"} <ExternalLink className="w-2.5 h-2.5" />
          </a>
        </p>
      )}
    </div>
  );
}

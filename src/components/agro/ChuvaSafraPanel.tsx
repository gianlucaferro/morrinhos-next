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
  Area,
} from "recharts";
import {
  CloudRain,
  Droplets,
  TrendingUp,
  TrendingDown,
  Minus,
  Sprout,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

// Janela historica usada na media de referencia
const HIST_START_YEAR = 2018;
const HIST_END_YEAR = 2025;

// Calendario de plantio recomendado pra Cerrado/Sul de Goias.
// Base: Zoneamento Agricola de Risco Climatico (ZARC/MAPA) + Embrapa Cerrados.
const CALENDARIO_PLANTIO = [
  { cultura: "Soja", icon: "🌱", inicio: 10, fim: 12, obs: "Águas — janela ideal out-nov" },
  { cultura: "Milho safra (1ª)", icon: "🌽", inicio: 10, fim: 11, obs: "Águas — junto com soja" },
  { cultura: "Milho safrinha (2ª)", icon: "🌽", inicio: 1, fim: 3, obs: "Após colheita da soja" },
  { cultura: "Sorgo", icon: "🌾", inicio: 1, fim: 4, obs: "Tolera deficit hídrico" },
  { cultura: "Algodão", icon: "☁️", inicio: 11, fim: 1, obs: "Águas — final do ano" },
  { cultura: "Feijão das águas", icon: "🫘", inicio: 10, fim: 12, obs: "Plantio principal" },
  { cultura: "Feijão da seca", icon: "🫘", inicio: 2, fim: 3, obs: "Sob umidade residual" },
];

function statusForMes(mes: number, inicio: number, fim: number): "ativo" | "em-breve" | "fechado" {
  const inJanela = inicio <= fim ? mes >= inicio && mes <= fim : mes >= inicio || mes <= fim;
  if (inJanela) return "ativo";
  const distancia = (inicio - mes + 12) % 12;
  if (distancia > 0 && distancia <= 2) return "em-breve";
  return "fechado";
}

type ClimaProps = {
  /** Chuva mensal do ano corrente: {1: 252.5, 2: 190.7, ...} */
  chuvaAnoCorrente: Record<number, number>;
  /** Media historica de chuva mensal (HIST_START..HIST_END): {1: 220.5, ...} */
  mediaHistMensal: Record<number, number>;
  /** Total nos ultimos 30 dias (do INMET diario) */
  ultimos30: number;
  /** Total nos ultimos 60 dias */
  ultimos60: number;
  /** Total nos ultimos 90 dias */
  ultimos90: number;
  /** Ano corrente */
  ano: number;
  /** Mes corrente (1-12) */
  mesAtual: number;
};

export default function ChuvaSafraPanel({
  chuvaAnoCorrente,
  mediaHistMensal,
  ultimos30,
  ultimos60,
  ultimos90,
  ano,
  mesAtual,
}: ClimaProps) {
  const stats = useMemo(() => {
    // Acumulado YTD (jan-mes corrente)
    const totalAno = Object.entries(chuvaAnoCorrente).reduce(
      (s, [, v]) => s + (Number(v) || 0),
      0,
    );

    // Media historica YTD (mesmo periodo)
    const mediaHistYTD = Array.from({ length: mesAtual }, (_, i) => mediaHistMensal[i + 1] ?? 0).reduce(
      (s, v) => s + v,
      0,
    );

    const status = (atualVal: number, mediaVal: number) => {
      if (mediaVal <= 0) return "sem-dados" as const;
      const ratio = atualVal / mediaVal;
      if (ratio < 0.7) return "deficit" as const;
      if (ratio > 1.3) return "excesso" as const;
      return "normal" as const;
    };

    const statusYTD = status(totalAno, mediaHistYTD);
    const mediaMesAtual = mediaHistMensal[mesAtual] ?? 0;
    const status30 = status(ultimos30, mediaMesAtual);

    // Dados pro grafico
    const chartData = Array.from({ length: 12 }, (_, i) => {
      const m = i + 1;
      return {
        mes: MESES[i],
        chuvaAno: m <= mesAtual ? Math.round((chuvaAnoCorrente[m] ?? 0) * 10) / 10 : null,
        mediaHist: Math.round((mediaHistMensal[m] ?? 0) * 10) / 10,
      };
    });

    return {
      totalAno,
      mediaHistYTD,
      diffPctYTD: mediaHistYTD > 0 ? ((totalAno - mediaHistYTD) / mediaHistYTD) * 100 : 0,
      statusYTD,
      mediaMesAtual,
      status30,
      chartData,
    };
  }, [chuvaAnoCorrente, mediaHistMensal, ultimos30, mesAtual]);

  const statusLabel: Record<string, { label: string; color: string; icon: typeof TrendingUp }> = {
    deficit: {
      label: "Déficit",
      color: "text-red-500 bg-red-500/10 border-red-500/30",
      icon: TrendingDown,
    },
    excesso: {
      label: "Excesso",
      color: "text-blue-500 bg-blue-500/10 border-blue-500/30",
      icon: TrendingUp,
    },
    normal: {
      label: "Normal",
      color: "text-green-600 bg-green-500/10 border-green-500/30",
      icon: Minus,
    },
    "sem-dados": {
      label: "Sem dados",
      color: "text-muted-foreground bg-muted border-border",
      icon: Minus,
    },
  };
  const sYTD = statusLabel[stats.statusYTD];
  const s30 = statusLabel[stats.status30];

  return (
    <section
      className="stat-card border-sky-500/20 bg-gradient-to-br from-sky-500/5 via-transparent to-emerald-500/5"
      aria-labelledby="chuva-safra"
    >
      <div className="mb-4">
        <h2
          id="chuva-safra"
          className="text-lg font-semibold text-foreground flex items-center gap-2"
        >
          <CloudRain className="w-5 h-5 text-sky-500" />
          Chuva e safra · {ano}
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          Precipitação acumulada em Morrinhos versus média histórica {HIST_START_YEAR}–{HIST_END_YEAR}.
          Insumo crítico pra agropecuária — cruzamento direto com calendário de plantio.
        </p>
      </div>

      {/* 3 stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <div className={`stat-card border ${sYTD.color}`}>
          <div className="flex items-center gap-2 mb-1">
            <Droplets className="w-4 h-4" />
            <span className="text-xs uppercase tracking-wider opacity-80">Acumulado {ano}</span>
          </div>
          <p className="text-2xl font-extrabold">{Math.round(stats.totalAno)} mm</p>
          <p className="text-[11px] opacity-80 mt-0.5">
            Média histórica YTD: <strong>{Math.round(stats.mediaHistYTD)} mm</strong>
          </p>
          <div className="mt-2 flex items-center gap-1.5 text-xs">
            <sYTD.icon className="w-3.5 h-3.5" />
            <span className="font-semibold">{sYTD.label}</span>
            <span className="opacity-80">
              ({stats.diffPctYTD >= 0 ? "+" : ""}
              {stats.diffPctYTD.toFixed(0)}%)
            </span>
          </div>
        </div>

        <div className={`stat-card border ${s30.color}`}>
          <div className="flex items-center gap-2 mb-1">
            <CloudRain className="w-4 h-4" />
            <span className="text-xs uppercase tracking-wider opacity-80">Últimos 30 dias</span>
          </div>
          <p className="text-2xl font-extrabold">{Math.round(ultimos30)} mm</p>
          <p className="text-[11px] opacity-80 mt-0.5">
            Média histórica do mês: <strong>{Math.round(stats.mediaMesAtual)} mm</strong>
          </p>
          <div className="mt-2 flex items-center gap-1.5 text-xs">
            <s30.icon className="w-3.5 h-3.5" />
            <span className="font-semibold">{s30.label}</span>
          </div>
        </div>

        <div className="stat-card border-border">
          <div className="flex items-center gap-2 mb-1">
            <Sprout className="w-4 h-4 text-emerald-600" />
            <span className="text-xs uppercase tracking-wider text-muted-foreground">
              Janela de cultivo
            </span>
          </div>
          <div className="space-y-1 mt-1">
            <p className="text-sm">
              <span className="text-muted-foreground">Últimos 60 dias:</span>{" "}
              <strong className="text-foreground">{Math.round(ultimos60)} mm</strong>
            </p>
            <p className="text-sm">
              <span className="text-muted-foreground">Últimos 90 dias:</span>{" "}
              <strong className="text-foreground">{Math.round(ultimos90)} mm</strong>
            </p>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2 leading-relaxed">
            Indicador hídrico pra pastagem e preparação de solo (INMET diário).
          </p>
        </div>
      </div>

      {/* Grafico ano vs media */}
      <div className="h-72 mb-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={stats.chartData} margin={{ top: 8, right: 10, bottom: 0, left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
            <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => `${v}mm`} width={48} />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(value: number | null, name: string) => {
                if (value === null) return ["—", name];
                return [`${value.toFixed(1)} mm`, name];
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12, paddingTop: 4 }} iconType="line" />
            <Area
              type="monotone"
              dataKey="mediaHist"
              name={`Média ${HIST_START_YEAR}–${HIST_END_YEAR}`}
              fill="hsl(var(--muted-foreground))"
              fillOpacity={0.12}
              stroke="hsl(var(--muted-foreground))"
              strokeOpacity={0.6}
              strokeWidth={1.5}
              strokeDasharray="4 4"
            />
            <Line
              type="monotone"
              dataKey="chuvaAno"
              name={`Chuva ${ano}`}
              stroke="hsl(199, 89%, 48%)"
              strokeWidth={2.5}
              dot={{ r: 3, fill: "hsl(199, 89%, 48%)" }}
              activeDot={{ r: 5 }}
              connectNulls={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Calendario de plantio */}
      <div className="mt-4 pt-4 border-t border-border">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5">
          <Sprout className="w-4 h-4 text-emerald-600" />
          Calendário de plantio (Cerrado/Goiás) — janelas oficiais ZARC/MAPA + Embrapa
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {CALENDARIO_PLANTIO.map((c) => {
            const status = statusForMes(mesAtual, c.inicio, c.fim);
            const statusBadge =
              status === "ativo"
                ? {
                    label: "Janela ABERTA",
                    color:
                      "bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30",
                  }
                : status === "em-breve"
                ? {
                    label: "Em breve",
                    color:
                      "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
                  }
                : { label: "Fechada", color: "bg-muted text-muted-foreground border-border" };
            return (
              <div
                key={c.cultura}
                className="flex items-start gap-2 px-3 py-2 rounded-lg bg-card/50 border border-border/50"
              >
                <span className="text-xl shrink-0" aria-hidden>
                  {c.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-foreground">{c.cultura}</p>
                    <Badge variant="outline" className={`text-[10px] ${statusBadge.color}`}>
                      {statusBadge.label}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">
                    {MESES[c.inicio - 1]}–{MESES[c.fim - 1]} · {c.obs}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground mt-3 leading-relaxed">
        Fontes: Open-Meteo Archive (precipitação histórica, atualizada semanalmente via cron),
        INMET (chuva diária, sync 15min), ZARC/MAPA + Embrapa Cerrados (janelas de plantio).
        O status hídrico é meramente indicativo — sempre confirme com agrônomo antes de
        decisões produtivas.
      </p>
    </section>
  );
}

"use client";

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Activity, Users, ExternalLink } from "lucide-react";

type AnoRow = { ano: number; valor: number };
type AggRow = { sexo?: string; faixa?: string; total: number };

/**
 * Painel HIV em Morrinhos — 3 visões: temporal, por sexo, por faixa etária.
 * Dados consolidados de 2010-2026 (16 anos).
 */
export default function HIVChart({
  anuais,
  porSexo,
  porFaixa,
}: {
  anuais: AnoRow[];
  porSexo: Array<{ sexo: string; total: number }>;
  porFaixa: Array<{ faixa: string; total: number }>;
}) {
  if (anuais.length === 0 && porSexo.length === 0 && porFaixa.length === 0) return null;

  const totalAcumulado = anuais.reduce((s, r) => s + (r.valor || 0), 0);
  const ultimoAno = anuais.filter((r) => r.valor > 0).at(-1);

  return (
    <div className="stat-card border-orange-500/20 bg-gradient-to-br from-orange-500/5 via-transparent to-purple-500/5">
      <div className="mb-3">
        <h3 className="font-semibold text-foreground text-base flex items-center gap-2">
          <Activity className="w-4 h-4 text-orange-500" />
          HIV em Morrinhos · 2010-{new Date().getFullYear()}
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
          Diagnósticos de HIV/AIDS notificados — série anual + breakdown por sexo e faixa
          etária. Dado epidemiológico sensível mas público (SINAN/DATASUS), essencial pra
          ações de prevenção e testagem.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
        <div className="stat-card border-orange-500/30">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Total acumulado</p>
          <p className="text-xl font-extrabold text-foreground mt-0.5">{totalAcumulado}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">diagnósticos 2010-{new Date().getFullYear()}</p>
        </div>
        {ultimoAno && (
          <div className="stat-card">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Último ano</p>
            <p className="text-xl font-extrabold text-foreground mt-0.5">{ultimoAno.valor}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{ultimoAno.ano}</p>
          </div>
        )}
        {porSexo.length > 0 && (
          <div className="stat-card">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground inline-flex items-center gap-1">
              <Users className="w-3 h-3" /> Distribuição por sexo
            </p>
            <p className="text-sm text-foreground mt-1 leading-tight">
              {porSexo.map((s) => `${s.sexo}: ${s.total}`).join(" · ")}
            </p>
          </div>
        )}
      </div>

      {/* Grafico anual + breakdowns lado a lado */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Serie temporal */}
        <div className="lg:col-span-2 h-64">
          <p className="text-xs font-medium text-muted-foreground mb-1">
            Diagnósticos por ano
          </p>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={anuais} margin={{ top: 8, right: 10, bottom: 0, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="ano" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} width={32} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(v: number) => [`${v} diagnósticos`, "HIV"]}
                labelFormatter={(ano) => `Ano ${ano}`}
              />
              <Line
                type="monotone"
                dataKey="valor"
                stroke="hsl(25, 95%, 53%)"
                strokeWidth={2.5}
                dot={{ r: 3, fill: "hsl(25, 95%, 53%)" }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Breakdown por faixa etária */}
        {porFaixa.length > 0 && (
          <div className="h-64">
            <p className="text-xs font-medium text-muted-foreground mb-1">Por faixa etária</p>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={porFaixa} layout="vertical" margin={{ top: 8, right: 30, bottom: 0, left: 0 }}>
                <XAxis type="number" tick={{ fontSize: 9 }} />
                <YAxis type="category" dataKey="faixa" tick={{ fontSize: 10 }} width={70} interval={0} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(v: number) => [`${v} casos`, "Total"]}
                />
                <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                  {porFaixa.map((_, idx) => (
                    <Cell key={idx} fill="hsl(25, 95%, 53%)" fillOpacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <p className="text-[10px] text-muted-foreground mt-3 leading-relaxed">
        Fonte:{" "}
        <a
          href="http://tabnet.datasus.gov.br/cgi/deftohtm.exe?sinannet/cnv/aidsBR.def"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline inline-flex items-center gap-1"
        >
          DATASUS/SINAN — Casos de HIV/AIDS <ExternalLink className="w-2.5 h-2.5" />
        </a>
        . Notificações compulsórias de HIV em Morrinhos.
      </p>
    </div>
  );
}

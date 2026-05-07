"use client";

import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Bug, ExternalLink } from "lucide-react";

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

type Row = { ano: number; mes: number; valor: number };

/**
 * Sazonalidade — sobrepoe casos de dengue dos ultimos 3 anos no mesmo eixo X
 * (jan-dez) pra mostrar o padrao sazonal e comparar a intensidade do ano
 * corrente vs anos anteriores.
 */
export default function DengueSazonalidadeChart({
  rows,
  categoria = "dengue",
}: {
  rows: Row[];
  categoria?: string;
}) {
  const { chartData, anos } = useMemo(() => {
    const anos = Array.from(new Set(rows.map((r) => r.ano))).sort((a, b) => a - b);
    const data: Record<string, number | string>[] = MESES.map((mes, i) => {
      const row: Record<string, number | string> = { mes };
      for (const ano of anos) {
        const r = rows.find((x) => x.ano === ano && x.mes === i + 1);
        row[`ano_${ano}`] = r?.valor ?? 0;
      }
      return row;
    });
    return { chartData: data, anos };
  }, [rows]);

  if (anos.length === 0) return null;

  // Cores por ano: anterior em cinza, ano corrente em vermelho forte
  const anoCorrente = Math.max(...anos);
  const cores: Record<number, string> = {};
  anos.forEach((ano, i) => {
    if (ano === anoCorrente) cores[ano] = "hsl(0, 84%, 50%)"; // vermelho forte
    else cores[ano] = `hsl(215, 20%, ${50 + i * 12}%)`; // cinzas variando
  });

  const totals = anos.reduce<Record<number, number>>((acc, ano) => {
    acc[ano] = rows.filter((r) => r.ano === ano).reduce((s, r) => s + r.valor, 0);
    return acc;
  }, {});

  const labelCategoria =
    categoria === "dengue" ? "Dengue" : categoria === "chikungunya" ? "Chikungunya" : "Zika";

  return (
    <div className="stat-card border-red-500/20 bg-gradient-to-br from-red-500/5 via-transparent to-amber-500/5">
      <div className="mb-3">
        <h3 className="font-semibold text-foreground text-base flex items-center gap-2">
          <Bug className="w-4 h-4 text-red-500" />
          Sazonalidade da {labelCategoria} · {anos.join(" / ")}
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
          Casos mensais sobrepostos para comparar como o ano corrente está em relação aos
          anos anteriores. {labelCategoria} concentra picos no verão chuvoso (jan-mai) — o
          ano corrente em <strong className="text-red-500">vermelho</strong> destaca.
        </p>
      </div>

      <div className="flex flex-wrap gap-3 mb-3">
        {anos.map((ano) => (
          <div
            key={ano}
            className={`inline-flex items-center gap-2 text-xs ${
              ano === anoCorrente ? "font-semibold" : "text-muted-foreground"
            }`}
          >
            <span
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: cores[ano] }}
              aria-hidden
            />
            <span>
              {ano}: <strong className="text-foreground">{totals[ano]}</strong> casos
            </span>
          </div>
        ))}
      </div>

      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 8, right: 10, bottom: 0, left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 10 }} width={36} allowDecimals={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(value: number, name: string) => {
                const ano = name.replace("ano_", "");
                return [`${value} casos`, ano];
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: 11, paddingTop: 4 }}
              iconType="line"
              formatter={(value: string) => value.replace("ano_", "")}
            />
            {anos.map((ano) => (
              <Line
                key={ano}
                type="monotone"
                dataKey={`ano_${ano}`}
                name={`ano_${ano}`}
                stroke={cores[ano]}
                strokeWidth={ano === anoCorrente ? 3 : 1.8}
                dot={{ r: ano === anoCorrente ? 3 : 2, fill: cores[ano] }}
                activeDot={{ r: 5 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <p className="text-[10px] text-muted-foreground mt-3 leading-relaxed">
        Fonte: InfoDengue (Fiocruz) + Ministério da Saúde / SINAN. Notificações
        compulsórias de arboviroses em Morrinhos.
      </p>
    </div>
  );
}

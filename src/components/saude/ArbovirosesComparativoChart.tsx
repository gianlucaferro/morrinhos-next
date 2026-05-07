"use client";

import { useMemo } from "react";
import {
  ComposedChart,
  Bar,
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
 * Comparativo arboviroses: dengue, chikungunya, zika juntos no mesmo grafico.
 * Mostra a relacao entre as 3 doencas transmitidas pelo Aedes aegypti.
 * Eixo X: ano-mes contínuo. Eixo Y: casos. Bars empilhadas.
 */
export default function ArbovirosesComparativoChart({
  dengue,
  chikungunya,
  zika,
}: {
  dengue: Row[];
  chikungunya: Row[];
  zika: Row[];
}) {
  const { chartData, totals } = useMemo(() => {
    // Cobertura total: anos+mes que aparecem em qualquer das 3
    const keys = new Set<string>();
    [dengue, chikungunya, zika].forEach((arr) =>
      arr.forEach((r) => keys.add(`${r.ano}-${r.mes}`)),
    );
    const sorted = Array.from(keys).sort((a, b) => {
      const [aA, aM] = a.split("-").map(Number);
      const [bA, bM] = b.split("-").map(Number);
      return aA !== bA ? aA - bA : aM - bM;
    });

    const data = sorted.map((k) => {
      const [ano, mes] = k.split("-").map(Number);
      const d = dengue.find((r) => r.ano === ano && r.mes === mes)?.valor ?? 0;
      const c = chikungunya.find((r) => r.ano === ano && r.mes === mes)?.valor ?? 0;
      const z = zika.find((r) => r.ano === ano && r.mes === mes)?.valor ?? 0;
      return {
        label: `${MESES[mes - 1]}/${String(ano).slice(2)}`,
        ano,
        mes,
        dengue: d,
        chikungunya: c,
        zika: z,
      };
    });

    const totals = {
      dengue: dengue.reduce((s, r) => s + r.valor, 0),
      chikungunya: chikungunya.reduce((s, r) => s + r.valor, 0),
      zika: zika.reduce((s, r) => s + r.valor, 0),
    };

    return { chartData: data, totals };
  }, [dengue, chikungunya, zika]);

  if (chartData.length === 0) return null;

  const totalGeral = totals.dengue + totals.chikungunya + totals.zika;

  return (
    <div className="stat-card border-red-500/20 bg-gradient-to-br from-red-500/5 via-transparent to-amber-500/5">
      <div className="mb-3">
        <h3 className="font-semibold text-foreground text-base flex items-center gap-2">
          <Bug className="w-4 h-4 text-red-500" />
          Arboviroses · Dengue × Chikungunya × Zika
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
          As 3 arboviroses transmitidas pelo mesmo mosquito (Aedes aegypti) em Morrinhos.
          Acompanhar juntas ajuda a identificar surtos e priorizar combate ao mosquito —
          a mesma campanha de prevenção combate as três doenças.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="stat-card border-red-500/30">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Dengue</p>
          <p className="text-xl font-extrabold text-red-600 mt-0.5">{totals.dengue}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {((totals.dengue / totalGeral) * 100).toFixed(0)}% do total
          </p>
        </div>
        <div className="stat-card border-orange-500/30">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Chikungunya</p>
          <p className="text-xl font-extrabold text-orange-600 mt-0.5">{totals.chikungunya}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {((totals.chikungunya / totalGeral) * 100).toFixed(0)}% do total
          </p>
        </div>
        <div className="stat-card border-amber-500/30">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Zika</p>
          <p className="text-xl font-extrabold text-amber-600 mt-0.5">{totals.zika}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {((totals.zika / totalGeral) * 100).toFixed(0)}% do total
          </p>
        </div>
      </div>

      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 8, right: 10, bottom: 0, left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={2} />
            <YAxis tick={{ fontSize: 10 }} width={32} allowDecimals={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(v: number, name: string) => [`${v} casos`, name]}
            />
            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 4 }} iconType="rect" />
            <Bar
              dataKey="dengue"
              name="Dengue"
              stackId="arb"
              fill="hsl(0, 84%, 50%)"
              fillOpacity={0.85}
              radius={[2, 2, 0, 0]}
            />
            <Bar
              dataKey="chikungunya"
              name="Chikungunya"
              stackId="arb"
              fill="hsl(25, 95%, 53%)"
              fillOpacity={0.85}
            />
            <Bar
              dataKey="zika"
              name="Zika"
              stackId="arb"
              fill="hsl(45, 93%, 47%)"
              fillOpacity={0.85}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <p className="text-[10px] text-muted-foreground mt-3 leading-relaxed">
        Casos confirmados, agregação mensal. Fonte:{" "}
        <a
          href="https://info.dengue.mat.br/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline inline-flex items-center gap-1"
        >
          InfoDengue (Fiocruz) <ExternalLink className="w-2.5 h-2.5" />
        </a>{" "}
        + Ministério da Saúde / SINAN.
      </p>
    </div>
  );
}

"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Cell,
  LabelList,
} from "recharts";
import { Baby, ExternalLink } from "lucide-react";

type Row = { causa: string; total: number };

const CAUSA_CORES: Record<string, string> = {
  "Afecções perinatais": "#ec4899", // rosa
  "Malformações congênitas": "#8b5cf6", // roxo
  "Aparelho respiratório": "#06b6d4", // ciano
  "Doenças infecciosas e parasitárias": "#a855f7", // roxo claro
  "Sinais e sintomas mal definidos": "#6b7280", // cinza
  "Causas externas (V01-Y98)": "#ea580c", // laranja
  "Doenças endócrinas e metabólicas": "#16a34a", // verde
  "Aparelho circulatório": "#dc2626", // vermelho
  "Aparelho digestivo": "#ca8a04",
};

/**
 * Mortes infantis por capítulo CID-10 — barras horizontais.
 * Crítico pra entender se mortalidade infantil está mais ligada a causas
 * "preveniveis" (perinatais, infecções, mal definidas) ou estruturais.
 */
export default function MortInfantilCausasChart({ rows }: { rows: Row[] }) {
  if (!rows || rows.length === 0) return null;

  const total = rows.reduce((s, r) => s + r.total, 0);
  const top1 = rows[0];

  return (
    <div className="stat-card border-pink-500/20 bg-gradient-to-br from-pink-500/5 via-transparent to-purple-500/5">
      <div className="mb-3">
        <h3 className="font-semibold text-foreground text-base flex items-center gap-2">
          <Baby className="w-4 h-4 text-pink-500" />
          Mortalidade Infantil — causas (CID-10)
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
          Por que crianças menores de 1 ano morrem em Morrinhos? Causas agrupadas pelo
          capítulo da CID-10. Identificar predominância de "afecções perinatais" e
          "malformações congênitas" indica fragilidade do pré-natal e parto.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="stat-card">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Total óbitos infantis analisados</p>
          <p className="text-xl font-extrabold text-foreground mt-0.5">{total}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">crianças &lt;1 ano</p>
        </div>
        {top1 && (
          <div className="stat-card border-pink-500/30">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Causa principal</p>
            <p className="text-base font-bold text-foreground mt-0.5">{top1.causa}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {top1.total} óbitos · {((top1.total / total) * 100).toFixed(1)}% do total
            </p>
          </div>
        )}
      </div>

      <div style={{ height: Math.max(220, rows.length * 38) }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} layout="vertical" margin={{ top: 8, right: 50, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 10 }} />
            <YAxis type="category" dataKey="causa" tick={{ fontSize: 11 }} width={200} interval={0} />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(v: number) => [`${v} óbitos infantis`, "Total"]}
            />
            <Bar dataKey="total" radius={[0, 4, 4, 0]}>
              {rows.map((entry, idx) => (
                <Cell key={idx} fill={CAUSA_CORES[entry.causa] || "#94a3b8"} />
              ))}
              <LabelList
                dataKey="total"
                position="right"
                style={{ fontSize: 10, fill: "hsl(var(--foreground))" }}
                formatter={(v: number) => `${v}`}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <p className="text-[10px] text-muted-foreground mt-3 leading-relaxed">
        Fonte:{" "}
        <a
          href="http://tabnet.datasus.gov.br/cgi/deftohtm.exe?sim/cnv/inf10GO.def"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline inline-flex items-center gap-1"
        >
          DATASUS/SIM — Mortalidade infantil Goiás <ExternalLink className="w-2.5 h-2.5" />
        </a>
        . Capítulos CID-10 (10ª revisão da Classificação Internacional de Doenças, OMS).
      </p>
    </div>
  );
}

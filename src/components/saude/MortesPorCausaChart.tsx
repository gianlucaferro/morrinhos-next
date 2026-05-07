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
import { Heart, ExternalLink } from "lucide-react";

type Row = { causa: string; total: number };

// Cores categorizadas — vermelho/laranja pra cardiovascular/causas externas (preveniveis),
// roxo pra neoplasias, etc.
const CAUSA_CORES: Record<string, string> = {
  "Aparelho circulatório": "#dc2626", // vermelho — cardio
  "Neoplasias (tumores)": "#7c3aed", // roxo
  "Causas externas (V01-Y98)": "#ea580c", // laranja — preveniveis
  "Aparelho respiratório": "#0891b2", // ciano
  "Sinais e sintomas mal definidos": "#6b7280", // cinza
  "Aparelho digestivo": "#ca8a04", // mostarda
  "Doenças endócrinas e metabólicas": "#16a34a", // verde
  "Doenças do sistema nervoso": "#0284c7", // azul
  "Doenças infecciosas e parasitárias": "#a855f7", // roxo claro
};

const COR_PADRAO = "#94a3b8";

/**
 * Grafico de mortes por causa CID-10 em Morrinhos (acumulado periodo disponivel).
 * Bar chart horizontal, ordenado desc — facil de ler comparativamente.
 */
export default function MortesPorCausaChart({ rows }: { rows: Row[] }) {
  if (!rows || rows.length === 0) {
    return null;
  }

  // Top 10 + agrupa "Outros"
  const top10 = rows.slice(0, 10);
  const outros = rows.slice(10);
  const totalOutros = outros.reduce((s, r) => s + r.total, 0);
  const data =
    totalOutros > 0
      ? [...top10, { causa: `Outras (${outros.length} causas)`, total: totalOutros }]
      : top10;

  const total = rows.reduce((s, r) => s + r.total, 0);
  const top1 = rows[0];

  return (
    <div className="stat-card border-red-500/20 bg-gradient-to-br from-red-500/5 via-transparent to-purple-500/5">
      <div className="mb-3">
        <h3 className="font-semibold text-foreground text-base flex items-center gap-2">
          <Heart className="w-4 h-4 text-red-500" />
          Por que morrem em Morrinhos — causas CID-10
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
          Total de óbitos agrupados por capítulo da Classificação Internacional de Doenças
          (CID-10). Quanto maior a barra, mais frequente é aquela causa de morte. Crucial pra
          identificar onde a saúde pública pode atuar (preveniveis vs envelhecimento natural).
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        <div className="stat-card border-red-500/30">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Total de óbitos analisados</p>
          <p className="text-xl font-extrabold text-foreground mt-0.5">{total.toLocaleString("pt-BR")}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            agrupados por capítulo CID-10
          </p>
        </div>
        {top1 && (
          <div className="stat-card border-red-500/30">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Causa principal</p>
            <p className="text-base font-bold text-foreground mt-0.5">{top1.causa}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {top1.total} óbitos · {((top1.total / total) * 100).toFixed(1)}% do total
            </p>
          </div>
        )}
      </div>

      {/* Grafico */}
      <div style={{ height: Math.max(280, data.length * 36) }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 8, right: 50, bottom: 0, left: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 10 }} />
            <YAxis
              type="category"
              dataKey="causa"
              tick={{ fontSize: 11 }}
              width={200}
              interval={0}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(value: number) => [`${value} óbitos`, "Total"]}
            />
            <Bar dataKey="total" radius={[0, 4, 4, 0]}>
              {data.map((entry, idx) => (
                <Cell
                  key={idx}
                  fill={CAUSA_CORES[entry.causa] || COR_PADRAO}
                />
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
          href="http://tabnet.datasus.gov.br/cgi/deftohtm.exe?sim/cnv/obt10GO.def"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline inline-flex items-center gap-1"
        >
          DATASUS/SIM Goiás — TabNet <ExternalLink className="w-2.5 h-2.5" />
        </a>
        . Capítulos seguem a 10ª revisão da Classificação Internacional de Doenças (CID-10) da OMS.
      </p>
    </div>
  );
}

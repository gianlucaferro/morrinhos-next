"use client";

import { useMemo } from "react";
import { Trophy } from "lucide-react";

type EmendaRankingItem = {
  id: string;
  parlamentar_nome: string;
  parlamentar_esfera: string | null;
  valor_empenhado: number | null;
  valor_pago: number | null;
  objeto?: string | null;
  ano: number;
  fonte_url?: string | null;
  atualizado_em?: string;
};

function formatCurrencyShort(v: number) {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1).replace(".", ",")} mi`;
  if (v >= 1_000) return `R$ ${(v / 1_000).toFixed(0)} mil`;
  return `R$ ${v.toFixed(0)}`;
}

interface Props {
  emendas: EmendaRankingItem[];
}

export default function EmendasRanking({ emendas }: Props) {
  const ranking = useMemo(() => {
    const map = new Map<string, { nome: string; esfera: string; total: number; pago: number; qtd: number }>();

    for (const e of emendas) {
      // Exclude government transfers
      if (e.parlamentar_nome.startsWith("Governo")) continue;

      const key = e.parlamentar_nome;
      const existing = map.get(key);
      if (existing) {
        existing.total += e.valor_empenhado || 0;
        existing.pago += e.valor_pago || 0;
        existing.qtd += 1;
      } else {
        map.set(key, {
          nome: e.parlamentar_nome,
          esfera: e.parlamentar_esfera || "federal",
          total: e.valor_empenhado || 0,
          pago: e.valor_pago || 0,
          qtd: 1,
        });
      }
    }

    return [...map.values()]
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [emendas]);

  if (ranking.length === 0) return null;

  const maxValue = ranking[0]?.total || 1;

  return (
    <div className="stat-card space-y-4">
      <div className="flex items-center gap-2">
        <Trophy className="w-5 h-5 text-primary" />
        <h2 className="font-bold text-foreground">Ranking de parlamentares</h2>
      </div>
      <p className="text-xs text-muted-foreground -mt-2">
        Top 10 parlamentares que mais destinaram recursos para Morrinhos (exceto transferências governamentais)
      </p>

      {/* Legend */}
      <div className="flex gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-primary" />
          <span className="text-muted-foreground">Estadual</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-accent" />
          <span className="text-muted-foreground">Federal</span>
        </div>
      </div>

      <div className="space-y-3">
        {ranking.map((r, i) => {
          const percent = Math.max(4, Math.round((r.total / maxValue) * 100));
          return (
            <div key={r.nome} className="grid grid-cols-[minmax(96px,150px)_1fr] items-center gap-3">
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-foreground">
                  {i + 1}. {r.nome}
                </p>
                <p className="text-[10px] text-muted-foreground capitalize">{r.esfera || "federal"}</p>
              </div>
              <div className="min-w-0">
                <div className="h-6 rounded-md bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-r-md ${r.esfera === "estadual" ? "bg-primary" : "bg-accent"}`}
                    style={{ width: `${percent}%` }}
                    aria-label={`${r.nome}: ${formatCurrencyShort(r.total)} empenhados`}
                  />
                </div>
                <div className="mt-1 flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
                  <span>{formatCurrencyShort(r.total)} empenhados</span>
                  <span>{formatCurrencyShort(r.pago)} pagos</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary list below chart */}
      <div className="space-y-1 pt-2 border-t border-border">
        {ranking.slice(0, 5).map((r, i) => (
          <div key={r.nome} className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              <span className="font-semibold text-foreground">{i + 1}º</span> {r.nome}
              <span className="text-muted-foreground/70 ml-1">({r.qtd} emendas)</span>
            </span>
            <span className="font-semibold text-foreground">{formatCurrencyShort(r.total)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

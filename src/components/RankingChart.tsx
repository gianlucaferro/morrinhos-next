"use client";

import { useMemo } from "react";
import { Trophy } from "lucide-react";
import Link from "next/link";
import type { AtuacaoParlamentar, Vereador } from "@/data/api";

type RankingEntry = {
  name: string;
  slug?: string;
  indicacoes: number;
  requerimentos: number;
  total: number;
};

interface RankingChartProps {
  atuacoes: AtuacaoParlamentar[];
  vereadores: Vereador[];
  show: boolean;
  onToggle: (v: boolean) => void;
  isLoading?: boolean;
  isError?: boolean;
}

export function useRankingData(atuacoes: AtuacaoParlamentar[], vereadores: Vereador[]): RankingEntry[] {
  return useMemo(() => {
    const vereadorMap = new Map<string, { nome: string; slug: string }>();
    vereadores.forEach((v) => vereadorMap.set(v.id, { nome: v.nome, slug: v.slug }));

    const map = new Map<string, RankingEntry>();
    atuacoes.forEach((a) => {
      if (a.tipo === "Moção") return;
      const vInfo = a.autor_vereador_id ? vereadorMap.get(a.autor_vereador_id) : undefined;
      const nome = vInfo?.nome || a.autor_texto;
      const slug = vInfo?.slug;
      if (!map.has(nome)) map.set(nome, { name: nome, slug, indicacoes: 0, requerimentos: 0, total: 0 });
      const entry = map.get(nome)!;
      if (a.tipo === "Indicação") entry.indicacoes++;
      else if (a.tipo === "Requerimento") entry.requerimentos++;
      entry.total = entry.indicacoes + entry.requerimentos;
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [atuacoes, vereadores]);
}

export default function RankingChart({
  atuacoes,
  vereadores,
  show,
  onToggle,
  isLoading = false,
  isError = false,
}: RankingChartProps) {
  const chartData = useRankingData(atuacoes, vereadores);

  if (!show) {
    return (
      <button
        onClick={() => onToggle(true)}
        className="text-xs text-primary hover:underline mb-4 flex items-center gap-1"
      >
        <Trophy className="w-3.5 h-3.5" /> Mostrar ranking
      </button>
    );
  }

  const maxTotal = chartData[0]?.total || 1;

  return (
    <div className="stat-card">
      <div className="flex items-center justify-between mb-5">
        <h2 id="heading-ranking" className="text-lg md:text-xl font-bold text-foreground flex items-center gap-2">
          <Trophy className="w-5 h-5 text-accent" /> Ranking de atuação por vereador
        </h2>
        <button
          onClick={() => onToggle(false)}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Ocultar
        </button>
      </div>

      {isLoading && chartData.length === 0 && (
        <div className="space-y-4" aria-label="Carregando ranking de atuação">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-4 w-6 rounded bg-muted animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-44 max-w-full rounded bg-muted animate-pulse" />
                <div className="h-5 rounded-full bg-muted animate-pulse" />
              </div>
              <div className="h-4 w-8 rounded bg-muted animate-pulse" />
            </div>
          ))}
        </div>
      )}

      {isError && chartData.length === 0 && !isLoading && (
        <p className="text-sm text-muted-foreground">
          Não foi possível carregar o ranking de atuação agora.
        </p>
      )}

      {!isError && chartData.length === 0 && !isLoading && (
        <p className="text-sm text-muted-foreground">
          Dados de atuação parlamentar ainda não disponíveis.
        </p>
      )}

      {chartData.length > 0 && (
        <div className="space-y-3">
          {chartData.map((v, i) => {
            const content = (
              <div className="flex items-center gap-3">
                <span
                  className={`text-sm font-bold w-6 text-right flex-shrink-0 ${
                    i === 0 ? "text-yellow-500" : i === 1 ? "text-gray-400" : i === 2 ? "text-amber-600" : "text-muted-foreground"
                  }`}
                  aria-label={`${i + 1}º lugar`}
                >
                  {i + 1}º
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between mb-1">
                    <p className="text-sm font-medium text-foreground truncate">{v.name}</p>
                    <span className="text-sm font-bold text-primary ml-2 flex-shrink-0">{v.total}</span>
                  </div>
                  <div className="h-5 rounded-full bg-muted overflow-hidden flex" role="img" aria-label={`${v.indicacoes} indicações, ${v.requerimentos} requerimentos`}>
                    {v.indicacoes > 0 && (
                      <div
                        className="h-full bg-primary transition-all duration-500"
                        style={{ width: `${(v.indicacoes / maxTotal) * 100}%` }}
                      />
                    )}
                    {v.requerimentos > 0 && (
                      <div
                        className="h-full bg-accent transition-all duration-500"
                        style={{ width: `${(v.requerimentos / maxTotal) * 100}%` }}
                      />
                    )}
                  </div>
                  <div className="flex gap-3 mt-1 text-[10px] text-muted-foreground">
                    {v.indicacoes > 0 && (
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-primary inline-block" aria-hidden="true" />
                        {v.indicacoes} ind.
                      </span>
                    )}
                    {v.requerimentos > 0 && (
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-accent inline-block" aria-hidden="true" />
                        {v.requerimentos} req.
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );

            return v.slug ? (
              <Link key={v.name} href={`/vereadores/${v.slug}`} className="block hover:bg-muted/50 rounded-lg p-1 -m-1 transition-colors">
                {content}
              </Link>
            ) : (
              <div key={v.name} className="p-1 -m-1">
                {content}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

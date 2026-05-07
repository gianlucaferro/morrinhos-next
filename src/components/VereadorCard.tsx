"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { DollarSign, Vote, Wallet, Info } from "lucide-react";
import type { Vereador } from "@/data/api";
import { fetchProjetosCountByVereador, fetchAtuacaoCountByVereador, fetchRemuneracaoByVereador } from "@/data/api";
import { fetchCamaraDiarias, fetchCamaraCustoTotal } from "@/data/camaraApi";
import { Badge } from "@/components/ui/badge";
import ShareButton from "@/components/ShareButton";
import { formatCurrency, getInitials } from "@/lib/formatters";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const NUM_VEREADORES = 11;

export default function VereadorCard({ v }: { v: Vereador }) {
  const initials = getInitials(v.nome);

  const { data: counts } = useQuery({
    queryKey: ["projetos-count", v.id],
    queryFn: () => fetchProjetosCountByVereador(v.id),
  });

  const { data: atuacao } = useQuery({
    queryKey: ["atuacao-count", v.id],
    queryFn: () => fetchAtuacaoCountByVereador(v.id),
  });

  const { data: remuneracao } = useQuery({
    queryKey: ["remuneracao-latest", v.id],
    queryFn: () => fetchRemuneracaoByVereador(v.id),
  });

  const { data: allDiarias } = useQuery({
    queryKey: ["camara-diarias"],
    queryFn: fetchCamaraDiarias,
    staleTime: 10 * 60 * 1000,
  });

  const { data: custoTotalCamara } = useQuery({
    queryKey: ["camara-custo-total"],
    queryFn: fetchCamaraCustoTotal,
    staleTime: 10 * 60 * 1000,
  });

  const projectCounts = counts || { apresentados: 0, aprovados: 0, recusados: 0, tramitacao: 0 };
  const atuacaoCounts = atuacao || { indicacoes: 0, mocoes: 0, requerimentos: 0, total: 0 };

  const salario = remuneracao
    ? (remuneracao.bruto ?? remuneracao.subsidio_referencia)
    : null;

  // Diárias pessoais do vereador
  const primeiroNome = v.nome.split(" ")[0].toLowerCase();
  const diariasTotal = (allDiarias || [])
    .filter((d) => d.beneficiario?.toLowerCase().includes(primeiroNome))
    .reduce((s, d) => s + (d.valor || 0), 0);

  // Custo total para o contribuinte: subsídio anual + diárias + rateio do custo da Câmara
  const rateioCamara = custoTotalCamara ? (custoTotalCamara.folhaMensal * 12) / NUM_VEREADORES : 0;
  const custoTotalAnual = salario
    ? (salario * 12) + diariasTotal + rateioCamara
    : null;

  return (
    <Link
      href={`/vereadores/${v.slug}`}
      className="block stat-card card-hover focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      aria-label={`Ver perfil de ${v.nome}`}
    >
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
          {v.foto_url ? (
            <img src={v.foto_url} alt={`Foto de ${v.nome}`} loading="lazy" className="w-14 h-14 rounded-full object-cover" />
          ) : (
            <span className="text-primary font-bold text-lg">{initials}</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-foreground truncate">{v.nome}</h3>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            {v.cargo_mesa && (
              <Badge variant="secondary" className="text-xs">
                {v.cargo_mesa}
              </Badge>
            )}
            {v.partido && (
              <Badge variant="outline" className="text-xs">
                {v.partido}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Projetos */}
      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-md bg-muted p-2">
          <p className="text-lg font-bold text-foreground">{projectCounts.apresentados}</p>
          <p className="text-[11px] text-muted-foreground">Projetos</p>
        </div>
        <div className="rounded-md bg-success/10 p-2">
          <p className="text-lg font-bold text-success">{projectCounts.aprovados}</p>
          <p className="text-[11px] text-muted-foreground">Aprovados</p>
        </div>
        <div className="rounded-md bg-destructive/10 p-2">
          <p className="text-lg font-bold text-destructive">{projectCounts.recusados}</p>
          <p className="text-[11px] text-muted-foreground">Recusados</p>
        </div>
      </div>

      {/* Atuação Parlamentar */}
      <div className="mt-2 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-md bg-primary/10 p-2">
          <p className="text-lg font-bold text-primary">{atuacaoCounts.indicacoes}</p>
          <p className="text-[11px] text-muted-foreground">Indicações</p>
        </div>
        <div className="rounded-md bg-accent/10 p-2">
          <p className="text-lg font-bold text-accent">{atuacaoCounts.requerimentos}</p>
          <p className="text-[11px] text-muted-foreground">Requerimentos</p>
        </div>
        <div className="rounded-md bg-muted p-2">
          <p className="text-lg font-bold text-muted-foreground">{atuacaoCounts.mocoes}</p>
          <p className="text-[11px] text-muted-foreground">Moções</p>
        </div>
      </div>

      {/* Remuneração */}
      {salario !== null && (
        <div className="mt-3 flex items-center gap-2 rounded-md bg-accent/20 border border-accent/30 p-2.5">
          <DollarSign className="w-4 h-4 text-accent flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-foreground">{formatCurrency(salario)}</p>
            <p className="text-[10px] text-muted-foreground">
              Subsídio mensal {remuneracao?.competencia ? `(${remuneracao.competencia})` : ""}
            </p>
          </div>
        </div>
      )}

      {/* Custo total para o contribuinte */}
      {custoTotalAnual !== null && custoTotalAnual > 0 && (
        <div className="mt-2 flex items-center gap-2 rounded-md bg-warning/10 border border-warning/20 p-2.5">
          <Wallet className="w-4 h-4 text-warning flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-foreground">
              {formatCurrency(custoTotalAnual)}
              <span className="text-[10px] font-normal text-muted-foreground">/ano</span>
            </p>
            <Tooltip>
              <TooltipTrigger asChild>
                <p className="text-[10px] text-muted-foreground inline-flex items-center gap-0.5 cursor-help">
                  Custo total para o contribuinte <Info className="w-3 h-3" />
                </p>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-xs">
                  Subsídio anual ({formatCurrency(salario! * 12)})
                  {diariasTotal > 0 ? ` + Diárias (${formatCurrency(diariasTotal)})` : ""}
                  {rateioCamara > 0 ? ` + Rateio do custo da Câmara por vereador (${formatCurrency(rateioCamara)}) — inclui assessores, funcionários e estrutura` : ""}
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      )}

      {/* Votos na eleição */}
      {v.votos_eleicao !== null && v.votos_eleicao !== undefined && (
        <div className="mt-2 flex items-center gap-2 rounded-md bg-muted p-2.5">
          <Vote className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-foreground">{v.votos_eleicao.toLocaleString("pt-BR")} votos</p>
            <p className="text-[10px] text-muted-foreground">
              Eleição {v.ano_eleicao || 2024}
            </p>
          </div>
        </div>
      )}
      <div className="mt-3 flex justify-end">
        <ShareButton
          title={v.nome}
          text={`Veja o perfil de ${v.nome}, vereador(a) de Morrinhos`}
          url={`${window.location.origin}/vereadores/${v.slug}`}
          variant="icon"
        />
      </div>
    </Link>
  );
}

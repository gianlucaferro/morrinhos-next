"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchCamaraLicitacoes } from "@/data/camaraApi";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Search, Gavel, Sparkles, Download, Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { AISummaryDialog, useAISummary } from "@/components/camara/AISummaryDialog";
import { formatCurrency } from "@/lib/formatters";
import { downloadCSV } from "@/lib/csvExport";
import { getTooltip } from "@/lib/glossario";

export default function LicitacoesTab() {
  const [search, setSearch] = useState("");
  const { data: licitacoes, isLoading } = useQuery({ queryKey: ["camara-licitacoes"], queryFn: fetchCamaraLicitacoes });
  const { selectedItem, resumo, loading, requestSummary, close } = useAISummary();

  const filtered = (licitacoes || []).filter((l) =>
    !search || [l.objeto, l.numero, l.modalidade].some((f) => f?.toLowerCase().includes(search.toLowerCase()))
  );

  const handleClick = (l: any) => {
    const conteudo = `- Número: ${l.numero || "não informado"}\n- Modalidade: ${l.modalidade || "não informada"}\n- Objeto: ${l.objeto || "não informado"}\n- Situação: ${l.situacao || "não informada"}\n- Data abertura: ${l.data_abertura || "não informada"}\n- Valor estimado: ${l.valor_estimado ? formatCurrency(l.valor_estimado) : "não informado"}`;
    requestSummary(l.id, "Licitação da Câmara", conteudo, `Licitação ${l.numero || ""}`);
  };

  const handleExportCSV = () => {
    downloadCSV(
      `licitacoes-camara-${new Date().toISOString().slice(0, 10)}.csv`,
      ["Número", "Modalidade", "Objeto", "Situação", "Data Abertura", "Valor Estimado"],
      filtered.map((l) => [l.numero, l.modalidade, l.objeto, l.situacao, l.data_abertura, l.valor_estimado])
    );
  };

  return (
    <div className="container py-4 space-y-4">
      <p className="text-sm text-muted-foreground">Licitações realizadas pela Câmara Municipal de Morrinhos.</p>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar licitação..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" aria-label="Buscar licitação" />
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{filtered.length} licitações encontradas</p>
        {filtered.length > 0 && (
          <button onClick={handleExportCSV} className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline">
            <Download className="w-3.5 h-3.5" /> CSV
          </button>
        )}
      </div>

      {isLoading && <div className="stat-card animate-pulse h-40" />}

      {!isLoading && !filtered.length && (
        <div className="stat-card text-center py-8">
          <Gavel className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-semibold text-foreground">Sem licitações</h3>
          <p className="text-sm text-muted-foreground mt-1">Os dados serão sincronizados automaticamente.</p>
        </div>
      )}

      <div className="space-y-2">
        {filtered.map((l) => {
          const modalidadeTooltip = l.modalidade ? getTooltip(l.modalidade) : null;
          return (
            <button key={l.id} onClick={() => handleClick(l)} className="stat-card card-hover block w-full text-left">
              <div className="flex items-start justify-between mb-1">
                <p className="font-medium text-foreground text-sm">{l.objeto || "Sem descrição"}</p>
                {l.situacao && <Badge variant="outline" className="text-xs shrink-0 ml-2">{l.situacao}</Badge>}
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground items-center">
                {l.numero && <span>Nº {l.numero}</span>}
                {l.modalidade && (
                  modalidadeTooltip ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="inline-flex items-center gap-0.5 cursor-help">· {l.modalidade} <Info className="w-3 h-3" /></span>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs"><p className="text-xs">{modalidadeTooltip}</p></TooltipContent>
                    </Tooltip>
                  ) : (
                    <span>· {l.modalidade}</span>
                  )
                )}
                {l.data_abertura && <span>· {new Date(l.data_abertura + "T12:00:00").toLocaleDateString("pt-BR")}</span>}
                {l.valor_estimado && <span>· {formatCurrency(l.valor_estimado)}</span>}
              </div>
              <p className="text-[11px] text-primary/70 flex items-center gap-1 mt-1">
                <Sparkles className="w-3 h-3" /> Clique para resumo IA
              </p>
            </button>
          );
        })}
      </div>

      <AISummaryDialog
        open={!!selectedItem}
        onOpenChange={(open) => !open && close()}
        title={selectedItem?.title || ""}
        resumo={resumo}
        loading={loading}
      />
    </div>
  );
}

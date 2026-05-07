"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchCamaraDespesas } from "@/data/camaraApi";
import { Search, Receipt, ChevronLeft, ChevronRight, Sparkles, Download, Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AISummaryDialog, useAISummary } from "@/components/camara/AISummaryDialog";
import { formatCurrency } from "@/lib/formatters";
import { downloadCSV } from "@/lib/csvExport";
import { getTooltip } from "@/lib/glossario";

const PAGE_SIZE = 30;
const currentYear = new Date().getFullYear();
const years = Array.from({ length: 5 }, (_, i) => currentYear - i);
const MESES_SHORT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export default function DespesasTab() {
  const [search, setSearch] = useState("");
  const [ano, setAno] = useState(currentYear);
  const [page, setPage] = useState(0);
  const { selectedItem, resumo, loading, requestSummary, close } = useAISummary();

  const { data: despesas, isLoading } = useQuery({
    queryKey: ["camara-despesas", ano],
    queryFn: () => fetchCamaraDespesas(ano),
  });

  const filtered = useMemo(() => {
    return (despesas || []).filter((d) =>
      !search || [d.credor, d.descricao, d.elemento].some((f) => f?.toLowerCase().includes(search.toLowerCase()))
    );
  }, [despesas, search]);

  const totalValor = filtered.reduce((s, d) => s + (d.valor || 0), 0);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // Monthly aggregation for chart
  const monthlyData = useMemo(() => {
    const months = Array(12).fill(0);
    (despesas || []).forEach((d) => {
      if (d.data_pagamento) {
        const m = parseInt(d.data_pagamento.slice(5, 7)) - 1;
        if (m >= 0 && m < 12) months[m] += d.valor || 0;
      }
    });
    const max = Math.max(...months, 1);
    return months.map((v, i) => ({ mes: MESES_SHORT[i], valor: v, pct: (v / max) * 100 }));
  }, [despesas]);

  const handleClick = (d: any) => {
    const conteudo = `- Credor: ${d.credor || "não informado"}\n- Descrição: ${d.descricao || "não informada"}\n- Elemento: ${d.elemento || "não informado"}\n- Valor: ${d.valor ? formatCurrency(d.valor) : "não informado"}\n- Data pagamento: ${d.data_pagamento || "não informada"}\n- Ano: ${ano}`;
    requestSummary(d.id, "Despesa da Câmara", conteudo, `Despesa — ${d.credor || "Sem credor"}`);
  };

  const handleExportCSV = () => {
    downloadCSV(
      `despesas-camara-${ano}.csv`,
      ["Credor", "Descrição", "Elemento", "Valor", "Data Pagamento"],
      filtered.map((d) => [d.credor, d.descricao, d.elemento, d.valor, d.data_pagamento])
    );
  };

  return (
    <div className="container py-4 space-y-4">
      <p className="text-sm text-muted-foreground">Despesas pagas pela Câmara Municipal de Morrinhos.</p>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar despesa..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} className="pl-9" aria-label="Buscar despesa" />
        </div>
        <Select value={String(ano)} onValueChange={(v) => { setAno(Number(v)); setPage(0); }}>
          <SelectTrigger className="w-24" aria-label="Filtrar por ano"><SelectValue /></SelectTrigger>
          <SelectContent>{years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{filtered.length} despesas · Total: {formatCurrency(totalValor)}</p>
        {filtered.length > 0 && (
          <button onClick={handleExportCSV} className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline">
            <Download className="w-3.5 h-3.5" /> CSV
          </button>
        )}
      </div>

      {/* Monthly chart */}
      {!isLoading && (despesas || []).length > 0 && (
        <div className="stat-card">
          <p className="text-xs font-medium text-muted-foreground mb-2">Despesas por mês — {ano}</p>
          <div className="flex items-end gap-1 h-20">
            {monthlyData.map((m) => (
              <div key={m.mes} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full bg-primary/20 rounded-t" style={{ height: `${Math.max(m.pct, 2)}%` }}>
                  <div className="w-full h-full bg-primary rounded-t transition-all duration-500" style={{ height: `${m.pct}%` }} />
                </div>
                <span className="text-[9px] text-muted-foreground">{m.mes}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {isLoading && <div className="stat-card animate-pulse h-40" />}

      {!isLoading && !paged.length && (
        <div className="stat-card text-center py-8">
          <Receipt className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-semibold text-foreground">Sem despesas em {ano}</h3>
          <p className="text-sm text-muted-foreground mt-1">Os dados serão sincronizados automaticamente.</p>
        </div>
      )}

      <div className="space-y-2">
        {paged.map((d) => {
          const elementoTooltip = d.elemento ? getTooltip(d.elemento.trim()) : null;
          return (
            <button key={d.id} onClick={() => handleClick(d)} className="stat-card card-hover block w-full text-left">
              <div className="flex items-start justify-between mb-1">
                <div>
                  <p className="font-medium text-foreground text-sm">{d.credor || "Sem credor"}</p>
                  {d.descricao && <p className="text-xs text-muted-foreground line-clamp-2">{d.descricao}</p>}
                </div>
                <span className="font-semibold text-foreground text-sm shrink-0 ml-2">{formatCurrency(d.valor)}</span>
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground items-center">
                {d.data_pagamento && <span>{new Date(d.data_pagamento + "T12:00:00").toLocaleDateString("pt-BR")}</span>}
                {d.elemento && (
                  elementoTooltip ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="inline-flex items-center gap-0.5 cursor-help">· {d.elemento} <Info className="w-3 h-3" /></span>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs"><p className="text-xs">{elementoTooltip}</p></TooltipContent>
                    </Tooltip>
                  ) : (
                    <span>· {d.elemento}</span>
                  )
                )}
              </div>
              <p className="text-[11px] text-primary/70 flex items-center gap-1 mt-1">
                <Sparkles className="w-3 h-3" /> Clique para resumo IA
              </p>
            </button>
          );
        })}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
            <ChevronLeft className="w-4 h-4 mr-1" /> Anterior
          </Button>
          <span className="text-sm text-muted-foreground">{page + 1} / {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>
            Próxima <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}

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

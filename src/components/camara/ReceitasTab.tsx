"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchCamaraReceitas } from "@/data/camaraApi";
import { TrendingUp, Sparkles, Download } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AISummaryDialog, useAISummary } from "@/components/camara/AISummaryDialog";
import { formatCurrency } from "@/lib/formatters";
import { downloadCSV } from "@/lib/csvExport";

const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const mesesFull = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const currentYear = new Date().getFullYear();
const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

export default function ReceitasTab() {
  const [ano, setAno] = useState(currentYear);
  const { data: receitas, isLoading } = useQuery({
    queryKey: ["camara-receitas", ano],
    queryFn: () => fetchCamaraReceitas(ano),
  });
  const { selectedItem, resumo, loading, requestSummary, close } = useAISummary();

  const totalPrevisto = useMemo(() => (receitas || []).reduce((s, r) => s + (r.valor_previsto || 0), 0), [receitas]);
  const totalArrecadado = useMemo(() => (receitas || []).reduce((s, r) => s + (r.valor_arrecadado || 0), 0), [receitas]);
  const pctExecucao = totalPrevisto > 0 ? ((totalArrecadado / totalPrevisto) * 100).toFixed(1) : "0";

  const handleClick = (r: any) => {
    const conteudo = `- Mês: ${mesesFull[(r.mes || 1) - 1]} de ${ano}\n- Descrição: ${r.descricao || "não informada"}\n- Valor previsto: ${r.valor_previsto ? formatCurrency(r.valor_previsto) : "não informado"}\n- Valor arrecadado: ${r.valor_arrecadado ? formatCurrency(r.valor_arrecadado) : "não informado"}`;
    requestSummary(r.id, "Receita da Câmara", conteudo, `Receita — ${mesesFull[(r.mes || 1) - 1]} ${ano}`);
  };

  const handleExportCSV = () => {
    downloadCSV(
      `receitas-camara-${ano}.csv`,
      ["Mês", "Descrição", "Previsto", "Arrecadado"],
      (receitas || []).map((r) => [mesesFull[(r.mes || 1) - 1], r.descricao, r.valor_previsto, r.valor_arrecadado])
    );
  };

  // Chart data
  const maxVal = useMemo(() => {
    let max = 0;
    (receitas || []).forEach((r) => {
      max = Math.max(max, r.valor_previsto || 0, r.valor_arrecadado || 0);
    });
    return max || 1;
  }, [receitas]);

  return (
    <div className="container py-4 space-y-4">
      <p className="text-sm text-muted-foreground">Receitas da Câmara Municipal de Morrinhos por mês.</p>

      <div className="flex items-center justify-between">
        <Select value={String(ano)} onValueChange={(v) => setAno(Number(v))}>
          <SelectTrigger className="w-24" aria-label="Filtrar por ano"><SelectValue /></SelectTrigger>
          <SelectContent>{years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
        </Select>
        {(receitas || []).length > 0 && (
          <button onClick={handleExportCSV} className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline">
            <Download className="w-3.5 h-3.5" /> CSV
          </button>
        )}
      </div>

      {isLoading && <div className="stat-card animate-pulse h-40" />}

      {!isLoading && !(receitas || []).length && (
        <div className="stat-card text-center py-8">
          <TrendingUp className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-semibold text-foreground">Sem receitas em {ano}</h3>
          <p className="text-sm text-muted-foreground mt-1">Os dados serão sincronizados automaticamente.</p>
        </div>
      )}

      {(receitas || []).length > 0 && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="stat-card text-center">
              <p className="text-xs text-muted-foreground">Previsto</p>
              <p className="text-lg font-bold text-foreground">{formatCurrency(totalPrevisto)}</p>
            </div>
            <div className="stat-card text-center">
              <p className="text-xs text-muted-foreground">Arrecadado</p>
              <p className="text-lg font-bold text-accent">{formatCurrency(totalArrecadado)}</p>
            </div>
            <div className="stat-card text-center">
              <p className="text-xs text-muted-foreground">Execução</p>
              <p className={`text-lg font-bold ${Number(pctExecucao) > 100 ? "text-warning" : "text-accent"}`}>{pctExecucao}%</p>
            </div>
          </div>

          {/* Bar chart: previsto vs arrecadado */}
          <div className="stat-card">
            <p className="text-xs font-medium text-muted-foreground mb-3">Previsto vs Arrecadado — {ano}</p>
            <div className="space-y-2">
              {(receitas || []).map((r) => (
                <div key={r.id} className="space-y-1">
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>{meses[(r.mes || 1) - 1]}</span>
                    <span>{formatCurrency(r.valor_arrecadado)} / {formatCurrency(r.valor_previsto)}</span>
                  </div>
                  <div className="h-3 rounded-full bg-muted overflow-hidden relative">
                    <div className="absolute h-full bg-primary/30 rounded-full" style={{ width: `${((r.valor_previsto || 0) / maxVal) * 100}%` }} />
                    <div className="absolute h-full bg-accent rounded-full" style={{ width: `${((r.valor_arrecadado || 0) / maxVal) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-4 mt-3 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary/30" /> Previsto</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-accent" /> Arrecadado</span>
            </div>
          </div>

          {/* List */}
          <div className="space-y-2">
            {(receitas || []).map((r) => (
              <button key={r.id} onClick={() => handleClick(r)} className="stat-card card-hover block w-full text-left flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground text-sm">{meses[(r.mes || 1) - 1]} {ano}</p>
                  {r.descricao && <p className="text-xs text-muted-foreground">{r.descricao}</p>}
                  <p className="text-[11px] text-primary/70 flex items-center gap-1 mt-1">
                    <Sparkles className="w-3 h-3" /> Clique para resumo IA
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Previsto: {formatCurrency(r.valor_previsto)}</p>
                  <p className="text-sm font-semibold text-foreground">{formatCurrency(r.valor_arrecadado)}</p>
                </div>
              </button>
            ))}
          </div>
        </>
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

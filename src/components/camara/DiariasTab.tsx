"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchCamaraDiarias } from "@/data/camaraApi";
import { Search, Plane, Sparkles, Download, Users, List } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AISummaryDialog, useAISummary } from "@/components/camara/AISummaryDialog";
import { formatCurrency } from "@/lib/formatters";
import { downloadCSV } from "@/lib/csvExport";

export default function DiariasTab() {
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "grouped">("list");
  const { data: diarias, isLoading } = useQuery({ queryKey: ["camara-diarias"], queryFn: fetchCamaraDiarias });
  const { selectedItem, resumo, loading, requestSummary, close } = useAISummary();

  const filtered = (diarias || []).filter((d) =>
    !search || [d.beneficiario, d.destino, d.motivo].some((f) => f?.toLowerCase().includes(search.toLowerCase()))
  );

  const totalValor = filtered.reduce((s, d) => s + (d.valor || 0), 0);

  const grouped = useMemo(() => {
    const map = new Map<string, { nome: string; total: number; count: number }>();
    filtered.forEach((d) => {
      const nome = d.beneficiario || "Não identificado";
      const entry = map.get(nome) || { nome, total: 0, count: 0 };
      entry.total += d.valor || 0;
      entry.count++;
      map.set(nome, entry);
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [filtered]);

  const handleClick = (d: any) => {
    const conteudo = `- Beneficiário: ${d.beneficiario || "não informado"}\n- Cargo: ${d.cargo || "não informado"}\n- Destino: ${d.destino || "não informado"}\n- Motivo: ${d.motivo || "não informado"}\n- Valor: ${d.valor ? formatCurrency(d.valor) : "não informado"}\n- Data: ${d.data || "não informada"}`;
    requestSummary(d.id, "Diária da Câmara", conteudo, `Diária — ${d.beneficiario || "Sem beneficiário"}`);
  };

  const handleExportCSV = () => {
    downloadCSV(
      `diarias-camara-${new Date().toISOString().slice(0, 10)}.csv`,
      ["Beneficiário", "Cargo", "Destino", "Motivo", "Valor", "Data"],
      filtered.map((d) => [d.beneficiario, d.cargo, d.destino, d.motivo, d.valor, d.data])
    );
  };

  return (
    <div className="container py-4 space-y-4">
      <p className="text-sm text-muted-foreground">Diárias e passagens pagas pela Câmara Municipal de Morrinhos.</p>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar diária..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" aria-label="Buscar diária" />
        </div>
        <Button variant={viewMode === "list" ? "default" : "outline"} size="sm" onClick={() => setViewMode("list")} title="Lista">
          <List className="w-4 h-4" />
        </Button>
        <Button variant={viewMode === "grouped" ? "default" : "outline"} size="sm" onClick={() => setViewMode("grouped")} title="Por vereador">
          <Users className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{filtered.length} diárias · Total: {formatCurrency(totalValor)}</p>
        {filtered.length > 0 && (
          <button onClick={handleExportCSV} className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline">
            <Download className="w-3.5 h-3.5" /> CSV
          </button>
        )}
      </div>

      {isLoading && <div className="stat-card animate-pulse h-40" />}

      {!isLoading && !filtered.length && (
        <div className="stat-card text-center py-8">
          <Plane className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-semibold text-foreground">Sem diárias</h3>
          <p className="text-sm text-muted-foreground mt-1">Os dados serão sincronizados automaticamente.</p>
        </div>
      )}

      {viewMode === "grouped" && grouped.length > 0 && (
        <div className="space-y-2">
          {grouped.map((g) => (
            <div key={g.nome} className="stat-card flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground text-sm">{g.nome}</p>
                <p className="text-xs text-muted-foreground">{g.count} diária{g.count !== 1 ? "s" : ""}</p>
              </div>
              <span className="font-semibold text-foreground text-sm">{formatCurrency(g.total)}</span>
            </div>
          ))}
        </div>
      )}

      {viewMode === "list" && (
        <div className="space-y-2">
          {filtered.map((d) => (
            <button key={d.id} onClick={() => handleClick(d)} className="stat-card card-hover block w-full text-left">
              <div className="flex items-start justify-between mb-1">
                <div>
                  <p className="font-medium text-foreground text-sm">{d.beneficiario || "—"}</p>
                  {d.cargo && <Badge variant="secondary" className="text-xs mt-0.5">{d.cargo}</Badge>}
                </div>
                <span className="font-semibold text-foreground text-sm shrink-0 ml-2">{formatCurrency(d.valor)}</span>
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mt-1">
                {d.destino && <span>📍 {d.destino}</span>}
                {d.data && <span>· {new Date(d.data + "T12:00:00").toLocaleDateString("pt-BR")}</span>}
              </div>
              {d.motivo && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{d.motivo}</p>}
              <p className="text-[11px] text-primary/70 flex items-center gap-1 mt-1">
                <Sparkles className="w-3 h-3" /> Clique para resumo IA
              </p>
            </button>
          ))}
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

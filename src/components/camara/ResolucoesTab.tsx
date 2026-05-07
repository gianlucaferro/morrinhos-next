"use client";

import { useQuery } from "@tanstack/react-query";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
const supabase = createBrowserSupabaseClient();
import { Badge } from "@/components/ui/badge";
import { Search, ScrollText, Sparkles, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { AISummaryDialog, useAISummary } from "@/components/camara/AISummaryDialog";
import { downloadCSV } from "@/lib/csvExport";

type Resolucao = {
  id: string;
  numero: string | null;
  descricao: string | null;
  data_publicacao: string | null;
  ano: number;
  documento_url: string | null;
  fonte_url: string | null;
};

async function fetchResolucoes(): Promise<Resolucao[]> {
  // Resoluções are stored in camara_atos with tipo_codigo=7
  const { data, error } = await supabase
    .from("camara_atos")
    .select("*")
    .eq("tipo_codigo", 7)
    .order("data_publicacao", { ascending: false });
  if (error) throw error;
  return (data || []) as Resolucao[];
}

function extractNumero(raw: string | null): string {
  if (!raw) return "—";
  const match = raw.match(/(\d+\/\d{4})/);
  return match ? match[1] : raw;
}

export default function ResolucoesTab() {
  const [search, setSearch] = useState("");
  const { data: resolucoes, isLoading } = useQuery({ queryKey: ["resolucoes-camara-atos"], queryFn: fetchResolucoes });
  const { selectedItem, resumo, loading, requestSummary, close } = useAISummary();

  const filtered = (resolucoes || []).filter((r) =>
    !search || [r.descricao, r.numero].some((f) => f?.toLowerCase().includes(search.toLowerCase()))
  );

  const handleClick = (r: Resolucao) => {
    const conteudo = `- Número: ${r.numero || "não informado"}\n- Ano: ${r.ano}\n- Data: ${r.data_publicacao || "não informada"}\n- Descrição: ${r.descricao || "não informada"}`;
    requestSummary(r.id, "Resolução da Câmara", conteudo, `Resolução ${extractNumero(r.numero)}`);
  };

  const handleExportCSV = () => {
    downloadCSV(
      `resolucoes-camara-${new Date().toISOString().slice(0, 10)}.csv`,
      ["Número", "Descrição", "Data", "Ano"],
      filtered.map((r) => [r.numero, r.descricao, r.data_publicacao, r.ano])
    );
  };

  return (
    <div className="container py-4 space-y-4">
      <p className="text-sm text-muted-foreground">Resoluções aprovadas pela Câmara Municipal de Morrinhos.</p>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar resolução..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" aria-label="Buscar resolução" />
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{filtered.length} resoluções encontradas</p>
        {filtered.length > 0 && (
          <button onClick={handleExportCSV} className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline">
            <Download className="w-3.5 h-3.5" /> CSV
          </button>
        )}
      </div>

      {isLoading && <div className="stat-card animate-pulse h-40" />}

      {!isLoading && !filtered.length && (
        <div className="stat-card text-center py-8">
          <ScrollText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-semibold text-foreground">Sem resoluções</h3>
          <p className="text-sm text-muted-foreground mt-1">Os dados serão sincronizados automaticamente.</p>
        </div>
      )}

      <div className="space-y-2">
        {filtered.map((r) => (
          <button key={r.id} onClick={() => handleClick(r)} className="stat-card card-hover block w-full text-left">
            <div className="flex items-start justify-between mb-1">
              <p className="font-medium text-foreground text-sm line-clamp-2">{r.descricao || "Sem descrição"}</p>
              <Badge variant="outline" className="text-xs shrink-0 ml-2">{extractNumero(r.numero)}</Badge>
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              {r.data_publicacao && <span>{new Date(r.data_publicacao + "T12:00:00").toLocaleDateString("pt-BR")}</span>}
              <span>· {r.ano}</span>
              {r.documento_url && (
                <a href={r.documento_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline" onClick={(e) => e.stopPropagation()}>
                  · Ver documento
                </a>
              )}
            </div>
            <p className="text-[11px] text-primary/70 flex items-center gap-1 mt-1">
              <Sparkles className="w-3 h-3" /> Clique para resumo IA
            </p>
          </button>
        ))}
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

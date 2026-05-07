"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { Search, Megaphone, Sparkles, Loader2, ExternalLink, Filter, Download, ChevronLeft, ChevronRight } from "lucide-react";

import { useQuery, keepPreviousData, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Layout from "@/components/Layout";
import SEO from "@/components/SEO";
import {
  fetchAtuacaoPaginated,
  fetchAtuacaoAnos,
  fetchVereadores,
  fetchProjetos,
  ATUACAO_PAGE_SIZE,
  statusLabels,
  type AtuacaoParlamentar,
  type AtuacaoFilters,
  type Projeto,
} from "@/data/api";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
const supabase = createBrowserSupabaseClient();
import { useToast } from "@/hooks/use-toast";
import PullToRefresh from "@/components/PullToRefresh";

const TIPOS = ["Todos", "Indicação", "Requerimento", "Moção", "Projeto de Lei"] as const;

// Unified item type for display
type UnifiedItem = {
  id: string;
  tipo: string;
  numero: string | number;
  ano: number;
  data: string;
  descricao: string;
  autor_texto: string;
  autor_vereador_id: string | null;
  fonte_url: string;
  source: "atuacao" | "projeto";
  // Projeto-specific fields
  status?: string;
  origem?: string;
  ementa?: string;
  fonte_visualizar_url?: string;
  tags?: string[];
};

function normalizeProjetoToUnified(p: Projeto): UnifiedItem {
  return {
    id: p.id,
    tipo: p.tipo,
    numero: p.numero,
    ano: p.ano,
    data: p.data,
    descricao: p.ementa,
    autor_texto: p.autor_texto,
    autor_vereador_id: p.autor_vereador_id,
    fonte_url: p.fonte_visualizar_url,
    source: "projeto",
    status: p.status,
    origem: p.origem,
    ementa: p.ementa,
    fonte_visualizar_url: p.fonte_visualizar_url,
    tags: p.tags,
  };
}

function normalizeAtuacaoToUnified(a: AtuacaoParlamentar): UnifiedItem {
  return {
    id: a.id,
    tipo: a.tipo,
    numero: a.numero,
    ano: a.ano,
    data: a.data,
    descricao: a.descricao,
    autor_texto: a.autor_texto,
    autor_vereador_id: a.autor_vereador_id,
    fonte_url: a.fonte_url,
    source: "atuacao",
  };
}

const statusStyles: Record<string, string> = {
  aprovado: "bg-success/10 text-success border-success/20",
  recusado: "bg-destructive/10 text-destructive border-destructive/20",
  em_tramitacao: "bg-tramitacao/15 text-tramitacao border-tramitacao/20",
  apresentado: "bg-primary/10 text-primary border-primary/20",
};

function AtuacaoParlamentarPage() {
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [tipoFilter, setTipoFilter] = useState(searchParams.get("tipo") || "Todos");
  const [vereadorFilter, setVereadorFilter] = useState(searchParams.get("vereador") || "Todos");
  const [anoFilter, setAnoFilter] = useState("Todos");
  const [page, setPage] = useState(0);
  const [selectedItem, setSelectedItem] = useState<UnifiedItem | null>(null);
  const [resumo, setResumo] = useState<string | null>(null);
  const [loadingResumo, setLoadingResumo] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries();
  }, [queryClient]);
  const isProjetoFilter = tipoFilter === "Projeto de Lei";
  const isTodosFilter = tipoFilter === "Todos";

  // Debounce search with proper cleanup
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(value);
      setPage(0);
    }, 400);
  }, []);
  useEffect(() => () => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
  }, []);

  // Atuação query (skip when only projetos)
  const atuacaoFilters: AtuacaoFilters = useMemo(() => ({
    tipo: !isTodosFilter && !isProjetoFilter ? tipoFilter : undefined,
    vereadorId: vereadorFilter !== "Todos" ? vereadorFilter : undefined,
    ano: anoFilter !== "Todos" ? parseInt(anoFilter) : undefined,
    search: debouncedSearch.trim() || undefined,
  }), [tipoFilter, vereadorFilter, anoFilter, debouncedSearch, isTodosFilter, isProjetoFilter]);

  const { data: paginatedData, isLoading: isLoadingAtuacao } = useQuery({
    queryKey: ["atuacao-paginated", atuacaoFilters, page],
    queryFn: () => fetchAtuacaoPaginated(atuacaoFilters, page),
    placeholderData: keepPreviousData,
    enabled: !isProjetoFilter,
  });

  // Projetos query (fetch when Todos or Projeto de Lei)
  const { data: projetos = [], isLoading: isLoadingProjetos } = useQuery({
    queryKey: ["projetos"],
    queryFn: fetchProjetos,
    enabled: isTodosFilter || isProjetoFilter,
  });

  const { data: vereadores = [] } = useQuery({
    queryKey: ["vereadores"],
    queryFn: fetchVereadores,
  });

  const { data: anos = [] } = useQuery({
    queryKey: ["atuacao-anos"],
    queryFn: fetchAtuacaoAnos,
  });

  const vereadorMap = useMemo(() => {
    const map = new Map<string, string>();
    vereadores.forEach((v) => map.set(v.id, v.nome));
    return map;
  }, [vereadores]);

  const vereadorSlugMap = useMemo(() => {
    const map = new Map<string, string>();
    vereadores.forEach((v) => map.set(v.id, v.slug));
    return map;
  }, [vereadores]);

  // Filter projetos client-side
  const filteredProjetos = useMemo(() => {
    if (!isTodosFilter && !isProjetoFilter) return [];
    const q = debouncedSearch.toLowerCase();
    return projetos.filter((p) => {
      const matchSearch = !q || p.ementa.toLowerCase().includes(q) || `${p.numero}/${p.ano}`.includes(q) || p.autor_texto.toLowerCase().includes(q);
      const matchVereador = vereadorFilter === "Todos" || p.autor_vereador_id === vereadorFilter;
      const matchAno = anoFilter === "Todos" || p.ano === parseInt(anoFilter);
      return matchSearch && matchVereador && matchAno;
    }).map(normalizeProjetoToUnified);
  }, [projetos, debouncedSearch, vereadorFilter, anoFilter, isTodosFilter, isProjetoFilter]);

  // Build unified list
  const { items, totalCount, totalPages } = useMemo(() => {
    if (isProjetoFilter) {
      // Only projetos, paginate client-side
      const total = filteredProjetos.length;
      const from = page * ATUACAO_PAGE_SIZE;
      const sliced = filteredProjetos.slice(from, from + ATUACAO_PAGE_SIZE);
      return { items: sliced, totalCount: total, totalPages: Math.ceil(total / ATUACAO_PAGE_SIZE) };
    }

    if (isTodosFilter) {
      // Merge atuação + projetos, sort by date, paginate client-side
      const atuacaoItems = (paginatedData?.items || []).map(normalizeAtuacaoToUnified);
      const allMerged = [...atuacaoItems, ...filteredProjetos].sort(
        (a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()
      );
      const total = allMerged.length;
      const from = page * ATUACAO_PAGE_SIZE;
      const sliced = allMerged.slice(from, from + ATUACAO_PAGE_SIZE);
      return { items: sliced, totalCount: total, totalPages: Math.ceil(total / ATUACAO_PAGE_SIZE) };
    }

    // Specific atuação type
    const atuacaoItems = (paginatedData?.items || []).map(normalizeAtuacaoToUnified);
    const total = paginatedData?.totalCount || 0;
    return { items: atuacaoItems, totalCount: total, totalPages: Math.ceil(total / ATUACAO_PAGE_SIZE) };
  }, [paginatedData, filteredProjetos, page, isProjetoFilter, isTodosFilter]);

  const isLoading = isProjetoFilter ? isLoadingProjetos : isLoadingAtuacao;

  const handleOpenResumo = async (item: UnifiedItem) => {
    setSelectedItem(item);
    setResumo(null);
    setLoadingResumo(true);
    try {
      if (item.source === "atuacao") {
        if (item.id.startsWith("centi-")) {
          // Centi-sourced item: use generic summarizer
          const conteudo = `- Tipo: ${item.tipo}\n- Número: ${item.numero}/${item.ano}\n- Data: ${item.data}\n- Descrição: ${item.descricao}\n- Autor: ${item.autor_texto}`;
          const { data, error } = await supabase.functions.invoke("summarize-generic", {
            body: { tipo: item.tipo, conteudo },
          });
          if (error) throw error;
          setResumo(data?.resumo || data?.error || "Não foi possível gerar o resumo.");
        } else {
          const { data, error } = await supabase.functions.invoke("summarize-atuacao", {
            body: { atuacao_id: item.id },
          });
          if (error) throw error;
          setResumo(data?.error ? "Não foi possível gerar o resumo no momento." : data.resumo);
        }
      } else {
        // For projetos we don't have a dedicated summarize function yet, show ementa
        setResumo(item.ementa || "Sem resumo disponível.");
      }
    } catch {
      toast({ title: "Erro", description: "Falha ao gerar resumo.", variant: "destructive" });
      setResumo("Não foi possível gerar o resumo no momento.");
    } finally {
      setLoadingResumo(false);
    }
  };

  const handleExportCSV = () => {
    const headers = ["Tipo", "Número", "Ano", "Data", "Autor", "Descrição", "URL"];
    // Export all filtered items, not just current page
    const allItems = (() => {
      if (isProjetoFilter) return filteredProjetos;
      if (isTodosFilter) {
        const atuacaoItems = (paginatedData?.items || []).map(normalizeAtuacaoToUnified);
        return [...atuacaoItems, ...filteredProjetos].sort(
          (a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()
        );
      }
      return (paginatedData?.items || []).map(normalizeAtuacaoToUnified);
    })();
    const rows = allItems.map((a) => [
      a.tipo, a.numero, a.ano,
      new Date(a.data + "T12:00:00").toLocaleDateString("pt-BR"),
      a.autor_vereador_id ? vereadorMap.get(a.autor_vereador_id) || a.autor_texto : a.autor_texto,
      `"${a.descricao.replace(/"/g, '""')}"`,
      a.fonte_url,
    ]);
    const csv = [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `atuacao-parlamentar-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const resetFilters = () => {
    setSearch(""); setDebouncedSearch("");
    setTipoFilter("Todos"); setVereadorFilter("Todos"); setAnoFilter("Todos");
    setPage(0);
  };

  const changeFilter = (setter: (v: string) => void) => (v: string) => {
    setter(v); setPage(0);
  };

  const atuacaoContent = (
      <PullToRefresh onRefresh={handleRefresh}>
      <div className="container py-8">
        <div className="flex items-center gap-3 mb-6">
          <Megaphone className="w-6 h-6 text-accent" />
          <h1 className="text-2xl font-bold text-foreground">Atuação Parlamentar</h1>
        </div>

        {/* Filters */}
        <div className="space-y-3 mb-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => handleSearchChange(e.target.value)} placeholder="Buscar por descrição ou autor..." className="pl-10" aria-label="Buscar atuação parlamentar" />
          </div>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0 pb-1">
            <Select value={tipoFilter} onValueChange={(value) => changeFilter(setTipoFilter)(value || "Todos")}>
              <SelectTrigger className="w-40 flex-shrink-0" aria-label="Filtrar por tipo">
                <Filter className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIPOS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={vereadorFilter} onValueChange={(value) => changeFilter(setVereadorFilter)(value || "Todos")}>
              <SelectTrigger className="w-52 flex-shrink-0" aria-label="Filtrar por vereador">
                <SelectValue placeholder="Vereador" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Todos">Todos os vereadores</SelectItem>
                {vereadores.map((v) => <SelectItem key={v.id} value={v.id}>{v.nome}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={anoFilter} onValueChange={(value) => changeFilter(setAnoFilter)(value || "Todos")}>
              <SelectTrigger className="w-28 flex-shrink-0" aria-label="Filtrar por ano">
                <SelectValue placeholder="Ano" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Todos">Todos</SelectItem>
                {anos.map((a) => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Stats bar */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <Badge variant="outline" className="text-xs">{totalCount} resultado{totalCount !== 1 ? "s" : ""}</Badge>
          {items.length > 0 && totalPages > 1 && <Badge variant="secondary" className="text-xs">Página {page + 1} de {totalPages}</Badge>}
          {totalCount > 0 && (
            <button onClick={handleExportCSV} className="ml-auto inline-flex items-center gap-1.5 text-xs text-primary hover:underline">
              <Download className="w-3.5 h-3.5" /> Exportar CSV
            </button>
          )}
        </div>

        {/* Results */}
        {isLoading ? (
          <div className="space-y-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="stat-card animate-pulse h-20" />)}</div>
        ) : items.length === 0 ? (
          <div className="stat-card text-center py-12">
            <p className="text-muted-foreground">Nenhum resultado encontrado.</p>
            <button onClick={resetFilters} className="text-primary text-sm mt-2 hover:underline">Limpar filtros</button>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              item.source === "projeto" ? (
                <ProjetoUnifiedCard key={`proj-${item.id}`} item={item} vereadorMap={vereadorMap} vereadorSlugMap={vereadorSlugMap} />
              ) : (
                <button key={`atu-${item.id}`} onClick={() => handleOpenResumo(item)} className="stat-card card-hover block w-full text-left">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] font-normal flex-shrink-0">{item.tipo}</Badge>
                        nº {item.numero}/{item.ano}
                        <Sparkles className="w-3.5 h-3.5 text-accent flex-shrink-0" />
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.descricao}</p>
                      <p className="text-[11px] text-muted-foreground/70 mt-1">
                        {item.autor_vereador_id ? vereadorMap.get(item.autor_vereador_id) || item.autor_texto : item.autor_texto}
                      </p>
                    </div>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap mt-0.5">
                      {new Date(item.data + "T12:00:00").toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                </button>
              )
            ))}

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-4">
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm text-muted-foreground">{page + 1} / {totalPages}</span>
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        )}

        {/* AI Summary Dialog (for atuação items) */}
        <Dialog open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-base">{selectedItem?.tipo} nº {selectedItem?.numero}/{selectedItem?.ano}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">
                {selectedItem?.autor_texto} · {selectedItem && new Date(selectedItem.data + "T12:00:00").toLocaleDateString("pt-BR")}
              </p>
              <div className="rounded-lg bg-muted/50 border p-4">
                <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-accent" /> Resumo gerado por IA
                </p>
                {loadingResumo ? (
                  <div className="flex items-center gap-2 py-4 justify-center text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" /> Gerando resumo...
                  </div>
                ) : (
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">{resumo}</p>
                )}
              </div>
              {selectedItem?.descricao && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Descrição original</p>
                  <p className="text-xs text-muted-foreground">{selectedItem.descricao}</p>
                </div>
              )}
              <a href={selectedItem?.fonte_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                <ExternalLink className="w-3 h-3" /> Ver no portal oficial
              </a>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      </PullToRefresh>
  );

  return atuacaoContent;
}

export function AtuacaoContent() {
  return <AtuacaoParlamentarPage />;
}

function AtuacaoParlamentarPageWrapper() {
  return (
    <Layout>
      <SEO
        title="Atuação Parlamentar de Morrinhos GO"
        description="Morrinhos GO — Atuação parlamentar dos vereadores: indicações, requerimentos e moções. Dados oficiais da Câmara Municipal."
        path="/atuacao-parlamentar"
      />
      <AtuacaoParlamentarPage />
    </Layout>
  );
}

export default AtuacaoParlamentarPageWrapper;

// ==================== PROJETO CARD (unified view) ====================

function ProjetoUnifiedCard({ item, vereadorMap, vereadorSlugMap }: {
  item: UnifiedItem;
  vereadorMap: Map<string, string>;
  vereadorSlugMap: Map<string, string>;
}) {
  const autorNome = item.autor_vereador_id ? vereadorMap.get(item.autor_vereador_id) : null;
  const autorSlug = item.autor_vereador_id ? vereadorSlugMap.get(item.autor_vereador_id) : null;

  return (
    <div className="stat-card card-hover">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-foreground">
            {item.tipo} nº {item.numero}/{item.ano}
          </span>
          {item.status && (
            <Badge variant="outline" className={statusStyles[item.status] || ""}>
              {statusLabels[item.status] || item.status}
            </Badge>
          )}
        </div>
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {new Date(item.data + "T12:00:00").toLocaleDateString("pt-BR")}
        </span>
      </div>

      <p className="mt-2 text-sm text-foreground leading-relaxed">{item.ementa}</p>

      <div className="mt-3 flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
        {item.origem && <><span>Origem: {item.origem}</span><span>•</span></>}
        <span>
          Autor:{" "}
          {autorSlug ? (
            <Link href={`/vereadores/${autorSlug}`} className="text-primary hover:underline">{autorNome}</Link>
          ) : (
            item.autor_texto
          )}
        </span>
      </div>

      {item.tags && item.tags.length > 0 && (
        <div className="mt-2 flex gap-1.5 flex-wrap">
          {item.tags.map((tag) => (
            <span key={tag} className="px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground text-[11px]">{tag}</span>
          ))}
        </div>
      )}

      <div className="mt-3 flex items-center gap-2">
        <a href={item.fonte_url} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
          <ExternalLink className="w-3 h-3" /> Ver fonte
        </a>
      </div>
    </div>
  );
}

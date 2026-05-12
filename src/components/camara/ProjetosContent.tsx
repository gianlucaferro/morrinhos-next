"use client";

import { useState, useMemo } from "react";
import { Search, ExternalLink, Sparkles, FileText } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
const supabase = createBrowserSupabaseClient();
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AISummaryDialog, useAISummary } from "@/components/camara/AISummaryDialog";

interface ProjetoRow {
  id: string;
  tipo: string | null;
  numero: string | null;
  ano: number | null;
  data: string | null;
  ementa: string;
  origem: string | null;
  autor_texto: string | null;
  status: string | null;
  fonte_visualizar_url: string | null;
  fonte_download_url: string | null;
}

async function fetchProjetos(): Promise<ProjetoRow[]> {
  const { data, error } = await supabase
    .from("projetos")
    .select("id, tipo, numero, ano, data, ementa, origem, autor_texto, status, fonte_visualizar_url, fonte_download_url")
    .order("data", { ascending: false, nullsFirst: false })
    .order("ano", { ascending: false, nullsFirst: false })
    .limit(2000);
  if (error) throw error;
  return (data ?? []) as ProjetoRow[];
}

// Mapeia status do NucleoGov pra badge variant
function statusVariant(status: string | null): { variant: "default" | "secondary" | "outline" | "destructive"; color?: string } {
  if (!status) return { variant: "secondary" };
  const s = status.toUpperCase();
  if (s === "APROVADO" || s === "SANCIONADO") return { variant: "default", color: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" };
  if (s === "REJEITADO" || s === "VETADO NA ÍNTEGRA" || s === "VETADO PARCIALMENTE") return { variant: "destructive" };
  if (s === "ARQUIVADO" || s === "RETIRADO") return { variant: "outline" };
  return { variant: "secondary" };
}

export function ProjetosContent() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [tipoFilter, setTipoFilter] = useState("todos");
  const [anoFilter, setAnoFilter] = useState("todos");
  const { selectedItem, resumo, loading, requestSummary, close } = useAISummary();

  const { data: projetos = [], isLoading } = useQuery({
    queryKey: ["projetos"],
    queryFn: fetchProjetos,
  });

  // Filtros dinâmicos com base nos dados
  const { tiposDisponiveis, statusDisponiveis, anosDisponiveis } = useMemo(() => {
    const tipos = new Set<string>();
    const status = new Set<string>();
    const anos = new Set<number>();
    projetos.forEach((p) => {
      if (p.tipo) tipos.add(p.tipo);
      if (p.status) status.add(p.status);
      if (p.ano) anos.add(p.ano);
    });
    return {
      tiposDisponiveis: Array.from(tipos).sort(),
      statusDisponiveis: Array.from(status).sort(),
      anosDisponiveis: Array.from(anos).sort((a, b) => b - a),
    };
  }, [projetos]);

  const filtered = useMemo(() => {
    return projetos.filter((p) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        p.ementa.toLowerCase().includes(q) ||
        `${p.numero}/${p.ano}`.includes(q) ||
        (p.autor_texto ?? "").toLowerCase().includes(q);
      const matchStatus = statusFilter === "todos" || p.status === statusFilter;
      const matchTipo = tipoFilter === "todos" || p.tipo === tipoFilter;
      const matchAno = anoFilter === "todos" || `${p.ano}` === anoFilter;
      return matchSearch && matchStatus && matchTipo && matchAno;
    });
  }, [projetos, search, statusFilter, tipoFilter, anoFilter]);

  const handleProjetoClick = (p: ProjetoRow) => {
    const conteudo = `- Tipo: ${p.tipo}\n- Número: ${p.numero}/${p.ano}\n- Autor: ${p.autor_texto}\n- Origem: ${p.origem}\n- Status: ${p.status}\n- Data: ${p.data}\n- Ementa: ${p.ementa}`;
    requestSummary(
      p.id,
      p.tipo ?? "Projeto",
      conteudo,
      `${p.tipo} nº ${p.numero}/${p.ano}`,
      undefined,
      p.fonte_visualizar_url || undefined,
    );
  };

  return (
    <div className="container py-4 space-y-4">
      <p className="text-sm text-muted-foreground">
        {projetos.length > 0
          ? `${projetos.length} projetos legislativos da Câmara Municipal de Morrinhos. Inclui Projetos de Lei (do Legislativo e Executivo), Decretos, Resoluções, Requerimentos, Indicações e Moções. Dados oficiais do NucleoGov.`
          : "Projetos legislativos da Câmara Municipal de Morrinhos."}
      </p>

      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por ementa, número ou autor..."
            className="pl-10"
            aria-label="Buscar projeto"
          />
        </div>
        <Select value={tipoFilter} onValueChange={setTipoFilter}>
          <SelectTrigger className="w-[200px]" aria-label="Filtrar por tipo">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os tipos</SelectItem>
            {tiposDisponiveis.map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]" aria-label="Filtrar por situação">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas situações</SelectItem>
            {statusDisponiveis.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={anoFilter} onValueChange={setAnoFilter}>
          <SelectTrigger className="w-[120px]" aria-label="Filtrar por ano">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos anos</SelectItem>
            {anosDisponiveis.map((a) => (
              <SelectItem key={a} value={`${a}`}>{a}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <p className="text-xs text-muted-foreground">
        {filtered.length} resultado(s){projetos.length > 0 ? ` de ${projetos.length}` : ""}
      </p>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="stat-card animate-pulse h-32" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="stat-card text-center py-12">
          <FileText className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground">Nenhum projeto encontrado.</p>
          {(search || statusFilter !== "todos" || tipoFilter !== "todos" || anoFilter !== "todos") && (
            <button
              onClick={() => { setSearch(""); setStatusFilter("todos"); setTipoFilter("todos"); setAnoFilter("todos"); }}
              className="text-primary text-sm mt-2 hover:underline"
            >
              Limpar filtros
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((p) => {
            const sv = statusVariant(p.status);
            return (
              <button
                key={p.id}
                onClick={() => handleProjetoClick(p)}
                className="stat-card card-hover block w-full text-left"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      {p.tipo && <Badge variant="outline" className="text-[10px]">{p.tipo}</Badge>}
                      {p.numero && p.ano && (
                        <span className="text-xs font-semibold text-primary">
                          Nº {p.numero}/{p.ano}
                        </span>
                      )}
                      {p.status && (
                        <Badge variant={sv.variant} className={`text-[10px] ${sv.color ?? ""}`}>
                          {p.status}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-foreground line-clamp-3 leading-snug">
                      {p.ementa}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      {p.autor_texto && (
                        <span className="text-[11px] text-muted-foreground">
                          <span className="font-medium">Autoria:</span> {p.autor_texto}
                        </span>
                      )}
                      {p.data && (
                        <span className="text-[11px] text-muted-foreground">
                          • {new Date(p.data + "T12:00:00").toLocaleDateString("pt-BR")}
                        </span>
                      )}
                      <span className="text-[11px] text-primary/70 flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> Clique para resumo IA
                      </span>
                    </div>
                  </div>
                  {p.fonte_visualizar_url && (
                    <a
                      href={p.fonte_visualizar_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="shrink-0 text-primary hover:text-primary/80"
                      title="Ver na Câmara"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </button>
            );
          })}
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

export default function ProjetosPage() {
  return (
    <Layout>
      <div className="container py-8">
        <h1 className="text-2xl font-bold text-foreground mb-6">Projetos</h1>
        <ProjetosContent />
      </div>
    </Layout>
  );
}

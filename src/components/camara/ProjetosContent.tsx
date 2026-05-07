"use client";

import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import ProjetoCard from "@/components/ProjetoCard";
import { fetchProjetos, fetchVereadores } from "@/data/api";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AISummaryDialog, useAISummary } from "@/components/camara/AISummaryDialog";
import type { Projeto } from "@/data/api";

export function ProjetosContent() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [origemFilter, setOrigemFilter] = useState("todos");
  const { selectedItem, resumo, loading, requestSummary, close } = useAISummary();

  const { data: projetos = [], isLoading } = useQuery({
    queryKey: ["projetos"],
    queryFn: fetchProjetos,
  });

  const { data: vereadores = [] } = useQuery({
    queryKey: ["vereadores"],
    queryFn: fetchVereadores,
  });

  const filtered = useMemo(() => {
    return projetos.filter((p) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        p.ementa.toLowerCase().includes(q) ||
        `${p.numero}/${p.ano}`.includes(q) ||
        p.autor_texto.toLowerCase().includes(q);
      const matchStatus = statusFilter === "todos" || p.status === statusFilter;
      const matchOrigem = origemFilter === "todos" || p.origem === origemFilter;
      return matchSearch && matchStatus && matchOrigem;
    });
  }, [projetos, search, statusFilter, origemFilter]);

  const handleProjetoClick = (p: Projeto) => {
    const conteudo = `- Tipo: ${p.tipo}\n- Número: ${p.numero}/${p.ano}\n- Autor: ${p.autor_texto}\n- Origem: ${p.origem}\n- Status: ${p.status}\n- Data: ${p.data}\n- Ementa: ${p.ementa}${p.resumo_simples ? `\n- Resumo existente: ${p.resumo_simples}` : ""}`;
    requestSummary(p.id, "Projeto de Lei", conteudo, `${p.tipo} nº ${p.numero}/${p.ano}`);
  };

  return (
    <div className="container py-4 space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por ementa, número ou autor..."
            className="pl-10"
            aria-label="Buscar projeto"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44" aria-label="Filtrar por situação">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas situações</SelectItem>
            <SelectItem value="aprovado">Aprovado</SelectItem>
            <SelectItem value="recusado">Recusado</SelectItem>
            <SelectItem value="em_tramitacao">Em tramitação</SelectItem>
          </SelectContent>
        </Select>
        <Select value={origemFilter} onValueChange={setOrigemFilter}>
          <SelectTrigger className="w-40" aria-label="Filtrar por origem">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas origens</SelectItem>
            <SelectItem value="Legislativo">Legislativo</SelectItem>
            <SelectItem value="Executivo">Executivo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="stat-card animate-pulse h-32" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="stat-card text-center py-12">
          <p className="text-muted-foreground">Nenhum projeto encontrado.</p>
          <button
            onClick={() => { setSearch(""); setStatusFilter("todos"); setOrigemFilter("todos"); }}
            className="text-primary text-sm mt-2 hover:underline"
          >
            Limpar filtros
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((p) => (
            <div key={p.id} onClick={() => handleProjetoClick(p)} className="cursor-pointer">
              <ProjetoCard p={p} vereadores={vereadores} />
            </div>
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

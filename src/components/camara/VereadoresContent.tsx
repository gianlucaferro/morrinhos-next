"use client";

import { useState, useMemo, useCallback } from "react";
import { Search } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import SEO from "@/components/SEO";
import VereadorCard from "@/components/VereadorCard";
import { VereadorCardSkeleton } from "@/components/CardSkeleton";
import { fetchVereadores } from "@/data/api";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PullToRefresh from "@/components/PullToRefresh";

export function VereadoresContent() {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("nome");
  const queryClient = useQueryClient();

  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["vereadores"] });
  }, [queryClient]);

  const { data: vereadores = [], isLoading } = useQuery({
    queryKey: ["vereadores"],
    queryFn: fetchVereadores,
  });

  const filtered = useMemo(() => {
    let list = vereadores.filter((v) =>
      v.nome.toLowerCase().includes(search.toLowerCase())
    );
    if (sort === "nome") list.sort((a, b) => a.nome.localeCompare(b.nome));
    return list;
  }, [vereadores, search, sort]);

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="container">

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome..."
              className="pl-10"
              aria-label="Buscar vereador"
            />
          </div>
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="w-48" aria-label="Ordenar por">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="nome">Nome (A-Z)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="mb-6 p-4 rounded-lg bg-muted/50 border border-border text-sm text-muted-foreground">
          <p>
            Dados extraídos do{" "}
            <a href="https://morrinhos.go.leg.br" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              portal oficial da Câmara de Morrinhos
            </a>
            {" "}e do{" "}
            <a href="https://acessoainformacao.morrinhos.go.leg.br/cidadao/legislacao/leis" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              portal de transparência NucleoGov
            </a>
            . Vereadores com zero projetos ainda não apresentaram proposições nesta legislatura (2025–2028).
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <VereadorCardSkeleton key={i} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="stat-card text-center py-12">
            <p className="text-muted-foreground">Nenhum vereador encontrado.</p>
            <button onClick={() => setSearch("")} className="text-primary text-sm mt-2 hover:underline">
              Limpar busca
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((v) => (
              <VereadorCard key={v.id} v={v} />
            ))}
          </div>
        )}
      </div>
    </PullToRefresh>
  );
}

export default function VereadoresPage() {
  return (
    <Layout>
      <SEO
        title="Vereadores de Morrinhos GO — Mandato 2025–2028"
        description="Morrinhos GO — Conheça os 15 vereadores: projetos de lei, votações, remuneração, presença em sessões e atuação parlamentar. Mandato 2025–2028."
        path="/vereadores"
      />
      <div className="container py-8">
        <h1 className="text-2xl font-bold text-foreground mb-6">Vereadores</h1>
      </div>
      <VereadoresContent />
    </Layout>
  );
}

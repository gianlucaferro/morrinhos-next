"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Activity, FileText, Search, User, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import RankingChart from "@/components/RankingChart";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/useDebounce";
import {
  fetchAllAtuacao,
  fetchProjetos,
  fetchVereadores,
} from "@/data/api";
import {
  fetchAtividadeRecente,
  fetchDecretosBusca,
  fetchLeisMunicipaisBusca,
  fetchPortariasBusca,
  fetchServidoresBusca,
} from "@/data/homeApi";

export function HomeCivicSearch({ variant = "card" }: { variant?: "card" | "hero" }) {
  const [search, setSearch] = useState("");
  const q = useDebounce(search.trim().toLowerCase(), 250);
  const hasSearch = q.length >= 2;
  const isHero = variant === "hero";

  const { data: vereadores = [] } = useQuery({ queryKey: ["home-vereadores"], queryFn: fetchVereadores });
  const { data: projetos = [] } = useQuery({ queryKey: ["home-projetos"], queryFn: fetchProjetos, enabled: hasSearch });
  const { data: servidores = [] } = useQuery({ queryKey: ["home-servidores-busca"], queryFn: fetchServidoresBusca, enabled: hasSearch });
  const { data: leis = [] } = useQuery({ queryKey: ["home-leis-busca"], queryFn: fetchLeisMunicipaisBusca, enabled: hasSearch });
  const { data: decretos = [] } = useQuery({ queryKey: ["home-decretos-busca"], queryFn: fetchDecretosBusca, enabled: hasSearch });
  const { data: portarias = [] } = useQuery({ queryKey: ["home-portarias-busca"], queryFn: fetchPortariasBusca, enabled: hasSearch });

  const results = useMemo(() => {
    if (!hasSearch) return [];
    const includes = (value: unknown) => String(value || "").toLowerCase().includes(q);
    return [
      ...vereadores
        .filter((v) => includes(v.nome) || includes(v.partido))
        .slice(0, 5)
        .map((v) => ({ type: "Vereador", title: v.nome, sub: v.partido || "Câmara Municipal", href: `/vereadores/${v.slug}`, icon: User })),
      ...servidores
        .filter((s) => includes(s.nome) || includes(s.cargo))
        .slice(0, 5)
        .map((s) => ({ type: "Servidor", title: s.nome, sub: s.cargo || "Servidor público", href: `/prefeitura?tab=servidores&q=${encodeURIComponent(s.nome)}`, icon: User })),
      ...projetos
        .filter((p) => includes(p.ementa) || includes(p.autor_texto) || includes(`${p.numero}/${p.ano}`))
        .slice(0, 5)
        .map((p) => ({ type: "Projeto", title: `${p.tipo} nº ${p.numero}/${p.ano}`, sub: p.ementa, href: "/camara?tab=projetos", icon: FileText })),
      ...leis
        .filter((l) => includes(l.ementa) || includes(l.numero))
        .slice(0, 4)
        .map((l) => ({ type: "Lei", title: `Lei nº ${l.numero}`, sub: l.ementa, href: "/prefeitura?tab=leis", icon: FileText })),
      ...decretos
        .filter((d) => includes(d.ementa) || includes(d.numero))
        .slice(0, 4)
        .map((d) => ({ type: "Decreto", title: `Decreto nº ${d.numero}`, sub: d.ementa, href: "/prefeitura?tab=decretos", icon: FileText })),
      ...portarias
        .filter((p) => includes(p.ementa) || includes(p.numero))
        .slice(0, 4)
        .map((p) => ({ type: "Portaria", title: `Portaria nº ${p.numero}`, sub: p.ementa, href: "/prefeitura?tab=portarias", icon: FileText })),
    ].slice(0, 18);
  }, [hasSearch, q, vereadores, servidores, projetos, leis, decretos, portarias]);

  const input = (
    <>
      <div className="relative">
        <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isHero ? "text-white/70" : "text-muted-foreground"}`} />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar vereadores, servidores, leis, decretos, portarias e projetos..."
          className={`pl-10 pr-10 ${isHero ? "h-11 rounded-xl border-white/30 bg-white/10 text-white placeholder:text-white/65 backdrop-blur-sm focus-visible:ring-white/60" : ""}`}
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            className={`absolute right-3 top-1/2 -translate-y-1/2 ${isHero ? "text-white/70 hover:text-white" : "text-muted-foreground hover:text-foreground"}`}
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      {hasSearch && (
        <div className={isHero ? "mt-3 grid grid-cols-1 md:grid-cols-2 gap-2 rounded-xl border border-white/20 bg-background/95 p-2 shadow-xl backdrop-blur" : "mt-4 grid grid-cols-1 md:grid-cols-2 gap-2"}>
          {results.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 px-2">Nenhum resultado encontrado.</p>
          ) : (
            results.map((item) => (
              <Link key={`${item.type}-${item.title}-${item.href}`} href={item.href} className="rounded-lg border border-border p-3 hover:border-primary/50 transition-colors">
                <div className="flex items-start gap-3">
                  <item.icon className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{item.type}</p>
                    <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">{item.sub}</p>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      )}
    </>
  );

  if (isHero) {
    return (
      <section className="mt-5 w-full max-w-xl" aria-labelledby="heading-busca-civica">
        <h2 id="heading-busca-civica" className="sr-only">Busca pública</h2>
        {input}
      </section>
    );
  }

  return (
    <section aria-labelledby="heading-busca-civica">
      <div className="stat-card">
        <h2 id="heading-busca-civica" className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
          <Search className="w-5 h-5 text-primary" />
          Busca pública
        </h2>
        {input}
      </div>
    </section>
  );
}

export function HomeCivicInsights() {
  const [showRanking, setShowRanking] = useState(true);

  const {
    data: vereadores = [],
    isLoading: isLoadingVereadores,
    isError: isVereadoresError,
  } = useQuery({ queryKey: ["home-vereadores"], queryFn: fetchVereadores });
  const {
    data: atuacoes = [],
    isLoading: isLoadingAtuacoes,
    isError: isAtuacoesError,
  } = useQuery({ queryKey: ["home-atuacoes"], queryFn: fetchAllAtuacao });
  const { data: atividade } = useQuery({ queryKey: ["home-atividade-recente"], queryFn: fetchAtividadeRecente });

  return (
    <section className="space-y-6" aria-label="Atuação parlamentar em destaque">
      <section className="stat-card">
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          Atividade Recente da Câmara
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <ActivityItem label="Último projeto" title={atividade?.ultimoProjeto ? `${atividade.ultimoProjeto.tipo} nº ${atividade.ultimoProjeto.numero}/${atividade.ultimoProjeto.ano}` : "-"} sub={atividade?.ultimoProjeto?.ementa} />
          <ActivityItem label="Último aprovado" title={atividade?.ultimoAprovado ? `${atividade.ultimoAprovado.tipo} nº ${atividade.ultimoAprovado.numero}/${atividade.ultimoAprovado.ano}` : "-"} sub={atividade?.ultimoAprovado?.ementa} />
          <ActivityItem label="Último requerimento" title={atividade?.ultimoRequerimento ? `Requerimento nº ${atividade.ultimoRequerimento.numero}/${atividade.ultimoRequerimento.ano}` : "-"} sub={atividade?.ultimoRequerimento?.descricao} />
        </div>
      </section>

      <RankingChart
        atuacoes={atuacoes}
        vereadores={vereadores}
        show={showRanking}
        onToggle={setShowRanking}
        isLoading={isLoadingVereadores || isLoadingAtuacoes}
        isError={isVereadoresError || isAtuacoesError}
      />
    </section>
  );
}

export default function HomeCivicClient() {
  return (
    <>
      <HomeCivicSearch />
      <HomeCivicInsights />
    </>
  );
}

function ActivityItem({ label, title, sub }: { label: string; title: string; sub?: string | null }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold text-foreground mt-1">{title}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{sub}</p>}
    </div>
  );
}

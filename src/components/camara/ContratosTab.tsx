"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchCamaraContratos } from "@/data/camaraApi";
import { fetchContratosAditivos } from "@/data/contratosAditivosApi";
import { Badge } from "@/components/ui/badge";
import { Search, FileSignature, ExternalLink, Sparkles, Loader2, Building2, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState, useRef, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
const supabase = createBrowserSupabaseClient();
import { calcularSuspeitaContrato, normalizarCamara, type FornecedorCNPJ } from "@/lib/contratoSuspeita";
import { buildAditivosLookup, getAditivosDoContrato } from "@/lib/contratosAditivos";
import { formatCurrency } from "@/lib/formatters";
import { downloadCSV } from "@/lib/csvExport";

export default function ContratosTab() {
  const [search, setSearch] = useState("");
  const { data: contratos, isLoading } = useQuery({ queryKey: ["camara-contratos"], queryFn: fetchCamaraContratos });

  const filtered = (contratos || []).filter((c) =>
    !search || [c.objeto, c.credor, c.numero].some((f) => f?.toLowerCase().includes(search.toLowerCase()))
  );

  const totalValor = filtered.reduce((s, c) => s + (c.valor || 0), 0);

  // Fetch aditivos for scoring (include cnpj)
  const { data: aditivosData } = useQuery({
    queryKey: ["camara-aditivos-scoring"],
    queryFn: fetchContratosAditivos,
    staleTime: 1000 * 60 * 5,
  });

  // Fetch CNPJ data for scoring
  const { data: cnpjData } = useQuery({
    queryKey: ["fornecedores-cnpj"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fornecedores_cnpj")
        .select("cnpj, razao_social, data_abertura, situacao_cadastral, capital_social, cnae_descricao");
      if (error) throw error;
      const map = new Map<string, FornecedorCNPJ>();
      for (const f of data || []) {
        map.set(f.cnpj, f as FornecedorCNPJ);
      }
      return map;
    },
  });

  const aditivosPorContrato = useMemo(() => buildAditivosLookup(aditivosData || []), [aditivosData]);

  // Helper to get aditivos value for a specific contract
  const getAditivosValor = (numero: string | null, credor: string | null, fonteUrl?: string | null) => {
    return getAditivosDoContrato(aditivosPorContrato, numero, credor, fonteUrl)?.totalValor || 0;
  };

  // Client-side risk scoring
  const suspeitos = useMemo(() => {
    if (!contratos?.length) return new Set<string>();
    const normalizados = contratos.map(normalizarCamara);
    const aditivos = (aditivosData || []).map((a) => ({
      contrato_numero: a.contrato_numero,
      valor: a.valor,
      cnpj: a.cnpj,
      credor: a.credor,
    }));
    const ids = new Set<string>();
    for (const c of normalizados) {
      if (calcularSuspeitaContrato(c, normalizados, aditivos, cnpjData || undefined)) {
        ids.add(c.id);
      }
    }
    return ids;
  }, [contratos, aditivosData, cnpjData]);

  // Maior fornecedor
  const maiorFornecedor = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of contratos || []) {
      if (!c.credor) continue;
      map.set(c.credor, (map.get(c.credor) || 0) + (c.valor || 0));
    }
    let top = { nome: "", valor: 0, qtd: 0 };
    for (const [nome, valor] of map) {
      if (valor > top.valor) {
        top = { nome, valor, qtd: 0 };
      }
    }
    if (top.nome) {
      top.qtd = (contratos || []).filter((c) => c.credor === top.nome).length;
    }
    return top.nome ? top : null;
  }, [contratos]);

  // Resumo IA
  const [selectedContrato, setSelectedContrato] = useState<typeof filtered[0] | null>(null);
  const [resumo, setResumo] = useState<string | null>(null);
  const [loadingResumo, setLoadingResumo] = useState(false);
  const cache = useRef<Record<string, string>>({});

  const handleClick = async (c: typeof filtered[0]) => {
    setSelectedContrato(c);
    if (cache.current[c.id]) {
      setResumo(cache.current[c.id]);
      setLoadingResumo(false);
      return;
    }
    setResumo(null);
    setLoadingResumo(true);
    try {
      const { data, error } = await supabase.functions.invoke("summarize-camara-contrato", {
        body: { contrato_id: c.id },
      });
      if (error) throw error;
      const r = data?.resumo || data?.error || "Não foi possível gerar o resumo.";
      cache.current[c.id] = r;
      setResumo(r);
    } catch {
      const r = "Não foi possível gerar o resumo no momento.";
      setResumo(r);
    } finally {
      setLoadingResumo(false);
    }
  };

  return (
    <div className="container py-4 space-y-4">
      <p className="text-sm text-muted-foreground">Contratos firmados pela Câmara Municipal de Morrinhos.</p>
      

      {/* Card maior fornecedor */}
      {maiorFornecedor && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="w-5 h-5 text-primary" />
            <span className="text-xs font-semibold text-primary uppercase tracking-wide">Maior Fornecedor</span>
          </div>
          <p className="font-bold text-foreground text-lg">{maiorFornecedor.nome}</p>
          <div className="flex items-center gap-4 mt-1">
            <span className="text-sm text-muted-foreground">{maiorFornecedor.qtd} contrato{maiorFornecedor.qtd > 1 ? "s" : ""}</span>
            <span className="text-lg font-bold text-accent">{formatCurrency(maiorFornecedor.valor)}</span>
          </div>
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar contrato..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{filtered.length} contratos · Total: {formatCurrency(totalValor)}</p>
        {filtered.length > 0 && (
          <button onClick={() => downloadCSV(
            `contratos-camara-${new Date().toISOString().slice(0, 10)}.csv`,
            ["Número", "Credor", "Objeto", "Valor", "Status", "Início Vigência", "Fim Vigência"],
            filtered.map((c) => [c.numero, c.credor, c.objeto, c.valor, c.status, c.vigencia_inicio, c.vigencia_fim])
          )} className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline">
            <Download className="w-3.5 h-3.5" /> CSV
          </button>
        )}
      </div>

      {isLoading && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Carregando contratos…</p>
        </div>
      )}

      {!isLoading && !filtered.length && (
        <div className="stat-card text-center py-8">
          <FileSignature className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-semibold text-foreground">Sem contratos</h3>
          <p className="text-sm text-muted-foreground mt-1">Os dados serão sincronizados automaticamente.</p>
        </div>
      )}

      <div className="space-y-2">
        {filtered.map((c) => (
          <button
            key={c.id}
            onClick={() => handleClick(c)}
            className="stat-card card-hover block w-full text-left relative"
          >
            {suspeitos.has(c.id) && (
              <div className="absolute top-2 right-2 w-3 h-3 bg-red-600 rounded-full" />
            )}
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground text-sm">{c.credor || "Sem fornecedor"}</p>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{c.objeto || "Sem descrição"}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-[11px] text-muted-foreground">Nº {c.numero || "—"}</span>
                  {c.vigencia_inicio && (
                    <span className="text-[11px] text-muted-foreground">
                      · {new Date(c.vigencia_inicio + "T12:00:00").toLocaleDateString("pt-BR")}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-primary/70 flex items-center gap-1 mt-1">
                  <Sparkles className="w-3 h-3" /> Clique para resumo IA
                </p>
              </div>
              <div className="flex flex-col items-end shrink-0 gap-1">
                {c.status && (
                  <Badge
                    variant={c.status === "ativo" ? "default" : "secondary"}
                    className={`text-[10px] uppercase tracking-wider ${c.status === "ativo" ? "bg-emerald-500/90 hover:bg-emerald-500 text-white border-emerald-500" : ""}`}
                  >
                    {c.status}
                  </Badge>
                )}
                <span className="text-base font-bold text-foreground whitespace-nowrap">
                  {formatCurrency(c.valor)}
                </span>
                {(() => { const av = getAditivosValor(c.numero, c.credor, c.fonte_url); return av > 0 ? (
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                    c/ aditivos: {formatCurrency((c.valor || 0) + av)}
                  </span>
                ) : null; })()}
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Dialog resumo IA */}
      <Dialog open={!!selectedContrato} onOpenChange={(open) => !open && setSelectedContrato(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <FileSignature className="w-4 h-4 text-primary" />
              Contrato {selectedContrato?.numero || ""}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {selectedContrato?.credor && (
              <p className="font-semibold text-foreground">{selectedContrato.credor}</p>
            )}
            {selectedContrato?.objeto && (
              <p className="text-sm text-muted-foreground">{selectedContrato.objeto}</p>
            )}
            <div className="flex flex-wrap gap-3 text-sm">
              {selectedContrato?.valor !== null && (
                <span className="font-bold text-accent">{formatCurrency(selectedContrato?.valor ?? null)}</span>
              )}
              {selectedContrato?.status && (
                <Badge variant={selectedContrato.status === "ativo" ? "default" : "secondary"}>
                  {selectedContrato.status}
                </Badge>
              )}
            </div>
            {(selectedContrato?.vigencia_inicio || selectedContrato?.vigencia_fim) && (
              <p className="text-xs text-muted-foreground">
                Vigência: {selectedContrato?.vigencia_inicio ? new Date(selectedContrato.vigencia_inicio + "T12:00:00").toLocaleDateString("pt-BR") : "?"} — {selectedContrato?.vigencia_fim ? new Date(selectedContrato.vigencia_fim + "T12:00:00").toLocaleDateString("pt-BR") : "?"}
              </p>
            )}
            {selectedContrato?.fonte_url && (
              <a href={selectedContrato.fonte_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline inline-flex items-center gap-1">
                <ExternalLink className="w-3 h-3" /> Ver fonte
              </a>
            )}

            <div className="rounded-lg bg-muted/50 border p-4">
              <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-accent" /> Resumo gerado por IA
              </p>
              {loadingResumo ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" /> Gerando resumo...
                </div>
              ) : (
                <p className="text-sm text-foreground whitespace-pre-line leading-relaxed">{resumo}</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

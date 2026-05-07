"use client";

import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import SEO from "@/components/SEO";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, Download, BookOpen, ScrollText } from "lucide-react";
import {
  ExternalLink, Phone, Mail, MapPin, Clock, Building2,
  Users, DollarSign, FileText, Gavel, Briefcase, HardHat,
  Search, Info, BarChart3, RefreshCw, Settings, CheckCircle2,
  AlertCircle, AlertTriangle, Loader2, Sparkles, Truck
} from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
const supabase = createBrowserSupabaseClient();
import {
  fetchExecutivo, fetchSecretarias, fetchServidores,
  fetchDespesas, fetchContratos, fetchLicitacoes,
  fetchDiarias, fetchObras, fetchSecretariosRemuneracao,
  fetchProcuradores, fetchExecutivoRemuneracao,
  type Executivo, type Contrato, type Licitacao
} from "@/data/prefeituraApi";
import { fetchContratosAditivos } from "@/data/contratosAditivosApi";
import PullToRefresh from "@/components/PullToRefresh";
import VeiculosTab from "@/components/prefeitura/VeiculosTab";
import PrefeituraDestaques from "@/components/prefeitura/PrefeituraDestaques";
import { LayoutDashboard } from "lucide-react";
import { calcularSuspeitaContrato, normalizarPrefeitura, type FornecedorCNPJ } from "@/lib/contratoSuspeita";
import { buildAditivosLookup, getAditivosDoContrato } from "@/lib/contratosAditivos";
import { downloadCSV } from "@/lib/csvExport";
import { getTooltip } from "@/lib/glossario";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

function EmptyState({ icon: Icon, title, description, fonteUrl }: {
  icon: React.ElementType; title: string; description: string; fonteUrl?: string;
}) {
  return (
    <div className="stat-card flex flex-col items-center justify-center py-12 text-center">
      <div className="p-4 rounded-2xl bg-muted mb-4">
        <Icon className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-md">{description}</p>
      <p className="text-[10px] text-muted-foreground/60 mt-2">Dados sincronizados automaticamente do portal de transparência</p>
      {fonteUrl && (
        <a href={fonteUrl} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-2">
          <ExternalLink className="w-3 h-3" /> Ver fonte oficial
        </a>
      )}
    </div>
  );
}

function ExpiryBadge({ vigenciaFim }: { vigenciaFim: string | null }) {
  if (!vigenciaFim) return null;
  const fim = new Date(vigenciaFim + "T23:59:59");
  const hoje = new Date();
  const diasRestantes = Math.ceil((fim.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
  if (diasRestantes < 0) return <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-destructive/15 text-destructive">Vencido</span>;
  if (diasRestantes <= 30) return <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-warning/15 text-warning">Vence em {diasRestantes}d</span>;
  return null;
}

function formatCurrency(value: number | null) {
  if (value == null) return "—";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// ===== SUB-TABS =====


function ChefiaExecutivo() {
  const { data: executivo, isLoading } = useQuery({ queryKey: ["executivo"], queryFn: fetchExecutivo });
  const { data: remuneracoes } = useQuery({ queryKey: ["executivo-remuneracao"], queryFn: fetchExecutivoRemuneracao });

  if (isLoading) return <div className="stat-card animate-pulse h-40" />;

  if (!executivo?.length) {
    return <EmptyState icon={Building2} title="Sem dados" description="Dados da chefia do Executivo não disponíveis." />;
  }

  const getRemuneracao = (nome: string) => {
    return remuneracoes?.find(r => r.nome.toLowerCase() === nome.toLowerCase());
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {executivo.map((a) => {
        const rem = getRemuneracao(a.nome);
        return (
        <div key={a.id} className="stat-card space-y-4">
          <div className="flex items-start gap-4">
            <div className="w-32 sm:w-40 aspect-[4/5] rounded-2xl bg-primary/10 flex-shrink-0 overflow-hidden">
              {a.foto_url && (
                <img src={a.foto_url} alt={`Foto de ${a.nome}`}
                  className="w-full h-full rounded-2xl object-cover object-top"
                  onError={(e) => { e.currentTarget.style.display = "none"; }} />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-bold text-foreground">{a.nome}</h2>
              <Badge variant="secondary" className="mt-1">
                {a.tipo === "prefeita" ? "Prefeita Municipal" : "Vice-Prefeito"}
              </Badge>
              {a.partido && <p className="text-xs text-muted-foreground mt-1">{a.partido}</p>}
              <p className="text-xs text-muted-foreground mt-1">
                Mandato {parseInt(a.mandato_inicio)}–{parseInt(a.mandato_fim)}
              </p>
              <div className="mt-2 space-y-1">
                <div className="flex items-center gap-2 rounded-lg bg-accent/10 px-3 py-1.5">
                  <DollarSign className="w-4 h-4 text-accent" />
                  <span className="text-base font-bold text-foreground">
                    {a.tipo === "prefeita" ? "R$ 19.875,00" : "R$ 9.875,00"}
                  </span>
                  <span className="text-xs text-muted-foreground">/mês</span>
                </div>
                {rem?.bruto && (
                  <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-1">
                    <span className="text-xs text-muted-foreground">Bruto:</span>
                    <span className="text-sm font-semibold text-foreground">{formatCurrency(rem.bruto)}</span>
                    <span className="text-[10px] text-muted-foreground ml-auto">{rem.competencia}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-2.5 pt-2 border-t border-border">
            {a.telefone && (
              <div className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-primary flex-shrink-0" />
                <a href={`tel:${a.telefone.replace(/\D/g, "")}`}
                  className="text-sm text-foreground hover:text-primary transition-colors">
                  {a.telefone}
                </a>
              </div>
            )}
            {a.email && (
              <div className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-primary flex-shrink-0" />
                <a href={`mailto:${a.email}`}
                  className="text-sm text-foreground hover:text-primary transition-colors break-all">
                  {a.email}
                </a>
              </div>
            )}
            {a.horario && (
              <div className="flex items-start gap-2.5">
                <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                <p className="text-sm text-muted-foreground">{a.horario}</p>
              </div>
            )}
            {a.endereco && (
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                <p className="text-sm text-muted-foreground">{a.endereco}</p>
              </div>
            )}
          </div>

          <a href={a.fonte_url} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
            <ExternalLink className="w-3 h-3" /> Ver fonte oficial
          </a>
        </div>
        );
      })}
    </div>
  );
}

function SecretariasTab() {
  const { data, isLoading } = useQuery({ queryKey: ["secretarias"], queryFn: fetchSecretarias });
  const { data: remuneracoes } = useQuery({
    queryKey: ["secretarios-remuneracao", data?.map(s => s.id).join(",")],
    queryFn: () => fetchSecretariosRemuneracao(data!),
    enabled: !!data?.length,
  });
  const [selectedSecretaria, setSelectedSecretaria] = useState<any>(null);
  const [resumo, setResumo] = useState<string | null>(null);
  const [loadingResumo, setLoadingResumo] = useState(false);
  const cacheSecretaria = useRef<Record<string, string>>({});

  const handleClick = async (s: any) => {
    setSelectedSecretaria(s);
    if (cacheSecretaria.current[s.id]) {
      setResumo(cacheSecretaria.current[s.id]);
      setLoadingResumo(false);
      return;
    }
    setResumo(null);
    setLoadingResumo(true);
    try {
      const { data, error } = await supabase.functions.invoke("summarize-secretario", {
        body: { secretaria_id: s.id },
      });
      if (error) throw error;
      const text = data?.resumo || "Não foi possível gerar o resumo.";
      cacheSecretaria.current[s.id] = text;
      setResumo(text);
    } catch (e) {
      console.error(e);
      setResumo("Erro ao gerar resumo. Tente novamente.");
    } finally {
      setLoadingResumo(false);
    }
  };

  if (isLoading) return <div className="stat-card animate-pulse h-40" />;
  if (!data?.length) {
    return <EmptyState icon={Building2} title="Secretarias não cadastradas"
      description="Os dados das secretarias municipais serão adicionados quando disponíveis no portal oficial."
      fonteUrl="https://morrinhos.go.gov.br/" />;
  }
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.map((s) => (
          <div key={s.id} className="stat-card space-y-3 cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all" onClick={() => handleClick(s)}>
            <div className="flex items-start gap-3">
              <div className="w-16 aspect-[4/5] rounded-xl bg-primary/10 flex-shrink-0 overflow-hidden">
                {s.foto_url ? (
                  <img src={s.foto_url} alt={s.secretario_nome || s.nome}
                    className="w-full h-full rounded-xl object-cover object-top"
                    onError={(e) => { e.currentTarget.style.display = "none"; }} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Users className="w-6 h-6 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-foreground text-sm leading-tight">{s.nome}</h3>
                {s.secretario_nome && <p className="text-xs text-muted-foreground mt-0.5">{s.secretario_nome}</p>}
                <div className="space-y-1 mt-1.5">
                  <div className="flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-accent" />
                    <span className="text-sm font-semibold text-foreground">
                      {s.subsidio ? `R$ ${Number(s.subsidio).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—"}
                    </span>
                    <span className="text-[10px] text-muted-foreground">subsídio</span>
                  </div>
                  {remuneracoes?.[s.id] && remuneracoes[s.id].bruto !== null && (
                    <div className="flex items-center gap-1.5">
                      <BarChart3 className="w-3.5 h-3.5 text-primary" />
                      <span className="text-sm font-bold text-primary">
                        R$ {Number(remuneracoes[s.id].bruto).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </span>
                      <span className="text-[10px] text-muted-foreground">total ({remuneracoes[s.id].competencia})</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              {s.email && (
                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Mail className="w-3.5 h-3.5" /> {s.email}
                </span>
              )}
              {s.telefone && (
                <span className="inline-flex items-center gap-1.5 text-xs text-green-600">
                  <Phone className="w-3.5 h-3.5" /> {s.telefone}
                </span>
              )}
            </div>
            <div className="flex items-center justify-between">
              {s.fonte_url && (
                <a href={s.fonte_url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  onClick={(e) => e.stopPropagation()}>
                  <ExternalLink className="w-3 h-3" /> Ver fonte
                </a>
              )}
              <span className="inline-flex items-center gap-1 text-xs text-primary">
                <Sparkles className="w-3 h-3" /> Ver resumo IA
              </span>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={!!selectedSecretaria} onOpenChange={() => setSelectedSecretaria(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" />
              {selectedSecretaria?.nome}
            </DialogTitle>
          </DialogHeader>
          {selectedSecretaria?.secretario_nome && (
            <Badge variant="secondary">{selectedSecretaria.secretario_nome}</Badge>
          )}
          {selectedSecretaria?.subsidio && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-accent" />
                <span className="font-semibold text-foreground">
                  R$ {Number(selectedSecretaria.subsidio).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </span>
                <span className="text-sm text-muted-foreground">subsídio base</span>
              </div>
              {selectedSecretaria && remuneracoes?.[selectedSecretaria.id]?.bruto !== null && remuneracoes?.[selectedSecretaria.id] && (
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-primary" />
                  <span className="font-bold text-primary">
                    R$ {Number(remuneracoes[selectedSecretaria.id].bruto).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-sm text-muted-foreground">total proventos ({remuneracoes[selectedSecretaria.id].competencia})</span>
                </div>
              )}
            </div>
          )}
          <div className="flex flex-col gap-1.5 text-sm">
            {selectedSecretaria?.email && (
              <a href={`mailto:${selectedSecretaria.email}`} className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors">
                <Mail className="w-4 h-4" /> {selectedSecretaria.email}
              </a>
            )}
            {selectedSecretaria?.telefone && (
              <a href={`https://wa.me/55${selectedSecretaria.telefone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-green-600 hover:text-green-700 transition-colors">
                <Phone className="w-4 h-4" /> {selectedSecretaria.telefone}
              </a>
            )}
          </div>
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Sparkles className="w-4 h-4 text-primary" /> Resumo gerado por IA
            </div>
            {loadingResumo ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /> Gerando resumo...
              </div>
            ) : (
              <p className="text-sm text-muted-foreground leading-relaxed">{resumo}</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ServidoresTab({ initialSearch }: { initialSearch?: string }) {
  const [search, setSearch] = useState(initialSearch || "");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 30;

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(0);
  };

  const { data: result, isLoading } = useQuery({
    queryKey: ["servidores", search, page],
    queryFn: () => fetchServidores(search || undefined, undefined, page, PAGE_SIZE, "prefeitura"),
  });

  const servidores = result?.data ?? [];
  const totalCount = result?.count ?? 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const [selectedServidor, setSelectedServidor] = useState<{ id: string; nome: string; cargo: string | null } | null>(null);
  const [resumoData, setResumoData] = useState<{ resumo: string; remuneracoes: any[] } | null>(null);
  const [loadingResumo, setLoadingResumo] = useState(false);
  const cacheServidor = useRef<Record<string, { resumo: string; remuneracoes: any[] }>>({});

  const handleClickServidor = async (s: { id: string; nome: string; cargo: string | null }) => {
    setSelectedServidor(s);
    if (cacheServidor.current[s.id]) {
      setResumoData(cacheServidor.current[s.id]);
      setLoadingResumo(false);
      return;
    }
    setResumoData(null);
    setLoadingResumo(true);
    try {
      const { data, error } = await supabase.functions.invoke("summarize-servidor", {
        body: { servidor_id: s.id },
      });
      if (error) throw error;
      const r = data?.error
        ? { resumo: data.error, remuneracoes: [] }
        : { resumo: data.resumo, remuneracoes: data.remuneracoes || [] };
      cacheServidor.current[s.id] = r;
      setResumoData(r);
    } catch {
      setResumoData({ resumo: "Não foi possível gerar o resumo no momento.", remuneracoes: [] });
    } finally {
      setLoadingResumo(false);
    }
  };

  const exportCsv = async () => {
    // Fetch all matching records (no pagination) for export
    const { data: all } = await fetchServidores(search || undefined, undefined, 0, 10000);
    if (!all?.length) return;
    const header = "Nome,Cargo";
    const rows = all.map(s => `"${s.nome}","${s.cargo || ""}"`);
    const csv = [header, ...rows].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `servidores${search ? `_${search}` : ""}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar servidor por nome..." value={search}
          onChange={(e) => handleSearch(e.target.value)} className="pl-9" />
      </div>
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {totalCount > 0 ? `${totalCount} servidores encontrados · Página ${page + 1} de ${totalPages}` : "Clique no nome do servidor para ver um resumo gerado por IA."}
        </p>
        {totalCount > 0 && (
          <Button variant="outline" size="sm" onClick={exportCsv}>
            <Download className="w-4 h-4 mr-1" /> Exportar CSV
          </Button>
        )}
      </div>

      {isLoading && <div className="stat-card animate-pulse h-40" />}
      {!isLoading && !servidores.length && (
        <EmptyState icon={Users} title="Sem dados de servidores"
          description="Os dados de servidores e remuneração serão adicionados quando disponíveis no portal de transparência."
          fonteUrl="https://morrinhos.centi.com.br/" />
      )}
      {servidores.length > 0 && (
        <div className="space-y-2">
          {servidores.map((s) => (
            <button key={s.id} onClick={() => handleClickServidor(s)}
              className="stat-card card-hover block w-full text-left flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground text-sm">{s.nome}</p>
                {s.cargo && <p className="text-xs text-muted-foreground">{s.cargo}</p>}
              </div>
              <span className="text-xs text-primary flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Ver resumo IA
              </span>
            </button>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
            <ChevronLeft className="w-4 h-4 mr-1" /> Anterior
          </Button>
          <span className="text-sm text-muted-foreground">
            {page + 1} / {totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
            Próxima <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}

      <Dialog open={!!selectedServidor} onOpenChange={(open) => !open && setSelectedServidor(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              {selectedServidor?.nome}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedServidor?.cargo && (
              <Badge variant="secondary">{selectedServidor.cargo}</Badge>
            )}

            {resumoData?.remuneracoes && resumoData.remuneracoes.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Remuneração recente</p>
                {resumoData.remuneracoes.map((r: any) => (
                  <div key={r.id} className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                    <span className="text-xs text-muted-foreground">{r.competencia}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">Bruto: <span className="font-semibold text-foreground">{formatCurrency(r.bruto)}</span></span>
                      <span className="text-xs text-muted-foreground">Líquido: <span className="font-semibold text-accent">{formatCurrency(r.liquido)}</span></span>
                    </div>
                  </div>
                ))}
              </div>
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
                <p className="text-sm text-foreground whitespace-pre-line leading-relaxed">
                  {resumoData?.resumo}
                </p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function GastosTab() {
  const { data, isLoading } = useQuery({ queryKey: ["despesas"], queryFn: fetchDespesas });
  if (isLoading) return <div className="stat-card animate-pulse h-40" />;
  if (!data?.length) {
    return <EmptyState icon={DollarSign} title="Sem dados de despesas"
      description="Os dados de gastos serão adicionados quando disponíveis no portal de transparência."
      fonteUrl="https://morrinhos.centi.com.br/" />;
  }
  return (
    <div className="space-y-2">
      {data.map((d) => (
        <div key={d.id} className="stat-card flex items-center justify-between">
          <div>
            <p className="font-medium text-foreground text-sm">{d.favorecido || "Sem favorecido"}</p>
            <p className="text-xs text-muted-foreground">{d.descricao}</p>
            <p className="text-xs text-muted-foreground">{new Date(d.data).toLocaleDateString("pt-BR")}</p>
          </div>
          <div className="text-right">
            <p className="font-bold text-foreground">{formatCurrency(d.valor)}</p>
            {d.fonte_url && (
              <a href={d.fonte_url} target="_blank" rel="noopener noreferrer"
                className="text-xs text-primary hover:underline flex items-center gap-1 justify-end">
                <ExternalLink className="w-3 h-3" /> Fonte
              </a>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function ContratosTab() {
  const { data, isLoading } = useQuery({ queryKey: ["contratos"], queryFn: fetchContratos, staleTime: 1000 * 60 * 10 });
  const { data: aditivos } = useQuery({
    queryKey: ["contratos_aditivos"],
    queryFn: fetchContratosAditivos,
    staleTime: 1000 * 60 * 10,
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
    staleTime: 1000 * 60 * 10,
  });
  const [selectedContrato, setSelectedContrato] = useState<Contrato | null>(null);
  const [resumo, setResumo] = useState<string | null>(null);
  const [loadingResumo, setLoadingResumo] = useState(false);
  const [busca, setBusca] = useState("");
  const [anoFiltro, setAnoFiltro] = useState<string>("todos");
  const [statusFiltro, setStatusFiltro] = useState<string>("todos");
  const [visibleCount, setVisibleCount] = useState(50);

  // Aditivos lookup — deferido para não bloquear o render dos contratos
  const [aditivosPorContrato, setAditivosPorContrato] = useState<ReturnType<typeof buildAditivosLookup> | null>(null);
  const [aditivosReady, setAditivosReady] = useState(false);
  useEffect(() => {
    if (!aditivos?.length) return;
    const id = setTimeout(() => {
      setAditivosPorContrato(buildAditivosLookup(aditivos));
      setAditivosReady(true);
    }, 0);
    return () => clearTimeout(id);
  }, [aditivos]);

  const getAditivos = (numero: string | null, credor: string | null | undefined, fonteUrl?: string | null) => {
    if (!aditivosPorContrato) return null;
    return getAditivosDoContrato(aditivosPorContrato, numero, credor, fonteUrl);
  };

  // Client-side risk scoring — chunked to avoid blocking UI
  const [suspeitos, setSuspeitos] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (!data?.length || !aditivosReady) return;
    let cancelled = false;
    const normalizados = data.map(normalizarPrefeitura);
    const aditivosList = (aditivos || []).map((a) => ({
      contrato_numero: a.contrato_numero,
      valor: a.valor,
      cnpj: a.cnpj || null,
      credor: a.credor || null,
    }));
    const ids = new Set<string>();
    const CHUNK = 30;
    let i = 0;
    const processChunk = () => {
      if (cancelled) return;
      const end = Math.min(i + CHUNK, normalizados.length);
      for (; i < end; i++) {
        if (calcularSuspeitaContrato(normalizados[i], normalizados, aditivosList, cnpjData || undefined)) {
          ids.add(normalizados[i].id);
        }
      }
      if (i < normalizados.length) {
        setTimeout(processChunk, 0);
      } else {
        setSuspeitos(ids);
      }
    };
    setTimeout(processChunk, 50);
    return () => { cancelled = true; };
  }, [data, aditivosReady, aditivos, cnpjData]);

  const handleOpenResumo = async (c: Contrato) => {
    setSelectedContrato(c);
    setResumo(null);
    setLoadingResumo(true);

    const isOutlier = suspeitos.has(c.id);
    let outlierContext = "";
    if (isOutlier && data) {
      const values = data.map(ct => ct.valor).filter((v): v is number => v !== null && v > 0).sort((a, b) => a - b);
      const mid = Math.floor(values.length / 2);
      const median = values.length % 2 === 0 ? (values[mid - 1] + values[mid]) / 2 : values[mid];
      const medianFormatted = median.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
      const ratio = c.valor ? (c.valor / median).toFixed(1) : "N/A";
      outlierContext = `A mediana dos contratos é ${medianFormatted}. Este contrato tem valor ${ratio}x acima da mediana. Total de contratos analisados: ${values.length}.`;
    }

    try {
      const { data: respData, error } = await supabase.functions.invoke("summarize-contrato", {
        body: { contrato_id: c.id, is_outlier: isOutlier, outlier_context: outlierContext },
      });
      if (error) throw error;
      if (respData?.error) {
        setResumo("Não foi possível gerar o resumo no momento.");
      } else {
        setResumo(respData.resumo);
      }
    } catch {
      setResumo("Não foi possível gerar o resumo no momento.");
    } finally {
      setLoadingResumo(false);
    }
  };

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center py-24 gap-6">
      <div className="flex items-center gap-2">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-3 h-3 rounded-full bg-[hsl(var(--primary))]"
            style={{
              animation: 'dotPulse 1.2s ease-in-out infinite',
              animationDelay: `${i * 0.2}s`,
            }}
          />
        ))}
      </div>
      <div className="text-center space-y-1">
        <p className="text-base font-bold text-foreground">Um momento...</p>
        <p className="text-sm text-muted-foreground">Estamos carregando os contratos e contratos aditivos</p>
      </div>
      <style>{`
        @keyframes dotPulse {
          0%, 80%, 100% { transform: scale(0.4); opacity: 0.3; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
  if (!data?.length) {
    return <EmptyState icon={FileText} title="Sem dados de contratos"
      description="Os dados de contratos serão adicionados quando disponíveis no portal de transparência."
      fonteUrl="https://morrinhos.centi.com.br/" />;
  }

  // Extract available years from data
  const anos = [...new Set(data.map(c => c.vigencia_inicio ? new Date(c.vigencia_inicio).getFullYear().toString() : null).filter(Boolean))]
    .sort((a, b) => Number(b) - Number(a));

  // Extract available statuses
  const statuses = [...new Set(data.map(c => c.status).filter(Boolean))] as string[];

  // Filter
  const buscaLower = busca.toLowerCase();
  const filtered = data.filter(c => {
    if (anoFiltro !== "todos") {
      const ano = c.vigencia_inicio ? new Date(c.vigencia_inicio).getFullYear().toString() : null;
      if (ano !== anoFiltro) return false;
    }
    if (statusFiltro !== "todos" && c.status !== statusFiltro) return false;
    if (busca) {
      return (c.empresa?.toLowerCase().includes(buscaLower)) ||
        (c.objeto?.toLowerCase().includes(buscaLower)) ||
        (c.numero?.toLowerCase().includes(buscaLower));
    }
    return true;
  });

  const visibleContratos = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  const totalValor = filtered.reduce((sum, c) => sum + (c.valor || 0), 0);

  const statusColors: Record<string, string> = {
    ativo: "bg-accent/15 text-accent",
    encerrado: "bg-muted text-muted-foreground",
    rescindido: "bg-destructive/15 text-destructive",
  };

  return (
    <>

      {/* Filters */}
      <div className="space-y-3 mb-4 mt-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por empresa, objeto ou número..."
            value={busca}
            onChange={e => { setBusca(e.target.value); setVisibleCount(50); }}
            className="w-full pl-9 pr-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={anoFiltro}
            onChange={e => { setAnoFiltro(e.target.value); setVisibleCount(50); }}
            className="text-sm rounded-lg border bg-background px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="todos">Todos os anos</option>
            {anos.map(a => <option key={a} value={a!}>{a}</option>)}
          </select>
          <select
            value={statusFiltro}
            onChange={e => { setStatusFiltro(e.target.value); setVisibleCount(50); }}
            className="text-sm rounded-lg border bg-background px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="todos">Todos os status</option>
            {statuses.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <span className="text-xs text-muted-foreground self-center">
            {filtered.length} contratos · Total: {formatCurrency(totalValor)}
          </span>
          {filtered.length > 0 && (
            <button onClick={() => downloadCSV(
              `contratos-prefeitura-${new Date().toISOString().slice(0, 10)}.csv`,
              ["Número", "Empresa", "Objeto", "Valor", "Status", "Início", "Fim"],
              filtered.map(c => [c.numero, c.empresa, c.objeto, c.valor, c.status, c.vigencia_inicio, c.vigencia_fim])
            )} className="inline-flex items-center gap-1 text-xs text-primary hover:underline ml-auto">
              <Download className="w-3.5 h-3.5" /> CSV
            </button>
          )}
        </div>
      </div>

      {!aditivosReady && aditivos === undefined && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-border mb-3">
          <Loader2 className="w-4 h-4 text-primary animate-spin shrink-0" />
          <p className="text-xs text-muted-foreground">
            Estamos carregando também os contratos aditivos, que estarão disponíveis em alguns segundos.
          </p>
        </div>
      )}

      <div className="space-y-2">
        {visibleContratos.map((c) => (
          <button key={c.id} onClick={() => handleOpenResumo(c)} className="stat-card card-hover block w-full text-left space-y-1 relative">
            {suspeitos.has(c.id) && (
              <div className="absolute top-2 right-2 w-3 h-3 bg-red-600 rounded-full" />
            )}
            <div className="flex items-start justify-between gap-2">
              <div>
                {c.numero && <p className="text-xs text-muted-foreground">Contrato {c.numero}</p>}
                <p className="font-medium text-foreground text-sm">{c.empresa || "—"}</p>
                <p className="text-xs text-muted-foreground">{c.objeto}</p>
                {(c.vigencia_inicio || c.vigencia_fim) && (
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {c.vigencia_inicio ? new Date(c.vigencia_inicio + "T12:00:00").toLocaleDateString("pt-BR") : "?"}
                    {c.vigencia_fim ? ` a ${new Date(c.vigencia_fim + "T12:00:00").toLocaleDateString("pt-BR")}` : ""}
                  </p>
                )}
                {(() => { const ad = getAditivos(c.numero, c.empresa, c.fonte_url); return ad ? (
                  <span className="inline-flex items-center gap-1 text-xs mt-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                    <ScrollText className="w-3 h-3" />
                    {ad.count} aditivo(s) · +{formatCurrency(ad.totalValor)}
                  </span>
                ) : null; })()}
              </div>
              <div className="text-right flex-shrink-0">
                <div className="flex flex-col items-end gap-1">
                  {c.status && (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[c.status] || "bg-muted text-muted-foreground"}`}>
                      {c.status}
                    </span>
                  )}
                  <ExpiryBadge vigenciaFim={c.vigencia_fim} />
                </div>
                <p className="font-bold text-foreground mt-1">
                  {formatCurrency(c.valor)}
                </p>
                {(() => { const ad = getAditivos(c.numero, c.empresa, c.fonte_url); return ad ? (
                  <p className="text-[10px] text-muted-foreground whitespace-nowrap mt-0.5">
                    c/ aditivos: {formatCurrency((c.valor || 0) + ad.totalValor)}
                  </p>
                ) : null; })()}
              </div>
            </div>
            <p className="inline-flex items-center gap-1 text-xs text-primary">
              <Sparkles className="w-3 h-3" /> Clique para ver resumo por IA
            </p>
          </button>
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">Nenhum contrato encontrado com os filtros selecionados.</p>
        )}
        {hasMore && (
          <div className="flex justify-center pt-4 pb-2">
            <Button
              variant="outline"
              onClick={() => setVisibleCount(prev => prev + 50)}
              className="gap-2"
            >
              Carregar mais ({filtered.length - visibleCount} restantes)
            </Button>
          </div>
        )}
      </div>

      <Dialog open={!!selectedContrato} onOpenChange={(open) => !open && setSelectedContrato(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base">
              Contrato {selectedContrato?.numero || "s/n"} — {selectedContrato?.empresa || "Empresa não informada"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>Valor: {formatCurrency(selectedContrato?.valor ?? null)}</span>
              {selectedContrato?.vigencia_inicio && (
                <span>Vigência: {new Date(selectedContrato.vigencia_inicio).toLocaleDateString("pt-BR")}
                  {selectedContrato.vigencia_fim && ` a ${new Date(selectedContrato.vigencia_fim).toLocaleDateString("pt-BR")}`}
                </span>
              )}
              {selectedContrato?.status && <span>Status: {selectedContrato.status}</span>}
            </div>

            {selectedContrato?.objeto && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Objeto</p>
                <p className="text-sm text-foreground">{selectedContrato.objeto}</p>
              </div>
            )}

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

            {selectedContrato?.fonte_url && (
              <a href={selectedContrato.fonte_url} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                <ExternalLink className="w-3 h-3" /> Ver no portal de transparência
              </a>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function LicitacoesTab() {
  const { data, isLoading } = useQuery({ queryKey: ["licitacoes"], queryFn: fetchLicitacoes });
  const [selectedLicitacao, setSelectedLicitacao] = useState<Licitacao | null>(null);
  const [resumo, setResumo] = useState<string | null>(null);
  const [loadingResumo, setLoadingResumo] = useState(false);
  const cacheLicitacao = useRef<Record<string, string>>({});

  const handleClick = async (l: Licitacao) => {
    setSelectedLicitacao(l);
    if (cacheLicitacao.current[l.id]) {
      setResumo(cacheLicitacao.current[l.id]);
      setLoadingResumo(false);
      return;
    }
    setResumo(null);
    setLoadingResumo(true);
    try {
      const { data, error } = await supabase.functions.invoke("summarize-licitacao", {
        body: { licitacao_id: l.id },
      });
      if (error) throw error;
      const text = data?.resumo || "Não foi possível gerar o resumo.";
      cacheLicitacao.current[l.id] = text;
      setResumo(text);
    } catch (e) {
      console.error(e);
      setResumo("Erro ao gerar resumo. Tente novamente.");
    } finally {
      setLoadingResumo(false);
    }
  };

  const [searchLic, setSearchLic] = useState("");
  const filteredLic = useMemo(() => {
    if (!searchLic.trim()) return data || [];
    const q = searchLic.toLowerCase();
    return (data || []).filter(l => [l.objeto, l.numero, l.modalidade].some(f => f?.toLowerCase().includes(q)));
  }, [data, searchLic]);

  if (isLoading) return <div className="stat-card animate-pulse h-40" />;
  if (!data?.length) {
    return <EmptyState icon={Gavel} title="Sem dados de licitações"
      description="Os dados de licitações serão sincronizados automaticamente do portal de transparência."
      fonteUrl="https://morrinhos.centi.com.br/" />;
  }
  return (
    <>
      <div className="space-y-3 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar licitação..." value={searchLic} onChange={e => setSearchLic(e.target.value)} className="pl-9" aria-label="Buscar licitação" />
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">{filteredLic.length} licitações</p>
          {filteredLic.length > 0 && (
            <button onClick={() => downloadCSV(
              `licitacoes-prefeitura-${new Date().toISOString().slice(0, 10)}.csv`,
              ["Número", "Modalidade", "Objeto", "Status", "Data Publicação", "Data Resultado"],
              filteredLic.map(l => [l.numero, l.modalidade, l.objeto, l.status, l.data_publicacao, l.data_resultado])
            )} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
              <Download className="w-3.5 h-3.5" /> CSV
            </button>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {filteredLic.map((l) => {
          const modalidadeTooltip = l.modalidade ? getTooltip(l.modalidade) : null;
          return (
          <div key={l.id} className="stat-card space-y-1 cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all" onClick={() => handleClick(l)}>
            <div className="flex items-start justify-between">
              <div>
                {l.numero && <p className="text-xs text-muted-foreground">{l.numero}</p>}
                {l.modalidade && (
                  modalidadeTooltip ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span><Badge variant="secondary" className="text-xs cursor-help">{l.modalidade} <Info className="w-3 h-3 inline ml-0.5" /></Badge></span>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs"><p className="text-xs">{modalidadeTooltip}</p></TooltipContent>
                    </Tooltip>
                  ) : (
                    <Badge variant="secondary" className="text-xs">{l.modalidade}</Badge>
                  )
                )}
                <p className="font-medium text-foreground text-sm mt-1">{l.objeto || "—"}</p>
              </div>
              {l.status && <Badge variant="outline">{l.status}</Badge>}
            </div>
            <div className="flex items-center justify-between">
              {l.fonte_url && (
                <a href={l.fonte_url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  onClick={(e) => e.stopPropagation()}>
                  <ExternalLink className="w-3 h-3" /> Ver fonte
                </a>
              )}
              <span className="inline-flex items-center gap-1 text-xs text-primary">
                <Sparkles className="w-3 h-3" /> Ver resumo IA
              </span>
            </div>
          </div>
          );
        })}
      </div>

      <Dialog open={!!selectedLicitacao} onOpenChange={(open) => !open && setSelectedLicitacao(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gavel className="w-5 h-5 text-primary" />
              Licitação {selectedLicitacao?.numero || "s/n"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {selectedLicitacao?.modalidade && <span>Modalidade: {selectedLicitacao.modalidade}</span>}
              {selectedLicitacao?.status && <span>Status: {selectedLicitacao.status}</span>}
              {selectedLicitacao?.data_publicacao && (
                <span>Publicação: {new Date(selectedLicitacao.data_publicacao).toLocaleDateString("pt-BR")}</span>
              )}
              {selectedLicitacao?.data_resultado && (
                <span>Resultado: {new Date(selectedLicitacao.data_resultado).toLocaleDateString("pt-BR")}</span>
              )}
            </div>

            {selectedLicitacao?.objeto && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Objeto</p>
                <p className="text-sm text-foreground">{selectedLicitacao.objeto}</p>
              </div>
            )}

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

            {selectedLicitacao?.fonte_url && (
              <a href={selectedLicitacao.fonte_url} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                <ExternalLink className="w-3 h-3" /> Ver no portal oficial
              </a>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function DiariasTab() {
  const { data, isLoading } = useQuery({ queryKey: ["diarias"], queryFn: fetchDiarias });
  const [viewMode, setViewMode] = useState<"list" | "grouped">("list");

  const grouped = useMemo(() => {
    const map = new Map<string, { nome: string; total: number; count: number }>();
    (data || []).forEach((d) => {
      const nome = d.servidor_nome || "Não identificado";
      const entry = map.get(nome) || { nome, total: 0, count: 0 };
      entry.total += d.valor || 0;
      entry.count++;
      map.set(nome, entry);
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [data]);

  const totalValor = (data || []).reduce((s, d) => s + (d.valor || 0), 0);

  if (isLoading) return <div className="stat-card animate-pulse h-40" />;
  if (!data?.length) {
    return <EmptyState icon={Briefcase} title="Sem dados de diárias"
      description="Os dados de diárias e viagens serão sincronizados automaticamente do portal de transparência."
      fonteUrl="https://morrinhos.centi.com.br/" />;
  }
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{data.length} diárias · Total: {formatCurrency(totalValor)}</p>
        <div className="flex gap-1">
          <Button variant={viewMode === "list" ? "default" : "outline"} size="sm" onClick={() => setViewMode("list")}>Lista</Button>
          <Button variant={viewMode === "grouped" ? "default" : "outline"} size="sm" onClick={() => setViewMode("grouped")}>Por servidor</Button>
        </div>
      </div>

      {viewMode === "grouped" ? (
        <div className="space-y-2">
          {grouped.map((g) => (
            <div key={g.nome} className="stat-card flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground text-sm">{g.nome}</p>
                <p className="text-xs text-muted-foreground">{g.count} diária{g.count !== 1 ? "s" : ""}</p>
              </div>
              <span className="font-bold text-foreground">{formatCurrency(g.total)}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {data.map((d) => (
            <div key={d.id} className="stat-card flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground text-sm">{d.servidor_nome || "—"}</p>
                <p className="text-xs text-muted-foreground">{d.destino} — {d.motivo}</p>
                {d.data && <p className="text-xs text-muted-foreground">{new Date(d.data).toLocaleDateString("pt-BR")}</p>}
              </div>
              <p className="font-bold text-foreground">{formatCurrency(d.valor)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ObrasTab() {
  const { data, isLoading } = useQuery({ queryKey: ["obras"], queryFn: fetchObras });
  const [selectedObra, setSelectedObra] = useState<any>(null);
  const [resumo, setResumo] = useState<string | null>(null);
  const [loadingResumo, setLoadingResumo] = useState(false);
  const cacheObra = useRef<Record<string, string>>({});
  const [searchObras, setSearchObras] = useState("");

  const handleClick = async (obra: any) => {
    setSelectedObra(obra);
    if (cacheObra.current[obra.id]) {
      setResumo(cacheObra.current[obra.id]);
      setLoadingResumo(false);
      return;
    }
    setResumo(null);
    setLoadingResumo(true);
    try {
      const { data, error } = await supabase.functions.invoke("summarize-obra", {
        body: { obra_id: obra.id },
      });
      if (error) throw error;
      const text = data?.resumo || "Não foi possível gerar o resumo.";
      cacheObra.current[obra.id] = text;
      setResumo(text);
    } catch (e) {
      console.error(e);
      setResumo("Erro ao gerar resumo. Tente novamente.");
    } finally {
      setLoadingResumo(false);
    }
  };

  const filteredObras = useMemo(() => {
    if (!searchObras.trim()) return data || [];
    const q = searchObras.toLowerCase();
    return (data || []).filter((o) =>
      [o.nome, o.local, o.empresa].some((f) => f?.toLowerCase().includes(q))
    );
  }, [data, searchObras]);

  const statusCounts = useMemo(() => {
    const counts = { em_andamento: 0, concluida: 0, paralisada: 0, total: 0 };
    (data || []).forEach((o) => {
      counts.total++;
      if (o.status === "em_andamento") counts.em_andamento++;
      else if (o.status === "concluida") counts.concluida++;
      else if (o.status === "paralisada") counts.paralisada++;
    });
    return counts;
  }, [data]);

  if (isLoading) return <div className="stat-card animate-pulse h-40" />;
  if (!data?.length) {
    return <EmptyState icon={HardHat} title="Sem dados de obras"
      description="Os dados de obras públicas serão sincronizados automaticamente do portal de transparência."
      fonteUrl="https://morrinhos.centi.com.br/" />;
  }
  const statusColors: Record<string, string> = {
    em_andamento: "bg-info/15 text-info",
    concluida: "bg-accent/15 text-accent",
    paralisada: "bg-destructive/15 text-destructive",
  };
  const totalValorObras = (data || []).reduce((s, o) => s + (o.valor || 0), 0);
  return (
    <>
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div className="stat-card text-center">
          <p className="text-xs text-muted-foreground">Total de obras</p>
          <p className="text-xl font-bold text-foreground">{statusCounts.total}</p>
        </div>
        <div className="stat-card text-center">
          <p className="text-xs text-muted-foreground">Em andamento</p>
          <p className="text-xl font-bold text-info">{statusCounts.em_andamento}</p>
        </div>
        <div className="stat-card text-center">
          <p className="text-xs text-muted-foreground">Concluídas</p>
          <p className="text-xl font-bold text-accent">{statusCounts.concluida}</p>
        </div>
        <div className="stat-card text-center">
          <p className="text-xs text-muted-foreground">Valor total</p>
          <p className="text-lg font-bold text-foreground">{formatCurrency(totalValorObras)}</p>
        </div>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar obra..." value={searchObras} onChange={(e) => setSearchObras(e.target.value)} className="pl-9" aria-label="Buscar obra" />
      </div>

      <div className="space-y-2">
        {filteredObras.map((o) => (
          <div key={o.id} className="stat-card space-y-1 cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all" onClick={() => handleClick(o)}>
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium text-foreground text-sm">{o.nome}</p>
                {o.local && <p className="text-xs text-muted-foreground">{o.local}</p>}
                {o.empresa && <p className="text-xs text-muted-foreground">Empresa: {o.empresa}</p>}
              </div>
              <div className="text-right flex-shrink-0">
                {o.status && (
                  <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[o.status] || "bg-muted text-muted-foreground"}`}>
                    {o.status === "em_andamento" ? "Em andamento" : o.status === "concluida" ? "Concluída" : o.status === "paralisada" ? "Paralisada" : o.status}
                  </span>
                )}
                <p className="font-bold text-foreground mt-1">{formatCurrency(o.valor)}</p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              {o.fonte_url && (
                <a href={o.fonte_url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  onClick={(e) => e.stopPropagation()}>
                  <ExternalLink className="w-3 h-3" /> Ver fonte
                </a>
              )}
              <span className="inline-flex items-center gap-1 text-xs text-primary">
                <Sparkles className="w-3 h-3" /> Ver resumo IA
              </span>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={!!selectedObra} onOpenChange={() => setSelectedObra(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HardHat className="w-5 h-5 text-primary" />
              {selectedObra?.nome}
            </DialogTitle>
          </DialogHeader>
          {selectedObra?.empresa && (
            <p className="text-sm text-muted-foreground">Empresa: {selectedObra.empresa}</p>
          )}
          {selectedObra?.local && (
            <p className="text-sm text-muted-foreground">Local: {selectedObra.local}</p>
          )}
          {selectedObra?.valor && (
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-accent" />
              <span className="font-semibold text-foreground">{formatCurrency(selectedObra.valor)}</span>
            </div>
          )}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Sparkles className="w-4 h-4 text-primary" /> Resumo gerado por IA
            </div>
            {loadingResumo ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /> Gerando resumo...
              </div>
            ) : (
              <p className="text-sm text-muted-foreground leading-relaxed">{resumo}</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ===== MAIN PAGE =====
// ===== ADMIN PANEL =====

function AdminPanel() {
  const queryClient = useQueryClient();

  // Buscar últimos sync logs da prefeitura
  const { data: syncLogs, isLoading: logsLoading } = useQuery({
    queryKey: ["sync-logs-prefeitura"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sync_log")
        .select("*")
        .in("tipo", ["prefeitura_mensal", "prefeitura_diaria"])
        .order("started_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
  });

  const lastMensal = syncLogs?.find((l: any) => l.tipo === "prefeitura_mensal");
  const lastDiaria = syncLogs?.find((l: any) => l.tipo === "prefeitura_diaria");

  // Última competência carregada — SEMPRE filtrada por orgao_tipo='prefeitura'
  // para evitar mostrar competência da Câmara como se fosse da Prefeitura
  const { data: lastCompetencia } = useQuery({
    queryKey: ["last-competencia-prefeitura"],
    queryFn: async () => {
      const { data } = await supabase
        .from("remuneracao_servidores")
        .select("competencia, servidores!inner(orgao_tipo)")
        .eq("servidores.orgao_tipo", "prefeitura")
        .order("competencia", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data?.competencia || null;
    },
  });

  // Trigger manual sync
  const syncMensal = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("sync-prefeitura-mensal");
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sync-logs-prefeitura"] });
      queryClient.invalidateQueries({ queryKey: ["last-competencia"] });
    },
  });

  const syncDiaria = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("sync-prefeitura-diaria");
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sync-logs-prefeitura"] });
    },
  });

  function formatDate(d: string | null) {
    if (!d) return "—";
    return new Date(d).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  }

  function statusIcon(status: string) {
    if (status === "success") return <CheckCircle2 className="w-4 h-4 text-accent" />;
    if (status === "error") return <AlertCircle className="w-4 h-4 text-destructive" />;
    if (status === "running") return <Loader2 className="w-4 h-4 text-primary animate-spin" />;
    if (status === "aguardando_publicacao") return <Clock className="w-4 h-4 text-warning" />;
    return <Info className="w-4 h-4 text-muted-foreground" />;
  }

  return (
    <div className="space-y-6">
      {/* Indicadores */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="stat-card">
          <p className="text-xs text-muted-foreground mb-1">Última competência carregada</p>
          <p className="text-lg font-bold text-foreground">
            {lastCompetencia || "Nenhuma"}
          </p>
        </div>
        <div className="stat-card">
          <p className="text-xs text-muted-foreground mb-1">Próxima atualização mensal</p>
          <p className="text-sm font-medium text-foreground">Dia 5 do próximo mês, 04:00 BRT</p>
        </div>
        <div className="stat-card">
          <p className="text-xs text-muted-foreground mb-1">Próxima atualização diária</p>
          <p className="text-sm font-medium text-foreground">Amanhã, 03:30 BRT</p>
        </div>
      </div>

      {/* Botões de ação */}
      <div className="flex flex-wrap gap-3">
        <Button
          onClick={() => syncMensal.mutate()}
          disabled={syncMensal.isPending}
          variant="outline"
          className="gap-2"
        >
          {syncMensal.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Atualizar folha mensal agora
        </Button>
        <Button
          onClick={() => syncDiaria.mutate()}
          disabled={syncDiaria.isPending}
          variant="outline"
          className="gap-2"
        >
          {syncDiaria.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Executar sync diária agora
        </Button>
      </div>

      {syncMensal.isSuccess && (
        <div className="stat-card bg-accent/5 border-accent/20">
          <p className="text-sm text-accent font-medium">Sync mensal executada com sucesso</p>
          <pre className="text-xs text-muted-foreground mt-1 overflow-auto max-h-32">
            {JSON.stringify(syncMensal.data, null, 2)}
          </pre>
        </div>
      )}

      {syncMensal.isError && (
        <div className="stat-card bg-destructive/5 border-destructive/20">
          <p className="text-sm text-destructive font-medium">Erro na sync mensal</p>
          <p className="text-xs text-muted-foreground">{(syncMensal.error as Error).message}</p>
        </div>
      )}

      {/* Histórico de syncs */}
      <div>
        <h3 className="font-semibold text-foreground text-sm mb-3">Histórico de sincronizações</h3>
        {logsLoading && <div className="stat-card animate-pulse h-20" />}
        {!logsLoading && (!syncLogs || syncLogs.length === 0) && (
          <p className="text-sm text-muted-foreground">Nenhuma sincronização da Prefeitura registrada ainda.</p>
        )}
        {syncLogs && syncLogs.length > 0 && (
          <div className="space-y-2">
            {syncLogs.map((log: any) => (
              <div key={log.id} className="stat-card flex items-start gap-3">
                {statusIcon(log.status)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {log.tipo === "prefeitura_mensal" ? "Mensal" : "Diária"}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{log.status}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Início: {formatDate(log.started_at)} — Fim: {formatDate(log.finished_at)}
                  </p>
                  {log.detalhes && Object.keys(log.detalhes).length > 0 && (
                    <details className="mt-1">
                      <summary className="text-xs text-primary cursor-pointer">Ver detalhes</summary>
                      <pre className="text-xs text-muted-foreground mt-1 overflow-auto max-h-24">
                        {JSON.stringify(log.detalhes, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Valores conforme portal oficial. Podem existir descontos e verbas específicas.
      </p>
    </div>
  );
}

const LEI_ORGANICA_PORTAL_URL = "https://camaramorrinhos.centi.com.br/transparencia/atosadministrativos";

type LeiOrganicaDoc = {
  id: string;
  descricao: string;
  observacao: string | null;
  data_publicacao: string | null;
  documento_url: string | null;
  resumo_ia: string | null;
};

type LeiOrganicaArtigo = {
  id: string;
  titulo: string;
  capitulo: string | null;
  secao: string | null;
  artigo_numero: number | null;
  artigo_texto: string;
  resumo_ia: string | null;
  ordem: number;
};

function LeiOrganicaTab() {
  const [activeSubTab, setActiveSubTab] = useState<"artigos" | "emendas">("artigos");

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="stat-card space-y-4">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-primary/10 flex-shrink-0">
            <BookOpen className="w-8 h-8 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-foreground">Lei Orgânica de Morrinhos</h3>
            <p className="text-sm text-muted-foreground mt-1">
              A "constituição municipal" — norma máxima do município. Navegue pelos artigos, busque termos e veja resumos de IA.
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant={activeSubTab === "artigos" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveSubTab("artigos")}
          >
            <BookOpen className="w-4 h-4 mr-1" /> Texto Integral
          </Button>
          <Button
            variant={activeSubTab === "emendas" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveSubTab("emendas")}
          >
            <FileText className="w-4 h-4 mr-1" /> Emendas ({9})
          </Button>
        </div>
      </div>

      {activeSubTab === "artigos" ? <ArtigosSubTab /> : <EmendasSubTab />}
    </div>
  );
}

function ArtigosSubTab() {
  const [search, setSearch] = useState("");
  const [selectedTitulo, setSelectedTitulo] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loadingResumo, setLoadingResumo] = useState<string | null>(null);
  const [resumoCache, setResumoCache] = useState<Record<string, string>>({});
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState("");
  const [importing, setImporting] = useState(false);
  const queryClient = useQueryClient();

  const { data: artigos = [], isLoading } = useQuery({
    queryKey: ["lei-organica-artigos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lei_organica_artigos")
        .select("*")
        .order("ordem", { ascending: true });
      if (error) throw error;
      return (data || []) as LeiOrganicaArtigo[];
    },
  });

  // Extract unique titles for the TOC
  const titulos = [...new Set(artigos.map((a) => a.titulo))];

  // Filter articles
  const filtered = artigos.filter((a) => {
    const matchSearch = !search || 
      a.artigo_texto.toLowerCase().includes(search.toLowerCase()) ||
      a.titulo.toLowerCase().includes(search.toLowerCase()) ||
      (a.capitulo && a.capitulo.toLowerCase().includes(search.toLowerCase())) ||
      (a.secao && a.secao.toLowerCase().includes(search.toLowerCase())) ||
      `art. ${a.artigo_numero}`.includes(search.toLowerCase()) ||
      `artigo ${a.artigo_numero}`.includes(search.toLowerCase());
    const matchTitulo = !selectedTitulo || a.titulo === selectedTitulo;
    return matchSearch && matchTitulo;
  });

  // Group filtered articles by titulo > capitulo > secao
  const grouped = filtered.reduce((acc, a) => {
    if (!acc[a.titulo]) acc[a.titulo] = {};
    const cap = a.capitulo || "__sem_capitulo__";
    if (!acc[a.titulo][cap]) acc[a.titulo][cap] = [];
    acc[a.titulo][cap].push(a);
    return acc;
  }, {} as Record<string, Record<string, LeiOrganicaArtigo[]>>);

  const handleResumo = async (artigo: LeiOrganicaArtigo) => {
    if (expandedId === artigo.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(artigo.id);
    if (resumoCache[artigo.id]) return;
    if (artigo.resumo_ia) {
      setResumoCache((prev) => ({ ...prev, [artigo.id]: artigo.resumo_ia! }));
      return;
    }
    setLoadingResumo(artigo.id);
    try {
      const { data, error } = await supabase.functions.invoke("summarize-artigo", {
        body: { artigo_id: artigo.id },
      });
      if (error) throw error;
      const resumo = data?.resumo || "Não foi possível gerar o resumo.";
      setResumoCache((prev) => ({ ...prev, [artigo.id]: resumo }));
    } catch (e) {
      console.error(e);
      setResumoCache((prev) => ({ ...prev, [artigo.id]: "Erro ao gerar resumo." }));
    } finally {
      setLoadingResumo(null);
    }
  };

  const [importProgress, setImportProgress] = useState("");
  const handleAutoImport = async () => {
    setImporting(true);
    try {
      const batches = ["1", "2", "3", "4", "5", "6"];
      for (const batch of batches) {
        setImportProgress(`Processando lote ${batch} de 6 com IA...`);
        const { data, error } = await supabase.functions.invoke("extract-lei-organica-pdf", {
          body: { batch },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
      }
      queryClient.invalidateQueries({ queryKey: ["lei-organica-artigos"] });
      setShowImport(false);
      setImportText("");
      setImportProgress("");
    } catch (e) {
      console.error("Auto-import error:", e);
      setImportProgress("Erro na importação. Tente novamente.");
    } finally {
      setImporting(false);
    }
  };

  const handleImport = async () => {
    if (!importText.trim()) return;
    setImporting(true);
    try {
      const { data, error } = await supabase.functions.invoke("parse-lei-organica", {
        body: { raw_text: importText },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      queryClient.invalidateQueries({ queryKey: ["lei-organica-artigos"] });
      setShowImport(false);
      setImportText("");
    } catch (e) {
      console.error("Import error:", e);
    } finally {
      setImporting(false);
    }
  };

  const highlightSearch = (text: string) => {
    if (!search || search.length < 2) return text;
    const regex = new RegExp(`(${search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? (
        <mark key={i} className="bg-yellow-200 dark:bg-yellow-800 rounded px-0.5">{part}</mark>
      ) : (
        part
      )
    );
  };

  // Empty state - no articles imported yet
  if (!isLoading && artigos.length === 0) {
    return (
      <div className="space-y-4">
        <div className="stat-card text-center py-10 space-y-4">
          <BookOpen className="w-16 h-16 text-muted-foreground mx-auto" />
          <div>
            <h3 className="text-lg font-semibold text-foreground">Lei Orgânica não importada</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
              Importe o texto integral da Lei Orgânica para navegar por artigos, buscar termos e ver explicações de IA.
            </p>
          </div>
          <Button onClick={handleAutoImport} disabled={importing} size="lg" className="w-full max-w-md">
            {importing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {importProgress || "Importando..."}
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Importar Lei Orgânica de Morrinhos
              </>
            )}
          </Button>
          <p className="text-xs text-muted-foreground">
            Fonte: <a href="https://morrinhos.go.gov.br/downloads/lei_organica_atualizada_2020.pdf" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Prefeitura de Morrinhos — Dezembro de 2020</a>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar na Lei Orgânica (artigo, termo, capítulo...)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={selectedTitulo || "all"} onValueChange={(v) => setSelectedTitulo(v === "all" ? null : v)}>
          <SelectTrigger className="w-full sm:w-64">
            <SelectValue placeholder="Filtrar por título" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os títulos</SelectItem>
            {titulos.map((t) => (
              <SelectItem key={t} value={t} className="text-xs">
                {t.length > 50 ? t.slice(0, 50) + "..." : t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stats bar */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {filtered.length} artigo{filtered.length !== 1 ? "s" : ""}
          {search ? ` encontrado${filtered.length !== 1 ? "s" : ""} para "${search}"` : ""}
          {selectedTitulo ? ` em ${selectedTitulo.slice(0, 40)}...` : ""}
        </p>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => setShowImport(!showImport)}>
            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Reimportar
          </Button>
        </div>
      </div>

      {/* Import panel */}
      {showImport && (
        <div className="stat-card space-y-4">
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-foreground">Importação automática via IA</h4>
            <p className="text-xs text-muted-foreground">Extrai todos os 233 artigos do PDF oficial usando IA (6 lotes sequenciais).</p>
            <Button size="sm" onClick={handleAutoImport} disabled={importing}>
              {importing ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1" />}
              {importing ? (importProgress || "Processando...") : "Importar Lei Orgânica completa via IA"}
            </Button>
            {importProgress && !importing && (
              <p className="text-xs text-red-500">{importProgress}</p>
            )}
          </div>
          <div className="border-t border-border pt-3 space-y-2">
            <h4 className="text-sm font-semibold text-foreground">Importação manual</h4>
            <p className="text-xs text-muted-foreground">Cole o texto atualizado da Lei Orgânica:</p>
            <textarea
              className="w-full h-32 p-3 border border-border rounded-lg bg-background text-sm text-foreground resize-y focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="Cole o texto completo..."
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleImport} disabled={importing || !importText.trim()}>
                {importing ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1" />}
                {importing ? "Processando..." : "Reimportar texto"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowImport(false)}>Cancelar</Button>
            </div>
          </div>
        </div>
      )}

      {/* TOC - Table of Contents */}
      {!search && !selectedTitulo && titulos.length > 1 && (
        <div className="stat-card space-y-2">
          <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" /> Índice
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
            {titulos.map((t) => (
              <button
                key={t}
                onClick={() => setSelectedTitulo(t)}
                className="text-left text-xs text-primary hover:underline py-1 px-2 rounded hover:bg-primary/5 transition-colors truncate"
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary mr-2" />
          <span className="text-muted-foreground">Carregando artigos...</span>
        </div>
      )}

      {/* No results */}
      {!isLoading && filtered.length === 0 && artigos.length > 0 && (
        <div className="stat-card text-center py-6">
          <Search className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground">Nenhum artigo encontrado para "{search}"</p>
        </div>
      )}

      {/* Articles grouped by titulo/capitulo */}
      {Object.entries(grouped).map(([titulo, capitulos]) => (
        <div key={titulo} className="space-y-3">
          <div className="sticky top-0 z-10 bg-background py-2 border-b border-border">
            <h3 className="text-sm font-bold text-primary flex items-center gap-2">
              <BookOpen className="w-4 h-4 flex-shrink-0" />
              <span>{titulo}</span>
            </h3>
          </div>

          {Object.entries(capitulos).map(([capitulo, arts]) => (
            <div key={capitulo} className="space-y-2">
              {capitulo !== "__sem_capitulo__" && (
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pl-2">
                  {capitulo}
                </h4>
              )}

              {arts.map((artigo) => {
                const isExpanded = expandedId === artigo.id;
                const resumo = resumoCache[artigo.id];
                const isLoadingThis = loadingResumo === artigo.id;

                return (
                  <div
                    key={artigo.id}
                    className={`stat-card transition-all ${
                      isExpanded ? "border-primary/40 ring-1 ring-primary/20" : ""
                    }`}
                  >
                    {/* Article header */}
                    <div className="flex items-start gap-3">
                      <Badge variant="outline" className="flex-shrink-0 mt-0.5 text-xs font-mono">
                        Art. {artigo.artigo_numero}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        {artigo.secao && (
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">
                            {artigo.secao}
                          </p>
                        )}
                        <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">
                          {highlightSearch(artigo.artigo_texto)}
                        </p>
                        <div className="flex items-center gap-3 mt-2">
                          <button
                            className="flex items-center gap-1 text-xs text-primary hover:underline"
                            onClick={() => handleResumo(artigo)}
                          >
                            <Sparkles className="w-3 h-3" />
                            {isExpanded ? "Ocultar explicação" : "Explicar com IA"}
                          </button>
                          {artigo.resumo_ia && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                              <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" /> Explicação salva
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* AI explanation */}
                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-border">
                        {isLoadingThis ? (
                          <div className="flex items-center gap-2 py-3">
                            <Loader2 className="w-4 h-4 animate-spin text-primary" />
                            <span className="text-sm text-muted-foreground">Explicando com IA...</span>
                          </div>
                        ) : resumo ? (
                          <div className="bg-primary/5 rounded-lg p-3 space-y-1.5">
                            <div className="flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-primary" />
                              <span className="text-xs font-semibold text-primary">Em linguagem simples</span>
                            </div>
                            <p className="text-sm text-foreground leading-relaxed">{resumo}</p>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      ))}

      <p className="text-xs text-muted-foreground">
        Fonte:{" "}
        <a href={LEI_ORGANICA_PORTAL_URL} target="_blank" rel="noopener noreferrer"
          className="text-primary hover:underline inline-flex items-center gap-1">
          <ExternalLink className="w-3 h-3" /> Portal de Transparência — Câmara Municipal de Morrinhos
        </a>
      </p>
    </div>
  );
}

function EmendasSubTab() {
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loadingResumo, setLoadingResumo] = useState<string | null>(null);
  const [resumoCache, setResumoCache] = useState<Record<string, string>>({});
  const [syncing, setSyncing] = useState(false);
  const queryClient = useQueryClient();

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ["lei-organica"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lei_organica")
        .select("*")
        .order("data_publicacao", { ascending: false });
      if (error) throw error;
      return (data || []) as LeiOrganicaDoc[];
    },
  });

  const filtered = docs.filter((d) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return d.descricao.toLowerCase().includes(q) || (d.observacao && d.observacao.toLowerCase().includes(q));
  });

  const handleSync = async () => {
    setSyncing(true);
    try {
      const { error } = await supabase.functions.invoke("sync-lei-organica");
      if (error) console.error("Sync error:", error);
      queryClient.invalidateQueries({ queryKey: ["lei-organica"] });
    } catch (e) {
      console.error("Sync error:", e);
    } finally {
      setSyncing(false);
    }
  };

  const handleResumo = async (doc: LeiOrganicaDoc) => {
    if (expandedId === doc.id) { setExpandedId(null); return; }
    setExpandedId(doc.id);
    if (resumoCache[doc.id]) return;
    if (doc.resumo_ia) { setResumoCache((prev) => ({ ...prev, [doc.id]: doc.resumo_ia! })); return; }
    setLoadingResumo(doc.id);
    try {
      const { data, error } = await supabase.functions.invoke("summarize-lei-organica", { body: { lei_id: doc.id } });
      if (error) throw error;
      setResumoCache((prev) => ({ ...prev, [doc.id]: data?.resumo || "Não foi possível gerar o resumo." }));
    } catch (e) {
      console.error(e);
      setResumoCache((prev) => ({ ...prev, [doc.id]: "Erro ao gerar resumo." }));
    } finally { setLoadingResumo(null); }
  };

  const formatDate = (d: string | null) => {
    if (!d) return "—";
    const [y, m, day] = d.split("-");
    return `${day}/${m}/${y}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar emendas..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing}>
            <RefreshCw className={`w-4 h-4 mr-1 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Sincronizando..." : "Atualizar"}
          </Button>
          <a href={LEI_ORGANICA_PORTAL_URL} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm"><ExternalLink className="w-4 h-4 mr-1" /> Portal</Button>
          </a>
        </div>
      </div>

      {!isLoading && docs.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="stat-card text-center">
            <p className="text-2xl font-bold text-primary">{docs.length}</p>
            <p className="text-xs text-muted-foreground">Emendas registradas</p>
          </div>
          <div className="stat-card text-center">
            <p className="text-2xl font-bold text-primary">{docs.filter((d) => d.resumo_ia).length}</p>
            <p className="text-xs text-muted-foreground">Com resumo de IA</p>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary mr-2" />
          <span className="text-muted-foreground">Carregando emendas...</span>
        </div>
      )}

      {!isLoading && docs.length === 0 && (
        <div className="stat-card text-center py-8 space-y-3">
          <BookOpen className="w-12 h-12 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground">Nenhuma emenda cadastrada.</p>
          <Button onClick={handleSync} disabled={syncing}>
            <RefreshCw className={`w-4 h-4 mr-1 ${syncing ? "animate-spin" : ""}`} /> Sincronizar
          </Button>
        </div>
      )}

      {!isLoading && docs.length > 0 && filtered.length === 0 && (
        <div className="stat-card text-center py-6">
          <Search className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground">Nenhuma emenda para "{search}"</p>
        </div>
      )}

      <div className="space-y-3">
        {filtered.map((doc) => {
          const isExpanded = expandedId === doc.id;
          const resumo = resumoCache[doc.id];
          const isLoadingThis = loadingResumo === doc.id;
          return (
            <div key={doc.id}
              className={`stat-card cursor-pointer transition-all hover:border-primary/30 ${isExpanded ? "border-primary/40 ring-1 ring-primary/20" : ""}`}
              onClick={() => handleResumo(doc)}>
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0 mt-0.5">
                  <FileText className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-foreground leading-snug">{doc.descricao}</p>
                    <Badge variant="outline" className="text-xs flex-shrink-0 whitespace-nowrap">{formatDate(doc.data_publicacao)}</Badge>
                  </div>
                  {doc.observacao && <p className="text-xs text-muted-foreground mt-1">{doc.observacao}</p>}
                  <div className="flex items-center gap-2 mt-2">
                    <button className="flex items-center gap-1 text-xs text-primary hover:underline" onClick={(e) => { e.stopPropagation(); handleResumo(doc); }}>
                      <Sparkles className="w-3 h-3" /> {isExpanded ? "Ocultar" : "Resumo IA"}
                    </button>
                    {doc.documento_url && (
                      <a href={doc.documento_url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary" onClick={(e) => e.stopPropagation()}>
                        <Download className="w-3 h-3" /> PDF
                      </a>
                    )}
                    {doc.resumo_ia && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        <Sparkles className="w-2.5 h-2.5 mr-0.5" /> Salvo
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              {isExpanded && (
                <div className="mt-3 pt-3 border-t border-border">
                  {isLoadingThis ? (
                    <div className="flex items-center gap-2 py-3">
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      <span className="text-sm text-muted-foreground">Gerando resumo...</span>
                    </div>
                  ) : resumo ? (
                    <div className="bg-primary/5 rounded-lg p-3 space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-primary" />
                        <span className="text-xs font-semibold text-primary">Resumo de IA</span>
                      </div>
                      <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">{resumo}</p>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground">
        Fonte: <a href={LEI_ORGANICA_PORTAL_URL} target="_blank" rel="noopener noreferrer"
          className="text-primary hover:underline inline-flex items-center gap-1">
          <ExternalLink className="w-3 h-3" /> Portal de Transparência
        </a>
      </p>
    </div>
  );
}

// ===== DECRETOS TAB =====

function DecretosTab() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [resumoCache, setResumoCache] = useState<Record<string, string>>({});
  const [loadingResumo, setLoadingResumo] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  const { data: decretos, isLoading, refetch } = useQuery({
    queryKey: ["decretos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("decretos")
        .select("*")
        .order("data_publicacao", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const filtered = (decretos || []).filter((d) => {
    const q = search.toLowerCase();
    return !q || d.numero.toLowerCase().includes(q) || d.ementa.toLowerCase().includes(q);
  });

  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const { error } = await supabase.functions.invoke("sync-decretos");
      if (error) throw error;
      await refetch();
    } catch (e) {
      console.error(e);
    } finally {
      setSyncing(false);
    }
  };

  const handleResumo = async (decreto: any) => {
    if (expandedId === decreto.id) { setExpandedId(null); return; }
    setExpandedId(decreto.id);
    if (resumoCache[decreto.id] || decreto.resumo_ia) {
      if (decreto.resumo_ia) setResumoCache((prev) => ({ ...prev, [decreto.id]: decreto.resumo_ia! }));
      return;
    }
    setLoadingResumo(decreto.id);
    try {
      const { data, error } = await supabase.functions.invoke("summarize-decreto", {
        body: { decreto_id: decreto.id },
      });
      if (error) throw error;
      setResumoCache((prev) => ({ ...prev, [decreto.id]: data?.resumo || "Não foi possível gerar o resumo." }));
    } catch (e) {
      console.error(e);
      setResumoCache((prev) => ({ ...prev, [decreto.id]: "Erro ao gerar resumo." }));
    } finally { setLoadingResumo(null); }
  };

  const formatDate = (d: string | null) => {
    if (!d) return "—";
    const [y, m, day] = d.split("-");
    return `${day}/${m}/${y}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar decretos por número ou ementa..." value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }} className="pl-9" />
        </div>
        <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing}>
          <RefreshCw className={`w-4 h-4 mr-1 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Sincronizando..." : "Atualizar"}
        </Button>
      </div>

      {!isLoading && (decretos?.length || 0) > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="stat-card text-center">
            <p className="text-2xl font-bold text-primary">{decretos?.length}</p>
            <p className="text-xs text-muted-foreground">Decretos</p>
          </div>
          <div className="stat-card text-center">
            <p className="text-2xl font-bold text-primary">{decretos?.filter((d) => d.resumo_ia).length}</p>
            <p className="text-xs text-muted-foreground">Com resumo IA</p>
          </div>
          <div className="stat-card text-center">
            <p className="text-2xl font-bold text-primary">{filtered.length}</p>
            <p className="text-xs text-muted-foreground">{search ? "Resultados" : "Total"}</p>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary mr-2" />
          <span className="text-muted-foreground">Carregando decretos...</span>
        </div>
      )}

      {!isLoading && (decretos?.length || 0) === 0 && (
        <div className="stat-card text-center py-8 space-y-3">
          <ScrollText className="w-12 h-12 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground">Nenhum decreto cadastrado.</p>
          <p className="text-xs text-muted-foreground">Clique em "Atualizar" para importar do portal da prefeitura.</p>
          <Button onClick={handleSync} disabled={syncing}>
            <RefreshCw className={`w-4 h-4 mr-1 ${syncing ? "animate-spin" : ""}`} /> Importar Decretos
          </Button>
        </div>
      )}

      {!isLoading && (decretos?.length || 0) > 0 && filtered.length === 0 && (
        <div className="stat-card text-center py-6">
          <Search className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground">Nenhum decreto encontrado para "{search}"</p>
        </div>
      )}

      <div className="space-y-3">
        {paged.map((decreto) => {
          const isExpanded = expandedId === decreto.id;
          const resumo = resumoCache[decreto.id] || decreto.resumo_ia;
          const isLoadingThis = loadingResumo === decreto.id;
          return (
            <div key={decreto.id}
              className={`stat-card cursor-pointer transition-all hover:border-primary/30 ${isExpanded ? "border-primary/40 ring-1 ring-primary/20" : ""}`}
              onClick={() => handleResumo(decreto)}>
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0 mt-0.5">
                  <ScrollText className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-foreground">Decreto nº {decreto.numero}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{decreto.ementa}</p>
                    </div>
                    <Badge variant="outline" className="text-xs flex-shrink-0 whitespace-nowrap">
                      {formatDate(decreto.data_publicacao)}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <button className="flex items-center gap-1 text-xs text-primary hover:underline" onClick={(e) => { e.stopPropagation(); handleResumo(decreto); }}>
                      <Sparkles className="w-3 h-3" /> {isExpanded ? "Ocultar" : "Resumo IA"}
                    </button>
                    {decreto.fonte_url && (
                      <a href={decreto.fonte_url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary" onClick={(e) => e.stopPropagation()}>
                        <ExternalLink className="w-3 h-3" /> Ver original
                      </a>
                    )}
                    {decreto.resumo_ia && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        <Sparkles className="w-2.5 h-2.5 mr-0.5" /> Salvo
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              {isExpanded && (
                <div className="mt-3 pt-3 border-t border-border">
                  {isLoadingThis ? (
                    <div className="flex items-center gap-2 py-3">
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      <span className="text-sm text-muted-foreground">Gerando resumo com IA...</span>
                    </div>
                  ) : resumo ? (
                    <div className="bg-primary/5 rounded-lg p-3 space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-primary" />
                        <span className="text-xs font-semibold text-primary">Resumo de IA</span>
                      </div>
                      <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">{resumo}</p>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm text-muted-foreground">Página {page + 1} de {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Fonte: <a href="https://morrinhos.go.gov.br/acesso-a-legislacao/#decretos" target="_blank" rel="noopener noreferrer"
          className="text-primary hover:underline inline-flex items-center gap-1">
          <ExternalLink className="w-3 h-3" /> Portal da Prefeitura
        </a>
      </p>
    </div>
  );
}

// ===== PORTARIAS TAB =====

function PortariasTab() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [resumoCache, setResumoCache] = useState<Record<string, string>>({});
  const [loadingResumo, setLoadingResumo] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  const { data: portarias, isLoading, refetch } = useQuery({
    queryKey: ["portarias"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("portarias")
        .select("*")
        .order("data_publicacao", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const filtered = (portarias || []).filter((p: any) => {
    const q = search.toLowerCase();
    return !q || p.numero.toLowerCase().includes(q) || p.ementa.toLowerCase().includes(q);
  });

  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const { error } = await supabase.functions.invoke("sync-portarias");
      if (error) throw error;
      await refetch();
    } catch (e) {
      console.error(e);
    } finally {
      setSyncing(false);
    }
  };

  const handleResumo = async (portaria: any) => {
    if (expandedId === portaria.id) { setExpandedId(null); return; }
    setExpandedId(portaria.id);
    if (resumoCache[portaria.id] || portaria.resumo_ia) {
      if (portaria.resumo_ia) setResumoCache((prev) => ({ ...prev, [portaria.id]: portaria.resumo_ia! }));
      return;
    }
    setLoadingResumo(portaria.id);
    try {
      const { data, error } = await supabase.functions.invoke("summarize-portaria", {
        body: { portaria_id: portaria.id },
      });
      if (error) throw error;
      setResumoCache((prev) => ({ ...prev, [portaria.id]: data?.resumo || "Não foi possível gerar o resumo." }));
    } catch (e) {
      console.error(e);
      setResumoCache((prev) => ({ ...prev, [portaria.id]: "Erro ao gerar resumo." }));
    } finally { setLoadingResumo(null); }
  };

  const formatDate = (d: string | null) => {
    if (!d) return "—";
    const [y, m, day] = d.split("-");
    return `${day}/${m}/${y}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar portarias por número ou ementa..." value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }} className="pl-9" />
        </div>
        <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing}>
          <RefreshCw className={`w-4 h-4 mr-1 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Sincronizando..." : "Atualizar"}
        </Button>
      </div>

      {!isLoading && (portarias?.length || 0) > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="stat-card text-center">
            <p className="text-2xl font-bold text-primary">{portarias?.length}</p>
            <p className="text-xs text-muted-foreground">Portarias</p>
          </div>
          <div className="stat-card text-center">
            <p className="text-2xl font-bold text-primary">{portarias?.filter((p: any) => p.resumo_ia).length}</p>
            <p className="text-xs text-muted-foreground">Com resumo IA</p>
          </div>
          <div className="stat-card text-center">
            <p className="text-2xl font-bold text-primary">{filtered.length}</p>
            <p className="text-xs text-muted-foreground">{search ? "Resultados" : "Total"}</p>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary mr-2" />
          <span className="text-muted-foreground">Carregando portarias...</span>
        </div>
      )}

      {!isLoading && (portarias?.length || 0) === 0 && (
        <div className="stat-card text-center py-8 space-y-3">
          <FileText className="w-12 h-12 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground">Nenhuma portaria cadastrada.</p>
          <p className="text-xs text-muted-foreground">Clique em "Atualizar" para importar do portal da prefeitura.</p>
          <Button onClick={handleSync} disabled={syncing}>
            <RefreshCw className={`w-4 h-4 mr-1 ${syncing ? "animate-spin" : ""}`} /> Importar Portarias
          </Button>
        </div>
      )}

      {!isLoading && (portarias?.length || 0) > 0 && filtered.length === 0 && (
        <div className="stat-card text-center py-6">
          <Search className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground">Nenhuma portaria encontrada para "{search}"</p>
        </div>
      )}

      <div className="space-y-3">
        {paged.map((portaria: any) => {
          const isExpanded = expandedId === portaria.id;
          const resumo = resumoCache[portaria.id] || portaria.resumo_ia;
          const isLoadingThis = loadingResumo === portaria.id;
          return (
            <div key={portaria.id}
              className={`stat-card cursor-pointer transition-all hover:border-primary/30 ${isExpanded ? "border-primary/40 ring-1 ring-primary/20" : ""}`}
              onClick={() => handleResumo(portaria)}>
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0 mt-0.5">
                  <FileText className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-foreground">Portaria nº {portaria.numero}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{portaria.ementa}</p>
                    </div>
                    <Badge variant="outline" className="text-xs flex-shrink-0 whitespace-nowrap">
                      {formatDate(portaria.data_publicacao)}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <button className="flex items-center gap-1 text-xs text-primary hover:underline" onClick={(e) => { e.stopPropagation(); handleResumo(portaria); }}>
                      <Sparkles className="w-3 h-3" /> {isExpanded ? "Ocultar" : "Resumo IA"}
                    </button>
                    {portaria.fonte_url && (
                      <a href={portaria.fonte_url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary" onClick={(e) => e.stopPropagation()}>
                        <ExternalLink className="w-3 h-3" /> Ver original
                      </a>
                    )}
                    {portaria.resumo_ia && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        <Sparkles className="w-2.5 h-2.5 mr-0.5" /> Salvo
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              {isExpanded && (
                <div className="mt-3 pt-3 border-t border-border">
                  {isLoadingThis ? (
                    <div className="flex items-center gap-2 py-3">
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      <span className="text-sm text-muted-foreground">Gerando resumo com IA...</span>
                    </div>
                  ) : resumo ? (
                    <div className="bg-primary/5 rounded-lg p-3 space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-primary" />
                        <span className="text-xs font-semibold text-primary">Resumo de IA</span>
                      </div>
                      <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">{resumo}</p>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm text-muted-foreground">Página {page + 1} de {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Fonte: <a href="https://morrinhos.go.gov.br/acesso-a-legislacao/#portarias" target="_blank" rel="noopener noreferrer"
          className="text-primary hover:underline inline-flex items-center gap-1">
          <ExternalLink className="w-3 h-3" /> Portal da Prefeitura
        </a>
      </p>
    </div>
  );
}

// ===== LEIS MUNICIPAIS TAB =====

function LeisMunicipaisTab({ initialSearch }: { initialSearch?: string }) {
  const [search, setSearch] = useState(initialSearch || "");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [resumoCache, setResumoCache] = useState<Record<string, { resumo: string; categoria?: string }>>({});
  const [loadingResumo, setLoadingResumo] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [categoriaFilter, setCategoriaFilter] = useState<string>("todas");

  const CATEGORIA_COLORS: Record<string, string> = {
    "Orçamento e Finanças": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    "Tributação": "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
    "Administração Pública": "bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-300",
    "Educação": "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
    "Saúde": "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
    "Urbanismo e Obras": "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
    "Meio Ambiente": "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    "Cultura e Esporte": "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
    "Assistência Social": "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300",
    "Transporte e Trânsito": "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300",
    "Segurança Pública": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
    "Denominação e Homenagens": "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300",
    "Outros": "bg-muted text-muted-foreground",
  };
  const { data: leis, isLoading, refetch } = useQuery({
    queryKey: ["leis_municipais"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leis_municipais")
        .select("*")
        .order("data_publicacao", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const filtered = (leis || []).filter((l: any) => {
    const q = search.toLowerCase();
    const matchSearch = !q || l.numero.toLowerCase().includes(q) || l.ementa.toLowerCase().includes(q);
    const matchCat = categoriaFilter === "todas" || l.categoria === categoriaFilter;
    return matchSearch && matchCat;
  });

  const categorias = [...new Set((leis || []).map((l: any) => l.categoria).filter(Boolean))].sort() as string[];

  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const { error } = await supabase.functions.invoke("sync-leis-municipais");
      if (error) throw error;
      await refetch();
    } catch (e) {
      console.error(e);
    } finally {
      setSyncing(false);
    }
  };

  const handleResumo = async (lei: any) => {
    if (expandedId === lei.id) { setExpandedId(null); return; }
    setExpandedId(lei.id);
    if (resumoCache[lei.id] || (lei.resumo_ia && lei.categoria)) {
      if (lei.resumo_ia) setResumoCache((prev) => ({ ...prev, [lei.id]: { resumo: lei.resumo_ia!, categoria: lei.categoria } }));
      return;
    }
    setLoadingResumo(lei.id);
    try {
      const { data, error } = await supabase.functions.invoke("summarize-lei-municipal", {
        body: { lei_id: lei.id },
      });
      if (error) throw error;
      setResumoCache((prev) => ({
        ...prev,
        [lei.id]: {
          resumo: data?.resumo || "Não foi possível gerar o resumo.",
          categoria: data?.categoria,
        },
      }));
      // Update local lei data to reflect new categoria
      if (data?.categoria) {
        lei.categoria = data.categoria;
      }
    } catch (e) {
      console.error(e);
      setResumoCache((prev) => ({ ...prev, [lei.id]: { resumo: "Erro ao gerar resumo." } }));
    } finally { setLoadingResumo(null); }
  };

  const formatDate = (d: string | null) => {
    if (!d) return "—";
    const [y, m, day] = d.split("-");
    return `${day}/${m}/${y}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar leis por número ou ementa..." value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }} className="pl-9" />
        </div>
        <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing}>
          <RefreshCw className={`w-4 h-4 mr-1 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Sincronizando..." : "Atualizar"}
        </Button>
      </div>

      {/* Category filter chips */}
      {!isLoading && categorias.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <button
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${categoriaFilter === "todas" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"}`}
            onClick={() => { setCategoriaFilter("todas"); setPage(0); }}
          >
            Todas
          </button>
          {categorias.map((cat) => (
            <button key={cat}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${categoriaFilter === cat ? "bg-primary text-primary-foreground" : CATEGORIA_COLORS[cat] || "bg-muted text-muted-foreground"} hover:opacity-80`}
              onClick={() => { setCategoriaFilter(categoriaFilter === cat ? "todas" : cat); setPage(0); }}
            >
              {cat} ({(leis || []).filter((l: any) => l.categoria === cat).length})
            </button>
          ))}
        </div>
      )}

      {!isLoading && (leis?.length || 0) > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="stat-card text-center">
            <p className="text-2xl font-bold text-primary">{leis?.length}</p>
            <p className="text-xs text-muted-foreground">Leis Municipais</p>
          </div>
          <div className="stat-card text-center">
            <p className="text-2xl font-bold text-primary">{leis?.filter((l: any) => l.categoria).length}</p>
            <p className="text-xs text-muted-foreground">Categorizadas</p>
          </div>
          <div className="stat-card text-center">
            <p className="text-2xl font-bold text-primary">{filtered.length}</p>
            <p className="text-xs text-muted-foreground">Filtradas</p>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="stat-card animate-pulse h-20" />)}</div>
      ) : !leis?.length ? (
        <EmptyState icon={Gavel} title="Nenhuma lei municipal" description="Clique em 'Atualizar' para importar do portal." />
      ) : (
        <div className="space-y-3">
          {paged.map((lei: any) => {
            const isExpanded = expandedId === lei.id;
            const isLoadingThis = loadingResumo === lei.id;
            const cached = resumoCache[lei.id];
            const resumoText = cached?.resumo || lei.resumo_ia;
            const categoria = cached?.categoria || lei.categoria;

            return (
              <div key={lei.id} className="stat-card cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleResumo(lei)}>
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 mt-0.5">
                    <Gavel className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-foreground text-sm">Lei nº {lei.numero}</p>
                          {categoria && (
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${CATEGORIA_COLORS[categoria] || "bg-muted text-muted-foreground"}`}>
                              {categoria}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{lei.ementa}</p>
                      </div>
                      <Badge variant="outline" className="text-xs flex-shrink-0 whitespace-nowrap">
                        {formatDate(lei.data_publicacao)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <button className="flex items-center gap-1 text-xs text-primary hover:underline" onClick={(e) => { e.stopPropagation(); handleResumo(lei); }}>
                        <Sparkles className="w-3 h-3" /> {isExpanded ? "Ocultar" : "Resumo IA"}
                      </button>
                      {lei.fonte_url && (
                        <a href={lei.fonte_url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary" onClick={(e) => e.stopPropagation()}>
                          <ExternalLink className="w-3 h-3" /> Ver original
                        </a>
                      )}
                      {lei.resumo_ia && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          <Sparkles className="w-2.5 h-2.5 mr-0.5" /> Salvo
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-border">
                    {isLoadingThis ? (
                      <div className="flex items-center gap-2 py-3">
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                        <span className="text-sm text-muted-foreground">Gerando resumo e categoria com IA...</span>
                      </div>
                    ) : resumoText ? (
                      <div className="bg-primary/5 rounded-lg p-3 space-y-1.5">
                        <div className="flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-primary" />
                          <span className="text-xs font-semibold text-primary">Resumo de IA</span>
                        </div>
                        <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">{resumoText}</p>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm text-muted-foreground">Página {page + 1} de {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Fonte: <a href="https://morrinhos.go.gov.br/acesso-a-legislacao/#leis-municipais" target="_blank" rel="noopener noreferrer"
          className="text-primary hover:underline inline-flex items-center gap-1">
          <ExternalLink className="w-3 h-3" /> Portal da Prefeitura
        </a>
      </p>
    </div>
  );
}

function ProcuradoriaTab() {
  const { data: procuradores, isLoading } = useQuery({
    queryKey: ["procuradores"],
    queryFn: fetchProcuradores,
  });

  if (isLoading) return <div className="stat-card animate-pulse h-40" />;
  if (!procuradores?.length) {
    return <EmptyState icon={Gavel} title="Sem dados da Procuradoria"
      description="Nenhum servidor com cargo de Procurador encontrado no portal de transparência."
      fonteUrl="https://morrinhos.centi.com.br/" />;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Servidores que integram o quadro da Procuradoria Municipal, com informações de remuneração.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {procuradores.map((p) => {
          const latestRem = p.remuneracoes?.[0];
          return (
            <div key={p.id} className="stat-card space-y-3">
              <div>
                <h3 className="font-semibold text-foreground">{p.nome}</h3>
                <Badge variant="secondary" className="mt-1">{p.cargo}</Badge>
              </div>

              {latestRem && (
                <div className="space-y-2 pt-2 border-t border-border">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-accent" />
                    <span className="font-bold text-foreground">
                      {formatCurrency(latestRem.bruto)}
                    </span>
                    <span className="text-xs text-muted-foreground">bruto ({latestRem.competencia})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-primary" />
                    <span className="font-semibold text-primary">
                      {formatCurrency(latestRem.liquido)}
                    </span>
                    <span className="text-xs text-muted-foreground">líquido</span>
                  </div>
                </div>
              )}

              {p.remuneracoes && p.remuneracoes.length > 1 && (
                <div className="space-y-1 pt-2 border-t border-border">
                  <p className="text-xs font-medium text-muted-foreground">Histórico recente</p>
                  {p.remuneracoes.slice(1).map((r: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{r.competencia}</span>
                      <div className="flex gap-3">
                        <span>Bruto: <span className="font-semibold text-foreground">{formatCurrency(r.bruto)}</span></span>
                        <span>Líquido: <span className="font-semibold text-accent">{formatCurrency(r.liquido)}</span></span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">
        Fonte: <a href="https://morrinhos.centi.com.br/" target="_blank" rel="noopener noreferrer"
          className="text-primary hover:underline inline-flex items-center gap-1">
          <ExternalLink className="w-3 h-3" /> Portal de Transparência
        </a>
      </p>
    </div>
  );
}

// ===== TCM-GO TAB =====
type TcmApontamento = {
  id: string;
  numero_processo: string;
  ano: number | null;
  orgao_alvo: string | null;
  tipo: string | null;
  status: string | null;
  ementa: string | null;
  ementa_resumo_ia: string | null;
  data_publicacao: string | null;
  valor_envolvido: number | null;
  fonte_url: string | null;
};

function TCMTab() {
  const [selectedApontamento, setSelectedApontamento] = useState<TcmApontamento | null>(null);
  const { data: apontamentos, isLoading } = useQuery({
    queryKey: ["tcm-go-apontamentos"],
    queryFn: async () => {
      const { data } = await supabase
        .from("tcm_go_apontamentos")
        .select("id, numero_processo, ano, orgao_alvo, tipo, status, ementa, ementa_resumo_ia, data_publicacao, valor_envolvido, fonte_url")
        .order("data_publicacao", { ascending: false, nullsFirst: false })
        .limit(100);
      return (data ?? []) as TcmApontamento[];
    },
  });

  if (isLoading) return <div className="stat-card animate-pulse h-40" />;

  if (!apontamentos?.length) {
    return (
      <div className="space-y-4">
        <div className="stat-card border-amber-500/30 bg-amber-500/5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-base font-semibold text-foreground mb-1">
                TCM-GO: dados públicos limitados
              </h3>
              <p className="text-sm text-foreground/85 leading-relaxed">
                Diferente da Prefeitura e da Câmara, o Tribunal de Contas dos Municípios
                de Goiás <strong>não publica decisões e apontamentos por município em
                formato estruturado público</strong>. As decisões ficam no SICOM (acesso
                institucional) e em relatórios SQL Server dinâmicos não indexáveis.
                Estamos trabalhando em parsers do Diário Oficial Eletrônico do TCM-GO
                para trazer os dados aqui.
              </p>
            </div>
          </div>
        </div>

        <h3 className="text-base font-semibold text-foreground pt-2">
          Consulte diretamente nas fontes oficiais:
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <a
            href="https://www.tcm.go.gov.br/cidadao/"
            target="_blank"
            rel="noopener noreferrer"
            className="stat-card card-hover flex items-start gap-3 group"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
              <Gavel className="w-5 h-5 text-blue-500" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-foreground text-sm mb-0.5">
                Portal do Cidadão TCM-GO
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Página oficial com canais de transparência ativa do tribunal.
              </p>
            </div>
            <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0 group-hover:text-primary transition-colors" />
          </a>

          <a
            href="https://www.tcm.go.gov.br/site/?p=mural-de-licitacoes"
            target="_blank"
            rel="noopener noreferrer"
            className="stat-card card-hover flex items-start gap-3 group"
          >
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 text-orange-500" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-foreground text-sm mb-0.5">
                Mural Eletrônico
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Editais e licitações fiscalizadas pelo TCM, incluindo Morrinhos.
              </p>
            </div>
            <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0 group-hover:text-primary transition-colors" />
          </a>

          <a
            href="https://www.tcm.go.gov.br/cidadao/transparencia-passiva/"
            target="_blank"
            rel="noopener noreferrer"
            className="stat-card card-hover flex items-start gap-3 group"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
              <BookOpen className="w-5 h-5 text-emerald-500" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-foreground text-sm mb-0.5">
                Transparência Passiva (LAI)
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Solicite formalmente dados específicos sobre Morrinhos via Lei de Acesso à Informação.
              </p>
            </div>
            <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0 group-hover:text-primary transition-colors" />
          </a>

          <a
            href="https://www.tcm.go.gov.br/site/?cat=21"
            target="_blank"
            rel="noopener noreferrer"
            className="stat-card card-hover flex items-start gap-3 group"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center shrink-0">
              <ScrollText className="w-5 h-5 text-purple-500" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-foreground text-sm mb-0.5">
                Notícias e Decisões
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Notícias do TCM-GO sobre fiscalização e decisões plenárias.
              </p>
            </div>
            <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0 group-hover:text-primary transition-colors" />
          </a>
        </div>

        <p className="text-xs text-muted-foreground pt-2 italic">
          🚧 Em desenvolvimento: parser do Diário Oficial Eletrônico do TCM-GO
          para indexar automaticamente menções a Morrinhos nos PDFs publicados.
        </p>
      </div>
    );
  }

  // Stats agregados
  const total = apontamentos.length;
  const valorTotal = apontamentos.reduce((s, a: any) => s + Number(a.valor_envolvido ?? 0), 0);
  const porTipo: Record<string, number> = {};
  for (const a of apontamentos as any[]) {
    const t = a.tipo || "Outros";
    porTipo[t] = (porTipo[t] ?? 0) + 1;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Apontamentos, acórdãos e sanções do Tribunal de Contas dos Municípios de Goiás
        envolvendo a Prefeitura de Morrinhos. Coletado por busca dirigida nos PDFs
        públicos do TCM-GO indexados pelo Google.
      </p>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="stat-card text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Total</p>
          <p className="text-2xl font-extrabold text-foreground mt-1">{total}</p>
          <p className="text-[10px] text-muted-foreground">apontamentos</p>
        </div>
        {valorTotal > 0 && (
          <div className="stat-card text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Valor envolvido</p>
            <p className="text-2xl font-extrabold text-orange-500 mt-1">
              {formatCurrency(valorTotal)}
            </p>
            <p className="text-[10px] text-muted-foreground">soma dos casos</p>
          </div>
        )}
        <div className="stat-card text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Tipos</p>
          <p className="text-sm font-medium text-foreground mt-1 leading-tight">
            {Object.entries(porTipo)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 3)
              .map(([t, n]) => `${t} (${n})`)
              .join(" · ")}
          </p>
        </div>
      </div>

      {/* Lista */}
      <div className="space-y-3">
        {apontamentos.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => setSelectedApontamento(a)}
            className="stat-card space-y-2 w-full text-left card-hover transition-all hover:border-primary/40 cursor-pointer"
          >
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="inline-flex items-center gap-2 mb-1">
                  {a.tipo && <Badge variant="secondary">{a.tipo}</Badge>}
                  {a.status && <Badge variant="outline">{a.status}</Badge>}
                  {a.orgao_alvo && <Badge variant="outline">{a.orgao_alvo}</Badge>}
                </div>
                <h3 className="font-semibold text-foreground text-sm">
                  {a.numero_processo}
                  {a.ano && <span className="text-muted-foreground font-normal"> · {a.ano}</span>}
                </h3>
                {a.ementa ? (
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2">{a.ementa}</p>
                ) : null}
              </div>
              {a.valor_envolvido && (
                <div className="text-right shrink-0">
                  <p className="text-[10px] text-muted-foreground uppercase">Valor</p>
                  <p className="font-bold text-orange-500">{formatCurrency(Number(a.valor_envolvido))}</p>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border">
              <span>{a.data_publicacao ? new Date(a.data_publicacao).toLocaleDateString("pt-BR") : "Data não informada"}</span>
              <span className="text-primary inline-flex items-center gap-1 font-medium">
                <Sparkles className="w-3 h-3" /> Ver resumo
              </span>
            </div>
          </button>
        ))}
      </div>

      <p className="text-xs text-muted-foreground pt-2">
        Fonte:{" "}
        <a href="https://www.tcm.go.gov.br/" target="_blank" rel="noopener noreferrer"
           className="text-primary hover:underline inline-flex items-center gap-1">
          <ExternalLink className="w-3 h-3" /> Tribunal de Contas dos Municípios de Goiás
        </a>
        {" "}· Cada apontamento abaixo aponta para o PDF original no domínio tcm.go.gov.br
      </p>

      {/* Dialog de resumo */}
      <Dialog open={!!selectedApontamento} onOpenChange={(o) => !o && setSelectedApontamento(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base flex items-start gap-2 flex-wrap">
              <span>{selectedApontamento?.numero_processo}</span>
              {selectedApontamento?.ano && (
                <span className="text-muted-foreground font-normal">· {selectedApontamento.ano}</span>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Badges */}
            {selectedApontamento && (
              <div className="inline-flex items-center gap-2 flex-wrap">
                {selectedApontamento.tipo && <Badge variant="secondary">{selectedApontamento.tipo}</Badge>}
                {selectedApontamento.status && <Badge variant="outline">{selectedApontamento.status}</Badge>}
                {selectedApontamento.orgao_alvo && <Badge variant="outline">{selectedApontamento.orgao_alvo}</Badge>}
                {selectedApontamento.data_publicacao && (
                  <Badge variant="outline">{new Date(selectedApontamento.data_publicacao).toLocaleDateString("pt-BR")}</Badge>
                )}
              </div>
            )}

            {/* Resumo IA (cached em DB — sem custo de IA por clique) */}
            {selectedApontamento?.ementa_resumo_ia ? (
              <div className="rounded-lg bg-muted/50 border p-4">
                <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-accent" /> Resumo gerado por IA
                </p>
                <p className="text-sm text-foreground whitespace-pre-line leading-relaxed">
                  {selectedApontamento.ementa_resumo_ia}
                </p>
              </div>
            ) : selectedApontamento?.ementa ? (
              <div className="rounded-lg bg-muted/50 border p-4">
                <p className="text-xs font-medium text-muted-foreground mb-2">Ementa original</p>
                <p className="text-sm text-foreground leading-relaxed">{selectedApontamento.ementa}</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">Sem resumo disponível.</p>
            )}

            {/* Ementa original (sempre que tiver, abaixo do resumo) */}
            {selectedApontamento?.ementa_resumo_ia && selectedApontamento?.ementa && (
              <details className="text-xs">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                  Ver dados originais coletados
                </summary>
                <p className="mt-2 text-muted-foreground leading-relaxed pl-3 border-l-2 border-border">
                  {selectedApontamento.ementa}
                </p>
              </details>
            )}

            {/* Valor */}
            {selectedApontamento?.valor_envolvido && (
              <div className="flex items-center justify-between rounded-lg bg-orange-500/5 border border-orange-500/20 p-3">
                <span className="text-xs text-muted-foreground uppercase tracking-wider">Valor envolvido</span>
                <span className="font-bold text-orange-500">{formatCurrency(Number(selectedApontamento.valor_envolvido))}</span>
              </div>
            )}

            {/* Documento original */}
            {selectedApontamento?.fonte_url && (
              <a
                href={selectedApontamento.fonte_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between rounded-lg bg-primary/5 border border-primary/20 p-3 hover:bg-primary/10 transition-colors group"
              >
                <span className="text-sm font-medium text-foreground">Ver documento original (PDF)</span>
                <ExternalLink className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
              </a>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ===== MAIN PAGE =====

const tabs = [
  { value: "visao-geral", label: "Visão Geral", icon: LayoutDashboard },
  { value: "chefia", label: "Prefeita e Vice", icon: Building2 },
  { value: "secretarias", label: "Secretarias", icon: Building2 },
  { value: "contratos", label: "Contratos", icon: FileText },
  { value: "servidores", label: "Servidores", icon: Users },
  { value: "despesas", label: "Despesas", icon: DollarSign },
  { value: "tcm-go", label: "TCM-GO", icon: Gavel },
  { value: "decretos", label: "Decretos", icon: ScrollText },
  { value: "portarias", label: "Portarias", icon: FileText },
  { value: "leis", label: "Leis Municipais", icon: Gavel },
  { value: "lei-organica", label: "Lei Orgânica", icon: BookOpen },
  { value: "diarias", label: "Diárias", icon: Briefcase },
  { value: "licitacoes", label: "Licitações", icon: Gavel },
  { value: "obras", label: "Obras", icon: HardHat },
  { value: "veiculos", label: "Veículos", icon: Truck },
  { value: "admin", label: "Admin", icon: Settings },
];

export default function Prefeitura() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") || "visao-geral";
  const initialBusca = searchParams.get("busca") || "";
  const [activeTab, setActiveTab] = useState(initialTab);

  // Prefetch contratos + aditivos + CNPJ assim que a página monta (antes de clicar na aba)
  useEffect(() => {
    queryClient.prefetchQuery({ queryKey: ["contratos"], queryFn: fetchContratos, staleTime: 1000 * 60 * 10 });
    queryClient.prefetchQuery({ queryKey: ["contratos_aditivos"], queryFn: fetchContratosAditivos, staleTime: 1000 * 60 * 10 });
    queryClient.prefetchQuery({
      queryKey: ["fornecedores-cnpj"],
      queryFn: async () => {
        const { data, error } = await supabase
          .from("fornecedores_cnpj")
          .select("cnpj, razao_social, data_abertura, situacao_cadastral, capital_social, cnae_descricao");
        if (error) throw error;
        const map = new Map<string, FornecedorCNPJ>();
        for (const f of data || []) map.set(f.cnpj, f as FornecedorCNPJ);
        return map;
      },
      staleTime: 1000 * 60 * 10,
    });
  }, [queryClient]);

  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries();
  }, [queryClient]);

  return (
    <Layout>
      <SEO
        title="Prefeitura de Morrinhos GO"
        description="Morrinhos GO — Prefeitura Municipal: secretarias, servidores, contratos, licitações, obras, decretos, portarias e leis municipais. Dados oficiais verificáveis."
        path="/prefeitura"
      />
      <PullToRefresh onRefresh={handleRefresh}>
      <div className="container py-8">
        <h1 className="text-2xl font-bold text-foreground mb-1">Prefeitura de Morrinhos</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Dados oficiais do Poder Executivo — mandato 2025–2028. Todos os dados vêm de fontes oficiais.
        </p>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 mb-6 scrollbar-hide">
            <TabsList className="inline-flex w-max md:w-full md:flex-wrap h-auto gap-1 bg-transparent p-0">
              {tabs.map((t) => (
                <TabsTrigger key={t.value} value={t.value}
                  className="text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg px-3 py-2.5 border border-border data-[state=active]:border-primary whitespace-nowrap flex-shrink-0">
                  <t.icon className="w-3.5 h-3.5 mr-1.5" />
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <TabsContent value="visao-geral"><PrefeituraDestaques /></TabsContent>
          <TabsContent value="chefia"><ChefiaExecutivo /></TabsContent>
          <TabsContent value="secretarias"><SecretariasTab /></TabsContent>
          <TabsContent value="despesas"><GastosTab /></TabsContent>
          <TabsContent value="tcm-go"><TCMTab /></TabsContent>
          <TabsContent value="servidores"><ServidoresTab initialSearch={activeTab === "servidores" ? initialBusca : undefined} /></TabsContent>
          <TabsContent value="decretos"><DecretosTab /></TabsContent>
          <TabsContent value="portarias"><PortariasTab /></TabsContent>
          <TabsContent value="leis"><LeisMunicipaisTab initialSearch={activeTab === "leis" ? initialBusca : undefined} /></TabsContent>
          <TabsContent value="lei-organica"><LeiOrganicaTab /></TabsContent>
          <TabsContent value="diarias"><DiariasTab /></TabsContent>
          <TabsContent value="contratos" forceMount className={activeTab !== "contratos" ? "hidden" : ""}><ContratosTab /></TabsContent>
          <TabsContent value="licitacoes"><LicitacoesTab /></TabsContent>
          <TabsContent value="obras"><ObrasTab /></TabsContent>
          <TabsContent value="veiculos"><VeiculosTab /></TabsContent>
          <TabsContent value="admin"><AdminPanel /></TabsContent>
        </Tabs>
      </div>
      </PullToRefresh>
    </Layout>
  );
}

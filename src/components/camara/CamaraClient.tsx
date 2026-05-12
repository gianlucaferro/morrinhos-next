"use client";

import { useState, useRef } from "react";
import { Users, Megaphone, Landmark, UserCheck, Search, Sparkles, Download, ChevronLeft, ChevronRight, Loader2, FileText, CalendarCheck, Gavel, FileSignature, Receipt, TrendingUp, Plane, ScrollText, Video, BookOpen, ClipboardList, FileStack, HandMetal, FileCheck2, ExternalLink, Calendar } from "lucide-react";
import Layout from "@/components/Layout";
import SEO from "@/components/SEO";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VereadoresContent } from "@/components/camara/VereadoresContent";
import { AtuacaoContent } from "@/components/camara/AtuacaoContent";
import { ProjetosContent } from "@/components/camara/ProjetosContent";
import { useQuery } from "@tanstack/react-query";
import { fetchServidores } from "@/data/prefeituraApi";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
const supabase = createBrowserSupabaseClient();
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import LicitacoesTab from "@/components/camara/LicitacoesTab";
import ContratosTab from "@/components/camara/ContratosTab";
import DespesasTab from "@/components/camara/DespesasTab";
import ReceitasTab from "@/components/camara/ReceitasTab";
import DiariasTab from "@/components/camara/DiariasTab";
import ResolucoesTab from "@/components/camara/ResolucoesTab";
import AtosTab from "@/components/camara/AtosTab";
import TransmissaoCard from "@/components/camara/TransmissaoCard";

const tabs = [
  { value: "vereadores", label: "Vereadores", icon: Users },
  { value: "projetos", label: "Projetos", icon: FileText },
  { value: "decretos-leg", label: "Decretos Leg.", icon: FileStack },
  { value: "portarias-cm", label: "Portarias", icon: ScrollText },
  { value: "resolucoes", label: "Resoluções", icon: FileSignature },
  { value: "apreciacao-contas", label: "Apreciação de Contas", icon: FileCheck2 },
  { value: "servidores", label: "Servidores", icon: UserCheck },
  { value: "atuacao", label: "Atuação", icon: Megaphone },
  { value: "indicacoes", label: "Indicações", icon: HandMetal },
  { value: "pautas", label: "Pautas", icon: ClipboardList },
  { value: "atas", label: "Atas", icon: BookOpen },
  { value: "transmissao", label: "Transmissão", icon: Video },
  { value: "contratos", label: "Contratos", icon: FileSignature },
  { value: "licitacoes", label: "Licitações", icon: Gavel },
  { value: "despesas", label: "Despesas", icon: Receipt },
  { value: "receitas", label: "Receitas", icon: TrendingUp },
  { value: "diarias", label: "Diárias", icon: Plane },
];

import { formatCurrency } from "@/lib/formatters";

function ServidoresCamaraTab() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 30;

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(0);
  };

  const { data: result, isLoading } = useQuery({
    queryKey: ["servidores-camara", search, page],
    queryFn: () => fetchServidores(search || undefined, undefined, page, PAGE_SIZE, "camara"),
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
    const { data: all } = await fetchServidores(search || undefined, undefined, 0, 10000, "camara");
    if (!all?.length) return;
    const header = "Nome,Cargo";
    const rows = all.map(s => `"${s.nome}","${s.cargo || ""}"`);
    const csv = [header, ...rows].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `servidores-camara${search ? `_${search}` : ""}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container py-4 space-y-4">
      <p className="text-sm text-muted-foreground">
        Assessores e demais servidores da Câmara Municipal de Morrinhos. Dados obtidos do portal de transparência legislativo.
      </p>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar servidor por nome..." value={search}
          onChange={(e) => handleSearch(e.target.value)} className="pl-9" aria-label="Buscar servidor da Câmara" />
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
        <div className="stat-card text-center py-8">
          <UserCheck className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-semibold text-foreground">Sem dados de servidores da Câmara</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Os dados serão sincronizados automaticamente do portal de transparência legislativo.
          </p>
          <a href="https://acessoainformacao.morrinhos.go.leg.br/cidadao/transparencia/mgservidores" target="_blank" rel="noopener noreferrer"
            className="text-xs text-primary hover:underline mt-2 inline-block">
            Ver fonte original →
          </a>
        </div>
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
              <UserCheck className="w-4 h-4 text-primary" />
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

function ApreciacaoContasTab() {
  const { data: items, isLoading } = useQuery({
    queryKey: ["camara-apreciacao-contas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("camara_apreciacao_contas")
        .select("id, ano, anos_referencia, numero, tipo, status, ementa, data_publicacao, link, fonte_url")
        .order("ano", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="container py-4 space-y-4">
      <div className="stat-card border-blue-500/20 bg-blue-500/5">
        <div className="flex items-start gap-3">
          <FileCheck2 className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-base font-semibold text-foreground mb-1">
              Apreciação das contas pelo TCM-GO
            </h3>
            <p className="text-sm text-foreground/85 leading-relaxed">
              Acompanhe o status do julgamento das contas anuais da Câmara Municipal pelo
              <strong> Tribunal de Contas dos Municípios de Goiás</strong>. Dados oficiais
              sincronizados do{" "}
              <a href="https://acessoainformacao.morrinhos.go.leg.br/cidadao/legislacao/apreciacao_contas"
                target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                Portal de Transparência da Câmara
              </a>.
            </p>
          </div>
        </div>
      </div>

      {isLoading && <div className="stat-card animate-pulse h-40" />}

      {!isLoading && (items?.length || 0) === 0 && (
        <div className="stat-card text-center py-8">
          <FileCheck2 className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Sem dados ainda — sync diário em andamento.</p>
        </div>
      )}

      <div className="space-y-2">
        {(items || []).map((c: any) => (
          <div key={c.id} className="stat-card">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                <Calendar className="w-5 h-5 text-blue-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <Badge variant="outline" className="text-[10px]">
                    Exercício {c.anos_referencia || c.ano}
                  </Badge>
                  {c.status && (
                    <Badge variant={c.status === "Aprovado" ? "default" : "secondary"} className="text-[10px]">
                      {c.status}
                    </Badge>
                  )}
                  {c.tipo && (
                    <Badge variant="outline" className="text-[10px]">{c.tipo}</Badge>
                  )}
                </div>
                <p className="text-sm text-foreground leading-snug">{c.ementa || "(sem ementa)"}</p>
                {c.data_publicacao && (
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Publicado em {new Date(c.data_publicacao + "T12:00:00").toLocaleDateString("pt-BR")}
                  </p>
                )}
              </div>
              {c.fonte_url && (
                <a href={c.fonte_url} target="_blank" rel="noopener noreferrer"
                  className="shrink-0 text-primary hover:scale-110 transition-transform">
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TransmissaoTab() {
  return (
    <div className="container py-4 space-y-4">
      <TransmissaoCard />
      <div className="stat-card">
        <h3 className="font-semibold text-foreground mb-2">Sobre as Sessões</h3>
        <p className="text-sm text-muted-foreground">
          As sessões ordinárias da Câmara Municipal de Morrinhos acontecem toda segunda-feira, a partir das 19h, e na última quinta-feira de cada mês. As transmissões são realizadas ao vivo pelo canal oficial no YouTube.
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          A transmissão ao vivo visa oferecer maior transparência e comodidade aos cidadãos que não podem comparecer presencialmente ao plenário.
        </p>
        <a href="https://morrinhos.go.leg.br/transmissao-das-sessoes/" target="_blank" rel="noopener noreferrer"
          className="text-xs text-primary hover:underline mt-3 inline-block">
          Ver página oficial →
        </a>
      </div>
    </div>
  );
}

export default function CamaraMunicipal() {
  const [activeTab, setActiveTab] = useState("vereadores");

  return (
    <Layout>
      <SEO
        title="Câmara Municipal de Morrinhos GO"
        description="Morrinhos GO — Câmara Municipal: vereadores, projetos de lei, votações, remunerações, despesas, contratos e atuação parlamentar. Dados oficiais."
        path="/camara"
      />
      <div className="container py-6">
        <div className="flex items-center gap-3 mb-4">
          <Landmark className="w-7 h-7 text-accent" />
          <h1 className="text-2xl font-bold text-foreground">Câmara Municipal</h1>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="container">
          <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 mb-6 scrollbar-hide">
            <TabsList className="inline-flex w-max md:w-full md:flex-wrap h-auto gap-1 bg-transparent p-0">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg px-3 py-2.5 border border-border data-[state=active]:border-primary whitespace-nowrap flex-shrink-0"
                  >
                    <Icon className="w-3.5 h-3.5 mr-1.5" />
                    {tab.label}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>
        </div>

        <TabsContent value="vereadores">
          <VereadoresContent />
        </TabsContent>
        <TabsContent value="projetos">
          <ProjetosContent />
        </TabsContent>
        <TabsContent value="decretos-leg">
          <AtosTab
            tipoNome="Decreto"
            descricao="Decretos legislativos aprovados pela Câmara Municipal de Morrinhos. Atos privativos do Legislativo (concessão de títulos honoríficos, autorizações de viagem, etc.)."
            fonteUrl="https://acessoainformacao.morrinhos.go.leg.br/cidadao/legislacao/decretos"
          />
        </TabsContent>
        <TabsContent value="portarias-cm">
          <AtosTab
            tipoNome="Portaria"
            descricao="Portarias administrativas da Câmara Municipal de Morrinhos (atos internos da Mesa Diretora — concessão de diárias, licenças, designações)."
            fonteUrl="https://acessoainformacao.morrinhos.go.leg.br/cidadao/legislacao/portarias"
          />
        </TabsContent>
        <TabsContent value="resolucoes">
          <AtosTab
            tipoNome="Resolução"
            descricao="Resoluções da Câmara Municipal de Morrinhos (normas internas do Legislativo)."
            fonteUrl="https://acessoainformacao.morrinhos.go.leg.br/cidadao/legislacao/resolucoes"
          />
        </TabsContent>
        <TabsContent value="apreciacao-contas">
          <ApreciacaoContasTab />
        </TabsContent>
        <TabsContent value="servidores">
          <ServidoresCamaraTab />
        </TabsContent>
        <TabsContent value="atuacao">
          <AtuacaoContent />
        </TabsContent>
        <TabsContent value="indicacoes">
          <AtosTab
            tipoNome="Indicação"
            descricao="Indicações dos vereadores ao Poder Executivo (solicitações formais de obras, serviços, melhorias)."
            emptyHint="A Câmara de Morrinhos não publica Indicações de forma estruturada via o portal NucleoGov. Indicações aparecem dentro dos Projetos (aba 'Projetos') quando o vereador protocola formalmente."
            fonteUrl="https://acessoainformacao.morrinhos.go.leg.br/cidadao/legislacao/atividades_legislativas"
          />
        </TabsContent>
        <TabsContent value="pautas">
          <AtosTab
            tipoNome="Pauta"
            descricao="Pautas das sessões ordinárias da Câmara Municipal de Morrinhos."
            emptyHint="As pautas das sessões da Câmara não estão disponíveis em formato estruturado no portal NucleoGov. Consulte o portal oficial pra ver os documentos."
            fonteUrl="https://acessoainformacao.morrinhos.go.leg.br/cidadao/atos_adm/mp/id=6"
          />
        </TabsContent>
        <TabsContent value="atas">
          <AtosTab
            tipoNome="Ata"
            descricao="Atas das sessões ordinárias da Câmara Municipal de Morrinhos."
            emptyHint="As atas das sessões da Câmara não estão disponíveis em formato estruturado no portal NucleoGov. Consulte o portal oficial pra ver os PDFs."
            fonteUrl="https://acessoainformacao.morrinhos.go.leg.br/cidadao/atos_adm/mp/id=9"
          />
        </TabsContent>
        <TabsContent value="transmissao">
          <TransmissaoTab />
        </TabsContent>
        <TabsContent value="contratos">
          <ContratosTab />
        </TabsContent>
        <TabsContent value="licitacoes">
          <LicitacoesTab />
        </TabsContent>
        <TabsContent value="despesas">
          <DespesasTab />
        </TabsContent>
        <TabsContent value="receitas">
          <ReceitasTab />
        </TabsContent>
        <TabsContent value="diarias">
          <DiariasTab />
        </TabsContent>
      </Tabs>
    </Layout>
  );
}

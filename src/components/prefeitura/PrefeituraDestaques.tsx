"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { DollarSign, Users, TrendingUp, Trophy, Share2, BarChart3, PieChart, Building2, Wallet } from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
const supabase = createBrowserSupabaseClient();
import { formatCurrency } from "@/lib/formatters";

const POPULACAO = 51351;

function ShareWhatsApp({ text }: { text: string }) {
  return (
    <a
      href={`https://wa.me/?text=${encodeURIComponent(text + "\n\nVeja mais em: https://morrinhos.ai/prefeitura")}`}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-xs text-[#25D366] hover:underline font-medium"
    >
      <Share2 className="w-3 h-3" /> Compartilhar
    </a>
  );
}

async function fetchDespesaTotal() {
  const { data } = await supabase
    .from("contas_publicas")
    .select("valor")
    .eq("coluna", "Despesas Empenhadas")
    .like("conta", "DO3.0.00.00.00.00%")
    .order("exercicio", { ascending: false })
    .limit(1)
    .single();
  return data?.valor || null;
}

const MESES_NOME: Record<string, string> = {
  "01": "Janeiro", "02": "Fevereiro", "03": "Março", "04": "Abril",
  "05": "Maio", "06": "Junho", "07": "Julho", "08": "Agosto",
  "09": "Setembro", "10": "Outubro", "11": "Novembro", "12": "Dezembro",
};

function formatCompetencia(comp: string): string {
  const [ano, mes] = comp.split("-");
  return `${MESES_NOME[mes] || mes}/${ano}`;
}

async function fetchTopSalarios() {
  // Última competência que tem dados de servidores da PREFEITURA
  // (não da Câmara — orgao_tipo='camara' fica fora). Usamos inner join via
  // foreign-key embed do PostgREST: servidores!inner(...) e filtro
  // aplicado na tabela embed (servidores.orgao_tipo).
  const { data: latestRow } = await supabase
    .from("remuneracao_servidores")
    .select("competencia, servidores!inner(orgao_tipo)")
    .eq("servidores.orgao_tipo", "prefeitura")
    .order("competencia", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!latestRow) return { items: [], competencia: "", mediana: 0 };
  const competencia = latestRow.competencia as string;

  // Todos os salários da Prefeitura para essa competência (mediana)
  const { data: allRem } = await supabase
    .from("remuneracao_servidores")
    .select("bruto, servidores!inner(orgao_tipo)")
    .eq("competencia", competencia)
    .eq("servidores.orgao_tipo", "prefeitura")
    .gt("bruto", 0)
    .order("bruto", { ascending: true });

  const allBrutos = (allRem || []).map((r) => Number(r.bruto)).filter(Boolean);
  const mediana = allBrutos.length > 0 ? allBrutos[Math.floor(allBrutos.length / 2)] : 3000;

  // Top 10 salários da Prefeitura (com nome/cargo via embed)
  const { data: remuneracoes } = await supabase
    .from("remuneracao_servidores")
    .select("bruto, liquido, servidor_id, tipo_folha, servidores!inner(nome, cargo, orgao_tipo)")
    .eq("competencia", competencia)
    .eq("servidores.orgao_tipo", "prefeitura")
    .order("bruto", { ascending: false })
    .limit(10);

  if (!remuneracoes?.length) {
    return { items: [], competencia, mediana };
  }

  return {
    competencia,
    mediana,
    items: remuneracoes.map((r, i) => {
      const srv = (r as { servidores?: { nome?: string; cargo?: string | null } }).servidores;
      return {
        posicao: i + 1,
        nome: srv?.nome || "Não identificado",
        cargo: srv?.cargo || null,
        bruto: r.bruto,
        liquido: r.liquido,
        tipo_folha: (r as { tipo_folha?: string | null }).tipo_folha || null,
        atipico:
          Number(r.bruto) > mediana * 5 ||
          (((r as { tipo_folha?: string | null }).tipo_folha || null) &&
            ((r as { tipo_folha?: string | null }).tipo_folha as string) !== "NORMAL"),
      };
    }),
  };
}

const CORES_FUNCAO = [
  "bg-blue-500", "bg-emerald-500", "bg-amber-500", "bg-violet-500",
  "bg-rose-500", "bg-cyan-500", "bg-orange-500", "bg-pink-500",
  "bg-teal-500", "bg-indigo-500", "bg-lime-500", "bg-fuchsia-500",
];

async function fetchDespesasPorFuncao() {
  const { data } = await supabase
    .from("contas_publicas")
    .select("conta, valor")
    .eq("coluna", "Despesas Empenhadas")
    .like("conta", "TotalDespesas::%")
    .order("exercicio", { ascending: false });

  if (!data?.length) return [];

  const funcs = new Map<string, { code: string; name: string; valor: number }>();
  for (const d of data) {
    const parte = d.conta.split("::")[1] || "";
    const match = parte.match(/^(\d{2}) - (.+)/);
    if (!match) continue;
    const code = match[1];
    const name = match[2];
    if (!funcs.has(code)) funcs.set(code, { code, name, valor: 0 });
    funcs.get(code)!.valor += d.valor;
  }
  return Array.from(funcs.values())
    .filter((f) => f.valor > 0)
    .sort((a, b) => b.valor - a.valor);
}

async function fetchTopFornecedores() {
  const { data } = await supabase
    .from("contratos")
    .select("empresa, valor")
    .not("empresa", "is", null);

  if (!data?.length) return [];

  const map = new Map<string, { nome: string; valor: number; count: number }>();
  for (const d of data) {
    const nome = d.empresa!;
    const entry = map.get(nome) || { nome, valor: 0, count: 0 };
    entry.valor += d.valor || 0;
    entry.count++;
    map.set(nome, entry);
  }
  return Array.from(map.values()).sort((a, b) => b.valor - a.valor).slice(0, 5);
}

async function fetchFolhaTotal() {
  // Pegar a ultima competencia QUE CONTEM dados da Prefeitura (nao
  // necessariamente a global). Se a Camara ja publicou um mes a mais
  // que a Prefeitura, esse mes nao serve aqui — mostraria 0 / 0
  // servidores na coluna Prefeitura. Usar essa comp para ambos os
  // orgaos garante apresentacao consistente do mesmo periodo.
  const { data: latestPref } = await supabase
    .from("remuneracao_servidores")
    .select("competencia, servidores!inner(orgao_tipo)")
    .eq("servidores.orgao_tipo", "prefeitura")
    .order("competencia", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!latestPref) return null;
  const competencia = latestPref.competencia as string;

  // Soma agregada por orgao para a competencia escolhida, via inner
  // join com servidores e filtro orgao_tipo. Paginar via .range() para
  // contornar o limite default de 1000 rows do Supabase REST (a Prefeitura
  // tem ~1.400 servidores em competencias completas).
  let prefTotal = 0, prefCount = 0, camTotal = 0, camCount = 0;
  const PAGE = 1000;
  for (let offset = 0; ; offset += PAGE) {
    const { data: rems } = await supabase
      .from("remuneracao_servidores")
      .select("bruto, servidores!inner(orgao_tipo)")
      .eq("competencia", competencia)
      .range(offset, offset + PAGE - 1);
    if (!rems || rems.length === 0) break;
    for (const r of rems as Array<{ bruto: number | null; servidores: { orgao_tipo: string } }>) {
      const valor = r.bruto || 0;
      if (r.servidores.orgao_tipo === "prefeitura") { prefTotal += valor; prefCount++; }
      else if (r.servidores.orgao_tipo === "camara") { camTotal += valor; camCount++; }
    }
    if (rems.length < PAGE) break;
  }

  return {
    competencia,
    prefeitura: { total: prefTotal, count: prefCount },
    camara: { total: camTotal, count: camCount },
    geral: { total: prefTotal + camTotal, count: prefCount + camCount },
  };
}

async function fetchComparativoCidades() {
  const { data } = await supabase
    .from("arrecadacao_comparativo")
    .select("*")
    .eq("categoria", "receita_propria_total")
    .order("ano", { ascending: false })
    .limit(1)
    .single();
  return data;
}

export default function PrefeituraDestaques() {
  const { data: despesaTotal } = useQuery({
    queryKey: ["despesa-total-prefeitura"],
    queryFn: fetchDespesaTotal,
    staleTime: 30 * 60 * 1000,
  });

  const { data: topSalarios } = useQuery({
    queryKey: ["top-salarios"],
    queryFn: fetchTopSalarios,
    staleTime: 30 * 60 * 1000,
  });

  const { data: comparativo } = useQuery({
    queryKey: ["comparativo-cidades"],
    queryFn: fetchComparativoCidades,
    staleTime: 30 * 60 * 1000,
  });

  const { data: despesasFuncao } = useQuery({
    queryKey: ["despesas-por-funcao"],
    queryFn: fetchDespesasPorFuncao,
    staleTime: 30 * 60 * 1000,
  });

  const { data: topFornecedores } = useQuery({
    queryKey: ["top-fornecedores"],
    queryFn: fetchTopFornecedores,
    staleTime: 30 * 60 * 1000,
  });

  const { data: folhaTotal } = useQuery({
    queryKey: ["folha-total"],
    queryFn: fetchFolhaTotal,
    staleTime: 30 * 60 * 1000,
  });

  const custoPerCapitaMensal = despesaTotal ? despesaTotal / POPULACAO / 12 : null;
  const custoPerCapitaAnual = despesaTotal ? despesaTotal / POPULACAO : null;

  return (
    <div className="space-y-4">
      {/* Card 1: Custo per capita */}
      {custoPerCapitaMensal && (
        <div className="stat-card border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10">
                <DollarSign className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Quanto custa a Prefeitura para cada morador?</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {formatCurrency(custoPerCapitaMensal)}<span className="text-sm font-normal text-muted-foreground">/mês por habitante</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Equivale a {formatCurrency(custoPerCapitaAnual)} por ano. Cálculo: despesa total empenhada pela Prefeitura dividida pelos {POPULACAO.toLocaleString("pt-BR")} habitantes do município.
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Fonte: DCA/SICONFI (Tesouro Nacional) · Inclui todas as secretarias e órgãos do Executivo.
                </p>
              </div>
            </div>
            <ShareWhatsApp text={`Você sabia? Cada morador de Morrinhos paga o equivalente a ${formatCurrency(custoPerCapitaMensal)} por mês para manter a Prefeitura (${formatCurrency(custoPerCapitaAnual)}/ano). Cálculo: despesa total empenhada ÷ ${POPULACAO.toLocaleString("pt-BR")} habitantes.`} />
          </div>
        </div>
      )}

      {/* Card 2: Top 10 salários — TEMPORARIAMENTE OCULTO (a pedido do user)
          Para reativar: trocar SHOW_TOP_SALARIOS para true. A query continua
          rodando normalmente, só a renderização está bloqueada. */}
      {(false as boolean) /* SHOW_TOP_SALARIOS */ && topSalarios && topSalarios.items.length > 0 && (() => {
        const mesRef = formatCompetencia(topSalarios.competencia);
        const temAtipico = topSalarios.items.some((s) => s.atipico);
        return (
        <div className="stat-card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Trophy className="w-4 h-4 text-warning" />
              10 maiores salários da Prefeitura em {mesRef}
            </h3>
            <ShareWhatsApp text={`Os 10 maiores salários da Prefeitura de Morrinhos em ${mesRef}:\n\n${topSalarios.items.slice(0, 5).map((s, i) => `${i + 1}. ${s.nome} (${s.cargo || "—"}) — ${formatCurrency(s.bruto)} bruto${s.atipico ? " ⚠️" : ""}`).join("\n")}\n\n...e mais 5 no site.`} />
          </div>
          <div className="space-y-1.5">
            {topSalarios.items.map((s) => (
              <div key={s.posicao} className="flex items-center gap-2 text-sm">
                <span className={`w-5 text-right font-bold text-xs ${
                  s.posicao === 1 ? "text-yellow-500" : s.posicao === 2 ? "text-gray-400" : s.posicao === 3 ? "text-amber-600" : "text-muted-foreground"
                }`}>{s.posicao}º</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <p className="text-xs font-medium text-foreground truncate">{s.nome}</p>
                    {s.tipo_folha && s.tipo_folha !== "NORMAL" ? (
                      <span className="shrink-0 text-[9px] px-1 py-0.5 rounded bg-destructive/15 text-destructive font-semibold">{s.tipo_folha}</span>
                    ) : s.atipico ? (
                      <span className="shrink-0 text-[9px] px-1 py-0.5 rounded bg-warning/15 text-warning font-semibold">Atípico</span>
                    ) : null}
                  </div>
                  {s.cargo && <p className="text-[10px] text-muted-foreground truncate">{s.cargo}</p>}
                </div>
                <span className="text-xs font-bold text-foreground shrink-0">{formatCurrency(s.bruto)}</span>
              </div>
            ))}
          </div>
          {temAtipico && (
            <div className="mt-3 rounded-lg bg-warning/10 border border-warning/20 p-3">
              <p className="text-xs text-warning font-semibold flex items-center gap-1.5 mb-1">
                ⚠️ Atenção
              </p>
              <p className="text-xs text-foreground leading-relaxed">
                Valores marcados como <strong>"Atípico"</strong> ou <strong>"RESCISÃO"</strong> incluem rescisões contratuais, retroativos, férias acumuladas ou verbas indenizatórias — <strong>não representam o salário mensal regular</strong> do servidor.
              </p>
            </div>
          )}
          <p className="text-[10px] text-muted-foreground mt-2">
            Valores brutos do mês. Inclui folha normal e rescisões. Fonte: Portal de Transparência.
          </p>
        </div>
        );
      })()}

      {/* Card 3: Para onde vai seu dinheiro */}
      {despesasFuncao && despesasFuncao.length > 0 && (() => {
        const total = despesasFuncao.reduce((s, f) => s + f.valor, 0);
        const top8 = despesasFuncao.slice(0, 8);
        const outrosValor = despesasFuncao.slice(8).reduce((s, f) => s + f.valor, 0);
        return (
        <div className="stat-card">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <PieChart className="w-4 h-4 text-primary" />
              Para onde vai o dinheiro público?
            </h3>
            <ShareWhatsApp text={`Para onde vai o dinheiro público em Morrinhos?\n\n${top8.slice(0, 5).map((f) => `• ${f.name}: ${((f.valor / total) * 100).toFixed(1)}%`).join("\n")}\n\nTotal: ${formatCurrency(total)}`} />
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Distribuição das despesas empenhadas por área de atuação do governo municipal.
          </p>
          {/* Visual bar chart */}
          <div className="space-y-2">
            {top8.map((f, i) => {
              const pct = (f.valor / total) * 100;
              return (
                <div key={f.code} className="space-y-0.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-foreground font-medium">{f.name}</span>
                    <span className="text-muted-foreground">{formatCurrency(f.valor)} ({pct.toFixed(1)}%)</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                    <div className={`h-full rounded-full ${CORES_FUNCAO[i % CORES_FUNCAO.length]} transition-all duration-500`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
            {outrosValor > 0 && (
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Outros</span>
                <span>{formatCurrency(outrosValor)} ({((outrosValor / total) * 100).toFixed(1)}%)</span>
              </div>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">Fonte: DCA/SICONFI — Tesouro Nacional.</p>
        </div>
        );
      })()}

      {/* Card 4: Folha de pagamento total */}
      {folhaTotal && (() => {
        const mesRef = formatCompetencia(folhaTotal.competencia);
        return (
        <div className="stat-card">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Wallet className="w-4 h-4 text-accent" />
              Folha de pagamento mensal
            </h3>
            <ShareWhatsApp text={`Folha de pagamento de Morrinhos (${mesRef}):\n\n• Prefeitura: ${formatCurrency(folhaTotal.prefeitura.total)} (${folhaTotal.prefeitura.count} servidores)\n• Câmara: ${formatCurrency(folhaTotal.camara.total)} (${folhaTotal.camara.count} servidores)\n• Total: ${formatCurrency(folhaTotal.geral.total)} (${folhaTotal.geral.count} servidores)`} />
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Quanto o município gasta com salários em {mesRef}. Valores brutos (antes dos descontos).
          </p>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-primary/5 p-3 text-center">
              <p className="text-[10px] text-muted-foreground">Prefeitura</p>
              <p className="text-base font-bold text-primary">{formatCurrency(folhaTotal.prefeitura.total)}</p>
              <p className="text-[10px] text-muted-foreground">{folhaTotal.prefeitura.count} servidores</p>
            </div>
            <div className="rounded-lg bg-accent/5 p-3 text-center">
              <p className="text-[10px] text-muted-foreground">Câmara</p>
              <p className="text-base font-bold text-accent">{formatCurrency(folhaTotal.camara.total)}</p>
              <p className="text-[10px] text-muted-foreground">{folhaTotal.camara.count} servidores</p>
            </div>
            <div className="rounded-lg bg-muted p-3 text-center">
              <p className="text-[10px] text-muted-foreground">Total</p>
              <p className="text-base font-bold text-foreground">{formatCurrency(folhaTotal.geral.total)}</p>
              <p className="text-[10px] text-muted-foreground">{folhaTotal.geral.count} servidores</p>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">Competência: {mesRef}. Fonte: Portal de Transparência.</p>
        </div>
        );
      })()}

      {/* Card 5: Top 5 fornecedores */}
      {topFornecedores && topFornecedores.length > 0 && (() => {
        const totalForn = topFornecedores.reduce((s, f) => s + f.valor, 0);
        return (
        <div className="stat-card">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Building2 className="w-4 h-4 text-warning" />
              Maiores fornecedores da Prefeitura
            </h3>
            <ShareWhatsApp text={`As 5 empresas que mais recebem dinheiro da Prefeitura de Morrinhos:\n\n${topFornecedores.map((f, i) => `${i + 1}. ${f.nome} — ${formatCurrency(f.valor)} (${f.count} contratos)`).join("\n")}`} />
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Ranking das empresas com maior valor total em contratos ativos e encerrados com a Prefeitura.
          </p>
          <div className="space-y-2">
            {topFornecedores.map((f, i) => (
              <div key={f.nome} className="flex items-center gap-2">
                <span className={`w-5 text-right font-bold text-xs ${
                  i === 0 ? "text-yellow-500" : i === 1 ? "text-gray-400" : i === 2 ? "text-amber-600" : "text-muted-foreground"
                }`}>{i + 1}º</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{f.nome}</p>
                  <p className="text-[10px] text-muted-foreground">{f.count} contrato{f.count !== 1 ? "s" : ""}</p>
                </div>
                <span className="text-xs font-bold text-foreground shrink-0">{formatCurrency(f.valor)}</span>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">Soma de todos os contratos. Fonte: Portal de Transparência.</p>
        </div>
        );
      })()}

      {/* Card 6: Comparativo com cidades vizinhas */}
      {comparativo && (() => {
        const acima = comparativo.morrinhos_per_capita > comparativo.media_go_per_capita;
        const pctDiff = Math.abs(((comparativo.morrinhos_per_capita - comparativo.media_go_per_capita) / comparativo.media_go_per_capita) * 100).toFixed(0);
        return (
        <div className="stat-card">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-accent" />
              Arrecadação própria: Morrinhos vs cidades similares
            </h3>
            <ShareWhatsApp text={`Morrinhos arrecada ${formatCurrency(comparativo.morrinhos_per_capita)} per capita em receita própria (${comparativo.ano}), ${pctDiff}% ${acima ? "acima" : "abaixo"} da média de ${comparativo.municipios_amostra} cidades goianas de porte similar (${formatCurrency(comparativo.media_go_per_capita)}).`} />
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Quanto o município arrecada por habitante com impostos próprios (IPTU, ISS, taxas), comparado com a média de {comparativo.municipios_amostra} cidades goianas de porte similar. Ano referência: {comparativo.ano}.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-primary/5 p-3 text-center">
              <p className="text-[10px] text-muted-foreground">Morrinhos</p>
              <p className="text-lg font-bold text-primary">{formatCurrency(comparativo.morrinhos_per_capita)}</p>
              <p className="text-[10px] text-muted-foreground">por habitante/ano</p>
            </div>
            <div className="rounded-lg bg-muted p-3 text-center">
              <p className="text-[10px] text-muted-foreground">Média GO ({comparativo.municipios_amostra} cidades)</p>
              <p className="text-lg font-bold text-foreground">{formatCurrency(comparativo.media_go_per_capita)}</p>
              <p className="text-[10px] text-muted-foreground">por habitante</p>
            </div>
          </div>
          <div className="mt-3">
            <div className="h-3 rounded-full bg-muted overflow-hidden relative">
              <div className="absolute h-full bg-primary/30 rounded-full" style={{ width: "100%" }} />
              <div className="absolute h-full bg-primary rounded-full" style={{ width: `${Math.min((comparativo.morrinhos_per_capita / Math.max(comparativo.morrinhos_per_capita, comparativo.media_go_per_capita)) * 100, 100)}%` }} />
            </div>
            <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
              <span>Morrinhos: {formatCurrency(comparativo.morrinhos_per_capita)}</span>
              <span>Média: {formatCurrency(comparativo.media_go_per_capita)}</span>
            </div>
          </div>
          <div className={`mt-4 text-center rounded-xl py-3 px-4 ${acima ? "bg-emerald-500/10 ring-1 ring-emerald-500/30" : "bg-amber-500/10 ring-1 ring-amber-500/30"}`}>
            <p className={`text-xl md:text-2xl font-extrabold leading-tight ${acima ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
              Morrinhos arrecada{" "}
              <span className="text-2xl md:text-3xl">{pctDiff}%</span>
              {" "}{acima ? "a mais" : "a menos"}
            </p>
            <p className="text-xs md:text-sm text-muted-foreground mt-1">
              que a média das {comparativo.municipios_amostra} cidades goianas comparáveis
            </p>
          </div>
          {comparativo.municipios_nomes && (
            <p className="text-[10px] text-muted-foreground mt-2">
              Cidades comparadas: {(comparativo.municipios_nomes as string[]).slice(0, 5).join(", ")}
              {(comparativo.municipios_nomes as string[]).length > 5 ? ` e mais ${(comparativo.municipios_nomes as string[]).length - 5}` : ""}.
              Fonte: SICONFI/DCA — Tesouro Nacional.
            </p>
          )}
        </div>
        );
      })()}
    </div>
  );
}

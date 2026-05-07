"use client";

// src/components/prefeitura/VeiculosTab.tsx
//
// Subaba "Veículos" dentro da aba "Prefeitura" do Morrinhos.ai
//
// COMO INTEGRAR:
// No componente pai (PrefeituraTab.tsx ou similar), adicione esta aba
// no array de abas internas, ex:
//
//   import VeiculosTab from "./VeiculosTab";
//   { id: "veiculos", label: "Veículos", icon: <Truck />, component: <VeiculosTab /> }
//
// PRÉ-REQUISITO: rodar a Edge Function sync-frota-veiculos ao menos uma vez
// para popular a tabela veiculos_frota no Supabase.

import { useState, useEffect, useMemo } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
const supabase = createBrowserSupabaseClient();
import {
  Truck,
  Car,
  Bike,
  Tractor,
  Search,
  Filter,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Wrench,
  Trash2,
  ChevronUp,
  ChevronDown,
  ExternalLink,
  Fuel,
} from "lucide-react";

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface Veiculo {
  id: string;
  placa: string;
  descricao: string;
  marca: string;
  ano_fabricacao: string | null;
  ano_modelo: string | null;
  combustivel: string;
  situacao: "ativo" | "manutencao" | "sucata" | string;
  orgao: string;
  categoria: string;
  fonte_url: string;
  atualizado_em: string;
}

type SortField = keyof Veiculo;
type SortDir = "asc" | "desc";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const SITUACAO_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; icon: React.ReactNode }
> = {
  ativo: {
    label: "Ativo",
    color: "text-emerald-700",
    bg: "bg-emerald-50 border-emerald-200",
    icon: <CheckCircle className="w-3.5 h-3.5" />,
  },
  manutencao: {
    label: "Em Manutenção",
    color: "text-amber-700",
    bg: "bg-amber-50 border-amber-200",
    icon: <Wrench className="w-3.5 h-3.5" />,
  },
  sucata: {
    label: "Sucata",
    color: "text-red-700",
    bg: "bg-red-50 border-red-200",
    icon: <Trash2 className="w-3.5 h-3.5" />,
  },
};

const CATEGORIA_ICONE: Record<string, React.ReactNode> = {
  Caminhão: <Truck className="w-4 h-4" />,
  "Micro-ônibus": <Truck className="w-4 h-4" />,
  Ônibus: <Truck className="w-4 h-4" />,
  "Van/Furgão": <Truck className="w-4 h-4" />,
  Motocicleta: <Bike className="w-4 h-4" />,
  Trator: <Tractor className="w-4 h-4" />,
  "Trator Agrícola": <Tractor className="w-4 h-4" />,
  Retroescavadeira: <Tractor className="w-4 h-4" />,
  Escavadeira: <Tractor className="w-4 h-4" />,
  "Pá Carregadeira": <Tractor className="w-4 h-4" />,
  Motoniveladora: <Tractor className="w-4 h-4" />,
  "Rolo Compactador": <Tractor className="w-4 h-4" />,
  "Máquina Agrícola": <Tractor className="w-4 h-4" />,
};

function getIconeCategoria(categoria: string) {
  return CATEGORIA_ICONE[categoria] ?? <Car className="w-4 h-4" />;
}

function formatarPlaca(placa: string) {
  // Mercosul: AAA0A00 → AAA0A00 (já formatado)
  // Antigo: AAA0000 → AAA-0000
  if (/^[A-Z]{3}[0-9]{4}$/.test(placa)) {
    return `${placa.slice(0, 3)}-${placa.slice(3)}`;
  }
  return placa;
}

// ─── Componente principal ────────────────────────────────────────────────────

export default function VeiculosTab() {
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<string | null>(null);
  const [combustivelInfo, setCombustivelInfo] = useState<{
    totalContratos: number;
    mediaPorVeiculo: number;
    anoReferencia: number;
    fornecedor: string;
  } | null>(null);

  // Filtros
  const [busca, setBusca] = useState("");
  const [situacaoFiltro, setSituacaoFiltro] = useState<string>("todos");
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>("todas");
  const [orgaoFiltro, setOrgaoFiltro] = useState<string>("todos");

  // Ordenação
  const [sortField, setSortField] = useState<SortField>("categoria");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // Paginação
  const [pagina, setPagina] = useState(1);
  const POR_PAGINA = 20;

  // ── Carregamento ──────────────────────────────────────────────────────────

  async function carregarVeiculos() {
    setLoading(true);
    setErro(null);
    try {
      const { data, error } = await supabase
        .from("veiculos_frota")
        .select("*")
        .order("categoria", { ascending: true });

      if (error) throw error;
      setVeiculos(data || []);

      if (data && data.length > 0) {
        const mais_recente = data.reduce((a, b) =>
          a.atualizado_em > b.atualizado_em ? a : b
        );
        setUltimaAtualizacao(mais_recente.atualizado_em);
        const ativos = data.filter((v: Veiculo) => v.situacao === "ativo").length;
        carregarCombustivel(ativos > 0 ? ativos : data.length);
      }
    } catch (e: unknown) {
      setErro("Não foi possível carregar os dados da frota.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function carregarCombustivel(totalVeiculos: number) {
    try {
      const anoAtual = new Date().getFullYear();
      // Buscar contratos de combustível do ano atual e anterior
      const { data: contratos } = await supabase
        .from("contratos")
        .select("empresa, valor, vigencia_inicio, objeto")
        .or(
          `objeto.ilike.%fornecimento de combust%,empresa.ilike.%posto%`
        )
        .gte("vigencia_inicio", `${anoAtual - 1}-01-01`)
        .order("vigencia_inicio", { ascending: false });

      if (!contratos?.length || totalVeiculos === 0) return;

      // Agrupar por ano de vigência
      const porAno: Record<number, { total: number; fornecedores: Set<string> }> = {};
      for (const c of contratos) {
        if (!c.valor || c.valor <= 0) continue;
        // Filtrar apenas contratos que realmente são de combustível
        const obj = (c.objeto || "").toLowerCase();
        const emp = (c.empresa || "").toLowerCase();
        const ehCombustivel = obj.includes("combust") || emp.includes("posto");
        // Excluir contratos de compra de veículo que mencionam combustível
        const ehVeiculo = obj.includes("veículo automotor") || obj.includes("veiculo automotor");
        if (!ehCombustivel || ehVeiculo) continue;

        const ano = new Date(c.vigencia_inicio!).getFullYear();
        if (!porAno[ano]) porAno[ano] = { total: 0, fornecedores: new Set() };
        porAno[ano].total += Number(c.valor);
        if (c.empresa) porAno[ano].fornecedores.add(c.empresa);
      }

      // Pegar o ano mais recente com dados
      const anosDisponiveis = Object.keys(porAno).map(Number).sort((a, b) => b - a);
      if (anosDisponiveis.length === 0) return;

      const anoRef = anosDisponiveis[0];
      const dados = porAno[anoRef];
      const media = dados.total / totalVeiculos;
      const fornecedor = [...dados.fornecedores].join(", ");

      setCombustivelInfo({
        totalContratos: dados.total,
        mediaPorVeiculo: media,
        anoReferencia: anoRef,
        fornecedor,
      });
    } catch (e) {
      console.error("Erro ao carregar dados de combustível:", e);
    }
  }

  useEffect(() => {
    carregarVeiculos();
  }, []);

  // ── Dados derivados ───────────────────────────────────────────────────────

  const categorias = useMemo(
    () => ["todas", ...Array.from(new Set(veiculos.map((v) => v.categoria))).sort()],
    [veiculos]
  );

  const orgaos = useMemo(
    () => ["todos", ...Array.from(new Set(veiculos.map((v) => v.orgao))).sort()],
    [veiculos]
  );

  const stats = useMemo(() => {
    const ativos = veiculos.filter((v) => v.situacao === "ativo").length;
    const manutencao = veiculos.filter((v) => v.situacao === "manutencao").length;
    const sucata = veiculos.filter((v) => v.situacao === "sucata").length;
    const porCategoria: Record<string, number> = {};
    veiculos.forEach((v) => {
      porCategoria[v.categoria] = (porCategoria[v.categoria] || 0) + 1;
    });
    return { total: veiculos.length, ativos, manutencao, sucata, porCategoria };
  }, [veiculos]);

  const veiculosFiltrados = useMemo(() => {
    let lista = [...veiculos];

    if (busca.trim()) {
      const termo = busca.toLowerCase();
      lista = lista.filter(
        (v) =>
          v.placa.toLowerCase().includes(termo) ||
          v.descricao.toLowerCase().includes(termo) ||
          v.marca.toLowerCase().includes(termo) ||
          v.categoria.toLowerCase().includes(termo) ||
          v.orgao.toLowerCase().includes(termo)
      );
    }

    if (situacaoFiltro !== "todos") {
      lista = lista.filter((v) => v.situacao === situacaoFiltro);
    }

    if (categoriaFiltro !== "todas") {
      lista = lista.filter((v) => v.categoria === categoriaFiltro);
    }

    if (orgaoFiltro !== "todos") {
      lista = lista.filter((v) => v.orgao === orgaoFiltro);
    }

    lista.sort((a, b) => {
      const va = String(a[sortField] ?? "").toLowerCase();
      const vb = String(b[sortField] ?? "").toLowerCase();
      return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
    });

    return lista;
  }, [veiculos, busca, situacaoFiltro, categoriaFiltro, orgaoFiltro, sortField, sortDir]);

  const totalPaginas = Math.ceil(veiculosFiltrados.length / POR_PAGINA);
  const veiculosPagina = veiculosFiltrados.slice(
    (pagina - 1) * POR_PAGINA,
    pagina * POR_PAGINA
  );

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
    setPagina(1);
  }

  function resetFiltros() {
    setBusca("");
    setSituacaoFiltro("todos");
    setCategoriaFiltro("todas");
    setOrgaoFiltro("todos");
    setPagina(1);
  }

  // ── Renderização ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-gray-400">
        <RefreshCw className="w-8 h-8 animate-spin" />
        <p className="text-sm">Carregando frota municipal...</p>
      </div>
    );
  }

  if (erro) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-red-500">
        <AlertTriangle className="w-8 h-8" />
        <p className="text-sm">{erro}</p>
        <button
          onClick={carregarVeiculos}
          className="text-xs underline text-gray-500 hover:text-gray-700"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  if (veiculos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-gray-400">
        <Truck className="w-10 h-10" />
        <p className="text-sm font-medium">Nenhum veículo encontrado</p>
        <p className="text-xs text-center max-w-xs">
          Os dados ainda não foram sincronizados. Execute a Edge Function{" "}
          <code className="bg-gray-100 px-1 rounded">sync-frota-veiculos</code> para
          popular esta aba.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* ── Cabeçalho ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Truck className="w-5 h-5 text-blue-600" />
            Frota Municipal
          </h2>
          {ultimaAtualizacao && (
            <p className="text-xs text-gray-400 mt-0.5">
              Atualizado em{" "}
              {new Date(ultimaAtualizacao).toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              })}
              {" · "}
              <a
                href="https://morrinhos.centi.com.br/transparencia/veiculos"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-blue-600 inline-flex items-center gap-1"
              >
                Portal de Transparência
                <ExternalLink className="w-3 h-3" />
              </a>
            </p>
          )}
        </div>
        <button
          onClick={carregarVeiculos}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 border border-gray-200 rounded-lg px-3 py-1.5 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Atualizar
        </button>
      </div>

      {/* ── Cards de resumo ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total", valor: stats.total, cor: "text-gray-900", bg: "bg-gray-50" },
          { label: "Ativos", valor: stats.ativos, cor: "text-emerald-700", bg: "bg-emerald-50" },
          { label: "Manutenção", valor: stats.manutencao, cor: "text-amber-700", bg: "bg-amber-50" },
          { label: "Sucata", valor: stats.sucata, cor: "text-red-700", bg: "bg-red-50" },
        ].map((item) => (
          <div
            key={item.label}
            className={`${item.bg} rounded-xl p-4 border border-gray-100`}
          >
            <p className="text-xs text-gray-500 mb-1">{item.label}</p>
            <p className={`text-2xl font-bold ${item.cor}`}>{item.valor}</p>
          </div>
        ))}
      </div>

      {/* ── Card de combustível ── */}
      {combustivelInfo && (
        <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl p-4 border border-orange-200">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Fuel className="w-5 h-5 text-orange-600" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-medium text-orange-800 uppercase tracking-wide mb-1">
                Custo médio de combustível por veículo ({combustivelInfo.anoReferencia})
              </p>
              <p className="text-2xl font-bold text-orange-700">
                {combustivelInfo.mediaPorVeiculo.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                  maximumFractionDigits: 0,
                })}
              </p>
              <p className="text-xs text-orange-600 mt-1.5">
                Total contratado:{" "}
                <span className="font-semibold">
                  {combustivelInfo.totalContratos.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                    maximumFractionDigits: 0,
                  })}
                </span>
                {" ÷ "}{stats.ativos} veículos ativos
              </p>
              <p className="text-[10px] text-orange-500 mt-1">
                Fornecedor: {combustivelInfo.fornecedor} · Valor contratual (pode diferir do gasto efetivo)
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Distribuição por categoria ── */}
      <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
        <p className="text-xs font-medium text-gray-500 mb-3 uppercase tracking-wide">
          Por tipo de veículo
        </p>
        <div className="flex flex-wrap gap-2">
          {Object.entries(stats.porCategoria)
            .sort((a, b) => b[1] - a[1])
            .map(([cat, qtd]) => (
              <button
                key={cat}
                onClick={() => {
                  setCategoriaFiltro(cat === categoriaFiltro ? "todas" : cat);
                  setPagina(1);
                }}
                className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  categoriaFiltro === cat
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"
                }`}
              >
                {getIconeCategoria(cat)}
                {cat}
                <span
                  className={`font-semibold ${
                    categoriaFiltro === cat ? "text-blue-100" : "text-gray-400"
                  }`}
                >
                  {qtd}
                </span>
              </button>
            ))}
        </div>
      </div>

      {/* ── Filtros ── */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por placa, descrição, marca..."
            value={busca}
            onChange={(e) => { setBusca(e.target.value); setPagina(1); }}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
        </div>

        <select
          value={situacaoFiltro}
          onChange={(e) => { setSituacaoFiltro(e.target.value); setPagina(1); }}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="todos">Todas as situações</option>
          <option value="ativo">Ativo</option>
          <option value="manutencao">Em Manutenção</option>
          <option value="sucata">Sucata</option>
        </select>

        <select
          value={orgaoFiltro}
          onChange={(e) => { setOrgaoFiltro(e.target.value); setPagina(1); }}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 max-w-[200px]"
        >
          {orgaos.map((o) => (
            <option key={o} value={o}>
              {o === "todos" ? "Todos os órgãos" : o}
            </option>
          ))}
        </select>

        {(busca || situacaoFiltro !== "todos" || categoriaFiltro !== "todas" || orgaoFiltro !== "todos") && (
          <button
            onClick={resetFiltros}
            className="text-xs text-gray-500 hover:text-gray-800 flex items-center gap-1 px-2 py-2"
          >
            <Filter className="w-3.5 h-3.5" />
            Limpar filtros
          </button>
        )}
      </div>

      {/* ── Contagem resultado ── */}
      <p className="text-xs text-gray-400">
        {veiculosFiltrados.length} veículo{veiculosFiltrados.length !== 1 ? "s" : ""} encontrado
        {veiculosFiltrados.length !== 1 ? "s" : ""}
        {veiculosFiltrados.length !== veiculos.length && ` de ${veiculos.length} no total`}
      </p>

      {/* ── Tabela ── */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
              {(
                [
                  { field: "placa", label: "Placa" },
                  { field: "categoria", label: "Tipo" },
                  { field: "descricao", label: "Descrição" },
                  { field: "marca", label: "Marca" },
                  { field: "ano_modelo", label: "Ano" },
                  { field: "combustivel", label: "Combustível" },
                  { field: "orgao", label: "Órgão" },
                  { field: "situacao", label: "Situação" },
                ] as { field: SortField; label: string }[]
              ).map(({ field, label }) => (
                <th
                  key={field}
                  onClick={() => toggleSort(field)}
                  className="px-4 py-3 text-left cursor-pointer select-none hover:text-gray-800 whitespace-nowrap"
                >
                  <span className="inline-flex items-center gap-1">
                    {label}
                    {sortField === field ? (
                      sortDir === "asc" ? (
                        <ChevronUp className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      )
                    ) : (
                      <ChevronUp className="w-3 h-3 opacity-20" />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {veiculosPagina.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-gray-400 text-sm">
                  Nenhum veículo corresponde aos filtros selecionados.
                </td>
              </tr>
            ) : (
              veiculosPagina.map((v) => {
                const sit = SITUACAO_CONFIG[v.situacao] ?? SITUACAO_CONFIG["ativo"];
                return (
                  <tr
                    key={v.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3 font-mono font-semibold text-gray-900 whitespace-nowrap">
                      {formatarPlaca(v.placa)}
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5">
                        {getIconeCategoria(v.categoria)}
                        {v.categoria}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700 max-w-[240px] truncate">
                      {v.descricao || "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {v.marca || "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {v.ano_fabricacao && v.ano_modelo
                        ? v.ano_fabricacao === v.ano_modelo
                          ? v.ano_fabricacao
                          : `${v.ano_fabricacao}/${v.ano_modelo}`
                        : v.ano_modelo || v.ano_fabricacao || "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {v.combustivel || "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs max-w-[160px] truncate">
                      {v.orgao || "—"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border font-medium ${sit.bg} ${sit.color}`}
                      >
                        {sit.icon}
                        {sit.label}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── Paginação ── */}
      {totalPaginas > 1 && (
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>
            Página {pagina} de {totalPaginas}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setPagina((p) => Math.max(1, p - 1))}
              disabled={pagina === 1}
              className="px-3 py-1.5 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
            >
              Anterior
            </button>
            {Array.from({ length: Math.min(5, totalPaginas) }, (_, i) => {
              let num: number;
              if (totalPaginas <= 5) {
                num = i + 1;
              } else if (pagina <= 3) {
                num = i + 1;
              } else if (pagina >= totalPaginas - 2) {
                num = totalPaginas - 4 + i;
              } else {
                num = pagina - 2 + i;
              }
              return (
                <button
                  key={num}
                  onClick={() => setPagina(num)}
                  className={`px-3 py-1.5 border rounded-lg transition-colors ${
                    pagina === num
                      ? "bg-blue-600 text-white border-blue-600"
                      : "border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  {num}
                </button>
              );
            })}
            <button
              onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
              disabled={pagina === totalPaginas}
              className="px-3 py-1.5 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
            >
              Próxima
            </button>
          </div>
        </div>
      )}

      {/* ── Rodapé ── */}
      <p className="text-xs text-gray-400 text-center pt-2">
        Dados públicos extraídos do{" "}
        <a
          href="https://morrinhos.centi.com.br/transparencia/veiculos"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-blue-600"
        >
          Portal de Transparência de Morrinhos
        </a>
        {" · "}Atualização automática toda segunda-feira.
      </p>
    </div>
  );
}

"use client";

import { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
const supabase = createBrowserSupabaseClient();
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Trash2, Eye, Flag, CheckCircle2, XCircle, Package, Clock,
  Search, ShoppingBag, Pencil, Save, X, Loader2, ImagePlus,
  Home as HomeIcon, Car, Wheat, Smartphone, Wrench,
} from "lucide-react";
import { toast } from "sonner";

type Classificado = {
  id: string;
  nome: string;
  whatsapp: string;
  categoria: string;
  titulo: string;
  descricao: string | null;
  preco: number | null;
  preco_tipo: string;
  fotos: string[];
  status: string;
  denuncias: number;
  visualizacoes: number;
  expira_em: string;
  created_at: string;
  updated_at: string;
  user_id: string | null;
  bairro: string | null;
};

const CATEGORIAS = [
  { value: "imoveis", label: "Imóveis", icon: HomeIcon },
  { value: "veiculos", label: "Veículos", icon: Car },
  { value: "agro", label: "Agro", icon: Wheat },
  { value: "eletronicos", label: "Eletrônicos", icon: Smartphone },
  { value: "servicos", label: "Serviços", icon: Wrench },
  { value: "outros", label: "Outros", icon: Package },
];

const PRECO_TIPOS = [
  { value: "fixo", label: "Fixo" },
  { value: "negociavel", label: "Negociável" },
  { value: "gratuito", label: "Gratuito" },
];

const STATUS_COLORS: Record<string, string> = {
  ativo: "bg-green-500/15 text-green-700 dark:text-green-400",
  vendido: "bg-blue-500/15 text-blue-600",
  denunciado: "bg-destructive/15 text-destructive",
  removido: "bg-muted text-muted-foreground",
  expirado: "bg-orange-500/15 text-orange-600",
};

const STATUS_LABEL: Record<string, string> = {
  ativo: "Ativo",
  vendido: "Vendido",
  denunciado: "Em análise",
  removido: "Removido",
  expirado: "Expirado",
};

function formatPreco(preco: number | null, tipo: string) {
  if (tipo === "gratuito") return "Gratuito";
  if (!preco) return "Consulte";
  const formatted = preco.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  return tipo === "negociavel" ? `${formatted} (negociável)` : formatted;
}

function formatPrecoInput(raw: string) {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  const num = parseInt(digits) / 100;
  return num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function parsePrecoInput(raw: string) {
  const cleaned = raw.replace(/[^\d,.]/g, "");
  if (!cleaned) return null;
  const lastSep = Math.max(cleaned.lastIndexOf(","), cleaned.lastIndexOf("."));
  let normalized: string;
  if (lastSep >= 0 && cleaned.length - lastSep <= 3) {
    const intPart = cleaned.substring(0, lastSep).replace(/\D/g, "") || "0";
    const decPart = cleaned.substring(lastSep + 1).replace(/\D/g, "").substring(0, 2);
    normalized = decPart ? `${intPart}.${decPart}` : intPart;
  } else {
    normalized = cleaned.replace(/\D/g, "");
  }
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

// ===== EDIT FORM =====

function AdminEditForm({
  item,
  onClose,
  onSaved,
  adminToken,
}: {
  item: Classificado;
  onClose: () => void;
  onSaved: () => void;
  adminToken: string;
}) {
  const [titulo, setTitulo] = useState(item.titulo);
  const [descricao, setDescricao] = useState(item.descricao || "");
  const [categoria, setCategoria] = useState(item.categoria);
  const [preco, setPreco] = useState(
    item.preco ? item.preco.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ""
  );
  const [precoTipo, setPrecoTipo] = useState(item.preco_tipo);
  const [bairro, setBairro] = useState(item.bairro || "");
  const [nome, setNome] = useState(item.nome);
  const [whatsapp, setWhatsapp] = useState(item.whatsapp);
  const [fotos, setFotos] = useState<string[]>(item.fotos);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const removeExistingFoto = (idx: number) => {
    setFotos((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    if (!titulo.trim()) return toast.error("Título é obrigatório");
    setSaving(true);
    try {
      const updates = {
        titulo: titulo.trim(),
        descricao: descricao.trim() || null,
        categoria,
        preco: precoTipo === "gratuito" ? 0 : parsePrecoInput(preco),
        preco_tipo: precoTipo,
        bairro: bairro.trim() || null,
        nome: nome.trim(),
        whatsapp: whatsapp.replace(/\D/g, ""),
        fotos,
      };
      const { data, error } = await supabase.functions.invoke("admin-classificados", {
        body: { action: "update", id: item.id, updates, admin_token: adminToken },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Anúncio atualizado pelo admin!");
      onSaved();
      onClose();
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="stat-card border-primary/40 space-y-3 mt-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-foreground flex items-center gap-1.5">
          <Pencil className="w-4 h-4 text-primary" /> Editando anúncio
        </p>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <p className="text-xs text-muted-foreground mb-1">Título</p>
          <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} />
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Bairro</p>
          <Input value={bairro} onChange={(e) => setBairro(e.target.value)} placeholder="Ex: Centro" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <p className="text-xs text-muted-foreground mb-1">Nome do anunciante</p>
          <Input value={nome} onChange={(e) => setNome(e.target.value)} />
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">WhatsApp</p>
          <Input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
        </div>
      </div>

      <div>
        <p className="text-xs text-muted-foreground mb-1">Descrição</p>
        <textarea
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 min-h-[60px] resize-y"
        />
      </div>

      <div>
        <p className="text-xs text-muted-foreground mb-1">Categoria</p>
        <div className="flex flex-wrap gap-1">
          {CATEGORIAS.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setCategoria(cat.value)}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-colors border ${
                categoria === cat.value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-muted-foreground border-border hover:border-primary/50"
              }`}
            >
              <cat.icon className="w-3 h-3" /> {cat.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <p className="text-xs text-muted-foreground mb-1">Tipo de preço</p>
          <div className="flex gap-1">
            {PRECO_TIPOS.map((t) => (
              <button
                key={t.value}
                onClick={() => setPrecoTipo(t.value)}
                className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors border ${
                  precoTipo === t.value
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-muted-foreground border-border hover:border-primary/50"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
        {precoTipo !== "gratuito" && (
          <div>
            <p className="text-xs text-muted-foreground mb-1">Preço</p>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
              <Input
                placeholder="0,00"
                value={preco}
                onChange={(e) => setPreco(formatPrecoInput(e.target.value))}
                type="text"
                inputMode="numeric"
                className="pl-10"
              />
            </div>
          </div>
        )}
      </div>

      {/* Fotos */}
      <div>
        <p className="text-xs text-muted-foreground mb-1">Fotos ({fotos.length})</p>
        <div className="flex gap-2 flex-wrap">
          {fotos.map((url, i) => (
            <div key={i} className="relative w-20 h-16 rounded-lg overflow-hidden border">
              <img src={url} alt="" className="w-full h-full object-cover" />
              <button
                onClick={() => removeExistingFoto(i)}
                className="absolute top-0.5 right-0.5 bg-destructive/90 text-white rounded-full p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <Button onClick={handleSave} disabled={saving} size="sm" className="gap-1.5">
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          {saving ? "Salvando..." : "Salvar"}
        </Button>
        <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}

// ===== MAIN =====

export default function ClassificadosAdmin({ adminToken }: { adminToken: string }) {
  const queryClient = useQueryClient();
  const [busca, setBusca] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["classificados-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("classificados")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as Classificado[];
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["classificados-admin"] });
    queryClient.invalidateQueries({ queryKey: ["classificados"] });
  };

  const adminInvoke = async (action: string, id: string, updates?: Record<string, any>) => {
    // Token vai no BODY (admin_token), nao em Authorization header. O Supabase JS
    // injeta automaticamente o anon key em Authorization e sobrescreve qualquer
    // valor passado em headers — entao a edge function recebia anon key, calculava
    // hash diferente do token admin e retornava 401. Mesmo padrao dos outros
    // endpoints admin (admin-zap-update, admin-zap-read).
    const { data, error } = await supabase.functions.invoke("admin-classificados", {
      body: { action, id, updates, admin_token: adminToken },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data;
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      const updates: Record<string, any> = { status };
      if (status === "ativo") updates.denuncias = 0;
      await adminInvoke("update", id, updates);
      toast.success(`Status atualizado para "${STATUS_LABEL[status] || status}"`);
      invalidate();
    } catch (e: any) {
      toast.error(e.message || "Erro ao atualizar status");
    }
  };

  const handleDelete = async (item: Classificado) => {
    if (!confirm(`Excluir "${item.titulo}" de ${item.nome}?`)) return;
    try {
      await adminInvoke("delete", item.id);
      toast.success("Anúncio excluído");
      invalidate();
    } catch (e: any) {
      toast.error(e.message || "Erro ao excluir");
    }
  };

  if (isLoading) return <div className="animate-pulse h-40" />;

  const items = data || [];
  const denunciados = items.filter((i) => i.denuncias > 0 && i.status !== "removido");
  const ativos = items.filter((i) => i.status === "ativo");
  const vendidos = items.filter((i) => i.status === "vendido");
  const totalViews = items.reduce((sum, i) => sum + i.visualizacoes, 0);
  const totalWaClicks = items.reduce((sum, i) => sum + ((i as any).whatsapp_clicks || 0), 0);

  const filtered = busca.trim()
    ? items.filter(
        (i) =>
          i.titulo.toLowerCase().includes(busca.toLowerCase()) ||
          i.nome.toLowerCase().includes(busca.toLowerCase()) ||
          i.bairro?.toLowerCase().includes(busca.toLowerCase())
      )
    : items;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-5 gap-2 text-center">
        <div className="stat-card py-2">
          <p className="text-lg font-bold text-foreground">{items.length}</p>
          <p className="text-[10px] text-muted-foreground">Total</p>
        </div>
        <div className="stat-card py-2">
          <p className="text-lg font-bold text-green-600">{ativos.length}</p>
          <p className="text-[10px] text-muted-foreground">Ativos</p>
        </div>
        <div className="stat-card py-2">
          <p className="text-lg font-bold text-blue-500">{vendidos.length}</p>
          <p className="text-[10px] text-muted-foreground">Vendidos</p>
        </div>
        <div className="stat-card py-2">
          <p className="text-lg font-bold text-foreground">{totalViews}</p>
          <p className="text-[10px] text-muted-foreground">Views</p>
        </div>
        <div className="stat-card py-2">
          <p className="text-lg font-bold text-[#25D366]">{totalWaClicks}</p>
          <p className="text-[10px] text-muted-foreground">WhatsApp</p>
        </div>
      </div>

      {denunciados.length > 0 && (
        <div className="bg-destructive/5 border border-destructive/20 rounded-lg px-3 py-1.5 text-xs text-destructive font-medium">
          ⚠️ {denunciados.length} anúncio(s) com denúncias pendentes
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Buscar por título, nome ou bairro..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="w-full pl-9 pr-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      {/* Denunciados primeiro */}
      {denunciados.length > 0 && !busca && (
        <div className="stat-card border-destructive/30 space-y-2">
          <p className="text-sm font-semibold text-destructive flex items-center gap-1">
            <Flag className="w-4 h-4" /> Anúncios denunciados ({denunciados.length})
          </p>
          <div className="space-y-2">
            {denunciados.map((item) => (
              <div key={item.id} className="flex items-start gap-3 p-2 rounded-lg bg-destructive/5">
                {item.fotos[0] && (
                  <img src={item.fotos[0]} className="w-16 h-12 rounded object-cover shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{item.titulo}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.nome} · {item.denuncias} denúncia(s)
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => updateStatus(item.id, "ativo")}>
                    <CheckCircle2 className="w-3 h-3 mr-0.5" /> Restaurar
                  </Button>
                  <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => updateStatus(item.id, "removido")}>
                    <XCircle className="w-3 h-3 mr-0.5" /> Remover
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All items */}
      <div className="space-y-2">
        {filtered.map((item) => (
          <div key={item.id}>
            <div
              className={`rounded-xl border-2 overflow-hidden ${
                item.status !== "ativo" && item.status !== "vendido" ? "opacity-60" : ""
              } ${item.denuncias > 0 ? "border-destructive/30" : "border-border"}`}
            >
              {/* Info row */}
              <div className="flex items-start gap-3 p-3">
                {item.fotos[0] ? (
                  <img src={item.fotos[0]} alt="" className="w-20 h-16 rounded-lg object-cover shrink-0" />
                ) : (
                  <div className="w-20 h-16 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <Package className="w-5 h-5 text-muted-foreground/30" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-foreground truncate">{item.titulo}</p>
                    <Badge className={`text-[10px] font-semibold ${STATUS_COLORS[item.status] || "bg-muted"}`}>
                      {STATUS_LABEL[item.status] || item.status}
                    </Badge>
                    {item.denuncias > 0 && (
                      <Badge variant="destructive" className="text-[10px]">
                        <Flag className="w-2.5 h-2.5 mr-0.5" /> {item.denuncias}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {item.nome} · {item.whatsapp} · {item.categoria}{item.bairro ? ` · ${item.bairro}` : ""}
                  </p>
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-0.5">
                    <span className="flex items-center gap-0.5">
                      <Eye className="w-3 h-3" /> {item.visualizacoes}
                    </span>
                    <span className="flex items-center gap-0.5">
                      <Clock className="w-3 h-3" /> {new Date(item.created_at).toLocaleDateString("pt-BR")}
                    </span>
                    {item.preco ? (
                      <span className="font-medium text-foreground">{formatPreco(item.preco, item.preco_tipo)}</span>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* Action bar */}
              <div className="flex items-center gap-0 border-t bg-muted/30">
                <button
                  onClick={() => setEditingId(editingId === item.id ? null : item.id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors ${
                    editingId === item.id
                      ? "bg-primary/10 text-primary"
                      : "text-foreground hover:bg-primary/10 hover:text-primary"
                  }`}
                >
                  <Pencil className="w-3.5 h-3.5" /> Editar
                </button>
                <div className="w-px h-5 bg-border" />
                {item.status === "ativo" && (
                  <>
                    <button
                      onClick={() => updateStatus(item.id, "removido")}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-500/10 transition-colors"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Remover
                    </button>
                    <div className="w-px h-5 bg-border" />
                  </>
                )}
                {(item.status === "vendido" || item.status === "removido") && (
                  <>
                    <button
                      onClick={() => updateStatus(item.id, "ativo")}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-green-600 hover:bg-green-50 dark:hover:bg-green-500/10 transition-colors"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Reativar
                    </button>
                    <div className="w-px h-5 bg-border" />
                  </>
                )}
                <button
                  onClick={() => handleDelete(item)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Excluir
                </button>
              </div>
            </div>

            {/* Edit form */}
            {editingId === item.id && (
              <AdminEditForm
                item={item}
                onClose={() => setEditingId(null)}
                onSaved={invalidate}
                adminToken={adminToken}
              />
            )}
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-8">
          Nenhum anúncio encontrado.
        </p>
      )}
    </div>
  );
}

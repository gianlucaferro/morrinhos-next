"use client";

import { useState, useMemo, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
const supabase = createBrowserSupabaseClient();
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, X, RotateCcw, ExternalLink, Pencil, Save, Search, MousePointerClick, MessageSquare, Loader2, Download, Pill, Megaphone, Package, Activity } from "lucide-react";
import FarmaciaFotosAdmin from "@/components/admin/FarmaciaFotosAdmin";
import AnunciosAdmin from "@/components/admin/AnunciosAdmin";
import ClassificadosAdmin from "@/components/admin/ClassificadosAdmin";
import SyncStatusAdmin from "@/components/admin/SyncStatusAdmin";

const SESSION_KEY = "pba_admin_token";

const CATEGORIES = [
  "Alimentação", "Saúde", "Beleza e Estética", "Farmácia e Drogaria",
  "Advogados", "Educação", "Esportes", "Automotivo", "Moda e Vestuário",
  "Serviços Gerais", "Tecnologia", "Outros",
];

type Establishment = {
  id: string;
  name: string;
  whatsapp: string;
  category: string | null;
  status: string;
  created_at: string;
  click_count: number;
};

type Suggestion = {
  id: string;
  establishment_id: string;
  suggestion_text: string;
  created_at: string;
};

type AdminData = {
  pending: Establishment[];
  approved: Establishment[];
  rejected: Establishment[];
  suggestions: Suggestion[];
};

function normalizeStr(str: string) {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

/** Fetch all admin data through the secure edge function */
async function fetchAdminData(adminToken: string): Promise<AdminData> {
  const { data, error } = await supabase.functions.invoke("admin-zap-read", {
    body: { admin_token: adminToken, action: "fetch_all" },
  });
  if (error) throw error;
  if (data?.error === "Unauthorized") {
    localStorage.removeItem(SESSION_KEY);
    throw new Error("SESSION_EXPIRED");
  }
  if (data?.error) throw new Error(data.error);
  return data as AdminData;
}

/** Validate token against backend */
async function validateToken(token: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.functions.invoke("admin-zap-read", {
      body: { admin_token: token, action: "validate" },
    });
    if (error || data?.error) return false;
    return data?.valid === true;
  } catch {
    return false;
  }
}

function EditableEstablishmentRow({
  item,
  actions,
  onSaveEdit,
  suggestions,
}: {
  item: Establishment;
  actions: React.ReactNode;
  onSaveEdit: (id: string, name: string, whatsapp: string, category: string | null) => Promise<void>;
  suggestions?: Suggestion[];
}) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(item.name);
  const [editWhatsapp, setEditWhatsapp] = useState(item.whatsapp);
  const [editCategory, setEditCategory] = useState(item.category || "");
  const [saving, setSaving] = useState(false);

  const itemSuggestions = suggestions?.filter(s => s.establishment_id === item.id) || [];

  async function handleSave() {
    if (!editName.trim() || !editWhatsapp.trim()) {
      toast.error("Nome e WhatsApp são obrigatórios.");
      return;
    }
    setSaving(true);
    await onSaveEdit(item.id, editName.trim(), editWhatsapp.replace(/\D/g, ""), editCategory || null);
    setSaving(false);
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-3 p-4 border rounded-lg bg-card border-primary/30">
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Nome</Label>
          <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">WhatsApp</Label>
          <Input value={editWhatsapp} onChange={(e) => setEditWhatsapp(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Categoria</Label>
          <Select value={editCategory} onValueChange={(value) => setEditCategory(value || "")}>
            <SelectTrigger>
              <SelectValue placeholder="Sem categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sem categoria</SelectItem>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2 justify-end">
          <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setEditName(item.name); setEditWhatsapp(item.whatsapp); setEditCategory(item.category || ""); }} disabled={saving}>
            Cancelar
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4 mr-1" /> Salvar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-4 border rounded-lg bg-card">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground">{item.name}</p>
          <a
            href={`https://wa.me/55${item.whatsapp}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-[#25D366] hover:underline inline-flex items-center gap-1"
          >
            {item.whatsapp} <ExternalLink className="w-3 h-3" />
          </a>
          {item.category && (
            <Badge variant="secondary" className="ml-2 text-xs">{item.category}</Badge>
          )}
          <div className="flex items-center gap-3 mt-1">
            <p className="text-xs text-muted-foreground">{formatDate(item.created_at)}</p>
            <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
              <MousePointerClick className="w-3 h-3" /> {item.click_count || 0} cliques
            </span>
          </div>
        </div>
        <div className="flex gap-1.5 shrink-0 flex-wrap">
          <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setEditing(true)}>
            <Pencil className="w-3.5 h-3.5 mr-1" /> Editar
          </Button>
          {actions}
        </div>
      </div>
      {itemSuggestions.length > 0 && (
        <div className="border-t pt-2 mt-1 space-y-1">
          <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            <MessageSquare className="w-3 h-3" /> Sugestões ({itemSuggestions.length})
          </p>
          {itemSuggestions.map(s => (
            <p key={s.id} className="text-xs text-muted-foreground bg-muted rounded px-2 py-1">
              {s.suggestion_text} <span className="text-muted-foreground/60">— {formatDate(s.created_at)}</span>
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Admin() {
  const [authed, setAuthed] = useState(false);
  const [validating, setValidating] = useState(() => Boolean(localStorage.getItem(SESSION_KEY)));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [adminSearch, setAdminSearch] = useState("");
  const queryClient = useQueryClient();

  // Validate token on mount
  useEffect(() => {
    const token = localStorage.getItem(SESSION_KEY);
    if (!token) return;
    let mounted = true;
    validateToken(token).then((valid) => {
      if (!mounted) return;
      if (valid) {
        setAuthed(true);
      } else {
        localStorage.removeItem(SESSION_KEY);
      }
      setValidating(false);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const adminToken = localStorage.getItem(SESSION_KEY) || "";

  // All data fetched through secure edge function
  const { data: adminData, isLoading: dataLoading } = useQuery({
    queryKey: ["admin-data"],
    queryFn: () => fetchAdminData(adminToken),
    enabled: authed && !!adminToken,
    retry: false,
    meta: {
      onSettled: (_data: unknown, error: unknown) => {
        if (error instanceof Error && error.message === "SESSION_EXPIRED") {
          setAuthed(false);
        }
      },
    },
  });

  const pending = useMemo(() => adminData?.pending || [], [adminData?.pending]);
  const approved = useMemo(() => adminData?.approved || [], [adminData?.approved]);
  const rejected = useMemo(() => adminData?.rejected || [], [adminData?.rejected]);
  const suggestions = useMemo(() => adminData?.suggestions || [], [adminData?.suggestions]);

  const filteredBySearch = useMemo(() => {
    function filterItems(items: Establishment[]) {
      if (!adminSearch.trim()) return items;
      const q = normalizeStr(adminSearch);
      const digits = adminSearch.replace(/\D/g, "");
      return items.filter(i =>
        normalizeStr(i.name || "").includes(q) ||
        (digits && (i.whatsapp || "").includes(digits)) ||
        (i.category && normalizeStr(i.category).includes(q))
      );
    }
    return {
      pending: filterItems(pending),
      approved: filterItems(approved),
      rejected: filterItems(rejected),
    };
  }, [adminSearch, pending, approved, rejected]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError("");
    try {
      const { data, error } = await supabase.functions.invoke("admin-login", {
        body: { email, password },
      });
      if (error || data?.error) {
        setLoginError(data?.error || "Erro ao fazer login.");
        return;
      }
      if (data?.token) {
        localStorage.setItem(SESSION_KEY, data.token);
        setAuthed(true);
      }
    } catch {
      setLoginError("Erro de conexão.");
    } finally {
      setLoginLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem(SESSION_KEY);
    setAuthed(false);
    queryClient.clear();
  }

  function invalidateAll() {
    queryClient.invalidateQueries({ queryKey: ["admin-data"] });
    queryClient.invalidateQueries({ queryKey: ["zap-establishments-approved"] });
  }

  function handleExportCsv() {
    if (!adminData) return;
    const allItems = [...adminData.approved, ...adminData.pending, ...adminData.rejected];
    const header = "Nome,WhatsApp,Categoria,Status,Cliques,Criado em";
    const rows = allItems.map(i => {
      const name = `"${(i.name || "").replace(/"/g, '""')}"`;
      const cat = `"${(i.category || "Sem categoria").replace(/"/g, '""')}"`;
      return `${name},${i.whatsapp},${cat},${i.status},${i.click_count || 0},${formatDate(i.created_at)}`;
    });
    const csv = "\uFEFF" + [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `zap-mhs-backup-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exportado com sucesso!");
  }

  async function updateStatus(id: string, newStatus: string) {
    // Optimistic update: move item instantly in the cache
    const previousData = queryClient.getQueryData<AdminData>(["admin-data"]);
    if (previousData) {
      const allItems = [...previousData.pending, ...previousData.approved, ...previousData.rejected];
      const item = allItems.find(i => i.id === id);
      if (item) {
        const updated = { ...item, status: newStatus };
        queryClient.setQueryData<AdminData>(["admin-data"], {
          ...previousData,
          pending: newStatus === "pending"
            ? [updated, ...previousData.pending.filter(i => i.id !== id)]
            : previousData.pending.filter(i => i.id !== id),
          approved: newStatus === "approved"
            ? [updated, ...previousData.approved.filter(i => i.id !== id)]
            : previousData.approved.filter(i => i.id !== id),
          rejected: newStatus === "rejected"
            ? [updated, ...previousData.rejected.filter(i => i.id !== id)]
            : previousData.rejected.filter(i => i.id !== id),
          suggestions: previousData.suggestions,
        });
      }
    }

    const { data, error } = await supabase.functions.invoke("admin-zap-update", {
      body: { id, action: "update_status", status: newStatus, admin_token: adminToken },
    });
    if (error || data?.error) {
      if (data?.error === "Unauthorized") { logout(); }
      toast.error("Erro ao atualizar status.");
      // Rollback on error
      if (previousData) queryClient.setQueryData(["admin-data"], previousData);
      return;
    }
    toast.success("Status atualizado!");
    // Background refetch to sync with server
    queryClient.invalidateQueries({ queryKey: ["zap-establishments-approved"] });
  }

  async function saveEdit(id: string, name: string, whatsapp: string, category: string | null) {
    const { data, error } = await supabase.functions.invoke("admin-zap-update", {
      body: { id, action: "edit", name, whatsapp, category: category || "none", admin_token: adminToken },
    });
    if (error || data?.error) {
      if (data?.error === "Unauthorized") { logout(); }
      toast.error("Erro ao salvar edição.");
      return;
    }
    toast.success("Dados atualizados!");
    invalidateAll();
  }

  // Show loading while validating token
  if (validating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <form onSubmit={handleLogin} className="w-full max-w-sm space-y-4 p-6 border rounded-xl bg-card shadow-lg">
          <h1 className="text-xl font-bold text-center text-foreground">Painel Admin</h1>
          <div className="space-y-2">
            <Label htmlFor="admin-email">E-mail</Label>
            <Input id="admin-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="admin-pass">Senha</Label>
            <Input id="admin-pass" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          {loginError && <p className="text-sm text-destructive text-center">{loginError}</p>}
          <Button type="submit" className="w-full" disabled={loginLoading}>
            {loginLoading ? "Entrando..." : "Entrar"}
          </Button>
        </form>
      </div>
    );
  }

  const filteredPending = filteredBySearch.pending;
  const filteredApproved = filteredBySearch.approved;
  const filteredRejected = filteredBySearch.rejected;

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-6 md:py-10 max-w-4xl">
        <div className="flex items-center justify-between mb-4 gap-2">
          <h1 className="text-lg sm:text-2xl font-bold text-foreground truncate">Painel Admin</h1>
          <div className="flex gap-1.5 shrink-0">
            <Button variant="outline" size="sm" className="text-xs h-8 gap-1" onClick={handleExportCsv} disabled={dataLoading || !adminData}>
              <Download className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Exportar</span> CSV
            </Button>
            <Button variant="ghost" size="sm" className="text-xs h-8" onClick={logout}>
              Sair
            </Button>
          </div>
        </div>

        {/* Admin search bar */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, telefone ou categoria..."
            value={adminSearch}
            onChange={(e) => setAdminSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {dataLoading && (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {!dataLoading && (
          <Tabs defaultValue="pending">
            <TabsList className="w-full flex overflow-x-auto scrollbar-hide gap-0.5 p-1">
              <TabsTrigger value="pending" className="relative shrink-0 text-xs px-2.5">
                Pendentes
                {pending.length > 0 && (
                  <Badge className="ml-1 h-4 min-w-4 px-0.5 bg-amber-500 text-white text-[10px]">
                    {pending.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="approved" className="shrink-0 text-xs px-2.5">Aprovados</TabsTrigger>
              <TabsTrigger value="rejected" className="shrink-0 text-xs px-2.5">Reprovados</TabsTrigger>
              <TabsTrigger value="farmacias" className="flex items-center gap-1 shrink-0 text-xs px-2.5">
                <Pill className="w-3 h-3" /> Farmácias
              </TabsTrigger>
              <TabsTrigger value="anuncios" className="flex items-center gap-1 shrink-0 text-xs px-2.5">
                <Megaphone className="w-3 h-3" /> Anúncios
              </TabsTrigger>
              <TabsTrigger value="classificados" className="flex items-center gap-1 shrink-0 text-xs px-2.5">
                <Package className="w-3 h-3" /> C&V
              </TabsTrigger>
              <TabsTrigger value="syncs" className="flex items-center gap-1 shrink-0 text-xs px-2.5">
                <Activity className="w-3 h-3" /> Syncs
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="space-y-3 mt-4">
              {filteredPending.length === 0 && <p className="text-muted-foreground text-center py-8">Nenhum cadastro pendente.</p>}
              {filteredPending.map((item) => (
                <EditableEstablishmentRow
                  key={item.id}
                  item={item}
                  onSaveEdit={saveEdit}
                  suggestions={suggestions}
                  actions={
                    <>
                      <Button size="sm" className="bg-[#25D366] hover:bg-[#1da851] text-white h-8 text-xs" onClick={() => updateStatus(item.id, "approved")}>
                        <Check className="w-3.5 h-3.5 mr-1" /> Aprovar
                      </Button>
                      <Button size="sm" variant="destructive" className="h-8 text-xs" onClick={() => updateStatus(item.id, "rejected")}>
                        <X className="w-3.5 h-3.5 mr-1" /> Reprovar
                      </Button>
                    </>
                  }
                />
              ))}
            </TabsContent>

            <TabsContent value="approved" className="space-y-3 mt-4">
              {filteredApproved.length === 0 && <p className="text-muted-foreground text-center py-8">Nenhum estabelecimento aprovado.</p>}
              {filteredApproved.map((item) => (
                <EditableEstablishmentRow
                  key={item.id}
                  item={item}
                  onSaveEdit={saveEdit}
                  suggestions={suggestions}
                  actions={
                    <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => updateStatus(item.id, "pending")}>
                      <RotateCcw className="w-3.5 h-3.5 mr-1" /> Remover
                    </Button>
                  }
                />
              ))}
            </TabsContent>

            <TabsContent value="rejected" className="space-y-3 mt-4">
              {filteredRejected.length === 0 && <p className="text-muted-foreground text-center py-8">Nenhum estabelecimento reprovado.</p>}
              {filteredRejected.map((item) => (
                <EditableEstablishmentRow
                  key={item.id}
                  item={item}
                  onSaveEdit={saveEdit}
                  suggestions={suggestions}
                  actions={
                    <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => updateStatus(item.id, "pending")}>
                      <RotateCcw className="w-3.5 h-3.5 mr-1" /> Revisar
                    </Button>
                  }
                />
              ))}
            </TabsContent>

            <TabsContent value="farmacias" className="mt-4">
              <FarmaciaFotosAdmin />
            </TabsContent>

            <TabsContent value="anuncios" className="mt-4">
              <AnunciosAdmin />
            </TabsContent>

            <TabsContent value="classificados" className="mt-4">
              <ClassificadosAdmin adminToken={adminToken} />
            </TabsContent>

            <TabsContent value="syncs" className="mt-4">
              <SyncStatusAdmin />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}

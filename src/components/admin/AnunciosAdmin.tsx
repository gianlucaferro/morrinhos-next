"use client";

import { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
const supabase = createBrowserSupabaseClient();
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Upload, Trash2, Loader2, Image, Eye, MousePointerClick,
  Power, PowerOff, Pencil, Save, X, Plus, ExternalLink,
  Info, LayoutTemplate, MonitorSmartphone, ImagePlus
} from "lucide-react";
import { toast } from "sonner";

type Anuncio = {
  id: string;
  nome_empresa: string;
  plano: "padrao" | "destaque";
  imagem_url: string | null;
  link_destino: string | null;
  whatsapp: string | null;
  ativo: boolean;
  impressoes: number;
  cliques: number;
  created_at: string;
};

const compressToWebP = (file: File, maxWidth = 1200, quality = 0.85): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => {
      const ratio = Math.min(maxWidth / img.width, 1);
      const w = Math.round(img.width * ratio);
      const h = Math.round(img.height * ratio);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas not supported"));
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) => blob ? resolve(blob) : reject(new Error("Compression failed")),
        "image/webp",
        quality
      );
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = URL.createObjectURL(file);
  });
};

const PLAN_INFO = {
  destaque: {
    label: "Destaque",
    price: "R$400/mês",
    position: "Topo da página inicial, logo abaixo do hero",
    dimensions: "1200 x 300 px (proporção 4:1)",
    color: "bg-primary text-primary-foreground",
    border: "border-primary/30",
  },
  padrao: {
    label: "Padrão",
    price: "R$200/mês",
    position: "Entre seções da página inicial (rotação diária)",
    dimensions: "1200 x 300 px (proporção 4:1)",
    color: "bg-secondary text-secondary-foreground",
    border: "border-border",
  },
};

export default function AnunciosAdmin() {
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [newNome, setNewNome] = useState("");
  const [newPlano, setNewPlano] = useState<"padrao" | "destaque">("padrao");
  const [newLink, setNewLink] = useState("");
  const [newWhatsapp, setNewWhatsapp] = useState("");
  const [newImageFile, setNewImageFile] = useState<File | null>(null);
  const [newImagePreview, setNewImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [editingLink, setEditingLink] = useState<string | null>(null);
  const [editLinkValue, setEditLinkValue] = useState("");
  const [editingWhatsapp, setEditingWhatsapp] = useState<string | null>(null);
  const [editWhatsappValue, setEditWhatsappValue] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: anuncios, isLoading } = useQuery({
    queryKey: ["anuncios-admin"],
    queryFn: async () => {
      const { data } = await supabase.from("anuncios").select("*").order("created_at", { ascending: false });
      return (data || []) as Anuncio[];
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["anuncios-admin"] });
    queryClient.invalidateQueries({ queryKey: ["anuncios-ativos"] });
  };

  const uploadImage = async (nomeEmpresa: string, file: File): Promise<string> => {
    const slug = nomeEmpresa.toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    const path = `${slug}-${Date.now()}.webp`;
    const compressed = await compressToWebP(file);
    const { error: uploadError } = await supabase.storage
      .from("anuncios")
      .upload(path, compressed, { upsert: true, contentType: "image/webp" });
    if (uploadError) throw uploadError;
    const { data: urlData } = supabase.storage.from("anuncios").getPublicUrl(path);
    toast.success(`Imagem comprimida para ${(compressed.size / 1024).toFixed(0)}KB WebP`);
    return urlData.publicUrl;
  };

  const handleNewImageSelect = (file: File) => {
    setNewImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setNewImagePreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleCreate = async () => {
    if (!newNome.trim()) return toast.error("Nome da empresa obrigatório");
    setUploading("new");
    try {
      let imagemUrl: string | null = null;
      if (newImageFile) {
        imagemUrl = await uploadImage(newNome.trim(), newImageFile);
      }
      const { error } = await supabase.from("anuncios").insert({
        nome_empresa: newNome.trim(),
        plano: newPlano,
        link_destino: newLink.trim() || null,
        whatsapp: newWhatsapp.trim() || null,
        imagem_url: imagemUrl,
      });
      if (error) throw error;
      toast.success(`Anúncio de ${newNome} criado!`);
      setCreating(false);
      setNewNome(""); setNewLink(""); setNewWhatsapp("");
      setNewImageFile(null); setNewImagePreview(null);
      invalidate();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setUploading(null);
    }
  };

  const handleUploadImage = async (anuncio: Anuncio, file: File) => {
    setUploading(anuncio.id);
    try {
      const publicUrl = await uploadImage(anuncio.nome_empresa, file);
      const { error: dbError } = await supabase
        .from("anuncios")
        .update({ imagem_url: publicUrl })
        .eq("id", anuncio.id);
      if (dbError) throw dbError;
      toast.success("Banner atualizado!");
      invalidate();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setUploading(null);
    }
  };

  const toggleAtivo = async (anuncio: Anuncio) => {
    await supabase.from("anuncios").update({ ativo: !anuncio.ativo }).eq("id", anuncio.id);
    toast.success(anuncio.ativo ? "Anuncio desativado" : "Anuncio ativado");
    invalidate();
  };

  const handleDelete = async (anuncio: Anuncio) => {
    if (!confirm(`Excluir anuncio de ${anuncio.nome_empresa}?`)) return;
    await supabase.from("anuncios").delete().eq("id", anuncio.id);
    toast.success("Anuncio excluido");
    invalidate();
  };

  const handleSaveLink = async (id: string) => {
    await supabase.from("anuncios").update({ link_destino: editLinkValue.trim() || null }).eq("id", id);
    toast.success("Link atualizado");
    setEditingLink(null);
    invalidate();
  };

  const handleSaveWhatsapp = async (id: string) => {
    await supabase.from("anuncios").update({ whatsapp: editWhatsappValue.trim() || null }).eq("id", id);
    toast.success("WhatsApp atualizado");
    setEditingWhatsapp(null);
    invalidate();
  };

  const resetStats = async (id: string) => {
    await supabase.from("anuncios").update({ impressoes: 0, cliques: 0 }).eq("id", id);
    toast.success("Estatisticas zeradas");
    invalidate();
  };

  if (isLoading) return <div className="animate-pulse h-40" />;

  const ativos = (anuncios || []).filter(a => a.ativo).length;
  const destaques = (anuncios || []).filter(a => a.plano === "destaque" && a.ativo).length;
  const padroes = (anuncios || []).filter(a => a.plano === "padrao" && a.ativo).length;

  return (
    <div className="space-y-5">

      {/* Guide */}
      <div className="stat-card bg-muted/30 space-y-3">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-primary shrink-0" />
          <p className="text-sm font-semibold text-foreground">Guia de Posicionamento</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(["destaque", "padrao"] as const).map((plano) => {
            const info = PLAN_INFO[plano];
            return (
              <div key={plano} className={`rounded-lg border p-3 space-y-1.5 ${info.border}`}>
                <div className="flex items-center gap-2">
                  <Badge className={`text-[10px] ${info.color}`}>{info.label} — {info.price}</Badge>
                </div>
                <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
                  <LayoutTemplate className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>{info.position}</span>
                </div>
                <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
                  <MonitorSmartphone className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>Imagem recomendada: <strong className="text-foreground">{info.dimensions}</strong></span>
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-[10px] text-muted-foreground">
          Formatos aceitos: JPG, PNG, WebP. A imagem sera automaticamente comprimida para WebP (max 1200px de largura).
          O badge "Patrocinado" aparece automaticamente no canto inferior direito.
        </p>
      </div>

      {/* Stats summary */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span>{anuncios?.length || 0} anuncio(s)</span>
          <span className="text-[10px]">|</span>
          <span className="text-accent">{ativos} ativo(s)</span>
          {destaques > 0 && <span className="text-[10px]">({destaques} destaque, {padroes} padrao)</span>}
        </div>
        <Button size="sm" onClick={() => setCreating(true)} disabled={creating}>
          <Plus className="w-3.5 h-3.5 mr-1" /> Novo anuncio
        </Button>
      </div>

      {/* Create form */}
      {creating && (
        <div className="stat-card border-primary/30 space-y-4">
          <p className="text-sm font-semibold text-foreground">Novo anuncio</p>

          <Input placeholder="Nome da empresa" value={newNome} onChange={e => setNewNome(e.target.value)} />

          <div>
            <p className="text-xs text-muted-foreground mb-1.5">Plano</p>
            <div className="flex gap-2">
              <Button variant={newPlano === "padrao" ? "default" : "outline"} size="sm" onClick={() => setNewPlano("padrao")}>
                Padrao (R$200/mes)
              </Button>
              <Button variant={newPlano === "destaque" ? "default" : "outline"} size="sm" onClick={() => setNewPlano("destaque")}>
                Destaque (R$400/mes)
              </Button>
            </div>
          </div>

          {/* Image upload in create form */}
          <div>
            <p className="text-xs text-muted-foreground mb-1.5">
              Banner do anuncio — {PLAN_INFO[newPlano].dimensions}
            </p>
            {newImagePreview ? (
              <div className="relative rounded-lg overflow-hidden border">
                <img src={newImagePreview} alt="Preview" className="w-full h-auto" />
                <button
                  onClick={() => { setNewImageFile(null); setNewImagePreview(null); }}
                  className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm rounded-full p-1 hover:bg-background"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center gap-2 p-6 rounded-lg border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 cursor-pointer transition-colors bg-muted/20">
                <ImagePlus className="w-8 h-8 text-muted-foreground/40" />
                <span className="text-xs text-muted-foreground">Clique para selecionar a imagem do banner</span>
                <span className="text-[10px] text-muted-foreground/60">JPG, PNG ou WebP</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleNewImageSelect(f); e.target.value = ""; }}
                />
              </label>
            )}
          </div>

          <Input placeholder="Link de destino (ex: https://...)" value={newLink} onChange={e => setNewLink(e.target.value)} />
          <Input placeholder="WhatsApp (ex: 64999999999)" value={newWhatsapp} onChange={e => setNewWhatsapp(e.target.value)} />

          <div className="flex gap-2">
            <Button size="sm" onClick={handleCreate} disabled={uploading === "new"}>
              {uploading === "new" ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Plus className="w-3.5 h-3.5 mr-1" />}
              Criar anuncio
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setCreating(false); setNewImageFile(null); setNewImagePreview(null); }}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* List */}
      <div className="space-y-4">
        {(anuncios || []).map((a) => {
          const info = PLAN_INFO[a.plano];
          return (
            <div key={a.id} className={`stat-card space-y-3 ${!a.ativo ? "opacity-50" : ""} ${a.ativo ? info.border : ""}`}>
              {/* Image preview — large */}
              {a.imagem_url ? (
                <div className="relative rounded-lg overflow-hidden border">
                  <img src={a.imagem_url} alt={a.nome_empresa} className="w-full h-auto" />
                  <Badge variant="secondary" className="absolute bottom-2 right-2 text-[9px] opacity-70">
                    Patrocinado
                  </Badge>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center gap-2 p-8 rounded-lg border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 cursor-pointer transition-colors bg-muted/20">
                  {uploading === a.id ? (
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  ) : (
                    <>
                      <ImagePlus className="w-8 h-8 text-muted-foreground/40" />
                      <span className="text-xs text-muted-foreground">Clique para enviar o banner</span>
                      <span className="text-[10px] text-muted-foreground/60">
                        Recomendado: {info.dimensions}
                      </span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleUploadImage(a, f); e.target.value = ""; }}
                  />
                </label>
              )}

              {/* Info row */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-foreground">{a.nome_empresa}</p>
                  <Badge className={`text-[10px] ${info.color}`}>{info.label} — {info.price}</Badge>
                  {a.ativo ? (
                    <Badge variant="outline" className="text-[10px] text-accent border-accent/30">Ativo</Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] text-destructive border-destructive/30">Inativo</Badge>
                  )}
                </div>

                {/* Position info */}
                <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <LayoutTemplate className="w-3 h-3" /> {info.position}
                </p>

                {/* Link */}
                <div className="flex items-center gap-1">
                  <ExternalLink className="w-3 h-3 text-muted-foreground shrink-0" />
                  {editingLink === a.id ? (
                    <div className="flex items-center gap-1 flex-1">
                      <Input value={editLinkValue} onChange={e => setEditLinkValue(e.target.value)} placeholder="https://..." className="h-7 text-xs flex-1" autoFocus />
                      <Button size="sm" variant="default" className="h-7 px-2" onClick={() => handleSaveLink(a.id)}><Save className="w-3 h-3" /></Button>
                      <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setEditingLink(null)}><X className="w-3 h-3" /></Button>
                    </div>
                  ) : (
                    <>
                      <p className="text-xs text-muted-foreground truncate">{a.link_destino || "Sem link de destino"}</p>
                      <button onClick={() => { setEditingLink(a.id); setEditLinkValue(a.link_destino || ""); }} className="text-primary shrink-0">
                        <Pencil className="w-3 h-3" />
                      </button>
                    </>
                  )}
                </div>

                {/* WhatsApp */}
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground text-[10px] shrink-0">WA</span>
                  {editingWhatsapp === a.id ? (
                    <div className="flex items-center gap-1 flex-1">
                      <Input value={editWhatsappValue} onChange={e => setEditWhatsappValue(e.target.value)} placeholder="64999999999" className="h-7 text-xs flex-1" autoFocus />
                      <Button size="sm" variant="default" className="h-7 px-2" onClick={() => handleSaveWhatsapp(a.id)}><Save className="w-3 h-3" /></Button>
                      <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setEditingWhatsapp(null)}><X className="w-3 h-3" /></Button>
                    </div>
                  ) : (
                    <>
                      <p className="text-xs text-muted-foreground truncate">{a.whatsapp || "Sem WhatsApp"}</p>
                      <button onClick={() => { setEditingWhatsapp(a.id); setEditWhatsappValue(a.whatsapp || ""); }} className="text-primary shrink-0">
                        <Pencil className="w-3 h-3" />
                      </button>
                    </>
                  )}
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 pt-1 border-t border-border">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Eye className="w-3.5 h-3.5" />
                    <span><strong className="text-foreground">{a.impressoes.toLocaleString("pt-BR")}</strong> impressoes</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MousePointerClick className="w-3.5 h-3.5" />
                    <span><strong className="text-foreground">{a.cliques.toLocaleString("pt-BR")}</strong> cliques</span>
                  </div>
                  {a.impressoes > 0 && (
                    <span className="text-xs text-muted-foreground">
                      CTR: <strong className="text-foreground">{((a.cliques / a.impressoes) * 100).toFixed(1)}%</strong>
                    </span>
                  )}
                  <button onClick={() => resetStats(a.id)} className="text-[10px] text-primary hover:underline ml-auto">
                    Zerar stats
                  </button>
                </div>

                {/* Created date */}
                <p className="text-[10px] text-muted-foreground/60">
                  Criado em {new Date(a.created_at).toLocaleDateString("pt-BR")}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-border">
                {a.imagem_url && (
                  <label className="cursor-pointer">
                    <input type="file" accept="image/*" className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleUploadImage(a, f); e.target.value = ""; }} />
                    <Button variant="outline" size="sm" asChild disabled={uploading === a.id}>
                      <span>
                        {uploading === a.id ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Upload className="w-3.5 h-3.5 mr-1" />}
                        Trocar banner
                      </span>
                    </Button>
                  </label>
                )}
                <Button variant="outline" size="sm" onClick={() => toggleAtivo(a)}>
                  {a.ativo ? <><PowerOff className="w-3.5 h-3.5 mr-1" /> Desativar</> : <><Power className="w-3.5 h-3.5 mr-1" /> Ativar</>}
                </Button>
                {a.link_destino && (
                  <a href={a.link_destino} target="_blank" rel="noopener noreferrer">
                    <Button variant="ghost" size="sm"><ExternalLink className="w-3.5 h-3.5 mr-1" /> Abrir link</Button>
                  </a>
                )}
                <Button variant="ghost" size="sm" className="text-destructive ml-auto" onClick={() => handleDelete(a)}>
                  <Trash2 className="w-3.5 h-3.5 mr-1" /> Excluir
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {(!anuncios || anuncios.length === 0) && (
        <div className="stat-card flex flex-col items-center justify-center py-12 text-center">
          <Image className="w-10 h-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm font-medium text-foreground">Nenhum anuncio cadastrado</p>
          <p className="text-xs text-muted-foreground mt-1">Clique em "Novo anuncio" para criar o primeiro</p>
        </div>
      )}
    </div>
  );
}

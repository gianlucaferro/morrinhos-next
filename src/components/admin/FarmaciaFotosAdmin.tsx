"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
const supabase = createBrowserSupabaseClient();
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, Check, Loader2, Image, Trash2, Pencil, Save, Phone, X } from "lucide-react";
import { toast } from "sonner";

const FARMACIAS = [
  "Drogaria Bem Estar", "Drogaria do Povo", "Drogaria Nacional",
  "Drogaria São José", "Drogaria São Sebastião",
  "Drogaria Santa Luzia", "Drogamais", "Droganova",
  "Drogaria Central", "Drogaria Preço Popular", "Drogaria Marina",
  "Farma Vidda", "Drogaria JM Popular", "Drogaria Machado",
  "Drogaria Oriental", "Drogaria São Pedro", "Drogaria Aliança",
  "Drogaria Do Lar", "Drogaria Santa Rita", "Drogaria Morrinhos",
];

// Default phones from hardcoded data
const DEFAULT_PHONES: Record<string, string> = {
  "Drogaria Bem Estar": "(64) 99280-9691",
  "Drogaria do Povo": "(64) 99218-0444",
  "Drogaria Nacional": "(64) 3405-1815",
  "Drogaria São José": "(64) 3405-3093",
  
  "Drogaria São Sebastião": "(64) 3405-1734",
  "Drogaria Santa Luzia": "(64) 3405-3028",
  "Drogamais": "(64) 99265-4341",
  "Droganova": "(64) 99607-4282",
  "Drogaria Central": "(64) 99327-9097",
  "Drogaria Preço Popular": "(64) 3405-5401",
  "Drogaria Marina": "(64) 99334-3139",
  "Farma Vidda": "(64) 99237-3232",
  "Drogaria JM Popular": "(64) 99203-0312",
  "Drogaria Machado": "(64) 3405-1859",
  "Drogaria Oriental": "(64) 3405-5779",
  "Drogaria São Pedro": "(64) 99246-4938",
  "Drogaria Aliança": "(64) 3405-2252",
  "Drogaria Do Lar": "(64) 3405-1448",
  "Drogaria Santa Rita": "(64) 3405-1361",
  "Drogaria Morrinhos": "(64) 3405-1441",
};

type FarmaciaRow = { id: string; foto_url: string | null; telefone: string | null; tipo_telefone: string | null };

export default function FarmaciaFotosAdmin() {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [editPhone, setEditPhone] = useState("");

  const { data: fotos, isLoading } = useQuery({
    queryKey: ["farmacia-fotos-admin"],
    queryFn: async () => {
      const { data } = await supabase.from("farmacia_fotos").select("*");
      const map = new Map<string, FarmaciaRow>();
      (data || []).forEach((f: any) => map.set(f.nome, f));
      return map;
    },
  });

  const compressToWebP = (file: File, maxWidth = 540, quality = 0.8): Promise<Blob> => {
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

  const handleUpload = async (nome: string, file: File) => {
    setUploading(nome);
    try {
      const slug = nome.toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      const path = `${slug}.webp`;

      // Compress and convert to WebP (max 540px wide, 80% quality)
      const compressed = await compressToWebP(file);
      const sizeKB = (compressed.size / 1024).toFixed(0);

      const { error: uploadError } = await supabase.storage
        .from("farmacia-fotos")
        .upload(path, compressed, { upsert: true, contentType: "image/webp" });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("farmacia-fotos")
        .getPublicUrl(path);

      const { error: dbError } = await supabase
        .from("farmacia_fotos")
        .upsert({ nome, foto_url: urlData.publicUrl }, { onConflict: "nome" });
      if (dbError) throw dbError;

      toast.success(`Foto de ${nome} salva! (${sizeKB}KB WebP)`);
      invalidate();
    } catch (e: any) {
      toast.error(`Erro: ${e.message}`);
    } finally {
      setUploading(null);
    }
  };

  const handleRemove = async (nome: string) => {
    try {
      await supabase.from("farmacia_fotos").delete().eq("nome", nome);
      toast.success(`Foto de ${nome} removida`);
      invalidate();
    } catch (e: any) {
      toast.error(`Erro: ${e.message}`);
    }
  };

  const handleEditPhone = (nome: string) => {
    const current = fotos?.get(nome)?.telefone || DEFAULT_PHONES[nome] || "";
    setEditing(nome);
    setEditPhone(current);
  };

  const handleSavePhone = async (nome: string) => {
    try {
      const tipo = editPhone.includes("3405") ? "fixo" : "whatsapp";
      const { error } = await supabase
        .from("farmacia_fotos")
        .upsert({ nome, telefone: editPhone, tipo_telefone: tipo, foto_url: fotos?.get(nome)?.foto_url || "" }, { onConflict: "nome" });
      if (error) throw error;

      toast.success(`Telefone de ${nome} atualizado!`);
      setEditing(null);
      invalidate();
    } catch (e: any) {
      toast.error(`Erro: ${e.message}`);
    }
  };

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["farmacia-fotos-admin"] });
    queryClient.invalidateQueries({ queryKey: ["farmacia-fotos"] });
  };

  if (isLoading) return <div className="animate-pulse h-40" />;

  const comFoto = FARMACIAS.filter(n => fotos?.get(n)?.foto_url).length;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {comFoto} de {FARMACIAS.length} farmácias com foto · Clique no lápis para editar o telefone
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {FARMACIAS.map((nome) => {
          const row = fotos?.get(nome);
          const isUploading = uploading === nome;
          const isEditing = editing === nome;
          const currentPhone = row?.telefone || DEFAULT_PHONES[nome] || "";
          const phoneSource = row?.telefone ? "salvo" : "padrão";

          return (
            <div key={nome} className="stat-card space-y-2">
              <div className="flex items-center gap-3">
                {/* Preview */}
                <div className="w-14 h-14 rounded-lg bg-muted overflow-hidden shrink-0 flex items-center justify-center">
                  {row?.foto_url ? (
                    <img src={row.foto_url} alt={nome} className="w-full h-full object-cover" />
                  ) : (
                    <Image className="w-6 h-6 text-muted-foreground/30" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{nome}</p>
                  {!isEditing && (
                    <div className="flex items-center gap-1">
                      <Phone className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{currentPhone}</span>
                      <span className="text-[9px] text-muted-foreground/50">({phoneSource})</span>
                    </div>
                  )}
                </div>

                {/* Upload button */}
                <label className="cursor-pointer shrink-0">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUpload(nome, file);
                      e.target.value = "";
                    }}
                  />
                  <Button variant={row?.foto_url ? "outline" : "default"} size="sm" asChild disabled={isUploading}>
                    <span>
                      {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                    </span>
                  </Button>
                </label>

                {row?.foto_url && (
                  <Button variant="ghost" size="sm" onClick={() => handleRemove(nome)} className="text-destructive shrink-0">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>

              {/* Phone edit row */}
              {isEditing ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="(64) 99999-9999"
                    className="h-8 text-xs flex-1"
                    autoFocus
                  />
                  <Button size="sm" variant="default" onClick={() => handleSavePhone(nome)} className="h-8">
                    <Save className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditing(null)} className="h-8">
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ) : (
                <Button variant="ghost" size="sm" onClick={() => handleEditPhone(nome)} className="w-full justify-start text-xs text-muted-foreground h-7">
                  <Pencil className="w-3 h-3 mr-1" /> Editar telefone
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

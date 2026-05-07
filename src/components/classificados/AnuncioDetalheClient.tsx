"use client";

import { useState, useRef, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { createPortal } from "react-dom";
import Layout from "@/components/Layout";
import SEO from "@/components/SEO";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
const supabase = createBrowserSupabaseClient();
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft, ChevronRight, Clock, Eye, MapPin, ArrowLeft,
  Flag, Share2, X, ZoomIn, Heart, Loader2, Package,
  Home as HomeIcon, Car, Wheat, Smartphone, Wrench, Instagram, User,
  ChevronRight as ChevronRightBreadcrumb,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import WhatsAppIcon from "@/components/icons/WhatsAppIcon";
import type { Database } from "@/lib/supabase/types";

// ===== TYPES =====

type ClassificadoRecord = Database["public"]["Tables"]["classificados"]["Row"];
type Classificado = Omit<
  ClassificadoRecord,
  "created_at" | "denuncias" | "expira_em" | "fotos" | "preco_tipo" | "updated_at" | "visualizacoes" | "whatsapp_clicks"
> & {
  created_at: string;
  denuncias: number;
  expira_em: string | null;
  fotos: string[];
  preco_tipo: string;
  updated_at: string | null;
  visualizacoes: number;
  whatsapp_clicks: number;
};

export type AnuncioDetalheClientProps = {
  initialAnuncio?: ClassificadoRecord | null;
};

function normalizeClassificado(item: ClassificadoRecord | null | undefined): Classificado | null {
  if (!item) return null;
  return {
    ...item,
    created_at: item.created_at || new Date(0).toISOString(),
    denuncias: item.denuncias || 0,
    expira_em: item.expira_em,
    fotos: Array.isArray(item.fotos) ? item.fotos : [],
    preco_tipo: item.preco_tipo || "fixo",
    updated_at: item.updated_at,
    visualizacoes: item.visualizacoes || 0,
    whatsapp_clicks: item.whatsapp_clicks || 0,
  };
}

// ===== HELPERS =====

const CATEGORIAS: Record<string, { label: string; icon: LucideIcon }> = {
  imoveis: { label: "Imóveis", icon: HomeIcon },
  veiculos: { label: "Veículos", icon: Car },
  agro: { label: "Agro", icon: Wheat },
  eletronicos: { label: "Eletrônicos", icon: Smartphone },
  servicos: { label: "Serviços", icon: Wrench },
  outros: { label: "Outros", icon: Package },
};

function formatPreco(preco: number | null, tipo: string) {
  if (tipo === "gratuito") return "Gratuito";
  if (!preco) return "Consulte";
  const formatted = preco.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  return tipo === "negociavel" ? `${formatted} (negociável)` : formatted;
}

function isAbortError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error as { name?: unknown }).name === "AbortError"
  );
}

// ===== LIGHTBOX =====

function Lightbox({
  fotos,
  startIdx,
  onClose,
}: {
  fotos: string[];
  startIdx: number;
  onClose: () => void;
}) {
  const [idx, setIdx] = useState(startIdx);
  const touchStartX = useRef(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") setIdx((i) => (i - 1 + fotos.length) % fotos.length);
      if (e.key === "ArrowRight") setIdx((i) => (i + 1) % fotos.length);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [fotos.length, onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center"
      onClick={onClose}
      style={{ touchAction: "none" }}
    >
      <button
        onClick={onClose}
        className="absolute top-3 right-3 text-white/80 hover:text-white z-10 p-3 rounded-full bg-black/30 backdrop-blur-sm"
        aria-label="Fechar"
      >
        <X className="w-6 h-6" />
      </button>
      <div
        className="relative w-full h-full flex items-center justify-center px-2"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
        onTouchEnd={(e) => {
          const diff = e.changedTouches[0].clientX - touchStartX.current;
          if (Math.abs(diff) > 50) {
            setIdx((i) => diff > 0 ? (i - 1 + fotos.length) % fotos.length : (i + 1) % fotos.length);
          }
        }}
      >
        <img
          src={fotos[idx]}
          alt=""
          className="block w-auto h-auto object-contain select-none rounded"
          style={{
            maxWidth: "min(95vw, 900px)",
            maxHeight: "85dvh",
          }}
          draggable={false}
        />
        {fotos.length > 1 && (
          <>
            <button
              onClick={() => setIdx((i) => (i - 1 + fotos.length) % fotos.length)}
              className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 bg-white/15 hover:bg-white/25 active:bg-white/30 backdrop-blur-sm rounded-full p-2.5 sm:p-2 text-white"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={() => setIdx((i) => (i + 1) % fotos.length)}
              className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 bg-white/15 hover:bg-white/25 active:bg-white/30 backdrop-blur-sm rounded-full p-2.5 sm:p-2 text-white"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
            <div className="absolute bottom-8 sm:bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
              {fotos.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setIdx(i)}
                  className={`w-2.5 h-2.5 sm:w-2 sm:h-2 rounded-full transition-colors ${i === idx ? "bg-white" : "bg-white/40"}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
      <p className="absolute top-4 left-4 text-white/60 text-sm">{idx + 1} / {fotos.length}</p>
    </div>,
    document.body
  );
}

// ===== STORIES IMAGE GENERATOR =====

async function generateStoryImage(item: Classificado): Promise<void> {
  const W = 1080;
  const H = 1920;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // Background gradient
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, "#1a1a2e");
  grad.addColorStop(1, "#16213e");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Photo
  if (item.fotos[0]) {
    try {
      const img = await loadImage(item.fotos[0]);
      const imgH = 900;
      ctx.save();
      ctx.beginPath();
      roundRect(ctx, 40, 120, W - 80, imgH, 24);
      ctx.clip();
      ctx.drawImage(img, 40, 120, W - 80, imgH);
      ctx.restore();
    } catch {}
  }

  // Price badge
  const preco = formatPreco(item.preco, item.preco_tipo);
  ctx.fillStyle = "#25D366";
  roundRect(ctx, 40, 1060, 0, 0, 16);
  ctx.font = "bold 56px -apple-system, BlinkMacSystemFont, sans-serif";
  const precoW = ctx.measureText(preco).width + 60;
  ctx.beginPath();
  roundRect(ctx, 40, 1060, precoW, 80, 16);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.fillText(preco, 70, 1118);

  // Title
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 52px -apple-system, BlinkMacSystemFont, sans-serif";
  wrapText(ctx, item.titulo, 40, 1210, W - 80, 64);

  // Description (truncated)
  if (item.descricao) {
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.font = "36px -apple-system, BlinkMacSystemFont, sans-serif";
    const desc = item.descricao.length > 150 ? item.descricao.slice(0, 150) + "..." : item.descricao;
    wrapText(ctx, desc, 40, 1360, W - 80, 46);
  }

  // Bairro
  if (item.bairro) {
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = "32px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillText(`📍 ${item.bairro}`, 40, 1560);
  }

  // Footer
  ctx.fillStyle = "rgba(255,255,255,0.3)";
  ctx.font = "28px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillText("morrinhos.ai/compra-e-venda", 40, H - 100);

  // Brand
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 36px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillText("Compra e Venda ", 40, H - 50);
  const brandW = ctx.measureText("Compra e Venda ").width;
  ctx.fillStyle = "#25D366";
  ctx.fillText("MHS", 40 + brandW, H - 50);

  // Share or download
  canvas.toBlob(async (blob) => {
    if (!blob) return;

    // Try native share (mobile — opens Instagram Stories directly)
    if (navigator.share && navigator.canShare) {
      const file = new File([blob], `compra-venda-mhs-${item.id.slice(0, 8)}.png`, { type: "image/png" });
      const shareData = { files: [file] };
      if (navigator.canShare(shareData)) {
        try {
          await navigator.share(shareData);
          toast.success("Imagem compartilhada!");
          return;
        } catch (e: unknown) {
          if (isAbortError(e)) return; // user cancelled
        }
      }
    }

    // Fallback: download
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `compra-venda-mhs-${item.id.slice(0, 8)}.png`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Imagem salva! Publique nos Stories.");
  }, "image/png");
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lineH: number) {
  const words = text.split(" ");
  let line = "";
  let curY = y;
  for (const word of words) {
    const test = line + (line ? " " : "") + word;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, curY);
      line = word;
      curY += lineH;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, curY);
}

// ===== SIMILAR ADS COMPONENT =====

function AnunciosSimilares({ currentId, categoria }: { currentId: string; categoria: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["anuncios-similares", currentId, categoria],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("classificados")
        .select("id, titulo, preco, preco_tipo, fotos, bairro, categoria")
        .eq("status", "ativo")
        .eq("categoria", categoria)
        .neq("id", currentId)
        .order("created_at", { ascending: false })
        .limit(6);
      if (error) throw error;
      return data as Pick<Classificado, "id" | "titulo" | "preco" | "preco_tipo" | "fotos" | "bairro" | "categoria">[];
    },
    staleTime: 60_000,
  });

  if (isLoading || !data || data.length === 0) return null;

  return (
    <div className="space-y-3">
      <h2 className="text-base font-bold text-foreground">Veja também</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {data.map((ad) => {
          return (
            <Link
              key={ad.id}
              href={`/compra-e-venda/${ad.id}`}
              className="stat-card overflow-hidden hover:border-primary/30 transition-colors p-0"
            >
              {ad.fotos[0] ? (
                <img
                  src={ad.fotos[0]}
                  alt={ad.titulo}
                  className="w-full h-28 sm:h-32 object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-28 sm:h-32 bg-muted flex items-center justify-center">
                  <Package className="w-6 h-6 text-muted-foreground/30" />
                </div>
              )}
              <div className="p-2.5">
                <p className="text-xs font-semibold text-foreground line-clamp-2 leading-tight">
                  {ad.titulo}
                </p>
                <p className="text-sm font-bold text-primary mt-1">
                  {formatPreco(ad.preco, ad.preco_tipo)}
                </p>
                {ad.bairro && (
                  <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-0.5">
                    <MapPin className="w-2.5 h-2.5" /> {ad.bairro}
                  </p>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// ===== PAGE =====

export default function AnuncioDetalhe({ initialAnuncio }: AnuncioDetalheClientProps) {
  const { id } = useParams<{ id: string }>();
  const [imgIdx, setImgIdx] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const galleryTouchX = useRef(0);
  const [isFav, setIsFav] = useState(() => {
    try {
      const raw = localStorage.getItem("mhs-favoritos");
      return raw ? (JSON.parse(raw) as string[]).includes(id || "") : false;
    } catch { return false; }
  });

  const toggleFav = () => {
    try {
      const raw = localStorage.getItem("mhs-favoritos");
      const ids: string[] = raw ? JSON.parse(raw) : [];
      const next = isFav ? ids.filter((x) => x !== id) : [...ids, id!];
      localStorage.setItem("mhs-favoritos", JSON.stringify(next));
      setIsFav(!isFav);
    } catch {}
  };

  const { data: rawItem, isLoading } = useQuery<ClassificadoRecord>({
    queryKey: ["anuncio", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("classificados")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data as ClassificadoRecord;
    },
    enabled: !!id,
    initialData: initialAnuncio || undefined,
  });
  const item = normalizeClassificado(rawItem);

  // Track view
  const viewed = useRef(false);
  useEffect(() => {
    if (item && !viewed.current) {
      viewed.current = true;
      supabase.rpc("increment_classificado_view", { classificado_id: item.id }).then(() => {});
    }
  }, [item]);

  // Track WhatsApp click
  const trackWhatsAppClick = () => {
    if (!item) return;
    supabase
      .from("classificados")
      .update({ whatsapp_clicks: (item.whatsapp_clicks || 0) + 1 })
      .eq("id", item.id)
      .then(() => {});
  };

  const handleDenunciar = async () => {
    if (!item) return;
    if (!confirm("Deseja denunciar este anúncio como inapropriado?")) return;
    await supabase.rpc("denunciar_classificado", { classificado_id: item.id });
    toast.success("Denúncia registrada.");
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="container py-16 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      </Layout>
    );
  }

  if (!item) {
    return (
      <Layout>
        <SEO title="Anúncio não encontrado" path={`/compra-e-venda/${id}`} />
        <div className="container py-16 text-center">
          <Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <h1 className="text-lg font-semibold">Anúncio não encontrado</h1>
          <p className="text-sm text-muted-foreground mt-1">Este anúncio pode ter sido removido ou expirado.</p>
          <Link href="/compra-e-venda">
            <Button className="mt-4" variant="outline">
              <ArrowLeft className="w-4 h-4 mr-1" /> Voltar para anúncios
            </Button>
          </Link>
        </div>
      </Layout>
    );
  }

  const catInfo = CATEGORIAS[item.categoria] || CATEGORIAS.outros;
  const CatIcon = catInfo.icon;
  const isVendido = item.status === "vendido";
  const adUrl = `https://morrinhos.ai/compra-e-venda/${item.id}`;
  const waLink = `https://wa.me/55${item.whatsapp}?text=${encodeURIComponent(
    `Olá, vim pelo Morrinhos.Ai, tenho interesse no ${item.titulo}.\n${adUrl}`
  )}`;
  const shareText = `${item.titulo}${item.bairro ? " — " + item.bairro : ""}\n${formatPreco(item.preco, item.preco_tipo)}\n\nVeja no Compra e Venda MHS:\n${adUrl}`;
  const shareLink = `https://wa.me/?text=${encodeURIComponent(shareText)}`;

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: item.titulo, text: shareText, url: adUrl });
        return;
      } catch {}
    }
    window.open(shareLink, "_blank");
  };

  return (
    <Layout>
      <SEO
        title={`${item.titulo} — Compra e Venda MHS`}
        description={item.descricao || `${item.titulo} em Morrinhos. ${formatPreco(item.preco, item.preco_tipo)}`}
        path={`/compra-e-venda/${item.id}`}
        type="article"
        image={item.fotos[0] || undefined}
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Product",
          name: item.titulo,
          description: item.descricao || undefined,
          image: item.fotos[0] || undefined,
          offers: {
            "@type": "Offer",
            price: item.preco || 0,
            priceCurrency: "BRL",
            availability: isVendido
              ? "https://schema.org/SoldOut"
              : "https://schema.org/InStock",
          },
        }}
      />

      <div className="mx-auto w-full max-w-2xl px-4 py-6 space-y-5">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-1 text-xs text-muted-foreground overflow-x-auto" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-foreground transition-colors shrink-0">Início</Link>
          <ChevronRightBreadcrumb className="w-3 h-3 shrink-0" />
          <Link href="/compra-e-venda" className="hover:text-foreground transition-colors shrink-0">Compra e Venda</Link>
          <ChevronRightBreadcrumb className="w-3 h-3 shrink-0" />
          <Link
            href={`/compra-e-venda?cat=${item.categoria}`}
            className="hover:text-foreground transition-colors shrink-0"
          >
            {catInfo.label}
          </Link>
          <ChevronRightBreadcrumb className="w-3 h-3 shrink-0" />
          <span className="text-foreground font-medium truncate">{item.titulo}</span>
        </nav>

        {/* Gallery */}
        {item.fotos.length > 0 && (
          <div
            className="relative rounded-xl overflow-hidden aspect-square"
            onTouchStart={(e) => { galleryTouchX.current = e.touches[0].clientX; }}
            onTouchEnd={(e) => {
              const diff = e.changedTouches[0].clientX - galleryTouchX.current;
              if (Math.abs(diff) > 50 && item.fotos.length > 1) {
                setImgIdx((i) => diff > 0 ? (i - 1 + item.fotos.length) % item.fotos.length : (i + 1) % item.fotos.length);
              }
            }}
          >
            <img
              src={item.fotos[imgIdx]}
              alt={item.titulo}
              className="w-full h-full object-cover cursor-pointer"
              onClick={() => setLightbox(true)}
            />
            <button
              onClick={(e) => { e.stopPropagation(); setLightbox(true); }}
              className="absolute bottom-3 right-3 bg-background/70 backdrop-blur-sm rounded-full p-2"
              title="Ampliar"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            {isVendido && (
              <div className="absolute inset-0 bg-background/40 flex items-center justify-center pointer-events-none">
                <Badge className="bg-blue-600 text-white text-lg px-6 py-2 font-bold">VENDIDO</Badge>
              </div>
            )}
            {item.fotos.length > 1 && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); setImgIdx((i) => (i - 1 + item.fotos.length) % item.fotos.length); }}
                  className="absolute left-3 top-1/2 -translate-y-1/2 bg-background/70 backdrop-blur-sm rounded-full p-2.5 active:bg-background/90"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setImgIdx((i) => (i + 1) % item.fotos.length); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 bg-background/70 backdrop-blur-sm rounded-full p-2.5 active:bg-background/90"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {item.fotos.map((_, i) => (
                    <div
                      key={i}
                      className={`w-2 h-2 rounded-full ${i === imgIdx ? "bg-white" : "bg-white/50"}`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Thumbnails */}
        {item.fotos.length > 1 && (
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {item.fotos.map((foto, i) => (
              <button
                key={i}
                onClick={() => setImgIdx(i)}
                className={`shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                  i === imgIdx ? "border-primary" : "border-transparent opacity-60 hover:opacity-100"
                }`}
              >
                <img src={foto} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}

        {/* Lightbox */}
        {lightbox && (
          <Lightbox fotos={item.fotos} startIdx={imgIdx} onClose={() => setLightbox(false)} />
        )}

        {/* Info */}
        <div className="stat-card space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary" className="text-xs">
                  <CatIcon className="w-3.5 h-3.5 mr-1" /> {catInfo.label}
                </Badge>
                {isVendido && (
                  <Badge className="bg-blue-600 text-white text-xs">VENDIDO</Badge>
                )}
              </div>
              <h1 className="text-lg font-bold text-foreground">{item.titulo}</h1>
              <p className="text-2xl font-bold text-primary mt-1">
                {formatPreco(item.preco, item.preco_tipo)}
              </p>
            </div>
            <button
              onClick={toggleFav}
              className="p-2 rounded-full transition-colors hover:bg-muted"
              title={isFav ? "Remover dos favoritos" : "Salvar nos favoritos"}
            >
              <Heart className={`w-6 h-6 ${isFav ? "fill-red-500 text-red-500" : "text-muted-foreground"}`} />
            </button>
          </div>

          {item.descricao && (
            <p className="text-sm text-foreground/80 whitespace-pre-line">{item.descricao}</p>
          )}

          {/* Meta */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap pt-2 border-t border-border">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {new Date(item.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
            </span>
            <span className="flex items-center gap-1">
              <Eye className="w-3.5 h-3.5" /> {item.visualizacoes} visualizações
            </span>
            {item.bairro && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" /> {item.bairro}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              {item.foto_perfil ? (
                <img src={item.foto_perfil} alt="" className="w-5 h-5 rounded-full object-cover" loading="lazy" />
              ) : (
                <User className="w-3.5 h-3.5" />
              )}
              Publicado por {item.nome}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          {!isVendido && (
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1"
              onClick={trackWhatsAppClick}
            >
              <Button className="w-full bg-[#25D366] hover:bg-[#20BD5A] text-white h-12 text-base">
                <WhatsAppIcon className="w-5 h-5 mr-2" /> Chamar no WhatsApp
              </Button>
            </a>
          )}
          <div className="flex gap-2">
            <Button variant="outline" className="h-12 gap-2" onClick={handleShare}>
              <Share2 className="w-4 h-4" /> Compartilhar
            </Button>
            <Button
              variant="outline"
              className="h-12 gap-2"
              onClick={() => generateStoryImage(item)}
              title="Gerar imagem para Stories"
            >
              <Instagram className="w-4 h-4" /> Stories
            </Button>
            <Button variant="outline" className="h-12 text-destructive hover:text-destructive" onClick={handleDenunciar}>
              <Flag className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Similar ads */}
        <AnunciosSimilares currentId={item.id} categoria={item.categoria} />
      </div>
    </Layout>
  );
}

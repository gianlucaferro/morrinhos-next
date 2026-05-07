"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import Layout from "@/components/Layout";
import SEO from "@/components/SEO";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
const supabase = createBrowserSupabaseClient();
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search, Plus, X, ImagePlus, Loader2, Eye, Flag,
  ChevronLeft, ChevronRight, Clock, Filter,
  Home as HomeIcon, Car, Wheat, Smartphone, Wrench, Package,
  Send, AlertTriangle, LogIn, LogOut, User, CheckCircle2,
  ShoppingBag, Trash2, Share2, RefreshCw, MapPin, ArrowUpDown,
  Mic, MicOff, Sparkles, Heart, ZoomIn, Pencil, Save, Mail, Lock, KeyRound, Camera,
} from "lucide-react";
import { toast } from "sonner";
import WhatsAppIcon from "@/components/icons/WhatsAppIcon";
import MapaAnuncios from "@/components/MapaAnuncios";

// ===== TYPES =====

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
  foto_perfil: string | null;
};

// ===== CONSTANTS =====

const CATEGORIAS = [
  { value: "imoveis", label: "Imóveis", icon: HomeIcon },
  { value: "veiculos", label: "Veículos", icon: Car },
  { value: "agro", label: "Agro", icon: Wheat },
  { value: "eletronicos", label: "Eletrônicos", icon: Smartphone },
  { value: "servicos", label: "Serviços", icon: Wrench },
  { value: "outros", label: "Outros", icon: Package },
];

const PRECO_TIPOS = [
  { value: "fixo", label: "Preço fixo" },
  { value: "negociavel", label: "Negociável" },
  { value: "gratuito", label: "Gratuito" },
];

const MAX_FOTOS = 6;
const PAGE_SIZE = 20;

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  imoveis: [
    "casa", "apartamento", "apto", "terreno", "lote", "chácara", "fazenda", "sítio",
    "kitnet", "quitinete", "barracão", "galpão", "sala comercial", "sobrado", "edícula",
    "imóvel", "imovel", "aluguel", "alugar", "quartos", "suíte", "suite",
    "condomínio", "condominio", "cobertura", "duplex", "loteamento",
  ],
  veiculos: [
    "carro", "moto", "caminhão", "caminhao", "pickup", "picape", "van", "ônibus",
    "onibus", "bicicleta", "bike", "scooter", "quadriciclo", "jet ski",
    "fiat", "volkswagen", "vw", "chevrolet", "gm", "ford", "toyota", "honda",
    "hyundai", "renault", "peugeot", "citroen", "jeep", "nissan", "mitsubishi",
    "yamaha", "suzuki", "kawasaki", "bmw", "mercedes", "audi",
    "uno", "gol", "palio", "corsa", "civic", "corolla", "hilux", "s10",
    "onix", "hb20", "celta", "ka", "fiesta", "fusca", "kombi",
    "fan", "cg", "titan", "biz", "pop", "bros", "xre", "lander",
  ],
  agro: [
    "trator", "implemento", "colheitadeira", "plantadeira", "pulverizador",
    "semente", "adubo", "ração", "gado", "boi", "vaca", "bezerro", "cavalo",
    "galinha", "frango", "suíno", "suino", "ovino", "caprino",
    "agrícola", "agricola", "rural", "pecuária", "pecuaria", "avicultura",
    "silagem", "cerca", "arame", "ordenha", "curral", "pasto",
    "john deere", "massey", "new holland", "valtra", "case",
  ],
  eletronicos: [
    "celular", "smartphone", "iphone", "samsung", "xiaomi", "motorola",
    "notebook", "laptop", "computador", "pc", "monitor", "teclado", "mouse",
    "tablet", "ipad", "tv", "televisão", "televisao", "smart tv",
    "fone", "headset", "caixa de som", "speaker", "bluetooth",
    "câmera", "camera", "drone", "gopro", "console", "playstation", "ps5",
    "xbox", "nintendo", "switch", "videogame", "impressora", "projetor",
    "ar condicionado", "ar-condicionado", "geladeira", "freezer",
    "máquina de lavar", "maquina de lavar", "microondas", "fogão", "fogao",
  ],
  servicos: [
    "serviço", "servico", "pintura", "pintor", "eletricista", "encanador",
    "pedreiro", "carpinteiro", "marceneiro", "serralheiro", "vidraceiro",
    "faxina", "limpeza", "jardinagem", "jardineiro", "motorista", "frete",
    "mudança", "mudanca", "terraplanagem", "escavação", "escavacao",
    "aula", "professor", "curso", "consultoria", "design", "fotógrafo", "fotografo",
    "personal", "cuidador", "babá", "baba", "diarista", "costureira",
    "mecânico", "mecanico", "borracheiro", "guincho", "reboque",
  ],
};

function suggestCategory(title: string): string | null {
  const lower = title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  let bestMatch: string | null = null;
  let bestScore = 0;

  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const kw of keywords) {
      const kwNorm = kw.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      if (lower.includes(kwNorm) && kw.length > bestScore) {
        bestMatch = cat;
        bestScore = kw.length;
      }
    }
  }

  return bestMatch;
}

type Ordenacao = "recentes" | "menor_preco" | "maior_preco";

const ORDENACOES: { value: Ordenacao; label: string }[] = [
  { value: "recentes", label: "Mais recentes" },
  { value: "menor_preco", label: "Menor preço" },
  { value: "maior_preco", label: "Maior preço" },
];

// ===== HELPERS =====

const compressToWebP = (input: File | Blob, maxWidth = 800, quality = 0.8): Promise<Blob> => {
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
      if (!ctx) return reject(new Error("Canvas não suportado"));
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Falha na compressão"))),
        "image/webp",
        quality
      );
    };
    img.onerror = () => reject(new Error("Falha ao carregar imagem"));
    img.src = URL.createObjectURL(input);
  });
};

async function processFile(file: File): Promise<Blob> {
  const isHeic =
    file.type === "image/heic" ||
    file.type === "image/heif" ||
    file.name.toLowerCase().endsWith(".heic") ||
    file.name.toLowerCase().endsWith(".heif");

  let input: File | Blob = file;
  if (isHeic) {
    const heic2any = (await import("heic2any")).default;
    const converted = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.92 });
    input = Array.isArray(converted) ? converted[0] : converted;
  }

  return compressToWebP(input);
}

function formatPreco(preco: number | null, tipo: string) {
  if (tipo === "gratuito") return "Gratuito";
  if (!preco) return "Consulte";
  const formatted = preco.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  return tipo === "negociavel" ? `${formatted} (negociável)` : formatted;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

function getCatIcon(cat: string) {
  return CATEGORIAS.find((c) => c.value === cat)?.icon || Package;
}

function getCatLabel(cat: string) {
  return CATEGORIAS.find((c) => c.value === cat)?.label || cat;
}

function formatPrecoInput(raw: string) {
  const cleaned = raw.replace(/[^\d,.]/g, "");
  if (!cleaned) return "";

  const lastSep = Math.max(cleaned.lastIndexOf(","), cleaned.lastIndexOf("."));
  let intPart: string;
  let decPart: string;

  if (lastSep >= 0 && cleaned.length - lastSep <= 3) {
    intPart = cleaned.substring(0, lastSep).replace(/\D/g, "");
    decPart = cleaned.substring(lastSep + 1).replace(/\D/g, "").substring(0, 2);
  } else {
    intPart = cleaned.replace(/\D/g, "");
    decPart = "";
  }

  if (!intPart && !decPart) return "";

  const intNum = intPart ? parseInt(intPart, 10).toLocaleString("pt-BR") : "0";
  return decPart !== "" ? `${intNum},${decPart}` : intNum;
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

function formatStoredPrecoForInput(preco: number | null) {
  if (preco === null || preco === undefined) return "";
  return formatPrecoInput(preco.toString());
}

// ===== CÓDIGO DE GERENCIAMENTO =====

function generateCodigoGestao(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sem I/O/0/1 para evitar confusão
  let code = "MHS-";
  for (let i = 0; i < 5; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// ===== FAVORITOS (localStorage) =====

function useFavoritos() {
  const KEY = "mhs-favoritos";
  const [ids, setIds] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch {
      return new Set();
    }
  });

  const toggle = useCallback((id: string) => {
    setIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      localStorage.setItem(KEY, JSON.stringify([...next]));
      return next;
    });
  }, []);

  const isFav = useCallback((id: string) => ids.has(id), [ids]);

  return { toggle, isFav, count: ids.size };
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
            setIdx((i) => diff > 0
              ? (i - 1 + fotos.length) % fotos.length
              : (i + 1) % fotos.length
            );
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

      <p className="absolute top-4 left-4 text-white/60 text-sm">
        {idx + 1} / {fotos.length}
      </p>
    </div>,
    document.body
  );
}

// ===== FETCH =====

async function fetchAnuncios(): Promise<Classificado[]> {
  const { data, error } = await supabase
    .from("classificados")
    .select("*")
    .in("status", ["ativo", "vendido"])
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []) as Classificado[];
}

// ===== AUTH ICONS =====

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

// ===== LOGIN PROMPT =====

function LoginPrompt({
  onGoogle,
  onEmailLogin,
  onEmailSignUp,
  onResetPassword,
  onSkipLogin,
}: {
  onGoogle: () => void;
  onEmailLogin: (email: string, password: string) => Promise<{ error: any }>;
  onEmailSignUp: (email: string, password: string) => Promise<{ error: any }>;
  onResetPassword: (email: string) => Promise<{ error: any }>;
  onSkipLogin?: () => void;
}) {
  const [mode, setMode] = useState<"login" | "signup" | "reset">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleEmailSubmit = async () => {
    if (!email.trim()) return toast.error("Informe seu email");
    if (mode === "reset") {
      setLoading(true);
      const { error } = await onResetPassword(email.trim());
      setLoading(false);
      if (error) return toast.error(error.message || "Erro ao enviar email");
      toast.success("Email de recuperação enviado! Verifique sua caixa de entrada.");
      setMode("login");
      return;
    }
    if (!password || password.length < 6) return toast.error("Senha deve ter no mínimo 6 caracteres");
    setLoading(true);
    if (mode === "signup") {
      const { error } = await onEmailSignUp(email.trim(), password);
      setLoading(false);
      if (error) return toast.error(error.message || "Erro ao criar conta");
      toast.success("Conta criada! Verifique seu email para confirmar.");
    } else {
      const { error } = await onEmailLogin(email.trim(), password);
      setLoading(false);
      if (error) return toast.error("Email ou senha incorretos");
    }
  };

  return (
    <div className="stat-card border-primary/30 space-y-4 py-6">
      <div className="text-center">
        <LogIn className="w-8 h-8 text-primary mx-auto" />
        <p className="text-sm font-semibold text-foreground mt-2">Entre para anunciar</p>
        <p className="text-sm text-muted-foreground mt-1">
          Faça login para publicar e gerenciar seus anúncios.
        </p>
      </div>

      {/* Social login */}
      <div className="flex justify-center">
        <Button onClick={onGoogle} variant="outline" className="gap-2">
          <GoogleIcon className="w-4 h-4" /> Entrar com Google
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-muted-foreground">ou com email</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* Email form */}
      <div className="space-y-2 max-w-sm mx-auto w-full">
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="email"
            placeholder="Seu email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="pl-10"
          />
        </div>
        {mode !== "reset" && (
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="password"
              placeholder={mode === "signup" ? "Crie uma senha (mín. 6 caracteres)" : "Sua senha"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10"
              onKeyDown={(e) => e.key === "Enter" && handleEmailSubmit()}
            />
          </div>
        )}
        <Button onClick={handleEmailSubmit} disabled={loading} className="w-full gap-1.5">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
          {mode === "login" ? "Entrar" : mode === "signup" ? "Criar conta" : "Enviar email de recuperação"}
        </Button>
        <div className="flex flex-col gap-2">
          {mode === "login" ? (
            <>
              <Button
                variant="outline"
                className="w-full gap-1.5"
                onClick={() => setMode("signup")}
              >
                Não tem conta? <span className="font-bold text-primary">Criar conta grátis</span>
              </Button>
              <button onClick={() => setMode("reset")} className="text-xs text-muted-foreground hover:underline text-center">
                Esqueci minha senha
              </button>
            </>
          ) : (
            <button onClick={() => setMode("login")} className="text-sm text-primary hover:underline font-medium text-center">
              Já tenho conta — Entrar
            </button>
          )}
        </div>
      </div>

      {/* Skip login — publish with code */}
      {onSkipLogin && (
        <>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">ou sem conta</span>
            <div className="flex-1 h-px bg-border" />
          </div>
          <div className="text-center">
            <Button variant="outline" onClick={onSkipLogin} className="gap-2 text-sm h-11 w-full max-w-sm">
              <KeyRound className="w-4 h-4" /> Anunciar sem criar conta
            </Button>
            <p className="text-sm text-muted-foreground mt-2">
              Você receberá um código para gerenciar seu anúncio
            </p>
          </div>
        </>
      )}
    </div>
  );
}

// ===== GERENCIAMENTO POR CÓDIGO =====

function GerenciarComCodigo({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [codigo, setCodigo] = useState("");
  const [loading, setLoading] = useState(false);
  const [item, setItem] = useState<Classificado | null>(null);
  const [editing, setEditing] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [preco, setPreco] = useState("");
  const [precoTipo, setPrecoTipo] = useState("fixo");
  const [saving, setSaving] = useState(false);

  const buscar = async () => {
    const c = codigo.trim().toUpperCase();
    if (!c) return toast.error("Digite o código do anúncio");
    setLoading(true);
    const { data, error } = await supabase
      .from("classificados")
      .select("*")
      .eq("codigo_gestao", c)
      .single();
    setLoading(false);
    if (error || !data) return toast.error("Código não encontrado. Verifique e tente novamente.");
    setItem(data as Classificado);
    setTitulo(data.titulo);
    setDescricao(data.descricao || "");
    setPreco(data.preco ? formatPrecoInput(Math.round(data.preco * 100).toString()) : "");
    setPrecoTipo(data.preco_tipo);
  };

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["classificados"] });
    setItem(null);
    setCodigo("");
    setEditing(false);
  };

  const marcarVendido = async () => {
    if (!item) return;
    await supabase.from("classificados").update({ status: "vendido" }).eq("id", item.id);
    toast.success("Marcado como vendido!");
    invalidate();
  };

  const excluir = async () => {
    if (!item || !confirm(`Excluir "${item.titulo}"? Esta ação não pode ser desfeita.`)) return;
    await supabase.from("classificados").delete().eq("id", item.id);
    toast.success("Anúncio excluído!");
    invalidate();
  };

  const salvarEdicao = async () => {
    if (!item || !titulo.trim()) return toast.error("Título é obrigatório");
    setSaving(true);
    const { error } = await supabase
      .from("classificados")
      .update({
        titulo: titulo.trim(),
        descricao: descricao.trim() || null,
        preco: precoTipo === "gratuito" ? 0 : parsePrecoInput(preco),
        preco_tipo: precoTipo,
      } as any)
      .eq("id", item.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Anúncio atualizado!");
    invalidate();
  };

  return (
    <div className="stat-card border-primary/30 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
          <KeyRound className="w-4 h-4 text-primary" /> Gerenciar com código
        </h3>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>

      {!item ? (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Digite o código que você recebeu ao publicar seu anúncio.
          </p>
          <div className="flex gap-2">
            <Input
              placeholder="Ex: MHS-A7K3F"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.toUpperCase())}
              className="font-mono tracking-wider"
              onKeyDown={(e) => e.key === "Enter" && buscar()}
            />
            <Button onClick={buscar} disabled={loading} className="shrink-0">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Buscar"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Ad info */}
          <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
            {item.fotos[0] && (
              <img src={item.fotos[0]} alt="" className="w-16 h-16 rounded-lg object-cover shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">{item.titulo}</p>
              <p className="text-sm font-bold text-primary">{formatPreco(item.preco, item.preco_tipo)}</p>
              <p className="text-xs text-muted-foreground">
                Status: {item.status} · {item.visualizacoes} views
              </p>
            </div>
          </div>

          {!editing ? (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setEditing(true)}>
                <Pencil className="w-3 h-3" /> Editar
              </Button>
              {item.status === "ativo" && (
                <Button size="sm" variant="outline" className="gap-1.5" onClick={marcarVendido}>
                  <CheckCircle2 className="w-3 h-3" /> Vendido
                </Button>
              )}
              <Button size="sm" variant="ghost" className="gap-1.5 text-destructive" onClick={excluir}>
                <Trash2 className="w-3 h-3" /> Excluir
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Título" />
              <textarea
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 min-h-[60px] resize-y"
                placeholder="Descrição"
              />
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
                  <Input
                    placeholder="0,00"
                    value={preco}
                    onChange={(e) => setPreco(formatPrecoInput(e.target.value))}
                    className="pl-10"
                    inputMode="numeric"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={salvarEdicao} disabled={saving} className="gap-1.5">
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Salvar
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancelar</Button>
              </div>
            </div>
          )}

          <button
            onClick={() => { setItem(null); setCodigo(""); setEditing(false); }}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            ← Buscar outro código
          </button>
        </div>
      )}
    </div>
  );
}

// ===== FORM COMPONENT =====

function NovoAnuncioForm({
  onClose,
  onSuccess,
  userName,
  userId,
  isAnon,
  userProfilePhoto,
}: {
  onClose: () => void;
  onSuccess: () => void;
  userName: string;
  userId: string;
  isAnon?: boolean;
  userProfilePhoto?: string | null;
}) {
  const [codigoGerado, setCodigoGerado] = useState<string | null>(null);
  const [nome, setNome] = useState(userName);
  const [whatsapp, setWhatsapp] = useState("");
  const formatWhatsapp = (raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };
  const [categoria, setCategoria] = useState("outros");
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [preco, setPreco] = useState("");
  const [precoTipo, setPrecoTipo] = useState("fixo");
  const [bairro, setBairro] = useState("");
  const [catManual, setCatManual] = useState(false);
  const [placaVeiculo, setPlacaVeiculo] = useState("");
  const [buscandoPlaca, setBuscandoPlaca] = useState(false);

  // Auto-categorização por keywords ao digitar o título
  useEffect(() => {
    if (catManual || !titulo.trim() || titulo.trim().length < 3) return;
    const suggested = suggestCategory(titulo);
    if (suggested && suggested !== categoria) {
      setCategoria(suggested);
    }
  }, [titulo, catManual]);
  const [fotos, setFotos] = useState<{ file: File; preview: string }[]>([]);
  
  const [submitting, setSubmitting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const fileRef = useRef<HTMLInputElement>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const toggleMic = async () => {
    if (recording && mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setRecording(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
        if (audioBlob.size < 100) return;

        setTranscribing(true);
        try {
          const formData = new FormData();
          formData.append("file", audioBlob, "audio.webm");

          const { data, error } = await supabase.functions.invoke("transcribe-audio", {
            body: formData,
          });
          if (error) throw error;
          if (data?.text) {
            setDescricao((prev) => (prev ? prev + " " + data.text : data.text));
            toast.success("Áudio transcrito!");
          }
        } catch (e: any) {
          toast.error(e.message || "Erro ao transcrever áudio.");
        } finally {
          setTranscribing(false);
        }
      };

      mediaRecorder.start();
      setRecording(true);
      toast.info("Gravando... Clique novamente para parar.");
    } catch {
      toast.error("Não foi possível acessar o microfone.");
    }
  };

  const optimizeWithAI = async () => {
    if (!descricao.trim() && !titulo.trim()) {
      toast.error("Escreva ou fale algo na descrição antes de otimizar.");
      return;
    }
    setOptimizing(true);
    try {
      const { data, error } = await supabase.functions.invoke("optimize-description", {
        body: {
          titulo: titulo.trim(),
          descricao: descricao.trim(),
          categoria: getCatLabel(categoria),
        },
      });
      if (error) throw error;
      if (data?.descricao) {
        setDescricao(data.descricao);
        toast.success("Descrição otimizada com IA!");
      }
    } catch (e: any) {
      toast.error(e.message || "Erro ao otimizar descrição.");
    } finally {
      setOptimizing(false);
    }
  };

  const buscarPlaca = async () => {
    const placaNorm = placaVeiculo.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (placaNorm.length < 7) {
      toast.error("Placa inválida. Use o formato ABC1234 ou ABC1D23.");
      return;
    }
    setBuscandoPlaca(true);
    try {
      const { data, error } = await supabase.functions.invoke("consulta-placa", {
        body: { placa: placaNorm },
      });
      if (error) throw error;
      if (data?.not_configured) {
        toast.info("Consulta por placa em breve! Preencha os dados manualmente.");
        return;
      }
      if (data?.veiculo) {
        const v = data.veiculo;
        const parts: string[] = [];
        if (v.marca) parts.push(`Marca: ${v.marca}`);
        if (v.modelo) parts.push(`Modelo: ${v.modelo}`);
        if (v.ano) parts.push(`Ano: ${v.ano}`);
        if (v.ano_modelo) parts.push(`Ano Modelo: ${v.ano_modelo}`);
        if (v.cor) parts.push(`Cor: ${v.cor}`);
        if (v.combustivel) parts.push(`Combustível: ${v.combustivel}`);
        if (v.potencia) parts.push(`Potência: ${v.potencia}`);
        if (v.cilindradas) parts.push(`Cilindradas: ${v.cilindradas}`);
        if (v.tipo_veiculo) parts.push(`Tipo: ${v.tipo_veiculo}`);
        if (parts.length > 0) {
          const info = parts.join("\n");
          setDescricao((prev) => prev ? `${info}\n\n${prev}` : info);
          toast.success("Dados do veículo preenchidos na descrição!");
        } else {
          toast.info("Nenhum dado encontrado para esta placa.");
        }
      }
    } catch (e: any) {
      const msg = e?.message || "Erro ao consultar placa.";
      if (msg.includes("não encontrado")) {
        toast.error("Veículo não encontrado.");
      } else {
        toast.info("Consulta indisponível. Preencha manualmente.");
      }
    } finally {
      setBuscandoPlaca(false);
    }
  };

  const addFoto = async (file: File) => {
    if (fotos.length >= MAX_FOTOS) return toast.error(`Máximo ${MAX_FOTOS} fotos`);
    try {
      const processed = await processFile(file);
      const preview = URL.createObjectURL(processed);
      setFotos((prev) => [...prev, { file, preview }]);
    } catch (e) {
      toast.error("Erro ao processar imagem. Tente outro formato.");
    }
  };

  const removeFoto = (idx: number) => {
    setFotos((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    const errors: Record<string, string> = {};
    if (!nome.trim()) errors.nome = "Nome é obrigatório";
    const waDigits = whatsapp.replace(/\D/g, "");
    if (!waDigits) errors.whatsapp = "WhatsApp é obrigatório";
    else if (waDigits.length < 10 || waDigits.length > 11) errors.whatsapp = "WhatsApp inválido. Informe com DDD (ex: 64 99999-9999)";
    else {
      const ddd = parseInt(waDigits.slice(0, 2));
      if (ddd < 11 || ddd > 99) errors.whatsapp = "DDD inválido";
    }
    if (!titulo.trim()) errors.titulo = "Título é obrigatório";
    if (fotos.length === 0) errors.fotos = "Adicione pelo menos 1 foto";
    if (precoTipo !== "gratuito" && !parsePrecoInput(preco)) errors.preco = "Informe o preço ou selecione 'Gratuito'";

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      const firstMsg = Object.values(errors)[0];
      toast.error(firstMsg);
      return;
    }
    setFieldErrors({});

    setSubmitting(true);
    try {
      const fotoUrls: string[] = [];
      for (const foto of fotos) {
        const slug = titulo
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/\s+/g, "-")
          .replace(/[^a-z0-9-]/g, "")
          .slice(0, 30);
        const path = `${slug}-${Date.now()}-${fotoUrls.length}.webp`;
        const compressed = await processFile(foto.file);
        const { error: upErr } = await supabase.storage
          .from("classificados")
          .upload(path, compressed, { contentType: "image/webp" });
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage.from("classificados").getPublicUrl(path);
        fotoUrls.push(urlData.publicUrl);
      }

      // Usar foto de perfil do session bar
      const fotoPerfilUrl = userProfilePhoto || null;

      // Gerar código de gerenciamento para anúncios anônimos
      const codigo = isAnon ? generateCodigoGestao() : null;

      const { error } = await supabase.from("classificados").insert({
        nome: nome.trim(),
        whatsapp: whatsapp.replace(/\D/g, ""),
        categoria,
        titulo: titulo.trim(),
        descricao: descricao.trim() || null,
        preco:
          precoTipo === "gratuito"
            ? 0
            : parsePrecoInput(preco),
        preco_tipo: precoTipo,
        fotos: fotoUrls,
        user_id: userId || null,
        bairro: bairro.trim() || null,
        foto_perfil: fotoPerfilUrl,
        ...(codigo ? { codigo_gestao: codigo } : {}),
      } as any);
      if (error) throw error;

      if (codigo) {
        setCodigoGerado(codigo);
        return; // não fecha o form, mostra o código primeiro
      }

      toast.success("Anúncio publicado com sucesso!");
      onSuccess();
      onClose();
    } catch (e: any) {
      toast.error(e.message || "Erro ao publicar");
    } finally {
      setSubmitting(false);
    }
  };

  // Tela de código gerado
  if (codigoGerado) {
    return (
      <div className="stat-card border-green-500/30 space-y-4 text-center py-8">
        <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
        <div>
          <h3 className="text-lg font-bold text-foreground">Anúncio publicado!</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Salve o código abaixo para gerenciar seu anúncio:
          </p>
        </div>
        <div className="bg-muted rounded-xl py-4 px-6 inline-block mx-auto">
          <p className="text-3xl font-mono font-bold tracking-widest text-primary">{codigoGerado}</p>
        </div>
        <div className="space-y-2 max-w-sm mx-auto">
          <p className="text-sm text-muted-foreground">
            Com este código você pode editar, renovar, marcar como vendido ou excluir seu anúncio.
          </p>
          <p className="text-sm text-destructive font-medium">
            ⚠️ Anote este código! Sem ele, você não conseguirá gerenciar seu anúncio.
          </p>
          <Button
            className="w-full mt-3"
            onClick={() => {
              navigator.clipboard?.writeText(codigoGerado).then(() => toast.success("Código copiado!")).catch(() => {});
            }}
          >
            Copiar código
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              onSuccess();
              onClose();
            }}
          >
            Fechar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="stat-card border-primary/30 space-y-4 overflow-hidden max-w-full" style={{ touchAction: 'pan-y' }}>
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-foreground">
          {isAnon ? "Publicar anúncio (sem conta)" : "Publicar anúncio"}
        </h3>
        <button onClick={onClose}>
          <X className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>

      {isAnon && (
        <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-lg px-3 py-2 text-sm text-amber-800 dark:text-amber-300">
          <KeyRound className="w-3.5 h-3.5 inline mr-1" />
          Ao publicar, você receberá um <strong>código de gerenciamento</strong> para editar e controlar seu anúncio.
        </div>
      )}

      {/* Nome + WhatsApp */}
      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Input placeholder="Seu nome *" value={nome} onChange={(e) => { setNome(e.target.value); setFieldErrors((p) => ({ ...p, nome: "" })); }} className={fieldErrors.nome ? "border-destructive" : ""} />
            {fieldErrors.nome && <p className="text-xs text-destructive mt-1">{fieldErrors.nome}</p>}
          </div>
          <div>
            <Input
              placeholder="WhatsApp com DDD (ex: (64) 99999-9999) *"
              value={whatsapp}
              onChange={(e) => { setWhatsapp(formatWhatsapp(e.target.value)); setFieldErrors((p) => ({ ...p, whatsapp: "" })); }}
              inputMode="tel"
              className={fieldErrors.whatsapp ? "border-destructive" : ""}
            />
            {fieldErrors.whatsapp && <p className="text-xs text-destructive mt-1">{fieldErrors.whatsapp}</p>}
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm text-muted-foreground">Título do anúncio <span className="text-destructive">*</span></p>
          <span className={`text-xs tabular-nums ${titulo.length >= 80 ? "text-orange-500 font-medium" : "text-muted-foreground"}`}>
            {titulo.length}/90
          </span>
        </div>
        <Input
          placeholder="Ex: Casa 3 quartos no centro"
          value={titulo}
          onChange={(e) => { setTitulo(e.target.value.slice(0, 90)); setFieldErrors((p) => ({ ...p, titulo: "" })); }}
          maxLength={90}
          className={fieldErrors.titulo ? "border-destructive" : ""}
        />
        {fieldErrors.titulo && <p className="text-xs text-destructive mt-1">{fieldErrors.titulo}</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <p className="text-sm text-muted-foreground mb-1.5">Bairro / Localização</p>
          <Input
            placeholder="Ex: Centro, Setor Oeste..."
            value={bairro}
            onChange={(e) => setBairro(e.target.value)}
          />
          <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
            Apenas anúncios de Morrinhos — anúncios de outras cidades poderão ser removidos.
          </p>
        </div>
      </div>

      <div>
        <p className="text-sm text-muted-foreground mb-1.5">
          Categoria {!catManual && categoria !== "outros" && titulo.trim().length >= 3 && (
            <span className="text-primary/70">(sugerida automaticamente)</span>
          )}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIAS.map((cat) => (
            <button
              key={cat.value}
              onClick={() => { setCategoria(cat.value); setCatManual(true); }}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                categoria === cat.value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-muted-foreground border-border hover:border-primary/50"
              }`}
            >
              <cat.icon className="w-3.5 h-3.5" /> {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Campo de placa para veículos */}
      {categoria === "veiculos" && (
        <div className="rounded-lg border border-dashed border-primary/30 bg-primary/5 p-3 space-y-2">
          <div className="flex items-start gap-2">
            <Car className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Consultar placa do veículo</p>
              <p className="text-xs text-muted-foreground">
                <span className="font-semibold text-primary">Opcional</span> — não será exibida no anúncio. Serve apenas para preencher os dados do veículo automaticamente.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="ABC1D23 ou ABC1234"
              value={placaVeiculo}
              onChange={(e) => setPlacaVeiculo(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 7))}
              maxLength={7}
              className="flex-1 uppercase font-mono tracking-wider"
            />
            <Button
              type="button"
              size="sm"
              onClick={buscarPlaca}
              disabled={buscandoPlaca || placaVeiculo.length < 7}
              className="gap-1.5 shrink-0"
            >
              {buscandoPlaca ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Consultar
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <div className="relative">
          <textarea
            placeholder="Descrição (opcional — escreva ou use o microfone para ditar...)"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value.slice(0, 6000))}
            maxLength={6000}
            className={`w-full rounded-lg border bg-background px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 min-h-[180px] sm:min-h-[140px] resize-y ${recording ? "border-red-400 ring-2 ring-red-200" : ""}`}
          />
          <p className="text-xs text-muted-foreground text-right mt-0.5">{descricao.length}/6.000</p>
          <button
            type="button"
            onClick={toggleMic}
            disabled={transcribing}
            className={`absolute right-2 top-2 p-1.5 rounded-full transition-colors ${
              recording
                ? "bg-red-500 text-white animate-pulse"
                : transcribing
                ? "bg-amber-500 text-white animate-pulse"
                : "bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary"
            }`}
            title={recording ? "Parar gravação" : transcribing ? "Transcrevendo..." : "Ditar por voz"}
          >
            {transcribing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : recording ? (
              <MicOff className="w-4 h-4" />
            ) : (
              <Mic className="w-4 h-4" />
            )}
          </button>
        </div>
        {descricao.trim() && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={optimizeWithAI}
            disabled={optimizing}
            className="gap-1.5 text-xs"
          >
            {optimizing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            )}
            {optimizing ? "Otimizando..." : "Otimizar com IA"}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <p className="text-sm text-muted-foreground mb-1.5">Tipo de preço</p>
          <div className="flex gap-1.5">
            {PRECO_TIPOS.map((t) => (
              <button
                key={t.value}
                onClick={() => setPrecoTipo(t.value)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
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
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
              <Input
                placeholder="0,00"
                value={preco}
                onChange={(e) => { setPreco(formatPrecoInput(e.target.value)); setFieldErrors((p) => ({ ...p, preco: "" })); }}
                type="text"
                inputMode="numeric"
                className={`pl-10 ${fieldErrors.preco ? "border-destructive" : ""}`}
              />
            </div>
            {fieldErrors.preco && <p className="text-xs text-destructive mt-1">{fieldErrors.preco}</p>}
          </div>
        )}
      </div>

      {/* Fotos */}
      <div>
        <p className="text-sm text-muted-foreground mb-1.5">
          Fotos (mínimo 1, máximo {MAX_FOTOS}) — JPG, PNG, GIF, HEIC ou WebP <span className="text-destructive">*</span>
        </p>
        <div className="flex gap-2 flex-wrap">
          {fotos.map((f, i) => (
            <div
              key={i}
              draggable
              onDragStart={(e) => { e.dataTransfer.setData("text/plain", String(i)); e.dataTransfer.effectAllowed = "move"; }}
              onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
              onDrop={(e) => {
                e.preventDefault();
                const from = parseInt(e.dataTransfer.getData("text/plain"));
                if (isNaN(from) || from === i) return;
                setFotos((prev) => {
                  const next = [...prev];
                  const [moved] = next.splice(from, 1);
                  next.splice(i, 0, moved);
                  return next;
                });
              }}
              onTouchStart={(e) => { (e.currentTarget as any)._dragIdx = i; }}
              className="relative w-24 h-20 rounded-lg overflow-hidden border cursor-grab active:cursor-grabbing group"
            >
              <img src={f.preview} alt="" className="w-full h-full object-cover" />
              {i === 0 && (
                <span className="absolute bottom-0 left-0 right-0 bg-primary/80 text-primary-foreground text-[9px] text-center py-0.5 font-medium">
                  Capa
                </span>
              )}
              <div className="absolute top-0 left-0 bg-background/70 text-[9px] font-bold text-foreground px-1.5 py-0.5 rounded-br">
                {i + 1}
              </div>
              <button
                onClick={() => removeFoto(i)}
                className="absolute top-0 right-0 bg-background/80 rounded-bl p-1"
              >
                <X className="w-3 h-3" />
              </button>
              {i > 0 && (
                <button
                  onClick={() => setFotos((prev) => { const next = [...prev]; [next[i - 1], next[i]] = [next[i], next[i - 1]]; return next; })}
                  className="absolute bottom-0.5 left-0.5 bg-background/80 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Mover para esquerda"
                >
                  <ChevronLeft className="w-3 h-3" />
                </button>
              )}
              {i < fotos.length - 1 && (
                <button
                  onClick={() => setFotos((prev) => { const next = [...prev]; [next[i], next[i + 1]] = [next[i + 1], next[i]]; return next; })}
                  className="absolute bottom-0.5 right-0.5 bg-background/80 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Mover para direita"
                >
                  <ChevronRight className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
          {fotos.length < MAX_FOTOS && (
            <label className="w-24 h-20 rounded-lg border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 cursor-pointer flex flex-col items-center justify-center gap-1 transition-colors">
              <ImagePlus className="w-5 h-5 text-muted-foreground/40" />
              <span className="text-[9px] text-muted-foreground">Adicionar</span>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp,.heic,.heif"
                multiple
                className="hidden"
                onChange={(e) => {
                  const files = e.target.files;
                  if (files) {
                    const remaining = MAX_FOTOS - fotos.length;
                    Array.from(files).slice(0, remaining).forEach((f) => addFoto(f));
                  }
                  e.target.value = "";
                }}
              />
            </label>
          )}
        </div>
        {fotos.length > 1 && <p className="text-xs text-muted-foreground mt-1.5">Arraste as fotos para reorganizar. A primeira foto será a capa do anúncio.</p>}
        {fieldErrors.fotos && <p className="text-xs text-destructive mt-1">{fieldErrors.fotos}</p>}
      </div>

      {/* Preview */}
      {showPreview && (
        <div className="border rounded-xl overflow-hidden bg-muted/30">
          <p className="text-xs font-semibold text-muted-foreground px-3 pt-2 pb-1">Preview do anúncio:</p>
          <div className="max-w-sm mx-auto p-2">
            <div className="stat-card overflow-hidden">
              {fotos.length > 0 && (
                <div className="relative -mx-4 -mt-4 md:-mx-5 md:-mt-5 mb-3">
                  <img src={fotos[0].preview} alt="" className="w-full aspect-square object-cover" />
                  <Badge variant="secondary" className="absolute top-2 left-2 text-xs">
                    {getCatLabel(categoria)}
                  </Badge>
                </div>
              )}
              <h3 className="text-base font-bold text-foreground leading-snug">{titulo || "Título do anúncio"}</h3>
              <p className="text-lg font-bold text-primary mt-1.5">
                {precoTipo === "gratuito" ? "Gratuito" : preco ? `R$ ${preco}` : "Consulte"}
                {precoTipo === "negociavel" && preco ? " (negociável)" : ""}
              </p>
              {descricao && <p className="text-sm text-muted-foreground mt-2 line-clamp-3 leading-relaxed">{descricao}</p>}
              <div className="flex items-center gap-3 mt-3 text-sm text-muted-foreground">
                <span>{nome || "Seu nome"}</span>
                {bairro && <span className="flex items-center gap-0.5"><MapPin className="w-3.5 h-3.5" /> {bairro}</span>}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-2 pt-1">
        {!showPreview ? (
          <Button
            type="button"
            variant="outline"
            className="flex-1 sm:flex-none"
            onClick={() => {
              if (!titulo.trim()) return toast.error("Informe o título para pré-visualizar");
              setShowPreview(true);
            }}
          >
            <Eye className="w-4 h-4 mr-1" /> Pré-visualizar
          </Button>
        ) : (
          <>
            <Button onClick={handleSubmit} disabled={submitting} className="flex-1 sm:flex-none">
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1" />
              ) : (
                <Send className="w-4 h-4 mr-1" />
              )}
              Publicar anúncio
            </Button>
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              Editar
            </Button>
          </>
        )}
        <Button variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Ao publicar, seu anúncio ficará visível por 30 dias. Anúncios com denúncias serão
        encaminhados para análise do administrador.
      </p>
    </div>
  );
}

// ===== MEUS ANÚNCIOS =====

function MeusAnuncioItem({
  item,
  invalidate,
}: {
  item: Classificado;
  invalidate: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [titulo, setTitulo] = useState(item.titulo);
  const [descricao, setDescricao] = useState(item.descricao || "");
  const [categoria, setCategoria] = useState(item.categoria);
  const [preco, setPreco] = useState(formatStoredPrecoForInput(item.preco));
  const [precoTipo, setPrecoTipo] = useState(item.preco_tipo);
  const [bairro, setBairro] = useState(item.bairro || "");
  const [fotos, setFotos] = useState<string[]>(item.fotos);
  const [newFotos, setNewFotos] = useState<{ file: File; preview: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const marcarVendido = async () => {
    await supabase.from("classificados").update({ status: "vendido" }).eq("id", item.id);
    toast.success("Marcado como vendido!");
    invalidate();
  };

  const reativar = async () => {
    await supabase.from("classificados").update({ status: "ativo" }).eq("id", item.id);
    toast.success("Reativado!");
    invalidate();
  };

  const excluir = async () => {
    if (!confirm(`Excluir "${item.titulo}"? Esta ação não pode ser desfeita.`)) return;
    await supabase.from("classificados").delete().eq("id", item.id);
    toast.success("Anúncio excluído");
    invalidate();
  };

  const addNewFoto = (file: File) => {
    if (fotos.length + newFotos.length >= MAX_FOTOS) return toast.error(`Máximo ${MAX_FOTOS} fotos`);
    const reader = new FileReader();
    reader.onload = (e) =>
      setNewFotos((prev) => [...prev, { file, preview: e.target?.result as string }]);
    reader.readAsDataURL(file);
  };

  const removeExistingFoto = (idx: number) => {
    setFotos((prev) => prev.filter((_, i) => i !== idx));
  };

  const removeNewFoto = (idx: number) => {
    setNewFotos((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    if (!titulo.trim()) return toast.error("Título é obrigatório");
    setSaving(true);
    try {
      const uploadedUrls: string[] = [];
      for (const foto of newFotos) {
        const slug = titulo
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/\s+/g, "-")
          .replace(/[^a-z0-9-]/g, "")
          .slice(0, 30);
        const path = `${slug}-${Date.now()}-${uploadedUrls.length}.webp`;
        const compressed = await processFile(foto.file);
        const { error: upErr } = await supabase.storage
          .from("classificados")
          .upload(path, compressed, { contentType: "image/webp" });
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage.from("classificados").getPublicUrl(path);
        uploadedUrls.push(urlData.publicUrl);
      }

      const allFotos = [...fotos, ...uploadedUrls];

      const { error } = await supabase
        .from("classificados")
        .update({
          titulo: titulo.trim(),
          descricao: descricao.trim() || null,
          categoria,
          preco: precoTipo === "gratuito"
            ? 0
            : parsePrecoInput(preco),
          preco_tipo: precoTipo,
          bairro: bairro.trim() || null,
          fotos: allFotos,
        } as any)
        .eq("id", item.id);
      if (error) throw error;

      toast.success("Anúncio atualizado!");
      setEditing(false);
      setNewFotos([]);
      invalidate();
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = () => {
    setTitulo(item.titulo);
    setDescricao(item.descricao || "");
    setCategoria(item.categoria);
    setPreco(formatStoredPrecoForInput(item.preco));
    setPrecoTipo(item.preco_tipo);
    setBairro(item.bairro || "");
    setFotos(item.fotos);
    setNewFotos([]);
    setEditing(false);
  };

  const STATUS_LABEL: Record<string, string> = {
    ativo: "Ativo",
    vendido: "Vendido",
    removido: "Removido",
    denunciado: "Em análise",
    expirado: "Expirado",
  };

  const STATUS_COLOR: Record<string, string> = {
    ativo: "bg-green-500/15 text-green-700 dark:text-green-400",
    vendido: "bg-blue-500/15 text-blue-600",
    removido: "bg-muted text-muted-foreground",
    denunciado: "bg-destructive/15 text-destructive",
    
  };


  return (
    <div className={`rounded-xl border-2 overflow-hidden ${editing ? "border-primary/40" : "border-border"} ${item.status !== "ativo" && !editing ? "opacity-75" : ""}`}>
      {/* Header with photo */}
      <div className="flex items-start gap-3 p-4">
        {item.fotos[0] ? (
          <img
            src={item.fotos[0]}
            alt=""
            className="w-20 h-20 rounded-xl object-cover shrink-0"
          />
        ) : (
          <div className="w-20 h-20 rounded-xl bg-muted flex items-center justify-center shrink-0">
            <Package className="w-6 h-6 text-muted-foreground/30" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-bold text-foreground truncate">{item.titulo}</p>
            <Badge className={`text-xs shrink-0 font-semibold ${STATUS_COLOR[item.status] || "bg-muted"}`}>
              {STATUS_LABEL[item.status] || item.status}
            </Badge>
          </div>
          {item.preco ? (
            <p className="text-base font-bold text-primary mt-0.5">{formatPreco(item.preco, item.preco_tipo)}</p>
          ) : null}
          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
            <span className="flex items-center gap-0.5">
              <Eye className="w-3 h-3" /> {item.visualizacoes}
            </span>
            <span className="flex items-center gap-0.5">
              <Clock className="w-3 h-3" />
              {new Date(item.created_at).toLocaleDateString("pt-BR")}
            </span>
          </div>
        </div>
      </div>

      {/* Action buttons — ALWAYS visible, prominent */}
      {!editing && (
        <div className="flex items-center gap-0 border-t bg-muted/30">
          <button
            onClick={() => { setEditing(true); setExpanded(true); }}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-foreground hover:bg-primary/10 hover:text-primary transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" /> Editar
          </button>
          <div className="w-px h-6 bg-border" />
          {item.status === "ativo" && (
            <>
              <button
                onClick={marcarVendido}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Vendido
              </button>
              <div className="w-px h-6 bg-border" />
            </>
          )}
          {item.status === "vendido" && (
            <>
              <button
                onClick={reativar}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-green-600 hover:bg-green-50 dark:hover:bg-green-500/10 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Reativar
              </button>
              <div className="w-px h-6 bg-border" />
            </>
          )}
          <button
            onClick={excluir}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" /> Excluir
          </button>
        </div>
      )}

      {/* Edit form */}
      {editing && (
        <div className="space-y-3 border-t pt-4 px-4 pb-4">
          <Input
            placeholder="Título"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Bairro</p>
              <Input
                placeholder="Ex: Centro, Setor Oeste..."
                value={bairro}
                onChange={(e) => setBairro(e.target.value)}
              />
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Categoria</p>
              <div className="flex flex-wrap gap-1">
                {CATEGORIAS.map((cat) => (
                  <button
                    key={cat.value}
                    onClick={() => setCategoria(cat.value)}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors border ${
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
          </div>

          <div>
            <p className="text-sm text-muted-foreground mb-1">Descrição</p>
            <textarea
              placeholder="Descrição do anúncio..."
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 min-h-[80px] resize-y"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Tipo de preço</p>
              <div className="flex gap-1">
                {PRECO_TIPOS.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setPrecoTipo(t.value)}
                    className={`px-2 py-1 rounded-md text-xs font-medium transition-colors border ${
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
                <p className="text-sm text-muted-foreground mb-1">Preço</p>
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

          {/* Fotos management */}
          <div>
            <p className="text-sm text-muted-foreground mb-1.5">
              Fotos ({fotos.length + newFotos.length}/{MAX_FOTOS})
            </p>
            <div className="flex gap-2 flex-wrap">
              {fotos.map((url, i) => (
                <div key={`existing-${i}`} className="relative w-20 h-16 rounded-lg overflow-hidden border">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button
                    onClick={() => removeExistingFoto(i)}
                    className="absolute top-0.5 right-0.5 bg-destructive/90 text-white rounded-full p-0.5"
                    title="Remover foto"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {newFotos.map((f, i) => (
                <div key={`new-${i}`} className="relative w-20 h-16 rounded-lg overflow-hidden border border-primary/30">
                  <img src={f.preview} alt="" className="w-full h-full object-cover" />
                  <button
                    onClick={() => removeNewFoto(i)}
                    className="absolute top-0.5 right-0.5 bg-destructive/90 text-white rounded-full p-0.5"
                    title="Remover foto"
                  >
                    <X className="w-3 h-3" />
                  </button>
                  <div className="absolute bottom-0 left-0 right-0 bg-primary/80 text-[8px] text-center text-white py-0.5">
                    Nova
                  </div>
                </div>
              ))}
              {fotos.length + newFotos.length < MAX_FOTOS && (
                <label className="w-20 h-16 rounded-lg border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 cursor-pointer flex flex-col items-center justify-center gap-0.5 transition-colors">
                  <ImagePlus className="w-4 h-4 text-muted-foreground/40" />
                  <span className="text-[8px] text-muted-foreground">Adicionar</span>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp,.heic,.heif"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      const files = e.target.files;
                      if (files) {
                        const remaining = MAX_FOTOS - (fotos.length + newFotos.length);
                        Array.from(files).slice(0, remaining).forEach((f) => addNewFoto(f));
                      }
                      e.target.value = "";
                    }}
                  />
                </label>
              )}
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <Button onClick={handleSave} disabled={saving} size="sm" className="gap-1.5">
              {saving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              {saving ? "Salvando..." : "Salvar alterações"}
            </Button>
            <Button variant="ghost" size="sm" onClick={cancelEdit} disabled={saving}>
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function MeusAnuncios({ userId, onNovoAnuncio }: { userId: string; onNovoAnuncio?: () => void }) {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["meus-anuncios", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("classificados")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as Classificado[];
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["meus-anuncios", userId] });
    queryClient.invalidateQueries({ queryKey: ["classificados"] });
  };

  if (isLoading) return <div className="animate-pulse h-20 rounded-lg bg-muted" />;

  const items = data || [];

  if (items.length === 0) {
    return (
      <div className="stat-card text-center py-8">
        <ShoppingBag className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">Você ainda não publicou nenhum anúncio.</p>
        <Button
          className="mt-3 gap-1.5"
          onClick={() => {
            if (onNovoAnuncio) onNovoAnuncio();
          }}
        >
          <Plus className="w-4 h-4" /> Novo anúncio
        </Button>
      </div>
    );
  }

  const ativos = items.filter((i) => i.status === "ativo").length;
  const vendidos = items.filter((i) => i.status === "vendido").length;
  const totalViews = items.reduce((sum, i) => sum + i.visualizacoes, 0);
  const totalWaClicks = items.reduce((sum, i) => sum + ((i as any).whatsapp_clicks || 0), 0);

  return (
    <div className="space-y-3">
      {/* Stats summary */}
      <div className="grid grid-cols-4 gap-2 text-center">
        <div className="stat-card py-2">
          <p className="text-lg font-bold text-primary">{ativos}</p>
          <p className="text-sm text-muted-foreground">Ativos</p>
        </div>
        <div className="stat-card py-2">
          <p className="text-lg font-bold text-blue-500">{vendidos}</p>
          <p className="text-sm text-muted-foreground">Vendidos</p>
        </div>
        <div className="stat-card py-2">
          <p className="text-lg font-bold text-foreground">{totalViews}</p>
          <p className="text-sm text-muted-foreground">Visualizações</p>
        </div>
        <div className="stat-card py-2">
          <p className="text-lg font-bold text-[#25D366]">{totalWaClicks}</p>
          <p className="text-sm text-muted-foreground">WhatsApp</p>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">{items.length} anúncio(s) no total</p>

      {items.map((item) => (
        <MeusAnuncioItem key={item.id} item={item} invalidate={invalidate} />
      ))}
    </div>
  );
}

// ===== CARD COMPONENT =====

function AnuncioCard({
  item,
  onDenunciar,
  isFav,
  onToggleFav,
}: {
  item: Classificado;
  onDenunciar: (id: string) => void;
  isFav: boolean;
  onToggleFav: () => void;
}) {
  const [imgIdx, setImgIdx] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const CatIcon = getCatIcon(item.categoria);
  const isVendido = item.status === "vendido";
  const detailUrl = `/compra-e-venda/${item.id}`;

  // Track view
  const viewed = useRef(false);
  if (!viewed.current) {
    viewed.current = true;
    supabase
      .rpc("increment_classificado_view" as any, { classificado_id: item.id })
      .then(() => {});
  }

  // ===== MOBILE CARD (compact, OLX-style) =====
  const MobileCard = () => (
    <div className={`stat-card overflow-hidden sm:hidden ${isVendido ? "opacity-70" : ""}`}>
      <div className="flex gap-3">
        {/* Thumbnail */}
        <Link href={detailUrl} className="shrink-0">
          <div className="relative w-28 h-28 rounded-lg overflow-hidden bg-muted">
            {item.fotos.length > 0 ? (
              <img
                src={item.fotos[0]}
                alt={item.titulo}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <CatIcon className="w-8 h-8 text-muted-foreground/30" />
              </div>
            )}
            {isVendido && (
              <div className="absolute inset-0 bg-background/40 flex items-center justify-center">
                <Badge className="bg-blue-600 text-white text-[10px] px-2 py-0.5 font-bold">VENDIDO</Badge>
              </div>
            )}
            {item.fotos.length > 1 && (
              <div className="absolute bottom-1 right-1 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded-full">
                {item.fotos.length} fotos
              </div>
            )}
          </div>
        </Link>

        {/* Info */}
        <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
          <div>
            <div className="flex items-start justify-between gap-1">
              <Link href={detailUrl} className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold text-foreground leading-tight line-clamp-2 hover:text-primary transition-colors">
                  {item.titulo}
                </h3>
              </Link>
              <button
                onClick={(e) => { e.stopPropagation(); onToggleFav(); }}
                className="p-1 shrink-0 -mr-1 -mt-0.5"
                title={isFav ? "Remover dos favoritos" : "Salvar"}
              >
                <Heart className={`w-4 h-4 ${isFav ? "fill-red-500 text-red-500" : "text-muted-foreground/40"}`} />
              </button>
            </div>
            <p className="text-base font-bold text-primary mt-1">
              {formatPreco(item.preco, item.preco_tipo)}
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1.5 flex-wrap">
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
              <CatIcon className="w-2.5 h-2.5 mr-0.5" /> {getCatLabel(item.categoria)}
            </Badge>
            {item.bairro && (
              <span className="flex items-center gap-0.5 truncate">
                <MapPin className="w-3 h-3 shrink-0" /> {item.bairro}
              </span>
            )}
            <span className="flex items-center gap-0.5">
              <Clock className="w-3 h-3" /> {timeAgo(item.created_at)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  // ===== DESKTOP/TABLET CARD (grid card with carousel) =====
  const DesktopCard = () => (
    <div className={`stat-card overflow-hidden hidden sm:block ${isVendido ? "opacity-70" : ""}`}>
      {/* Image carousel */}
      {item.fotos.length > 0 ? (
        <div
          className="relative -mx-4 -mt-4 mb-3"
        >
          <Link href={detailUrl}>
            <img
              src={item.fotos[imgIdx]}
              alt={item.titulo}
              className="w-full aspect-square object-cover select-none"
              loading="lazy"
              draggable={false}
            />
          </Link>
          {/* Zoom hint */}
          <button
            onClick={(e) => { e.stopPropagation(); setLightbox(true); }}
            className="absolute bottom-2 right-2 bg-background/70 backdrop-blur-sm rounded-full p-1.5"
            title="Ampliar foto"
          >
            <ZoomIn className="w-3.5 h-3.5 text-foreground" />
          </button>
          {isVendido && (
            <div className="absolute inset-0 bg-background/40 flex items-center justify-center pointer-events-none">
              <Badge className="bg-blue-600 text-white text-sm px-4 py-1.5 font-bold">VENDIDO</Badge>
            </div>
          )}
          {item.fotos.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); setImgIdx((i) => (i - 1 + item.fotos.length) % item.fotos.length); }}
                className="absolute left-1 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur-sm rounded-full p-2 active:bg-background/95 shadow-md"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setImgIdx((i) => (i + 1) % item.fotos.length); }}
                className="absolute right-1 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur-sm rounded-full p-2 active:bg-background/95 shadow-md"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                {item.fotos.map((_, i) => (
                  <div key={i} className={`w-1.5 h-1.5 rounded-full ${i === imgIdx ? "bg-white" : "bg-white/50"}`} />
                ))}
              </div>
            </>
          )}
          <Badge variant="secondary" className="absolute top-2 left-2 text-xs">
            <CatIcon className="w-3 h-3 mr-0.5" /> {getCatLabel(item.categoria)}
          </Badge>
          <button
            onClick={(e) => { e.stopPropagation(); onToggleFav(); }}
            className="absolute top-2 right-2 bg-background/70 backdrop-blur-sm rounded-full p-1.5 transition-colors"
            title={isFav ? "Remover dos favoritos" : "Salvar nos favoritos"}
          >
            <Heart className={`w-4 h-4 ${isFav ? "fill-red-500 text-red-500" : "text-foreground"}`} />
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between mb-2">
          <Badge variant="secondary" className="text-xs">
            <CatIcon className="w-3 h-3 mr-0.5" /> {getCatLabel(item.categoria)}
          </Badge>
          <button onClick={onToggleFav} className="p-1">
            <Heart className={`w-4 h-4 ${isFav ? "fill-red-500 text-red-500" : "text-muted-foreground"}`} />
          </button>
        </div>
      )}

      {lightbox && (
        <Lightbox fotos={item.fotos} startIdx={imgIdx} onClose={() => setLightbox(false)} />
      )}

      {/* Content — click navigates to detail page */}
      <Link href={detailUrl} className="block group">
        <h3 className="text-sm font-bold text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
          {item.titulo}
        </h3>
        <p className="text-base font-bold text-primary mt-1">
          {formatPreco(item.preco, item.preco_tipo)}
        </p>
        {item.descricao && (
          <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed line-clamp-2">{item.descricao}</p>
        )}
      </Link>

      {/* Meta */}
      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground flex-wrap">
        <span className="flex items-center gap-0.5">
          <Clock className="w-3 h-3" /> {timeAgo(item.created_at)}
        </span>
        <span className="flex items-center gap-0.5">
          <Eye className="w-3 h-3" /> {item.visualizacoes}
        </span>
        {item.bairro && (
          <span className="flex items-center gap-0.5 truncate">
            <MapPin className="w-3 h-3" /> {item.bairro}
          </span>
        )}
        <span className="flex items-center gap-1">
          {item.foto_perfil ? (
            <img src={item.foto_perfil} alt="" className="w-4 h-4 rounded-full object-cover" loading="lazy" />
          ) : (
            <User className="w-3 h-3" />
          )}
          {item.nome}
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border">
        {isVendido ? (
          <p className="flex-1 text-xs text-blue-600 font-medium text-center">Vendido</p>
        ) : (
          <a
            href={`https://wa.me/55${item.whatsapp}?text=${encodeURIComponent(
              `Olá, vim pelo Morrinhos.Ai, tenho interesse no ${item.titulo}.`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1"
            onClick={() => {
              supabase
                .from("classificados")
                .update({ whatsapp_clicks: ((item as any).whatsapp_clicks || 0) + 1 } as any)
                .eq("id", item.id)
                .then(() => {});
            }}
          >
            <Button size="sm" className="w-full bg-[#25D366] hover:bg-[#20BD5A] text-white text-xs h-8">
              <WhatsAppIcon className="w-3.5 h-3.5 mr-1" /> WhatsApp
            </Button>
          </a>
        )}
        <a
          href={`https://wa.me/?text=${encodeURIComponent(
            `${item.titulo}${item.bairro ? " — " + item.bairro : ""}\n${formatPreco(item.preco, item.preco_tipo)}\n\nVeja no Compra e Venda MHS:\nhttps://morrinhos.ai/compra-e-venda/${item.id}`
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground/50 hover:text-primary transition-colors p-1"
          title="Compartilhar"
        >
          <Share2 className="w-3.5 h-3.5" />
        </a>
        <button
          onClick={() => onDenunciar(item.id)}
          className="text-muted-foreground/50 hover:text-destructive transition-colors p-1"
          title="Denunciar"
        >
          <Flag className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );

  return (
    <>
      <MobileCard />
      <DesktopCard />
    </>
  );
}

// ===== MAIN PAGE =====

export default function CompraEVendaPBA() {
  const queryClient = useQueryClient();
  const {
    user, loading: authLoading,
    signInWithGoogle, signInWithEmail, signUpWithEmail, resetPassword, signOut,
  } = useAuth();
  const favoritos = useFavoritos();
  const [creating, setCreating] = useState(false);
  const [busca, setBusca] = useState("");
  const [catFiltro, setCatFiltro] = useState<string>("todos");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [showMeus, setShowMeus] = useState(false);
  const [showFavs, setShowFavs] = useState(false);
  const [showCodeManager, setShowCodeManager] = useState(false);
  const [anonMode, setAnonMode] = useState(false);
  const [ordenacao, setOrdenacao] = useState<Ordenacao>("recentes");
  const [bairroFiltro, setBairroFiltro] = useState<string>("todos");
  const [buscaRecording, setBuscaRecording] = useState(false);
  const [buscaTranscribing, setBuscaTranscribing] = useState(false);
  const buscaMediaRef = useRef<MediaRecorder | null>(null);
  const buscaChunksRef = useRef<Blob[]>([]);
  const [userProfilePhoto, setUserProfilePhoto] = useState<string | null>(null);
  const [uploadingProfilePhoto, setUploadingProfilePhoto] = useState(false);
  const profileBarInputRef = useRef<HTMLInputElement>(null);

  // Load profile photo from user's latest ad
  useEffect(() => {
    if (!user) { setUserProfilePhoto(null); return; }
    supabase
      .from("classificados")
      .select("foto_perfil")
      .eq("user_id", user.id)
      .not("foto_perfil", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .then(({ data: ads }) => {
        if (ads?.[0]?.foto_perfil) setUserProfilePhoto(ads[0].foto_perfil);
      });
  }, [user]);

  const handleProfilePhotoUpload = async (file: File) => {
    if (!user) return;
    setUploadingProfilePhoto(true);
    try {
      const processed = await processFile(file);
      const path = `perfil-${user.id}-${Date.now()}.webp`;
      const { error: upErr } = await supabase.storage
        .from("classificados")
        .upload(path, processed, { contentType: "image/webp" });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("classificados").getPublicUrl(path);
      const url = urlData.publicUrl;
      setUserProfilePhoto(url);
      // Update all user's ads with new profile photo
      await supabase
        .from("classificados")
        .update({ foto_perfil: url } as any)
        .eq("user_id", user.id);
      toast.success("Foto de perfil atualizada!");
    } catch {
      toast.error("Erro ao enviar foto de perfil.");
    } finally {
      setUploadingProfilePhoto(false);
    }
  };
  const { data, isLoading } = useQuery({
    queryKey: ["classificados"],
    queryFn: fetchAnuncios,
    staleTime: 1000 * 60 * 2,
  });

  const bairrosUnicos = useMemo(() => {
    if (!data) return [];
    const set = new Set<string>();
    data.forEach((c) => { if (c.bairro) set.add(c.bairro); });
    return Array.from(set).sort();
  }, [data]);

  const catCount = useMemo(() => {
    if (!data) return {} as Record<string, number>;
    const counts: Record<string, number> = {};
    data.forEach((c) => { counts[c.categoria] = (counts[c.categoria] || 0) + 1; });
    return counts;
  }, [data]);

  const toggleBuscaMic = async () => {
    if (buscaRecording && buscaMediaRef.current) {
      buscaMediaRef.current.stop();
      setBuscaRecording(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: "audio/webm" });
      buscaMediaRef.current = mr;
      buscaChunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) buscaChunksRef.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(buscaChunksRef.current, { type: "audio/webm" });
        if (blob.size < 100) return;
        setBuscaTranscribing(true);
        try {
          const formData = new FormData();
          formData.append("file", blob, "audio.webm");
          const { data: res, error } = await supabase.functions.invoke("transcribe-audio", { body: formData });
          if (error) throw error;
          if (res?.text) { setBusca(res.text); setVisibleCount(PAGE_SIZE); toast.success("Busca por voz aplicada!"); }
        } catch { toast.error("Erro na busca por voz."); }
        finally { setBuscaTranscribing(false); }
      };
      mr.start();
      setBuscaRecording(true);
      toast.info("Fale o que deseja buscar...");
    } catch { toast.error("Não foi possível acessar o microfone."); }
  };

  const filtered = useMemo(() => {
    if (!data) return [];
    let items = data;
    if (showFavs) {
      items = items.filter((c) => favoritos.isFav(c.id));
    }
    if (catFiltro !== "todos") {
      items = items.filter((c) => c.categoria === catFiltro);
    }
    if (bairroFiltro !== "todos") {
      items = items.filter((c) => c.bairro === bairroFiltro);
    }
    if (busca.trim()) {
      const q = busca.toLowerCase();
      items = items.filter(
        (c) =>
          c.titulo.toLowerCase().includes(q) ||
          c.descricao?.toLowerCase().includes(q) ||
          c.nome.toLowerCase().includes(q) ||
          c.bairro?.toLowerCase().includes(q)
      );
    }
    // Ordenação
    if (ordenacao === "menor_preco") {
      items = [...items].sort((a, b) => (a.preco || Infinity) - (b.preco || Infinity));
    } else if (ordenacao === "maior_preco") {
      items = [...items].sort((a, b) => (b.preco || 0) - (a.preco || 0));
    } else {
      // Híbrido: agrupa por faixa temporal, shuffle dentro de cada faixa
      // e aplica boost por completude (fotos + descrição + bairro)
      const now = Date.now();
      const DAY = 86400000;
      const getBucket = (ts: number) => {
        const age = now - ts;
        if (age < DAY) return 0;       // hoje
        if (age < 3 * DAY) return 1;   // últimos 3 dias
        if (age < 7 * DAY) return 2;   // última semana
        if (age < 14 * DAY) return 3;  // últimas 2 semanas
        return 4;                       // mais antigos
      };
      const getScore = (c: Classificado) => {
        let s = 0;
        if (c.fotos.length > 0) s += 2;
        if (c.fotos.length >= 3) s += 1;
        if (c.descricao && c.descricao.length > 30) s += 2;
        if (c.bairro) s += 1;
        if (c.preco && c.preco > 0) s += 1;
        return s;
      };
      items = [...items].sort((a, b) => {
        const bucketA = getBucket(new Date(a.created_at).getTime());
        const bucketB = getBucket(new Date(b.created_at).getTime());
        if (bucketA !== bucketB) return bucketA - bucketB;
        // Dentro do mesmo bucket: score desc + jitter aleatório estável por sessão
        const scoreA = getScore(a);
        const scoreB = getScore(b);
        if (scoreA !== scoreB) return scoreB - scoreA;
        // Jitter determinístico (baseado no id, muda a cada hora)
        const hour = Math.floor(now / (60 * 60 * 1000));
        const hashA = (a.id.charCodeAt(0) + a.id.charCodeAt(5) + hour) % 100;
        const hashB = (b.id.charCodeAt(0) + b.id.charCodeAt(5) + hour) % 100;
        return hashA - hashB;
      });
    }
    return items;
  }, [data, catFiltro, bairroFiltro, busca, ordenacao, showFavs, favoritos]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  const handleDenunciar = async (id: string) => {
    if (!confirm("Deseja denunciar este anúncio como inapropriado?")) return;
    await supabase.rpc("denunciar_classificado" as any, { classificado_id: id });
    toast.success("Denúncia registrada. Obrigado por ajudar a manter a comunidade segura.");
    queryClient.invalidateQueries({ queryKey: ["classificados"] });
  };

  const handleAnunciar = () => {
    setCreating(true);
  };

  return (
    <Layout>
      <SEO
        title="Classificados Morrinhos | Compra e Venda MHS Grátis"
        description="Classificados Morrinhos GO — Anúncios gratuitos de compra e venda. Encontre imóveis, veículos, eletrônicos e serviços. Alternativa OLX Morrinhos com contato direto via WhatsApp. Anuncie grátis agora!"
        path="/compra-e-venda"
        jsonLd={visible.length > 0 ? {
          "@context": "https://schema.org",
          "@type": "ItemList",
          "name": "Compra e Venda MHS — Classificados de Morrinhos",
          "description": "Anúncios gratuitos de compra e venda em Morrinhos, Goiás",
          "numberOfItems": filtered.length,
          "itemListElement": visible.slice(0, 10).map((item, i) => ({
            "@type": "ListItem",
            "position": i + 1,
            "url": `https://morrinhos.ai/compra-e-venda/${item.id}`,
            "name": item.titulo,
            "image": item.fotos[0] || undefined,
          })),
        } : undefined}
      />
      <div className="container w-full max-w-full px-4 sm:px-6 py-6 space-y-5 overflow-x-hidden box-border" style={{ overscrollBehaviorX: 'none', touchAction: 'pan-y pinch-zoom' }}>
        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Package className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-bold text-foreground">
              Compra e Venda <span className="text-[#25D366]">MHS</span>
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Compre, venda e anuncie grátis em Morrinhos.
          </p>
        </div>

        {/* Session bar */}
        {!authLoading && (
          <div className="flex items-center justify-between gap-3 bg-muted/50 rounded-xl px-4 py-2.5 border">
            {user ? (
              <>
                <div className="flex items-center gap-2.5 min-w-0">
                  <input
                    ref={profileBarInputRef}
                    type="file"
                    accept="image/*,.heic,.heif"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) await handleProfilePhotoUpload(file);
                      e.target.value = "";
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => profileBarInputRef.current?.click()}
                    className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden relative group border-2 border-dashed border-primary/30 hover:border-primary/60 transition-colors"
                    title="Alterar foto de perfil"
                  >
                    {uploadingProfilePhoto ? (
                      <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    ) : userProfilePhoto ? (
                      <>
                        <img src={userProfilePhoto} alt="" className="w-12 h-12 rounded-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-full">
                          <Camera className="w-4 h-4 text-white" />
                        </div>
                      </>
                    ) : user.user_metadata?.avatar_url ? (
                      <>
                        <img src={user.user_metadata.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-full">
                          <Camera className="w-4 h-4 text-white" />
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center gap-0.5">
                        <Camera className="w-4 h-4 text-primary" />
                        <span className="text-[8px] text-primary font-medium leading-none">Foto</span>
                      </div>
                    )}
                  </button>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {user.user_metadata?.full_name || user.email?.split("@")[0] || "Usuário"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    {!userProfilePhoto && (
                      <button
                        type="button"
                        onClick={() => profileBarInputRef.current?.click()}
                        className="text-[10px] text-primary hover:underline mt-0.5"
                      >
                        📷 Adicionar foto de perfil
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    size="sm"
                    variant={showMeus ? "default" : "outline"}
                    className="gap-1.5 h-9"
                    onClick={() => setShowMeus(!showMeus)}
                  >
                    <User className="w-4 h-4" />
                    <span className="hidden sm:inline">Meus anúncios</span>
                    <span className="sm:hidden">Meus</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="gap-1.5 h-9 text-muted-foreground hover:text-destructive"
                    onClick={signOut}
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="hidden sm:inline">Sair</span>
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  <LogIn className="w-4 h-4 inline mr-1.5 -mt-0.5" />
                  Faça login para publicar e gerenciar anúncios
                </p>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button size="sm" variant="outline" className="gap-1.5 h-9" onClick={signInWithGoogle}>
                    <GoogleIcon className="w-4 h-4" /> Google
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="gap-1 text-sm text-muted-foreground"
                    onClick={() => setShowCodeManager(!showCodeManager)}
                    title="Gerenciar com código"
                  >
                    <KeyRound className="w-4 h-4" />
                    <span className="hidden sm:inline">Código</span>
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Gerenciar com código */}
        {showCodeManager && !user && (
          <GerenciarComCodigo onClose={() => setShowCodeManager(false)} />
        )}

        {/* Meus Anúncios */}
        {showMeus && user && (
          <div className="space-y-3 bg-muted/30 rounded-xl p-4 border">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <User className="w-5 h-5 text-primary" /> Meus anúncios
              </h2>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 text-xs gap-1"
                onClick={() => setShowMeus(false)}
              >
                <X className="w-3.5 h-3.5" /> Fechar
              </Button>
            </div>
            <MeusAnuncios userId={user.id} onNovoAnuncio={() => { setShowMeus(false); setCreating(true); }} />
          </div>
        )}

        {/* Actions bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar anúncios..."
              value={busca}
              onChange={(e) => {
                setBusca(e.target.value);
                setVisibleCount(PAGE_SIZE);
              }}
              className="w-full pl-9 pr-20 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <button
                onClick={toggleBuscaMic}
                disabled={buscaTranscribing}
                className={`p-1.5 rounded-full transition-colors ${
                  buscaRecording
                    ? "bg-red-500 text-white animate-pulse"
                    : buscaTranscribing
                    ? "bg-amber-500 text-white animate-pulse"
                    : "text-muted-foreground hover:text-primary hover:bg-primary/10"
                }`}
                title={buscaRecording ? "Parar" : buscaTranscribing ? "Transcrevendo..." : "Buscar por voz"}
              >
                {buscaTranscribing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : buscaRecording ? (
                  <MicOff className="w-4 h-4" />
                ) : (
                  <Mic className="w-4 h-4" />
                )}
              </button>
              <button
                onClick={() => setShowFavs(!showFavs)}
                className={`p-1.5 rounded-full transition-colors ${
                  showFavs ? "text-red-500" : "text-muted-foreground hover:text-red-500"
                }`}
                title={showFavs ? "Mostrar todos" : `Favoritos (${favoritos.count})`}
              >
                <Heart className={`w-4 h-4 ${showFavs ? "fill-red-500" : ""}`} />
              </button>
            </div>
          </div>
          <Button onClick={handleAnunciar} disabled={creating}>
            <Plus className="w-4 h-4 mr-1" /> Anunciar grátis
          </Button>
        </div>

        {/* Category filters */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap">
          <button
            onClick={() => {
              setCatFiltro("todos");
              setVisibleCount(PAGE_SIZE);
            }}
            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors border shrink-0 ${
              catFiltro === "todos"
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-muted-foreground border-border hover:border-primary/50"
            }`}
          >
            <Filter className="w-3 h-3" /> Todos {data ? `(${data.length})` : ""}
          </button>
          {CATEGORIAS.map((cat) => (
            <button
              key={cat.value}
              onClick={() => {
                setCatFiltro(cat.value);
                setVisibleCount(PAGE_SIZE);
              }}
              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors border shrink-0 ${
                catFiltro === cat.value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-muted-foreground border-border hover:border-primary/50"
              }`}
            >
              <cat.icon className="w-3 h-3" /> {cat.label} {catCount[cat.value] ? `(${catCount[cat.value]})` : ""}
            </button>
          ))}
        </div>

        {/* Bairro filter + Sort */}
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          {bairrosUnicos.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide shrink-0">
              <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <button
                onClick={() => setBairroFiltro("todos")}
                className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors border shrink-0 ${
                  bairroFiltro === "todos"
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-muted-foreground border-border hover:border-primary/50"
                }`}
              >
                Todos
              </button>
              {bairrosUnicos.map((b) => (
                <button
                  key={b}
                  onClick={() => setBairroFiltro(b)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors border shrink-0 ${
                    bairroFiltro === b
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-muted-foreground border-border hover:border-primary/50"
                  }`}
                >
                  {b}
                </button>
              ))}
            </div>
          )}

          {/* Sort */}
          <div className="flex items-center gap-1.5 ml-auto shrink-0">
            <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground" />
            {ORDENACOES.map((o) => (
              <button
                key={o.value}
                onClick={() => setOrdenacao(o.value)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors border shrink-0 ${
                  ordenacao === o.value
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-muted-foreground border-border hover:border-primary/50"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        {/* Mapa */}
        <MapaAnuncios anuncios={filtered} />

        {/* Count */}
        <p className="text-sm text-muted-foreground">
          {filtered.length} anúncio(s) encontrado(s){showFavs ? " (favoritos)" : ""}
        </p>

        {/* Create form or login prompt */}
        {creating && (
          (user || anonMode) ? (
            <NovoAnuncioForm
              key="novo-anuncio-form"
              onClose={() => { setCreating(false); setAnonMode(false); }}
              onSuccess={() => {
                queryClient.invalidateQueries({ queryKey: ["classificados"] });
                if (user) queryClient.invalidateQueries({ queryKey: ["meus-anuncios", user.id] });
              }}
              userName={
                user?.user_metadata?.full_name
                || user?.user_metadata?.name
                || user?.user_metadata?.preferred_username
                || ""
              }
              userId={user?.id || ""}
              isAnon={!user}
              userProfilePhoto={userProfilePhoto}
            />
          ) : (
            <LoginPrompt
              onGoogle={signInWithGoogle}
              onEmailLogin={signInWithEmail}
              onEmailSignUp={signUpWithEmail}
              onResetPassword={resetPassword}
              onSkipLogin={() => setAnonMode(true)}
            />
          )
        )}

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
        )}

        {/* Empty state */}
        {!isLoading && filtered.length === 0 && (
          <div className="stat-card flex flex-col items-center justify-center py-12 text-center">
            <Package className="w-10 h-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium text-foreground">
              {busca || catFiltro !== "todos"
                ? "Nenhum anúncio encontrado"
                : "Nenhum anúncio publicado ainda"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {busca || catFiltro !== "todos"
                ? "Tente outros filtros ou termos de busca"
                : "Seja o primeiro a publicar um anúncio!"}
            </p>
            {!creating && (
              <Button size="sm" className="mt-4" onClick={handleAnunciar}>
                <Plus className="w-4 h-4 mr-1" /> Anunciar grátis
              </Button>
            )}
          </div>
        )}

        {/* Grid */}
        {!isLoading && filtered.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-3">
            {visible.map((item) => (
              <AnuncioCard
                key={item.id}
                item={item}
                onDenunciar={handleDenunciar}
                isFav={favoritos.isFav(item.id)}
                onToggleFav={() => favoritos.toggle(item.id)}
              />
            ))}
          </div>
        )}

        {/* Load more */}
        {hasMore && (
          <div className="flex justify-center pt-2">
            <Button variant="outline" onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}>
              Ver mais anúncios
            </Button>
          </div>
        )}

        {/* Footer info */}
        <div className="stat-card bg-muted/30 space-y-2 mt-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
            <div className="text-xs text-muted-foreground space-y-1">
              <p>
                O Morrinhos.ai não se responsabiliza pelas transações entre usuários. Negocie com
                segurança.
              </p>
              <p>
                Anúncios com denúncias são encaminhados para análise do administrador, que poderá
                removê-los ou restaurá-los.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

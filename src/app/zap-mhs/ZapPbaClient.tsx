"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type FormEvent,
  type MouseEvent,
} from "react";
import {
  ArrowUpDown,
  Briefcase,
  Car,
  ChevronLeft,
  ChevronRight,
  Cpu,
  Dog,
  Dumbbell,
  Flame,
  Gift,
  GraduationCap,
  HardHat,
  Heart,
  Home,
  Hotel,
  MessageSquare,
  MoreHorizontal,
  Palette,
  PawPrint,
  PersonStanding,
  Pill,
  Plus,
  Scale,
  Search,
  Share2,
  Shirt,
  ShoppingCart,
  Sofa,
  Sparkles,
  Store,
  Tractor,
  UtensilsCrossed,
  Wrench,
  X,
} from "lucide-react";
import WhatsAppIcon from "@/components/icons/WhatsAppIcon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

type ZapEstabelecimento = {
  id: string;
  name: string;
  whatsapp: string;
  category: string | null;
  click_count: number | null;
  created_at: string | null;
};

type SortMode = "recent" | "popular";

const supabase = createBrowserSupabaseClient();

const CATEGORIES = [
  "Alimentação",
  "Supermercados",
  "Saúde",
  "Beleza e Estética",
  "Farmácia e Drogaria",
  "Advogados",
  "Educação",
  "Esportes",
  "Automotivo",
  "Agro",
  "Moda e Vestuário",
  "Serviços Especializados",
  "Materiais de Construção",
  "Móveis e Decoração",
  "Pet Shop",
  "Veterinários",
  "Personal Trainer",
  "Imobiliário",
  "Hospedagem e Turismo",
  "Papelaria e Presentes",
  "Artesanato",
  "Serviços Gerais",
  "Tecnologia",
  "Outros",
];

const CATEGORY_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  Alimentação: UtensilsCrossed,
  Supermercados: ShoppingCart,
  Saúde: Heart,
  "Beleza e Estética": Sparkles,
  "Farmácia e Drogaria": Pill,
  Advogados: Scale,
  Educação: GraduationCap,
  Esportes: Dumbbell,
  Automotivo: Car,
  Agro: Tractor,
  "Moda e Vestuário": Shirt,
  "Serviços Especializados": Briefcase,
  "Materiais de Construção": HardHat,
  "Móveis e Decoração": Sofa,
  "Pet Shop": PawPrint,
  Veterinários: Dog,
  "Personal Trainer": PersonStanding,
  Imobiliário: Home,
  "Hospedagem e Turismo": Hotel,
  "Papelaria e Presentes": Gift,
  Artesanato: Palette,
  "Serviços Gerais": Wrench,
  Tecnologia: Cpu,
  Outros: MoreHorizontal,
};

function CategoryIcon({ category, className }: { category: string; className?: string }) {
  const Icon = CATEGORY_ICONS[category] || Store;
  return <Icon className={className} />;
}

function normalizeStr(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function extractWhatsappDigits(value: string) {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("55") && digits.length >= 12) {
    digits = digits.slice(2);
  }
  if (digits.length > 11) {
    digits = digits.slice(-11);
  }
  return digits;
}

function maskWhatsapp(value: string) {
  const digits = extractWhatsappDigits(value);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function formatPhone(value: string) {
  const digits = extractWhatsappDigits(value);
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return value;
}

function toWhatsappLink(value: string) {
  const digits = extractWhatsappDigits(value);
  const message = encodeURIComponent("Olá, vim pelo Morrinhos.Ai");
  return `https://wa.me/55${digits}?text=${message}`;
}

function isNewEstablishment(createdAt: string | null) {
  if (!createdAt) return false;
  const created = new Date(createdAt).getTime();
  if (Number.isNaN(created)) return false;
  return Date.now() - created < 7 * 24 * 60 * 60 * 1000;
}

function shuffleByDay(items: ZapEstabelecimento[]) {
  const today = new Date();
  const seed =
    today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const mixed = Math.imul(seed + i, 2654435761) >>> 0;
    const j = mixed % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function CategoryScrollArea({
  catFilter,
  setCatFilter,
  availableCategories,
}: {
  catFilter: string | null;
  setCatFilter: (value: string | null) => void;
  availableCategories: string[];
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener("scroll", checkScroll, { passive: true });
    const resizeObserver = new ResizeObserver(checkScroll);
    resizeObserver.observe(el);
    return () => {
      el.removeEventListener("scroll", checkScroll);
      resizeObserver.disconnect();
    };
  }, [availableCategories, checkScroll]);

  function scroll(direction: "left" | "right") {
    scrollRef.current?.scrollBy({
      left: direction === "left" ? -220 : 220,
      behavior: "smooth",
    });
  }

  return (
    <div className="relative">
      {canScrollLeft && (
        <div className="absolute left-0 top-0 bottom-2 z-10 flex items-center">
          <div className="absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-background to-transparent" />
          <button
            type="button"
            onClick={() => scroll("left")}
            className="relative ml-0.5 flex h-7 w-7 items-center justify-center rounded-full border border-border bg-background/95 shadow-sm transition-colors hover:bg-muted"
            aria-label="Rolar categorias para esquerda"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        </div>
      )}

      {canScrollRight && (
        <div className="absolute right-0 top-0 bottom-2 z-10 flex items-center">
          <div className="absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-background to-transparent" />
          <button
            type="button"
            onClick={() => scroll("right")}
            className="relative mr-0.5 flex h-7 w-7 items-center justify-center rounded-full border border-border bg-background/95 shadow-sm transition-colors hover:bg-muted"
            aria-label="Rolar categorias para direita"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto px-1 pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <button
          type="button"
          onClick={() => setCatFilter(null)}
          className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
            !catFilter
              ? "bg-[#25D366] text-white"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          Todos
        </button>
        {availableCategories.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => setCatFilter(catFilter === category ? null : category)}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors ${
              catFilter === category
                ? "bg-[#25D366] text-white"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            <CategoryIcon category={category} className="h-3.5 w-3.5" />
            {category}
          </button>
        ))}
      </div>
    </div>
  );
}

function shareEstablishment(event: MouseEvent<HTMLButtonElement>, item: ZapEstabelecimento) {
  event.preventDefault();
  event.stopPropagation();

  const text = `${item.name} - WhatsApp: ${formatPhone(item.whatsapp)}
Fale direto: ${toWhatsappLink(item.whatsapp)}

Via Morrinhos.Ai`;

  if (navigator.share) {
    void navigator.share({ title: item.name, text }).catch(() => undefined);
    return;
  }

  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
}

function EstablishmentCard({
  item,
  onSuggest,
}: {
  item: ZapEstabelecimento;
  onSuggest: (item: ZapEstabelecimento) => void;
}) {
  const clickCount = item.click_count || 0;
  const isNew = isNewEstablishment(item.created_at);

  function handleClick() {
    void supabase.rpc("increment_click_count", { establishment_id: item.id });
  }

  return (
    <div className="group relative flex min-h-[76px] items-center gap-3 rounded-xl border border-border bg-card p-3.5 transition-all hover:border-[#25D366]/50 hover:shadow-md sm:p-4">
      <a
        href={toWhatsappLink(item.whatsapp)}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        className="absolute inset-0 z-10"
        aria-label={`Falar com ${item.name} no WhatsApp`}
      />

      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#25D366]/10 transition-colors group-hover:bg-[#25D366]/20 sm:h-12 sm:w-12">
        <WhatsAppIcon className="h-5 w-5 sm:h-6 sm:w-6" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate text-[15px] font-semibold leading-tight text-foreground transition-colors group-hover:text-[#25D366] sm:text-base">
            {item.name}
          </p>
          {isNew && (
            <Badge className="h-5 shrink-0 border-amber-500/30 bg-amber-500/15 px-1.5 py-0 text-[10px] font-semibold text-amber-700">
              Novo
            </Badge>
          )}
        </div>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {formatPhone(item.whatsapp)}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          {item.category && (
            <Badge
              variant="secondary"
              className="inline-flex items-center gap-1 px-2 py-0 text-[11px]"
            >
              <CategoryIcon category={item.category} className="h-3 w-3" />
              {item.category}
            </Badge>
          )}
          {clickCount > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <Flame className="h-3 w-3 text-orange-500" />
              {clickCount} {clickCount === 1 ? "contato" : "contatos"}
            </span>
          )}
        </div>
      </div>

      <div className="relative z-20 flex flex-col gap-1">
        <button
          type="button"
          onClick={(event) => shareEstablishment(event, item)}
          className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-muted"
          aria-label={`Compartilhar ${item.name}`}
          title="Compartilhar"
        >
          <Share2 className="h-4 w-4 text-muted-foreground" />
        </button>
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onSuggest(item);
          }}
          className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-muted"
          aria-label={`Sugerir correção para ${item.name}`}
          title="Sugerir correção"
        >
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
}

function RegistrationForm({
  onSubmitted,
  prefillName,
}: {
  onSubmitted: () => void;
  prefillName: string;
}) {
  const [name, setName] = useState(prefillName);
  const [whatsapp, setWhatsapp] = useState("");
  const [category, setCategory] = useState("");
  const [duplicateFound, setDuplicateFound] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const whatsappDigits = extractWhatsappDigits(whatsapp);
  const hasDuplicate = whatsappDigits.length >= 10 && duplicateFound;

  useEffect(() => {
    if (whatsappDigits.length < 10) {
      return;
    }

    let cancelled = false;
    const timeout = window.setTimeout(async () => {
      const { data } = await supabase
        .from("zap_establishments")
        .select("id")
        .eq("whatsapp", whatsappDigits)
        .limit(1);
      if (!cancelled) {
        setDuplicateFound(Boolean(data?.length));
      }
    }, 400);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [whatsappDigits]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");

    if (!name.trim()) {
      setErrorMessage("Informe o nome do estabelecimento.");
      return;
    }
    if (whatsappDigits.length < 10) {
      setErrorMessage("Informe um WhatsApp com DDD.");
      return;
    }
    if (hasDuplicate) {
      setErrorMessage("Esse contato já existe na base do Zap MHS.");
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from("zap_establishments").insert({
      name: name.trim(),
      whatsapp: whatsappDigits,
      category: category || null,
      status: "pending",
    });
    setSubmitting(false);

    if (error) {
      if (error.code === "23505") {
        setDuplicateFound(true);
        setErrorMessage("Esse contato já existe na base do Zap MHS.");
        return;
      }
      setErrorMessage("Não foi possível enviar o cadastro agora. Tente novamente.");
      return;
    }

    onSubmitted();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 px-1">
      <div className="space-y-2">
        <Label htmlFor="zap-est-name">Nome do estabelecimento *</Label>
        <Input
          id="zap-est-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Ex: Padaria do João"
          required
          maxLength={120}
          className="h-12 text-base"
          autoComplete="organization"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="zap-est-whatsapp">WhatsApp com DDD *</Label>
        <Input
          id="zap-est-whatsapp"
          value={whatsapp}
          onChange={(event) => {
            setDuplicateFound(false);
            setWhatsapp(maskWhatsapp(event.target.value));
          }}
          onPaste={(event) => {
            event.preventDefault();
            setDuplicateFound(false);
            setWhatsapp(maskWhatsapp(event.clipboardData.getData("text")));
          }}
          placeholder="(64) 99999-9999"
          required
          maxLength={20}
          inputMode="tel"
          className="h-12 text-base"
          autoComplete="tel"
        />
        {hasDuplicate && (
          <p className="text-sm font-medium text-amber-700">
            Esse contato já existe em nossa base. Obrigado!
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="zap-est-category">Categoria</Label>
        <Select value={category} onValueChange={(value) => setCategory(value || "")}>
          <SelectTrigger
            id="zap-est-category"
            className="h-12 w-full text-base"
            aria-label="Categoria do estabelecimento"
          >
            <SelectValue placeholder="Selecione uma categoria" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((item) => (
              <SelectItem key={item} value={item} className="py-3 text-base">
                <span className="inline-flex items-center gap-2">
                  <CategoryIcon category={item} className="h-4 w-4" />
                  {item}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {errorMessage && (
        <p className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {errorMessage}
        </p>
      )}

      <Button
        type="submit"
        className="h-12 w-full rounded-xl bg-[#25D366] text-base font-semibold text-white hover:bg-[#1da851]"
        disabled={submitting || hasDuplicate || !name.trim() || whatsappDigits.length < 10}
      >
        {submitting ? "Enviando..." : "Enviar cadastro"}
      </Button>
    </form>
  );
}

function SuggestionModal({
  establishment,
  open,
  onOpenChange,
}: {
  establishment: ZapEstabelecimento | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!establishment || !text.trim()) return;

    setSubmitting(true);
    setErrorMessage("");
    const { error } = await supabase.from("zap_suggestions").insert({
      establishment_id: establishment.id,
      suggestion_text: text.trim(),
    });
    setSubmitting(false);

    if (error) {
      setErrorMessage("Não foi possível enviar a sugestão agora.");
      return;
    }

    setSubmitted(true);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sugerir correção</DialogTitle>
          <DialogDescription>
            {establishment ? `Sugira uma correção para "${establishment.name}".` : ""}
          </DialogDescription>
        </DialogHeader>

        {submitted ? (
          <div className="space-y-4">
            <p className="rounded-lg border border-[#25D366]/30 bg-[#25D366]/10 px-3 py-2 text-sm text-foreground">
              Sugestão enviada. Obrigado pela colaboração.
            </p>
            <Button className="w-full" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Textarea
              placeholder="Ex: O número correto é (64) 99999-9999"
              value={text}
              onChange={(event) => setText(event.target.value)}
              maxLength={500}
              className="min-h-[112px] text-base"
              required
            />
            {errorMessage && (
              <p className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {errorMessage}
              </p>
            )}
            <Button
              type="submit"
              className="h-11 w-full bg-[#25D366] text-white hover:bg-[#1da851]"
              disabled={submitting || !text.trim()}
            >
              {submitting ? "Enviando..." : "Enviar sugestão"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function ZapPbaClient({
  initialEstabelecimentos,
}: {
  initialEstabelecimentos: ZapEstabelecimento[];
}) {
  const [busca, setBusca] = useState("");
  const [catFilter, setCatFilter] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [prefillName, setPrefillName] = useState("");
  const [registrationSubmitted, setRegistrationSubmitted] = useState(false);
  const [suggestionTarget, setSuggestionTarget] = useState<ZapEstabelecimento | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>("recent");

  const availableCategories = useMemo(() => {
    const categories = new Set<string>();
    initialEstabelecimentos.forEach((item) => {
      if (item.category) categories.add(item.category);
    });
    return Array.from(categories).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [initialEstabelecimentos]);

  const filtered = useMemo(() => {
    let result = initialEstabelecimentos;

    if (catFilter) {
      result = result.filter((item) => item.category === catFilter);
    }

    if (busca.trim()) {
      const query = normalizeStr(busca.trim());
      result = result.filter(
        (item) =>
          normalizeStr(item.name).includes(query) ||
          normalizeStr(item.category || "").includes(query),
      );
    }

    if (sortMode === "popular") {
      result = [...result].sort((a, b) => (b.click_count || 0) - (a.click_count || 0));
    }

    const pinnedFirst: ZapEstabelecimento[] = [];
    const pinnedSecond: ZapEstabelecimento[] = [];
    const rest: ZapEstabelecimento[] = [];

    result.forEach((item) => {
      const normalizedName = normalizeStr(item.name);
      if (normalizedName.includes("vitorino perfumes")) {
        pinnedFirst.push(item);
      } else if (normalizedName.includes("viaggi vistos")) {
        pinnedSecond.push(item);
      } else {
        rest.push(item);
      }
    });

    if (sortMode === "popular" || busca.trim()) {
      return [...pinnedFirst, ...pinnedSecond, ...rest];
    }

    return [...pinnedFirst, ...pinnedSecond, ...shuffleByDay(rest)];
  }, [busca, catFilter, initialEstabelecimentos, sortMode]);

  const hasFilters = Boolean(busca.trim() || catFilter);
  const emptyStateWithSearch = filtered.length === 0 && Boolean(busca.trim());

  const clearFilters = useCallback(() => {
    setBusca("");
    setCatFilter(null);
  }, []);

  const openRegistration = useCallback((name = "") => {
    setPrefillName(name);
    setRegistrationSubmitted(false);
    setModalOpen(true);
  }, []);

  return (
    <>
      <div className="container px-3 py-4 pb-24 sm:px-4 md:py-8 md:pb-8">
        <div className="mb-5 text-center md:mb-8">
          <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#25D366]/15 md:h-16 md:w-16">
            <WhatsAppIcon className="h-6 w-6 md:h-8 md:w-8" />
          </div>
          <h1 className="mb-1 text-xl font-bold text-foreground md:text-3xl">
            Zap <span className="text-[#25D366]">MHS</span>
          </h1>
          <p className="mx-auto max-w-md text-sm text-muted-foreground md:text-base">
            WhatsApps de comércios e serviços locais de Morrinhos.
          </p>
        </div>

        <div className="sticky top-14 z-30 -mx-3 bg-background px-3 pb-3 pt-1 sm:-mx-4 sm:px-4 md:static md:mx-0 md:bg-transparent md:px-0 md:pb-0 md:pt-0">
          <div className="relative mx-auto mb-2 max-w-md">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar estabelecimento..."
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              className="h-12 rounded-xl border-border bg-card pl-11 pr-11 text-base shadow-sm"
              inputMode="search"
              autoComplete="off"
            />
            {busca && (
              <button
                type="button"
                onClick={() => setBusca("")}
                className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-muted transition-colors hover:bg-muted/80"
                aria-label="Limpar busca"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>

          {availableCategories.length > 0 && (
            <div className="mx-auto max-w-2xl">
              <CategoryScrollArea
                catFilter={catFilter}
                setCatFilter={setCatFilter}
                availableCategories={availableCategories}
              />
            </div>
          )}
        </div>

        <div className="my-6 text-center">
          <button
            type="button"
            onClick={() => openRegistration()}
            className="inline-flex items-center gap-2 rounded-xl border-2 border-[#25D366]/30 px-5 py-3 text-base font-bold text-[#25D366] transition-colors hover:border-[#25D366]/60 hover:bg-[#25D366]/5 hover:text-[#1da851] md:text-lg"
          >
            <Plus className="h-5 w-5" />
            Cadastre um estabelecimento de Morrinhos
          </button>
        </div>

        <div className="mb-3 mt-4 flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {filtered.length}{" "}
            {filtered.length === 1 ? "estabelecimento" : "estabelecimentos"}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSortMode(sortMode === "recent" ? "popular" : "recent")}
              className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              title={
                sortMode === "recent"
                  ? "Ordenar por mais procurados"
                  : "Ordenar por mais recentes"
              }
            >
              <ArrowUpDown className="h-3.5 w-3.5" />
              {sortMode === "recent" ? "Recentes" : "Populares"}
            </button>
            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="flex items-center gap-1 text-sm font-medium text-[#25D366]"
              >
                <X className="h-3.5 w-3.5" />
                Limpar filtros
              </button>
            )}
          </div>
        </div>

        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3">
            {filtered.map((item) => (
              <EstablishmentCard
                key={item.id}
                item={item}
                onSuggest={setSuggestionTarget}
              />
            ))}
          </div>
        ) : (
          <div className="py-12 text-center">
            <Store className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
            {emptyStateWithSearch ? (
              <>
                <p className="mb-1 text-muted-foreground">
                  Nenhum resultado para &quot;{busca}&quot;.
                </p>
                <p className="mb-4 text-sm text-muted-foreground">
                  Conhece esse comércio? Ajude a cadastrar.
                </p>
                <button
                  type="button"
                  onClick={() => openRegistration(busca.trim())}
                  className="inline-flex items-center gap-2 rounded-xl border border-[#25D366]/30 px-4 py-2.5 text-sm font-semibold text-[#25D366] transition-colors hover:bg-[#25D366]/5"
                >
                  <Plus className="h-4 w-4" />
                  Cadastrar &quot;{busca.trim()}&quot;
                </button>
              </>
            ) : (
              <>
                <p className="text-muted-foreground">
                  Nenhum estabelecimento encontrado.
                </p>
                {hasFilters && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="mt-3 text-sm font-medium text-[#25D366]"
                  >
                    Limpar filtros
                  </button>
                )}
              </>
            )}
          </div>
        )}

        <p className="mx-auto mt-4 max-w-lg text-center text-xs text-muted-foreground">
          Os números são fornecidos pelos próprios estabelecimentos.
        </p>
      </div>

      <Dialog
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open);
          if (!open) setRegistrationSubmitted(false);
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
          {registrationSubmitted ? (
            <div className="space-y-4">
              <DialogHeader>
                <DialogTitle>Cadastro enviado</DialogTitle>
                <DialogDescription>
                  Após análise, o estabelecimento aparecerá no Zap MHS.
                </DialogDescription>
              </DialogHeader>
              <p className="rounded-lg border border-[#25D366]/30 bg-[#25D366]/10 px-3 py-2 text-sm text-foreground">
                Obrigado por ajudar a manter a lista atualizada.
              </p>
              <Button className="w-full" onClick={() => setModalOpen(false)}>
                Fechar
              </Button>
            </div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Cadastre um estabelecimento</DialogTitle>
                <DialogDescription>
                  Preencha os dados abaixo. Após análise, o comércio aparecerá no Zap MHS.
                </DialogDescription>
              </DialogHeader>
              <RegistrationForm
                key={prefillName || "blank"}
                onSubmitted={() => setRegistrationSubmitted(true)}
                prefillName={prefillName}
              />
            </>
          )}
        </DialogContent>
      </Dialog>

      {suggestionTarget && (
        <SuggestionModal
          key={suggestionTarget.id}
          establishment={suggestionTarget}
          open
          onOpenChange={(open) => {
            if (!open) setSuggestionTarget(null);
          }}
        />
      )}
    </>
  );
}

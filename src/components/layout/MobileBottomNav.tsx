"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BarChart3,
  Home,
  Landmark,
  Building2,
  HeartHandshake,
  MoreHorizontal,
  X,
  Trash2,
  Pill,
  Phone,
  Package,
  MessageSquare,
  Info,
} from "lucide-react";

const mobileMainNav = [
  { to: "/", label: "Início", icon: Home },
  { to: "/camara", label: "Câmara", icon: Landmark },
  { to: "/prefeitura", label: "Prefeitura", icon: Building2 },
];

// Dados MHS leva ao hub /dados-mhs — primeiro item pra dar destaque.
const mobileMoreNav = [
  { to: "/dados-mhs", label: "Dados MHS", icon: BarChart3 },
  { to: "/coleta-lixo", label: "Coleta de Lixo", icon: Trash2 },
  { to: "/plantao-farmacias", label: "Plantão Farmácias", icon: Pill },
  { to: "/contatos", label: "Contatos Úteis", icon: Phone },
  { to: "/compra-e-venda", label: "Compra e Venda MHS", icon: Package },
  { to: "/zap-mhs", label: "Zap MHS", icon: MessageSquare },
  { to: "/anuncie", label: "Anuncie", icon: HeartHandshake },
  { to: "/sobre", label: "Sobre", icon: Info },
];

export default function MobileBottomNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  const isActive = (to: string) =>
    pathname === to ||
    (to === "/camara" &&
      (pathname.startsWith("/vereadores") || pathname.startsWith("/atuacao-parlamentar")));

  const isMoreActive = mobileMoreNav.some(
    (item) => item.to !== "/anuncie" && isActive(item.to)
  );

  return (
    <>
      {moreOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/40"
          onClick={() => setMoreOpen(false)}
        >
          <div
            className="absolute bottom-20 left-4 right-4 bg-card rounded-2xl border shadow-lg p-4 safe-area-bottom"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-foreground">Mais seções</span>
              <button
                onClick={() => setMoreOpen(false)}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full hover:bg-secondary"
                aria-label="Fechar menu"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <div className="flex flex-col gap-1 max-h-[60vh] overflow-y-auto scrollbar-hide">
              {mobileMoreNav.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.to);
                const isAnuncie = item.to === "/anuncie";
                const isCompraVenda = item.to === "/compra-e-venda";
                const isZapPba = item.to === "/zap-mhs";
                const isDadosPba = item.to === "/dados-mhs";
                return (
                  <Link
                    key={item.to}
                    href={item.to}
                    onClick={() => setMoreOpen(false)}
                    className={`flex items-center gap-3 px-3 py-3 rounded-xl min-h-[44px] transition-colors ${
                      active
                        ? "bg-primary/10 text-primary"
                        : isAnuncie
                        ? "text-[#25D366]"
                        : "text-muted-foreground hover:bg-secondary"
                    }`}
                  >
                    <Icon
                      className={`w-5 h-5 shrink-0 ${
                        isAnuncie ? "text-[#25D366]" : isZapPba ? "text-[#25D366]" : ""
                      }`}
                    />
                    {isCompraVenda ? (
                      <span className="text-base font-medium">
                        Compra e Venda{" "}
                        <span className="text-[#25D366] font-semibold">MHS</span>
                      </span>
                    ) : isZapPba ? (
                      <span className="text-base font-medium">
                        Zap <span className="text-[#25D366] font-semibold">MHS</span>
                      </span>
                    ) : isDadosPba ? (
                      <span className="text-base font-medium">
                        Dados <span className="text-[#25D366] font-semibold">MHS</span>
                      </span>
                    ) : isAnuncie ? (
                      <span className="text-base font-semibold text-[#25D366]">
                        Anuncie no <span className="font-bold">MHS.ai</span>
                      </span>
                    ) : (
                      <span className="text-base font-medium">{item.label}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t safe-area-bottom"
        aria-label="Navegação principal"
      >
        <div className="flex items-center justify-around h-16">
          {mobileMainNav.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.to);
            return (
              <Link
                key={item.to}
                href={item.to}
                className={`flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-xl min-w-[44px] min-h-[44px] transition-colors ${
                  active ? "text-primary bg-muted" : "text-muted-foreground"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[11px] font-medium leading-tight">{item.label}</span>
              </Link>
            );
          })}

          <Link
            href="/anuncie"
            className={`flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-xl min-w-[44px] min-h-[44px] transition-colors ${
              isActive("/anuncie") ? "text-primary bg-muted" : "text-primary"
            }`}
          >
            <HeartHandshake className="w-5 h-5" />
            <span className="text-[11px] font-medium leading-tight">Anuncie</span>
          </Link>

          <button
            onClick={() => setMoreOpen((v) => !v)}
            className={`flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-xl min-w-[44px] min-h-[44px] transition-colors ${
              moreOpen || isMoreActive ? "text-primary bg-muted" : "text-muted-foreground"
            }`}
            aria-label="Mais seções"
          >
            <MoreHorizontal className="w-5 h-5" />
            <span className="text-[11px] font-medium leading-tight">Mais</span>
          </button>
        </div>
      </nav>
    </>
  );
}

"use client";

import type React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import {
  BarChart3,
  Building2,
  HeartHandshake,
  Home,
  Info,
  Landmark,
  MoreHorizontal,
  MessageSquare,
  Phone,
  Trash2,
  Pill,
  Package,
} from "lucide-react";

type NavItem = {
  to: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
};

const mainNav: NavItem[] = [
  { to: "/", label: "Início", icon: Home },
  { to: "/camara", label: "Câmara", icon: Landmark },
  { to: "/prefeitura", label: "Prefeitura", icon: Building2 },
];

// Dados MHS leva ao hub /dados-mhs que agrega 10 categorias de dados.
// Primeiro item de "Mais" pra dar destaque visual.
const moreNav: NavItem[] = [
  { to: "/dados-mhs", label: "Dados MHS", icon: BarChart3 },
  { to: "/contatos", label: "Contatos Úteis", icon: Phone },
  { to: "/coleta-lixo", label: "Coleta de Lixo", icon: Trash2 },
  { to: "/plantao-farmacias", label: "Plantão Farmácias", icon: Pill },
  { to: "/compra-e-venda", label: "Compra e Venda MHS", icon: Package },
  { to: "/zap-mhs", label: "Zap MHS", icon: MessageSquare },
  { to: "/sobre", label: "Sobre", icon: Info },
];

export default function DesktopNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const isActive = (to: string) =>
    pathname === to ||
    (to === "/camara" &&
      (pathname.startsWith("/vereadores") ||
        pathname.startsWith("/atuacao-parlamentar")));

  return (
    <nav className="hidden md:flex items-center gap-1" aria-label="Navegação principal">
      {mainNav.map((item) => {
        const active = isActive(item.to);
        return (
          <Link
            key={item.to}
            href={item.to}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors min-h-[44px] flex items-center ${
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            {item.label}
          </Link>
        );
      })}

      <Link
        href="/anuncie"
        className="px-3 py-2 rounded-md text-sm font-bold min-h-[44px] flex items-center gap-1.5 text-[#25D366] hover:text-[#1da851] transition-colors"
      >
        Anuncie
      </Link>

      <div className="relative" ref={ref}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={`px-3 py-2 rounded-md text-sm font-medium transition-colors min-h-[44px] flex items-center gap-2 ${
            moreNav.some((i) => isActive(i.to)) || open
              ? "bg-secondary text-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary"
          }`}
          aria-label="Mais seções"
          aria-expanded={open}
        >
          <MoreHorizontal className="w-4 h-4" />
          Mais
        </button>
        {open && (
          <div className="absolute right-0 top-full mt-1 w-56 bg-card border rounded-lg shadow-lg overflow-hidden z-50">
            {moreNav.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.to);
              const isCompraVenda = item.to === "/compra-e-venda";
              const isZapPba = item.to === "/zap-mhs";
              const isDadosPba = item.to === "/dados-mhs";
              return (
                <Link
                  key={item.to}
                  href={item.to}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                    active
                      ? "bg-primary/10 text-primary"
                      : "hover:bg-secondary text-foreground"
                  }`}
                >
                  {Icon && (
                    <Icon
                      className={`h-4 w-4 ${isZapPba ? "text-[#25D366]" : ""}`}
                    />
                  )}
                  {isCompraVenda ? (
                    <span>
                      Compra e Venda{" "}
                      <span className="text-[#25D366] font-semibold">MHS</span>
                    </span>
                  ) : isZapPba ? (
                    <span>
                      Zap <span className="text-[#25D366] font-semibold">MHS</span>
                    </span>
                  ) : isDadosPba ? (
                    <span>
                      Dados <span className="text-[#25D366] font-semibold">MHS</span>
                    </span>
                  ) : (
                    <span>{item.label}</span>
                  )}
                </Link>
              );
            })}
            <div className="border-t">
              <Link
                href="/anuncie"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-secondary"
              >
                <HeartHandshake className="h-4 w-4 text-[#25D366]" />
                <span className="font-semibold text-[#25D366]">
                  Anuncie no <span className="font-bold">MHS.ai</span>
                </span>
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

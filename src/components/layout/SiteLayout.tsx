import Link from "next/link";
import Image from "next/image";
import { HeartHandshake, Instagram } from "lucide-react";
import HeaderControls from "./HeaderControls";
import DesktopNav from "./DesktopNav";
import MobileBottomNav from "./MobileBottomNav";
import QueryProvider from "@/components/providers/QueryProvider";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <div className="min-h-screen min-h-[100dvh] flex flex-col bg-background overflow-x-hidden w-full max-w-[100vw]">
        <header className="sticky top-0 z-50 border-b bg-card">
          <div className="container flex items-center justify-between h-14">
            <Link href="/" className="flex items-center gap-2" aria-label="Início">
              <Image
                src="/icon-192.png"
                alt="Morrinhos.ai"
                width={36}
                height={36}
                className="rounded-lg object-contain"
                priority
              />
              <span className="font-bold text-lg text-foreground">
                Morrinhos<span className="text-[#25D366]">.ai</span>
              </span>
            </Link>
            <DesktopNav />
            <HeaderControls />
          </div>
        </header>

        <main className="flex-1 pb-20 md:pb-0">{children}</main>

        <section className="border-t bg-accent/5 py-6 hidden md:block">
          <div className="container">
            <Link
              href="/anuncie"
              className="flex items-center justify-between gap-4 stat-card card-hover border-primary/30 max-w-xl mx-auto"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                  <HeartHandshake className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#25D366]">
                    Anuncie no Morrinhos<span className="text-[#25D366]">.ai</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Seu negócio visto por centenas de moradores todos os dias.
                  </p>
                </div>
              </div>
              <span className="text-xs font-medium text-primary whitespace-nowrap">
                Saiba mais →
              </span>
            </Link>
          </div>
        </section>

        <footer className="border-t bg-card hidden md:block">
          <div className="container py-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Image
                  src="/icon-192.png"
                  alt="Morrinhos.ai"
                  width={24}
                  height={24}
                  className="rounded object-contain"
                />
                <span>Morrinhos.ai — Morrinhos, GO</span>
              </div>
              <div className="flex items-center gap-4">
                <Link
                  href="/anuncie"
                  className="hover:text-foreground transition-colors flex items-center gap-1"
                >
                  <HeartHandshake className="w-3.5 h-3.5 text-primary" />
                  Anuncie
                </Link>
                <Link href="/sobre" className="hover:text-foreground transition-colors">
                  Fontes oficiais
                </Link>
                <Link href="/sobre" className="hover:text-foreground transition-colors">
                  Sobre
                </Link>
                <Link href="/sobre" className="hover:text-foreground transition-colors">
                  Privacidade
                </Link>
                <a
                  href="https://www.instagram.com/morrinhos.ai"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram @morrinhos.ai"
                  className="hover:opacity-80 transition-opacity"
                  style={{ color: "#E1306C" }}
                >
                  <Instagram className="w-4 h-4" />
                </a>
              </div>
            </div>
            <div className="text-center mt-4 space-y-2">
              <p className="text-xs text-muted-foreground">
                Dados públicos obtidos de fontes oficiais. Este app não tem vínculo com
                nenhum órgão público.
              </p>
              <p className="text-xs text-foreground/70 font-medium">
                Ferro Labs Tecnologia LTDA · CNPJ 66.034.538/0001-25 - Todos os direitos
                reservados.
              </p>
            </div>
          </div>
        </footer>

        <MobileBottomNav />
      </div>
    </QueryProvider>
  );
}

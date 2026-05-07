"use client";

import { Video, ExternalLink, Calendar } from "lucide-react";

function getNextSession(): { date: string; isToday: boolean } {
  const now = new Date();
  const day = now.getDay(); // 0=Sun, 1=Mon
  const hour = now.getHours();

  // Sessions: every Monday at 19h and last Thursday of month
  let daysUntilMonday = (1 - day + 7) % 7;
  if (daysUntilMonday === 0 && hour >= 21) daysUntilMonday = 7; // past session time

  const nextMonday = new Date(now);
  nextMonday.setDate(now.getDate() + daysUntilMonday);

  const isToday = daysUntilMonday === 0 && hour < 21;
  const formatted = nextMonday.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });

  return { date: formatted, isToday };
}

function isLikelyLive(): boolean {
  const now = new Date();
  const day = now.getDay();
  const hour = now.getHours();
  // Monday between 19h-22h = likely live
  if (day === 1 && hour >= 19 && hour < 22) return true;
  // Last Thursday of month between 19h-22h
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const date = now.getDate();
  if (day === 4 && hour >= 19 && hour < 22 && date > lastDay - 7) return true;
  return false;
}

export default function TransmissaoCard() {
  const live = isLikelyLive();
  const next = getNextSession();

  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
      <div className="flex items-center gap-2 mb-2">
        <Video className="w-5 h-5 text-primary" />
        <span className="text-xs font-semibold text-primary uppercase tracking-wide">
          {live ? "Transmissão ao Vivo" : "Transmissões das Sessões"}
        </span>
        {live && (
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
          </span>
        )}
      </div>
      <p className="text-sm text-foreground mb-1">
        As sessões da Câmara são transmitidas ao vivo pelo YouTube.
      </p>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
        <Calendar className="w-3.5 h-3.5" />
        {next.isToday ? (
          <span className="text-accent font-medium">Hoje às 19h — sessão ordinária</span>
        ) : (
          <span>Próxima sessão: {next.date} às 19h</span>
        )}
      </div>
      <a
        href="https://www.youtube.com/@camarademorrinhos"
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex items-center gap-2 rounded-lg text-white text-sm font-medium px-4 py-2 transition-colors ${
          live ? "bg-red-600 hover:bg-red-700" : "bg-primary hover:bg-primary/90"
        }`}
      >
        <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
        </svg>
        {live ? "Assistir ao Vivo" : "Canal no YouTube"}
        <ExternalLink className="w-3.5 h-3.5" />
      </a>
    </div>
  );
}

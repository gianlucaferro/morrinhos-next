"use client";

import { useState } from "react";
import Image from "next/image";
import { Clock, Phone, Pill, ZoomIn } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import WhatsAppIcon from "@/components/icons/WhatsAppIcon";
import {
  getTelefoneLink,
  getWazeLink,
  type Farmacia,
} from "@/data/plantaoFarmacias";
import wazeIcon from "@/assets/waze-icon.png";
import { cn } from "@/lib/utils";

export type FarmaciaMeta = {
  nome: string;
  foto_url: string | null;
  telefone: string | null;
  tipo_telefone: "whatsapp" | "fixo" | null;
};

function resolveFarmacia(farmacia: Farmacia, meta?: FarmaciaMeta): Farmacia {
  if (!meta?.telefone) return farmacia;

  return {
    ...farmacia,
    telefone: meta.telefone,
    tipo:
      meta.tipo_telefone ??
      (meta.telefone.includes("3405") ? ("fixo" as const) : ("whatsapp" as const)),
  };
}

export function FarmaciaPlantaoCard({
  farmacia,
  meta,
  is24h = false,
  compact = false,
}: {
  farmacia: Farmacia;
  meta?: FarmaciaMeta;
  is24h?: boolean;
  compact?: boolean;
}) {
  const [showPhoto, setShowPhoto] = useState(false);
  const resolved = resolveFarmacia(farmacia, meta);
  const fotoUrl = meta?.foto_url || null;
  const waze = getWazeLink(farmacia);
  const isWhatsApp = resolved.tipo === "whatsapp";

  return (
    <div
      className={cn(
        "stat-card flex items-center gap-3",
        is24h && "border-orange-500/40 bg-orange-500/5"
      )}
    >
      {fotoUrl ? (
        <button
          type="button"
          onClick={() => setShowPhoto(true)}
          className={cn(
            "relative shrink-0 overflow-hidden rounded-lg ring-1 ring-border group/photo",
            compact ? "h-[50px] w-[72px]" : "h-[60px] w-[88px]"
          )}
          aria-label={`Ampliar foto de ${resolved.nome}`}
        >
          <Image
            src={fotoUrl}
            alt={resolved.nome}
            fill
            sizes={compact ? "72px" : "88px"}
            className="object-cover"
            unoptimized
          />
          <span className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover/photo:bg-black/30">
            <ZoomIn className="h-4 w-4 text-white opacity-70 drop-shadow transition-opacity sm:opacity-0 group-hover/photo:opacity-100" />
          </span>
        </button>
      ) : (
        <div
          className={cn(
            "shrink-0 rounded-lg flex items-center justify-center",
            compact ? "h-[50px] w-[72px]" : "h-[60px] w-[88px]",
            isWhatsApp ? "bg-[#25D366]/10" : "bg-primary/10"
          )}
        >
          {isWhatsApp ? (
            <WhatsAppIcon className="h-5 w-5 text-[#25D366]" />
          ) : (
            <Pill className="h-5 w-5 text-primary" />
          )}
        </div>
      )}

      <a
        href={getTelefoneLink(resolved)}
        target={isWhatsApp ? "_blank" : undefined}
        rel={isWhatsApp ? "noopener noreferrer" : undefined}
        className="min-w-0 flex-1 rounded-md p-1 -m-1 hover:bg-muted/60 transition-colors"
      >
        <span className="flex items-center gap-2">
          <span
            className={cn(
              "truncate font-medium text-foreground",
              compact ? "text-sm" : "text-sm md:text-base"
            )}
          >
            {resolved.nome}
          </span>
          {is24h && (
            <span className="shrink-0 inline-flex items-center gap-1 rounded bg-orange-500/10 px-1.5 py-0.5 text-[10px] font-bold text-orange-600 dark:text-orange-400">
              <Clock className="h-3 w-3" /> 24H
            </span>
          )}
        </span>
        <span className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
          {isWhatsApp ? (
            <WhatsAppIcon className="h-3 w-3 shrink-0 text-[#25D366]" />
          ) : (
            <Phone className="h-3 w-3 shrink-0" />
          )}
          {resolved.telefone}
        </span>
      </a>

      {waze && (
        <a
          href={waze}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 flex flex-col items-center gap-0.5 rounded-md p-1 hover:bg-muted/60 transition-colors"
          title="Abrir no Waze"
          aria-label={`Abrir ${resolved.nome} no Waze`}
        >
          <Image src={wazeIcon} alt="" className={cn(compact ? "h-6 w-6" : "h-7 w-7")} />
          <span className="text-[9px] font-semibold leading-none text-muted-foreground">
            Waze
          </span>
        </a>
      )}

      {fotoUrl && (
        <Dialog open={showPhoto} onOpenChange={setShowPhoto}>
          <DialogContent className="max-w-lg p-2 sm:p-4">
            <DialogTitle className="text-sm font-semibold">{resolved.nome}</DialogTitle>
            <div className="relative max-h-[70vh] min-h-[240px] w-full overflow-hidden rounded-lg">
              <Image
                src={fotoUrl}
                alt={resolved.nome}
                width={900}
                height={650}
                className="h-auto max-h-[70vh] w-full object-contain"
                unoptimized
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

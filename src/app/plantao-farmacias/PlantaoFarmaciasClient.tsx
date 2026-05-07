"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Share2 } from "lucide-react";
import { FarmaciaPlantaoCard, type FarmaciaMeta } from "@/components/FarmaciaPlantaoCard";
import {
  PLANTAO_FARMACIAS,
  getMesAno,
  getPeriodo,
  getSemanaAtual,
  getShareWhatsAppLink,
} from "@/data/plantaoFarmacias";
import { cn } from "@/lib/utils";

function normalize(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function PlantaoFarmaciasClient({
  fotosMeta,
}: {
  fotosMeta: FarmaciaMeta[];
}) {
  const currentRef = useRef<HTMLDivElement>(null);
  const [hash, setHash] = useState("");

  const semanaAtualIdx = useMemo(() => getSemanaAtual(), []);
  const metaByName = useMemo(() => {
    const map = new Map<string, FarmaciaMeta>();
    fotosMeta.forEach((meta) => {
      map.set(meta.nome, meta);
      map.set(normalize(meta.nome), meta);
    });
    return map;
  }, [fotosMeta]);

  const grouped = useMemo(() => {
    const map = new Map<string, number[]>();
    PLANTAO_FARMACIAS.forEach((semana, idx) => {
      const key = getMesAno(semana);
      const current = map.get(key);
      if (current) current.push(idx);
      else map.set(key, [idx]);
    });
    return Array.from(map.entries());
  }, []);

  useEffect(() => {
    const updateHash = () => setHash(window.location.hash.replace("#", ""));
    updateHash();
    window.addEventListener("hashchange", updateHash);
    return () => window.removeEventListener("hashchange", updateHash);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const target = hash ? document.getElementById(hash) : currentRef.current;
      target?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [hash]);

  const getMeta = (nome: string) => metaByName.get(nome) ?? metaByName.get(normalize(nome));

  return (
    <div className="space-y-6">
      {grouped.map(([mesAno, semanas]) => (
        <section key={mesAno} aria-labelledby={`mes-${normalize(mesAno)}`}>
          <h2
            id={`mes-${normalize(mesAno)}`}
            className="sticky top-0 z-10 mb-3 border-b border-border bg-background/95 py-2 text-base font-semibold text-foreground backdrop-blur"
          >
            {mesAno}
          </h2>

          <div className="space-y-4">
            {semanas.map((idx) => {
              const semana = PLANTAO_FARMACIAS[idx];
              const nextSemana = PLANTAO_FARMACIAS[idx + 1];
              const periodo = getPeriodo(semana, nextSemana);
              const isCurrent = idx === semanaAtualIdx;
              const isHash = hash === semana.inicio;

              return (
                <div
                  key={semana.inicio}
                  id={semana.inicio}
                  ref={isCurrent ? currentRef : undefined}
                  className={cn(
                    "rounded-lg border p-4 space-y-3 transition-colors",
                    isCurrent
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                      : "border-border",
                    isHash &&
                      "border-amber-400 bg-amber-50/50 ring-2 ring-amber-400/30 dark:bg-amber-950/20"
                  )}
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <p className="text-sm font-medium text-foreground">
                      {periodo.de} a {periodo.ate}
                    </p>

                    <div className="flex items-center gap-2">
                      {isCurrent && (
                        <span className="inline-flex items-center rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
                          Semana atual
                        </span>
                      )}
                      <a
                        href={getShareWhatsAppLink(semana, nextSemana)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-full bg-[#25D366]/10 px-2 py-0.5 text-xs font-medium text-[#25D366] transition-colors hover:bg-[#25D366]/20"
                        title="Compartilhar no WhatsApp"
                      >
                        <Share2 className="h-3 w-3" /> Compartilhar
                      </a>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <FarmaciaPlantaoCard
                      farmacia={semana.farmacia24h}
                      meta={getMeta(semana.farmacia24h.nome)}
                      is24h
                    />
                    {semana.demais.map((farmacia) => (
                      <FarmaciaPlantaoCard
                        key={farmacia.nome}
                        farmacia={farmacia}
                        meta={getMeta(farmacia.nome)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

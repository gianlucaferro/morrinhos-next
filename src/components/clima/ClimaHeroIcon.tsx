"use client";

import { useEffect, useState } from "react";
import {
  Sun,
  Moon,
  CloudSun,
  CloudMoon,
  CloudRain,
  CloudDrizzle,
  Cloud,
} from "lucide-react";

/**
 * Icone do clima sensivel a hora do dia.
 *
 * Por que client component: a hora atual depende do navegador do usuario
 * (fuso local). Calcular server-side cacheia o icone pra hora do build,
 * resultando em sol mostrando as 22:50.
 *
 * Estrategia:
 * - Inicia com placeholder neutro (Cloud) pra evitar hydration mismatch
 * - useEffect calcula hora local do navegador apos mount
 * - Atualiza ao trocar dia/noite (a cada minuto re-checa)
 */
export default function ClimaHeroIcon({
  precipitacao,
  className = "",
}: {
  precipitacao: number | null;
  className?: string;
}) {
  // null = ainda nao montou (SSR-safe placeholder)
  const [isNight, setIsNight] = useState<boolean | null>(null);

  useEffect(() => {
    const updateNight = () => {
      const h = new Date().getHours();
      setIsNight(h < 6 || h >= 18);
    };
    updateNight();
    // Re-checa a cada minuto pra trocar icone na transicao dia/noite
    const interval = setInterval(updateNight, 60_000);
    return () => clearInterval(interval);
  }, []);

  const precip = precipitacao ?? 0;

  let Icon = Cloud; // placeholder neutro durante SSR
  if (isNight !== null) {
    if (precip > 5) {
      Icon = CloudRain;
    } else if (precip > 1) {
      Icon = CloudDrizzle;
    } else if (precip > 0.1) {
      Icon = isNight ? CloudMoon : CloudSun;
    } else {
      Icon = isNight ? Moon : Sun;
    }
  }

  // Cor: sol/dia = ambar; lua/noite = azul claro
  const colorClass = isNight ? "text-blue-200" : "text-amber-300";

  return <Icon className={`${className} ${colorClass} shrink-0`} aria-hidden />;
}

import Link from "next/link";
import { CloudRain, Droplets } from "lucide-react";
import { fetchClimaUltimoDia } from "@/lib/data/clima";
import ClimaHeroIcon from "./ClimaHeroIcon";

export default async function ClimaHeroBadge() {
  const dia = await fetchClimaUltimoDia();
  if (!dia) return null;

  const tempMed = Math.round(Number(dia.temperatura_media ?? 0));
  const tempMax = Math.round(Number(dia.temperatura_max ?? 0));
  const tempMin = Math.round(Number(dia.temperatura_min ?? 0));
  const chuva = Number(dia.precipitacao_mm ?? 0);
  const umid = Math.round(Number(dia.umidade_media ?? 0));

  return (
    <Link
      href="/clima"
      aria-label="Ver clima completo de Morrinhos"
      className="absolute top-3 right-3 sm:top-4 sm:right-4 md:top-6 md:right-6 z-20 inline-flex items-center gap-2 sm:gap-3 px-3 py-2 sm:px-4 sm:py-3 rounded-2xl bg-white/10 hover:bg-white/15 backdrop-blur-md border border-white/20 transition-colors text-white shadow-lg"
    >
      <ClimaHeroIcon
        precipitacao={dia.precipitacao_mm}
        className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10"
      />
      <div className="text-left">
        <p className="text-[9px] sm:text-[10px] uppercase tracking-widest text-white/70 leading-none mb-1 hidden sm:block">
          Morrinhos agora
        </p>
        <p className="text-xl sm:text-2xl md:text-3xl font-extrabold leading-none">
          {tempMed}°C
        </p>
        <p className="text-[10px] sm:text-[11px] text-white/80 mt-1 inline-flex items-center gap-1.5 sm:gap-2 flex-wrap">
          <span>{tempMin}°/{tempMax}°</span>
          <span className="inline-flex items-center gap-1">
            <Droplets className="w-3 h-3" /> {umid}%
          </span>
          {chuva > 0.1 && (
            <span className="hidden sm:inline-flex items-center gap-1">
              <CloudRain className="w-3 h-3" /> {chuva.toFixed(1)}mm
            </span>
          )}
        </p>
      </div>
    </Link>
  );
}

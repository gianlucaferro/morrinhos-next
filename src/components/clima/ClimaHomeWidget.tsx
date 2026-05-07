import Link from "next/link";
import { Cloud, CloudRain, Droplets, Sun, ArrowRight } from "lucide-react";
import { fetchClimaUltimoDia } from "@/lib/data/clima";

function iconForChuva(precip: number | null) {
  if ((precip ?? 0) > 1) return CloudRain;
  if ((precip ?? 0) > 0.1) return Cloud;
  return Sun;
}

function colorForTemp(t: number | null) {
  if (t == null) return "text-muted-foreground";
  if (t >= 32) return "text-orange-500";
  if (t >= 26) return "text-amber-500";
  if (t >= 18) return "text-emerald-500";
  return "text-sky-500";
}

function formatData(s: string) {
  const [a, m, d] = s.split("-");
  return `${d}/${m}/${a}`;
}

export default async function ClimaHomeWidget() {
  const dia = await fetchClimaUltimoDia();
  if (!dia) return null;

  const Icon = iconForChuva(dia.precipitacao_mm);
  const tempColor = colorForTemp(dia.temperatura_media);
  const chuva = Number(dia.precipitacao_mm ?? 0);
  const tempMed = Number(dia.temperatura_media ?? 0);
  const tempMax = Number(dia.temperatura_max ?? 0);
  const tempMin = Number(dia.temperatura_min ?? 0);
  const umid = Number(dia.umidade_media ?? 0);

  return (
    <Link
      href="/clima"
      className="stat-card card-hover flex items-center gap-3 group border-sky-500/20 bg-gradient-to-br from-sky-500/5 to-transparent"
      aria-label="Clima atual em Morrinhos"
    >
      <div className="w-12 h-12 rounded-full bg-sky-500/10 flex items-center justify-center shrink-0">
        <Icon className={`w-6 h-6 ${tempColor}`} aria-hidden />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Clima em Morrinhos</p>
        <p className="text-base font-semibold text-foreground inline-flex items-baseline gap-2">
          <span className={tempColor}>{Math.round(tempMed)}°C</span>
          <span className="text-xs text-muted-foreground font-normal">
            {Math.round(tempMin)}°/{Math.round(tempMax)}°
          </span>
        </p>
        <p className="text-xs text-muted-foreground inline-flex items-center gap-2 mt-0.5">
          <span className="inline-flex items-center gap-1">
            <CloudRain className="w-3 h-3" /> {chuva.toFixed(1)} mm
          </span>
          <span className="inline-flex items-center gap-1">
            <Droplets className="w-3 h-3" /> {Math.round(umid)}%
          </span>
          <span className="text-[10px]">· {formatData(dia.data)}</span>
        </p>
      </div>
      <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0 group-hover:text-sky-500 transition-colors" />
    </Link>
  );
}

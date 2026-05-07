import Link from "next/link";
import { ArrowRight, Pill, Share2 } from "lucide-react";
import { FarmaciaPlantaoCard, type FarmaciaMeta } from "@/components/FarmaciaPlantaoCard";
import {
  PLANTAO_FARMACIAS,
  getPeriodo,
  getSemanaAtual,
  getShareWhatsAppLink,
} from "@/data/plantaoFarmacias";
import { fetchFarmaciasMeta } from "@/lib/data/listings";

function normalize(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function normalizeFarmaciaMeta(meta: {
  nome: string | null;
  foto_url: string | null;
  telefone: string | null;
  tipo_telefone: string | null;
}): FarmaciaMeta | null {
  if (!meta.nome) return null;

  return {
    nome: meta.nome,
    foto_url: meta.foto_url || null,
    telefone: meta.telefone || null,
    tipo_telefone:
      meta.tipo_telefone === "whatsapp" || meta.tipo_telefone === "fixo"
        ? meta.tipo_telefone
        : null,
  };
}

export default async function PlantaoFarmaciasHome() {
  const semanaAtualIdx = getSemanaAtual();
  const semana = PLANTAO_FARMACIAS[semanaAtualIdx];
  const nextSemana = PLANTAO_FARMACIAS[semanaAtualIdx + 1];
  if (!semana) return null;

  const periodo = getPeriodo(semana, nextSemana);
  const fotosMeta = (await fetchFarmaciasMeta())
    .map(normalizeFarmaciaMeta)
    .filter((meta): meta is FarmaciaMeta => Boolean(meta));

  const fotoByName = new Map<string, FarmaciaMeta>();
  fotosMeta.forEach((meta) => {
    fotoByName.set(meta.nome, meta);
    fotoByName.set(normalize(meta.nome), meta);
  });

  const getMeta = (nome: string) => fotoByName.get(nome) ?? fotoByName.get(normalize(nome));

  return (
    <section aria-labelledby="heading-plantao" className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2
          id="heading-plantao"
          className="text-lg font-semibold text-foreground flex items-center gap-2"
        >
          <Pill className="h-5 w-5 text-primary" />
          Plantão de Farmácias
        </h2>
        <Link
          href="/plantao-farmacias"
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          Ver escala <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-muted-foreground">
          De <span className="font-medium text-foreground">{periodo.de}</span> a{" "}
          <span className="font-medium text-foreground">{periodo.ate}</span>
        </p>
        <a
          href={getShareWhatsAppLink(semana, nextSemana)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-[#25D366] hover:underline font-medium"
        >
          <Share2 className="h-3.5 w-3.5" /> Compartilhar
        </a>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <FarmaciaPlantaoCard
          farmacia={semana.farmacia24h}
          meta={getMeta(semana.farmacia24h.nome)}
          is24h
          compact
        />
        {semana.demais.map((farmacia) => (
          <FarmaciaPlantaoCard
            key={farmacia.nome}
            farmacia={farmacia}
            meta={getMeta(farmacia.nome)}
            compact
          />
        ))}
      </div>
    </section>
  );
}

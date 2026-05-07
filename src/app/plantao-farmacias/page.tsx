import Link from "next/link";
import { ArrowLeft, Pill } from "lucide-react";
import { pageMetadata } from "@/lib/seo";
import { fetchFarmaciasMeta } from "@/lib/data/listings";
import {
  PLANTAO_FARMACIAS,
  getSemanaAtual,
} from "@/data/plantaoFarmacias";
import PlantaoFarmaciasClient from "./PlantaoFarmaciasClient";
import type { FarmaciaMeta } from "@/components/FarmaciaPlantaoCard";

export const metadata = pageMetadata({
  title: "Farmácias de Plantão em Morrinhos GO",
  description:
    "Calendário completo de plantão das farmácias de Morrinhos: quem está aberta 24 horas, telefones, WhatsApp e como chegar pelo Waze.",
  path: "/plantao-farmacias",
});

export const revalidate = 3600;

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

function SchemaMarkup() {
  const idx = getSemanaAtual();
  const semana = PLANTAO_FARMACIAS[idx];
  const allFarmacias = [semana.farmacia24h, ...semana.demais];

  const schema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Plantão de Farmácias em Morrinhos",
    description: "Farmácias de plantão esta semana em Morrinhos, GO",
    url: "https://morrinhos.ai/plantao-farmacias",
    itemListElement: allFarmacias.map((farmacia, position) => ({
      "@type": "ListItem",
      position: position + 1,
      item: {
        "@type": "Pharmacy",
        name: farmacia.nome,
        telephone: `+5564${farmacia.telefone.replace(/\D/g, "").slice(-9)}`,
        address: {
          "@type": "PostalAddress",
          addressLocality: "Morrinhos",
          addressRegion: "GO",
          addressCountry: "BR",
        },
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export default async function PlantaoFarmaciasPage() {
  const fotosMeta = (await fetchFarmaciasMeta())
    .map(normalizeFarmaciaMeta)
    .filter((meta): meta is FarmaciaMeta => Boolean(meta));

  return (
    <>
      <SchemaMarkup />
      <div className="container py-6 space-y-6">
        <div>
          <Link
            href="/"
            className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Link>
          <div className="mb-1 flex items-center gap-2">
            <Pill className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold text-foreground">
              Plantão de Farmácias
            </h1>
          </div>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Calendário completo de plantão das farmácias em Morrinhos. A semana
            atual está destacada.
          </p>
        </div>

        <PlantaoFarmaciasClient fotosMeta={fotosMeta} />

        <p className="pt-4 pb-8 text-center text-xs text-muted-foreground">
          Fonte: Escala de Plantão das Farmácias - Morrinhos / GO - 2026/2027
        </p>
      </div>
    </>
  );
}

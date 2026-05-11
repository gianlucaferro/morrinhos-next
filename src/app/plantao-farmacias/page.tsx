import Link from "next/link";
import { ArrowLeft, Pill, Phone, MessageCircle, MapPin, Instagram, Facebook, ExternalLink, Clock, AlertCircle } from "lucide-react";
import { pageMetadata } from "@/lib/seo";
import {
  fetchFarmaciasCadastradas,
  fetchPlantoesAtuaisEFuturos,
  type FarmaciaCadastrada,
  type PlantaoFarmacia,
} from "@/lib/data/listings";

export const metadata = pageMetadata({
  title: "Farmácias de Plantão em Morrinhos GO",
  description:
    "Lista de farmácias e drogarias em Morrinhos, Goiás. Telefones, endereços, WhatsApp e plantão atual. Em emergência ligue SAMU 192.",
  path: "/plantao-farmacias",
});

export const revalidate = 900;

function formatarData(d: string) {
  const dt = new Date(d + "T00:00:00");
  return dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

function diaSemana(d: string) {
  const dt = new Date(d + "T00:00:00");
  return dt.toLocaleDateString("pt-BR", { weekday: "long" });
}

function tellLink(num: string) {
  const limpo = num.replace(/\D/g, "");
  return `tel:+55${limpo}`;
}

function whatsLink(num: string) {
  const limpo = num.replace(/\D/g, "");
  return `https://wa.me/55${limpo}`;
}

function PlantaoAtualCard({ p }: { p: PlantaoFarmacia }) {
  const hoje = new Date().toISOString().slice(0, 10);
  const isHoje = p.data_inicio <= hoje && hoje <= p.data_fim;
  return (
    <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/30 dark:to-emerald-900/20 p-5 space-y-3">
      <div className="flex items-start gap-3">
        <span className="text-3xl shrink-0">{p.is_24h ? "🕐" : "💊"}</span>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            {isHoje && (
              <span className="bg-emerald-600 text-white text-xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
                Plantão Hoje
              </span>
            )}
            {p.is_24h && (
              <span className="bg-amber-500 text-white text-xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
                24 horas
              </span>
            )}
          </div>
          <h3 className="text-lg font-bold text-foreground leading-tight">{p.farmacia_nome}</h3>
          <p className="text-xs text-muted-foreground mt-1">
            {p.data_inicio === p.data_fim
              ? <><span className="capitalize">{diaSemana(p.data_inicio)}</span>, {formatarData(p.data_inicio)}</>
              : <>De {formatarData(p.data_inicio)} a {formatarData(p.data_fim)}</>
            }
            {p.horario_inicio && p.horario_fim && (
              <> · {p.horario_inicio}–{p.horario_fim}</>
            )}
          </p>
          {p.endereco && (
            <p className="text-sm text-foreground mt-2 flex items-start gap-1.5">
              <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0 text-emerald-700 dark:text-emerald-400" />
              <span>{p.endereco}</span>
            </p>
          )}
          {p.telefone && (
            <a href={tellLink(p.telefone)} className="inline-flex items-center gap-1.5 mt-2 text-sm font-semibold text-emerald-800 dark:text-emerald-200 hover:underline">
              <Phone className="w-3.5 h-3.5" /> {p.telefone}
            </a>
          )}
          {p.observacao && (
            <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-2 italic">{p.observacao}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function FarmaciaCard({ f }: { f: FarmaciaCadastrada }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-bold text-foreground leading-tight">{f.nome}</h3>
          {f.endereco && (
            <p className="text-xs text-muted-foreground mt-0.5 flex items-start gap-1">
              <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
              <span>{f.endereco}</span>
            </p>
          )}
        </div>
        {f.is_24h && (
          <span className="bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase whitespace-nowrap">24h</span>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5 pt-1">
        {f.telefone && (
          <a
            href={tellLink(f.telefone)}
            className="inline-flex items-center gap-1 bg-blue-50 dark:bg-blue-950/30 text-blue-800 dark:text-blue-300 text-xs font-semibold px-2.5 py-1 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/50"
          >
            <Phone className="w-3 h-3" /> {f.telefone}
          </a>
        )}
        {f.whatsapp && (
          <a
            href={whatsLink(f.whatsapp)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 bg-green-50 dark:bg-green-950/30 text-green-800 dark:text-green-300 text-xs font-semibold px-2.5 py-1 rounded-full hover:bg-green-100 dark:hover:bg-green-900/50"
          >
            <MessageCircle className="w-3 h-3" /> WhatsApp
          </a>
        )}
        {f.instagram_handle && (
          <a
            href={`https://instagram.com/${f.instagram_handle}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 bg-pink-50 dark:bg-pink-950/30 text-pink-800 dark:text-pink-300 text-xs font-semibold px-2.5 py-1 rounded-full hover:bg-pink-100 dark:hover:bg-pink-900/50"
          >
            <Instagram className="w-3 h-3" /> @{f.instagram_handle}
          </a>
        )}
        {f.facebook_handle && (
          <a
            href={`https://facebook.com/${f.facebook_handle}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 bg-blue-50 dark:bg-blue-950/30 text-blue-800 dark:text-blue-300 text-xs font-semibold px-2.5 py-1 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/50"
          >
            <Facebook className="w-3 h-3" /> Facebook
          </a>
        )}
      </div>

      {f.observacao && (
        <p className="text-[11px] text-muted-foreground italic pt-1 border-t border-border/40">{f.observacao}</p>
      )}
    </div>
  );
}

function SchemaMarkup({ farmacias }: { farmacias: FarmaciaCadastrada[] }) {
  if (farmacias.length === 0) return null;
  const schema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Farmácias e Drogarias em Morrinhos",
    description: "Lista de farmácias em Morrinhos-GO com endereço, telefone e WhatsApp",
    url: "https://morrinhos.ai/plantao-farmacias",
    itemListElement: farmacias.map((f, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "Pharmacy",
        name: f.nome,
        ...(f.telefone && { telephone: `+55${f.telefone.replace(/\D/g, "")}` }),
        address: {
          "@type": "PostalAddress",
          ...(f.endereco && { streetAddress: f.endereco }),
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
  const [farmacias, plantoes] = await Promise.all([
    fetchFarmaciasCadastradas(),
    fetchPlantoesAtuaisEFuturos(),
  ]);

  const hoje = new Date().toISOString().slice(0, 10);
  const plantaoHoje = plantoes.find(p => p.data_inicio <= hoje && hoje <= p.data_fim);
  const proximosPlantoes = plantoes.filter(p => p.data_inicio > hoje).slice(0, 5);

  return (
    <>
      <SchemaMarkup farmacias={farmacias} />
      <div className="container max-w-3xl py-6 space-y-6">
        <div>
          <Link
            href="/"
            className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Link>
          <div className="mb-1 flex items-center gap-2">
            <Pill className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">
              Farmácias em Morrinhos
            </h1>
          </div>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Telefones, endereços e plantão das farmácias e drogarias de Morrinhos-GO.
          </p>
        </div>

        {/* Plantão de HOJE em destaque */}
        {plantaoHoje ? (
          <section className="space-y-2">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Plantão Hoje
            </h2>
            <PlantaoAtualCard p={plantaoHoje} />
          </section>
        ) : (
          <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1 text-sm">
              <p className="font-bold text-amber-900 dark:text-amber-200">Plantão de hoje não publicado</p>
              <p className="text-amber-800 dark:text-amber-300 mt-1 leading-relaxed">
                A escala oficial é divulgada pela Vigilância Sanitária Municipal (3417-2113) e pelas próprias farmácias.
                Consulte a vitrine das farmácias listadas abaixo ou ligue antes de ir.
                Em emergência: <strong>SAMU 192</strong> · Hospital Municipal <a href="tel:+5564341 72002" className="underline">(64) 3417-2002</a>.
              </p>
            </div>
          </div>
        )}

        {/* Próximos plantões */}
        {proximosPlantoes.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Clock className="w-4 h-4" /> Próximos Plantões
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {proximosPlantoes.map(p => <PlantaoAtualCard key={p.id} p={p} />)}
            </div>
          </section>
        )}

        {/* Catálogo de farmácias cadastradas */}
        <section className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
            Farmácias e Drogarias em Morrinhos
          </h2>
          {farmacias.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {farmacias.map(f => <FarmaciaCard key={f.id} f={f} />)}
            </div>
          ) : (
            <div className="rounded-lg border border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
              Cadastro de farmácias em andamento.
            </div>
          )}
        </section>

        <div className="rounded-xl border border-border bg-card/50 p-4 space-y-2">
          <p className="text-sm font-bold text-foreground">É dono ou gerente de farmácia em Morrinhos?</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Quer atualizar suas informações ou cadastrar sua escala de plantão?
            Entre em contato em <a href="https://morrinhos.ai/contatos" className="text-primary hover:underline">morrinhos.ai/contatos</a>.
          </p>
        </div>

        <p className="pt-4 pb-8 text-center text-xs text-muted-foreground">
          Fontes: cadastro próprio, Vigilância Sanitária Municipal de Morrinhos, redes sociais oficiais das farmácias.
          Em emergência ligue SAMU 192 ou Hospital Municipal (64) 3417-2002.
        </p>
      </div>
    </>
  );
}

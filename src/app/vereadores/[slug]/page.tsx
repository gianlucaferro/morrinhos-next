import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Phone,
  Mail,
  Instagram,
  ExternalLink,
  Calendar,
  CheckCircle2,
  XCircle,
  FileText,
  Megaphone,
  DollarSign,
} from "lucide-react";
import { pageMetadata } from "@/lib/seo";
import { fetchVereadorBySlug, listVereadorSlugs } from "@/lib/data/vereadores";

export const revalidate = 3600;

export async function generateStaticParams() {
  const slugs = await listVereadorSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const result = await fetchVereadorBySlug(slug);
  if (!result) {
    return pageMetadata({
      title: "Vereador não encontrado — Morrinhos GO",
      description: "Este vereador não foi encontrado.",
      path: `/vereadores/${slug}`,
    });
  }
  const { vereador } = result;
  return pageMetadata({
    title: `${vereador.nome} (${vereador.partido || "s/p"}) — Vereador Morrinhos GO`,
    description: `Perfil completo do vereador ${vereador.nome}: partido, atuação parlamentar, projetos, presença em sessões, remuneração e contato.`,
    path: `/vereadores/${slug}`,
    image: vereador.foto_url || undefined,
  });
}

function fmtBRL(n: number | null | undefined) {
  if (n == null) return "—";
  return Number(n).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtDate(d: string | null) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("pt-BR");
  } catch {
    return d;
  }
}

export default async function VereadorPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const result = await fetchVereadorBySlug(slug);
  if (!result) notFound();

  const { vereador, remuneracoes, atuacoes, projetos, presencas, custoTotal } = result;
  const ultimaRemuneracao = remuneracoes[0];

  return (
    <div className="container py-6 md:py-10 space-y-8">
      <Link
        href="/vereadores"
        className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
      >
        <ArrowLeft className="w-4 h-4" /> Vereadores
      </Link>

      {/* Header */}
      <header className="flex items-start gap-5 flex-wrap">
        <div className="w-28 h-28 md:w-32 md:h-32 rounded-2xl overflow-hidden bg-muted flex-shrink-0 ring-1 ring-border">
          {vereador.foto_url ? (
            <Image
              src={vereador.foto_url}
              alt={vereador.nome}
              width={128}
              height={128}
              className="w-full h-full object-cover"
              unoptimized
              priority
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-5xl text-muted-foreground">
              {vereador.nome[0]?.toUpperCase()}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl md:text-3xl font-extrabold text-foreground">
            {vereador.nome}
          </h1>
          <p className="mt-1 text-muted-foreground">
            <span className="font-medium">{vereador.partido || "Sem partido"}</span>
            {vereador.cargo_mesa && (
              <span className="ml-2 text-primary">· {vereador.cargo_mesa}</span>
            )}
          </p>
          {vereador.votos_eleicao && (
            <p className="text-xs text-muted-foreground mt-1">
              {vereador.votos_eleicao.toLocaleString("pt-BR")} votos ({vereador.ano_eleicao})
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-3 text-sm">
            {vereador.telefone && (
              <a
                href={`tel:${vereador.telefone}`}
                className="inline-flex items-center gap-1 text-muted-foreground hover:text-primary"
              >
                <Phone className="w-4 h-4" /> {vereador.telefone}
              </a>
            )}
            {vereador.email && (
              <a
                href={`mailto:${vereador.email}`}
                className="inline-flex items-center gap-1 text-muted-foreground hover:text-primary"
              >
                <Mail className="w-4 h-4" /> {vereador.email}
              </a>
            )}
            {vereador.instagram && (
              <a
                href={`https://instagram.com/${vereador.instagram.replace("@", "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-muted-foreground hover:text-primary"
              >
                <Instagram className="w-4 h-4" /> {vereador.instagram.replace("@", "")}
              </a>
            )}
          </div>
        </div>
      </header>

      {/* Stats em destaque */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="stat-card">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            Subsídio último mês
          </p>
          <p className="text-xl font-bold text-foreground mt-1">
            {fmtBRL(Number(ultimaRemuneracao?.bruto || 0))}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {ultimaRemuneracao?.competencia || "—"}
          </p>
        </div>
        <div className="stat-card">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Custo total</p>
          <p className="text-xl font-bold text-foreground mt-1">{fmtBRL(custoTotal)}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Soma de {remuneracoes.length} competências
          </p>
        </div>
        {/* Card Presença removido — dados estavam equivocados */}
        <div className="stat-card">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Atuação</p>
          <p className="text-xl font-bold text-foreground mt-1">{atuacoes.length}+</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Indicações, requerimentos
          </p>
        </div>
      </section>

      {/* Mandato */}
      {(vereador.inicio_mandato || vereador.fim_mandato) && (
        <section className="stat-card flex items-center gap-3">
          <Calendar className="w-5 h-5 text-primary shrink-0" />
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Mandato</p>
            <p className="text-sm text-foreground">
              {fmtDate(vereador.inicio_mandato)} — {fmtDate(vereador.fim_mandato)}
            </p>
          </div>
        </section>
      )}

      {/* Projetos */}
      {projetos.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-primary" />
            Projetos de Lei ({projetos.length})
          </h2>
          <div className="space-y-2">
            {projetos.map((p) => (
              <article key={p.id} className="stat-card">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground capitalize">{p.tipo}</span>
                      {p.numero ? ` nº ${p.numero}` : ""}
                      {p.ano ? ` · ${p.ano}` : ""}
                      {p.status ? ` · ${p.status}` : ""}
                    </p>
                    <p className="text-sm text-foreground mt-1">
                      {p.ementa?.slice(0, 240) || "—"}
                    </p>
                    {p.resumo_simples && (
                      <p className="text-xs text-muted-foreground mt-1 italic">
                        {p.resumo_simples}
                      </p>
                    )}
                  </div>
                  {p.fonte_visualizar_url && (
                    <a
                      href={p.fonte_visualizar_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline flex items-center gap-1 shrink-0"
                    >
                      Ver fonte <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* Atuação */}
      {atuacoes.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-4">
            <Megaphone className="w-5 h-5 text-primary" />
            Atuação parlamentar (últimas {atuacoes.length})
          </h2>
          <div className="space-y-2">
            {atuacoes.map((a) => (
              <article key={a.id} className="stat-card">
                <p className="text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground capitalize">{a.tipo}</span>
                  {a.numero ? ` nº ${a.numero}` : ""} {a.ano ? `· ${a.ano}` : ""}
                </p>
                <p className="text-sm text-foreground mt-1">{a.descricao?.slice(0, 240) || "—"}</p>
                {a.resumo && (
                  <p className="text-xs text-muted-foreground mt-1 italic">{a.resumo.slice(0, 240)}</p>
                )}
              </article>
            ))}
          </div>
        </section>
      )}

      {/* Presença removida — dados estavam equivocados */}

      {/* Remuneração histórica */}
      {remuneracoes.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-4">
            <DollarSign className="w-5 h-5 text-primary" />
            Remuneração mensal (últimas {remuneracoes.length})
          </h2>
          <div className="overflow-x-auto stat-card p-0">
            <table className="w-full text-sm">
              <thead className="border-b border-border">
                <tr className="text-left">
                  <th className="px-4 py-2 font-medium text-muted-foreground">Competência</th>
                  <th className="px-4 py-2 font-medium text-muted-foreground text-right">
                    Bruto
                  </th>
                  <th className="px-4 py-2 font-medium text-muted-foreground text-right">
                    Líquido
                  </th>
                  <th className="px-4 py-2 font-medium text-muted-foreground text-right">
                    Subsídio
                  </th>
                </tr>
              </thead>
              <tbody>
                {remuneracoes.map((r, i) => (
                  <tr key={i} className="border-b border-border/50 last:border-0">
                    <td className="px-4 py-2 text-foreground">{r.competencia}</td>
                    <td className="px-4 py-2 text-right text-foreground">
                      {fmtBRL(Number(r.bruto))}
                    </td>
                    <td className="px-4 py-2 text-right text-muted-foreground">
                      {fmtBRL(Number(r.liquido))}
                    </td>
                    <td className="px-4 py-2 text-right text-muted-foreground">
                      {fmtBRL(Number(r.subsidio_referencia))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {vereador.fonte_url && (
        <p className="text-xs text-muted-foreground pt-6 border-t border-border">
          Fonte oficial:{" "}
          <a
            href={vereador.fonte_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            {new URL(vereador.fonte_url).host}
          </a>
        </p>
      )}
    </div>
  );
}

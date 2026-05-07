"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import type { Projeto, Vereador } from "@/data/api";
import { Badge } from "@/components/ui/badge";
import { statusLabels } from "@/data/api";
import ShareButton from "@/components/ShareButton";

const statusStyles: Record<string, string> = {
  aprovado: "bg-success/10 text-success border-success/20",
  recusado: "bg-destructive/10 text-destructive border-destructive/20",
  em_tramitacao: "bg-tramitacao/15 text-tramitacao border-tramitacao/20",
  apresentado: "bg-primary/10 text-primary border-primary/20",
};

export default function ProjetoCard({ p, vereadores }: { p: Projeto; vereadores?: Vereador[] }) {
  const autor = p.autor_vereador_id && vereadores
    ? vereadores.find((v) => v.id === p.autor_vereador_id)
    : null;

  const projetoTitle = `${p.tipo} nº ${p.numero}/${p.ano}`;
  const shareText = `${projetoTitle} — ${p.ementa.slice(0, 100)}`;

  return (
    <div className="stat-card card-hover">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-foreground">
            {projetoTitle}
          </span>
          <Badge variant="outline" className={statusStyles[p.status]}>
            {statusLabels[p.status]}
          </Badge>
        </div>
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {new Date(p.data).toLocaleDateString("pt-BR")}
        </span>
      </div>

      <p className="mt-2 text-sm text-foreground leading-relaxed">{p.ementa}</p>

      {p.resumo_simples && (
        <p className="mt-1.5 text-xs text-muted-foreground italic leading-relaxed">
          🤖 {p.resumo_simples}
        </p>
      )}

      <div className="mt-3 flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
        <span>Origem: {p.origem}</span>
        <span>•</span>
        <span>
          Autor:{" "}
          {autor ? (
            <Link href={`/vereadores/${autor.slug}`} className="text-primary hover:underline">
              {autor.nome}
            </Link>
          ) : (
            p.autor_texto
          )}
        </span>
      </div>

      {p.tags && p.tags.length > 0 && (
        <div className="mt-2 flex gap-1.5 flex-wrap">
          {p.tags.map((tag) => (
            <span key={tag} className="px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground text-[11px]">
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <a
            href={p.fonte_visualizar_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            aria-label="Ver fonte oficial"
          >
            <ExternalLink className="w-3 h-3" /> Ver fonte
          </a>
          <ShareButton
            title={projetoTitle}
            text={shareText}
            url={`${window.location.origin}/atuacao-parlamentar`}
          />
        </div>
        <span className="text-[10px] text-muted-foreground">
          Atualizado {new Date(p.updated_at).toLocaleDateString("pt-BR")}
        </span>
      </div>
    </div>
  );
}

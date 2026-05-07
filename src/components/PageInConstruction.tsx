import Link from "next/link";
import { Construction, ArrowLeft, ExternalLink } from "lucide-react";

export default function PageInConstruction({
  title,
  description,
  fonteUrl,
  fonteLabel,
}: {
  title: string;
  description: string;
  fonteUrl?: string;
  fonteLabel?: string;
}) {
  return (
    <div className="container py-12 max-w-2xl">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Voltar para o início
      </Link>

      <div className="stat-card text-center py-12">
        <Construction className="w-12 h-12 text-amber-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-foreground mb-2">{title}</h1>
        <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
          {description}
        </p>
        <p className="text-xs text-muted-foreground mt-4">
          Esta seção está sendo migrada para a nova versão da plataforma.
          <br />
          Os dados estarão disponíveis em breve.
        </p>
        {fonteUrl && fonteLabel && (
          <a
            href={fonteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            <ExternalLink className="w-3.5 h-3.5" /> {fonteLabel}
          </a>
        )}
      </div>
    </div>
  );
}

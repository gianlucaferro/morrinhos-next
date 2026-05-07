import { ExternalLink, Info } from "lucide-react";

type Fonte = {
  nome: string;
  url: string;
  descricao?: string;
};

type Indicador = {
  rotulo: string;
  valor?: string;
  fonte?: string;
  fonteUrl?: string;
};

/**
 * Layout consistente pra paginas que ainda nao tem dados sincronizados
 * mas listam fontes oficiais. Renderizado em /economia, /infraestrutura,
 * /meio-ambiente etc enquanto os syncs sao construidos.
 *
 * Componente puro (sem fetch). Pode evoluir gradualmente: page passa
 * `indicadores` ja preenchidos quando o sync existe pra aquele dado.
 */
export default function EmColetaSection({
  titulo,
  descricao,
  fontes,
  indicadores,
  exemplosCruzamentos,
  iconBg = "bg-primary/10",
}: {
  titulo: string;
  descricao: string;
  fontes: Fonte[];
  indicadores?: Indicador[];
  exemplosCruzamentos?: string[];
  iconBg?: string;
}) {
  return (
    <div className="space-y-6">
      {/* Banner em coleta */}
      <div className="stat-card border-amber-500/30 bg-amber-500/5">
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center shrink-0`}>
            <Info className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground mb-1">
              {titulo} — Em coleta
            </h2>
            <p className="text-sm text-foreground/85 leading-relaxed">
              {descricao}{" "}
              <strong>Os dados estão sendo integrados</strong> aos poucos. Por enquanto,
              consulte as fontes oficiais abaixo. Em breve disponibilizaremos os dados
              consolidados, atualizados automaticamente, com cruzamentos relevantes.
            </p>
          </div>
        </div>
      </div>

      {/* Indicadores parciais (se houver) */}
      {indicadores && indicadores.length > 0 && (
        <section>
          <h3 className="text-base font-semibold text-foreground mb-3">
            Indicadores disponíveis
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {indicadores.map((i) => (
              <div key={i.rotulo} className="stat-card">
                <p className="text-xs text-muted-foreground">{i.rotulo}</p>
                <p className="text-xl font-bold text-foreground mt-1">
                  {i.valor || "—"}
                </p>
                {i.fonte && (
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {i.fonteUrl ? (
                      <a
                        href={i.fonteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline inline-flex items-center gap-1"
                      >
                        {i.fonte} <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    ) : (
                      i.fonte
                    )}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Exemplos de cruzamentos planejados */}
      {exemplosCruzamentos && exemplosCruzamentos.length > 0 && (
        <section>
          <h3 className="text-base font-semibold text-foreground mb-3">
            O que vai aparecer aqui
          </h3>
          <ul className="stat-card list-none space-y-2.5">
            {exemplosCruzamentos.map((c, i) => (
              <li key={i} className="text-sm text-foreground/85 leading-relaxed flex items-start gap-2">
                <span className="text-primary font-bold mt-0.5">•</span>
                <span>{c}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Fontes oficiais */}
      <section>
        <h3 className="text-base font-semibold text-foreground mb-3">
          Fontes oficiais
        </h3>
        <p className="text-sm text-muted-foreground mb-3">
          Enquanto os dados não estão consolidados aqui, você pode consultar diretamente:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {fontes.map((f) => (
            <a
              key={f.url}
              href={f.url}
              target="_blank"
              rel="noopener noreferrer"
              className="stat-card card-hover flex items-start gap-3 group"
            >
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-foreground text-sm mb-0.5">{f.nome}</h4>
                {f.descricao && (
                  <p className="text-xs text-muted-foreground leading-relaxed">{f.descricao}</p>
                )}
              </div>
              <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0 group-hover:text-primary transition-colors" />
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}

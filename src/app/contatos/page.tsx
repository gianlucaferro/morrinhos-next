import { Phone, ExternalLink, Smartphone } from "lucide-react";
import { pageMetadata } from "@/lib/seo";
import WhatsAppIcon from "@/components/icons/WhatsAppIcon";

export const metadata = pageMetadata({
  title: "Contatos Úteis de Morrinhos GO",
  description:
    "Telefones e WhatsApp de serviços públicos essenciais de Morrinhos: Polícia, Bombeiros, SAMU, Prefeitura e mais.",
  path: "/contatos",
});

type ContatoItem = {
  nome: string;
  numero: string;
  display: string;
  tipo?: "whatsapp" | "telefone" | "link";
  mensagem?: string;
  url?: string;
};

// Lista oficial de contatos de Morrinhos pendente.
// Os números do template original eram de Piracanjuba e foram removidos
// pra evitar publicar telefones errados pra moradores de Morrinhos.
//
// TODO: Coletar telefones oficiais com a Prefeitura/Câmara de Morrinhos
// e popular as 3 categorias (Segurança, Saúde, Serviços Públicos).
// Fontes a consultar:
//   - Prefeitura: https://morrinhos.go.gov.br/
//   - Câmara: https://morrinhos.go.leg.br/
//   - Carta de Serviços ao Cidadão: https://acessoainformacao.morrinhos.go.gov.br/
const contatos: { categoria: string; itens: ContatoItem[] }[] = [];

export default function ContatosUteisPage() {
  return (
    <div className="container py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Phone className="w-6 h-6 text-primary" />
          Contatos Úteis
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Telefones e WhatsApp de serviços públicos essenciais de Morrinhos.
        </p>
      </div>

      {contatos.length === 0 && (
        <div className="stat-card text-center py-12 max-w-2xl mx-auto">
          <p className="text-base font-medium text-foreground">
            Em breve
          </p>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
            Estamos coletando os telefones oficiais de Morrinhos junto à Prefeitura,
            Câmara e órgãos municipais. Em caso de emergência, ligue:
          </p>
          <ul className="text-sm text-foreground mt-4 inline-block text-left space-y-1">
            <li>• <strong>Polícia Militar:</strong> 190</li>
            <li>• <strong>SAMU:</strong> 192</li>
            <li>• <strong>Bombeiros:</strong> 193</li>
            <li>• <strong>Defesa Civil:</strong> 199</li>
            <li>• <strong>Disque-Denúncia:</strong> 181</li>
          </ul>
        </div>
      )}

      {contatos.map((grupo) => (
        <section key={grupo.categoria}>
          <h2 className="text-lg font-semibold text-foreground mb-3">{grupo.categoria}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {grupo.itens.map((item) => {
              const isTelefone = item.tipo === "telefone";
              const isLink = item.tipo === "link";
              const href = isLink
                ? item.url!
                : isTelefone
                ? `tel:+${item.numero}`
                : `https://wa.me/${item.numero}${
                    item.mensagem ? `?text=${encodeURIComponent(item.mensagem)}` : ""
                  }`;
              const opensNew = !isTelefone;
              return (
                <a
                  key={item.numero || item.url}
                  href={href}
                  target={opensNew ? "_blank" : undefined}
                  rel={opensNew ? "noopener noreferrer" : undefined}
                  className="stat-card card-hover flex items-center gap-3 group"
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                    style={{
                      backgroundColor:
                        isLink || isTelefone ? "hsl(var(--primary) / 0.12)" : "#25D36620",
                    }}
                  >
                    {isLink ? (
                      <ExternalLink className="w-5 h-5 text-primary" />
                    ) : isTelefone ? (
                      <Smartphone className="w-5 h-5 text-primary" />
                    ) : (
                      <WhatsAppIcon className="w-5 h-5" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{item.nome}</p>
                    <p className="text-xs text-muted-foreground">{item.display}</p>
                  </div>
                  <ExternalLink className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </a>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

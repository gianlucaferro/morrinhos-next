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

const contatos: { categoria: string; itens: ContatoItem[] }[] = [
  {
    categoria: "Segurança",
    itens: [
      { nome: "Polícia Militar 1", numero: "5564999719063", display: "(64) 99971-9063" },
      { nome: "Polícia Militar 2", numero: "5564999714141", display: "(64) 99971-4141" },
      { nome: "CPE 10 (GPT)", numero: "5564999713304", display: "(64) 99971-3304" },
      { nome: "Bombeiros Morrinhos", numero: "5562984940249", display: "(62) 98494-0249" },
      { nome: "Delegacia de Polícia Civil", numero: "556434052014", display: "(64) 3405-2014" },
      {
        nome: "Delegacia Virtual (Registre Ocorrência Online)",
        numero: "",
        display: "raivirtual.ssp.go.gov.br",
        tipo: "link",
        url: "https://raivirtual.ssp.go.gov.br/#/",
      },
      {
        nome: "Conselho Tutelar",
        numero: "5564999621487",
        display: "(64) 99962-1487",
        tipo: "telefone",
      },
    ],
  },
  {
    categoria: "Saúde",
    itens: [
      { nome: "Base do SAMU", numero: "5564996265935", display: "(64) 99626-5935", tipo: "telefone" },
      { nome: "CAPS", numero: "5564996269555", display: "(64) 99626-9555" },
    ],
  },
  {
    categoria: "Serviços Públicos",
    itens: [
      { nome: "Prefeitura Municipal", numero: "556492382040", display: "(64) 9238-2040" },
      { nome: "Secretaria de Obras", numero: "5564992437140", display: "(64) 99243-7140" },
      { nome: "Secretaria Assistência Social", numero: "5564999558619", display: "(64) 99955-8619" },
      { nome: "Secretaria de Esportes", numero: "5564999558619", display: "(64) 99955-8619" },
      { nome: "CREAS", numero: "5564996023899", display: "(64) 99602-3899" },
      { nome: "Cad Único / Bolsa Família", numero: "5564999849676", display: "(64) 99984-9676" },
      { nome: "SINE", numero: "5564992970908", display: "(64) 99297-0908" },
      { nome: "SAMARH", numero: "5564992980070", display: "(64) 99298-0070" },
      { nome: "Gabinete Sec. Educação", numero: "5564920002303", display: "(64) 92000-2303" },
      { nome: "Secretaria de Saúde", numero: "5564996015760", display: "(64) 9601-5760" },
      { nome: "Secretaria de Educação", numero: "556434054069", display: "(64) 3405-4069", tipo: "telefone" },
      { nome: "Clínica de Castração", numero: "5564920015516", display: "(64) 92001-5516" },
      { nome: "Dept. Fiscalização e Postura", numero: "5564920002295", display: "(64) 92000-2295" },
      {
        nome: "Troca de Lâmpada de Poste",
        numero: "5564933008200",
        display: "(64) 93300-8200",
        mensagem:
          "Olá, gostaria de solicitar a troca de lâmpada de poste.\n\nNúmero do poste: \n\nEndereço: \n\nAnexe foto do local.",
      },
    ],
  },
];

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

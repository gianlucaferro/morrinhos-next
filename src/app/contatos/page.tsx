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

// Contatos oficiais Morrinhos-GO — fontes:
//   - Prefeitura: https://morrinhos.go.gov.br/saude/
//   - WhatsApp Bolsa Família/CRAS: divulgado pela Sec. Ass. Social
const contatos: { categoria: string; itens: ContatoItem[] }[] = [
  {
    categoria: "Emergências",
    itens: [
      { nome: "Polícia Militar", numero: "190", display: "190", tipo: "telefone" },
      { nome: "SAMU", numero: "192", display: "192", tipo: "telefone" },
      { nome: "Bombeiros", numero: "193", display: "193", tipo: "telefone" },
      { nome: "Defesa Civil", numero: "199", display: "199", tipo: "telefone" },
      { nome: "Disque-Denúncia (anônima)", numero: "181", display: "181", tipo: "telefone" },
      { nome: "Polícia Civil", numero: "197", display: "197", tipo: "telefone" },
    ],
  },
  {
    categoria: "Saúde",
    itens: [
      { nome: "Hospital Municipal", numero: "6434172002", display: "(64) 3417-2002", tipo: "telefone" },
      { nome: "Secretaria Municipal de Saúde", numero: "6434172016", display: "(64) 3417-2016", tipo: "telefone" },
      { nome: "SAMU Morrinhos (24h)", numero: "6434172025", display: "(64) 3417-2025", tipo: "telefone" },
      { nome: "UBS Centro (Genoveva Alves)", numero: "6434172076", display: "(64) 3417-2076", tipo: "telefone" },
      { nome: "UBS Jardim Romano", numero: "6434175135", display: "(64) 3417-5135", tipo: "telefone" },
      { nome: "UBS Jardim América", numero: "6434174890", display: "(64) 3417-4890", tipo: "telefone" },
      { nome: "UBS Noroeste", numero: "6434172129", display: "(64) 3417-2129", tipo: "telefone" },
      { nome: "UBS Morro da Saudade", numero: "6434174988", display: "(64) 3417-4988", tipo: "telefone" },
      { nome: "UBS Cristo Redentor", numero: "6434172064", display: "(64) 3417-2064", tipo: "telefone" },
      { nome: "UBS Santa Fé", numero: "6434172135", display: "(64) 3417-2135", tipo: "telefone" },
      { nome: "CAPS (Saúde Mental)", numero: "6434172061", display: "(64) 3417-2061", tipo: "telefone" },
      { nome: "CAPS AD (Álcool/Drogas)", numero: "6434172026", display: "(64) 3417-2026", tipo: "telefone" },
      { nome: "CEO (Odontológico)", numero: "6434172120", display: "(64) 3417-2120", tipo: "telefone" },
      { nome: "CREFIM (Fisioterapia)", numero: "6434172087", display: "(64) 3417-2087", tipo: "telefone" },
      { nome: "Endemias/Dengue", numero: "6434172067", display: "(64) 3417-2067", tipo: "telefone" },
      { nome: "Vigilância Sanitária", numero: "6434172113", display: "(64) 3417-2113", tipo: "telefone" },
      { nome: "Farmácia Básica Municipal", numero: "6434172018", display: "(64) 3417-2018", tipo: "telefone" },
    ],
  },
  {
    categoria: "Educação",
    itens: [
      { nome: "Secretaria Municipal de Educação", numero: "6434172000", display: "(64) 3417-2000", tipo: "telefone" },
    ],
  },
  {
    categoria: "Assistência Social",
    itens: [
      { nome: "CRAS / CadÚnico / Bolsa Família", numero: "5564999849676", display: "(64) 99984-9676", tipo: "whatsapp", mensagem: "Olá, preciso de informações sobre Bolsa Família/CadÚnico" },
      { nome: "CREAS", numero: "5564996023890", display: "(64) 99602-3890", tipo: "whatsapp", mensagem: "Olá, preciso de atendimento" },
      { nome: "Sec. Mun. de Assistência Social", numero: "5564992382040", display: "(64) 99238-2040", tipo: "whatsapp", mensagem: "Olá" },
    ],
  },
  {
    categoria: "Câmara Municipal",
    itens: [
      { nome: "Câmara Municipal de Morrinhos", numero: "", display: "morrinhos.go.leg.br", tipo: "link", url: "https://morrinhos.go.leg.br/" },
    ],
  },
  {
    categoria: "Prefeitura",
    itens: [
      { nome: "Site oficial da Prefeitura", numero: "", display: "morrinhos.go.gov.br", tipo: "link", url: "https://morrinhos.go.gov.br/" },
      { nome: "Portal Acesso à Informação", numero: "", display: "acessoainformacao.morrinhos.go.gov.br", tipo: "link", url: "https://acessoainformacao.morrinhos.go.gov.br/" },
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

import {
  Megaphone,
  Users,
  Eye,
  MapPin,
  CheckCircle2,
  MessageSquare,
  BarChart3,
  Star,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { pageMetadata } from "@/lib/seo";
import WhatsAppIcon from "@/components/icons/WhatsAppIcon";

export const metadata = pageMetadata({
  title: "Anuncie no Morrinhos.ai — Alcance moradores de Morrinhos",
  description:
    "Anuncie seu negócio no site mais acessado de Morrinhos. Aproximadamente 300 visitas por dia, público 100% local e qualificado.",
  path: "/anuncie",
});

const WHATSAPP = "5564992375458";

function StatCard({
  icon: Icon,
  value,
  label,
}: {
  icon: React.ElementType;
  value: string;
  label: string;
}) {
  return (
    <div className="stat-card text-center">
      <Icon className="w-6 h-6 text-primary mx-auto mb-2" />
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

export default function AnunciePage() {
  const msgWhatsApp = encodeURIComponent(
    "Olá! Vi no Morrinhos.ai e tenho interesse em anunciar meu negócio. Gostaria de saber mais detalhes."
  );
  const msgDestaque = encodeURIComponent(
    "Olá! Tenho interesse no plano DESTAQUE do Morrinhos.ai. Gostaria de saber mais."
  );

  return (
    <div className="container py-8 space-y-10 max-w-3xl mx-auto">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
          <Megaphone className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-3xl md:text-4xl font-extrabold text-foreground">
          Anuncie no Morrinhos<span className="text-[#25D366]">.ai</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-lg mx-auto">
          Seu negócio visto por centenas de moradores de Morrinhos todos os dias.
          Público 100% local e qualificado.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={Eye} value="~300" label="visitas por dia" />
        <StatCard icon={Users} value="~9.000" label="visitas por mês" />
        <StatCard icon={MapPin} value="100%" label="público local" />
        <StatCard icon={BarChart3} value="51.351" label="habitantes" />
      </div>

      <div className="stat-card space-y-4">
        <h2 className="text-lg font-bold text-foreground">Por que anunciar aqui?</h2>
        <div className="space-y-3">
          {[
            "Seu banner aparece na homepage, entre as seções mais acessadas do site",
            "Público exclusivamente de Morrinhos — moradores que buscam informações da cidade",
            "Mais barato que qualquer outra mídia local (outdoor, rádio, carro de som)",
            "Relatório mensal com número de visualizações e cliques no seu anúncio",
            "Sem contrato de fidelidade — cancele quando quiser",
            "Anúncio configurado em 24h após aprovação",
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-accent shrink-0 mt-0.5" />
              <p className="text-sm text-foreground">{item}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-lg font-bold text-foreground text-center mb-4">
          Escolha seu plano
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="stat-card border-border space-y-4">
            <div>
              <Badge variant="secondary" className="mb-2">Padrão</Badge>
              <h3 className="text-xl font-bold text-foreground">
                R$ 200<span className="text-sm font-normal text-muted-foreground">/mês</span>
              </h3>
              <p className="text-xs text-muted-foreground mt-1">Apenas R$ 6,60 por dia</p>
            </div>
            <div className="space-y-2">
              {[
                "Banner entre as seções da homepage",
                "Logo + nome do negócio + link",
                "Visível em todas as visitas à homepage",
                "Relatório mensal de desempenho",
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-foreground">
                  <CheckCircle2 className="w-3.5 h-3.5 text-accent shrink-0" /> {item}
                </div>
              ))}
            </div>
            <a
              href={`https://wa.me/${WHATSAPP}?text=${msgWhatsApp}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-[#25D366] hover:bg-[#1da851] text-white font-semibold text-sm transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
              Quero anunciar
            </a>
          </div>

          <div className="stat-card border-primary/30 bg-gradient-to-br from-primary/5 to-transparent space-y-4 relative overflow-hidden">
            <div className="absolute top-3 right-3">
              <Star className="w-5 h-5 text-primary fill-primary" />
            </div>
            <div>
              <Badge className="mb-2 bg-primary text-primary-foreground">Destaque</Badge>
              <h3 className="text-xl font-bold text-foreground">
                R$ 400<span className="text-sm font-normal text-muted-foreground">/mês</span>
              </h3>
              <p className="text-xs text-muted-foreground mt-1">Apenas R$ 13,30 por dia</p>
            </div>
            <div className="space-y-2">
              {[
                "Tudo do plano Padrão +",
                "Posição fixa no topo da homepage",
                "Banner maior e mais visível",
                'Selo "Apoiador do Morrinhos.ai"',
                "Prioridade na configuração",
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-foreground">
                  <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" /> {item}
                </div>
              ))}
            </div>
            <a
              href={`https://wa.me/${WHATSAPP}?text=${msgDestaque}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm transition-colors"
            >
              <Star className="w-4 h-4" />
              Quero o Destaque
            </a>
          </div>
        </div>
      </div>

      <div className="stat-card bg-muted/30">
        <h3 className="font-semibold text-foreground mb-3">Compare com outras mídias</h3>
        <div className="space-y-2 text-sm">
          {[
            { meio: "Carro de som", preco: "R$ 500-800/mês", alcance: "Quem está na rua" },
            { meio: "Outdoor", preco: "R$ 300-600/mês", alcance: "Quem passa no local" },
            { meio: "Rádio (spot 30s)", preco: "R$ 400-1.000/mês", alcance: "Audiência difusa" },
            { meio: "Morrinhos.ai", preco: "R$ 200/mês", alcance: "~9.000 visitas/mês, 100% local" },
          ].map((m, i) => (
            <div
              key={i}
              className={`flex items-center justify-between p-2 rounded-lg ${
                m.meio === "Morrinhos.ai" ? "bg-primary/10 font-semibold" : ""
              }`}
            >
              <span className="text-foreground">{m.meio}</span>
              <span className="text-muted-foreground text-xs">{m.preco}</span>
              <span className="text-xs text-muted-foreground hidden sm:block">
                {m.alcance}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="text-center space-y-4">
        <h2 className="text-xl font-bold text-foreground">
          Pronto para aparecer para Morrinhos?
        </h2>
        <p className="text-sm text-muted-foreground">
          Fale conosco pelo WhatsApp. Configuramos seu anúncio em até 24 horas.
        </p>
        <a
          href={`https://wa.me/${WHATSAPP}?text=${msgWhatsApp}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#25D366] hover:bg-[#1da851] text-white font-semibold text-base transition-colors shadow-lg"
        >
          <WhatsAppIcon className="w-5 h-5" />
          Falar no WhatsApp
        </a>
        <p className="text-[10px] text-muted-foreground">
          WhatsApp: (64) 99237-5458 · Gianluca Ferro
        </p>
      </div>
    </div>
  );
}

import Link from "next/link";
import {
  ExternalLink,
  Sparkles,
  Scale,
  Users,
  Map,
  Pill,
  Trash2,
  ShoppingBag,
  MessageCircle,
  Award,
  Landmark,
  Building2,
  BarChart3,
  ShieldCheck,
} from "lucide-react";
import WhatsAppIcon from "@/components/icons/WhatsAppIcon";
import { pageMetadata } from "@/lib/seo";
import SubscriptionForm from "./SubscriptionForm";

export const metadata = pageMetadata({
  title:
    "Sobre o Morrinhos.ai — 1º portal de transparência com IA do Brasil | Morrinhos GO",
  description:
    "Morrinhos.ai é o primeiro portal de transparência municipal otimizado por inteligência artificial do Brasil. Independente, sem vínculo com órgão público, criado e mantido por Gianluca Ferro.",
  path: "/sobre",
});

const SITE_URL = "https://morrinhos.ai";
const WHATSAPP_NUM = "5564992375458";
const WHATSAPP_MSG =
  "Olá, Gianluca! Vim pelo Morrinhos.Ai! Meu nome é: ";
const whatsappLink = `https://wa.me/${WHATSAPP_NUM}?text=${encodeURIComponent(WHATSAPP_MSG)}`;

/** Marca visual: "Morrinhos" + ".ai" verde (#25D366). Padrão do site. */
function Brand() {
  return (
    <>
      Morrinhos<span className="text-[#25D366]">.ai</span>
    </>
  );
}

const articleJsonLd = {
  "@context": "https://schema.org",
  "@type": "AboutPage",
  name: "Sobre o Morrinhos.ai",
  url: `${SITE_URL}/sobre`,
  description:
    "Morrinhos.ai é o primeiro portal de transparência municipal otimizado por inteligência artificial do Brasil. Independente, sem vínculo público, criado e mantido por Gianluca Ferro.",
  mainEntity: {
    "@type": "WebSite",
    name: "Morrinhos.ai",
    url: SITE_URL,
    inLanguage: "pt-BR",
    publisher: {
      "@type": "Organization",
      name: "Ferro Labs Tecnologia LTDA",
      taxID: "66.034.538/0001-25",
      url: SITE_URL,
      founder: {
        "@type": "Person",
        name: "Gianluca Ferro",
      },
    },
    about: {
      "@type": "Place",
      name: "Morrinhos",
      address: {
        "@type": "PostalAddress",
        addressLocality: "Morrinhos",
        addressRegion: "GO",
        addressCountry: "BR",
      },
    },
  },
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "O que é o Morrinhos.ai?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "O Morrinhos.ai é o primeiro portal de transparência municipal otimizado por inteligência artificial do Brasil. Centraliza dados oficiais da Prefeitura e Câmara de Morrinhos (GO) — contratos, licitações, salários de servidores, despesas, projetos de lei, votações — em uma única interface clara e acessível, com links de volta às fontes originais para verificação.",
      },
    },
    {
      "@type": "Question",
      name: "Quem mantém o Morrinhos.ai?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "O projeto é integralmente desenvolvido e mantido por Gianluca Ferro, cidadão comum, com recursos próprios. Não há vínculo, financiamento ou patrocínio do poder público (Prefeitura, Câmara, governo estadual ou federal).",
      },
    },
    {
      "@type": "Question",
      name: "Por que usar inteligência artificial em transparência pública?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "A Lei de Acesso à Informação (Lei 12.527/2011) garante que dados públicos estejam disponíveis, mas na prática estão fragmentados em dezenas de portais distintos. A IA permite consolidar, classificar e resumir essas informações em linguagem clara, transformando transparência formal em transparência efetiva. É o caminho para que IA se torne padrão ouro da transparência pública municipal no Brasil.",
      },
    },
    {
      "@type": "Question",
      name: "O Morrinhos.ai é oficial?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Não. É uma iniciativa cidadã independente. Todos os dados exibidos vêm de fontes públicas oficiais (Prefeitura, Câmara, TCM-GO, IBGE, Tesouro Nacional, DataSUS, INEP, INMET, entre outras), com link direto para a origem em cada informação.",
      },
    },
    {
      "@type": "Question",
      name: "Que tipo de dados o Morrinhos.ai mostra?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Câmara Municipal (vereadores, projetos, votações, atas), Prefeitura (contratos, licitações, servidores, salários, despesas, obras, decretos, portarias, leis, TCM-GO), saúde (dengue, profissionais, estabelecimentos), educação (IDEB, escolas), agronegócio, segurança pública, benefícios sociais, arrecadação, clima diário e utilidades para o cotidiano (farmácias de plantão, coleta de lixo, contatos úteis, marketplace local).",
      },
    },
    {
      "@type": "Question",
      name: "Como entro em contato?",
      acceptedAnswer: {
        "@type": "Answer",
        text: `WhatsApp do criador Gianluca Ferro: +55 64 99237-5458. Link direto: ${whatsappLink}`,
      },
    },
  ],
};

const fontes = [
  {
    label: "Portal Centi — Câmara de Morrinhos",
    url: "https://morrinhos.go.leg.br/",
  },
  {
    label: "Portal Centi — Prefeitura de Morrinhos",
    url: "https://morrinhos.go.gov.br/",
  },
  {
    label: "Tribunal de Contas dos Municípios (TCM-GO)",
    url: "https://www.tcm.go.gov.br/",
  },
  {
    label: "Tesouro Nacional — SICONFI/DCA",
    url: "https://siconfi.tesouro.gov.br/",
  },
  {
    label: "Portal da Transparência Federal",
    url: "https://portaldatransparencia.gov.br/",
  },
  { label: "IBGE Cidades — Morrinhos", url: "https://cidades.ibge.gov.br/brasil/go/morrinhos" },
  { label: "InfoDengue (Fiocruz)", url: "https://info.dengue.mat.br/" },
  { label: "INEP — Censo Escolar", url: "https://www.gov.br/inep/" },
];

export default function SobrePage() {
  return (
    <div className="container py-8 max-w-3xl">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <h1 className="text-3xl md:text-4xl font-extrabold text-foreground mb-3 leading-tight">
        Sobre o <Brand />
      </h1>
      <p className="text-base md:text-lg text-muted-foreground leading-relaxed mb-8 max-w-2xl">
        O <strong className="text-foreground">primeiro portal de transparência municipal
        otimizado por inteligência artificial do Brasil</strong> — independente, criado
        e mantido por um cidadão comum, com base 100% em dados oficiais.
      </p>

      {/* Lead — bloco de destaque visual */}
      <section
        aria-labelledby="lead"
        className="stat-card mb-8 border-primary/30 bg-gradient-to-br from-primary/5 to-transparent"
      >
        <div className="flex items-start gap-3">
          <Award className="w-6 h-6 text-primary shrink-0 mt-0.5" aria-hidden />
          <div>
            <h2 id="lead" className="text-lg font-semibold text-foreground mb-2">
              O que é o <Brand />
            </h2>
            <p className="text-sm md:text-base text-foreground leading-relaxed mb-3">
              O <Brand /> é o <strong>primeiro portal de transparência otimizado por
              inteligência artificial de um município brasileiro</strong>, integralmente
              desenvolvido por <strong>Gianluca Ferro</strong> — cidadão comum — com recursos
              próprios e <strong>sem qualquer vínculo, financiamento ou patrocínio do poder
              público</strong>.
            </p>
            <p className="text-sm text-foreground/85 leading-relaxed">
              A plataforma centraliza dados oficiais da Prefeitura e Câmara de Morrinhos (GO),
              do Tribunal de Contas dos Municípios, do Tesouro Nacional, do IBGE, da DataSUS, do
              INEP e de outros órgãos públicos em uma única interface clara, com links diretos
              para a fonte original de cada informação.
            </p>
          </div>
        </div>
      </section>

      {/* IA + Transparência: visão */}
      <section aria-labelledby="ia-transparencia" className="mb-8">
        <h2
          id="ia-transparencia"
          className="text-xl md:text-2xl font-bold text-foreground flex items-center gap-2 mb-3"
        >
          <Sparkles className="w-5 h-5 text-primary" aria-hidden />
          IA como aliada da transparência e do combate à corrupção
        </h2>
        <p className="text-sm md:text-base text-foreground leading-relaxed mb-3">
          Acreditamos que a inteligência artificial aplicada à transparência pública vai se
          tornar o <strong>padrão ouro</strong> da fiscalização cidadã no médio prazo
          e iniciativas como o <Brand /> tendem a se espalhar por outras cidades.
          É a forma mais eficiente e barata de disponibilizar informações de
          múltiplos portais centralizadas, classificadas e resumidas em linguagem
          acessível — dando sentido real ao princípio constitucional da publicidade.
        </p>
        <p className="text-sm md:text-base text-foreground leading-relaxed">
          Embora exista uma quantidade massiva de dados sobre administração pública
          disponíveis na internet — atendendo formalmente à{" "}
          <a
            href="https://www.planalto.gov.br/ccivil_03/_Ato2011-2014/2011/Lei/L12527.htm"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline inline-flex items-center gap-1"
          >
            Lei de Acesso à Informação (Lei 12.527/2011)
            <ExternalLink className="w-3 h-3" aria-hidden />
          </a>{" "}
          — a eficácia prática é prejudicada quando o cidadão comum não sabe onde
          buscar a informação que precisa. O <Brand /> resolve essa lacuna.
        </p>
      </section>

      {/* O que você encontra */}
      <section aria-labelledby="o-que-tem" className="mb-8">
        <h2
          id="o-que-tem"
          className="text-xl md:text-2xl font-bold text-foreground flex items-center gap-2 mb-4"
        >
          <Map className="w-5 h-5 text-primary" aria-hidden />
          O que você encontra no <Brand />
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          <div className="stat-card border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-transparent">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                <Landmark className="w-5 h-5 text-blue-500" aria-hidden />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-foreground text-base mb-1.5">
                  Câmara Municipal
                </h3>
                <p className="text-sm text-foreground/85 leading-relaxed">
                  Vereadores, projetos de lei, votações, atos administrativos, contratos,
                  licitações, despesas, receitas, diárias e remunerações.
                </p>
              </div>
            </div>
          </div>
          <div className="stat-card border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-transparent">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                <Building2 className="w-5 h-5 text-emerald-500" aria-hidden />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-foreground text-base mb-1.5">
                  Prefeitura Municipal
                </h3>
                <p className="text-sm text-foreground/85 leading-relaxed">
                  Prefeito, secretarias, contratos, servidores, despesas, obras, decretos,
                  portarias, leis municipais, frota e dados do TCM-GO.
                </p>
              </div>
            </div>
          </div>
          <div className="stat-card border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-transparent">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center shrink-0">
                <BarChart3 className="w-5 h-5 text-purple-500" aria-hidden />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-foreground text-base mb-1.5">
                  Indicadores municipais
                </h3>
                <p className="text-sm text-foreground/85 leading-relaxed">
                  Saúde (dengue, CNES, profissionais), Educação (IDEB, escolas), Agro,
                  Segurança Pública, Benefícios Sociais, Arrecadação e Clima diário.
                </p>
              </div>
            </div>
          </div>
          <div className="stat-card border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5 text-amber-600" aria-hidden />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-foreground text-base mb-1.5">
                  Verificável na fonte
                </h3>
                <p className="text-sm text-foreground/85 leading-relaxed">
                  Cada informação tem link direto para o portal oficial de origem
                  (Prefeitura, Câmara, TCM, Tesouro, IBGE etc).
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Utilidade pública diária */}
      <section aria-labelledby="utilidade" className="mb-8">
        <h2
          id="utilidade"
          className="text-xl md:text-2xl font-bold text-foreground flex items-center gap-2 mb-4"
        >
          <Users className="w-5 h-5 text-primary" aria-hidden />
          Utilidade pública para o dia a dia
        </h2>
        <p className="text-sm md:text-base text-foreground leading-relaxed mb-4">
          Além de transparência, o <Brand /> oferece <strong>serviços de utilidade
          pública</strong> que facilitam a vida do morador:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="stat-card flex items-start gap-3">
            <Trash2 className="w-5 h-5 text-primary mt-0.5 shrink-0" aria-hidden />
            <div>
              <h3 className="font-semibold text-foreground text-sm mb-1">
                Coleta de Lixo
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Datas da coleta comum e seletiva por bairro, com opção de adicionar
                lembrete no Google Agenda — o morador recebe notificação na véspera.
              </p>
            </div>
          </div>
          <div className="stat-card flex items-start gap-3">
            <Pill className="w-5 h-5 text-orange-500 mt-0.5 shrink-0" aria-hidden />
            <div>
              <h3 className="font-semibold text-foreground text-sm mb-1">
                Plantão de Farmácias
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Calendário oficial das farmácias 24h da semana atual e das próximas,
                com telefone, foto e link direto para o Waze.
              </p>
            </div>
          </div>
          <div className="stat-card flex items-start gap-3">
            <MessageCircle className="w-5 h-5 text-[#25D366] mt-0.5 shrink-0" aria-hidden />
            <div>
              <h3 className="font-semibold text-foreground text-sm mb-1">
                Zap MHS
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Diretório gratuito de WhatsApp profissional de comércios, prestadores
                de serviços e profissionais autônomos de Morrinhos.
              </p>
            </div>
          </div>
          <div className="stat-card flex items-start gap-3">
            <ShoppingBag className="w-5 h-5 text-[#25D366] mt-0.5 shrink-0" aria-hidden />
            <div>
              <h3 className="font-semibold text-foreground text-sm mb-1">
                Compra e Venda MHS
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Marketplace local 100% gratuito para anunciar e negociar imóveis,
                veículos, eletrônicos, agro e serviços entre moradores.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Plataforma evolutiva */}
      <section aria-labelledby="evolutivo" className="mb-8">
        <h2
          id="evolutivo"
          className="text-xl md:text-2xl font-bold text-foreground flex items-center gap-2 mb-3"
        >
          <Scale className="w-5 h-5 text-primary" aria-hidden />
          Plataforma em evolução constante
        </h2>
        <p className="text-sm md:text-base text-foreground leading-relaxed">
          O <Brand /> é desenvolvido em iterações contínuas, com novas integrações
          mensais a portais de dados públicos federais e estaduais (CNJ DataJud, PNCP,
          TSE, INMET, CONAB, DETRAN-GO, INEP entre outros). Sugestões de novas funcionalidades
          são bem-vindas.
        </p>
      </section>

      {/* FAQ — Perguntas Frequentes */}
      <section aria-labelledby="faq" className="mb-8">
        <h2
          id="faq"
          className="text-xl md:text-2xl font-bold text-foreground mb-4 flex items-center gap-2"
        >
          <Sparkles className="w-5 h-5 text-primary" aria-hidden />
          Perguntas Frequentes
        </h2>
        <div className="space-y-3">
          <details className="stat-card group">
            <summary className="cursor-pointer font-semibold text-foreground text-sm md:text-base flex items-center justify-between">
              <span>O que é o <Brand />?</span>
              <span className="text-muted-foreground text-xl group-open:rotate-45 transition-transform">+</span>
            </summary>
            <p className="text-sm text-foreground/85 leading-relaxed mt-3">
              É o primeiro portal de transparência municipal otimizado por inteligência
              artificial do Brasil. Centraliza dados oficiais da Prefeitura e Câmara de
              Morrinhos (GO) — contratos, licitações, salários de servidores, despesas,
              projetos de lei, votações — em uma única interface clara e acessível, com
              links de volta às fontes originais para verificação.
            </p>
          </details>

          <details className="stat-card group">
            <summary className="cursor-pointer font-semibold text-foreground text-sm md:text-base flex items-center justify-between">
              <span>Quem mantém o projeto?</span>
              <span className="text-muted-foreground text-xl group-open:rotate-45 transition-transform">+</span>
            </summary>
            <p className="text-sm text-foreground/85 leading-relaxed mt-3">
              O projeto é integralmente desenvolvido e mantido por <strong>Gianluca Ferro</strong>,
              cidadão comum, com recursos próprios. <strong>Não há vínculo, financiamento ou
              patrocínio do poder público</strong> (Prefeitura, Câmara, governo estadual ou
              federal).
            </p>
          </details>

          <details className="stat-card group">
            <summary className="cursor-pointer font-semibold text-foreground text-sm md:text-base flex items-center justify-between">
              <span>Por que usar inteligência artificial em transparência pública?</span>
              <span className="text-muted-foreground text-xl group-open:rotate-45 transition-transform">+</span>
            </summary>
            <p className="text-sm text-foreground/85 leading-relaxed mt-3">
              A Lei de Acesso à Informação (Lei 12.527/2011) garante que dados públicos
              estejam disponíveis, mas na prática estão fragmentados em dezenas de portais
              distintos. A IA permite consolidar, classificar e resumir essas informações
              em linguagem clara, transformando transparência formal em transparência
              efetiva. É o caminho para que IA se torne <strong>padrão ouro</strong> da
              transparência pública municipal no Brasil.
            </p>
          </details>

          <details className="stat-card group">
            <summary className="cursor-pointer font-semibold text-foreground text-sm md:text-base flex items-center justify-between">
              <span>O <Brand /> é oficial?</span>
              <span className="text-muted-foreground text-xl group-open:rotate-45 transition-transform">+</span>
            </summary>
            <p className="text-sm text-foreground/85 leading-relaxed mt-3">
              Não. É uma iniciativa cidadã independente. Todos os dados exibidos vêm de
              fontes públicas oficiais (Prefeitura, Câmara, TCM-GO, IBGE, Tesouro Nacional,
              DataSUS, INEP, INMET, entre outras), com link direto para a origem em cada
              informação.
            </p>
          </details>

          <details className="stat-card group">
            <summary className="cursor-pointer font-semibold text-foreground text-sm md:text-base flex items-center justify-between">
              <span>Que tipo de dados estão disponíveis?</span>
              <span className="text-muted-foreground text-xl group-open:rotate-45 transition-transform">+</span>
            </summary>
            <p className="text-sm text-foreground/85 leading-relaxed mt-3">
              Câmara Municipal (vereadores, projetos, votações, atas), Prefeitura
              (contratos, licitações, servidores, salários, despesas, obras, decretos,
              portarias, leis, TCM-GO), saúde (dengue, profissionais, estabelecimentos),
              educação (IDEB, escolas), agronegócio, segurança pública, benefícios sociais,
              arrecadação, clima diário e utilidades para o cotidiano (farmácias de plantão,
              coleta de lixo, contatos úteis, marketplace local).
            </p>
          </details>

          <details className="stat-card group">
            <summary className="cursor-pointer font-semibold text-foreground text-sm md:text-base flex items-center justify-between">
              <span>Como os dados são atualizados?</span>
              <span className="text-muted-foreground text-xl group-open:rotate-45 transition-transform">+</span>
            </summary>
            <p className="text-sm text-foreground/85 leading-relaxed mt-3">
              Mais de 50 sincronizações automáticas (cron jobs) rodam em frequências
              variadas: diárias (clima, licitações federais), semanais (atos da Câmara,
              processos), quinzenais (folha de pagamento), mensais (despesas, obras) e
              trimestrais (saúde, segurança, agro). Tudo registrado em log público
              auditável.
            </p>
          </details>

          <details className="stat-card group">
            <summary className="cursor-pointer font-semibold text-foreground text-sm md:text-base flex items-center justify-between">
              <span>Como entrar em contato?</span>
              <span className="text-muted-foreground text-xl group-open:rotate-45 transition-transform">+</span>
            </summary>
            <p className="text-sm text-foreground/85 leading-relaxed mt-3">
              Quer falar sobre o <Brand />? Entre em contato comigo, Gianluca Ferro,
              pelo WhatsApp{" "}
              <a href={whatsappLink} target="_blank" rel="noopener noreferrer"
                 className="text-primary hover:underline font-semibold">
                +55 64 99237-5458
              </a>.
            </p>
          </details>
        </div>
      </section>

      {/* Citação Constituição */}
      <blockquote className="my-8 border-l-4 border-primary pl-5 py-3">
        <p className="text-lg md:text-xl font-semibold italic text-foreground">
          &ldquo;Todo o poder emana do povo, que o exerce por meio de representantes eleitos
          ou diretamente.&rdquo;
        </p>
        <cite className="text-sm text-muted-foreground not-italic mt-2 block">
          — Constituição Federal do Brasil, Art. 1º, parágrafo único
        </cite>
      </blockquote>

      {/* Contato — botão WhatsApp destacado */}
      <section
        aria-labelledby="contato"
        className="stat-card mb-8 border-[#25D366]/30 bg-[#25D366]/5"
      >
        <h2 id="contato" className="text-lg font-semibold text-foreground mb-2">
          Tem interesse em saber mais sobre o projeto?
        </h2>
        <p className="text-sm text-foreground leading-relaxed mb-4">
          Quer falar sobre o <Brand />? Entre em contato comigo, Gianluca Ferro,
          pelo WhatsApp +55 64 99237-5458. Jornalistas, pesquisadores, gestores
          públicos, estudantes e cidadãos curiosos são bem vindos.
        </p>
        <a
          href={whatsappLink}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#1da851] text-white font-semibold px-5 py-3 rounded-lg transition-colors"
        >
          <WhatsAppIcon className="w-5 h-5" />
          Conversar pelo WhatsApp
        </a>
        <p className="text-xs text-muted-foreground mt-3">
          (64) 99237-5458 · resposta em até 24h em dias úteis
        </p>
      </section>

      {/* Newsletter */}
      <section aria-labelledby="alertas" id="alertas" className="stat-card mb-8 border-primary/20">
        <SubscriptionForm />
      </section>

      {/* Fontes oficiais */}
      <section aria-labelledby="fontes" className="mb-8">
        <h2 id="fontes" className="text-xl md:text-2xl font-bold text-foreground mb-4">
          Fontes oficiais
        </h2>
        <p className="text-sm text-muted-foreground mb-3">
          Todos os dados exibidos no <Brand /> vêm das seguintes fontes públicas:
        </p>
        <div className="space-y-2">
          {fontes.map((f) => (
            <a
              key={f.url}
              href={f.url}
              target="_blank"
              rel="noopener noreferrer"
              className="stat-card card-hover flex items-center justify-between"
            >
              <span className="text-sm font-medium text-foreground">{f.label}</span>
              <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0" />
            </a>
          ))}
        </div>
      </section>

      {/* Política de dados */}
      <section aria-labelledby="politica" className="mb-8">
        <h2 id="politica" className="text-xl md:text-2xl font-bold text-foreground mb-4">
          Política de dados
        </h2>
        <div className="stat-card">
          <ul className="text-sm text-foreground space-y-2 list-disc list-inside">
            <li>Utilizamos apenas dados públicos disponíveis nos portais oficiais.</li>
            <li>Não é necessário cadastro para navegar pelo app.</li>
            <li>
              E-mails de assinatura são usados exclusivamente para enviar atualizações
              semanais — sem repasse a terceiros.
            </li>
            <li>
              Este projeto não tem vínculo com a Prefeitura, a Câmara Municipal ou
              qualquer órgão público.
            </li>
          </ul>
        </div>
      </section>

      <p className="text-xs text-muted-foreground text-center mt-8">
        <Brand /> · Mantido por Ferro Labs Tecnologia LTDA · CNPJ 66.034.538/0001-25
      </p>
    </div>
  );
}

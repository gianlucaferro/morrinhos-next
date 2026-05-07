import Link from "next/link";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Política de Privacidade — Morrinhos.ai",
  description:
    "Política de privacidade do Morrinhos.ai conforme a LGPD (Lei 13.709/2018): quais dados coletamos, finalidade, base legal, direitos do titular e contato.",
  path: "/privacidade",
});

function Brand() {
  return (
    <>
      Morrinhos<span className="text-[#25D366]">.ai</span>
    </>
  );
}

export default function PrivacidadePage() {
  return (
    <div className="container py-8 max-w-3xl">
      <h1 className="text-3xl md:text-4xl font-extrabold text-foreground mb-3 leading-tight">
        Política de Privacidade
      </h1>
      <p className="text-sm text-muted-foreground mb-8">
        Última atualização: 4 de maio de 2026 · Conforme a Lei Geral de Proteção de
        Dados (Lei 13.709/2018 — LGPD)
      </p>

      <div className="space-y-6 text-sm md:text-base text-foreground leading-relaxed">
        <section>
          <h2 className="text-xl md:text-2xl font-bold text-foreground mb-3">
            1. Quem somos
          </h2>
          <p>
            O <Brand /> é uma plataforma independente de transparência municipal mantida
            por <strong>Ferro Labs Tecnologia LTDA</strong> (CNPJ 66.034.538/0001-25),
            representada pelo seu fundador Gianluca Ferro. Não temos vínculo com qualquer
            órgão público.
          </p>
        </section>

        <section>
          <h2 className="text-xl md:text-2xl font-bold text-foreground mb-3">
            2. Quais dados coletamos
          </h2>
          <p className="mb-3">
            <strong>Navegação livre:</strong> nenhum cadastro é necessário para usar a
            maior parte do site. Coletamos apenas:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>
              <strong>Cookies essenciais</strong> (preferências de tema, tamanho de fonte)
            </li>
            <li>
              <strong>Analytics agregado</strong> (Google Analytics 4) — pageviews
              anonimizados, sem identificar usuário individual
            </li>
            <li>
              <strong>Endereço IP</strong> (em log do servidor por até 90 dias, para
              segurança)
            </li>
          </ul>
          <p className="mt-3 mb-3">
            <strong>Dados pessoais coletados ativamente:</strong>
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>
              <strong>Newsletter:</strong> e-mail (com seu consentimento explícito)
            </li>
            <li>
              <strong>Compra e Venda MHS:</strong> e-mail, nome, telefone, fotos do
              anúncio (apenas se você criar anúncio)
            </li>
            <li>
              <strong>Zap MHS:</strong> nome do estabelecimento, WhatsApp, categoria
              (apenas se você se cadastrar)
            </li>
            <li>
              <strong>Notificações push:</strong> token de dispositivo (apenas se você
              autorizar via popup do navegador)
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl md:text-2xl font-bold text-foreground mb-3">
            3. Para que usamos seus dados
          </h2>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>
              <strong>E-mail (newsletter):</strong> envio de resumo semanal sobre
              transparência municipal. Não compartilhamos com terceiros.
            </li>
            <li>
              <strong>Compra e Venda:</strong> exibir o anúncio publicamente e permitir
              contato pelo WhatsApp informado por você.
            </li>
            <li>
              <strong>Zap MHS:</strong> exibir o WhatsApp profissional publicamente.
            </li>
            <li>
              <strong>Analytics:</strong> entender quais páginas são mais úteis e melhorar
              a experiência. Dados agregados, sem identificação pessoal.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl md:text-2xl font-bold text-foreground mb-3">
            4. Base legal (LGPD)
          </h2>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>
              <strong>Consentimento</strong> (Art. 7º, I): para newsletter, push e cadastro
              em Compra e Venda / Zap MHS.
            </li>
            <li>
              <strong>Legítimo interesse</strong> (Art. 7º, IX): para analytics agregado e
              logs de segurança.
            </li>
            <li>
              <strong>Cumprimento de obrigação legal</strong> (Art. 7º, II): retenção
              mínima exigida em lei.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl md:text-2xl font-bold text-foreground mb-3">
            5. Seus direitos como titular
          </h2>
          <p className="mb-3">
            A LGPD garante a você (Art. 18) os seguintes direitos sobre seus dados pessoais:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Confirmação da existência de tratamento</li>
            <li>Acesso aos dados que temos sobre você</li>
            <li>Correção de dados incompletos, inexatos ou desatualizados</li>
            <li>Anonimização, bloqueio ou eliminação</li>
            <li>Portabilidade para outro fornecedor</li>
            <li>Eliminação dos dados tratados com seu consentimento</li>
            <li>Informação sobre com quem compartilhamos</li>
            <li>Revogação do consentimento a qualquer momento</li>
          </ul>
          <p className="mt-3">
            Para exercer qualquer direito, entre em contato:{" "}
            <a
              href="mailto:contato@ferrolabs.com.br"
              className="text-primary hover:underline"
            >
              contato@ferrolabs.com.br
            </a>{" "}
            ou pelo WhatsApp{" "}
            <a
              href="https://wa.me/5564992375458"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              +55 64 99237-5458
            </a>
            . Respondemos em até 15 dias úteis.
          </p>
        </section>

        <section>
          <h2 className="text-xl md:text-2xl font-bold text-foreground mb-3">
            6. Compartilhamento com terceiros
          </h2>
          <p className="mb-3">
            <strong>Não vendemos seus dados.</strong> Compartilhamos apenas com prestadores
            estritamente necessários para operação:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>
              <strong>Supabase</strong> (banco de dados, autenticação, storage) — EUA, com
              cláusulas contratuais padrão
            </li>
            <li>
              <strong>Vercel</strong> (hospedagem do site) — EUA, com cláusulas contratuais
              padrão
            </li>
            <li>
              <strong>Resend</strong> (envio de e-mail transacional e newsletter) — EUA,
              com cláusulas contratuais padrão
            </li>
            <li>
              <strong>Google Analytics 4</strong> (analytics agregado) — com IP
              anonimizado
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl md:text-2xl font-bold text-foreground mb-3">
            7. Cookies
          </h2>
          <p>
            Usamos cookies essenciais (preferências de UI) e analíticos (GA4). Não usamos
            cookies de publicidade comportamental ou rastreamento entre sites. Você pode
            desabilitar cookies nas configurações do seu navegador.
          </p>
        </section>

        <section>
          <h2 className="text-xl md:text-2xl font-bold text-foreground mb-3">
            8. Retenção dos dados
          </h2>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>
              <strong>Newsletter:</strong> enquanto você estiver inscrito + 30 dias após
              cancelar (auditoria)
            </li>
            <li>
              <strong>Anúncios em Compra e Venda:</strong> 30 dias após o anúncio expirar
            </li>
            <li>
              <strong>Logs de IP:</strong> 90 dias
            </li>
            <li>
              <strong>Analytics agregado:</strong> 14 meses (padrão GA4)
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl md:text-2xl font-bold text-foreground mb-3">
            9. Encarregado de Dados (DPO)
          </h2>
          <p>
            Gianluca Ferro · contato@ferrolabs.com.br · WhatsApp +55 64 99237-5458
          </p>
        </section>

        <section>
          <h2 className="text-xl md:text-2xl font-bold text-foreground mb-3">
            10. Mudanças nesta política
          </h2>
          <p>
            Podemos atualizar esta política. A data da última atualização está no topo
            desta página. Mudanças significativas serão comunicadas a quem está inscrito
            em nossa newsletter.
          </p>
        </section>

        <p className="text-xs text-muted-foreground text-center pt-8 mt-8 border-t border-border">
          Voltar para a página{" "}
          <Link href="/sobre" className="text-primary hover:underline">
            Sobre o <Brand />
          </Link>
        </p>
      </div>
    </div>
  );
}

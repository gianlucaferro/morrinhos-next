import { pageMetadata } from "@/lib/seo";
import { AtuacaoContent } from "@/components/camara/AtuacaoContent";

export const metadata = pageMetadata({
  title: "Atuação Parlamentar — Câmara de Morrinhos GO",
  description:
    "Requerimentos, indicações, moções e proposições dos vereadores da Câmara Municipal de Morrinhos.",
  path: "/atuacao-parlamentar",
});

export const dynamic = "force-dynamic";

export default function AtuacaoParlamentarPage() {
  return <AtuacaoContent />;
}

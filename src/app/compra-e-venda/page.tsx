import { pageMetadata } from "@/lib/seo";
import ClassificadosClient from "@/components/classificados/ClassificadosWrapper";

export const metadata = pageMetadata({
  title: "Compra e Venda MHS — Classificados grátis Morrinhos GO",
  description:
    "Anuncie e compre em Morrinhos: imóveis, veículos, agro, eletrônicos, serviços. Anúncios gratuitos com WhatsApp e fotos.",
  path: "/compra-e-venda",
});

export default function ComprarEVendaPage() {
  return <ClassificadosClient />;
}

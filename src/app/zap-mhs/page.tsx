import { pageMetadata } from "@/lib/seo";
import { fetchZapEstabelecimentos } from "@/lib/data/listings";
import ZapPbaClient from "./ZapPbaClient";

export const metadata = pageMetadata({
  title: "Zap MHS — WhatsApp dos Comércios de Morrinhos",
  description:
    "Lista de WhatsApps verificados de estabelecimentos comerciais de Morrinhos, GO, organizados por categoria.",
  path: "/zap-mhs",
});

export const revalidate = 600;

export default async function ZapPbaPage() {
  const estabelecimentos = await fetchZapEstabelecimentos();

  return <ZapPbaClient initialEstabelecimentos={estabelecimentos} />;
}

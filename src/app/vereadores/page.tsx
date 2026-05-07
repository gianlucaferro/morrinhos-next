import { Users } from "lucide-react";
import { pageMetadata } from "@/lib/seo";
import { fetchVereadoresLista } from "@/lib/data/vereadores";
import VereadoresClient from "./VereadoresClient";

export const metadata = pageMetadata({
  title: "Vereadores de Morrinhos GO",
  description:
    "Lista completa dos vereadores de Morrinhos: partido, mandato, atuação parlamentar, contato e produção legislativa.",
  path: "/vereadores",
});

export const revalidate = 3600;

export default async function VereadoresPage() {
  const vereadores = await fetchVereadoresLista();

  return (
    <>
      <section className="bg-gradient-to-br from-primary/15 to-primary/5 border-b border-border">
        <div className="container py-10 md:py-14">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
            <Users className="w-8 h-8 text-primary" />
            Vereadores de Morrinhos
          </h1>
          <p className="mt-3 text-muted-foreground max-w-2xl">
            {vereadores.length} vereadores em mandato. Clique no nome para ver perfil
            completo, partido, atuação parlamentar, projetos e remuneração.
          </p>
        </div>
      </section>

      <div className="container py-8">
        <VereadoresClient vereadores={vereadores} />
      </div>
    </>
  );
}

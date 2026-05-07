import { DollarSign } from "lucide-react";
import { pageMetadata } from "@/lib/seo";
import { fetchEmendas } from "@/lib/data/listings";
import EmendasClient from "./EmendasClient";

export const metadata = pageMetadata({
  title: "Emendas Parlamentares para Morrinhos GO",
  description:
    "Emendas parlamentares federais e estaduais destinadas a Morrinhos: parlamentar autor, valor empenhado, valor pago e objeto.",
  path: "/emendas",
});

export const revalidate = 3600;

function fmtBRL(n: number | string | null | undefined) {
  if (n == null) return "-";
  return Number(n).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function EmendasPage() {
  const emendas = await fetchEmendas();
  const totalEmpenhado = emendas.reduce((s, e) => s + Number(e.valor_empenhado || 0), 0);
  const totalPago = emendas.reduce((s, e) => s + Number(e.valor_pago || 0), 0);

  return (
    <>
      <section className="bg-gradient-to-br from-primary/15 to-primary/5 border-b border-border">
        <div className="container py-10 md:py-14">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
            <DollarSign className="w-8 h-8 text-primary" />
            Emendas Parlamentares
          </h1>
          <p className="mt-3 text-muted-foreground max-w-2xl">
            {emendas.length} emendas destinadas a Morrinhos, totalizando {fmtBRL(totalEmpenhado)}
            {" "}empenhados e {fmtBRL(totalPago)} pagos.
          </p>
        </div>
      </section>

      <div className="container py-8">
        <EmendasClient emendas={emendas} />
      </div>
    </>
  );
}

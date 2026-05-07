import { pageMetadata } from "@/lib/seo";
import { fetchClimaSerieDias, fetchClimaResumoMes } from "@/lib/data/clima";
import ClimaClient from "./ClimaClient";

export const metadata = pageMetadata({
  title: "Clima em Morrinhos GO — Tempo, Chuvas e Temperatura",
  description:
    "Acompanhe o clima de Morrinhos, Goiás: temperatura atual, máxima/mínima, chuvas, umidade e histórico mensal. Dados atualizados diariamente.",
  path: "/clima",
});

export const revalidate = 900; // 15 min — alinhado com cron sync-inmet-clima-15min

export default async function ClimaPage() {
  const [dias, resumo] = await Promise.all([
    fetchClimaSerieDias(30),
    fetchClimaResumoMes(),
  ]);

  return (
    <div className="container py-8">
      <div className="mb-6">
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
          Clima em Morrinhos
        </h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
          Temperatura, chuvas e umidade em Morrinhos, GO. Dados de Open-Meteo atualizados
          diariamente. Útil para o produtor rural acompanhar a safra e para a saúde pública
          monitorar criadouros de mosquitos.
        </p>
      </div>

      {dias.length === 0 ? (
        <div className="stat-card text-center py-12 text-muted-foreground">
          <p>Dados climáticos ainda não disponíveis. Aguarde a próxima sincronização.</p>
        </div>
      ) : (
        <ClimaClient dias={dias} resumo={resumo} />
      )}
    </div>
  );
}

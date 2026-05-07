"use client";

import { useQuery } from "@tanstack/react-query";
import { Activity, Wind, Droplets } from "lucide-react";
import MortalidadeHistoricaChart from "./MortalidadeHistoricaChart";
import CovidMorrinhosChart from "./CovidMorrinhosChart";
import MortesPorCausaChart from "./MortesPorCausaChart";
import MortInfantilCausasChart from "./MortInfantilCausasChart";
import HIVChart from "./HIVChart";
import SimpleSerieChart from "./SimpleSerieChart";

type Row = { ano: number; valor: number };
type CovidRow = {
  ano: number;
  mes: number;
  internacoes: number;
  obitos: number;
  internacoes_srag: number;
};
type CausaRow = { causa: string; total: number };
type AggRow = { sexo?: string; faixa?: string; total: number };

export default function MortalidadeTab() {
  const { data: infantil = [] } = useQuery<Row[]>({
    queryKey: ["saude-mortalidade-infantil"],
    queryFn: () => Promise.resolve([]),
    staleTime: Infinity,
  });
  const { data: geral = [] } = useQuery<Row[]>({
    queryKey: ["saude-mortalidade-geral"],
    queryFn: () => Promise.resolve([]),
    staleTime: Infinity,
  });
  const { data: covid = [] } = useQuery<CovidRow[]>({
    queryKey: ["saude-covid-mensal"],
    queryFn: () => Promise.resolve([]),
    staleTime: Infinity,
  });
  const { data: causas = [] } = useQuery<CausaRow[]>({
    queryKey: ["saude-mortes-causa"],
    queryFn: () => Promise.resolve([]),
    staleTime: Infinity,
  });
  const { data: mortInfCausas = [] } = useQuery<CausaRow[]>({
    queryKey: ["saude-mort-infantil-causas"],
    queryFn: () => Promise.resolve([]),
    staleTime: Infinity,
  });
  const { data: hivAnuais = [] } = useQuery<Row[]>({
    queryKey: ["saude-hiv-anuais"],
    queryFn: () => Promise.resolve([]),
    staleTime: Infinity,
  });
  const { data: hivPorSexo = [] } = useQuery<Array<{ sexo: string; total: number }>>({
    queryKey: ["saude-hiv-sexo"],
    queryFn: () => Promise.resolve([]),
    staleTime: Infinity,
  });
  const { data: hivPorFaixa = [] } = useQuery<Array<{ faixa: string; total: number }>>({
    queryKey: ["saude-hiv-faixa"],
    queryFn: () => Promise.resolve([]),
    staleTime: Infinity,
  });
  const { data: tbObitos = [] } = useQuery<Row[]>({
    queryKey: ["saude-tuberculose-obitos"],
    queryFn: () => Promise.resolve([]),
    staleTime: Infinity,
  });
  const { data: ddaInternacoes = [] } = useQuery<Row[]>({
    queryKey: ["saude-dda-internacoes"],
    queryFn: () => Promise.resolve([]),
    staleTime: Infinity,
  });

  const temAlgum =
    infantil.length > 0 ||
    geral.length > 0 ||
    covid.length > 0 ||
    causas.length > 0 ||
    mortInfCausas.length > 0 ||
    hivAnuais.length > 0 ||
    tbObitos.length > 0 ||
    ddaInternacoes.length > 0;

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-lg font-semibold text-foreground mb-1">
          Mortalidade & Doenças Crônicas
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Indicadores históricos de saúde pública em Morrinhos — séries temporais de
          mortalidade infantil e geral, causas de morte CID-10, COVID-19 mensal, HIV/AIDS,
          tuberculose e doenças diarreicas.
        </p>
      </header>

      {(infantil.length > 0 || geral.length > 0) && (
        <MortalidadeHistoricaChart infantil={infantil} geral={geral} />
      )}

      {causas.length > 0 && <MortesPorCausaChart rows={causas} />}

      {mortInfCausas.length > 0 && <MortInfantilCausasChart rows={mortInfCausas} />}

      {covid.length > 0 && <CovidMorrinhosChart rows={covid} />}

      {(hivAnuais.length > 0 || hivPorSexo.length > 0 || hivPorFaixa.length > 0) && (
        <HIVChart anuais={hivAnuais} porSexo={hivPorSexo} porFaixa={hivPorFaixa} />
      )}

      {tbObitos.length > 0 && (
        <SimpleSerieChart
          titulo="Tuberculose em Morrinhos"
          descricao="Óbitos anuais por tuberculose. Doença antiga, mas ainda presente — controle progressivo via tratamento gratuito SUS."
          rows={tbObitos}
          icon={Wind}
          iconColor="text-amber-700"
          borderColor="border-amber-700/20"
          bgGradient="bg-gradient-to-br from-amber-700/5 via-transparent to-yellow-500/5"
          cor="hsl(45, 93%, 47%)"
          unidade="óbitos"
          fonteUrl="http://tabnet.datasus.gov.br/cgi/deftohtm.exe?sinannet/cnv/tubercbr.def"
          fonteLabel="DATASUS/SINAN — Tuberculose"
        />
      )}

      {ddaInternacoes.length > 0 && (
        <SimpleSerieChart
          titulo="Doenças Diarreicas Agudas — Internações"
          descricao="Internações por DDA por 100 mil habitantes. Indicador clássico de qualidade do saneamento básico — quanto melhor água/esgoto, menos diarreia."
          rows={ddaInternacoes}
          icon={Droplets}
          iconColor="text-cyan-600"
          borderColor="border-cyan-500/20"
          bgGradient="bg-gradient-to-br from-cyan-500/5 via-transparent to-blue-500/5"
          cor="hsl(199, 89%, 48%)"
          unidade="internações por 100k hab"
          fonteUrl="http://tabnet.datasus.gov.br/cgi/deftohtm.exe?sih/cnv/qiGO.def"
          fonteLabel="DATASUS/SIH — Goiás"
          variant="area"
        />
      )}

      {!temAlgum && (
        <div className="stat-card text-sm text-muted-foreground">
          Carregando dados de mortalidade e doenças...
        </div>
      )}
    </div>
  );
}

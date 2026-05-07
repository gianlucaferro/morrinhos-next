"use client";

import { useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from "recharts";
import {
  Flame,
  TreesIcon,
  Sprout,
  CloudRain,
  AlertTriangle,
  Leaf,
  Car,
  TrendingUp,
} from "lucide-react";

type MapBiomasRow = {
  ano: number;
  classe_id: number;
  classe_nome: string;
  categoria: string;
  cor_hex: string | null;
  area_ha: number;
};

type Props = {
  mapbiomasRows: MapBiomasRow[];
  chuva90Dias: number; // mm
  chuvaMediaHistMesAtual: number; // mm
  chuvaTotalAnoCorrente: number;
  chuvaMediaHistAnoCompleto: number;
  frotaVeiculos: number | null;
  ano: number;
};

/**
 * Análise Ambiental Integrada — cruza dados que já temos no DB para gerar
 * insights ambientais sem depender de APIs externas:
 *
 * 1. RISCO DE FOGO atual (chuva últimos 90 dias vs média histórica)
 * 2. PRESSÃO AGRÍCOLA (% do território como agro vs cobertura nativa, MapBiomas)
 * 3. EVOLUÇÃO DA COBERTURA VEGETAL (1985 vs hoje)
 * 4. ESTIMATIVA EMISSÕES CO2 frota municipal
 *
 * Dados: MapBiomas Coleção 10.1 + clima_historico_mensal + indicadores.
 */
export default function AnaliseAmbientalIntegrada({
  mapbiomasRows,
  chuva90Dias,
  chuvaMediaHistMesAtual,
  chuvaTotalAnoCorrente,
  chuvaMediaHistAnoCompleto,
  frotaVeiculos,
  ano,
}: Props) {
  const insights = useMemo(() => {
    // ===== Snapshot ano corrente vs 1985 (MapBiomas) =====
    const porCat = (anoFiltro: number) => {
      const acc: Record<string, number> = {};
      for (const r of mapbiomasRows.filter((x) => x.ano === anoFiltro)) {
        acc[r.categoria] = (acc[r.categoria] ?? 0) + r.area_ha;
      }
      return acc;
    };

    const cat2024 = porCat(2024);
    const cat1985 = porCat(1985);
    const totalArea = Object.values(cat2024).reduce((s, v) => s + v, 0);

    // 1. RISCO DE FOGO
    // Razão: chuva 90 dias vs media historica do mes atual * 3
    // Se chuva está abaixo de 70% da média, alto risco
    const baseEsperada = chuvaMediaHistMesAtual * 3; // proxy 90 dias
    const ratioChuva = baseEsperada > 0 ? chuva90Dias / baseEsperada : 1;
    const riscoFogo: "baixo" | "moderado" | "alto" =
      ratioChuva >= 0.85 ? "baixo" : ratioChuva >= 0.5 ? "moderado" : "alto";

    // 2. PRESSAO AGRICOLA
    // % do territorio como agro+pasto+mosaico vs cobertura nativa (floresta+cerrado)
    const areaAgroPecuaria =
      (cat2024.agricultura ?? 0) + (cat2024.pastagem ?? 0) + (cat2024.mosaico ?? 0);
    const areaNativa = (cat2024.floresta ?? 0) + (cat2024.cerrado ?? 0);
    const pctAgro = totalArea > 0 ? (areaAgroPecuaria / totalArea) * 100 : 0;
    const pctNativa = totalArea > 0 ? (areaNativa / totalArea) * 100 : 0;

    // 3. EVOLUÇÃO COBERTURA VEGETAL 1985 vs 2024
    const nativa1985 = (cat1985.floresta ?? 0) + (cat1985.cerrado ?? 0);
    const nativa2024 = (cat2024.floresta ?? 0) + (cat2024.cerrado ?? 0);
    const perdaNativa = nativa1985 - nativa2024;
    const perdaPctNativa = nativa1985 > 0 ? (perdaNativa / nativa1985) * 100 : 0;

    // 4. EMISSOES CO2 ESTIMADAS — frota
    // Premissas:
    // - Frota mistura: 60% carros (12k km/ano @ 1.6 kgCO2/L @ 12 km/L = 1600 kg CO2/ano)
    // - 25% motos (8k km/ano @ 1.6 kgCO2/L @ 30 km/L = 426 kg/ano)
    // - 15% caminhões/utilitários (30k km/ano @ 2.7 kgCO2/L @ 4 km/L = 20.250 kg/ano)
    // Média ponderada: ~4.000 kg CO2/ano por veículo (estimativa conservadora)
    const co2KgPorVeiculoAno = 4000;
    const co2TotalToneladas = frotaVeiculos
      ? Math.round((frotaVeiculos * co2KgPorVeiculoAno) / 1000)
      : null;

    // Equivalencia: 1 arvore adulta absorve ~22kg CO2/ano (eucalipto cresceu ~7 anos)
    // Quantas arvores precisa pra compensar?
    const arvoresEquivalentes = co2TotalToneladas
      ? Math.round((co2TotalToneladas * 1000) / 22)
      : null;

    // 5. RAZAO CHUVA YTD
    const ratioChuvaAno =
      chuvaMediaHistAnoCompleto > 0 ? chuvaTotalAnoCorrente / chuvaMediaHistAnoCompleto : 1;

    return {
      riscoFogo,
      ratioChuva,
      pctAgro,
      pctNativa,
      areaAgroPecuaria,
      areaNativa,
      totalArea,
      perdaNativa,
      perdaPctNativa,
      co2TotalToneladas,
      arvoresEquivalentes,
      ratioChuvaAno,
      cat2024,
      cat1985,
    };
  }, [mapbiomasRows, chuva90Dias, chuvaMediaHistMesAtual, chuvaTotalAnoCorrente, chuvaMediaHistAnoCompleto, frotaVeiculos]);

  const riscoFogoStyle = {
    baixo: { color: "text-green-600", bg: "border-green-500/30 bg-green-500/5", emoji: "🟢", label: "BAIXO" },
    moderado: { color: "text-amber-600", bg: "border-amber-500/30 bg-amber-500/5", emoji: "🟡", label: "MODERADO" },
    alto: { color: "text-red-600", bg: "border-red-500/30 bg-red-500/5", emoji: "🔴", label: "ALTO" },
  }[insights.riscoFogo];

  // Dados pro grafico cobertura vegetal
  const coberturaData = [
    {
      cat: "Floresta",
      v1985: insights.cat1985.floresta ?? 0,
      v2024: insights.cat2024.floresta ?? 0,
      cor: "#1f8d49",
    },
    {
      cat: "Cerrado",
      v1985: insights.cat1985.cerrado ?? 0,
      v2024: insights.cat2024.cerrado ?? 0,
      cor: "#7dc975",
    },
    {
      cat: "Pastagem",
      v1985: insights.cat1985.pastagem ?? 0,
      v2024: insights.cat2024.pastagem ?? 0,
      cor: "#edde8e",
    },
    {
      cat: "Agricultura",
      v1985: insights.cat1985.agricultura ?? 0,
      v2024: insights.cat2024.agricultura ?? 0,
      cor: "#e7a4ad",
    },
    {
      cat: "Mosaico",
      v1985: insights.cat1985.mosaico ?? 0,
      v2024: insights.cat2024.mosaico ?? 0,
      cor: "#e974ed",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="stat-card border-emerald-700/30 bg-gradient-to-br from-emerald-700/5 to-transparent">
        <h2 className="text-base font-semibold text-foreground mb-2 flex items-center gap-2">
          <Leaf className="w-5 h-5 text-emerald-700" />
          Análise Ambiental Integrada
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Insights ambientais cruzando dados que já temos: MapBiomas (uso do solo
          1985-2024), chuva acumulada (Open-Meteo + INMET) e frota municipal (SENATRAN).
          Sem dependência de APIs externas instáveis.
        </p>
      </div>

      {/* Painel 1: Risco de Fogo */}
      <div className={`stat-card border ${riscoFogoStyle.bg}`}>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/15 flex items-center justify-center shrink-0">
              <Flame className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">
                Risco de Fogo Atual
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                Cruzamento: chuva acumulada últimos 90 dias × média histórica do período.
                Quanto menor a chuva recente, maior o risco de incêndios na vegetação.
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Risco
            </p>
            <p className={`text-3xl font-extrabold ${riscoFogoStyle.color} mt-0.5`}>
              {riscoFogoStyle.emoji} {riscoFogoStyle.label}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
          <div className="stat-card">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Chuva últimos 90 dias
            </p>
            <p className="text-xl font-extrabold text-foreground mt-0.5">
              {Math.round(chuva90Dias)} mm
            </p>
          </div>
          <div className="stat-card">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Esperado (média histórica)
            </p>
            <p className="text-xl font-extrabold text-foreground mt-0.5">
              {Math.round(chuvaMediaHistMesAtual * 3)} mm
            </p>
          </div>
          <div className="stat-card">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Razão atual / esperado
            </p>
            <p className={`text-xl font-extrabold ${riscoFogoStyle.color} mt-0.5`}>
              {(insights.ratioChuva * 100).toFixed(0)}%
            </p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-3 italic leading-relaxed">
          Critérios: ≥85% baixo · 50-85% moderado · &lt;50% alto. Indicador
          baseline — combina com previsão INPE/IBAMA pra avaliação completa.
        </p>
      </div>

      {/* Painel 2: Pressão Agrícola */}
      <div className="stat-card border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-transparent">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0">
            <Sprout className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground">
              Pressão Agrícola sobre o Cerrado
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
              Quanto do território de Morrinhos está convertido em
              agropecuária vs vegetação nativa preservada (MapBiomas {ano}).
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
          <div className="stat-card border-amber-500/30">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Agropecuária (agro+pasto+mosaico)
            </p>
            <p className="text-xl font-extrabold text-amber-700 mt-0.5">
              {insights.pctAgro.toFixed(1)}%
            </p>
            <p className="text-[10px] text-muted-foreground">
              {(insights.areaAgroPecuaria / 1000).toFixed(0)} mil ha
            </p>
          </div>
          <div className="stat-card border-green-500/30">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Vegetação nativa (floresta+cerrado)
            </p>
            <p className="text-xl font-extrabold text-green-600 mt-0.5">
              {insights.pctNativa.toFixed(1)}%
            </p>
            <p className="text-[10px] text-muted-foreground">
              {(insights.areaNativa / 1000).toFixed(0)} mil ha
            </p>
          </div>
          <div className="stat-card border-red-500/30">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground inline-flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Perda nativa 1985-2024
            </p>
            <p className="text-xl font-extrabold text-red-600 mt-0.5">
              -{Math.round(insights.perdaPctNativa)}%
            </p>
            <p className="text-[10px] text-muted-foreground">
              {(insights.perdaNativa / 1000).toFixed(0)} mil ha perdidos
            </p>
          </div>
        </div>

        {/* Bar comparison 1985 vs 2024 */}
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={coberturaData}
              margin={{ top: 8, right: 10, bottom: 0, left: -10 }}
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="cat" tick={{ fontSize: 11 }} />
              <YAxis
                tick={{ fontSize: 10 }}
                tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
                width={42}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(v: number, name: string) => [
                  `${(v / 1000).toFixed(1)} mil ha`,
                  name === "v1985" ? "1985" : "2024",
                ]}
              />
              <Bar dataKey="v1985" name="1985" fill="hsl(215, 20%, 70%)" radius={[2, 2, 0, 0]} />
              <Bar dataKey="v2024" name="2024" radius={[2, 2, 0, 0]}>
                {coberturaData.map((d, i) => (
                  <Cell key={i} fill={d.cor} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <p className="text-xs text-muted-foreground mt-3 italic leading-relaxed">
          Cinza = 1985, colorido = 2024. Mostra a transição do Cerrado nativo para
          uso agropecuário em 40 anos.
        </p>
      </div>

      {/* Painel 3: Estimativa CO2 da frota */}
      {insights.co2TotalToneladas && (
        <div className="stat-card border-slate-500/30 bg-gradient-to-br from-slate-500/5 to-transparent">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-slate-500/15 flex items-center justify-center shrink-0">
              <Car className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">
                Estimativa de Emissões CO2 da Frota Municipal
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                Cálculo aproximado baseado na frota total (SENATRAN) com mix típico
                Brasil (60% carros, 25% motos, 15% caminhões).
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="stat-card">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Frota total
              </p>
              <p className="text-xl font-extrabold text-foreground mt-0.5">
                {frotaVeiculos?.toLocaleString("pt-BR")}
              </p>
              <p className="text-[10px] text-muted-foreground">veículos · SENATRAN</p>
            </div>
            <div className="stat-card border-orange-500/30">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                CO2 estimado/ano
              </p>
              <p className="text-xl font-extrabold text-orange-600 mt-0.5">
                {insights.co2TotalToneladas.toLocaleString("pt-BR")} t
              </p>
              <p className="text-[10px] text-muted-foreground">
                ~{(insights.co2TotalToneladas / (frotaVeiculos ?? 1)).toFixed(1)} t/veículo
              </p>
            </div>
            <div className="stat-card border-green-500/30">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground inline-flex items-center gap-1">
                <TreesIcon className="w-3 h-3" /> Árvores p/ compensar
              </p>
              <p className="text-xl font-extrabold text-green-600 mt-0.5">
                {insights.arvoresEquivalentes?.toLocaleString("pt-BR")}
              </p>
              <p className="text-[10px] text-muted-foreground">
                ~22 kg CO2/árvore/ano
              </p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3 italic leading-relaxed">
            <strong>Nota</strong>: estimativa simplificada usando médias nacionais.
            Não inclui maquinário agrícola, queimadas, ou desmatamento.
            Para cálculo preciso, usar metodologia GHG Protocol municipal.
          </p>
        </div>
      )}

      {/* Painel 4: Chuva acumulada — proxy de saúde hídrica */}
      <div className="stat-card border-cyan-500/30 bg-gradient-to-br from-cyan-500/5 to-transparent">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/15 flex items-center justify-center shrink-0">
            <CloudRain className="w-5 h-5 text-cyan-600" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground">
              Saúde Hídrica · {ano}
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
              Como está a chuva acumulada do ano em relação à média histórica do
              município. Indicador-chave de risco de seca, recarga de aquíferos,
              vazão de rios.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="stat-card">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Acumulado {ano} YTD
            </p>
            <p className="text-xl font-extrabold text-foreground mt-0.5">
              {Math.round(chuvaTotalAnoCorrente)} mm
            </p>
          </div>
          <div className="stat-card">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Média histórica anual
            </p>
            <p className="text-xl font-extrabold text-foreground mt-0.5">
              {Math.round(chuvaMediaHistAnoCompleto)} mm
            </p>
            <p className="text-[10px] text-muted-foreground">2018-2025</p>
          </div>
          <div
            className={`stat-card border ${
              insights.ratioChuvaAno >= 0.85
                ? "border-green-500/30 bg-green-500/5"
                : insights.ratioChuvaAno >= 0.5
                ? "border-amber-500/30 bg-amber-500/5"
                : "border-red-500/30 bg-red-500/5"
            }`}
          >
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground inline-flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> Status hídrico
            </p>
            <p
              className={`text-xl font-extrabold mt-0.5 ${
                insights.ratioChuvaAno >= 0.85
                  ? "text-green-600"
                  : insights.ratioChuvaAno >= 0.5
                  ? "text-amber-600"
                  : "text-red-600"
              }`}
            >
              {(insights.ratioChuvaAno * 100).toFixed(0)}%
            </p>
            <p className="text-[10px] text-muted-foreground">
              {insights.ratioChuvaAno >= 0.85
                ? "normal"
                : insights.ratioChuvaAno >= 0.5
                ? "atenção"
                : "déficit"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

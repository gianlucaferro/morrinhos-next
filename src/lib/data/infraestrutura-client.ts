/**
 * Helpers puros (sem server-only) pra usar no client.
 * Tipo InfraIndicador definido aqui pra evitar import de arquivo server-only.
 */

export type InfraIndicador = {
  id: string;
  categoria: string;
  indicador: string;
  subcategoria: string | null;
  bairro: string | null;
  ano: number | null;
  mes: number | null;
  valor: number | null;
  valor_texto: string | null;
  unidade: string | null;
  fonte: string | null;
  fonte_url: string | null;
  observacao: string | null;
  updated_at: string;
};

// Helpers de extracao por categoria/subcategoria
export function getSaneamento(
  rows: InfraIndicador[],
  sub: "agua" | "esgoto" | "lixo" | "drenagem",
) {
  return rows.filter(
    (r) => r.categoria === "saneamento" && r.subcategoria === sub,
  );
}

export function getEnergiaTarifas(rows: InfraIndicador[]) {
  return rows.filter((r) => r.categoria === "energia");
}

export function getTelecom(rows: InfraIndicador[]) {
  return rows.filter((r) => r.categoria === "telecom");
}

export function getIluminacaoPavimentacao(rows: InfraIndicador[]) {
  return rows.filter(
    (r) => r.categoria === "iluminacao" || r.categoria === "pavimentacao",
  );
}

export function getPolitica(rows: InfraIndicador[]) {
  return rows.filter((r) => r.subcategoria === "politica");
}

export function findInfra(
  rows: InfraIndicador[],
  cat: string,
  ind: string,
  sub?: string,
): InfraIndicador | undefined {
  return rows.find(
    (r) =>
      r.categoria === cat &&
      r.indicador === ind &&
      (sub === undefined || r.subcategoria === sub),
  );
}

/**
 * Cruzamento saneamento × dengue — série histórica casos confirmados +
 * LIRAa estratos + IIP + criadouros principais.
 */
export function getSaneamentoDengue(rows: InfraIndicador[]) {
  const casos = rows
    .filter(
      (r) =>
        r.categoria === "saneamento_dengue" &&
        r.indicador === "casos_confirmados",
    )
    .map((r) => ({
      ano: r.ano!,
      casos_confirmados: Number(r.valor) || 0,
      texto: r.valor_texto,
      observacao: r.observacao,
    }))
    .sort((a, b) => a.ano - b.ano);

  const liraaE1 = findInfra(rows, "saneamento_dengue", "liraa_estrato_1", "liraa");
  const liraaE2 = findInfra(rows, "saneamento_dengue", "liraa_estrato_2", "liraa");
  const iip = findInfra(rows, "saneamento_dengue", "iip_janeiro_2024", "iip");
  const criadouros = findInfra(rows, "saneamento_dengue", "criadouros_principais");
  const pico = findInfra(rows, "saneamento_dengue", "pico_epidemico_2022");

  return { casos, liraaE1, liraaE2, iip, criadouros, pico };
}

/**
 * Saneamento detalhado IBGE/SNIS — 31,7% esgoto adequado, urbanização, etc.
 */
export function getSaneamentoDetalhado(rows: InfraIndicador[]) {
  return {
    esgotoAdequado: findInfra(rows, "saneamento", "esgoto_adequado_domic", "esgoto"),
    urbanizacaoAdequada: findInfra(rows, "saneamento", "urbanizacao_adequada", "drenagem"),
    arborizacao: findInfra(rows, "saneamento", "arborizacao_urbana", "drenagem"),
    imoveisUrbanos: findInfra(rows, "saneamento", "imoveis_urbanos"),
    pontosEstrategicos: findInfra(rows, "saneamento", "pontos_estrategicos"),
    frequenciaColeta: findInfra(rows, "saneamento", "frequencia_coleta", "lixo"),
  };
}

/**
 * Energia DEC/FEC (qualidade do fornecimento Equatorial GO).
 */
export function getEnergiaQualidade(rows: InfraIndicador[]) {
  return {
    dec2022: findInfra(rows, "energia", "dec_estado_2022"),
    decReducao: findInfra(rows, "energia", "dec_reducao_2024"),
    fecReducao: findInfra(rows, "energia", "fec_reducao_2024"),
    reclamacoesBairro: findInfra(rows, "energia", "reclamacoes_bairro"),
  };
}

/**
 * ANATEL — selos qualidade + reclamações operadoras + Wi-Fi público.
 */
export function getTelecomDetalhado(rows: InfraIndicador[]) {
  return {
    reclamacoesTim: findInfra(rows, "telecom", "reclamacoes_tim_2025"),
    reclamacoesClaro: findInfra(rows, "telecom", "reclamacoes_claro_2025"),
    seloAnatel: findInfra(rows, "telecom", "selo_qualidade_anatel"),
    cobertura4gBairro: findInfra(rows, "telecom", "cobertura_4g_bairro"),
    wifiEstado: findInfra(rows, "telecom", "wifi_publico_estado_go", "wifi"),
    wifiMunicipal: findInfra(rows, "telecom", "wifi_publico_municipal", "wifi"),
  };
}

/**
 * Status Iluminação LED + Pavimentação por bairro (pendente LAI).
 */
export function getIluminacaoPavimentacaoStatus(rows: InfraIndicador[]) {
  return {
    pontosLED: findInfra(rows, "iluminacao", "pontos_led_instalados"),
    manutencaoPendente: findInfra(rows, "iluminacao", "manutencao_pendente"),
    kmPorBairro: findInfra(rows, "pavimentacao", "km_por_bairro"),
  };
}

/**
 * Sistema de pontuação de suspeita em contratos públicos.
 * Retorna true se pontos >= 5. Silencioso — sem explicações na UI.
 */

interface ContratoBase {
  id: string;
  valor: number | null;
  objeto: string | null;
  numero: string | null;
  status: string | null;
  vigencia_inicio: string | null;
  vigencia_fim: string | null;
  fornecedor: string | null; // empresa (prefeitura) ou credor (câmara)
}

interface AditivoInfo {
  contrato_numero: string;
  valor: number | null;
  cnpj: string | null;
  credor: string | null;
}

export interface FornecedorCNPJ {
  cnpj: string;
  razao_social: string | null;
  data_abertura: string | null;
  situacao_cadastral: string | null;
  capital_social: number | null;
  cnae_descricao: string | null;
}

const TERMOS_VAGOS = [
  "serviços diversos",
  "materiais diversos",
  "prestação de serviços",
  "aquisição de materiais",
  "serviços gerais",
  "diversos",
  "materiais variados",
  "itens diversos",
  "material de consumo",
  "serviços de terceiros",
];

const TERMOS_EMERGENCIA = [
  "emergência",
  "emergencial",
  "calamidade",
  "urgência",
  "urgente",
  "situação emergencial",
  "estado de emergência",
  "caráter emergencial",
  "contratação emergencial",
  "dispensa de licitação por emergência",
];

const FERIADOS_NACIONAIS = [
  "01-01", "04-21", "05-01", "09-07", "10-12", "11-02", "11-15", "12-25",
];

// Limites de dispensa (Lei 14.133/2021)
const LIMITE_COMPRAS = 50_000;
const LIMITE_OBRAS = 100_000;

/**
 * Build a map: fornecedor_nome (upper) -> cnpj from aditivos
 */
function buildNomeToCnpjMap(aditivos: AditivoInfo[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const a of aditivos) {
    const nome = a.credor?.trim().toUpperCase();
    const cnpj = a.cnpj?.replace(/\D/g, "");
    if (nome && cnpj && cnpj.length === 14) {
      map.set(nome, cnpj);
    }
  }
  return map;
}

/**
 * Build a map: contrato_numero -> cnpj from aditivos
 */
function buildContratoToCnpjMap(aditivos: AditivoInfo[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const a of aditivos) {
    if (a.contrato_numero && a.cnpj) {
      const clean = a.cnpj.replace(/\D/g, "");
      if (clean.length === 14) map.set(a.contrato_numero, clean);
    }
  }
  return map;
}

/**
 * Detect if a contract's object text suggests emergency procurement.
 */
function isEmergencial(objeto: string): boolean {
  const lower = objeto.toLowerCase();
  return TERMOS_EMERGENCIA.some((t) => lower.includes(t));
}

/**
 * Resolve the CNPJ for a given contract, trying:
 * 1. Direct match by contrato_numero in aditivos
 * 2. Match by fornecedor name in aditivos
 */
function resolverCnpj(
  contrato: ContratoBase,
  contratoToCnpj: Map<string, string>,
  nomeToCnpj: Map<string, string>
): string | null {
  if (contrato.numero) {
    const cnpj = contratoToCnpj.get(contrato.numero);
    if (cnpj) return cnpj;
  }
  if (contrato.fornecedor) {
    const cnpj = nomeToCnpj.get(contrato.fornecedor.trim().toUpperCase());
    if (cnpj) return cnpj;
  }
  return null;
}

export function calcularSuspeitaContrato(
  contrato: ContratoBase,
  historicoCompleto: ContratoBase[],
  aditivos: AditivoInfo[],
  fornecedoresCNPJ?: Map<string, FornecedorCNPJ>
): boolean {
  let pontos = 0;

  const valor = contrato.valor || 0;
  const fornecedor = contrato.fornecedor?.trim().toUpperCase() || "";
  const objeto = contrato.objeto?.trim().toLowerCase() || "";

  // Pre-compute CNPJ maps (memoized per call but cheap enough)
  const contratoToCnpj = buildContratoToCnpjMap(aditivos);
  const nomeToCnpj = buildNomeToCnpjMap(aditivos);
  const meuCnpj = resolverCnpj(contrato, contratoToCnpj, nomeToCnpj);

  // ──────────────────────────────────────────────────────────
  // 1. DISPENSA PRÓXIMA DO LIMITE (+2)
  //    Sem campo tipoContratacao, inferimos: se o valor está
  //    próximo do limite E não há licitação associada (valor
  //    abaixo do teto = provavelmente dispensa), flaggamos.
  // ──────────────────────────────────────────────────────────
  if (valor >= LIMITE_COMPRAS * 0.95 && valor <= LIMITE_COMPRAS) {
    pontos += 2;
  } else if (valor >= LIMITE_OBRAS * 0.95 && valor <= LIMITE_OBRAS) {
    pontos += 2;
  }

  // ──────────────────────────────────────────────────────────
  // 2. EXCESSO DE CONTRATAÇÕES EMERGENCIAIS (+3)
  //    Detectamos emergências por palavras-chave no campo objeto.
  //    Se houver mais de 5 contratos emergenciais em 6 meses,
  //    flaggamos ESTE contrato se ele também for emergencial.
  // ──────────────────────────────────────────────────────────
  if (objeto && isEmergencial(objeto) && contrato.vigencia_inicio) {
    try {
      const dataRef = new Date(contrato.vigencia_inicio + "T12:00:00");
      const seisMesesAntes = new Date(dataRef);
      seisMesesAntes.setMonth(seisMesesAntes.getMonth() - 6);

      const emergencias6m = historicoCompleto.filter((c) => {
        if (!c.objeto || !c.vigencia_inicio) return false;
        if (!isEmergencial(c.objeto.toLowerCase())) return false;
        const d = new Date(c.vigencia_inicio + "T12:00:00");
        return d >= seisMesesAntes && d <= dataRef;
      });

      if (emergencias6m.length > 5) {
        pontos += 3;
      }
    } catch {
      // skip
    }
  }

  // ──────────────────────────────────────────────────────────
  // 3. FORNECEDOR RECORRENTE (+2 ou +3)
  //    Usa CNPJ quando disponível, senão nome do fornecedor.
  // ──────────────────────────────────────────────────────────
  if (meuCnpj) {
    // Count by CNPJ across all contracts
    let count = 0;
    for (const c of historicoCompleto) {
      const cnpj = resolverCnpj(c, contratoToCnpj, nomeToCnpj);
      if (cnpj === meuCnpj) count++;
    }
    if (count > 20) pontos += 3;
    else if (count >= 10) pontos += 2;
  } else if (fornecedor) {
    // Fallback: count by name
    const count = historicoCompleto.filter(
      (c) => c.fornecedor?.trim().toUpperCase() === fornecedor
    ).length;
    if (count > 20) pontos += 3;
    else if (count >= 10) pontos += 2;
  }

  // ──────────────────────────────────────────────────────────
  // 4. OBJETO GENÉRICO OU VAGO (+2)
  // ──────────────────────────────────────────────────────────
  if (objeto) {
    const isVago =
      objeto.length < 50 ||
      TERMOS_VAGOS.some((t) => objeto.includes(t));
    if (isVago) pontos += 2;
  } else {
    pontos += 2;
  }

  // ──────────────────────────────────────────────────────────
  // 5. ADITIVOS DESPROPORCIONAIS (+2 ou +3)
  // ──────────────────────────────────────────────────────────
  if (contrato.numero && valor > 0) {
    const aditivosContrato = aditivos.filter(
      (a) => a.contrato_numero === contrato.numero
    );
    const totalAditivos = aditivosContrato.reduce(
      (s, a) => s + (a.valor || 0),
      0
    );
    if (totalAditivos > 0) {
      const ratio = totalAditivos / valor;
      if (ratio > 1) pontos += 3;
      else if (ratio >= 0.5) pontos += 2;
    }
  }

  // ──────────────────────────────────────────────────────────
  // 6. DATA DE ASSINATURA SUSPEITA (+2 cada)
  // ──────────────────────────────────────────────────────────
  if (contrato.vigencia_inicio) {
    try {
      const dt = new Date(contrato.vigencia_inicio + "T12:00:00");
      const dow = dt.getDay();
      if (dow === 0 || dow === 6) pontos += 2;

      const mmdd = `${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
      if (FERIADOS_NACIONAIS.includes(mmdd)) pontos += 2;

      if (dt.getMonth() === 11 && dt.getDate() >= 21) pontos += 2;
    } catch {
      // skip
    }
  }

  // ──────────────────────────────────────────────────────────
  // 7. FORNECEDOR COM CNPJ RECENTE (+2 ou +3)
  // 11. CNPJ COM SITUAÇÃO IRREGULAR (+3)
  // ──────────────────────────────────────────────────────────
  if (fornecedoresCNPJ && meuCnpj) {
    const info = fornecedoresCNPJ.get(meuCnpj);
    if (info) {
      // Critério 7: empresa recente
      if (info.data_abertura && contrato.vigencia_inicio) {
        try {
          const abertura = new Date(info.data_abertura + "T12:00:00");
          const assinatura = new Date(contrato.vigencia_inicio + "T12:00:00");
          const diffMs = assinatura.getTime() - abertura.getTime();
          const diffMeses = diffMs / (1000 * 60 * 60 * 24 * 30);

          if (diffMeses >= 0 && diffMeses < 6 && valor >= 100_000) {
            pontos += 3;
          } else if (diffMeses >= 0 && diffMeses < 3) {
            pontos += 2;
          }
        } catch {
          // skip
        }
      }

      // Critério 11: situação cadastral irregular
      const situacao = info.situacao_cadastral?.toUpperCase();
      if (situacao && situacao !== "ATIVA") {
        pontos += 3;
      }
    }
  }

  // ──────────────────────────────────────────────────────────
  // 8. VALORES QUEBRADOS SUSPEITOS (+2)
  // ──────────────────────────────────────────────────────────
  if (valor > 0) {
    const centavos = Math.round((valor % 1) * 100);
    const proxLimite =
      (valor >= LIMITE_COMPRAS * 0.9 && valor <= LIMITE_COMPRAS) ||
      (valor >= LIMITE_OBRAS * 0.9 && valor <= LIMITE_OBRAS);
    if (proxLimite && centavos !== 0) {
      pontos += 2;
    }
  }

  // ──────────────────────────────────────────────────────────
  // 9. MESMO FORNECEDOR, VALORES SIMILARES NOS ÚLTIMOS 12 MESES (+2)
  //    Usa CNPJ quando disponível para matching preciso.
  // ──────────────────────────────────────────────────────────
  if ((meuCnpj || fornecedor) && contrato.vigencia_inicio) {
    try {
      const dataRef = new Date(contrato.vigencia_inicio + "T12:00:00");
      const umAnoAntes = new Date(dataRef);
      umAnoAntes.setFullYear(umAnoAntes.getFullYear() - 1);

      const mesmoFornecedor12m = historicoCompleto.filter((c) => {
        if (!c.vigencia_inicio) return false;
        const d = new Date(c.vigencia_inicio + "T12:00:00");
        if (d < umAnoAntes || d > dataRef) return false;

        // Match by CNPJ first, then by name
        if (meuCnpj) {
          const outroCnpj = resolverCnpj(c, contratoToCnpj, nomeToCnpj);
          return outroCnpj === meuCnpj;
        }
        return c.fornecedor?.trim().toUpperCase() === fornecedor;
      });

      if (mesmoFornecedor12m.length >= 3 && valor > 0) {
        const valoresSimilares = mesmoFornecedor12m.filter((c) => {
          if (!c.valor || c.valor === 0) return false;
          const diff = Math.abs(c.valor - valor) / valor;
          return diff < 0.1;
        });
        if (valoresSimilares.length >= 3) pontos += 2;
      }
    } catch {
      // skip
    }
  }

  // ──────────────────────────────────────────────────────────
  // 10. PRAZO DE EXECUÇÃO DESPROPORCIONAL (+2)
  // ──────────────────────────────────────────────────────────
  if (contrato.vigencia_inicio && contrato.vigencia_fim && valor > 0) {
    try {
      const inicio = new Date(contrato.vigencia_inicio + "T12:00:00");
      const fim = new Date(contrato.vigencia_fim + "T12:00:00");
      const dias = Math.round(
        (fim.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (valor >= 500_000 && dias > 0 && dias < 30) pontos += 2;
      if (valor >= 200_000 && dias > 0 && dias < 60) pontos += 2;
    } catch {
      // skip
    }
  }

  return pontos >= 5;
}

/**
 * Normaliza contratos de diferentes tabelas para o formato base.
 */
export function normalizarPrefeitura(c: {
  id: string;
  numero: string | null;
  empresa: string | null;
  valor: number | null;
  objeto: string | null;
  vigencia_inicio: string | null;
  vigencia_fim: string | null;
  status: string | null;
}): ContratoBase {
  return { ...c, fornecedor: c.empresa };
}

export function normalizarCamara(c: {
  id: string;
  numero: string | null;
  credor: string | null;
  valor: number | null;
  objeto: string | null;
  vigencia_inicio: string | null;
  vigencia_fim: string | null;
  status: string | null;
}): ContratoBase {
  return { ...c, fornecedor: c.credor };
}

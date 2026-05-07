export type ContratoAditivo = {
  contrato_numero: string | null;
  credor: string | null;
  valor: number | null;
  termo?: number | null;
  tipo_aditivo?: string | null;
  cnpj?: string | null;
  centi_id?: string | null;
  fonte_url?: string | null;
};

export type AditivosAgregados = {
  count: number;
  totalValor: number;
};

export type AditivosLookup = {
  byContratoOrigemId: Map<string, AditivosAgregados>;
  byCompositeKey: Map<string, AditivosAgregados>;
  byNumero: Map<string, AditivosAgregados[]>;
};

const CONTRATO_URL_REGEX = /\/contratos\/contrato\/(\d+)/i;
const ADITIVO_URL_REGEX = /\/contratos\/contratoaditivo\/(\d+)/i;

/**
 * Normaliza o nome de um fornecedor/credor de forma agressiva para permitir
 * match mesmo com variações de grafia, sufixos jurídicos e caracteres especiais.
 */
export function normalizarCredor(nome: string | null | undefined): string {
  if (!nome) return "";

  let s = nome
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();

  const sufixos = [
    "SOCIEDADE SIMPLES", "SOCIEDADE ANONIMA", "SOCIEDADE LIMITADA",
    "EIRELI-EPP", "EIRELI-ME", "EIRELI EPP", "EIRELI ME",
    "LTDA-EPP", "LTDA-ME", "LTDA EPP", "LTDA ME",
    "EIRELI", "LTDA", "S\\.A\\.", "S/A", "S\\.A",
    "EPP", "ME", "MEI", "CNPJ",
  ];
  const sufixoRegex = new RegExp(`\\b(${sufixos.join("|")})\\b\\.?`, "gi");
  s = s.replace(sufixoRegex, "");

  return s.replace(/[^A-Z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function makeKey(numero: string, credor: string | null | undefined): string {
  const credorNorm = normalizarCredor(credor);
  if (!credorNorm) return numero;
  return `${numero}::${credorNorm}`;
}

function mergeAgregado(atual: AditivosAgregados | undefined, valor: number | null | undefined): AditivosAgregados {
  return {
    count: (atual?.count || 0) + 1,
    totalValor: (atual?.totalValor || 0) + (valor || 0),
  };
}

function extractContratoOrigemIdFromContratoUrl(fonteUrl: string | null | undefined): string | null {
  return fonteUrl?.match(CONTRATO_URL_REGEX)?.[1] ?? null;
}

function extractContratoOrigemIdFromAditivo(aditivo: ContratoAditivo): string | null {
  return aditivo.centi_id?.trim() || aditivo.fonte_url?.match(ADITIVO_URL_REGEX)?.[1] || null;
}

/**
 * Estratégia definitiva:
 * 1) vínculo pelo ID real do contrato no portal (extraído da URL)
 * 2) fallback por chave composta número + credor normalizado
 * 3) fallback seguro por número apenas quando houver um único grupo possível
 */
export function buildAditivosLookup(aditivos: ContratoAditivo[]): AditivosLookup {
  const byContratoOrigemId = new Map<string, AditivosAgregados>();
  const byCompositeKey = new Map<string, AditivosAgregados>();
  const byNumeroBuckets = new Map<string, Map<string, AditivosAgregados>>();

  for (const aditivo of aditivos) {
    const numero = (aditivo.contrato_numero || "").trim();
    if (!numero) continue;

    const compositeKey = makeKey(numero, aditivo.credor);
    const nextComposite = mergeAgregado(byCompositeKey.get(compositeKey), aditivo.valor);
    byCompositeKey.set(compositeKey, nextComposite);

    const origemId = extractContratoOrigemIdFromAditivo(aditivo);
    if (origemId) {
      byContratoOrigemId.set(origemId, mergeAgregado(byContratoOrigemId.get(origemId), aditivo.valor));
    }

    const numeroBucket = byNumeroBuckets.get(numero) || new Map<string, AditivosAgregados>();
    numeroBucket.set(compositeKey, nextComposite);
    byNumeroBuckets.set(numero, numeroBucket);
  }

  const byNumero = new Map<string, AditivosAgregados[]>();
  for (const [numero, bucket] of byNumeroBuckets) {
    byNumero.set(numero, Array.from(bucket.values()));
  }

  return {
    byContratoOrigemId,
    byCompositeKey,
    byNumero,
  };
}

export function getAditivosDoContrato(
  lookup: AditivosLookup,
  numero: string | null,
  credor: string | null | undefined,
  fonteUrl?: string | null,
) {
  const numeroKey = (numero || "").trim();
  if (!numeroKey) return null;

  const origemId = extractContratoOrigemIdFromContratoUrl(fonteUrl);
  if (origemId) {
    const matchByOrigem = lookup.byContratoOrigemId.get(origemId);
    if (matchByOrigem) return matchByOrigem;
  }

  const matchByComposite = lookup.byCompositeKey.get(makeKey(numeroKey, credor));
  if (matchByComposite) return matchByComposite;

  const sameNumero = lookup.byNumero.get(numeroKey) || [];
  if (sameNumero.length === 1) return sameNumero[0];

  return null;
}

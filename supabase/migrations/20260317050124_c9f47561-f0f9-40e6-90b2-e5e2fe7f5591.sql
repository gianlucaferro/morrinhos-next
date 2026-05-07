-- Corrige a unicidade de contratos_aditivos para evitar colisões entre fornecedores diferentes
-- com o mesmo número de contrato, termo e ano.

ALTER TABLE public.contratos_aditivos
DROP CONSTRAINT IF EXISTS contratos_aditivos_contrato_numero_termo_ano_key;

CREATE UNIQUE INDEX IF NOT EXISTS contratos_aditivos_unique_numero_termo_ano_credor
ON public.contratos_aditivos (
  contrato_numero,
  termo,
  ano,
  COALESCE(credor, '')
);

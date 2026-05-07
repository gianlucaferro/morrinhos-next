-- Ajusta contratos_aditivos para usar chave única real compatível com upsert.
-- Como não há credor nulo hoje, padronizamos o campo para não aceitar null.

UPDATE public.contratos_aditivos
SET credor = ''
WHERE credor IS NULL;

DROP INDEX IF EXISTS public.contratos_aditivos_unique_numero_termo_ano_credor;

ALTER TABLE public.contratos_aditivos
ALTER COLUMN credor SET DEFAULT '',
ALTER COLUMN credor SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS contratos_aditivos_unique_numero_termo_ano_credor
ON public.contratos_aditivos (contrato_numero, termo, ano, credor);

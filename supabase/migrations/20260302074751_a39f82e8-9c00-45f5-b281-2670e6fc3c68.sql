
-- Table for ANEEL CDE subsidy data (Tarifa Social regional reference)
CREATE TABLE public.cde_subsidios (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  distribuidora text NOT NULL,
  uf text,
  ano integer NOT NULL,
  tipo_subsidio text NOT NULL,
  beneficiarios integer,
  valor_subsidio numeric,
  valor_faturamento numeric,
  fonte_url text DEFAULT 'https://dadosabertos.aneel.gov.br/dataset/subsidios-tarifarios',
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(distribuidora, ano, tipo_subsidio)
);

ALTER TABLE public.cde_subsidios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "CDE subsídios são públicos"
ON public.cde_subsidios
FOR SELECT
USING (true);

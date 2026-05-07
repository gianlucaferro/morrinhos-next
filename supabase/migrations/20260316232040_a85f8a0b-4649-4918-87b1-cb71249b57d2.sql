
CREATE TABLE public.contratos_aditivos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_numero text NOT NULL,
  termo integer NOT NULL DEFAULT 1,
  tipo text,
  tipo_aditivo text,
  data_termo date,
  prazo date,
  cnpj text,
  credor text,
  valor numeric,
  ano integer NOT NULL,
  fonte_url text,
  centi_id text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (contrato_numero, termo, ano)
);

ALTER TABLE public.contratos_aditivos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Aditivos são públicos" ON public.contratos_aditivos
  FOR SELECT TO public USING (true);

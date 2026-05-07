
CREATE TABLE public.contratos_risco (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id uuid NOT NULL,
  orgao text NOT NULL DEFAULT 'prefeitura',
  risco_alto boolean NOT NULL DEFAULT false,
  score numeric DEFAULT 0,
  fatores jsonb DEFAULT '[]'::jsonb,
  modelo_versao text DEFAULT 'gemini-3-flash-v1',
  analisado_em timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (contrato_id, orgao)
);

ALTER TABLE public.contratos_risco ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Risco contratos é público" ON public.contratos_risco
  FOR SELECT TO public USING (true);

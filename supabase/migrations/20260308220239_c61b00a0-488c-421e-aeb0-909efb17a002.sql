
-- Table for public safety indicators from SINESP/SSP
CREATE TABLE public.seguranca_indicadores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ano integer NOT NULL,
  mes integer,
  municipio text NOT NULL DEFAULT 'Morrinhos',
  uf text NOT NULL DEFAULT 'GO',
  indicador text NOT NULL,
  categoria text NOT NULL DEFAULT 'criminal',
  ocorrencias integer,
  vitimas integer,
  taxa_por_100k numeric,
  fonte_nome text NOT NULL DEFAULT 'SINESP/MJ',
  fonte_url text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(ano, mes, municipio, indicador)
);

ALTER TABLE public.seguranca_indicadores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Segurança indicadores são públicos"
  ON public.seguranca_indicadores
  FOR SELECT
  USING (true);

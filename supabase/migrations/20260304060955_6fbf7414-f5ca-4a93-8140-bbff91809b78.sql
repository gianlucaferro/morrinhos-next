-- Create table for resoluções da câmara
CREATE TABLE public.resolucoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text NOT NULL,
  ano integer NOT NULL,
  data_publicacao date,
  ementa text NOT NULL,
  categoria text,
  orgao text DEFAULT 'Câmara Municipal',
  fonte_url text,
  resumo_ia text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.resolucoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Resoluções são públicas" ON public.resolucoes FOR SELECT USING (true);

CREATE UNIQUE INDEX resolucoes_numero_key ON public.resolucoes (numero);

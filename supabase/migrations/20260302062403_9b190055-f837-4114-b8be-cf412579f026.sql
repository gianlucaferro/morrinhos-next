
-- Table for Pé de Meia program data per municipality
CREATE TABLE public.pe_de_meia (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ano integer NOT NULL,
  mes integer, -- null = annual summary
  beneficiarios integer,
  valor_total numeric,
  valor_medio_por_aluno numeric,
  serie text, -- '1a', '2a', '3a' serie or null for total
  fonte_url text,
  observacao text,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.pe_de_meia ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pé de Meia é público" ON public.pe_de_meia FOR SELECT USING (true);

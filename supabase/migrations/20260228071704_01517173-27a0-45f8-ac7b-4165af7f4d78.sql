
-- Tabela de indicadores municipais (key-value flexível)
CREATE TABLE public.indicadores_municipais (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chave text NOT NULL UNIQUE,
  valor numeric,
  valor_texto text,
  ano_referencia integer NOT NULL,
  fonte_url text,
  atualizado_em timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.indicadores_municipais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Indicadores são públicos"
  ON public.indicadores_municipais FOR SELECT
  USING (true);

-- Tabela de emendas parlamentares
CREATE TABLE public.emendas_parlamentares (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  parlamentar_nome text NOT NULL,
  parlamentar_esfera text DEFAULT 'federal',
  valor_empenhado numeric DEFAULT 0,
  valor_pago numeric DEFAULT 0,
  objeto text,
  ano integer NOT NULL,
  fonte_url text,
  atualizado_em timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.emendas_parlamentares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Emendas são públicas"
  ON public.emendas_parlamentares FOR SELECT
  USING (true);

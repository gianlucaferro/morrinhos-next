
-- Table for storing per capita comparison data with similar GO municipalities
CREATE TABLE public.arrecadacao_comparativo (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ano integer NOT NULL,
  categoria text NOT NULL, -- e.g. 'receita_propria_total', 'IPTU', 'ISSQN', 'ITBI', 'IRRF'
  morrinhos_valor numeric NULL,
  morrinhos_per_capita numeric NULL,
  media_go_valor numeric NULL,
  media_go_per_capita numeric NULL,
  municipios_amostra integer NULL DEFAULT 0,
  municipios_nomes text[] NULL DEFAULT '{}',
  fonte_nome text NOT NULL DEFAULT 'SICONFI/DCA - Tesouro Nacional',
  fonte_url text NULL,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Unique constraint for upsert
ALTER TABLE public.arrecadacao_comparativo 
  ADD CONSTRAINT arrecadacao_comparativo_ano_categoria_key UNIQUE (ano, categoria);

-- Enable RLS
ALTER TABLE public.arrecadacao_comparativo ENABLE ROW LEVEL SECURITY;

-- Public read policy
CREATE POLICY "Comparativo arrecadação é público"
  ON public.arrecadacao_comparativo
  FOR SELECT
  USING (true);

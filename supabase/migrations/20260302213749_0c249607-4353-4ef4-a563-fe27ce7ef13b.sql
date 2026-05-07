
-- Tabela para armazenar indicadores agropecuários do IBGE SIDRA
CREATE TABLE public.agro_indicadores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  categoria TEXT NOT NULL, -- 'pecuaria' ou 'lavoura'
  chave TEXT NOT NULL, -- ex: 'bovino', 'soja', 'milho'
  valor NUMERIC,
  valor_texto TEXT,
  unidade TEXT, -- 'Cabeças', 'Toneladas', 'Mil Reais'
  ano_referencia INTEGER NOT NULL,
  fonte_url TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (categoria, chave, ano_referencia)
);

ALTER TABLE public.agro_indicadores ENABLE ROW LEVEL SECURITY;

-- Dados públicos, qualquer pessoa pode ler
CREATE POLICY "Agro indicadores são públicos"
  ON public.agro_indicadores
  FOR SELECT
  USING (true);

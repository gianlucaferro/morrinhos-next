
-- Table for municipal revenue data
CREATE TABLE public.arrecadacao_municipal (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  municipio TEXT NOT NULL DEFAULT 'Morrinhos-GO',
  tipo TEXT NOT NULL, -- receita_propria, repasse_ipva, outro_repasse
  categoria TEXT NOT NULL, -- IPTU, ISSQN, ITBI, Taxas, Contribuições, Tarifas, Outras
  subcategoria TEXT,
  competencia TEXT NOT NULL, -- YYYY-MM
  ano INTEGER NOT NULL,
  valor NUMERIC,
  fonte_nome TEXT NOT NULL,
  fonte_url TEXT,
  data_coleta TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  observacoes TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.arrecadacao_municipal ENABLE ROW LEVEL SECURITY;

-- Public read
CREATE POLICY "Arrecadação é pública"
  ON public.arrecadacao_municipal
  FOR SELECT
  USING (true);

-- Unique constraint for upsert
CREATE UNIQUE INDEX idx_arrecadacao_unique 
  ON public.arrecadacao_municipal (municipio, tipo, categoria, competencia);

-- Index for queries
CREATE INDEX idx_arrecadacao_ano ON public.arrecadacao_municipal (ano);
CREATE INDEX idx_arrecadacao_tipo ON public.arrecadacao_municipal (tipo);

-- Trigger for updated_at
CREATE TRIGGER update_arrecadacao_updated_at
  BEFORE UPDATE ON public.arrecadacao_municipal
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Log table for sync runs
CREATE TABLE public.arrecadacao_fontes_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fonte_nome TEXT NOT NULL,
  fonte_url TEXT,
  competencia TEXT,
  status TEXT NOT NULL DEFAULT 'running',
  registros_importados INTEGER DEFAULT 0,
  mensagem_erro TEXT,
  data_execucao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.arrecadacao_fontes_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Log arrecadação é público"
  ON public.arrecadacao_fontes_log
  FOR SELECT
  USING (true);

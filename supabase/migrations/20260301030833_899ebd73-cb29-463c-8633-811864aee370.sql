
-- Table to store Lei Orgânica documents (emendas)
CREATE TABLE public.lei_organica (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  descricao TEXT NOT NULL,
  observacao TEXT,
  data_publicacao DATE,
  documento_url TEXT,
  resumo_ia TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Public read access (transparency data)
ALTER TABLE public.lei_organica ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lei Orgânica is publicly readable"
ON public.lei_organica
FOR SELECT
USING (true);

-- Indexes for search performance
CREATE INDEX idx_lei_organica_data ON public.lei_organica(data_publicacao DESC);
CREATE INDEX idx_lei_organica_descricao_fts ON public.lei_organica USING gin(to_tsvector('portuguese', descricao));

-- Timestamp trigger
CREATE TRIGGER update_lei_organica_updated_at
BEFORE UPDATE ON public.lei_organica
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

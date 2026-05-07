
-- Table to store the full Lei Orgânica parsed into individual articles
CREATE TABLE public.lei_organica_artigos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo TEXT NOT NULL,          -- e.g. "TÍTULO I - DA ORGANIZAÇÃO MUNICIPAL"
  capitulo TEXT,                  -- e.g. "CAPÍTULO II - DA COMPETÊNCIA DO MUNICÍPIO"
  secao TEXT,                     -- e.g. "Seção I - Das Disposições Gerais"
  artigo_numero INTEGER,          -- article number (1, 2, 3...)
  artigo_texto TEXT NOT NULL,     -- full text of the article including paragraphs
  resumo_ia TEXT,                 -- AI-generated plain-language summary
  ordem INTEGER NOT NULL DEFAULT 0, -- ordering within the document
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.lei_organica_artigos ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Lei Orgânica artigos são públicos"
  ON public.lei_organica_artigos
  FOR SELECT
  USING (true);

-- Full-text search index
CREATE INDEX idx_lei_organica_artigos_search 
  ON public.lei_organica_artigos 
  USING GIN (to_tsvector('portuguese', artigo_texto));

-- Index for ordering
CREATE INDEX idx_lei_organica_artigos_ordem 
  ON public.lei_organica_artigos (ordem);

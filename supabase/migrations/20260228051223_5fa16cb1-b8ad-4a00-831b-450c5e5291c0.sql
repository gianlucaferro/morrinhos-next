
-- Tabela para indicações, moções, requerimentos e demais atuações parlamentares
CREATE TABLE public.atuacao_parlamentar (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo TEXT NOT NULL, -- 'Indicação', 'Moção', 'Requerimento', 'Requerimento Verbal', 'Pedido de Informação'
  numero INTEGER NOT NULL,
  ano INTEGER NOT NULL,
  data DATE NOT NULL,
  descricao TEXT NOT NULL,
  autor_texto TEXT NOT NULL,
  autor_vereador_id UUID REFERENCES public.vereadores(id),
  fonte_url TEXT NOT NULL DEFAULT 'https://acessoainformacao.camarademorrinhos.go.gov.br/atuacao-parlamentar/',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tipo, numero, ano)
);

-- Enable RLS
ALTER TABLE public.atuacao_parlamentar ENABLE ROW LEVEL SECURITY;

-- Public read policy
CREATE POLICY "Atuação parlamentar é pública"
  ON public.atuacao_parlamentar
  FOR SELECT
  USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_atuacao_parlamentar_updated_at
  BEFORE UPDATE ON public.atuacao_parlamentar
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Index for vereador queries
CREATE INDEX idx_atuacao_vereador ON public.atuacao_parlamentar(autor_vereador_id);
CREATE INDEX idx_atuacao_tipo_ano ON public.atuacao_parlamentar(tipo, ano);

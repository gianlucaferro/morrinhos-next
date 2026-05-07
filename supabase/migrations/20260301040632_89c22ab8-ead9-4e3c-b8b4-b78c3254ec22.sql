-- Tabela de decretos municipais
CREATE TABLE public.decretos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  numero TEXT NOT NULL,
  data_publicacao DATE,
  ementa TEXT NOT NULL,
  orgao TEXT,
  categoria TEXT,
  fonte_url TEXT,
  resumo_ia TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Unique constraint para evitar duplicatas
CREATE UNIQUE INDEX idx_decretos_numero ON public.decretos(numero);

-- Enable RLS
ALTER TABLE public.decretos ENABLE ROW LEVEL SECURITY;

-- Decretos são dados públicos
CREATE POLICY "Decretos são públicos"
ON public.decretos
FOR SELECT
USING (true);

-- Trigger para updated_at
CREATE TRIGGER update_decretos_updated_at
BEFORE UPDATE ON public.decretos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

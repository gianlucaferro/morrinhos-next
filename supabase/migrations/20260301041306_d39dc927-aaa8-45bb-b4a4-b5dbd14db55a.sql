
-- Create portarias table (same structure as decretos)
CREATE TABLE public.portarias (
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

-- Unique index on numero
CREATE UNIQUE INDEX idx_portarias_numero ON public.portarias(numero);

-- Enable RLS
ALTER TABLE public.portarias ENABLE ROW LEVEL SECURITY;

-- Public read policy
CREATE POLICY "Portarias são públicas" ON public.portarias
  FOR SELECT USING (true);

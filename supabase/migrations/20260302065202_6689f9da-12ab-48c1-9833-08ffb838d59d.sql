
-- Table for storing social benefits data
CREATE TABLE public.beneficios_sociais (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  municipio text NOT NULL DEFAULT 'Morrinhos-GO',
  programa text NOT NULL,
  competencia text NOT NULL, -- YYYY-MM
  beneficiarios integer,
  valor_pago numeric,
  unidade_medida text DEFAULT 'famílias',
  fonte_nome text NOT NULL,
  fonte_url text,
  data_coleta timestamp with time zone NOT NULL DEFAULT now(),
  observacoes text,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(programa, competencia)
);

-- Enable RLS
ALTER TABLE public.beneficios_sociais ENABLE ROW LEVEL SECURITY;

-- Public read
CREATE POLICY "Benefícios sociais são públicos"
  ON public.beneficios_sociais
  FOR SELECT
  USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_beneficios_sociais_updated_at
  BEFORE UPDATE ON public.beneficios_sociais
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

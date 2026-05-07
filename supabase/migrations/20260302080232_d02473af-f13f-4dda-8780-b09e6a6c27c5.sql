
-- Cache for AI-generated summaries (taxes and other reusable summaries)
CREATE TABLE public.resumos_ia_cache (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contexto text NOT NULL,
  chave text NOT NULL,
  ano integer NOT NULL,
  resumo text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (contexto, chave, ano)
);

ALTER TABLE public.resumos_ia_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Resumos IA cache são públicos"
  ON public.resumos_ia_cache FOR SELECT USING (true);

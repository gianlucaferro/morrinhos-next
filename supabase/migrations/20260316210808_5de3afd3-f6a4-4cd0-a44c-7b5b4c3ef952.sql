
CREATE TABLE IF NOT EXISTS public.camara_atos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL,
  tipo_codigo integer,
  numero text,
  descricao text,
  data_publicacao date,
  ano integer NOT NULL,
  fonte_url text DEFAULT 'https://camaramorrinhos.centi.com.br/transparencia/atosadministrativos',
  documento_url text,
  centi_id text UNIQUE,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.camara_atos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Atos câmara são públicos" ON public.camara_atos FOR SELECT TO public USING (true);

CREATE TRIGGER update_camara_atos_updated_at BEFORE UPDATE ON public.camara_atos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

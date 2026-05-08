
-- Create table for leis municipais
CREATE TABLE public.leis_municipais (
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
CREATE UNIQUE INDEX idx_leis_municipais_numero ON public.leis_municipais(numero);

-- Enable RLS with public read
ALTER TABLE public.leis_municipais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access for leis_municipais"
  ON public.leis_municipais
  FOR SELECT
  USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_leis_municipais_updated_at
  BEFORE UPDATE ON public.leis_municipais
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Cron job for weekly sync (Sundays 3:30 AM)
SELECT cron.schedule(
  'sync-leis-municipais-semanal',
  '30 3 * * 0',
  $$
  SELECT net.http_post(
    url:='https://pgqztmtimakiikcsvfph.supabase.co/functions/v1/sync-leis-municipais',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBncXp0bXRpbWFraWlrY3N2ZnBoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyMDE3NTEsImV4cCI6MjA5Mzc3Nzc1MX0.7EPa5iAoAXBacIjsazHqswF2RNgOlirIlkkhuHFFzlw"}'::jsonb,
    body:='{}'::jsonb
  ) AS request_id;
  $$
);

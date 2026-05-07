CREATE TABLE IF NOT EXISTS public.farmacia_fotos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,
  foto_url TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.farmacia_fotos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read farmacia fotos" ON public.farmacia_fotos FOR SELECT USING (true);

CREATE POLICY "Service write farmacia fotos" ON public.farmacia_fotos FOR ALL USING (true);

INSERT INTO storage.buckets (id, name, public) VALUES ('farmacia-fotos', 'farmacia-fotos', true) ON CONFLICT DO NOTHING;

CREATE POLICY "Public read farmacia storage" ON storage.objects FOR SELECT USING (bucket_id = 'farmacia-fotos');

CREATE POLICY "Auth upload farmacia storage" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'farmacia-fotos');

CREATE POLICY "Auth update farmacia storage" ON storage.objects FOR UPDATE USING (bucket_id = 'farmacia-fotos');
CREATE TABLE IF NOT EXISTS public.anuncios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_empresa TEXT NOT NULL,
  plano TEXT NOT NULL DEFAULT 'padrao' CHECK (plano IN ('padrao', 'destaque')),
  imagem_url TEXT,
  link_destino TEXT,
  whatsapp TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  impressoes INTEGER NOT NULL DEFAULT 0,
  cliques INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.anuncios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read anuncios" ON public.anuncios FOR SELECT USING (true);
CREATE POLICY "Service write anuncios" ON public.anuncios FOR ALL USING (true);

INSERT INTO storage.buckets (id, name, public) VALUES ('anuncios', 'anuncios', true) ON CONFLICT DO NOTHING;

CREATE POLICY "Public read anuncios storage" ON storage.objects FOR SELECT USING (bucket_id = 'anuncios');
CREATE POLICY "Auth upload anuncios storage" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'anuncios');
CREATE POLICY "Auth update anuncios storage" ON storage.objects FOR UPDATE USING (bucket_id = 'anuncios');
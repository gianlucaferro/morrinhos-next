CREATE TABLE public.noticias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  link text NOT NULL UNIQUE,
  source text NOT NULL DEFAULT 'Notícia',
  pub_date timestamptz,
  origem text NOT NULL DEFAULT 'google_news',
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.noticias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "noticias_public_read" ON public.noticias
  FOR SELECT TO anon, authenticated USING (true);

CREATE INDEX idx_noticias_pub_date ON public.noticias (pub_date DESC);
CREATE INDEX idx_noticias_origem ON public.noticias (origem);
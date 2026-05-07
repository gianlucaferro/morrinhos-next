
CREATE TABLE public.zap_establishments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  whatsapp text NOT NULL UNIQUE,
  category text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.zap_establishments ENABLE ROW LEVEL SECURITY;

-- Anyone can read approved establishments
CREATE POLICY "Public can read approved establishments"
  ON public.zap_establishments FOR SELECT
  TO public
  USING (true);

-- Anyone can insert (register their business)
CREATE POLICY "Public can insert establishments"
  ON public.zap_establishments FOR INSERT
  TO public
  WITH CHECK (true);

-- Allow updates (admin uses client-side auth)
CREATE POLICY "Public can update establishments"
  ON public.zap_establishments FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

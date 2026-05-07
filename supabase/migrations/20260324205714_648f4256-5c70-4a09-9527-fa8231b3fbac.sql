-- Add click counter to zap_establishments
ALTER TABLE public.zap_establishments ADD COLUMN IF NOT EXISTS click_count integer NOT NULL DEFAULT 0;

-- Create suggestions table for public correction requests
CREATE TABLE public.zap_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  establishment_id uuid REFERENCES public.zap_establishments(id) ON DELETE CASCADE NOT NULL,
  suggestion_text text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.zap_suggestions ENABLE ROW LEVEL SECURITY;

-- Anyone can read and insert suggestions
CREATE POLICY "Suggestions are publicly readable" ON public.zap_suggestions FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can insert suggestions" ON public.zap_suggestions FOR INSERT TO public WITH CHECK (true);

-- Allow public to increment click_count
CREATE POLICY "Anyone can update click count" ON public.zap_establishments FOR UPDATE TO public USING (true) WITH CHECK (true);
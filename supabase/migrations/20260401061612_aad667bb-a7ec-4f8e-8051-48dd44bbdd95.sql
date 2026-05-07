
-- 1. Fix subscriptions: block public SELECT (sensitive emails/tokens)
-- No SELECT policy exists, but let's ensure it stays blocked by NOT adding one.
-- The table already has no SELECT policy which means RLS blocks reads. Verified.

-- 2. Fix zap_establishments: enforce status='pending' on insert
DROP POLICY IF EXISTS "Public can insert establishments" ON public.zap_establishments;
CREATE POLICY "Public can insert establishments" ON public.zap_establishments
  FOR INSERT TO public
  WITH CHECK (status = 'pending');

-- 3. Add validation constraints on zap_establishments
ALTER TABLE public.zap_establishments
  ADD CONSTRAINT zap_establishments_name_length CHECK (char_length(name) <= 200);

ALTER TABLE public.zap_establishments
  ADD CONSTRAINT zap_establishments_whatsapp_format CHECK (whatsapp ~ '^[0-9]{10,15}$');

-- 4. Add validation constraint on zap_suggestions
ALTER TABLE public.zap_suggestions
  ADD CONSTRAINT zap_suggestions_text_length CHECK (char_length(suggestion_text) <= 1000);

-- 5. Fix temp-uploads storage: restrict INSERT to service_role only
DROP POLICY IF EXISTS "Service role can upload to temp" ON storage.objects;
CREATE POLICY "Service role can upload to temp" ON storage.objects
  FOR INSERT TO public
  WITH CHECK (bucket_id = 'temp-uploads' AND (auth.role() = 'service_role'));

-- 6. Make temp-uploads reads require service_role too
DROP POLICY IF EXISTS "Temp uploads are publicly readable" ON storage.objects;
CREATE POLICY "Temp uploads readable by service role" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'temp-uploads' AND (auth.role() = 'service_role'));

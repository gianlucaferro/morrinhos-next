
-- Fix 1: zap_establishments - only allow public to read APPROVED ones
DROP POLICY IF EXISTS "Public can read approved establishments" ON public.zap_establishments;
CREATE POLICY "Public can read approved establishments" ON public.zap_establishments
  FOR SELECT TO public
  USING (status = 'approved');

-- Fix 2: zap_suggestions - block all public reads (admin-only via service_role)
DROP POLICY IF EXISTS "Suggestions are publicly readable" ON public.zap_suggestions;
-- No SELECT policy = no public access, only service_role can read

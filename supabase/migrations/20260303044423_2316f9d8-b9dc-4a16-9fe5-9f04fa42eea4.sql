
-- Drop ALL existing policies on these 3 tables first
DROP POLICY IF EXISTS "Anyone can subscribe" ON public.subscriptions;
DROP POLICY IF EXISTS "Anyone can add vereador follows" ON public.subscription_vereadores;

-- Recreate INSERT-only policies (no SELECT = emails não ficam expostos)
CREATE POLICY "Anyone can subscribe"
ON public.subscriptions
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Anyone can add vereador follows"
ON public.subscription_vereadores
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

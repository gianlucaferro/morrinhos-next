-- Drop existing restrictive policies if any conflict
DROP POLICY IF EXISTS "Public read farmacia fotos" ON public.farmacia_fotos;
DROP POLICY IF EXISTS "Service role write farmacia fotos" ON public.farmacia_fotos;
DROP POLICY IF EXISTS "farmacia_fotos_select" ON public.farmacia_fotos;
DROP POLICY IF EXISTS "farmacia_fotos_insert" ON public.farmacia_fotos;
DROP POLICY IF EXISTS "farmacia_fotos_update" ON public.farmacia_fotos;
DROP POLICY IF EXISTS "farmacia_fotos_delete" ON public.farmacia_fotos;

-- Public read
CREATE POLICY "farmacia_fotos_select" ON public.farmacia_fotos FOR SELECT USING (true);

-- Open INSERT/UPDATE/DELETE (admin uses anon token, not Supabase Auth)
CREATE POLICY "farmacia_fotos_insert" ON public.farmacia_fotos FOR INSERT WITH CHECK (true);
CREATE POLICY "farmacia_fotos_update" ON public.farmacia_fotos FOR UPDATE USING (true);
CREATE POLICY "farmacia_fotos_delete" ON public.farmacia_fotos FOR DELETE USING (true);
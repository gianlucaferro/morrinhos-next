
-- 1. Fix zap_establishments: Drop permissive UPDATE policies, create secure RPC for click counting
DROP POLICY IF EXISTS "Anyone can update click count" ON public.zap_establishments;
DROP POLICY IF EXISTS "Public can update establishments" ON public.zap_establishments;

-- Create secure RPC for click count increment only
CREATE OR REPLACE FUNCTION public.increment_click_count(establishment_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.zap_establishments
  SET click_count = click_count + 1
  WHERE id = establishment_id AND status = 'approved';
$$;

-- 2. Fix sync_log: Remove public SELECT policy
DROP POLICY IF EXISTS "Sync log público para leitura" ON public.sync_log;

-- 3. Fix subscription_vereadores: Remove public SELECT policy
DROP POLICY IF EXISTS "Anyone can check their follows" ON public.subscription_vereadores;

-- 4. Fix arrecadacao_fontes_log: Remove public SELECT policy  
DROP POLICY IF EXISTS "Log arrecadação é público" ON public.arrecadacao_fontes_log;

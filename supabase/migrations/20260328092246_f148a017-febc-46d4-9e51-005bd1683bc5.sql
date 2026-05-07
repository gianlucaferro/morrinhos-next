
-- 1. FIX: subscriptions - remove public SELECT, keep insert-only
DROP POLICY IF EXISTS "Anyone can check their subscription" ON public.subscriptions;

-- 2. FIX: push_subscriptions - remove public SELECT and DELETE, keep insert-only
DROP POLICY IF EXISTS "Push subscriptions select para funções" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Push subscriptions delete por endpoint" ON public.push_subscriptions;

-- 3. FIX: email_digest_log - ensure no public access (RLS enabled, no permissive policies needed)
-- Add a restrictive default: no public access at all
DROP POLICY IF EXISTS "email_digest_log_no_public" ON public.email_digest_log;

-- Allow anonymous inserts on subscriptions
CREATE POLICY "Anyone can subscribe"
ON public.subscriptions
FOR INSERT
WITH CHECK (true);

-- Allow anonymous select to check existing subscriptions
CREATE POLICY "Anyone can check their subscription"
ON public.subscriptions
FOR SELECT
USING (true);

-- Allow anonymous inserts on subscription_vereadores
CREATE POLICY "Anyone can follow a vereador"
ON public.subscription_vereadores
FOR INSERT
WITH CHECK (true);

-- Allow anonymous select to check existing follows
CREATE POLICY "Anyone can check their follows"
ON public.subscription_vereadores
FOR SELECT
USING (true);

-- Enable RLS on both tables
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_vereadores ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint text NOT NULL UNIQUE,
  keys_p256dh text NOT NULL,
  keys_auth text NOT NULL,
  topic text NOT NULL DEFAULT 'folha_pagamento',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Push subscriptions insert público"
  ON public.push_subscriptions FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Push subscriptions delete por endpoint"
  ON public.push_subscriptions FOR DELETE
  TO public
  USING (true);

CREATE POLICY "Push subscriptions select para funções"
  ON public.push_subscriptions FOR SELECT
  TO public
  USING (true);
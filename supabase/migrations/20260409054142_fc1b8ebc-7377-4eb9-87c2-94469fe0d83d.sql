
CREATE OR REPLACE FUNCTION public.invoke_edge_function(function_name TEXT)
RETURNS BIGINT LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT net.http_post(
    url := 'https://uulpqmylqnonbxozdbtb.supabase.co/functions/v1/' || function_name,
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1bHBxbXlscW5vbmJ4b3pkYnRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNTEyMTAsImV4cCI6MjA4NzgyNzIxMH0.tiFCRP0Lpbc0Rd9St92VhHmjxi2DK0M7ZO_1qayC_l8"}'::jsonb,
    body := '{}'::jsonb
  );
$$;

CREATE TABLE IF NOT EXISTS public.sync_job_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name TEXT NOT NULL UNIQUE,
  cron_name TEXT NOT NULL UNIQUE,
  cron_expression TEXT NOT NULL,
  frequency_tier TEXT NOT NULL CHECK (frequency_tier IN ('daily','weekly','biweekly','monthly','quarterly','semiannual')),
  data_source TEXT NOT NULL,
  description_pt TEXT,
  max_stale_hours INTEGER NOT NULL DEFAULT 168,
  depends_on TEXT[],
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sync_job_registry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON public.sync_job_registry FOR ALL USING (true);

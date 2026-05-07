
CREATE TABLE public.zap_backups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  snapshot jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_records integer NOT NULL DEFAULT 0
);

ALTER TABLE public.zap_backups ENABLE ROW LEVEL SECURITY;
-- No public SELECT policy: only service_role can read/write

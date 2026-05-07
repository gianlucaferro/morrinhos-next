
-- Create admin_sessions table for server-side session management
CREATE TABLE IF NOT EXISTS public.admin_sessions (
  id text PRIMARY KEY DEFAULT 'singleton',
  token_hash text NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS - no public access at all
ALTER TABLE public.admin_sessions ENABLE ROW LEVEL SECURITY;
-- No policies = no public access, only service_role can read/write

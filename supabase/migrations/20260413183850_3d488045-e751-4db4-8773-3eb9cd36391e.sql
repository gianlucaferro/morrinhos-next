
-- 1. Fix classificados: restrict UPDATE and DELETE to owner only
DROP POLICY IF EXISTS "Update classificados" ON classificados;
CREATE POLICY "Owner can update classificados"
ON classificados FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Delete classificados" ON classificados;
CREATE POLICY "Owner can delete classificados"
ON classificados FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- 2. Fix anuncios: replace permissive ALL policy with service_role only
DROP POLICY IF EXISTS "Service write anuncios" ON anuncios;
CREATE POLICY "Service role write anuncios"
ON anuncios FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 3. Fix farmacia_fotos: replace permissive ALL policy with service_role only
DROP POLICY IF EXISTS "Service write farmacia fotos" ON farmacia_fotos;
CREATE POLICY "Service role write farmacia fotos"
ON farmacia_fotos FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 4. Fix v_sync_dashboard: change from SECURITY DEFINER to SECURITY INVOKER
CREATE OR REPLACE VIEW v_sync_dashboard WITH (security_invoker = true) AS
WITH latest_runs AS (
  SELECT DISTINCT ON (tipo) tipo,
    status AS last_status,
    detalhes AS last_detalhes,
    started_at AS last_started_at,
    finished_at AS last_finished_at,
    EXTRACT(epoch FROM (COALESCE(finished_at, now()) - started_at)) AS duration_seconds
  FROM sync_log
  ORDER BY tipo, started_at DESC
), recent_stats AS (
  SELECT tipo,
    count(*) FILTER (WHERE status = 'error') AS errors_7d,
    count(*) FILTER (WHERE status = 'partial') AS partials_7d,
    count(*) AS runs_7d
  FROM sync_log
  WHERE started_at >= (now() - '7 days'::interval)
  GROUP BY tipo
)
SELECT r.function_name,
  r.frequency_tier,
  r.data_source,
  r.description_pt,
  r.cron_expression,
  r.max_stale_hours,
  r.is_active,
  lr.last_status,
  lr.last_started_at,
  lr.last_finished_at,
  lr.duration_seconds,
  COALESCE(rs.errors_7d, 0::bigint) AS errors_7d,
  COALESCE(rs.partials_7d, 0::bigint) AS partials_7d,
  COALESCE(rs.runs_7d, 0::bigint) AS runs_7d,
  CASE
    WHEN lr.last_started_at IS NULL THEN 'never_run'
    WHEN lr.last_status = 'running' AND lr.last_started_at < (now() - '00:30:00'::interval) THEN 'stuck'
    WHEN lr.last_status = 'error' THEN 'failing'
    WHEN (EXTRACT(epoch FROM (now() - lr.last_started_at)) / 3600::numeric) > r.max_stale_hours::numeric THEN 'stale'
    WHEN lr.last_status = 'partial' THEN 'degraded'
    ELSE 'healthy'
  END AS health_status
FROM sync_job_registry r
LEFT JOIN latest_runs lr ON (lr.tipo = r.function_name OR lr.tipo = replace(r.function_name, 'sync-', ''))
LEFT JOIN recent_stats rs ON rs.tipo = COALESCE(lr.tipo, r.function_name)
WHERE r.is_active = true
ORDER BY
  CASE
    WHEN lr.last_status = 'error' THEN 0
    WHEN lr.last_started_at IS NULL THEN 1
    WHEN (EXTRACT(epoch FROM (now() - lr.last_started_at)) / 3600::numeric) > r.max_stale_hours::numeric THEN 2
    ELSE 3
  END, r.function_name;

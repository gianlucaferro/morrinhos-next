-- Cron job para sincronizar servidores da Câmara Municipal (dias 5 e 15 de cada mês)
SELECT cron.schedule(
  'sync-camara-servidores',
  '0 8 5,15 * *',
  $$
  SELECT net.http_post(
    url:='https://uulpqmylqnonbxozdbtb.supabase.co/functions/v1/sync-camara-servidores',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1bHBxbXlscW5vbmJ4b3pkYnRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNTEyMTAsImV4cCI6MjA4NzgyNzIxMH0.tiFCRP0Lpbc0Rd9St92VhHmjxi2DK0M7ZO_1qayC_l8"}'::jsonb,
    body:='{}'::jsonb
  ) AS request_id;
  $$
);
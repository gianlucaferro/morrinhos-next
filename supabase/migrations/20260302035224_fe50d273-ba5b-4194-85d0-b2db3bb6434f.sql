-- Cron job para sincronizar servidores da Câmara Municipal (dias 5 e 15 de cada mês)
SELECT cron.schedule(
  'sync-camara-servidores',
  '0 8 5,15 * *',
  $$
  SELECT net.http_post(
    url:='https://pgqztmtimakiikcsvfph.supabase.co/functions/v1/sync-camara-servidores',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBncXp0bXRpbWFraWlrY3N2ZnBoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyMDE3NTEsImV4cCI6MjA5Mzc3Nzc1MX0.7EPa5iAoAXBacIjsazHqswF2RNgOlirIlkkhuHFFzlw"}'::jsonb,
    body:='{}'::jsonb
  ) AS request_id;
  $$
);
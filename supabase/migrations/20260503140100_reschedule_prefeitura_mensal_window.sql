-- Reagendar sync-prefeitura-mensal para rodar 2x/mes nos dias 3 e 6
-- (06:30 UTC = 03:30 BRT). Decisao do usuario substitui a janela 5-25
-- proposta no roteiro Codex original.
--
-- Centi normalmente publica a folha do mes anterior no inicio do mes;
-- dias 3 e 6 cobrem o caso comum + retry caso a publicacao atrase.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sync-prefeitura-mensal-bw') THEN
    PERFORM cron.unschedule('sync-prefeitura-mensal-bw');
  END IF;

  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sync-prefeitura-mensal-window') THEN
    PERFORM cron.unschedule('sync-prefeitura-mensal-window');
  END IF;

  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sync-prefeitura-mensal-3e6') THEN
    PERFORM cron.unschedule('sync-prefeitura-mensal-3e6');
  END IF;
END $$;

SELECT cron.schedule(
  'sync-prefeitura-mensal-3e6',
  '30 6 3,6 * *',
  $$SELECT public.invoke_edge_function('sync-prefeitura-mensal');$$
);

UPDATE public.sync_job_registry
SET
  cron_name = 'sync-prefeitura-mensal-3e6',
  cron_expression = '30 6 3,6 * *',
  frequency_tier = 'monthly',
  max_stale_hours = 744,
  description_pt = 'Servidores e folha da Prefeitura; roda 2x/mes (dias 3 e 6 as 03:30 BRT) para capturar a competencia do mes anterior publicada no Centi'
WHERE function_name = 'sync-prefeitura-mensal';

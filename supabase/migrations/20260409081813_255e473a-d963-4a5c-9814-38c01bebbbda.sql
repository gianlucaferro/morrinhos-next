SELECT cron.unschedule('sync-saude-indicadores-quarterly');

SELECT cron.schedule('sync-saude-indicadores-weekly', '15 5 * * 2', $$SELECT public.invoke_edge_function('sync-saude-indicadores');$$);

UPDATE sync_job_registry SET cron_name = 'sync-saude-indicadores-weekly', cron_expression = '15 5 * * 2', frequency_tier = 'weekly', max_stale_hours = 192 WHERE function_name = 'sync-saude-indicadores';
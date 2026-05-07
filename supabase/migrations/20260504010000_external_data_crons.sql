-- Cadenciamento dos 11 novos crons de dados externos
-- Cadencias calibradas para Hobby tier do FireCrawl (3000 credits/mes)
-- Estrategia C: dedup contra banco antes de scrape -> consumo ~150 credits/mes em steady state

DO $$
DECLARE jobs text[] := ARRAY[
  'sync-tcm-go-morrinhos-weekly',
  'sync-camara-atas-pdf-weekly',
  'sync-tjgo-processos-weekly',
  'sync-mpgo-atuacao-weekly',
  'sync-conab-precos-weekly',
  'sync-detran-go-monthly',
  'sync-cnj-datajud-weekly',
  'sync-inmet-clima-daily',
  'sync-inep-escolas-yearly',
  'sync-pncp-licitacoes-daily',
  'sync-tse-eleicoes-yearly'
];
DECLARE j text;
BEGIN
  FOREACH j IN ARRAY jobs
  LOOP
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = j) THEN
      PERFORM cron.unschedule(j);
    END IF;
  END LOOP;
END $$;

-- Semanais (4x/mes)
SELECT cron.schedule('sync-tcm-go-morrinhos-weekly', '0 7 * * 2',
  $$SELECT public.invoke_edge_function('sync-tcm-go-morrinhos');$$);
SELECT cron.schedule('sync-camara-atas-pdf-weekly', '15 7 * * 2',
  $$SELECT public.invoke_edge_function('sync-camara-atas-pdf');$$);
SELECT cron.schedule('sync-tjgo-processos-weekly', '30 7 * * 2',
  $$SELECT public.invoke_edge_function('sync-tjgo-processos');$$);
SELECT cron.schedule('sync-mpgo-atuacao-weekly', '45 7 * * 2',
  $$SELECT public.invoke_edge_function('sync-mpgo-atuacao');$$);
SELECT cron.schedule('sync-conab-precos-weekly', '0 8 * * 2',
  $$SELECT public.invoke_edge_function('sync-conab-precos');$$);
SELECT cron.schedule('sync-cnj-datajud-weekly', '15 8 * * 2',
  $$SELECT public.invoke_edge_function('sync-cnj-datajud');$$);

-- Mensal
SELECT cron.schedule('sync-detran-go-monthly', '0 9 1 * *',
  $$SELECT public.invoke_edge_function('sync-detran-go');$$);

-- Diarios (alta utilidade — clima, licitacoes federais novas)
SELECT cron.schedule('sync-inmet-clima-daily', '0 10 * * *',
  $$SELECT public.invoke_edge_function('sync-inmet-clima');$$);
SELECT cron.schedule('sync-pncp-licitacoes-daily', '15 10 * * *',
  $$SELECT public.invoke_edge_function('sync-pncp-licitacoes');$$);

-- Anual (Censo Escolar publica em julho-agosto)
SELECT cron.schedule('sync-inep-escolas-yearly', '0 12 15 8 *',
  $$SELECT public.invoke_edge_function('sync-inep-escolas');$$);
SELECT cron.schedule('sync-tse-eleicoes-yearly', '0 12 1 12 *',
  $$SELECT public.invoke_edge_function('sync-tse-eleicoes');$$);

-- Atualizar sync_job_registry
INSERT INTO public.sync_job_registry (function_name, cron_name, cron_expression, frequency_tier, max_stale_hours, description_pt) VALUES
  ('sync-tcm-go-morrinhos', 'sync-tcm-go-morrinhos-weekly', '0 7 * * 2', 'weekly', 168, 'TCM-GO: apontamentos e sancoes (FireCrawl)'),
  ('sync-camara-atas-pdf', 'sync-camara-atas-pdf-weekly', '15 7 * * 2', 'weekly', 168, 'Texto extraido das atas PDF da Camara (FireCrawl)'),
  ('sync-tjgo-processos', 'sync-tjgo-processos-weekly', '30 7 * * 2', 'weekly', 168, 'TJ-GO: processos envolvendo Morrinhos (FireCrawl)'),
  ('sync-mpgo-atuacao', 'sync-mpgo-atuacao-weekly', '45 7 * * 2', 'weekly', 168, 'MP-GO: recomendacoes e acoes (FireCrawl)'),
  ('sync-conab-precos', 'sync-conab-precos-weekly', '0 8 * * 2', 'weekly', 168, 'CONAB precos agricolas (FireCrawl)'),
  ('sync-cnj-datajud', 'sync-cnj-datajud-weekly', '15 8 * * 2', 'weekly', 168, 'CNJ DataJud: processos (API REST)'),
  ('sync-detran-go', 'sync-detran-go-monthly', '0 9 1 * *', 'monthly', 720, 'DETRAN-GO: sinistros e infracoes (FireCrawl)'),
  ('sync-inmet-clima', 'sync-inmet-clima-daily', '0 10 * * *', 'daily', 48, 'INMET clima diario (API REST)'),
  ('sync-pncp-licitacoes', 'sync-pncp-licitacoes-daily', '15 10 * * *', 'daily', 48, 'PNCP licitacoes federais (API REST)'),
  ('sync-inep-escolas', 'sync-inep-escolas-yearly', '0 12 15 8 *', 'yearly', 8760, 'INEP Censo Escolar por escola (API)'),
  ('sync-tse-eleicoes', 'sync-tse-eleicoes-yearly', '0 12 1 12 *', 'yearly', 8760, 'TSE candidatos e doadores (API CKAN)')
ON CONFLICT (function_name) DO UPDATE SET
  cron_name = EXCLUDED.cron_name,
  cron_expression = EXCLUDED.cron_expression,
  frequency_tier = EXCLUDED.frequency_tier,
  max_stale_hours = EXCLUDED.max_stale_hours,
  description_pt = EXCLUDED.description_pt;

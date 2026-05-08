-- =============================================================================
-- SYNC CRON ORCHESTRATION
-- Configura cron jobs para todas as 43 funções de sincronização + 3 utilitárias
-- Todas as horas em UTC (Morrinhos = UTC-3)
-- =============================================================================

-- 1. Helper function para invocar Edge Functions via pg_net
CREATE OR REPLACE FUNCTION public.invoke_edge_function(function_name TEXT)
RETURNS BIGINT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT net.http_post(
    url := 'https://pgqztmtimakiikcsvfph.supabase.co/functions/v1/' || function_name,
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBncXp0bXRpbWFraWlrY3N2ZnBoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyMDE3NTEsImV4cCI6MjA5Mzc3Nzc1MX0.7EPa5iAoAXBacIjsazHqswF2RNgOlirIlkkhuHFFzlw"}'::jsonb,
    body := '{}'::jsonb
  );
$$;

-- 2. Tabela de registro de jobs
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

-- 3. Remover cron jobs existentes (limpar antes de recriar)
SELECT cron.unschedule(jobname) FROM cron.job WHERE jobname LIKE 'sync-%' OR jobname LIKE 'fetch-%' OR jobname LIKE 'send-%';

-- =============================================================================
-- 4. REGISTRAR TODOS OS CRON JOBS
-- =============================================================================

-- ===================== WEEKLY (Terça após sessões de segunda) =====================
-- Câmara: sessões são segunda-feira; dados aparecem terça

SELECT cron.schedule('sync-vereadores-weekly',      '0  3 * * 2', $$SELECT public.invoke_edge_function('sync-vereadores');$$);
SELECT cron.schedule('sync-projetos-weekly',         '10 3 * * 2', $$SELECT public.invoke_edge_function('sync-projetos');$$);
SELECT cron.schedule('sync-atuacao-weekly',          '20 3 * * 2', $$SELECT public.invoke_edge_function('sync-atuacao');$$);
SELECT cron.schedule('sync-votacoes-weekly',         '30 3 * * 2', $$SELECT public.invoke_edge_function('sync-votacoes');$$);
SELECT cron.schedule('sync-presenca-sessoes-weekly', '40 3 * * 2', $$SELECT public.invoke_edge_function('sync-presenca-sessoes');$$);
SELECT cron.schedule('sync-presenca-atas-weekly',    '50 3 * * 2', $$SELECT public.invoke_edge_function('sync-presenca-atas');$$);
SELECT cron.schedule('sync-presenca-centi-weekly',   '0  4 * * 2', $$SELECT public.invoke_edge_function('sync-presenca-centi');$$);
SELECT cron.schedule('sync-camara-atos-weekly',      '10 4 * * 2', $$SELECT public.invoke_edge_function('sync-camara-atos');$$);
SELECT cron.schedule('sync-camara-financeiro-weekly', '20 4 * * 2', $$SELECT public.invoke_edge_function('sync-camara-financeiro');$$);
SELECT cron.schedule('sync-decretos-weekly',         '30 4 * * 2', $$SELECT public.invoke_edge_function('sync-decretos');$$);
SELECT cron.schedule('sync-portarias-weekly',        '40 4 * * 2', $$SELECT public.invoke_edge_function('sync-portarias');$$);
-- Contratos: 3x/semana (segunda, quarta e sexta) para cobertura máxima
SELECT cron.schedule('sync-contratos-aditivos-mon',  '50 4 * * 1', $$SELECT public.invoke_edge_function('sync-contratos-aditivos');$$);
SELECT cron.schedule('sync-contratos-aditivos-wed',  '50 4 * * 3', $$SELECT public.invoke_edge_function('sync-contratos-aditivos');$$);
SELECT cron.schedule('sync-contratos-aditivos-fri',  '50 4 * * 5', $$SELECT public.invoke_edge_function('sync-contratos-aditivos');$$);
SELECT cron.schedule('sync-prefeitura-diaria-mon',   '0  5 * * 1', $$SELECT public.invoke_edge_function('sync-prefeitura-diaria');$$);
SELECT cron.schedule('sync-prefeitura-diaria-wed',   '0  5 * * 3', $$SELECT public.invoke_edge_function('sync-prefeitura-diaria');$$);
SELECT cron.schedule('sync-prefeitura-diaria-fri',   '0  5 * * 5', $$SELECT public.invoke_edge_function('sync-prefeitura-diaria');$$);
-- Domingo: legislação e lei orgânica
SELECT cron.schedule('sync-leis-municipais-weekly',  '30 4 * * 0', $$SELECT public.invoke_edge_function('sync-leis-municipais');$$);
SELECT cron.schedule('sync-lei-organica-weekly',     '10 5 * * 0', $$SELECT public.invoke_edge_function('sync-lei-organica');$$);
SELECT cron.schedule('sync-frota-veiculos-weekly',   '0  5 * * 1', $$SELECT public.invoke_edge_function('sync-frota-veiculos');$$);

-- ===================== BIWEEKLY (dia 5 e 20 - folha de pagamento) =====================

SELECT cron.schedule('sync-camara-servidores-bw',     '0  6 5,20 * *', $$SELECT public.invoke_edge_function('sync-camara-servidores');$$);
SELECT cron.schedule('sync-remuneracao-vereadores-bw','15 6 5,20 * *', $$SELECT public.invoke_edge_function('sync-remuneracao-vereadores');$$);
SELECT cron.schedule('sync-prefeitura-mensal-bw',     '30 6 5,20 * *', $$SELECT public.invoke_edge_function('sync-prefeitura-mensal');$$);
SELECT cron.schedule('sync-executivo-secretarias-bw', '45 6 5,20 * *', $$SELECT public.invoke_edge_function('sync-executivo-secretarias');$$);

-- ===================== MONTHLY (dia 1 e 15) =====================

-- Dia 1: despesas, diárias, obras, fornecedores
SELECT cron.schedule('sync-despesas-monthly',        '0  3 1 * *', $$SELECT public.invoke_edge_function('sync-despesas');$$);
SELECT cron.schedule('sync-diarias-monthly',         '10 3 1 * *', $$SELECT public.invoke_edge_function('sync-diarias');$$);
SELECT cron.schedule('sync-obras-monthly',           '20 3 1 * *', $$SELECT public.invoke_edge_function('sync-obras');$$);
SELECT cron.schedule('sync-fornecedores-cnpj-monthly','0 7 1 * *', $$SELECT public.invoke_edge_function('sync-fornecedores-cnpj');$$);

-- Dia 15: dados federais
SELECT cron.schedule('sync-beneficios-sociais-biweekly', '0  3 5,20 * *', $$SELECT public.invoke_edge_function('sync-beneficios-sociais');$$);
SELECT cron.schedule('sync-transferencias-monthly',     '15 3 15 * *', $$SELECT public.invoke_edge_function('sync-transferencias-federais');$$);
SELECT cron.schedule('sync-pe-de-meia-monthly',         '30 3 15 * *', $$SELECT public.invoke_edge_function('sync-pe-de-meia');$$);
SELECT cron.schedule('sync-arrecadacao-monthly',        '45 3 15 * *', $$SELECT public.invoke_edge_function('sync-arrecadacao');$$);
SELECT cron.schedule('sync-contas-publicas-monthly',    '0  4 15 * *', $$SELECT public.invoke_edge_function('sync-contas-publicas');$$);
SELECT cron.schedule('sync-arrecadacao-comp-monthly',   '15 4 15 * *', $$SELECT public.invoke_edge_function('sync-arrecadacao-comparativo');$$);

-- ===================== QUARTERLY (Jan, Abr, Jul, Out - dia 1) =====================

SELECT cron.schedule('sync-emendas-quarterly',         '0  5 1 1,4,7,10 *',  $$SELECT public.invoke_edge_function('sync-emendas');$$);
SELECT cron.schedule('sync-saude-indicadores-weekly','15 5 * * 2',  $$SELECT public.invoke_edge_function('sync-saude-indicadores');$$);
SELECT cron.schedule('sync-saude-srag-quarterly',      '30 5 1 1,4,7,10 *',  $$SELECT public.invoke_edge_function('sync-saude-srag');$$);
SELECT cron.schedule('sync-saude-hiv-quarterly',       '45 5 1 1,4,7,10 *',  $$SELECT public.invoke_edge_function('sync-saude-hiv');$$);
SELECT cron.schedule('sync-saude-hiv-casos-quarterly', '0  6 1 1,4,7,10 *',  $$SELECT public.invoke_edge_function('sync-saude-hiv-casos');$$);
SELECT cron.schedule('sync-saude-sesgo-quarterly',     '15 6 1 1,4,7,10 *',  $$SELECT public.invoke_edge_function('sync-saude-sesgo');$$);
SELECT cron.schedule('sync-mortalidade-quarterly',     '30 6 1 1,4,7,10 *',  $$SELECT public.invoke_edge_function('sync-mortalidade');$$);
SELECT cron.schedule('sync-seguranca-quarterly',       '45 6 1 1,4,7,10 *',  $$SELECT public.invoke_edge_function('sync-seguranca');$$);
SELECT cron.schedule('sync-cde-subsidios-quarterly',   '0  7 1 1,4,7,10 *',  $$SELECT public.invoke_edge_function('sync-cde-subsidios');$$);

-- ===================== SEMIANNUAL (Jan, Jul - dia 1) =====================

SELECT cron.schedule('sync-agro-quarterly',            '0  5 1 1,4,7,10 *', $$SELECT public.invoke_edge_function('sync-agro');$$);
SELECT cron.schedule('sync-educacao-semiannual',       '15 5 1 1,7 *', $$SELECT public.invoke_edge_function('sync-educacao');$$);
SELECT cron.schedule('sync-indicadores-home-semiannual','30 5 1 1,7 *', $$SELECT public.invoke_edge_function('sync-indicadores-home');$$);
SELECT cron.schedule('sync-saude-estab-semiannual',    '45 5 1 1,7 *', $$SELECT public.invoke_edge_function('sync-saude-estabelecimentos');$$);

-- ===================== DAILY (utilitários) =====================

SELECT cron.schedule('fetch-noticias-daily',     '0  12 * * *', $$SELECT public.invoke_edge_function('fetch-noticias');$$);
SELECT cron.schedule('send-weekly-digest-mon',   '0  13 * * 1', $$SELECT public.invoke_edge_function('send-weekly-digest');$$);
SELECT cron.schedule('sync-health-check-daily',  '0  10 * * *', $$SELECT public.invoke_edge_function('sync-health-check');$$);

-- =============================================================================
-- 5. POPULAR sync_job_registry
-- =============================================================================

INSERT INTO public.sync_job_registry (function_name, cron_name, cron_expression, frequency_tier, data_source, description_pt, max_stale_hours, depends_on) VALUES
-- Weekly
('sync-vereadores',       'sync-vereadores-weekly',       '0  3 * * 2', 'weekly', 'Câmara WP API',     'Lista de vereadores e dados pessoais', 192, NULL),
('sync-projetos',         'sync-projetos-weekly',         '10 3 * * 2', 'weekly', 'Câmara WP API',     'Projetos de lei', 192, ARRAY['sync-vereadores']),
('sync-atuacao',          'sync-atuacao-weekly',          '20 3 * * 2', 'weekly', 'Câmara WP API',     'Indicações, requerimentos', 192, ARRAY['sync-vereadores']),
('sync-votacoes',         'sync-votacoes-weekly',         '30 3 * * 2', 'weekly', 'Câmara scrape',     'Resultados de votações', 192, NULL),
('sync-presenca-sessoes', 'sync-presenca-sessoes-weekly', '40 3 * * 2', 'weekly', 'Câmara WP API',     'Presença em sessões', 192, ARRAY['sync-vereadores']),
('sync-presenca-atas',    'sync-presenca-atas-weekly',    '50 3 * * 2', 'weekly', 'Câmara WP API',     'Atas de sessões', 192, NULL),
('sync-presenca-centi',   'sync-presenca-centi-weekly',   '0  4 * * 2', 'weekly', 'Centi (Câmara)',    'Atas via portal Centi', 192, NULL),
('sync-camara-atos',      'sync-camara-atos-weekly',      '10 4 * * 2', 'weekly', 'Centi (Câmara)',    'Atos administrativos (leis, resoluções)', 192, NULL),
('sync-camara-financeiro','sync-camara-financeiro-weekly', '20 4 * * 2', 'weekly', 'Centi (Câmara)',    'Dados financeiros da Câmara', 192, NULL),
('sync-decretos',         'sync-decretos-weekly',         '30 4 * * 2', 'weekly', 'Prefeitura Centi',  'Decretos municipais', 192, NULL),
('sync-portarias',        'sync-portarias-weekly',        '40 4 * * 2', 'weekly', 'Prefeitura Centi',  'Portarias municipais', 192, NULL),
('sync-contratos-aditivos','sync-contratos-aditivos-tue', '50 4 * * 2', 'weekly', 'Prefeitura + Câmara Centi', 'Contratos e aditivos (terça)', 192, NULL),
('sync-prefeitura-diaria','sync-prefeitura-diaria-weekly','0  5 * * 2', 'weekly', 'Prefeitura Centi',  'Contratos, licitações, servidores (terça)', 192, NULL),
('sync-leis-municipais',  'sync-leis-municipais-weekly',  '30 4 * * 0', 'weekly', 'Prefeitura WP API', 'Leis municipais aprovadas', 192, NULL),
('sync-lei-organica',     'sync-lei-organica-weekly',     '10 5 * * 0', 'weekly', 'Centi (Câmara)',    'Lei Orgânica do Município', 192, NULL),
('sync-frota-veiculos',   'sync-frota-veiculos-weekly',   '0  5 * * 1', 'weekly', 'Prefeitura Centi',  'Frota de veículos municipais', 192, NULL),
-- Biweekly
('sync-camara-servidores',     'sync-camara-servidores-bw',      '0  6 5,20 * *', 'biweekly', 'Centi (Câmara)',    'Servidores e folha da Câmara', 384, NULL),
('sync-remuneracao-vereadores','sync-remuneracao-vereadores-bw', '15 6 5,20 * *', 'biweekly', 'Centi (Câmara)',    'Remuneração detalhada dos vereadores', 384, NULL),
('sync-prefeitura-mensal',     'sync-prefeitura-mensal-bw',      '30 6 5,20 * *', 'biweekly', 'Prefeitura Centi',  'Servidores e folha da Prefeitura', 384, NULL),
('sync-executivo-secretarias', 'sync-executivo-secretarias-bw',  '45 6 5,20 * *', 'biweekly', 'Prefeitura WP',     'Secretarias e responsáveis', 384, NULL),
-- Monthly
('sync-despesas',              'sync-despesas-monthly',           '0  3 1 * *',  'monthly', 'Prefeitura Centi',     'Despesas públicas', 768, NULL),
('sync-diarias',               'sync-diarias-monthly',            '10 3 1 * *',  'monthly', 'Prefeitura Centi',     'Diárias e viagens', 768, NULL),
('sync-obras',                 'sync-obras-monthly',              '20 3 1 * *',  'monthly', 'Prefeitura Centi',     'Obras públicas', 768, NULL),
('sync-fornecedores-cnpj',     'sync-fornecedores-cnpj-monthly', '0  7 1 * *',  'monthly', 'BrasilAPI CNPJ',       'Dados CNPJ de fornecedores', 768, NULL),
('sync-beneficios-sociais',    'sync-beneficios-sociais-biweekly', '0  3 5,20 * *', 'biweekly', 'Portal Transparência', 'Bolsa Família e benefícios', 384, NULL),
('sync-transferencias-federais','sync-transferencias-monthly',    '15 3 15 * *', 'monthly', 'Portal Transparência', 'Transferências federais', 768, NULL),
('sync-pe-de-meia',            'sync-pe-de-meia-monthly',         '30 3 15 * *', 'monthly', 'Portal Transparência', 'Programa Pé-de-Meia', 768, NULL),
('sync-arrecadacao',           'sync-arrecadacao-monthly',        '45 3 15 * *', 'monthly', 'SICONFI',              'Arrecadação municipal', 768, NULL),
('sync-contas-publicas',       'sync-contas-publicas-monthly',    '0  4 15 * *', 'monthly', 'SICONFI',              'Contas públicas (DCA)', 768, NULL),
('sync-arrecadacao-comparativo','sync-arrecadacao-comp-monthly',  '15 4 15 * *', 'monthly', 'SICONFI',              'Comparativo de arrecadação', 768, NULL),
-- Quarterly
('sync-emendas',            'sync-emendas-quarterly',           '0  5 1 1,4,7,10 *',  'quarterly', 'CKAN Goiás',         'Emendas parlamentares', 2232, NULL),
('sync-saude-indicadores',  'sync-saude-indicadores-weekly', '15 5 * * 2',  'weekly', 'InfoDengue API',     'Indicadores de saúde (dengue)', 192, NULL),
('sync-saude-srag',         'sync-saude-srag-quarterly',        '30 5 1 1,4,7,10 *',  'quarterly', 'CKAN Goiás',         'Dados SRAG respiratório', 2232, NULL),
('sync-saude-hiv',          'sync-saude-hiv-quarterly',         '45 5 1 1,4,7,10 *',  'quarterly', 'CKAN Goiás',         'Indicadores HIV', 2232, NULL),
('sync-saude-hiv-casos',    'sync-saude-hiv-casos-quarterly',   '0  6 1 1,4,7,10 *',  'quarterly', 'CKAN Goiás',         'Casos HIV detalhados', 2232, NULL),
('sync-saude-sesgo',        'sync-saude-sesgo-quarterly',       '15 6 1 1,4,7,10 *',  'quarterly', 'CKAN Goiás',         'Dados SES-GO', 2232, NULL),
('sync-mortalidade',        'sync-mortalidade-quarterly',       '30 6 1 1,4,7,10 *',  'quarterly', 'CKAN Goiás',         'Dados de mortalidade', 2232, NULL),
('sync-seguranca',          'sync-seguranca-quarterly',         '45 6 1 1,4,7,10 *',  'quarterly', 'SSP-GO / SINESP',    'Estatísticas de segurança', 2232, NULL),
('sync-cde-subsidios',      'sync-cde-subsidios-quarterly',     '0  7 1 1,4,7,10 *',  'quarterly', 'ANEEL CKAN',         'Subsídios CDE energia', 2232, NULL),
-- Semiannual
('sync-agro',                  'sync-agro-quarterly',             '0  5 1 1,4,7,10 *', 'quarterly', 'IBGE SIDRA',   'Indicadores agropecuários', 2232, NULL),
('sync-educacao',              'sync-educacao-semiannual',         '15 5 1 1,7 *', 'semiannual', 'QEdu / INEP',  'Educação, IDEB, escolas', 4464, NULL),
('sync-indicadores-home',      'sync-indicadores-home-semiannual','30 5 1 1,7 *', 'semiannual', 'IBGE',         'Indicadores da homepage (pop, PIB, IDHM)', 4464, NULL),
('sync-saude-estabelecimentos','sync-saude-estab-semiannual',     '45 5 1 1,7 *', 'semiannual', 'CNES DATASUS', 'Estabelecimentos de saúde', 4464, NULL)
ON CONFLICT (function_name) DO UPDATE SET
  cron_expression = EXCLUDED.cron_expression,
  frequency_tier = EXCLUDED.frequency_tier,
  max_stale_hours = EXCLUDED.max_stale_hours;

-- =============================================================================
-- 6. VIEW: Dashboard de saúde dos syncs
-- =============================================================================

CREATE OR REPLACE VIEW public.v_sync_dashboard AS
WITH latest_runs AS (
  SELECT DISTINCT ON (tipo)
    tipo,
    status AS last_status,
    detalhes AS last_detalhes,
    started_at AS last_started_at,
    finished_at AS last_finished_at,
    EXTRACT(EPOCH FROM (COALESCE(finished_at, now()) - started_at)) AS duration_seconds
  FROM public.sync_log
  ORDER BY tipo, started_at DESC
),
recent_stats AS (
  SELECT tipo,
    COUNT(*) FILTER (WHERE status = 'error') AS errors_7d,
    COUNT(*) FILTER (WHERE status = 'partial') AS partials_7d,
    COUNT(*) AS runs_7d
  FROM public.sync_log
  WHERE started_at >= now() - INTERVAL '7 days'
  GROUP BY tipo
)
SELECT
  r.function_name,
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
  COALESCE(rs.errors_7d, 0) AS errors_7d,
  COALESCE(rs.partials_7d, 0) AS partials_7d,
  COALESCE(rs.runs_7d, 0) AS runs_7d,
  CASE
    WHEN lr.last_started_at IS NULL THEN 'never_run'
    WHEN lr.last_status = 'running' AND lr.last_started_at < now() - INTERVAL '30 minutes' THEN 'stuck'
    WHEN lr.last_status = 'error' THEN 'failing'
    WHEN EXTRACT(EPOCH FROM (now() - lr.last_started_at)) / 3600 > r.max_stale_hours THEN 'stale'
    WHEN lr.last_status = 'partial' THEN 'degraded'
    ELSE 'healthy'
  END AS health_status
FROM public.sync_job_registry r
LEFT JOIN latest_runs lr ON lr.tipo = r.function_name
  OR lr.tipo = REPLACE(r.function_name, 'sync-', '')
LEFT JOIN recent_stats rs ON rs.tipo = COALESCE(lr.tipo, r.function_name)
WHERE r.is_active = true
ORDER BY
  CASE
    WHEN lr.last_status = 'error' THEN 0
    WHEN lr.last_started_at IS NULL THEN 1
    WHEN EXTRACT(EPOCH FROM (now() - lr.last_started_at)) / 3600 > r.max_stale_hours THEN 2
    ELSE 3
  END,
  r.function_name;

-- =============================================================================
-- 7. Função de retry automático
-- =============================================================================

CREATE OR REPLACE FUNCTION public.retry_failed_syncs(max_retries INTEGER DEFAULT 3)
RETURNS TABLE(function_name TEXT, retry_triggered BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT d.function_name
    FROM v_sync_dashboard d
    WHERE d.health_status IN ('failing', 'stuck', 'stale')
    AND d.is_active = true
    AND COALESCE(d.errors_7d, 0) < max_retries
  LOOP
    PERFORM public.invoke_edge_function(rec.function_name);
    function_name := rec.function_name;
    retry_triggered := true;
    RETURN NEXT;
  END LOOP;
END;
$$;

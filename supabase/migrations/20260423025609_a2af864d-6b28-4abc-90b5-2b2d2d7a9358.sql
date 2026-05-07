
-- Tornar anúncios do Compra e Venda MHS por tempo indeterminado
-- Remove a expiração automática de 30 dias

-- 1. Remover o default de 30 dias da coluna expira_em
ALTER TABLE public.classificados ALTER COLUMN expira_em DROP DEFAULT;

-- 2. Limpar valores existentes (todos os anúncios passam a não ter expiração)
UPDATE public.classificados SET expira_em = NULL WHERE expira_em IS NOT NULL;

-- 3. Reativar anúncios que estavam marcados como expirado
UPDATE public.classificados SET status = 'ativo' WHERE status = 'expirado';

-- 4. Desagendar o cron job de notificação de expiração, se existir
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(jobid)
    FROM cron.job
    WHERE jobname ILIKE '%notify-expiring%' OR command ILIKE '%notify-expiring-ads%';
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- Ignorar erros de permissão
  NULL;
END $$;

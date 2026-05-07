
-- Restringir políticas de escrita para usar apenas service_role
-- Remover políticas permissivas e substituir por políticas restritas

DROP POLICY "Service pode inserir vereadores" ON public.vereadores;
DROP POLICY "Service pode atualizar vereadores" ON public.vereadores;
DROP POLICY "Service pode inserir projetos" ON public.projetos;
DROP POLICY "Service pode atualizar projetos" ON public.projetos;
DROP POLICY "Service pode inserir votacoes" ON public.votacoes;
DROP POLICY "Service pode inserir remuneracao" ON public.remuneracao_mensal;
DROP POLICY "Service pode atualizar remuneracao" ON public.remuneracao_mensal;
DROP POLICY "Service pode inserir sync_log" ON public.sync_log;
DROP POLICY "Service pode atualizar sync_log" ON public.sync_log;
DROP POLICY "Service pode inserir subscriptions" ON public.subscriptions;
DROP POLICY "Service pode gerenciar sub_vereadores" ON public.subscription_vereadores;
DROP POLICY "Service pode inserir digest_log" ON public.email_digest_log;

-- As edge functions usam service_role key que bypassa RLS automaticamente.
-- Não precisamos de políticas de INSERT/UPDATE para anon role.
-- Apenas leitura pública é necessária (já configurada).

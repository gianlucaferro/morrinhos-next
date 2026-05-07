
-- Add unique constraint for session+vereador to enable upserts
ALTER TABLE public.presenca_sessoes 
DROP CONSTRAINT IF EXISTS presenca_sessoes_sessao_vereador_unique;

ALTER TABLE public.presenca_sessoes 
ADD CONSTRAINT presenca_sessoes_sessao_vereador_unique 
UNIQUE (sessao_titulo, vereador_nome);

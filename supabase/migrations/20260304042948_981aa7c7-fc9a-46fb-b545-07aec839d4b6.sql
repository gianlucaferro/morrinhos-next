-- Add unique constraint for presenca_sessoes upsert
ALTER TABLE public.presenca_sessoes
ADD CONSTRAINT presenca_sessoes_sessao_vereador_unique
UNIQUE (sessao_titulo, vereador_nome);
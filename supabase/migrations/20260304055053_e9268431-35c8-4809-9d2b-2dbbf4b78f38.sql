-- Add unique constraint for upsert on sessao_titulo + vereador_nome
ALTER TABLE public.presenca_sessoes
ADD CONSTRAINT presenca_sessoes_titulo_vereador_unique UNIQUE (sessao_titulo, vereador_nome);

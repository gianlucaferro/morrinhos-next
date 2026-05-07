-- Add unique constraint on servidores.nome to enable fast batch upsert
ALTER TABLE public.servidores ADD CONSTRAINT servidores_nome_unique UNIQUE (nome);
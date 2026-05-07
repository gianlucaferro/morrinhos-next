
-- Add unique constraint on descricao for upsert
ALTER TABLE public.lei_organica ADD CONSTRAINT lei_organica_descricao_unique UNIQUE (descricao);

-- Drop incorrect unique constraint and add correct one
ALTER TABLE public.presenca_sessoes
DROP CONSTRAINT IF EXISTS presenca_sessoes_sessao_vereador_unique;

-- Add unique constraint matching the edge function upsert
ALTER TABLE public.presenca_sessoes
ADD CONSTRAINT presenca_sessoes_wp_vereador_unique
UNIQUE (wp_post_id, vereador_nome);

-- Add unique constraint for receitas upsert
ALTER TABLE public.camara_receitas
ADD CONSTRAINT camara_receitas_ano_mes_unique
UNIQUE (ano, mes);
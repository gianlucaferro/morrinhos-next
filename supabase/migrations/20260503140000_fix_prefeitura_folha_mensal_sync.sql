-- Fix: separar Prefeitura/Câmara em servidores e otimizar leituras de folha
-- Documentado em docs/CODEX_FOLHA_MENSAL_CENTI_SYNC_SETUP.md

-- 1) Permitir mesmo nome em órgãos diferentes (Prefeitura/Câmara)
ALTER TABLE public.servidores
  DROP CONSTRAINT IF EXISTS servidores_nome_unique;

CREATE UNIQUE INDEX IF NOT EXISTS servidores_nome_orgao_unique
  ON public.servidores (nome, orgao_tipo);

-- 2) Acelerar consultas de folha por competência e (servidor, competência)
CREATE INDEX IF NOT EXISTS idx_remuneracao_servidores_competencia
  ON public.remuneracao_servidores (competencia);

CREATE INDEX IF NOT EXISTS idx_remuneracao_servidores_servidor_competencia
  ON public.remuneracao_servidores (servidor_id, competencia);

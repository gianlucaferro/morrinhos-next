-- Código de gerenciamento para anúncios sem login
ALTER TABLE classificados ADD COLUMN IF NOT EXISTS codigo_gestao TEXT UNIQUE;

-- Index para busca rápida por código
CREATE INDEX IF NOT EXISTS idx_classificados_codigo_gestao ON classificados(codigo_gestao) WHERE codigo_gestao IS NOT NULL;

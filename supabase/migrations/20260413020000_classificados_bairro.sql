-- Adicionar campo bairro para localização do anúncio
ALTER TABLE classificados ADD COLUMN IF NOT EXISTS bairro TEXT;
CREATE INDEX IF NOT EXISTS idx_classificados_bairro ON classificados (bairro);

ALTER TABLE farmacia_fotos ADD COLUMN IF NOT EXISTS telefone TEXT;
ALTER TABLE farmacia_fotos ADD COLUMN IF NOT EXISTS tipo_telefone TEXT DEFAULT 'fixo';
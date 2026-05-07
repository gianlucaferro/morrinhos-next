
-- Add new columns
ALTER TABLE classificados ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE classificados ADD COLUMN IF NOT EXISTS bairro TEXT;

-- Drop old permissive policies
DROP POLICY IF EXISTS "Inserção pública classificados" ON classificados;
DROP POLICY IF EXISTS "Leitura pública classificados" ON classificados;
DROP POLICY IF EXISTS "Service update classificados" ON classificados;
DROP POLICY IF EXISTS "Service delete classificados" ON classificados;

-- Recreate policies
CREATE POLICY "Public read classificados" ON classificados FOR SELECT USING (true);
CREATE POLICY "Auth insert classificados" ON classificados FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);
CREATE POLICY "Update classificados" ON classificados FOR UPDATE USING (true);
CREATE POLICY "Delete classificados" ON classificados FOR DELETE USING (true);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_classificados_user ON classificados (user_id);
CREATE INDEX IF NOT EXISTS idx_classificados_bairro ON classificados (bairro);

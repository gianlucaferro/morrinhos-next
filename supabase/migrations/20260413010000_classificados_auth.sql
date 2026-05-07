-- Adicionar user_id para vincular anúncios ao usuário autenticado
ALTER TABLE classificados ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
CREATE INDEX IF NOT EXISTS idx_classificados_user ON classificados (user_id);

-- Atualizar política de inserção: apenas usuários autenticados
DROP POLICY IF EXISTS "Inserção pública classificados" ON classificados;
CREATE POLICY "Auth insert classificados" ON classificados FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- Update/delete: mantém aberto para admin (protegido por senha no UI)
-- Futuramente migrar admin para edge function com service role
-- As políticas existentes "Service update/delete" com USING(true) continuam ativas

-- Adicionar status 'vendido' como válido (check constraint opcional)
-- O campo status já aceita TEXT livre, então 'vendido' funciona nativamente

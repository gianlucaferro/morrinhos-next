-- Campo para controlar se a notificação de expiração já foi enviada
ALTER TABLE classificados ADD COLUMN IF NOT EXISTS notificado_expiracao TIMESTAMPTZ;

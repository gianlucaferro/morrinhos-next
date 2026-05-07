-- Add orgao_tipo column to servidores to distinguish Câmara vs Prefeitura
ALTER TABLE public.servidores ADD COLUMN orgao_tipo text NOT NULL DEFAULT 'prefeitura';

-- Update existing servidores to be prefeitura (they already are by default)
-- Index for filtering
CREATE INDEX idx_servidores_orgao_tipo ON public.servidores(orgao_tipo);

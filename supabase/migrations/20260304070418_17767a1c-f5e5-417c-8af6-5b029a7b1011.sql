
-- Add fonte_tipo to track verification source type
ALTER TABLE public.presenca_sessoes 
ADD COLUMN IF NOT EXISTS fonte_tipo text DEFAULT 'lista_presenca';

-- Add status_verificacao to track confirmation status
ALTER TABLE public.presenca_sessoes 
ADD COLUMN IF NOT EXISTS status_verificacao text DEFAULT 'pendente';

-- Add ata_url for direct link to the session minutes used
ALTER TABLE public.presenca_sessoes 
ADD COLUMN IF NOT EXISTS ata_url text;

-- Comment for clarity
COMMENT ON COLUMN public.presenca_sessoes.fonte_tipo IS 'ata, votacao, registro_textual, lista_assinada';
COMMENT ON COLUMN public.presenca_sessoes.status_verificacao IS 'confirmado, pendente, inconsistente';

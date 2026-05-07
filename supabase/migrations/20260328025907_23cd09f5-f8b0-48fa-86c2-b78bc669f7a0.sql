
-- Constraint para upsert de benefícios sociais
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'beneficios_sociais_programa_competencia_municipio_key'
  ) THEN
    ALTER TABLE public.beneficios_sociais
      ADD CONSTRAINT beneficios_sociais_programa_competencia_municipio_key 
      UNIQUE (programa, competencia, municipio);
  END IF;
END$$;

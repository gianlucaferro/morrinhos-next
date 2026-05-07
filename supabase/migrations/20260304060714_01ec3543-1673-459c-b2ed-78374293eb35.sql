-- Add unique constraint on centi_id for camara_despesas upserts
ALTER TABLE public.camara_despesas ADD CONSTRAINT camara_despesas_centi_id_key UNIQUE (centi_id);

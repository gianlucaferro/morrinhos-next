-- Add unique constraint for camara_diarias upsert
ALTER TABLE public.camara_diarias
ADD CONSTRAINT camara_diarias_centi_id_unique
UNIQUE (centi_id);
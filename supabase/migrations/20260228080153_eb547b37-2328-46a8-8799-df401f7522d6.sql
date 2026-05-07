
ALTER TABLE public.secretarias
ADD COLUMN subsidio numeric DEFAULT NULL;

-- Populate with current known value
UPDATE public.secretarias SET subsidio = 6795.88;

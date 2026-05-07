
ALTER TABLE public.secretarias
ADD COLUMN email text DEFAULT NULL,
ADD COLUMN telefone text DEFAULT NULL;

-- Parse existing contato field into separate columns
UPDATE public.secretarias SET 
  email = split_part(contato, ' | ', 1),
  telefone = CASE 
    WHEN contato LIKE '%|%' THEN trim(split_part(contato, '| ', 2))
    ELSE NULL 
  END;

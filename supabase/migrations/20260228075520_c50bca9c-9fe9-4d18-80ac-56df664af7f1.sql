ALTER TABLE public.remuneracao_servidores 
ADD CONSTRAINT remuneracao_servidores_servidor_competencia_key 
UNIQUE (servidor_id, competencia);
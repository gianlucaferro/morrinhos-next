
-- Tabela para Instituições de Ensino Superior
CREATE TABLE public.ensino_superior_ies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  sigla TEXT,
  tipo TEXT NOT NULL DEFAULT 'privada', -- privada, publica_federal, publica_estadual
  codigo_emec TEXT,
  conceito_institucional NUMERIC,
  endereco TEXT,
  telefone TEXT,
  whatsapp TEXT,
  email TEXT,
  site TEXT,
  instagram TEXT,
  facebook TEXT,
  fundacao_ano INTEGER,
  docentes_mestres_doutores_pct NUMERIC,
  alunos_formados INTEGER,
  modalidades TEXT[] DEFAULT '{}',
  programas_financiamento TEXT[] DEFAULT '{}',
  fonte_url TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela para Cursos de Graduação
CREATE TABLE public.ensino_superior_cursos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ies_id UUID NOT NULL REFERENCES public.ensino_superior_ies(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  grau TEXT NOT NULL DEFAULT 'bacharelado', -- bacharelado, licenciatura, tecnologo
  modalidade TEXT NOT NULL DEFAULT 'presencial', -- presencial, ead
  periodo TEXT, -- noturno, integral, matutino
  duracao_anos NUMERIC,
  conceito_mec INTEGER, -- 1-5
  conceito_enade INTEGER, -- 1-5
  situacao TEXT NOT NULL DEFAULT 'ativo', -- ativo, extinto, em_extincao
  vagas_autorizadas INTEGER,
  fonte_url TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.ensino_superior_ies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ensino_superior_cursos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "IES são públicas" ON public.ensino_superior_ies FOR SELECT USING (true);
CREATE POLICY "Cursos superiores são públicos" ON public.ensino_superior_cursos FOR SELECT USING (true);

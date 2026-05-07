
-- Repasses do Fundo Nacional de Saúde (FNS)
CREATE TABLE public.saude_repasses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ano INTEGER NOT NULL,
  mes INTEGER NOT NULL,
  bloco TEXT NOT NULL, -- ex: "Atenção Básica", "MAC", "Vigilância"
  componente TEXT, -- detalhamento do bloco
  valor NUMERIC NOT NULL DEFAULT 0,
  fonte_url TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.saude_repasses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Repasses saúde são públicos" ON public.saude_repasses FOR SELECT USING (true);
CREATE UNIQUE INDEX idx_saude_repasses_unique ON public.saude_repasses(ano, mes, bloco, componente);

-- Estabelecimentos de saúde (CNES)
CREATE TABLE public.saude_estabelecimentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cnes TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  tipo TEXT, -- UBS, PSF, Hospital, Laboratório, etc.
  endereco TEXT,
  telefone TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  profissionais_count INTEGER,
  leitos_count INTEGER,
  fonte_url TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.saude_estabelecimentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Estabelecimentos saúde são públicos" ON public.saude_estabelecimentos FOR SELECT USING (true);

-- Indicadores epidemiológicos (DATASUS, InfoDengue, etc.)
CREATE TABLE public.saude_indicadores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  categoria TEXT NOT NULL, -- "dengue", "zika", "chikungunya", "hiv", "covid", "vacinacao", "mortalidade_infantil"
  indicador TEXT NOT NULL, -- "casos_notificados", "incidencia", "cobertura_vacinal", etc.
  ano INTEGER NOT NULL,
  mes INTEGER,
  semana_epidemiologica INTEGER,
  valor NUMERIC,
  valor_texto TEXT,
  fonte TEXT, -- "InfoDengue", "DATASUS", "MS"
  fonte_url TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.saude_indicadores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Indicadores saúde são públicos" ON public.saude_indicadores FOR SELECT USING (true);
CREATE INDEX idx_saude_indicadores_cat ON public.saude_indicadores(categoria, ano);

-- Equipes de saúde (e-Gestor AB)
CREATE TABLE public.saude_equipes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo TEXT NOT NULL, -- "ESF", "eAB", "NASF", "eSB"
  nome TEXT,
  area TEXT,
  unidade TEXT,
  profissionais JSONB DEFAULT '[]',
  ativa BOOLEAN DEFAULT true,
  fonte_url TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.saude_equipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Equipes saúde são públicas" ON public.saude_equipes FOR SELECT USING (true);

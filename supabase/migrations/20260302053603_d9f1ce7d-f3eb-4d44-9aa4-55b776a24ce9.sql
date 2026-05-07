
-- =============================================
-- EDUCAÇÃO: Escolas do município
-- =============================================
CREATE TABLE public.educacao_escolas (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL,
  rede text NOT NULL, -- municipal, estadual, privada, federal
  etapas text[] DEFAULT '{}',
  endereco text,
  latitude numeric,
  longitude numeric,
  telefone text,
  ideb_ai numeric, -- anos iniciais
  ideb_af numeric, -- anos finais
  ideb_em numeric, -- ensino médio
  matriculas_total integer,
  taxa_aprovacao numeric,
  taxa_reprovacao numeric,
  taxa_abandono numeric,
  tem_biblioteca boolean DEFAULT false,
  tem_lab_informatica boolean DEFAULT false,
  tem_lab_ciencias boolean DEFAULT false,
  tem_quadra boolean DEFAULT false,
  tem_internet boolean DEFAULT false,
  tem_alimentacao boolean DEFAULT false,
  tem_acessibilidade boolean DEFAULT false,
  codigo_inep text,
  fonte_url text,
  ano_referencia integer NOT NULL DEFAULT 2024,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.educacao_escolas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Escolas educação são públicas" ON public.educacao_escolas FOR SELECT USING (true);

-- =============================================
-- IDEB histórico por etapa
-- =============================================
CREATE TABLE public.educacao_ideb (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ano integer NOT NULL,
  etapa text NOT NULL, -- anos_iniciais, anos_finais, ensino_medio
  rede text NOT NULL DEFAULT 'publica', -- publica, municipal, estadual
  ideb numeric,
  meta numeric,
  nota_saeb_pt numeric,
  nota_saeb_mt numeric,
  taxa_aprovacao numeric,
  ambito text NOT NULL DEFAULT 'municipio', -- municipio, estado, brasil
  fonte_url text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(ano, etapa, rede, ambito)
);

ALTER TABLE public.educacao_ideb ENABLE ROW LEVEL SECURITY;
CREATE POLICY "IDEB é público" ON public.educacao_ideb FOR SELECT USING (true);

-- =============================================
-- Indicadores gerais de educação
-- =============================================
CREATE TABLE public.educacao_indicadores (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chave text NOT NULL,
  categoria text NOT NULL, -- visao_geral, infraestrutura, docentes, social
  valor numeric,
  valor_texto text,
  ano_referencia integer NOT NULL,
  fonte text,
  fonte_url text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(chave, ano_referencia)
);

ALTER TABLE public.educacao_indicadores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Indicadores educação são públicos" ON public.educacao_indicadores FOR SELECT USING (true);

-- =============================================
-- Matrículas por etapa e ano
-- =============================================
CREATE TABLE public.educacao_matriculas (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ano integer NOT NULL,
  etapa text NOT NULL, -- creche, pre_escola, ai, af, em, eja
  rede text NOT NULL DEFAULT 'publica',
  quantidade integer NOT NULL DEFAULT 0,
  fonte_url text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(ano, etapa, rede)
);

ALTER TABLE public.educacao_matriculas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Matrículas educação são públicas" ON public.educacao_matriculas FOR SELECT USING (true);

-- =============================================
-- Investimentos em educação
-- =============================================
CREATE TABLE public.educacao_investimentos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ano integer NOT NULL,
  orcamento_total numeric,
  percentual_orcamento numeric,
  gasto_por_aluno numeric,
  fundeb numeric,
  fonte_url text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(ano)
);

ALTER TABLE public.educacao_investimentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Investimentos educação são públicos" ON public.educacao_investimentos FOR SELECT USING (true);

-- =============================================
-- Programas educacionais
-- =============================================
CREATE TABLE public.educacao_programas (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL,
  esfera text NOT NULL, -- municipal, estadual, federal
  descricao text,
  status text DEFAULT 'ativo',
  fonte_url text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.educacao_programas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Programas educação são públicos" ON public.educacao_programas FOR SELECT USING (true);

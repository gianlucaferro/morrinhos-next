
-- Tabela: Chefia do Executivo (Prefeita, Vice)
CREATE TABLE public.executivo (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo text NOT NULL, -- 'prefeita', 'vice'
  nome text NOT NULL,
  foto_url text,
  partido text,
  mandato_inicio date NOT NULL,
  mandato_fim date NOT NULL,
  telefone text,
  email text,
  horario text,
  endereco text,
  fonte_url text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.executivo ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Executivo é público" ON public.executivo FOR SELECT USING (true);

-- Tabela: Secretarias Municipais
CREATE TABLE public.secretarias (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL,
  secretario_nome text,
  contato text,
  fonte_url text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.secretarias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Secretarias são públicas" ON public.secretarias FOR SELECT USING (true);

-- Tabela: Servidores
CREATE TABLE public.servidores (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL,
  cargo text,
  secretaria_id uuid REFERENCES public.secretarias(id),
  fonte_url text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.servidores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Servidores são públicos" ON public.servidores FOR SELECT USING (true);

-- Tabela: Remuneração de Servidores
CREATE TABLE public.remuneracao_servidores (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  servidor_id uuid NOT NULL REFERENCES public.servidores(id),
  competencia text NOT NULL, -- 'YYYY-MM'
  bruto numeric,
  liquido numeric,
  fonte_url text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.remuneracao_servidores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Remuneração servidores é pública" ON public.remuneracao_servidores FOR SELECT USING (true);

-- Tabela: Despesas
CREATE TABLE public.despesas (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  data date NOT NULL,
  favorecido text,
  valor numeric NOT NULL,
  descricao text,
  secretaria_id uuid REFERENCES public.secretarias(id),
  fonte_url text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.despesas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Despesas são públicas" ON public.despesas FOR SELECT USING (true);

-- Tabela: Contratos
CREATE TABLE public.contratos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  numero text,
  empresa text,
  valor numeric,
  objeto text,
  vigencia_inicio date,
  vigencia_fim date,
  status text DEFAULT 'ativo', -- ativo, encerrado, rescindido
  secretaria_id uuid REFERENCES public.secretarias(id),
  fonte_url text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.contratos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Contratos são públicos" ON public.contratos FOR SELECT USING (true);

-- Tabela: Licitações
CREATE TABLE public.licitacoes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  numero text,
  modalidade text,
  objeto text,
  status text,
  data_publicacao date,
  data_resultado date,
  secretaria_id uuid REFERENCES public.secretarias(id),
  fonte_url text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.licitacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Licitações são públicas" ON public.licitacoes FOR SELECT USING (true);

-- Tabela: Diárias e Viagens
CREATE TABLE public.diarias (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  servidor_id uuid REFERENCES public.servidores(id),
  servidor_nome text,
  destino text,
  motivo text,
  valor numeric,
  data date,
  fonte_url text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.diarias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Diárias são públicas" ON public.diarias FOR SELECT USING (true);

-- Tabela: Obras Públicas
CREATE TABLE public.obras (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL,
  local text,
  valor numeric,
  empresa text,
  status text, -- em_andamento, concluida, paralisada
  fonte_url text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.obras ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Obras são públicas" ON public.obras FOR SELECT USING (true);


-- Tabela para licitações da Câmara Municipal (fonte: API Centi)
CREATE TABLE public.camara_licitacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text,
  ano integer NOT NULL,
  modalidade text,
  objeto text,
  situacao text,
  data_abertura date,
  valor_estimado numeric,
  fonte_url text DEFAULT 'https://camaramorrinhos.centi.com.br/licitacoes',
  centi_id text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.camara_licitacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Licitações câmara são públicas" ON public.camara_licitacoes FOR SELECT USING (true);
CREATE UNIQUE INDEX idx_camara_licitacoes_centi ON public.camara_licitacoes(centi_id) WHERE centi_id IS NOT NULL;

-- Tabela para contratos da Câmara Municipal
CREATE TABLE public.camara_contratos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text,
  ano integer NOT NULL,
  credor text,
  objeto text,
  valor numeric,
  vigencia_inicio date,
  vigencia_fim date,
  status text DEFAULT 'ativo',
  fonte_url text DEFAULT 'https://camaramorrinhos.centi.com.br/contratos',
  centi_id text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.camara_contratos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Contratos câmara são públicos" ON public.camara_contratos FOR SELECT USING (true);
CREATE UNIQUE INDEX idx_camara_contratos_centi ON public.camara_contratos(centi_id) WHERE centi_id IS NOT NULL;

-- Tabela para despesas da Câmara Municipal
CREATE TABLE public.camara_despesas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ano integer NOT NULL,
  mes integer,
  credor text,
  descricao text,
  valor numeric,
  data_pagamento date,
  elemento text,
  fonte_url text DEFAULT 'https://camaramorrinhos.centi.com.br/despesas/orgao',
  centi_id text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.camara_despesas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Despesas câmara são públicas" ON public.camara_despesas FOR SELECT USING (true);

-- Tabela para receitas/duodécimo da Câmara Municipal
CREATE TABLE public.camara_receitas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ano integer NOT NULL,
  mes integer NOT NULL,
  descricao text,
  valor_previsto numeric,
  valor_arrecadado numeric,
  fonte_url text DEFAULT 'https://camaramorrinhos.centi.com.br/receitas/detalhadas',
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.camara_receitas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Receitas câmara são públicas" ON public.camara_receitas FOR SELECT USING (true);
CREATE UNIQUE INDEX idx_camara_receitas_periodo ON public.camara_receitas(ano, mes, descricao);

-- Tabela para diárias da Câmara Municipal
CREATE TABLE public.camara_diarias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data date,
  beneficiario text,
  cargo text,
  destino text,
  motivo text,
  valor numeric,
  fonte_url text DEFAULT 'https://camaramorrinhos.centi.com.br/despesas/diarias',
  centi_id text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.camara_diarias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Diárias câmara são públicas" ON public.camara_diarias FOR SELECT USING (true);

-- Tabela para presença dos vereadores nas sessões
CREATE TABLE public.presenca_sessoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sessao_titulo text NOT NULL,
  sessao_data date,
  tipo_sessao text,
  ano integer NOT NULL,
  vereador_id uuid REFERENCES public.vereadores(id),
  vereador_nome text,
  presente boolean DEFAULT true,
  fonte_url text DEFAULT 'https://acessoainformacao.camarademorrinhos.go.gov.br/lista-de-presenca/',
  wp_post_id integer,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.presenca_sessoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Presença sessões é pública" ON public.presenca_sessoes FOR SELECT USING (true);
CREATE UNIQUE INDEX idx_presenca_sessao_vereador ON public.presenca_sessoes(wp_post_id, vereador_nome) WHERE wp_post_id IS NOT NULL;

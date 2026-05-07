
-- Tabela para convênios e transferências federais (Portal da Transparência)
CREATE TABLE public.transferencias_federais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL DEFAULT 'convenio',
  numero text,
  orgao_concedente text,
  objeto text,
  valor_total numeric,
  valor_liberado numeric,
  valor_empenhado numeric,
  situacao text,
  data_inicio date,
  data_fim date,
  fonte_url text,
  fonte_api text DEFAULT 'portal_transparencia',
  ano integer NOT NULL,
  portal_id text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(portal_id, tipo)
);

ALTER TABLE public.transferencias_federais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Transferências federais são públicas"
  ON public.transferencias_federais FOR SELECT
  TO public USING (true);

-- Tabela para dados fiscais SICONFI (DCA, RREO, RGF)
CREATE TABLE public.contas_publicas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  demonstrativo text NOT NULL,
  anexo text NOT NULL,
  exercicio integer NOT NULL,
  periodo integer DEFAULT 0,
  conta text NOT NULL,
  valor numeric,
  coluna text,
  fonte_url text DEFAULT 'https://siconfi.tesouro.gov.br',
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(demonstrativo, anexo, exercicio, periodo, conta, coluna)
);

ALTER TABLE public.contas_publicas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Contas públicas são públicas"
  ON public.contas_publicas FOR SELECT
  TO public USING (true);

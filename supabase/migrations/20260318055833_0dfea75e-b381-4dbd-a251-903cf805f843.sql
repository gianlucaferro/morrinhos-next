
CREATE TABLE public.veiculos_frota (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  placa text NOT NULL,
  descricao text NOT NULL DEFAULT '',
  marca text NOT NULL DEFAULT '',
  ano_fabricacao text,
  ano_modelo text,
  combustivel text NOT NULL DEFAULT '',
  situacao text NOT NULL DEFAULT 'ativo',
  orgao text NOT NULL DEFAULT '',
  categoria text NOT NULL DEFAULT '',
  centi_id text,
  fonte_url text NOT NULL DEFAULT '',
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE(placa)
);

ALTER TABLE public.veiculos_frota ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access on veiculos_frota"
  ON public.veiculos_frota
  FOR SELECT
  TO anon, authenticated
  USING (true);

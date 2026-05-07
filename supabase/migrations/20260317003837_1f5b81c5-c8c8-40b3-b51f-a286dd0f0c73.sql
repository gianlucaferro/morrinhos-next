
CREATE TABLE public.fornecedores_cnpj (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cnpj text NOT NULL UNIQUE,
  razao_social text,
  nome_fantasia text,
  data_abertura date,
  situacao_cadastral text,
  natureza_juridica text,
  porte text,
  capital_social numeric,
  cnae_principal text,
  cnae_descricao text,
  logradouro text,
  municipio text,
  uf text,
  cep text,
  telefone text,
  email text,
  socios jsonb DEFAULT '[]'::jsonb,
  consultado_em timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.fornecedores_cnpj ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Fornecedores CNPJ são públicos"
  ON public.fornecedores_cnpj
  FOR SELECT
  TO public
  USING (true);

-- 13 tabelas para dados externos extraídos via FireCrawl + APIs publicas
-- Documentado em docs/INTEGRACOES_DADOS_PUBLICOS.md

-- 1. TCM-GO: apontamentos e sanções
CREATE TABLE IF NOT EXISTS public.tcm_go_apontamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_processo text NOT NULL,
  ano int,
  orgao_alvo text,
  tipo text,
  status text,
  ementa text,
  ementa_resumo_ia text,
  data_publicacao date,
  valor_envolvido numeric,
  fonte_url text NOT NULL,
  raw_html text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(numero_processo, data_publicacao)
);
CREATE INDEX IF NOT EXISTS idx_tcm_go_data ON public.tcm_go_apontamentos (data_publicacao DESC);

-- 2. AGM-GO Diário Oficial: publicações
CREATE TABLE IF NOT EXISTS public.agm_go_publicacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  edicao text,
  data_publicacao date NOT NULL,
  tipo text,
  numero text,
  ementa text,
  ementa_resumo_ia text,
  pdf_url text,
  fonte_url text NOT NULL,
  hash_conteudo text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(data_publicacao, numero, tipo)
);
CREATE INDEX IF NOT EXISTS idx_agm_data ON public.agm_go_publicacoes (data_publicacao DESC);

-- 3. Site Prefeitura: notícias, concursos, agenda
CREATE TABLE IF NOT EXISTS public.prefeitura_noticias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria text NOT NULL CHECK (categoria IN ('noticia','concurso','agenda','edital','outros')),
  titulo text NOT NULL,
  resumo text,
  conteudo_md text,
  conteudo_resumo_ia text,
  imagem_url text,
  data_publicacao timestamptz,
  fonte_url text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pref_noticias_data ON public.prefeitura_noticias (data_publicacao DESC);
CREATE INDEX IF NOT EXISTS idx_pref_noticias_cat ON public.prefeitura_noticias (categoria);

-- 4. Atas Câmara: texto extraido de PDFs (sessao_data como FK fraca em presenca_sessoes)
CREATE TABLE IF NOT EXISTS public.camara_atas_texto (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sessao_data date,
  pdf_url text NOT NULL UNIQUE,
  texto_completo text,
  texto_resumo_ia text,
  topicos_abordados text[],
  extraido_em timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_camara_atas_texto_search
  ON public.camara_atas_texto USING gin (to_tsvector('portuguese', coalesce(texto_completo, '')));

-- 5. CNJ DataJud: processos com Prefeitura/Câmara como parte
CREATE TABLE IF NOT EXISTS public.cnj_processos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_processo text NOT NULL UNIQUE,
  classe text,
  assunto text,
  orgao_julgador text,
  data_ajuizamento date,
  data_ultimo_movimento timestamptz,
  ultimo_movimento text,
  partes_polo_ativo text[],
  partes_polo_passivo text[],
  valor_causa numeric,
  fonte text,
  raw_json jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cnj_data ON public.cnj_processos (data_ultimo_movimento DESC);
CREATE INDEX IF NOT EXISTS idx_cnj_classe ON public.cnj_processos (classe);

-- 6a. TJ-GO: processos
CREATE TABLE IF NOT EXISTS public.tjgo_processos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_processo text NOT NULL UNIQUE,
  vara text,
  comarca text DEFAULT 'Morrinhos',
  classe text,
  assunto text,
  partes text[],
  data_movimentacao timestamptz,
  status text,
  fonte_url text,
  created_at timestamptz DEFAULT now()
);

-- 6b. MP-GO: atuação
CREATE TABLE IF NOT EXISTS public.mpgo_atuacao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text,
  promotoria text,
  ementa text,
  ementa_resumo_ia text,
  data_publicacao date NOT NULL,
  fonte_url text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

-- 7. INEP Censo Escolar: detalhe escola por escola
CREATE TABLE IF NOT EXISTS public.inep_escolas_detalhe (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ano_censo int NOT NULL,
  codigo_inep text NOT NULL,
  nome text,
  rede text CHECK (rede IN ('municipal','estadual','federal','privada')),
  zona text CHECK (zona IN ('urbana','rural')),
  matriculas_total int,
  matriculas_creche int,
  matriculas_pre_escola int,
  matriculas_fundamental int,
  matriculas_medio int,
  professores int,
  funcionarios int,
  tem_biblioteca boolean,
  tem_laboratorio_informatica boolean,
  tem_laboratorio_ciencias boolean,
  tem_quadra_esportes boolean,
  tem_acessibilidade_rampa boolean,
  tem_alimentacao boolean,
  tem_internet boolean,
  raw_json jsonb,
  created_at timestamptz DEFAULT now(),
  UNIQUE(ano_censo, codigo_inep)
);

-- 8. PNCP: licitações federais que envolvem o município
CREATE TABLE IF NOT EXISTS public.pncp_licitacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_controle_pncp text NOT NULL UNIQUE,
  modalidade text,
  orgao text,
  unidade_compradora text,
  objeto text,
  valor_estimado numeric,
  data_publicacao date,
  data_abertura timestamptz,
  status text,
  uf text,
  municipio text,
  fonte_url text,
  raw_json jsonb,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pncp_data ON public.pncp_licitacoes (data_publicacao DESC);

-- 9a. TSE Candidatos
CREATE TABLE IF NOT EXISTS public.tse_candidatos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ano_eleicao int NOT NULL,
  cargo text NOT NULL,
  numero_candidato text NOT NULL,
  nome_urna text,
  nome_completo text,
  partido text,
  cpf_anonimizado text,
  situacao_candidatura text,
  resultado text,
  total_votos int,
  total_recebido_doacoes numeric,
  raw_json jsonb,
  UNIQUE(ano_eleicao, cargo, numero_candidato)
);

-- 9b. TSE Doadores de campanha
CREATE TABLE IF NOT EXISTS public.tse_doadores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidato_id uuid REFERENCES public.tse_candidatos(id) ON DELETE CASCADE,
  ano_eleicao int NOT NULL,
  doador_nome text NOT NULL,
  doador_cnpj_cpf_anonimizado text,
  tipo_doador text CHECK (tipo_doador IN ('PF','PJ','partido','autofinanciamento')),
  valor numeric NOT NULL,
  data_doacao date,
  origem_recurso text,
  raw_json jsonb,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tse_doadores_cand ON public.tse_doadores (candidato_id);

-- 10. INMET: clima diário Morrinhos
CREATE TABLE IF NOT EXISTS public.inmet_clima_diario (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data date NOT NULL,
  estacao_codigo text NOT NULL,
  temperatura_max numeric,
  temperatura_min numeric,
  temperatura_media numeric,
  precipitacao_mm numeric,
  umidade_media numeric,
  vento_velocidade_max numeric,
  raw_json jsonb,
  created_at timestamptz DEFAULT now(),
  UNIQUE(data, estacao_codigo)
);
CREATE INDEX IF NOT EXISTS idx_inmet_data ON public.inmet_clima_diario (data DESC);

-- 11. CONAB: preços agrícolas
CREATE TABLE IF NOT EXISTS public.conab_precos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  produto text NOT NULL,
  unidade text,
  preco numeric NOT NULL,
  data_referencia date NOT NULL,
  praca text,
  estado text DEFAULT 'GO',
  fonte_url text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(produto, data_referencia, praca)
);
CREATE INDEX IF NOT EXISTS idx_conab_data ON public.conab_precos (data_referencia DESC);
CREATE INDEX IF NOT EXISTS idx_conab_produto ON public.conab_precos (produto);

-- 12. DETRAN-GO: sinistros e infrações
CREATE TABLE IF NOT EXISTS public.detran_go_dados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL CHECK (tipo IN ('sinistro','infracao_frota_municipal','frota_geral')),
  data_referencia date NOT NULL,
  municipio text DEFAULT 'Morrinhos',
  total int,
  detalhes jsonb,
  fonte_url text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_detran_data ON public.detran_go_dados (data_referencia DESC);

-- RLS: leitura publica em todas + service_role escreve
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN
    SELECT unnest(ARRAY[
      'tcm_go_apontamentos', 'agm_go_publicacoes', 'prefeitura_noticias',
      'camara_atas_texto', 'cnj_processos', 'tjgo_processos', 'mpgo_atuacao',
      'inep_escolas_detalhe', 'pncp_licitacoes', 'tse_candidatos',
      'tse_doadores', 'inmet_clima_diario', 'conab_precos', 'detran_go_dados'
    ])
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'DROP POLICY IF EXISTS "%I_select_public" ON public.%I',
      t, t
    );
    EXECUTE format(
      'CREATE POLICY "%I_select_public" ON public.%I FOR SELECT USING (true)',
      t, t
    );
  END LOOP;
END $$;

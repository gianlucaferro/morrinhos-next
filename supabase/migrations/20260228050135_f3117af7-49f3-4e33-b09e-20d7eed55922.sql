
-- Tabela de vereadores
CREATE TABLE public.vereadores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  foto_url TEXT,
  cargo_mesa TEXT,
  inicio_mandato DATE NOT NULL,
  fim_mandato DATE NOT NULL,
  fonte_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de projetos
CREATE TABLE public.projetos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo TEXT NOT NULL,
  numero TEXT NOT NULL,
  ano INTEGER NOT NULL,
  data DATE NOT NULL,
  ementa TEXT NOT NULL,
  origem TEXT NOT NULL CHECK (origem IN ('Legislativo', 'Executivo')),
  autor_vereador_id UUID REFERENCES public.vereadores(id),
  autor_texto TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'em_tramitacao' CHECK (status IN ('apresentado', 'aprovado', 'recusado', 'em_tramitacao')),
  fonte_visualizar_url TEXT NOT NULL,
  fonte_download_url TEXT,
  resumo_simples TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tipo, numero, ano, origem)
);

-- Tabela de votações
CREATE TABLE public.votacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  projeto_id UUID NOT NULL REFERENCES public.projetos(id),
  data DATE NOT NULL,
  resultado TEXT NOT NULL,
  fonte_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de remuneração mensal
CREATE TABLE public.remuneracao_mensal (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vereador_id UUID NOT NULL REFERENCES public.vereadores(id),
  competencia TEXT NOT NULL,
  bruto NUMERIC,
  liquido NUMERIC,
  subsidio_referencia NUMERIC NOT NULL,
  fonte_url TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(vereador_id, competencia)
);

-- Tabela de log de sincronização
CREATE TABLE public.sync_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'running',
  detalhes JSONB DEFAULT '{}',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ
);

-- Tabela de assinaturas
CREATE TABLE public.subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  verify_token_hash TEXT,
  is_paused BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  verified_at TIMESTAMPTZ
);

-- Tabela de vereadores seguidos por assinatura
CREATE TABLE public.subscription_vereadores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subscription_id UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  vereador_id UUID NOT NULL REFERENCES public.vereadores(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(subscription_id, vereador_id)
);

-- Tabela de log de digest enviados
CREATE TABLE public.email_digest_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subscription_id UUID NOT NULL REFERENCES public.subscriptions(id),
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'sent',
  error_message TEXT
);

-- Enable RLS on all tables
ALTER TABLE public.vereadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projetos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.remuneracao_mensal ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_vereadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_digest_log ENABLE ROW LEVEL SECURITY;

-- Public read access for public data
CREATE POLICY "Vereadores são públicos" ON public.vereadores FOR SELECT USING (true);
CREATE POLICY "Projetos são públicos" ON public.projetos FOR SELECT USING (true);
CREATE POLICY "Votações são públicas" ON public.votacoes FOR SELECT USING (true);
CREATE POLICY "Remuneração é pública" ON public.remuneracao_mensal FOR SELECT USING (true);
CREATE POLICY "Sync log público para leitura" ON public.sync_log FOR SELECT USING (true);

-- Subscriptions: users can only manage their own via edge functions
-- No direct public access to subscriptions for security

-- Insert policies for edge functions (service role)
CREATE POLICY "Service pode inserir vereadores" ON public.vereadores FOR INSERT WITH CHECK (true);
CREATE POLICY "Service pode atualizar vereadores" ON public.vereadores FOR UPDATE USING (true);
CREATE POLICY "Service pode inserir projetos" ON public.projetos FOR INSERT WITH CHECK (true);
CREATE POLICY "Service pode atualizar projetos" ON public.projetos FOR UPDATE USING (true);
CREATE POLICY "Service pode inserir votacoes" ON public.votacoes FOR INSERT WITH CHECK (true);
CREATE POLICY "Service pode inserir remuneracao" ON public.remuneracao_mensal FOR INSERT WITH CHECK (true);
CREATE POLICY "Service pode atualizar remuneracao" ON public.remuneracao_mensal FOR UPDATE USING (true);
CREATE POLICY "Service pode inserir sync_log" ON public.sync_log FOR INSERT WITH CHECK (true);
CREATE POLICY "Service pode atualizar sync_log" ON public.sync_log FOR UPDATE USING (true);
CREATE POLICY "Service pode inserir subscriptions" ON public.subscriptions FOR ALL USING (true);
CREATE POLICY "Service pode gerenciar sub_vereadores" ON public.subscription_vereadores FOR ALL USING (true);
CREATE POLICY "Service pode inserir digest_log" ON public.email_digest_log FOR ALL USING (true);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_vereadores_updated_at BEFORE UPDATE ON public.vereadores FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_projetos_updated_at BEFORE UPDATE ON public.projetos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_remuneracao_updated_at BEFORE UPDATE ON public.remuneracao_mensal FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX idx_projetos_autor ON public.projetos(autor_vereador_id);
CREATE INDEX idx_projetos_ano ON public.projetos(ano);
CREATE INDEX idx_projetos_status ON public.projetos(status);
CREATE INDEX idx_remuneracao_vereador ON public.remuneracao_mensal(vereador_id);
CREATE INDEX idx_subscriptions_email ON public.subscriptions(email);

-- Enable pg_cron and pg_net for scheduled sync
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

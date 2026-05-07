
CREATE TABLE IF NOT EXISTS classificados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  categoria TEXT NOT NULL DEFAULT 'outros',
  titulo TEXT NOT NULL,
  descricao TEXT,
  preco NUMERIC,
  preco_tipo TEXT DEFAULT 'fixo',
  fotos TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'ativo',
  denuncias INT DEFAULT 0,
  visualizacoes INT DEFAULT 0,
  expira_em TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE classificados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura pública classificados" ON classificados FOR SELECT USING (true);
CREATE POLICY "Inserção pública classificados" ON classificados FOR INSERT WITH CHECK (true);
CREATE POLICY "Service update classificados" ON classificados FOR UPDATE USING (true);
CREATE POLICY "Service delete classificados" ON classificados FOR DELETE USING (true);

CREATE INDEX idx_classificados_categoria ON classificados (categoria);
CREATE INDEX idx_classificados_status ON classificados (status);
CREATE INDEX idx_classificados_created ON classificados (created_at DESC);

INSERT INTO storage.buckets (id, name, public) VALUES ('classificados', 'classificados', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Leitura pública fotos classificados" ON storage.objects FOR SELECT USING (bucket_id = 'classificados');
CREATE POLICY "Upload público fotos classificados" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'classificados');

CREATE OR REPLACE FUNCTION increment_classificado_view(classificado_id UUID)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE classificados SET visualizacoes = visualizacoes + 1 WHERE id = classificado_id;
$$;

CREATE OR REPLACE FUNCTION denunciar_classificado(classificado_id UUID)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE classificados SET denuncias = denuncias + 1,
    status = CASE WHEN denuncias + 1 >= 3 THEN 'denunciado' ELSE status END
  WHERE id = classificado_id;
$$;

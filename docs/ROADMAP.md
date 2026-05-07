# Roadmap Morrinhos.ai

Backlog de features pedidas pelo user, agrupadas por tema.

## 📸 Galeria de Fotos da Cidade

**Pedido em:** 2026-05-04

**O que é:** Seção onde cidadãos de Morrinhos podem enviar fotos atuais
e históricas da cidade.

### Requisitos técnicos

- [ ] **Tabela** `galeria_fotos`:
  - `id`, `titulo`, `descricao`, `categoria` (atual/historica), `ano_aproximado`,
    `autor_nome` (opcional), `autor_email` (validação), `latitude`/`longitude`
    (auto via EXIF mas sem revelar PII), `imagem_url`, `thumbnail_url`,
    `aprovado` (boolean default false), `created_at`
- [ ] **Storage bucket** `galeria-fotos` com RLS:
  - Upload: somente service role (via edge function moderada)
  - Read: público
- [ ] **Edge function** `submit-galeria-foto`:
  - Recebe upload do cliente (até 5MB)
  - Strip EXIF GPS/PII automático
  - Comprime pra WebP max 1920px
  - Gera thumbnail 400px
  - Roda **moderação Gemini Vision** (detecta nudez, violência, propaganda política, conteúdo
    ilegal)
  - Se aprovado pela IA → grava com `aprovado=true`
  - Se duvidoso → `aprovado=false`, notifica admin via Telegram
- [ ] **Frontend `/galeria`**:
  - Hero "Galeria de Morrinhos"
  - Tabs: Todas / Atual / Histórica
  - Grid masonry de fotos (lightbox ao clicar)
  - Botão "Enviar foto" → modal de upload com:
    - Drop zone
    - Categoria (atual/histórica)
    - Ano aproximado (se histórica)
    - Título + descrição
    - Nome do autor (opcional)
    - Termos: "ao enviar você confirma ter direitos sobre a foto e autoriza
      uso pelo Morrinhos.ai"
- [ ] **Compartilhamento** WhatsApp + download
- [ ] **Schema.org** `ImageGallery` para SEO
- [ ] **Sitemap** dinâmico das fotos

### Nice-to-haves
- Tags livres ("centro", "bairro X", "festa do peão", "carnaval")
- Curtir/favoritar (sem login, via localStorage)
- Newsletter "foto da semana"
- Concurso anual "Morrinhos pelas lentes dos cidadãos"

## 📜 História de Morrinhos

**Pedido em:** 2026-05-04

**O que é:** Página dedicada à história do município — alta densidade SEO/GEO.

### Estrutura sugerida

- [ ] `/historia` (server component, static, revalidate semanal)
- [ ] H1: "História de Morrinhos — Goiás"
- [ ] Lead: 2-3 frases respondendo "quando", "por quem", "por quê"
- [ ] H2 cronológico:
  - Origens e fundação (data exata, decreto)
  - Século XIX: povoamento
  - Início do século XX: emancipação política
  - Período do café/algodão
  - Era moderna: agropecuária e o nome dela em laticínios
  - Atualidade
- [ ] H2 "Símbolos oficiais"
  - Brasão (descrição heráldica)
  - Bandeira
  - Hino municipal (link YouTube/Spotify se houver)
- [ ] H2 "Personalidades históricas"
- [ ] H2 "Patrimônio cultural"
  - Igreja matriz, Torre do Relógio, etc
  - Festas tradicionais (Festa do Peão, Padroeiro)
- [ ] H2 "Linha do tempo interativa" (componente visual)
- [ ] H2 FAQ:
  - "Quando Morrinhos foi fundada?"
  - "De onde vem o nome Morrinhos?"
  - "Qual a relação com a marca de leite Morrinhos?"
  - "Quem foi o primeiro prefeito?"
  - "Qual a população atual?"

### SEO targets

- "história de morrinhos"
- "fundação de morrinhos goiás"
- "origem do nome morrinhos"
- "morrinhos goiás história"
- "santa cruz de morrinhos" (nome anterior, se aplicável)
- "leite morrinhos história" (cross-traffic com a marca)

### Schema.org

- `Place` com `additionalProperty` (data fundação, área, população)
- `Article` para cada seção principal
- `FAQPage` com perguntas históricas

## 🌤 Open-Meteo tempo real

**Pedido em:** 2026-05-04

**Status atual:** Historical Weather API (delay 24-48h).

### Migração necessária

- [ ] Trocar URL: `archive-api.open-meteo.com` → `api.open-meteo.com/v1/forecast`
- [ ] Variáveis novas: `current_weather`, `hourly` (próximas 24h), `daily` (próximos 7 dias)
- [ ] Tabela: adicionar colunas `current_temp`, `current_precipitation_probability`,
  `forecast_7days_json`
- [ ] Cron: passar de 1x/dia para 3x/dia (`0 8,14,20 * * *` BRT)
- [ ] Widget home: mostrar temperatura ATUAL (não média do dia)
- [ ] Página `/clima`: adicionar gráfico de previsão dos próximos 7 dias

**Esforço:** ~30 min implementação + 5 min testes

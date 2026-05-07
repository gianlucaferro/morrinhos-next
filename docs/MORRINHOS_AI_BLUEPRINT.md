# Blueprint Morrinhos.AI — Replicar Morrinhos.AI pra Morrinhos-GO

**Data**: 2026-05-07
**Base**: Estado atual do `morrinhos-next` em produção
**Objetivo**: Documento técnico completo pra criar `morrinhos-next` partindo do mesmo stack

---

## Sumário

1. [Visão Geral do Produto](#1-visão-geral-do-produto)
2. [Stack Técnica Completa](#2-stack-técnica-completa)
3. [Arquitetura](#3-arquitetura)
4. [Database — 86 tabelas](#4-database--86-tabelas)
5. [Edge Functions — 99 functions + 56 crons](#5-edge-functions--99-functions--56-crons)
6. [Páginas e Rotas — 30 rotas públicas](#6-páginas-e-rotas--30-rotas-públicas)
7. [Camadas de Dados](#7-camadas-de-dados)
8. [Fontes de Dados Externas](#8-fontes-de-dados-externas)
9. [Email + DNS](#9-email--dns)
10. [SEO + GEO](#10-seo--geo)
11. [Custos Mensais](#11-custos-mensais)
12. [Passo a Passo — Criar Morrinhos.AI](#12-passo-a-passo--criar-morrinhosai)
13. [Adaptações Específicas Pira→Morri](#13-adaptações-específicas-morrinhos--morrinhos)
14. [Diferenças Estruturais Esperadas](#14-diferenças-estruturais-esperadas)

---

## 1. Visão Geral do Produto

**Morrinhos.AI** é um portal de transparência cidadã pro município de Morrinhos-GO. Não é site oficial da Prefeitura — é portal independente que:

- **Agrega dados públicos** de ~30 fontes oficiais (Prefeitura, Câmara, IBGE, TCM-GO, INEP, MS, SNIS, ANEEL, ANATEL, IMB-GO, MTE/CAGED, RAIS, Receita Federal)
- **Atualiza automaticamente** via 99 edge functions com 56 crons agendados
- **Resume com IA** decretos, leis, contratos (Gemini/Claude por Edge Function)
- **Cruza dados** entre setores (saneamento × dengue, chuva × empregos agro, etc.)
- **Ranqueia bem em SEO/GEO** (schema.org agressivo, sitemap, IndexNow, AI Overviews)

**Público**: cidadãos, jornalistas locais, vereadores, gestores públicos, pesquisadores.

**Modelo de negócio**: Anúncios locais (`/anuncie`), classificados (`/compra-e-venda`), donations + parceria com Câmara/Prefeitura.

---

## 2. Stack Técnica Completa

### 2.1 Frontend

| Componente | Versão | Função |
|---|---|---|
| **Next.js** | 16.2.4 (App Router) | Framework SSR/SSG ⚠️ versão tem breaking changes — sempre consultar `node_modules/next/dist/docs/` |
| **React** | 19.2.4 | Biblioteca UI |
| **TypeScript** | 5.x | Tipagem estática |
| **Tailwind CSS** | 4 | Estilização (via `tw-animate-css`) |
| **shadcn/ui** | 4.6 | 22 componentes UI baseados em base-ui |
| **base-ui/react** | 1.4.1 | Headless components (Radix substituto) |
| **Recharts** | 3.8.1 | Gráficos (com workaround `ignoreBuildErrors`) |
| **Framer Motion** | 12.38 | Animações |
| **Lucide React** | 0.546 | Ícones |
| **React Query (TanStack)** | 5.100 | Cache client-side com hidratação SSR |
| **React Hook Form + Zod** | 7.75 / 4.4 | Formulários validados |
| **react-leaflet + leaflet** | 5.0 / 1.9 | Mapas (zap-mhs, classificados) |
| **Sonner** | 2.0 | Toast notifications |
| **qrcode.react** | 4.2 | QR codes (PIX donations) |
| **heic2any** | 0.0.4 | Converter HEIC iOS pra JPG (uploads) |

### 2.2 Backend

| Componente | Função |
|---|---|
| **Supabase Postgres** | DB principal — 86 tabelas, RLS habilitado em todas |
| **Supabase Edge Functions (Deno)** | 99 functions deployadas — scrapers, syncs, IA, transactional |
| **pg_cron** | 56 jobs agendados (scheduling de syncs) |
| **Supabase Storage** | Imagens (classificados, fotos farmácias, OG images) |
| **Supabase Auth** | Auth admin + push subscriptions + email subscribers |

### 2.3 Hosting / Infra

| Serviço | Uso | Custo aprox. |
|---|---|---|
| **Vercel** | Hosting Next.js (team `gianlucaferros-projects`, projeto `morrinhos-next`) | $0 free tier ou $20/mês Pro |
| **Supabase** | Postgres + Edge Functions + Storage | $25/mês plano Pro (sa-east-1 São Paulo) |
| **Hostinger** | Domínio `morrinhos.ai` + Email Business | ~R$ 95/ano email + R$ 600/2 anos domínio |
| **Resend** | Email transacional (DKIM/SPF/DMARC) | $0 free tier (3k emails/mês) |
| **Cloudflare** | NÃO usado pra Morrinhos (usa Hostinger DNS) | — |

### 2.4 Integrações externas

| API/Serviço | Uso |
|---|---|
| **Google Gemini 2.5** | Resumos IA via Edge Function (chave em secret) |
| **Claude API** | Backup/alternativa pra resumos longos |
| **FireCrawl** | Scraping de PDFs e sites (TCM-GO, atas, prefeitura) |
| **Apify** | Scraping de sites complexos (TCM-GO Power BI) |
| **Open-Meteo Archive** | Chuva mensal histórica (free, sem chave) |
| **MapBiomas** | Uso e cobertura do solo (XLSX manual upload) |
| **INMET** | Clima diário em tempo real (estação automática) |
| **CONAB** | Preços agrícolas (soja, milho) |
| **IBGE Sidra** | PIB municipal, população, IDH (alguns endpoints OK, outros 404) |
| **DataSUS** | Mortalidade, internações (via TabNet Lite) |
| **PostHog** | Analytics (não foi configurado ainda no Morrinhos) |
| **Sentry** | Error monitoring (configurado no projeto Ferro Labs) |

### 2.5 MCPs Claude Code conectados

- **Supabase MCP** (`mcp__86390b15`) — gerenciar DB, edge functions
- **Vercel MCP** (`mcp__vercel`) — deploy, env vars
- **Hostinger MCP** (`mcp__hostinger-mcp`) — DNS, domínios, email
- **Resend MCP** (`mcp__resend`) — domínios, emails, broadcasts
- **Frase MCP** (`mcp__frase`) — SEO + GEO
- **SEO MCP** (`mcp__seo`) — auditorias
- **FireCrawl MCP** (`mcp__firecrawl`) — scraping
- **Apify MCP** (`mcp__apify`) — actors
- **GitHub via gh CLI** — repositórios

---

## 3. Arquitetura

```
                       ┌─────────────────┐
                       │  Vercel Edge    │  ← morrinhos.ai
                       │  (Next.js 16)   │
                       └────────┬────────┘
                                │
                  ┌─────────────┴──────────────┐
                  │                            │
                  ▼                            ▼
        ┌──────────────────┐        ┌──────────────────┐
        │  Supabase Auth   │        │ Supabase Postgres│
        │  (admin + subs)  │        │  (86 tabelas RLS)│
        └──────────────────┘        └────────┬─────────┘
                                             │
                ┌────────────────────────────┴─────────────┐
                │                                           │
                ▼                                           ▼
       ┌────────────────────┐                  ┌────────────────────┐
       │  pg_cron (56 jobs) │ ──────────────►  │ Edge Functions     │
       │  diário/semanal/    │   invoke         │ (99 functions Deno)│
       │  mensal/trimestral │                  └─────────┬──────────┘
       └────────────────────┘                            │
                                                          ├─► Gemini/Claude (resumos IA)
                                                          ├─► FireCrawl (scraping PDFs)
                                                          ├─► Apify (Actors)
                                                          ├─► IBGE/IMB-GO/SNIS (APIs)
                                                          ├─► TCM-GO/MP-GO (scrape)
                                                          ├─► INMET/Open-Meteo (clima)
                                                          ├─► Resend (emails)
                                                          └─► Receita Federal (CSV)
```

**Padrão sync típico**:
1. `pg_cron` dispara `invoke_edge_function('sync-XXX')` no horário agendado
2. Edge Function busca dados da fonte externa
3. Insere/atualiza tabela Supabase com `ON CONFLICT DO UPDATE`
4. Loga em `sync_log` (sucesso/erro/N de rows afetadas)
5. (Opcional) Dispara `summarize-XXX` IA pra gerar resumo do conteúdo
6. Front-end Next.js usa `unstable_cache` com `revalidate: 3600` pra cachear queries

---

## 4. Database — 86 tabelas

### 4.1 Por categoria

#### Política / Câmara / Vereadores (15 tabelas)
- `vereadores` — 11 vereadores ativos
- `atuacao_parlamentar` — 647 indicações/moções/requerimentos
- `presenca_sessoes` — 511 registros de presença
- `votacoes` — 0 (em coleta)
- `projetos` — 5 PLs (apenas 3 do mandato 2025-2028 conforme dado oficial Câmara)
- `camara_atos`, `camara_atas_texto`, `camara_contratos`, `camara_licitacoes`
- `camara_despesas` (4.429 rows), `camara_diarias`, `camara_receitas`, `camara_servidores`
- `camara_financeiro`, `subscription_vereadores`

#### Executivo / Prefeitura (12 tabelas)
- `executivo` (prefeito + vice)
- `secretarias` (12 secretarias municipais)
- `servidores` (1.611), `remuneracao_servidores` (9.913), `remuneracao_mensal`
- `decretos` (253), `portarias` (64), `leis_municipais` (392)
- `lei_organica` + `lei_organica_artigos` (254)
- `prefeitura_noticias`, `obras` (16), `diarias` (289)

#### Transparência financeira (10 tabelas)
- `contratos` (6.150), `contratos_aditivos` (271), `contratos_risco` (1.103)
- `licitacoes` (20), `pncp_licitacoes`
- `arrecadacao_municipal` (75), `arrecadacao_comparativo` (30)
- `contas_publicas` (964), `despesas`, `transferencias_federais` (294)
- `emendas_parlamentares` (123)

#### Saúde (9 tabelas)
- `saude_indicadores` (561) — categorias: dengue, chik, zika, hiv, covid, mortalidade
- `saude_estabelecimentos` (61), `saude_equipes`, `saude_repasses`
- `farmacia_fotos` (22) — fotos das farmácias plantão
- `saude_hiv`, `saude_srag`, `cnj_processos` (judicialização saúde)

#### Educação (7 tabelas)
- `educacao_escolas` (27), `educacao_indicadores` (19), `educacao_ideb` (37)
- `educacao_matriculas` (7), `educacao_investimentos`, `educacao_programas`
- `inep_escolas_detalhe`, `pe_de_meia` (6), `ensino_superior_ies`, `ensino_superior_cursos`
- `cde_subsidios` (78)

#### Economia / Trabalho (4 tabelas)
- `economia_indicadores` (60) — PIB, CAGED, RAIS, MEIs, CNAEs, top empregadores, cruzamento
- `fornecedores_cnpj` (103) — empresas que vendem pra Prefeitura
- `beneficios_sociais` (76)

#### Infraestrutura / Ambiente (5 tabelas)
- `infraestrutura_indicadores` (78) — SNIS + ANEEL + ANATEL + LIRAa dengue
- `mapbiomas_uso_solo_anual` (560) — uso do solo 1985-2024
- `clima_historico_mensal` (101) — chuva via Open-Meteo
- `inmet_clima_diario` (17) — clima diário INMET
- `agro_indicadores` (83), `conab_precos` (7)

#### Segurança / Justiça (4 tabelas)
- `seguranca_indicadores` (38), `tjgo_processos` (9)
- `mpgo_atuacao`, `tcm_go_apontamentos` (9)
- `agm_go_publicacoes`

#### Mobilidade (2 tabelas)
- `veiculos_frota` (373), `detran_go_dados` (6)

#### Marketplace local (4 tabelas)
- `classificados` (6), `anuncios` (2)
- `zap_establishments` (420 — Compra e Venda MHS), `zap_suggestions` (6), `zap_backups` (32)

#### Conteúdo (3 tabelas)
- `noticias` (422), `resumos_ia_cache` (15)

#### Sistema (5 tabelas)
- `subscriptions` (7 newsletter), `email_digest_log` (53), `push_subscriptions` (1)
- `sync_log` (1.022), `sync_job_registry` (57)
- `admin_sessions`, `indicadores_municipais` (16)

#### TSE / Eleições (2 tabelas — em coleta)
- `tse_candidatos`, `tse_doadores`

### 4.2 Migrations

- **103 migrations** em `supabase/migrations/`
- Convenção: `YYYYMMDDHHMMSS_descricao.sql`
- Toda migration aplicada via `supabase db push` ou MCP `apply_migration`

---

## 5. Edge Functions — 99 functions + 56 crons

### 5.1 Categorização das functions

#### Syncs com cron agendado (56 jobs ativos)

```
Diário (3 jobs):
  sync-health-check-daily          0 10 * * *      → check geral
  notify-expiring-ads-daily        0 12 * * *      → avisar anúncios vencendo
  sync-inmet-clima-15min           */15 * * * *    → clima INMET 15-min

Semanal (24 jobs):
  send-weekly-digest-mon           0 13 * * 1      → digest semanal segunda
  sync-vereadores-weekly           0 3 * * 2       → vereadores terça
  sync-projetos-weekly             10 3 * * 2
  sync-atuacao-weekly              20 3 * * 2
  sync-votacoes-weekly             30 3 * * 2
  sync-presenca-sessoes-weekly     40 3 * * 2
  sync-presenca-atas-weekly        50 3 * * 2
  sync-presenca-centi-weekly       0 4 * * 2
  sync-camara-atos-weekly          10 4 * * 2
  sync-camara-financeiro-weekly    20 4 * * 2
  sync-decretos-weekly             30 4 * * 2
  sync-leis-municipais-weekly      30 4 * * 0      → domingo
  sync-portarias-weekly            40 4 * * 2
  sync-contratos-aditivos-mon/wed/fri  50 4 * * 1,3,5
  sync-saude-indicadores-weekly    15 5 * * 2
  sync-frota-veiculos-weekly       0 5 * * 1
  sync-clima-historico-weekly      0 4 * * 0       → domingo (Open-Meteo)
  sync-lei-organica-weekly         10 5 * * 0

Quinzenal (5 jobs):
  sync-beneficios-sociais-bw       0 3 5,20 * *    → dia 5 e 20
  sync-camara-servidores-bw        0 6 5,20 * *
  sync-executivo-secretarias-bw    45 6 5,20 * *
  sync-remuneracao-vereadores-bw   15 6 5,20 * *

Mensal (10 jobs):
  sync-despesas-monthly            0 3 1 * *
  sync-diarias-monthly             10 3 1 * *
  sync-obras-monthly               20 3 1 * *
  sync-fornecedores-cnpj-monthly   0 7 1 * *
  sync-pe-de-meia-monthly          30 3 15 * *
  sync-arrecadacao-monthly         45 3 15 * *
  sync-contas-publicas-monthly     0 4 15 * *
  sync-arrecadacao-comp-monthly    15 4 15 * *
  sync-transferencias-monthly      15 3 15 * *
  sync-prefeitura-mensal-3e6       30 6 3,6 * *

Mensal (1ª segunda do mês — pra dados que precisam ter terminado o mês):
  sync-economia-monthly            0 6 1-7 * 1
  sync-infraestrutura-monthly      0 7 1-7 * 1

Trimestral (10 jobs):
  sync-emendas-quarterly           0 5 1 1,4,7,10 *
  sync-agro-quarterly              0 5 1 1,4,7,10 *
  sync-cde-subsidios-quarterly     0 7 1 1,4,7,10 *
  sync-mortalidade-quarterly       30 6 1 1,4,7,10 *
  sync-saude-hiv-quarterly         45 5 1 1,4,7,10 *
  sync-saude-srag-quarterly        30 5 1 1,4,7,10 *
  sync-saude-sesgo-quarterly       15 6 1 1,4,7,10 *
  sync-saude-hiv-casos-quarterly   0 6 1 1,4,7,10 *
  sync-seguranca-quarterly         45 6 1 1,4,7,10 *

Semestral (3 jobs):
  sync-educacao-semiannual         15 5 1 1,7 *
  sync-saude-estab-semiannual      45 5 1 1,7 *
  sync-indicadores-home-semiannual 30 5 1 1,7 *
```

#### Functions sem cron (sob demanda — invocadas por API ou trigger)

**IA / Resumos** (15 functions):
- `summarize-{decreto,lei-municipal,portaria,obra,artigo,contrato,camara-contrato,licitacao,imposto,secretario,servidor,atuacao,lei-organica,generic}`

**Admin** (5 functions):
- `admin-login`, `admin-classificados`, `admin-zap-read`, `admin-zap-update`, `optimize-description`

**Auth / Email** (4):
- `auth-email-hook` — Supabase Auth → Resend
- `send-weekly-digest` — newsletter semanal
- `notify-expiring-ads`
- `unsubscribe-push`

**Push notifications** (1):
- `send-push`

**Pagamentos** (1):
- `create-donation` — PIX donations

**Utilidades** (8):
- `ai-search`, `transcribe-audio`, `consulta-placa`, `analyze-contrato-risco`
- `import-folha-manual`, `import-folha-xlsx`, `parse-folha-md`
- `parse-lei-organica`, `extract-lei-organica-pdf`
- `batch-categorize-leis`, `enrich-contratos`, `enrich-camara-contratos`
- `suggest-category`, `sitemap-classificados`, `backup-zap-mhs`

### 5.2 Padrão de Edge Function (template)

```typescript
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (_req) => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);
  const start = Date.now();
  let inserted = 0, updated = 0, errors = 0;

  try {
    // 1. Fetch dados da fonte externa
    const data = await fetchFromExternalAPI();

    // 2. Upsert no Supabase
    for (const row of data) {
      const { error } = await supabase
        .from("tabela_destino")
        .upsert(row, { onConflict: "chave_unica" });
      if (error) errors++; else inserted++;
    }

    // 3. Log
    await supabase.from("sync_log").insert({
      function_name: "sync-XXX",
      status: errors > 0 ? "partial" : "success",
      rows_affected: inserted + updated,
      error_count: errors,
      duration_ms: Date.now() - start,
    });

    return Response.json({ ok: true, inserted, updated, errors });
  } catch (e) {
    await supabase.from("sync_log").insert({
      function_name: "sync-XXX",
      status: "error",
      error_message: String(e),
      duration_ms: Date.now() - start,
    });
    return Response.json({ ok: false, error: String(e) }, { status: 500 });
  }
});
```

---

## 6. Páginas e Rotas — 30 rotas públicas

| Rota | Função | Componentes principais |
|---|---|---|
| `/` | Home — indicadores principais | `home/IndicadoresGrid`, `DengueAlert`, mapa |
| `/agro` | Agropecuária | `agro/AgroClient` — chuva, safra, MapBiomas |
| `/anuncie` | Vendas de anúncios | Form contato |
| `/arrecadacao` | Arrecadação municipal | Charts mensal/anual, comparativo cidades |
| `/atuacao-parlamentar` | Indicações/moções vereadores | Filtros por vereador |
| `/beneficios-sociais` | Bolsa Família, BPC, etc. | Cards + série temporal |
| `/camara` | Câmara Municipal | `CamaraClient` — vereadores, transmissão, contratos |
| `/clima` | Clima histórico | `ClimaClient` — chuva mensal |
| `/coleta-lixo` | Cronograma coleta | Cards por bairro |
| `/comparador` | Comparador vs cidades vizinhas | PIB, salário, indicadores |
| `/compra-e-venda` | Marketplace local (MHS) | `ClassificadosClient` — listagem + mapa |
| `/compra-e-venda/[id]` | Detalhe anúncio | `AnuncioDetalheClient` |
| `/contatos` | Telefones úteis | Lista por categoria |
| `/dados-mhs` | Hub de navegação | Cards pra todas seções |
| `/economia` | PIB + CAGED + RAIS | `economia/EconomiaPanel` (10 painéis) |
| `/educacao` | IDEB + escolas | Charts |
| `/emendas` | Emendas parlamentares | Tabela + filtros |
| `/indicadores` | Indicadores municipais home | Cards |
| `/infraestrutura` | SNIS + ANEEL + ANATEL + dengue | `infraestrutura/InfraestruturaPanel` (11 painéis) |
| `/meio-ambiente` | MapBiomas + análise | `meio-ambiente/IndicadoresAmbientais` + `AnaliseAmbientalIntegrada` |
| `/noticias` | Feed de notícias | Lista paginada |
| `/plantao-farmacias` | Farmácias de plantão | Calendário + fotos |
| `/prefeitura` | Prefeitura | `PrefeituraClient` — secretarias, servidores, frota, obras, decretos |
| `/privacidade` | Política privacidade | Estático |
| `/saude` | Saúde — DataSUS | `SaudeClient` — arboviroses, mortalidade, HIV, COVID |
| `/seguranca` | Segurança pública | `SegurancaClient` — crimes |
| `/sobre` | Sobre o site | Estático |
| `/vereadores` | Lista vereadores | Cards |
| `/vereadores/[slug]` | Perfil vereador | SSR com dados completos |
| `/zap-mhs` | Compra e Venda MHS | Mapa Leaflet + estabelecimentos |
| `/admin` | Painel admin | Auth |

**Sitemap dinâmico**: `/sitemap.xml` (gerado via `src/app/sitemap.ts`)
**Robots**: `/robots.txt` (gerado via `src/app/robots.ts`)
**Sub-sitemap**: `/sitemap-classificados.xml` (Edge function)

---

## 7. Camadas de Dados

### 7.1 `src/lib/data/` — Server-side fetchers (cached)

Funções com `import "server-only"` + `unstable_cache(...)`:
```
camara.ts       — atos, contratos, despesas, vereadores
clima.ts        — chuva mensal, INMET diário
economia.ts    — PIB, CAGED, RAIS, MEIs, helpers
home.ts        — indicadores municipais
infraestrutura.ts          — server fetcher
infraestrutura-client.ts   — helpers puros (importável em client)
listings.ts    — classificados
meio-ambiente.ts — MapBiomas + cruzamentos
prefeitura.ts  — secretarias, servidores, frota
saude.ts       — arboviroses, mortalidade, HIV, COVID
setores.ts     — agro
vereadores.ts  — perfis
```

### 7.2 `src/data/` — Client-side helpers (sem cache server)

```
agroApi.ts, arrecadacaoApi.ts, beneficiosSociaisApi.ts, camaraApi.ts
cdeApi.ts, contratosAditivosApi.ts, educacaoApi.ts, homeApi.ts
plantaoFarmacias.ts, prefeituraApi.ts, saudeApi.ts, segurancaApi.ts
api.ts (genérico)
```

### 7.3 `src/lib/seo.ts` — Helpers SEO

- `pageMetadata()` — gera Next.js Metadata com OG/Twitter cards
- `breadcrumbJsonLd()` — schema BreadcrumbList
- `datasetJsonLd()` — schema Dataset (pra cada página com dados)
- `articleJsonLd()` — schema Article (pra notícias)
- `faqJsonLd()` — schema FAQPage (estratégico pra GEO/AI Overviews)

---

## 8. Fontes de Dados Externas

### 8.1 Já integradas (com edge function)

| Fonte | Tipo | Edge function | Frequência |
|---|---|---|---|
| **TCM-GO** | scraping (FireCrawl + Apify) | `sync-tcm-go-morrinhos` | semanal |
| **Centi (Câmara)** | API REST | `sync-camara-*`, `sync-presenca-centi` | semanal |
| **Site Prefeitura** | scraping | `sync-prefeitura-diaria`, `sync-prefeitura-mensal` | diário |
| **Câmara Municipal site** | scraping | `sync-vereadores`, `sync-projetos`, `sync-atuacao` | semanal |
| **AGM-GO Diário Oficial** | scraping (em coleta) | `sync-leis-municipais` | semanal |
| **CNJ DataJud** | API REST | `sync-cnj-datajud` | semanal |
| **TJ-GO + MP-GO** | scraping | `sync-tjgo-processos`, `sync-mpgo-atuacao` | semanal |
| **DataSUS TabNet** | scraping URL params | `sync-saude-*` (8 functions) | semanal/trimestral |
| **INEP Censo Escolar** | CSV manual | `sync-inep-escolas` | anual |
| **PNCP (Lic. Federal)** | API REST | `sync-pncp-licitacoes` | diário |
| **TSE Dados Abertos** | API CSV | `sync-tse-eleicoes` | trimestral |
| **INMET API** | API REST | `sync-inmet-clima` | 15min |
| **Open-Meteo Archive** | API REST | `sync-clima-historico` | semanal |
| **MapBiomas** | XLSX manual | (importação manual) | anual |
| **CONAB** | scraping | `sync-conab-precos` | semanal |
| **DETRAN-GO** | scraping | `sync-detran-go` | mensal |
| **IBGE Cidades** | API + scraping | `sync-indicadores-home` | semestral |
| **IMB-GO Boletins** | PDF download | (manual) | anual |
| **MTE/CAGED Power BI** | scraping | (em desenvolvimento — `sync-economia-mensal`) | mensal |
| **RAIS PDET** | manual | (parser CSV pendente) | anual |
| **Receita Federal CNPJ** | CSV download | `sync-fornecedores-cnpj` | mensal |
| **SNIS** | manual + agregador Instituto Água e Saneamento | (manual) | anual |
| **ANEEL Tarifas** | scraping | (manual) | trimestral |
| **ANATEL Cobertura** | scraping | (manual) | semestral |
| **Receita Federal** | CSV mensal | `sync-fornecedores-cnpj` | mensal |
| **Plantão Farmácias** | manual + fotos Sec. Saúde | (admin manual) | mensal |
| **Resumos IA** | Gemini/Claude | `summarize-*` (15 functions) | sob demanda |

### 8.2 Documento de referência

`docs/INTEGRACOES_DADOS_PUBLICOS.md` — plano detalhado fonte por fonte com prioridade, padrão técnico e valor pro produto.

---

## 9. Email + DNS

### 9.1 Configuração atual `morrinhos.ai` (configurado em 07/05/2026)

**Domínio**: `morrinhos.ai` — Hostinger (registrado ~mar/2026)
**Mailbox**: `contato@morrinhos.ai` — Hostinger Business Email (Starter)
**Envio em massa**: Resend (conta exclusiva `contato@morrinhos.ai`)

### 9.2 Records DNS no Hostinger

```
A     @                                  76.76.21.21              (Vercel)
A     www                                76.76.21.21
MX    @                                  5 mx1.hostinger.com.
MX    @                                  10 mx2.hostinger.com.
TXT   @                                  v=spf1 include:_spf.mail.hostinger.com ~all
TXT   @                                  google-site-verification=...
TXT   _dmarc                             v=DMARC1; p=none; rua=mailto:contato@morrinhos.ai; ...
CNAME hostingermail-a._domainkey         hostingermail-a.dkim.mail.hostinger.com.
CNAME hostingermail-b._domainkey         hostingermail-b.dkim.mail.hostinger.com.
CNAME hostingermail-c._domainkey         hostingermail-c.dkim.mail.hostinger.com.
TXT   resend._domainkey                  p=MIGfMA0...                (DKIM Resend)
MX    send                               10 feedback-smtp.sa-east-1.amazonses.com.
TXT   send                               v=spf1 include:amazonses.com ~all
```

### 9.3 Resend setup

- Conta: `contato@morrinhos.ai` (exclusiva, criada 07/05/2026)
- Domain ID: `9c197b4c-8b6d-4bf4-a3c4-6b1b7477e0ee`
- Region: `sa-east-1` (São Paulo)
- API key produção: `re_74ztuwyg...` (restricted, só envia)
- Status: `verified`
- IndexNow key: hospedada em `/46a581837ee2463ea50d40b6895646bc.txt`

### 9.4 Edge functions usando email

- `auth-email-hook` (v14): Supabase Auth → Resend (signup, recovery, magic-link, invite, email-change, reauthentication)
- `send-weekly-digest` (v13): newsletter semanal pra subscribers (`subscriptions` tabela)
- `notify-expiring-ads`: avisa anunciantes quando anúncio vai vencer

---

## 10. SEO + GEO

### 10.1 Schema.org JSON-LD (estratégia agressiva pra GEO)

7 schemas principais por página relevante:
- `Organization` (em `layout.tsx` global)
- `WebSite` com `SearchAction` (sitelinks searchbox)
- `Dataset` (cada página com dados — saude, economia, infraestrutura, etc.)
- `Article` (notícias, decretos, leis)
- `FAQPage` (golden ticket pra AI Overviews)
- `BreadcrumbList`
- `Speakable` (voice/AI)

### 10.2 Meta tags

- Title otimizado (≤60 chars) com keyword + ano + brand
- Description com keyword + ano + CTA (≤155 chars)
- OG completo + Twitter Card
- Canonical explícito
- Robots: `index,follow,max-image-preview:large,max-snippet:-1`
- hreflang `pt-BR` + `x-default`

### 10.3 Sitemap.xml

`src/app/sitemap.ts` gera dinamicamente com:
- Todas as 30 rotas estáticas
- Vereadores (`/vereadores/[slug]` × 11)
- Anúncios (`/compra-e-venda/[id]` — paginação)

### 10.4 Robots.txt

`src/app/robots.ts`:
- Allow `/`
- Disallow `/admin`, `/api`
- Sitemap reference

### 10.5 IndexNow

Chave reutilizável: `46a581837ee2463ea50d40b6895646bc`
- Hospedada em `/public/46a581837ee2463ea50d40b6895646bc.txt`
- Submeter URLs novas via curl pra `api.indexnow.org/indexnow`

### 10.6 LLMs.txt

`/public/llms.txt` + `/public/llms-full.txt` — sitemap legível por modelos de linguagem (boas práticas emergentes)

---

## 11. Custos Mensais

| Item | Custo |
|---|---|
| Domínio `.ai` (Hostinger, 2 anos) | ~R$ 600 / 24 = R$ 25/mês |
| Hostinger Business Email | R$ 95/12 = R$ 8/mês |
| Vercel | $0 (free tier suporta) ou $20/mês Pro |
| Supabase Pro (sa-east-1) | $25/mês |
| Resend | $0 (free tier 3k emails/mês) |
| Sentry | $0 (free tier) |
| Gemini API (resumos IA) | ~$5-10/mês (varia com volume) |
| FireCrawl | $19/mês plano starter |
| Apify | ~$5/mês conforme uso |
| **Total mínimo** | **~$60-70/mês** ou ~R$ 350-400/mês |

---

## 12. Passo a Passo — Criar Morrinhos.AI

### 12.1 Pré-requisitos

- [ ] Conta Hostinger (já tem)
- [ ] Conta Vercel (já tem)
- [ ] Conta Supabase (já tem — criar projeto novo)
- [ ] Conta Resend nova exclusiva pra Morrinhos (registrar com `contato@morrinhos.ai`)
- [ ] Acesso aos MCPs

### 12.2 Etapas (~3-5 dias para MVP, 30-60 dias pra paridade total)

#### Dia 1 — Setup base

1. **Registrar domínio `morrinhos.ai`** no Hostinger
   ```bash
   # Via MCP Hostinger
   mcp__hostinger-mcp__domains_purchaseNewDomainV1
   ```

2. **Criar projeto Supabase** "Morrinhos.Ai" em `sa-east-1` (São Paulo)
   ```bash
   mcp__86390b15__create_project --name "Morrinhos.Ai" --region "sa-east-1"
   ```

3. **Clonar repo Morrinhos pra novo `morrinhos-next`**:
   ```bash
   gh repo create gianlucaferro/morrinhos-next --private --clone
   cp -r morrinhos-next/. morrinhos-next/
   cd morrinhos-next
   rm -rf .next .vercel node_modules .git
   git init && git add -A && git commit -m "init: clone from morrinhos-next"
   gh repo create gianlucaferro/morrinhos-next --source=. --remote=origin --push
   ```

4. **Setup Vercel** + conectar repo `morrinhos-next`
   - Env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Domain: `morrinhos.ai`

5. **Configurar email Hostinger Business** + Resend (mesma sequência que fizemos pro Morrinhos):
   - DNS: A, MX, SPF, DKIM, DMARC
   - Resend conta exclusiva
   - Supabase secret `RESEND_API_KEY`

#### Dia 2 — Mass rename (Morrinhos → Morrinhos)

6. **Substituir 19 ocorrências hardcoded de `5213806`** por `5213806`
   ```bash
   # CUIDADO: 5213806 é o código IBGE correto pra Morrinhos (NÃO 5213509)
   grep -rl "5213806" src/ supabase/functions/ | xargs sed -i '' 's/5213806/5213806/g'
   ```

7. **Substituir 212 ocorrências de "morrinhos"** (case-insensitive)
   ```bash
   # Trocar por "morrinhos" preservando capitalização
   grep -rli "morrinhos" src/ supabase/functions/ | while read f; do
     sed -i '' \
       -e 's/Morrinhos/Morrinhos/g' \
       -e 's/morrinhos/morrinhos/g' \
       -e 's/MORRINHOS/MORRINHOS/g' \
       "$f"
   done
   ```

8. **Atualizar `src/lib/seo.ts`** — `SITE_URL`, descrições, brand
9. **Atualizar `next-config.ts`** se houver allowed image hosts
10. **Atualizar Schema.org Organization** em `src/app/layout.tsx`
11. **Trocar OG image** + favicon (`public/icon-192.png`, `public/og-image.png`, `public/hero-morrinhos.webp` → `hero-morrinhos.webp`)

#### Dia 3 — Database + migrations

12. **Aplicar 103 migrations** no novo projeto Supabase Morrinhos
    ```bash
    cd morrinhos-next
    supabase link --project-ref <novo-project-ref>
    supabase db push
    ```

13. **Atualizar comparativo de cidades vizinhas**
    - Em `src/lib/data/economia.ts`, função `getPibComparativo`:
    - Pra Morrinhos: Hidrolândia, Bela Vista, Pontalina, Cristianópolis, Cromínia
    - Pra **Morrinhos**: Caldas Novas, Pontalina, Água Limpa, Marzagão, Rio Quente, Goiatuba

#### Dia 4-5 — Dados específicos de Morrinhos

14. **Rodar todos os syncs pra popular dados**:
    ```bash
    # No painel Supabase → Functions → Invoke
    # Ou via curl com service role key
    for fn in sync-vereadores sync-leis-municipais sync-decretos ...; do
      curl -X POST "https://<project-ref>.supabase.co/functions/v1/$fn" \
        -H "Authorization: Bearer $SERVICE_ROLE_KEY"
    done
    ```

15. **Buscar dados manuais pra Morrinhos** que não vêm de API:
    - SNIS Morrinhos (cobertura água/esgoto/lixo)
    - ANEEL/Equatorial Goiás (Morrinhos atendida)
    - Top empregadores de Morrinhos (Econodata)
    - PIB 2021 vizinhos (IMB-GO Boletim)
    - Plano de Contingência Dengue Morrinhos (PDF prefeitura)

16. **Adaptar URLs hardcoded de scrapers** pra Morrinhos:
    - TCM-GO: tem painel por município
    - Centi (Câmara Morrinhos): URL diferente — precisa investigar se Morrinhos usa Centi
    - Site Prefeitura: `morrinhos.go.gov.br`

#### Semana 2-4 — Refinamento + paridade

17. Rever cada uma das **30 rotas** + ajustar texto/copy específico de Morrinhos
18. Configurar **DNS records** + testar email
19. **SEO setup**: Google Search Console, Bing, IndexNow key
20. **Setup analytics**: Plausible ou PostHog
21. **Newsletter de imprensa**: identificar jornalistas de Morrinhos pra warmup

### 12.3 Coisas que vão exigir trabalho manual

- **Centi pode não cobrir Morrinhos** — verificar e talvez precisar de scraper customizado
- **Atas da Câmara** — Morrinhos pode ter sistema próprio
- **Site Prefeitura layout diferente** — adaptar selectors do scraper
- **Vereadores** — investigar se Morrinhos tem 11 vereadores ou outro número
- **Plano Diretor / Lei Orgânica** — PDF próprio de Morrinhos
- **MapBiomas + Open-Meteo** — dados georreferenciados, basta trocar lat/long

---

## 13. Adaptações Específicas Morrinhos → Morrinhos

### 13.1 Identidade do município

| Campo | Morrinhos | Morrinhos |
|---|---|---|
| **Código IBGE** | 5213806 | **5213806** ⚠️ (NÃO 5213509) |
| **Domínio** | morrinhos.ai | morrinhos.ai |
| **População 2022** | 25.132 | 51.351 |
| **Microrregião** | Meia Ponte | Meia Ponte (mesma!) |
| **PIB per capita** | ~R$ 31k | R$ 39,6 mil |
| **Distância capital** | 84 km | 124 km |
| **Cidade-âncora regional** | — | Polo regional (UEG, IF Goiano) |
| **Prefeito atual** | Claudiney Antônio Machado (até 2024) | Rogério Troncoso |
| **Câmara — vereadores** | 11 | A confirmar (geralmente 9-11 em cidades 50k) |
| **Vizinhos limítrofes** | Bela Vista de Goiás, Caldas Novas, Cristianópolis, Hidrolândia, Pontalina, Mairipotaba, Professor Jamil, Santa Cruz de Goiás | Caldas Novas, Pontalina, Água Limpa, Marzagão, Rio Quente, Goiatuba (parte) |
| **Site oficial Prefeitura** | morrinhos.go.gov.br | morrinhos.go.gov.br |
| **Câmara — site** | camarademorrinhos.go.gov.br | A descobrir (provável `camaramorrinhos.go.gov.br` ou similar) |

### 13.2 Comparativo cidades (`getPibComparativo` em `src/lib/data/economia.ts`)

```typescript
// ANTES (Morrinhos):
const cidades = [
  { ibge: 5213806, nome: "Morrinhos", destaque: true },
  { ibge: 5209705, nome: "Hidrolândia" },
  { ibge: 5203302, nome: "Bela Vista de Goiás" },
  { ibge: 5217708, nome: "Pontalina" },
  { ibge: 5206305, nome: "Cristianópolis" },
  { ibge: 5206503, nome: "Cromínia" },
];

// DEPOIS (Morrinhos):
const cidades = [
  { ibge: 5213806, nome: "Morrinhos", destaque: true },
  { ibge: 5204903, nome: "Caldas Novas" },
  { ibge: 5217708, nome: "Pontalina" },
  { ibge: 5200209, nome: "Água Limpa" },
  { ibge: 5212501, nome: "Marzagão" },
  { ibge: 5218987, nome: "Rio Quente" },
];
```

### 13.3 Brand assets a substituir

```
public/icon-192.png             → logo Morrinhos
public/icon-512.png             → logo Morrinhos
public/favicon.png              → favicon Morrinhos
public/favicon.ico              → favicon Morrinhos
public/og-image.png             → OG 1200x630 Morrinhos
public/hero-morrinhos.webp    → hero-morrinhos.webp
public/manifest.json            → name: Morrinhos.AI, short_name: Morrinhos, etc.
src/app/layout.tsx              → Schema Organization + URLs
src/lib/seo.ts                  → SITE_URL = "https://morrinhos.ai"
```

### 13.4 Email setup (replicar 1:1 o que fizemos pro Morrinhos)

Sequência idêntica:
1. Comprar domínio `morrinhos.ai` no Hostinger
2. Criar mailbox `contato@morrinhos.ai` no Hostinger Business Email
3. Adicionar DNS records (Hostinger Email DKIM + SPF + DMARC)
4. Criar conta Resend exclusiva com email `contato@morrinhos.ai`
5. Adicionar domínio `morrinhos.ai` no Resend (sa-east-1)
6. Adicionar DKIM Resend nos DNS Hostinger
7. Trigger verify
8. Salvar API key restricted no 1Password (item "Resend Morrinhos")
9. Setar `RESEND_API_KEY` nos secrets Supabase
10. Deploy edge functions `auth-email-hook` + `send-weekly-digest`

---

## 14. Diferenças Estruturais Esperadas

### 14.1 Vantagens de Morrinhos vs Morrinhos

- **População 2× maior** (51k vs 25k) → mais dados, mais usuários
- **Polo de educação superior** (UEG, IF Goiano, Faculdade Quirinópolis) → seção dedicada `/educacao-superior`
- **Caldas Novas vizinha** (turismo) → seção `/turismo` ou `/economia` enriquecida
- **Mais empresas ativas** → top empregadores mais robusto

### 14.2 Desafios extras pra Morrinhos

- **Câmara pode não usar Centi** — verificar e talvez precisar scraper próprio
- **Site Prefeitura** layout diferente — selectors customizados
- **Plano Diretor pode ser diferente** — Morrinhos tem mais setores/bairros
- **Coleta de lixo** — frequência por bairro pode ser diferente (mais bairros)

### 14.3 Coisas que NÃO mudam

- Stack 100% portável: Next.js 16, Supabase, Vercel, Resend
- 86 tabelas Supabase: schema idêntico, só dados mudam
- 99 edge functions: lógica genérica (filtra por código IBGE)
- 30 rotas: mesmas seções
- 56 crons: mesmas frequências

### 14.4 Estimativa de tempo realista

| Etapa | Tempo |
|---|---|
| Setup base (clone + DNS + Vercel + Supabase) | 1 dia |
| Rename Morrinhos → Morrinhos | 0,5 dia |
| Aplicar migrations + ajustar comparativo cidades | 0,5 dia |
| Rodar todos os syncs + corrigir scrapers que falharem | 3-5 dias |
| Buscar dados manuais (SNIS, ANEEL, dengue) | 2-3 dias |
| Refinamento copy + brand | 2 dias |
| Setup SEO + analytics + email | 1 dia |
| **MVP (publicar)** | **10-15 dias** |
| Paridade total com Morrinhos | 30-60 dias |

---

## 15. Checklist Final pra começar Morrinhos.AI

```
[ ] Comprar domínio morrinhos.ai no Hostinger
[ ] Criar projeto Supabase "Morrinhos.Ai" em sa-east-1
[ ] Criar conta Resend exclusiva (contato@morrinhos.ai)
[ ] Clonar morrinhos-next como morrinhos-next no GitHub
[ ] Criar projeto Vercel + conectar repo + setar env vars
[ ] Mass rename Morrinhos → Morrinhos (script sed)
[ ] Substituir 5213806 → 5213806
[ ] Aplicar 103 migrations no novo Supabase
[ ] Atualizar getPibComparativo com vizinhos de Morrinhos
[ ] Trocar brand assets (logo, favicon, OG image, hero)
[ ] Configurar DNS Hostinger (Vercel A + MX + SPF + DKIM + DMARC)
[ ] Verificar domínio no Resend
[ ] Setar RESEND_API_KEY no Supabase secret
[ ] Deploy edge functions
[ ] Rodar todos os syncs manualmente pra popular dados iniciais
[ ] Configurar pg_cron com 56 jobs (script SQL)
[ ] Configurar Google Search Console + IndexNow
[ ] Setup Plausible/PostHog analytics
[ ] Identificar e fazer warmup de jornalistas locais de Morrinhos
[ ] Publicar e divulgar
```

---

**Última atualização**: 2026-05-07 — gerado durante chat de migração Resend pro Morrinhos.AI.

Versionar este documento conforme o blueprint evoluir.

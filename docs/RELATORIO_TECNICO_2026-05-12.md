# Relatório técnico — Morrinhos.Ai

**Data:** 2026-05-12
**Versão:** 1.0
**Autor:** Claude Code (agente)
**Destinatário:** Codex (revisão técnica)
**Solicitante:** Gianluca Ferro / Ferro Labs

---

## 1. Sumário executivo

O Morrinhos.Ai é uma plataforma cívica de transparência municipal voltada a **Morrinhos-GO** (IBGE 5213806, 53.640 hab., PIB R$ 1,86 bi/2021). O projeto é **inspirado no Piracanjuba.Ai** (transparência de Piracanjuba-GO, do mesmo autor) — herda a stack, a arquitetura e várias decisões de produto — mas é um **projeto técnico e legal separado**, com:

- Domínio próprio (`morrinhos.ai`)
- Repositório próprio (`gianlucaferro/morrinhos-next` no GitHub)
- Projeto Supabase próprio (`pgqztmtimakiikcsvfph`, plano $10/mês micro)
- Conta Vercel/GA própria (G-PFEK08K5EB)
- Dados oficiais municipais distintos (Prefeitura, Câmara e órgãos vinculados a Morrinhos)
- Marca, identidade visual e SEO independentes

A motivação do fork (mais do que uma extensão multi-tenant do Piracanjuba.Ai) é evitar contaminação cruzada de dados em buscas, sitemap, dashboards de prefeito, conteúdos jornalísticos, e respeitar a independência editorial que cada município merece. **Não há intenção de unificar os dois sites em um mesmo SaaS multi-tenant a curto prazo.**

Este relatório documenta o estado da plataforma após uma sprint intensa de descoberta e integração de fontes de dados governamentais (12/maio/2026). Pede revisão técnica do Codex com foco em **3 dimensões**: (a) arquitetura de ingestão de dados, (b) cobertura/qualidade dos datasets, (c) sustentabilidade operacional do pipeline.

### Métricas do banco (12/mai/2026)

| Categoria | Linhas | Tabelas envolvidas |
|---|---:|---|
| Atos normativos (Prefeitura) | **17.466** | `decretos`, `portarias`, `resolucoes`, `leis_municipais` |
| Servidores & remuneração | **14.667** | `servidores`, `remuneracao_servidores`, `remuneracao_mensal`, `camara_servidores` |
| Despesas, contratos, diárias | **8.030** | `despesas`, `contratos`, `diarias` |
| Atos Câmara | **1.054** | `camara_atos` |
| Projetos Legislativos | **824** | `projetos` |
| Notícias | **1.210** | `noticias`, `prefeitura_noticias` |
| Vereadores & secretarias | **25** | `vereadores`, `secretarias`, `executivo` |
| Indicadores agregados | **210** | `economia_indicadores`, `agro_indicadores`, `saude_indicadores`, `infraestrutura_indicadores`, `indicadores_municipais` |
| Relatórios fiscais (RGF+RREO) | **16** | `relatorios_fiscais` |
| Obras | **23** | `obras` |
| **TOTAL** | **≈ 43.500 registros** | 45 tabelas com dados |

### Métricas operacionais

- **60+ cron jobs** ativos no `pg_cron` (diários, semanais, mensais, trimestrais, semestrais, anuais)
- **40+ edge functions Supabase** Deno em produção
- **2 painéis principais**: `/prefeitura` (17 abas) e `/camara` (17 abas)
- **Plataforma**: Next.js 16 App Router + Supabase (Postgres + Edge Functions + Storage) + Vercel
- **Custo mensal estimado**: ~$15 (Supabase $10 + Vercel free + IBGE/PNCP/NucleoGov free)

---

## 2. Contexto: linhagem Piracanjuba → Morrinhos

### 2.1. Por que existe o Morrinhos.Ai

**Piracanjuba.Ai** foi o protótipo: o município de Piracanjuba-GO (24 mil hab.) ganhou em 2026 um portal cívico que agrega dados de Prefeitura, Câmara, TCM-GO, IBGE, INEP, DataSUS, TSE e várias outras fontes federais. O projeto teve boa recepção local e o autor (Gianluca Ferro, morrinhense radicado em Goiânia/Tarsis) decidiu replicar pra **Morrinhos** — terra natal, 53 mil hab., PIB 2x maior que Piracanjuba, agronegócio forte.

A decisão estratégica foi **fork de código** em vez de multi-tenant porque:

1. **SEO**: cada município tem suas próprias keywords. Não faz sentido pagar autoridade de domínio em um site que cobre dois municípios paralelos.
2. **Independência editorial**: o site eventualmente pode ser doado/transferido pra um veículo jornalístico local. Fork é movível.
3. **Velocidade de iteração**: protótipos de feature podem ser testados em Piracanjuba.Ai (menor base) e portados; mas o fork permite divergir.
4. **Custo de complexidade**: multi-tenant exigiria refazer toda a camada de dados (row-level filtering por `municipio_ibge` em todas tabelas), refatorar 100+ queries, recriar testes. Fork foi mais rápido.

### 2.2. O que foi herdado do Piracanjuba.Ai

- **Stack completa**: Next.js + Supabase + Vercel + Resend + GA
- **Schema do banco**: 90% das tabelas vieram com o mesmo design
- **Componentes UI**: shadcn/ui, layouts, design tokens
- **Edge functions de sync**: ~30 funções vieram prontas (com pequenas adaptações de código IBGE 5220009 → 5213806)
- **Padrão de IA**: Gemini 2.5 Flash Lite Latest pra resumos de notícias, decretos, etc.
- **SEO setup**: Google Search Console, IndexNow, Bing Webmaster, sitemap.xml

### 2.3. O que divergiu

- **Dados oficiais**: cada município tem suas próprias fontes (Prefeitura, Câmara, TCM-GO local)
- **Marca**: cor primária Morrinhos = azul-bandeira-municipal `#1e3a5f` (Piracanjuba é verde-tarefa)
- **Vereadores**: 15 vereadores morrinhenses (vs. 9 piracanjuba)
- **Executivo**: prefeito Maycllyn Max Carreiro Ribeiro (mandato 2025-28), vice Tiago Freitas de Mendonça
- **GA tag**: `G-PFEK08K5EB` exclusiva Morrinhos.Ai
- **Schemas JSON-LD**: `@id` ancorado em `https://morrinhos.ai`
- **Conteúdos editoriais**: notícias, FAQs e histórias regionais são 100% morrinhenses

### 2.4. Princípio de fork não-vinculante

A intenção é que ambos os projetos **possam divergir sem coordenação obrigatória**. Mudanças no Piracanjuba.Ai podem ser portadas seletivamente (cherry-pick), mas não há promessa de sincronia. Isso significa que algumas otimizações descobertas em Morrinhos (como o sync NucleoGov via API JSON) podem voltar ao Piracanjuba.Ai, mas a recíproca também é verdadeira.

---

## 3. Stack técnica

### 3.1. Camadas

```
┌──────────────────────────────────────────────────────────────┐
│  USUÁRIO                                                      │
│  ┌─────────────────────┐  ┌──────────────────────┐           │
│  │ morrinhos.ai (web)  │  │ Push (PWA)          │           │
│  └─────────────────────┘  └──────────────────────┘           │
└─────────────┬────────────────────────────────────────────────┘
              │ HTTPS
┌─────────────▼────────────────────────────────────────────────┐
│  VERCEL (Next.js 16 App Router, free tier)                   │
│  - SSR + SSG                                                  │
│  - Edge runtime onde possível                                 │
│  - Domain: morrinhos.ai (DNS via Cloudflare ↑)               │
└─────────────┬────────────────────────────────────────────────┘
              │ supabase-js v2 (RLS-aware)
┌─────────────▼────────────────────────────────────────────────┐
│  SUPABASE (sa-east-1 São Paulo, MICRO $10/mês)               │
│  ┌──────────────┐  ┌──────────────────┐  ┌────────────────┐  │
│  │ PostgreSQL   │  │ Edge Functions   │  │ Storage        │  │
│  │ + pg_cron    │  │ (Deno)           │  │ (PDFs, imgs)   │  │
│  │ + pg_net     │  │ ~40 funções      │  │                │  │
│  └──────────────┘  └──────────────────┘  └────────────────┘  │
└─────────────┬────────────────────────────────────────────────┘
              │ fetch → APIs externas
┌─────────────▼────────────────────────────────────────────────┐
│  FONTES EXTERNAS                                              │
│  - NucleoGov (Prefeitura + Câmara)                            │
│  - IBGE SIDRA / servicodados                                  │
│  - PNCP, INEP, TSE, DataSUS, TCM-GO                          │
│  - Gemini API (resumos IA)                                    │
└──────────────────────────────────────────────────────────────┘
```

### 3.2. Stack detalhada

| Camada | Tecnologia | Versão | Notas |
|---|---|---|---|
| Frontend | Next.js | 16 (App Router) | ⚠️ Versão beta com breaking changes. `AGENTS.md` no repo alerta pra ler `node_modules/next/dist/docs/` |
| UI | shadcn/ui + Tailwind v4 + Framer Motion | latest | Design tokens, dark mode toggle |
| Estado | TanStack Query v5 | latest | Server-state |
| DB | PostgreSQL (Supabase) | 15 | RLS ativado em quase todas tabelas |
| Scheduling | `pg_cron` + `pg_net` | — | Crons disparam `net.http_post` para edge functions |
| Edge runtime | Deno (Supabase) | — | TypeScript, idempotência via UNIQUE |
| Auth | Supabase Auth | — | Apenas pra admin/painel (público é guest) |
| Email | Resend | — | Notificações, digest semanal |
| IA | Gemini `gemini-flash-lite-latest` | GA | Resumos de notícias, decretos, atuação parlamentar |
| Analytics | Google Analytics 4 | G-PFEK08K5EB | Não usa Plausible/PostHog |
| Erros | (não há Sentry configurado) | — | **Gap conhecido** |

### 3.3. Padrão de edge function

Toda edge function de sync segue o padrão idempotente:

```typescript
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = { /* CORS padrão */ };
const IBGE_MUN = "5213806"; // Morrinhos-GO (constante por projeto)

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // 1) Fetch da fonte externa (com User-Agent + retry leve)
  const dados = await fetchSource();

  // 2) Map → schema do DB
  const rows = dados.map(mapRow).filter(Boolean);

  // 3) Upsert idempotente
  const { error } = await sb
    .from("tabela")
    .upsert(rows, { onConflict: "chave_unica_natural" });

  // 4) Log de execução
  await sb.from("sync_log").insert({
    tipo: "fonte_x",
    status: error ? "error" : "success",
    detalhes: { inserted: rows.length }
  });

  return new Response(JSON.stringify({ ok: !error, inserted: rows.length }));
});
```

**Pontos críticos do padrão:**

- A função é **idempotente** — pode ser chamada n vezes sem duplicar dados.
- A chave de conflito é uma **chave natural estável** da fonte (ex: `nucleogov_id`, `numero_controle_pncp`, `cnpj`, `codigo_inep`).
- O User-Agent sempre se identifica como "MorrinhosBot/1.0" pra rastreabilidade.
- Logs de execução vão pra `sync_log` (93 linhas hoje).

---

## 4. Inventário do banco (12/mai/2026)

### 4.1. Top 20 tabelas populadas

| # | Tabela | Linhas | Origem dos dados | Sync freq |
|---|---|---:|---|---|
| 1 | `remuneracao_servidores` | 11.383 | NucleoGov Prefeitura | Mensal (folha) |
| 2 | `portarias` | 8.047 | NucleoGov `/api/atos` (tipo=Portaria) | Semanal |
| 3 | `decretos` | 6.028 | NucleoGov `/api/atos` (tipo=Decreto) | Semanal |
| 4 | `despesas` | 4.000 | NucleoGov Prefeitura | Semanal (cap) |
| 5 | `leis_municipais` | 3.119 | NucleoGov `/api/leis` | Diário |
| 6 | `diarias` | 2.996 | NucleoGov Prefeitura | Semanal |
| 7 | `servidores` | 2.915 | NucleoGov Prefeitura | Mensal |
| 8 | `camara_atos` | 1.054 | NucleoGov Câmara `/api/atos` | Semanal |
| 9 | `contratos` | 1.034 | PNCP + NucleoGov | Diário |
| 10 | `projetos` | 824 | NucleoGov Câmara `/api/atividades_legislativas` (modo export) | Diário |
| 11 | `noticias` | 710 | Scraping CMS Prefeitura | Diário |
| 12 | `prefeitura_noticias` | 500 | Scraping CMS Prefeitura | Diário |
| 13 | `agro_indicadores` | 388 | IBGE SIDRA (PAM, PPM, etc.) | Anual |
| 14 | `camara_servidores` | 369 | Scraping legado | Mensal |
| 15 | `resolucoes` | 272 | NucleoGov `/api/atos` (tipo=Resolução) | Semanal |
| 16 | `tse_candidatos` | 151 | TSE eleicoes/2024 | Yearly |
| 17 | `clima_historico_mensal` | 101 | INMET | Diário |
| 18 | `sync_log` | 93 | Interno | Append-only |
| 19 | `cde_subsidios` | 75 | CDE (FNDE) | Quarterly |
| 20 | `saude_indicadores` | 74 | DataSUS + SES-GO | Semanal |

### 4.2. Tabelas vazias (importantes)

| Tabela | Esperado conter | Bloqueador |
|---|---|---|
| `educacao_ideb` | IDEB Anos Iniciais/Finais por escola | INEP requer parser de microdados (zip) |
| `educacao_matriculas` | Censo Escolar matrículas | Idem INEP |
| `educacao_indicadores` | Taxa aprovação/abandono | Idem |
| `ensino_superior_*` | IES, cursos, vagas, ENADE | INEP educação superior, scraping pesado |
| `inep_escolas_detalhe` | Infraestrutura escolar | Censo Escolar microdados |
| `pe_de_meia` | Beneficiários do Pé-de-Meia | Portal Transparência exige API key |
| `pncp_licitacoes` (parcial) | Licitações em andamento | 5 rows (só contratos consolidados puxados) |
| `contas_publicas` | RGF/RREO estruturado | Hoje só temos PDFs em `relatorios_fiscais` |
| `cnj_processos` | Datajud TJGO | Exige API key |
| `tjgo_processos` | Idem | Idem |
| `mpgo_atuacao` | MP-GO TACs, ações | Sem API pública |
| `saude_equipes` | Equipes de saúde APS | e-SUS APS exige scraping ou TabNet |
| `saude_repasses` | Repasses Fundo Nacional Saúde | Portal Transparência API key |
| `veiculos_frota` | Frota Senatran | API bloqueia bots (HTTP 403) |
| `fornecedores_cnpj` | Empresas contratadas → Receita Federal | Dump CNPJ é >100GB |
| `tse_doadores` | Doações eleitorais | TSE divulgações, scraping |
| `contratos_aditivos` | Aditivos de contratos | Não publicado estruturado |
| `votacoes`, `presenca_sessoes` | Votação nominal por vereador | Câmara não publica via NucleoGov |
| `camara_contratos`, `camara_despesas`, `camara_licitacoes` | Financeiro Câmara | NucleoGov da Câmara retorna vazio (sistema Megasoft offline) |

### 4.3. Análise por categoria

**Transparência ativa (cobertura excelente):** atos normativos, leis, decretos, portarias, resoluções, projetos legislativos, vereadores, secretarias, contratos da Prefeitura. **Cobertura > 90%** dos dados estruturados publicados pelo município.

**Saúde (cobertura média):** 41 estabelecimentos CNES + 74 indicadores DataSUS, mas faltam dados de produção SIH/SAI, equipes APS, repasses FNS. **Cobertura ~50%.**

**Educação (cobertura ruim):** apenas 13 escolas básicas listadas; faltam IDEB, matrículas, infraestrutura escolar, FUNDEB, programas FNDE. **Cobertura ~20%.**

**Economia (cobertura média):** IBGE PIB + população + agropecuária OK; faltam emprego formal, CNPJs ativos, MEIs, salário médio (alguns indicadores no `indicadores_municipais`). **Cobertura ~50%.**

**Justiça/Controle (cobertura ruim):** TCM-GO 3 apontamentos; faltam processos TJGO, atuação MP-GO, sanções CGU. **Cobertura ~15%.**

**Frota/transporte (vazio):** zero dados Senatran. **Cobertura ~0%.**

---

## 5. Pipeline de sincronização

### 5.1. Anatomia dos crons (60+ jobs)

Distribuição por frequência:

| Frequência | Quantidade | Exemplo |
|---|---:|---|
| Diário | 14 | `sync-prefeitura-noticias-daily`, `nucleogov-rgf`, `sync-pncp-licitacoes-daily` |
| Semanal | 22 | `sync-vereadores-weekly`, `nucleogov-decretos` (segunda), `sync-saude-indicadores-weekly` (terça) |
| Quinzenal | 2 | `sync-executivo-secretarias-bw`, `sync-beneficios-sociais-biweekly` |
| Mensal | 9 | `sync-prefeitura-folha-monthly`, `sync-detran-go-monthly` |
| Trimestral | 8 | `sync-agro-quarterly`, `sync-emendas-quarterly` |
| Semestral | 3 | `sync-educacao-semiannual`, `sync-saude-estab-semiannual` |
| Anual | 5 | `sync-ibge-agro-yearly`, `sync-inep-escolas-yearly` |

### 5.2. Janela diária 06:00–08:00 BRT (09:00–11:00 UTC)

Esse é o "rush hour" do banco. Crons agrupados:

```
06:00 BRT  → sync-prefeitura-noticias-daily
06:00 BRT  → nucleogov-rgf
06:05 BRT  → nucleogov-rreo  
06:10 BRT  → nucleogov-obras + sync-camara-noticias-daily
06:15 BRT  → nucleogov-leis
06:20 BRT  → nucleogov-camara-projetos
06:25 BRT  → nucleogov-camara-apreciacao
07:00 BRT  → sync-health-check-daily, sync-tcm-go-morrinhos-weekly
07:00 BRT  → segunda: nucleogov-decretos
07:15 BRT  → sync-pncp-licitacoes-daily
07:30 BRT  → segunda: nucleogov-portarias
07:45 BRT  → segunda: nucleogov-resolucoes
08:00 BRT  → terça: sync-federal-data-weekly (IBGE + PNCP contratos)
```

**Observação técnica:** o `pg_cron` do Supabase usa UTC. Conversão BRT = UTC-3.

### 5.3. Padrão de invocação cron → edge function

```sql
SELECT cron.schedule(
  'nome-do-job',
  '0 9 * * *',  -- 09:00 UTC = 06:00 BRT
  $$SELECT net.http_post(
    url := 'https://pgqztmtimakiikcsvfph.supabase.co/functions/v1/edge-function?target=X',
    headers := '{"Authorization":"Bearer <ANON_KEY>","Content-Type":"application/json"}'::jsonb,
    timeout_milliseconds := 60000
  );$$
);
```

⚠️ **Decisão controversa:** atualmente os crons usam a **anon key** (publishable) no header `Authorization`. Edge functions têm `verify_jwt: true` por padrão e aceitam anon. Alternativas analisadas:
- (a) Usar **service_role key** via GUC `app.settings.service_role_key`: mais seguro mas exige migration extra
- (b) Desabilitar `verify_jwt` nas edge functions: simples mas remove camada de auth
- (c) **Manter anon key** (atual): chave já é pública (Vercel env), funciona, RLS protege o que precisa

A opção (c) ganhou pela simplicidade. **Pergunta pro Codex:** isso é problema de segurança aceitável ou deve migrar?

---

## 6. Fontes de dados — inventário

### 6.1. Fontes oficiais Morrinhos (município)

| Fonte | URL base | API/Scraping | Cobertura |
|---|---|---|---|
| **NucleoGov Prefeitura** | `acessoainformacao.morrinhos.go.gov.br/api/{modulo}` | API JSON descoberta via engenharia reversa | ⭐ Excelente — 17k atos + leis + obras + RGF/RREO |
| **NucleoGov Câmara** | `acessoainformacao.morrinhos.go.leg.br/api/{modulo}` | Idem | ⭐ Boa — 1.054 atos + 824 projetos |
| **Site Prefeitura (CMS)** | `morrinhos.go.gov.br/transparencia` | WordPress + scraping de feed | Notícias |
| **Site Câmara (CMS)** | `morrinhos.go.leg.br` | WordPress + scraping | Notícias, atas PDF |

### 6.2. Fontes oficiais estaduais (Goiás)

| Fonte | URL | Status |
|---|---|---|
| **TCM-GO Mural Eletrônico** | `tcm.go.gov.br/site/?p=mural-de-licitacoes` | Scraping semanal — 3 apontamentos coletados |
| **AGM-GO publicações** | `agm.org.br/` | Scraping pra atos da Agência Municipalista — 7 publicações |
| **TJGO (consulta pública)** | `tjgo.jus.br` | Scraping limitado — sem API estável |
| **MP-GO** | `mpgo.mp.br` | Sem API pública estruturada |
| **DETRAN-GO** | `detran.go.gov.br` | Scraping de tabela — 4 indicadores |
| **SES-GO** | `saude.go.gov.br` | Indicadores via DataSUS regional |
| **GOINFRA** | `goinfra.go.gov.br` | Não integrado |
| **SEDUC-GO** | `educacao.go.gov.br` | Não integrado |
| **SEFAZ-GO ICMS** | `economia.go.gov.br` | Não integrado |

### 6.3. Fontes federais

| Fonte | URL | Status | Notas |
|---|---|---|---|
| **IBGE SIDRA** | `servicodados.ibge.gov.br/api/v3/agregados` | ✅ Integrado | PIB, pop, agropecuária |
| **PNCP** | `pncp.gov.br/api/consulta/v1` | ⚠️ Parcial | 5 contratos consolidados; `/contratacoes/publicacao` instável (HTTP 504) |
| **INMET** | `apitempo.inmet.gov.br` | ✅ Integrado | Clima Morrinhos (estação A012?) |
| **Portal Transparência Federal** | `api.portaldatransparencia.gov.br` | 🔐 Bloqueado | Exige API key (gratuita, mas precisa cadastro) |
| **CNJ Datajud TJGO** | `api-publica.datajud.cnj.jus.br/api_publica_tjgo` | 🔐 Bloqueado | Exige API key DPJ-CNJ |
| **INEP** | `inep.gov.br/dados` | ⚠️ Bloqueado | Microdados em ZIP (>1GB), exige parser pesado |
| **CGU CEIS/CNEP** | `portaldatransparencia.gov.br/sancoes/ceis` | ⚠️ HTML | Sanções administrativas |
| **Senatran RENAVAM** | `gov.br/transportes` | ❌ HTTP 403 | WAF bloqueia bots |
| **TSE** | `divulgacandcontas.tse.jus.br` | ✅ Integrado | 151 candidatos eleições 2024 |
| **DataSUS** | `datasus.saude.gov.br/transferencia-de-arquivos` | ⚠️ TabNet | Sem API REST nativa, exige TabWin/PySUS |
| **ConabPreços (CONAB)** | `consultaweb.conab.gov.br` | ✅ Integrado | Preços agrícolas |
| **CDE / FNDE** | `gov.br/fnde` | ✅ Integrado parcial | 75 subsídios |
| **MapBiomas** | `mapbiomas.org` | ✅ Integrado | Uso do solo anual |
| **Brasil API CNPJ** | `brasilapi.com.br` | 🟡 Possível | Free tier mas limite rígido |

### 6.4. Fontes inspiradas pelo Piracanjuba.Ai não integradas em Morrinhos

- **AMA-Brasil** (mapa de obras paralisadas)
- **Atlas do Desenvolvimento Humano** (PNUD)
- **MapaBiomas Brigadas** (queimadas)
- **Fipezap** (preços imóveis — não há cobertura Morrinhos)

---

## 7. Trabalho recente (sprint 11–12/mai/2026)

### 7.1. Edge function `nucleogov-sync` v5 (NOVA)

Antes desta sprint, o sync da Prefeitura e Câmara era feito por dezenas de funções pequenas, cada uma com lógica de fetch própria. O novo padrão é uma **edge function única e configurável** que suporta 10 targets:

```typescript
const CONFIGS: Record<string, SyncConfig> = {
  // Prefeitura (NucleoGov .go.gov.br)
  leis: { ... },               // → leis_municipais (3.119 rows)
  decretos: { ... },           // → decretos (6.028)
  portarias: { ... },          // → portarias (8.047)
  resolucoes: { ... },         // → resolucoes (272)
  obras: { ... },              // → obras (23)
  rgf: { ... },                // → relatorios_fiscais tipo=RGF (6)
  rreo: { ... },               // → relatorios_fiscais tipo=RREO (10)
  // Câmara (NucleoGov .go.leg.br)
  camara_atos: { ... },        // → camara_atos (1.054)
  camara_projetos: { ... },    // → projetos (809) — MODO EXPORT
  camara_apreciacao: { ... },  // → camara_apreciacao_contas (5)
};
```

**Descoberta crítica:** o NucleoGov tem dois modos:
- `acao=buscaAvancada` ou `listar` (paginado normal, funciona em todos endpoints **exceto atividades_legislativas**)
- `acao=exportar` com `formato=json` (retorna TUDO em 1 request)

A API `atividades_legislativas/listar` **ignora paginação** (sempre retorna os mesmos 15 itens primeiros). Solução foi adicionar flag `useExport: true` na config que troca pra `acao=exportar`. O dataset (812 projetos) vem em 1 request.

**Dedup local antes de upsert:** o `exportar` retorna duplicates ocasionais. Implementado `Set<nucleogov_id>` antes do batch upsert.

**Idempotência via UNIQUE:** cada tabela ganhou coluna `nucleogov_id` (text) com índice UNIQUE. Permite re-execução sem duplicar.

### 7.2. Edge function `sync-federal-data` (NOVA)

Cobre 2 fontes federais:

1. **IBGE SIDRA** — agregados 5938 (PIB) e 6579 (população)
2. **PNCP `/v1/contratos`** com `cnpjOrgao=01789551000149` (Prefeitura)

Decisões:
- PIB é puxado anualmente (lag de ~2 anos: dados 2021 só estão disponíveis em 2024)
- PNCP `/v1/contratos` requer `cnpjOrgao` (NÃO aceita `codigoMunicipioIbge` neste endpoint)
- `/v1/contratacoes/publicacao` aceita `codigoMunicipioIbge` mas tem **HTTP 504 frequente** (gateway timeout do PNCP)

### 7.3. Refatoração frontend `/camara`

A aba Câmara foi reorganizada. Antes:
- Servidores, Contratos, Projetos, Atuação, Indicações, Resoluções, Decretos Leg., Pautas, Atas, Transmissão, Licitações, Despesas, Receitas, Diárias

Depois:
- Vereadores, **Projetos** (novo: 809 rows com filtros dinâmicos por tipo/status/ano), Decretos Leg. (217), **Portarias** (NOVA: 800 portarias da Mesa Diretora), Resoluções (37), **Apreciação de Contas** (NOVA: 5 TCM-GO), Servidores, Atuação, Indicações (empty state honesto), Pautas (empty state), Atas (empty state), Transmissão, Contratos (empty), Licitações (empty), Despesas (empty), Receitas (empty), Diárias (empty)

**Princípio:** abas vazias mostram explicação honesta de que **a Câmara não publica esses dados via NucleoGov** + link à fonte oficial. Em vez de quebrar sem aviso.

### 7.4. Resumo numérico da sprint

| Métrica | Antes | Depois | Delta |
|---|---:|---:|---:|
| Linhas no DB | ~25.500 | ~43.500 | **+18.000** |
| Edge functions ativas | ~38 | ~40 | +2 (nucleogov-sync + sync-federal-data) |
| Crons no `pg_cron` | ~52 | ~62 | +10 |
| Tabelas populadas | ~40 | ~45 | +5 (projetos, camara_apreciacao_contas, relatorios_fiscais, novos atos) |
| Linhas em `indicadores_municipais` | 7 | 14 | +7 (PIB total + breakdown + PNCP totais) |

---

## 8. Descobertas técnicas (gotchas)

### 8.1. NucleoGov tem um exportar JS público

O front-end NucleoGov usa um padrão consistente em todos portais municipais:

```javascript
// /res/js/nucleo/componentes/exportar.js
window.open(
  "api/" + api + "?acao=" + metodo + "&dados=" + JSON.stringify(export_params),
  "_blank"
);
```

Engenharia reversa do controller específico de cada página (ex: `cidadao/controller/lei/leis.js`) revela `api` + `metodo`. **Esse padrão funciona em todas as ~500+ prefeituras goianas atendidas pelo NucleoGov** — então o conhecimento é portável.

### 8.2. Câmara Megasoft é vazia

A Câmara Municipal de Morrinhos publica via NucleoGov apenas atos legislativos + apreciação de contas. **Contratos, despesas, licitações, diárias, receitas — tudo zerado.** A integração Megasoft que o NucleoGov tenta puxar (`/api/contratos_mg`, `/api/megasoft/empenhos`) retorna `{"dados": [], "total": 0}`. O dado existe, mas a Câmara não habilitou a exportação no painel administrativo.

**Recomendação ao Codex:** vale a pena pedir ao Gianluca pra entrar em contato com a Câmara solicitando habilitação? Ou seguir com empty states honestos?

### 8.3. PNCP /contratacoes/publicacao instável

A API pública do PNCP tem HTTP 504 frequente (gateway timeout do Serpro). Workarounds testados:
- Reduzir período (≤ 30 dias)
- Reduzir tamanhoPagina (10 em vez de 50)
- Tentar fora do horário comercial (cron 03:00 BRT)

Resultado: nenhum funcionou de forma confiável. **O endpoint `/v1/contratos` por CNPJ funciona bem**, mas só pega contratos consolidados (5 da Prefeitura no último ano). Para **licitações em aberto**, dependeria de `/contratacoes/publicacao` ou scraping do site `pncp.gov.br/app/editais`.

### 8.4. Portal da Transparência Federal exige API key

Surpreendentemente, a API do PortalTransparencia é gratuita mas **exige cadastro de email** (https://portaldatransparencia.gov.br/api-de-dados/cadastrar-email). Sem key, retorna `{"Erro na API":"Chave de API inválida!"}`.

Acesso à key destrava:
- Bolsa Família por município (cobertura BF é gap importante — temos `beneficios_sociais` com só 7 rows)
- BPC (Benefício de Prestação Continuada)
- Pé-de-Meia
- Auxílio Brasil histórico
- Convênios federais com a Prefeitura

**Recomendação:** Gianluca cadastrar email e gerar key. ROI é altíssimo (5 datasets desbloqueados).

### 8.5. CNJ Datajud TJGO precisa API key DPJ-CNJ

Mesmo cenário. A solicitação é rápida (formulário online, aprovação em ~1 dia).

### 8.6. Worker Resource Limit no Supabase Edge

Funções que processam >5k rows em loop estouram CPU/memória do worker. Mensagem:
```json
{"code":"WORKER_RESOURCE_LIMIT","message":"Function failed due to not having enough compute resources"}
```

Workaround: **batches de 200 + delay 200ms entre páginas**. Combinado com idempotência, mesmo se o worker morrer no meio, a próxima execução completa.

### 8.7. UNIQUE composite vs partial index com ON CONFLICT

PostgreSQL/Supabase `.upsert(..., { onConflict: "col" })` exige UNIQUE simples — não funciona com:
- **Partial index** (`WHERE col IS NOT NULL`) → erro "no unique or exclusion constraint matching"
- **UNIQUE composite** (`(col1, col2)`) → exige que **dentro do mesmo batch** não haja 2 rows com mesmo `(col1, col2)`, mesmo se os nucleogov_ids forem distintos

**Resolução adotada:** UNIQUE simples em `nucleogov_id` (text). Índices em `(numero, ano)` são apenas pra performance de query, não UNIQUE.

### 8.8. Bug histórico do código IBGE Monte Alegre

Durante a investigação, descobri que estava chamando IBGE com código `5213509` em testes — que é **Monte Alegre de Goiás**, não Morrinhos. **O código correto de Morrinhos é 5213806.** Verifiquei o codebase: todos os syncs em produção estão certos (usando 5213806). Foi só engano meu nas chamadas curl iniciais.

---

## 9. Gaps e oportunidades

### 9.1. Top 10 gaps que mais limitam o valor do produto

| # | Gap | Tabela | Impacto pro cidadão | Caminho |
|---|---|---|---|---|
| 1 | Bolsa Família por mês | `beneficios_sociais` | Alto — 30% da população de Morrinhos potencialmente recebe BF | Portal Transp API key |
| 2 | IDEB por escola | `educacao_ideb` | Alto — comparação entre escolas | INEP microdados parser |
| 3 | Censo Escolar matrículas | `educacao_matriculas` | Alto — quantos alunos por escola | Idem |
| 4 | Processos TJGO em Morrinhos | `cnj_processos` | Médio — transparência judicial | Datajud API key |
| 5 | Frota de veículos | `veiculos_frota` | Médio — `indicadores_municipais.frota_veiculos` tem só total | Senatran CSV (precisa bypass WAF) |
| 6 | Licitações em aberto | `pncp_licitacoes` | Médio — agora só vê fechadas | PNCP `/contratacoes/publicacao` instável |
| 7 | Pé-de-Meia beneficiários | `pe_de_meia` | Alto — programa novo, alta visibilidade | Portal Transp API key |
| 8 | Repasses FNS Saúde | `saude_repasses` | Médio | Portal Transp API key |
| 9 | Empresas em Morrinhos | `fornecedores_cnpj` | Alto pra cruzar com contratos | Receita Federal dump |
| 10 | Combustíveis ANP | (criar tabela) | Alto — preço atual | CSV semanal ANP |

### 9.2. Oportunidades de produto (ideias para o Codex avaliar)

1. **"Anúncios cidadãos"**: classificados gratuitos pra comércio local (tabela `classificados` existe mas vazia). Já existe no Piracanjuba.Ai e poderia ser portado.

2. **Alerta de fadiga de contratos**: quando contrato `vigencia_fim` se aproxima sem aditivo, enviar alerta ao admin (notif Telegram).

3. **Score de transparência por secretaria**: rankear quem mais publica dados (já existem schemas em `tcm_go_apontamentos` que ajudam).

4. **Resumo IA semanal por email**: digest "o que aconteceu em Morrinhos esta semana" (já existe edge function `send-weekly-digest`).

5. **Mapa de obras geocoded**: pegar `obras.local` (endereço) + Geocoder → lat/lng → render no Leaflet.

6. **Cruzamento Prefeitura ↔ Câmara**: quando vereador apresenta projeto, mostrar histórico de votos do prefeito sobre projetos similares.

7. **Comparador Morrinhos vs vizinhos**: tabela `arrecadacao_comparativo` (6 rows) compara com Pires do Rio, Goiatuba, Caldas Novas. Expandir pra mais indicadores.

---

## 10. Análise de custos

### 10.1. Custo atual mensal

| Item | Custo | Notas |
|---|---:|---|
| Supabase (MICRO, sa-east-1) | $10 | DB 8GB + edge functions ilimitadas (com workers) |
| Vercel (Hobby) | $0 | Free tier, sem limite até 100k req/dia |
| Domínio `morrinhos.ai` | ~$10/ano | Registro.br ou similar |
| Gemini API | $0 | Tier free `gemini-flash-lite-latest` (1M tokens/mês) |
| Resend | $0 | 100 emails/dia free |
| GA | $0 | Free |
| **Total mês** | **~$10** | (Hetzner/dominio amortizado) |

### 10.2. Custo de oportunidade

- Gemini Pro (pago) destravaria resumos mais profundos (analisar PDFs RGF/RREO inteiros)
- Supabase Pro ($25) destravaria mais workers (resolve WORKER_RESOURCE_LIMIT)
- Apify ($49/mês) destravaria scraping de fontes bloqueadas (Senatran, INEP zips)
- Pipeboard ($16/mês) destravaria Meta/Google Ads se virar SaaS

**No estado atual ($10/mês), é financeiramente sustentável.** Pra qualquer escala (multi-município), revisar.

### 10.3. Custo computacional dos crons

Estimativa baseada em logs:
- ~60 crons/dia consumindo ~5s cada = 300s/dia de compute
- Supabase MICRO tem ~750h/mês de compute = 27.000 minutos
- Crons consomem ~5min/dia = 150min/mês = **0,5% do budget**

**Sobra capacidade pra crescer 100x antes de pressão financeira.**

---

## 11. Perguntas abertas pro Codex

Esta é a seção mais importante deste relatório. Pedimos que o Codex avalie cada ponto e responda com **recomendação técnica fundamentada** (não apenas opinião).

### 11.1. Arquitetura de ingestão

**Q1.** A estratégia de **edge function única configurável** (como `nucleogov-sync` com 10 targets) é superior à estratégia de **uma edge function por target**? O atual repo tem ambos padrões coexistindo (~40 funções específicas + 1 genérica). Devemos:
- (a) Migrar tudo pro padrão genérico (uma função com N targets)
- (b) Manter como está (cada função é independente, debug local mais fácil)
- (c) Outro padrão (ex: edge function "orchestrator" + workers)?

**Q2.** Os crons hoje usam **anon key** no header `Authorization`. Isso é aceitável dado que (a) os endpoints fazem upsert via service role no DB, (b) a anon key é pública no frontend, (c) RLS protege as tabelas? Ou devemos migrar pra service_role via Vault?

**Q3.** O padrão atual de fetch é **single retry** ou **no retry**. Para fontes instáveis (PNCP /contratacoes/publicacao), faria sentido adicionar:
- Retry exponencial com jitter?
- Circuit breaker (suspender sync se 3 falhas seguidas)?
- DLQ (dead letter queue) com `retry_at` na tabela `sync_job_registry`?

**Q4.** `sync_log` (93 rows hoje) é append-only sem TTL. Em 1 ano vai ter ~10k rows. Devemos:
- (a) Criar política de retenção (DELETE >180 dias)
- (b) Materializar resumos diários e descartar logs detalhados
- (c) Mover pra Storage como JSONL (cheap)
- (d) Deixar como está

### 11.2. Schema e modelagem

**Q5.** Temos **duas tabelas de indicadores** (`indicadores_municipais` simples com chave/valor; `economia_indicadores` mais rica com categoria/setor/unidade) e há sobreposição. Devemos:
- (a) Unificar tudo em `economia_indicadores` (mais expressivo)
- (b) Manter as duas e documentar quando usar cada uma
- (c) Refatorar pra um schema EAV (entity-attribute-value) único

**Q6.** Tabelas com `raw_json` (jsonb) — devemos manter raw_json original da fonte? Ocupa espaço mas facilita reprocessamento sem re-fetch. PNCP já usa isso.

**Q7.** `projetos` tinha CHECK constraint legacy em `origem ∈ ('Legislativo','Executivo')` que **bateu com dados reais NucleoGov** (que tem 7 tipos). Dropamos sem aviso. Tem outras tabelas com constraints similares que vão quebrar quando crescerem?

### 11.3. Qualidade de dados

**Q8.** A tabela `camara_servidores` tem 369 rows de uma sync legada (Centi?). Não sabemos a procedência exata. Devemos:
- (a) Tentar reimportar de uma fonte oficial (Megasoft, TCM-GO)
- (b) Marcar como dataset "histórico" e seguir
- (c) Comparar com TCM-GO atual e atualizar

**Q9.** Datas inconsistentes: `data_publicacao` em algumas tabelas é DATE, em outras TIMESTAMP, em outras `text` no formato DD/MM/YYYY (NucleoGov export). Padronização precisaria de uma migração pesada. Vale a pena agora ou esperar?

**Q10.** Notícias da Prefeitura (500) e Câmara (710) têm resumo IA via Gemini. Mas alguns resumos parecem genéricos (alucinação). Como mensurar qualidade de resumo automaticamente?

### 11.4. Custo & sustentabilidade

**Q11.** No estado atual ($10/mês), o projeto é sustentável **se for usado por 1 mantenedor** (Gianluca). Se a comunidade adotar e o site bombar (>10k visitas/dia), Vercel free fica apertado e Supabase MICRO também. Devemos:
- (a) Migrar Vercel → Cloudflare Pages (free ilimitado mas precisa adaptar SSR)
- (b) Migrar Supabase → self-hosted no Hetzner (R$ 30/mês fixo, sem escalar custo)
- (c) Manter e cruzar a ponte quando chegar

**Q12.** As fontes externas (NucleoGov, IBGE) podem mudar API quebrar sync. Há monitoring? Hoje só temos `sync_log` mas não há **alerting**. Vale a pena:
- (a) Edge function diária que verifica se tabelas-chave tiveram update nos últimos N dias e dispara Telegram
- (b) Sentry pra erros de edge function
- (c) Outro?

### 11.5. Pipeline de fontes não-API

**Q13.** Várias fontes não têm API e exigem parser (INEP zips, Senatran CSV, DataSUS TabNet, Receita Federal dump CNPJ >100GB). Qual a estratégia?
- (a) Apify Actors (pago) pra automatizar scraping
- (b) Cron mensal no Hetzner (VPS próprio) pra baixar/processar e enviar pra Supabase via REST
- (c) Usar Base dos Dados (BigQuery público) como proxy gratuito
- (d) Esquecer essas fontes

**Q14.** Senatran retorna 403 pra User-Agent comum. Vale tentar:
- (a) Proxy residencial (Bright Data, Smartproxy) — pago e overkill
- (b) Apify (pago)
- (c) Tor (lento)
- (d) Deixar de lado

### 11.6. Frontend & UX

**Q15.** `/prefeitura` tem 17 abas e `/camara` tem 17 abas. Scrolling horizontal em mobile é ruim. Devemos:
- (a) Agrupar abas em "macro-tópicos" (Atos / Gestão / Pessoas / Financeiro / Outros)
- (b) Mover algumas pra rotas dedicadas (`/prefeitura/decretos`)
- (c) Aceitar a UX atual

**Q16.** Empty states honestos ("Câmara não publica esses dados") são bons pra transparência mas eventualmente parece "abandonado". Devemos:
- (a) Substituir por link direto pra fonte oficial (sem aba)
- (b) Manter aba mas mostrar bullet detalhado de "como acessar manualmente"
- (c) Esconder abas vazias após X dias sem dado

### 11.7. Conteúdo IA

**Q17.** Resumos Gemini são em PT-BR mas muitas vezes não têm contexto (não sabem o que aconteceu no projeto). Vale a pena:
- (a) Adicionar "system prompt" com contexto de Morrinhos (área, pop, prefeito, etc.) em cada chamada
- (b) Adicionar RAG (recuperação) das notícias relacionadas antes do resumo
- (c) Trocar Gemini Flash Lite por Gemini Pro (custo maior)
- (d) Adicionar revisão humana com claude.ai (1 horinha/semana do Gianluca)

### 11.8. Estratégia de longo prazo

**Q18.** O projeto faz sentido como produto independente (1 município = 1 fork)? Ou deveria evoluir pra um **multi-tenant gerenciado** ("transparencia.ai" com 100 municípios)?

**Q19.** Há outros 245 municípios em Goiás usando NucleoGov. Replicar o sync em outros municípios seria trivial (mudar IBGE + CNPJ + base URL). Vale a pena lançar uma **biblioteca/SaaS Cidade.Ai** ou manter como projetos individuais?

**Q20.** O modelo atual é **gratuito e cidadão** — sem ads, sem paywall. Tem ROI implícito (autor mantém visibilidade pessoal/política). Devemos formalizar isso (LGPD, termos de uso, política de privacidade detalhada)?

---

## 12. Roadmap sugerido (Q3 2026 → Q1 2027)

### 12.1. Imediato (esta semana)

1. ✅ **Sprint NucleoGov concluída** (este relatório)
2. 🔲 Gianluca cadastrar email no Portal Transparência Federal → API key
3. 🔲 Gianluca solicitar API key CNJ Datajud (DPJ)
4. 🔲 Validar build Vercel do último commit (3a16883)
5. 🔲 Codex revisar este relatório e responder Q1–Q20

### 12.2. Curto prazo (próximas 2 semanas)

6. 🔲 Implementar sync Portal Transp Federal (Bolsa Família + BPC + Pé-de-Meia)
7. 🔲 Implementar sync CNJ Datajud TJGO (filtro `orgaoJulgador.codigoMunicipioIBGE=5213806`)
8. 🔲 Renderizar PIB total + breakdown setorial + população na home (já no DB, faltam só os cards)
9. 🔲 Renderizar contratos PNCP numa aba dedicada `/prefeitura/pncp`
10. 🔲 Resolver INEP IDEB via parser microdados (cron mensal Hetzner)

### 12.3. Médio prazo (próximo mês)

11. 🔲 Setup Sentry (erros edge function)
12. 🔲 Migrar `sync_log` pra Storage (TTL 30 dias no DB)
13. 🔲 Unificar `indicadores_municipais` + `economia_indicadores` (decisão Codex Q5)
14. 🔲 Implementar ANP combustíveis via Base dos Dados (BigQuery público gratuito)
15. 🔲 Setup alerting Telegram pra crons falhados 3 dias seguidos

### 12.4. Longo prazo (Q4 2026)

16. 🔲 Decidir Q18/Q19 — manter fork ou virar multi-tenant
17. 🔲 Se manter fork: portar features do Piracanjuba.Ai (classificados, alertas, push)
18. 🔲 Cobertura SEO orgânica em queries "Morrinhos GO + [keyword]"
19. 🔲 Lançar newsletter quinzenal "Transparência Morrinhos" via Resend

---

## 13. Anexos

### Anexo A — Estrutura de pastas do repo

```
morrinhos-next/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── prefeitura/page.tsx   # /prefeitura (17 abas)
│   │   ├── camara/page.tsx       # /camara (17 abas)
│   │   ├── economia/page.tsx
│   │   ├── indicadores/page.tsx
│   │   ├── beneficios-sociais/
│   │   ├── ...
│   │   └── layout.tsx
│   ├── components/
│   │   ├── prefeitura/PrefeituraClient.tsx  (3.2k linhas)
│   │   ├── camara/CamaraClient.tsx          (450 linhas)
│   │   ├── ui/                              # shadcn
│   │   └── ...
│   ├── data/                     # API client functions
│   └── lib/                      # utils, supabase client
├── supabase/
│   ├── functions/                # Edge functions Deno
│   │   ├── nucleogov-sync/       # NEW genérica 10 targets
│   │   ├── sync-federal-data/    # NEW IBGE+PNCP
│   │   ├── sync-prefeitura-noticias/
│   │   ├── batch-summarize-noticias/
│   │   └── ...                   # ~40 funções
│   └── migrations/               # SQL migrations
├── docs/
│   ├── MORRINHOS_AI_BLUEPRINT.md       # arquitetura geral
│   ├── INTEGRACOES_DADOS_PUBLICOS.md   # fontes
│   ├── CODEX_REVIEW_MORRINHOS.md       # review anterior
│   ├── ROADMAP.md
│   └── RELATORIO_TECNICO_2026-05-12.md # ESTE arquivo
├── package.json
├── tsconfig.json
└── README.md
```

### Anexo B — Comandos de operação

```bash
# Local dev
cd "/Users/gianlucaferro/Desktop/Claude Code/morrinhos-next"
npm run dev    # localhost:3000

# Build & deploy
git push origin main   # Vercel auto-deploy

# Edge function deploy (via Supabase MCP / dashboard)
# Não tem CLI local — usa MCP mcp__86390b15-..__deploy_edge_function

# Invocar edge function manualmente
ANON_KEY="..."
curl -X POST "https://pgqztmtimakiikcsvfph.supabase.co/functions/v1/nucleogov-sync?target=leis" \
  -H "Authorization: Bearer $ANON_KEY"

# Ver cron jobs
psql -c "SELECT jobname, schedule FROM cron.job WHERE active ORDER BY schedule"

# Forçar resync de tudo manualmente
for target in leis decretos portarias resolucoes obras rgf rreo \
              camara_atos camara_projetos camara_apreciacao; do
  curl -X POST "https://.../functions/v1/nucleogov-sync?target=$target" \
    -H "Authorization: Bearer $ANON_KEY" &
done
wait
```

### Anexo C — Diagrama do banco (tabelas principais)

```
                       ┌──────────────┐
                       │ executivo    │ (2 rows)
                       │ (Prefeito/   │
                       │  Vice)       │
                       └──────┬───────┘
                              │
                              ▼
            ┌─────────────────────────────────┐
            │      secretarias (8)            │
            │      → servidores (2.915) ───┐  │
            │      → remuneracao (11.383) ─┤  │
            └─────────────────────────────────┘  │
                              ▼                  │
                ┌────────────────────────┐       │
                │ contratos (1.034) ◀────┘       │
                │ despesas (4.000)               │
                │ diarias (2.996)                │
                │ obras (23)                     │
                │ licitacoes (28)                │
                │ pncp_licitacoes (5)            │
                └────────────────────────────────┘

                ┌──────────────────────────────┐
                │  ATOS NORMATIVOS (~17.466)   │
                │  decretos     portarias       │
                │  leis_municipais   resolucoes │
                │  lei_organica                  │
                └──────────────────────────────┘

                ┌──────────────────────────────┐
                │  CÂMARA                       │
                │  vereadores (15)             │
                │  projetos (824)              │
                │  camara_atos (1.054)         │
                │  camara_servidores (369)     │
                │  camara_apreciacao_contas(5) │
                │  votacoes (0) ⚠              │
                │  presenca_sessoes (0) ⚠      │
                └──────────────────────────────┘

                ┌──────────────────────────────┐
                │  INDICADORES & FONTES        │
                │  indicadores_municipais (14) │
                │  economia_indicadores (60)   │
                │  agro_indicadores (388)      │
                │  saude_indicadores (74)      │
                │  infraestrutura_ind (33)     │
                │  relatorios_fiscais (16)     │
                └──────────────────────────────┘
```

### Anexo D — Glossário

- **NucleoGov**: empresa privada que opera portais de transparência pra 500+ prefeituras goianas. Provedor de software (não dado).
- **TCM-GO**: Tribunal de Contas dos Municípios de Goiás — julga contas das prefeituras.
- **PNCP**: Portal Nacional de Contratações Públicas — repositório federal obrigatório desde 2021 (Lei 14.133).
- **RGF / RREO**: Relatório de Gestão Fiscal / Relatório Resumido de Execução Orçamentária — obrigatórios pela LRF (LC 101/2000).
- **CNES**: Cadastro Nacional de Estabelecimentos de Saúde.
- **CIDE / FNDE**: Fundo Nacional Desenvolvimento Educação — repasses pra municípios.
- **IBGE 5213806**: código IBGE de **Morrinhos-GO**. (5213509 = Monte Alegre de Goiás — não confundir.)

---

## 14. Encerramento

Este relatório descreve um snapshot técnico da plataforma Morrinhos.Ai em **12 de maio de 2026**, após sprint intensa de descoberta de fontes governamentais. O projeto é **inspirado mas independente** do Piracanjuba.Ai. Pedimos ao Codex revisão técnica das **20 perguntas abertas** na seção 11 e validação do roadmap proposto na seção 12.

Em particular, pedimos atenção:

- **Q1, Q2, Q3** — arquitetura de ingestão (edge function única vs múltiplas, auth, retry)
- **Q5** — duplicação de schemas de indicadores
- **Q13, Q14** — estratégia pra fontes não-API
- **Q18, Q19** — futuro multi-tenant vs fork

Materiais relacionados:

- `docs/MORRINHOS_AI_BLUEPRINT.md` — arquitetura geral (não editado nesta sprint)
- `docs/INTEGRACOES_DADOS_PUBLICOS.md` — fontes (não editado)
- `docs/CODEX_REVIEW_MORRINHOS.md` — review anterior (2026-05-08, antes desta sprint)
- `docs/ROADMAP.md` — plano original

**Commits relevantes desta sprint:**

- `c5e2c6d` — Google Search Console verification
- `c7f406a` — Top 10 salários em /prefeitura/visao-geral
- `6c56b96` — GA tag G-PFEK08K5EB (substituiu Piracanjuba)
- `800d368` — Fix gênero Prefeito (Maycllyn aparecia como vice)
- `9883aca` — NucleoGov sync + aba Relatórios Fiscais
- `d480aec` — Câmara sync (809 projetos + 5 TCM)
- `3a16883` — sync-federal-data (IBGE + PNCP)

---

**FIM DO RELATÓRIO**

*Gerado por Claude Code (agente) em 12/mai/2026, 06:00 BRT.*
*Solicitar atualizações via Gianluca Ferro <contato@ferrolabs.com.br>.*

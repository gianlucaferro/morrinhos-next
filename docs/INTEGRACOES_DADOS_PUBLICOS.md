# Plano de Integrações — Dados Públicos Externos

**Data:** 2026-05-04
**Total de fontes:** 13 (11 listadas pelo user + 2 de auditoria das atas Câmara/site Prefeitura)
**Padrão técnico:** Edge Function Deno + tabela Supabase + cron pg_cron + sync_log

## Tabela mestre — fonte por fonte

| # | Fonte | Acesso | Tipo extração | Valor pro Morrinhos.ai | Tabela | Cron sugerido |
|---|---|---|---|---|---|---|
| 1 | **TCM-GO** | scrape | FireCrawl `extract` | Apontamentos/sanções na Prefeitura — alto valor pra transparência | `tcm_go_apontamentos` | semanal |
| 2 | **AGM-GO Diário Oficial** | scrape | FireCrawl `search` + `scrape` | Decretos, portarias, atos oficiais publicados | `agm_go_publicacoes` | diário |
| 3 | **Site Prefeitura morrinhos.go.gov.br** | scrape | FireCrawl `crawl` | Notícias, editais de concurso, agenda do prefeito | `prefeitura_noticias` | diário |
| 4 | **Atas Câmara PDF (Centi)** | scrape PDF | FireCrawl `scrape` parser=pdf | Texto livre das atas (já temos URLs, falta texto OCR) | `camara_atas_texto` | semanal |
| 5 | **CNJ DataJud** | API REST | fetch JSON | Processos envolvendo Prefeitura/Câmara | `cnj_processos` | semanal |
| 6 | **TJ-GO + MP-GO** | parcial API + scrape | FireCrawl + fetch | Atuação processual estado/MP | `tjgo_processos`, `mpgo_atuacao` | semanal |
| 7 | **INEP Censo Escolar** | API/microdados | fetch CSV | Detalhe escola por escola (vai além IDEB) | `inep_escolas_detalhe` | anual |
| 8 | **PNCP** | API REST | fetch JSON | Licitações federais que afetam o município | `pncp_licitacoes` | diário |
| 9 | **TSE Dados Abertos** | API completa | fetch CSV/JSON | Doadores de campanha dos vereadores eleitos | `tse_doadores`, `tse_candidatos` | trimestral (após eleições) |
| 10 | **INMET** | API REST | fetch JSON | Chuvas/clima — útil pra agro e dengue | `inmet_clima_diario` | diário |
| 11 | **CONAB** | scrape + parcial API | FireCrawl | Preços agrícolas (soja, milho — relevante p/ agro) | `conab_precos` | semanal |
| 12 | **DETRAN-GO** | scrape | FireCrawl | Infrações, sinistros (frota da Prefeitura + estatísticas locais) | `detran_go_dados` | mensal |
| 13 | ~~ANATEL~~ | API direta | _baixa prioridade — sem FireCrawl_ | Telecomunicações | — | — |

## Como cada um agrega valor (UI/UX final)

### TCM-GO `/transparencia/tcm`
Página dedicada com cards mostrando:
- **N apontamentos abertos** contra a Prefeitura/Câmara
- **N sanções aplicadas** (multas, devolução de valores, etc.)
- Lista cronológica com link pro documento original
- AI summary (Gemini) por apontamento

### AGM-GO `/decretos` e `/portarias` enriquecidos
Atualmente já temos `sync-decretos` e `sync-portarias` que pegam do Centi. AGM-GO complementa com a publicação OFICIAL no Diário (carimbo de tempo legal). Add coluna `agm_publicacao_url` nas tabelas existentes.

### Prefeitura site `/noticias` e `/concursos`
Pages novas mostrando:
- Feed de notícias da Prefeitura (com data, título, foto)
- Editais de concurso público abertos
- Agenda pública do Prefeito (compromissos, viagens)

### Atas Câmara — search texto livre
Atas já vêm via `sync-presenca-atas`. FireCrawl extrai o **texto** dos PDFs anexos para permitir busca por conteúdo (ex: "achar todas as atas que mencionam saúde mental").

### CNJ DataJud `/transparencia/processos`
- Total de processos onde Prefeitura/Câmara é parte
- Distribuição por classe, assunto
- Valores discutidos
- Link pro processo original

### INEP `/educacao` ampliado
Hoje mostra IDEB resumo. Adicionar:
- **Censo Escolar por escola**: matrículas, professores, infraestrutura (banheiros, biblioteca, laboratório)
- Comparativo entre escolas do município

### PNCP `/transparencia/licitacoes-federais`
- Licitações de órgãos federais com edital onde Morrinhos aparece
- Útil pra ver se a cidade está concorrendo a recursos federais

### TSE `/camara/financiamento`
- Quem doou pra eleger cada vereador
- Total recebido por candidato
- Empresas/pessoas que financiaram a campanha

### INMET `/saude` (alerta dengue) e `/agro`
- **Chuvas mensais** (correlação com casos de dengue — atualmente o site mostra alerta dengue mas sem clima)
- Temperatura média, dias de chuva
- Histórico para o agro

### CONAB `/agro` ampliado
- **Preços de soja, milho, sorgo** (Morrinhos é grande produtor de soja — visível em /agro: "283,5 mil ton")
- Comparação preço local vs preço nacional
- Cotação semanal histórica

### DETRAN-GO `/seguranca` e `/prefeitura/veiculos`
- **Sinistros e mortes em rodovias** próximas a Morrinhos
- Multas/infrações na frota da Prefeitura
- Cadastro de veículos (já temos `sync-frota-veiculos` mas pode ser enriquecido)

## Padrão técnico das edge functions

Todas seguem template em `supabase/functions/_shared/firecrawl-template.ts` (a criar) com:

1. **Input opcional**: `?dry_run=1` (mesma convenção de sync-prefeitura-mensal)
2. **Lê secrets**: `FIRECRAWL_API_KEY`, `SUPABASE_*`
3. **Idempotente**: upsert com `onConflict` em chave natural
4. **sync_log**: registra início/fim/erro/contagens
5. **Push notification opcional** quando dado novo importante chega (ex: nova sanção TCM)

## Rate limits e custos

- **FireCrawl**: ~5000 reqs/mês no plano atual. Estimativa 13 fontes × 2 reqs/dia = 780/mês. OK.
- **APIs públicas**: TSE, INEP, CNJ DataJud, PNCP, INMET, ANATEL — gratuitas com limites de fair use.
- **CONAB**: tem rate limit baixo, vou respeitar com delay entre páginas.

## Implementação faseada

**Fase 1 (este PR):** Migration + 4 edge functions exemplares (TCM-GO, AGM-GO, CNJ DataJud, INMET)
**Fase 2:** TJ-GO + MP-GO + INEP + PNCP + TSE
**Fase 3:** CONAB + DETRAN-GO + Atas Câmara PDF + Prefeitura site

## Observações de segurança

- FireCrawl extrai dados públicos de portais públicos. Não há scraping de conteúdo privado/autenticado.
- Respeitar `robots.txt` e termos de uso de cada site.
- TCM-GO, AGM-GO: dados são por lei publicidade obrigatória.
- DETRAN-GO: dados anônimos/agregados (sem CPFs).

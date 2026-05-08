# Morrinhos.ai — HANDOFF (estado pós-fork do piracanjuba-next)

**Data**: 2026-05-07
**Repo origem**: `piracanjuba-next` (commit do dia)
**Repo novo**: `morrinhos-next`

Este documento descreve **exatamente** o que foi feito automaticamente, **o que ainda precisa ser feito** e **as decisões pendentes do usuário**. O blueprint completo continua em [`MORRINHOS_AI_BLUEPRINT.md`](./MORRINHOS_AI_BLUEPRINT.md).

---

## ✅ O que JÁ foi feito automaticamente

### Identidade do município
- IBGE `5217104` → `5213806` (15 ocorrências)
- População default `25.373` / `25132` / `25373` → `51.351` / `51351`
- Coordenadas geográficas em `src/lib/seo.ts`: `(-17.3028, -49.0167)` → `(-17.7311, -49.1058)`
- Schema.org `Organization`/`AdministrativeArea`/`GovernmentOrganization` agora referenciam Morrinhos
- Câmara `url` em `seo.ts`: `camaramorrinhos.centi.com.br` → `morrinhos.go.leg.br`
- Prefeitura referenciada como `morrinhos.go.gov.br`

### Mass rename
- `Piracanjuba` / `piracanjuba` / `PIRACANJUBA` → `Morrinhos` / `morrinhos` / `MORRINHOS` (197 arquivos)
- Sigla `PBA` (Piracanjuba) → `MHS` em rotas/componentes:
  - `/dados-pba` → `/dados-mhs`
  - `/zap-pba` → `/zap-mhs`
  - `Compra e Venda PBA` → `Compra e Venda MHS`
  - `Zap PBA` → `Zap MHS`
- Edge function `backup-zap-pba` → `backup-zap-mhs`
- Edge function `sync-tcm-go-piracanjuba` → `sync-tcm-go-morrinhos`
- Assets renomeados: `logo-piracanjuba.{png,webp}` → `logo-morrinhos.{png,webp}`, `hero-piracanjuba.webp` → `hero-morrinhos.webp`

### Comparativo de cidades vizinhas
- `src/lib/data/economia.ts` — `getPibComparativo()` agora usa Caldas Novas, Pontalina, Marzagão, Rio Quente, Água Limpa
- `src/app/comparador/page.tsx` — mesma lista, com descrições próprias
- `supabase/functions/sync-arrecadacao-comparativo/index.ts` — cidades de porte similar (~45-65k hab): Inhumas, Quirinópolis, Goianésia, Mineiros, Cristalina, Niquelândia, Goiatuba

### Vereadores
- Hardcode `11 vereadores` → `15 vereadores` em `VereadoresContent.tsx` e `llms-full.txt`

### Conteúdo deletado (não pode ser falsificado)
- `public/data/lei-organica-texto.txt` — texto integral da **Lei Orgânica de Piracanjuba**. Precisa ser substituído pelo texto da Lei Orgânica de Morrinhos antes de habilitar a página `/lei-organica`.

---

## ⚠️ O que ainda PRECISA ser feito

### 1. Scrapers da Câmara / Prefeitura (TRABALHO PESADO)

**Plataforma diferente!** Piracanjuba usa `Centi` (`camaradepiracanjuba.go.gov.br`), Morrinhos usa **NucleoGov** (`acessoainformacao.morrinhos.go.leg.br` e `acessoainformacao.morrinhos.go.gov.br`).

Edge functions que precisam ser **reescritas** para NucleoGov:

| Função antiga (Centi) | Status | Substituto NucleoGov |
|---|---|---|
| `sync-vereadores` | quebrada | scrape WordPress `morrinhos.go.leg.br/vereador/[slug]` (15 perfis) |
| `sync-projetos` | quebrada | NucleoGov `/cidadao/atos_adm/mp/id=2` (PL Legislativo) e `mp/id=3` (PL Executivo) |
| `sync-atuacao` | quebrada | NucleoGov `mp/id=14` (Requerimentos), `mp/id=16` (Indicações), `mp/id=18` (Moções) |
| `sync-votacoes` | quebrada | NucleoGov `mp/id=10` (Votações) |
| `sync-presenca-sessoes` | quebrada | NucleoGov `mp/id=11` (Lista de Presença de Sessão) |
| `sync-presenca-atas` | quebrada | NucleoGov `mp/id=9` (Atas das Sessões) — PDFs |
| `sync-presenca-centi` | obsoleta | DELETAR ou refazer pra NucleoGov |
| `sync-camara-atos` | quebrada | NucleoGov `/cidadao/legislacao/portarias`, `/decretos`, `/resolucoes` |
| `sync-camara-financeiro` | quebrada | NucleoGov `/cidadao/transparencia/sgduodecimo` (receitas) + `/mgdespesas` |
| `sync-camara-servidores` | quebrada | NucleoGov `/cidadao/transparencia/mgservidores` (folha) |
| `sync-decretos` (Prefeitura) | quebrada | NucleoGov da Prefeitura `/cidadao/legislacao/decretos` |
| `sync-portarias` | quebrada | idem `/cidadao/legislacao/portarias` |
| `sync-leis-municipais` | quebrada | idem `/cidadao/legislacao/leis` ou `morrinhos.go.leg.br/leis/` |
| `sync-prefeitura-diaria` / `mensal` | quebrada | scraping WordPress `morrinhos.go.gov.br/noticias/` + NucleoGov |
| `sync-despesas` | quebrada | NucleoGov `/cidadao/transparencia/mgdespesas` |
| `sync-diarias` | quebrada | NucleoGov `/cidadao/transparencia/diarias` |
| `sync-obras` | quebrada | NucleoGov `/cidadao/informacao/obras` |
| `sync-fornecedores-cnpj` | quebrada | NucleoGov contratos |
| `sync-arrecadacao` | quebrada | NucleoGov `/cidadao/transparencia/receitas` |
| `sync-contas-publicas` | parcial | SICONFI já é genérico, mas NucleoGov tem `/cidadao/resp_fiscal/balancos` |
| `sync-tcm-go-morrinhos` | precisa ajuste | mesma plataforma TCM-GO — só trocar selectors do município |

**Boa notícia**: NucleoGov tem URLs estruturadas e padronizadas. Um único scraper genérico (`sync-nucleogov-generic`) com parametros (`{ tenant, secao, dataset }`) cobre quase tudo. Recomendado: começar por aí.

**Edge functions que continuam funcionando** (são genéricas, só usam IBGE):
- `sync-agro`, `sync-pe-de-meia`, `sync-transferencias-federais`, `sync-saude-indicadores`, `sync-indicadores-home`, `sync-saude-hiv`, `sync-saude-srag`, `sync-saude-sesgo`, `sync-saude-hiv-casos`, `sync-mortalidade`, `sync-saude-estabelecimentos`, `sync-educacao`, `sync-inep-escolas`, `sync-beneficios-sociais`, `sync-cde-subsidios`, `sync-cnj-datajud`, `sync-pncp-licitacoes`, `sync-tjgo-processos`, `sync-mpgo-atuacao`, `sync-clima-historico`, `sync-inmet-clima`, `sync-conab-precos`, `sync-detran-go`, `sync-frota-veiculos`, `sync-tse-eleicoes`, `sync-emendas`, `sync-economia-mensal`, `sync-seguranca`

### 2. Brand assets visuais (substituir antes do deploy)

Os arquivos foram **renomeados** mas o conteúdo da imagem ainda é de Piracanjuba:

```
src/assets/logo-morrinhos.png        ← logo Câmara/Prefeitura de Piracanjuba
src/assets/logo-morrinhos.webp       ← idem
src/assets/hero-morrinhos.webp       ← Torre do Relógio de Piracanjuba
public/hero-morrinhos.webp           ← idem
public/icon-192.png                  ← brasão de Piracanjuba
public/favicon.png                   ← brasão de Piracanjuba
public/favicon.ico                   ← brasão de Piracanjuba
```

**TODO**: gerar/baixar nova logo + favicon + hero usando bandeira/brasão de Morrinhos. Brasão oficial de Morrinhos disponível em `https://morrinhos.go.gov.br/wp-content/uploads/2023/11/cropped-brasao-2.png`.

### 3. Conteúdo específico

- **Lei Orgânica** — `public/data/lei-organica-texto.txt` foi DELETADO. Baixar Lei Orgânica de Morrinhos (PDF normalmente disponível na Câmara) e converter pra texto. Edge function `extract-lei-organica-pdf` + `parse-lei-organica` já existem.
- **Plantão de Farmácias** — calendário e fotos são específicos de Piracanjuba; resetar e popular pelo admin.
- **Coleta de Lixo** — cronograma por bairro é específico (Morrinhos tem mais bairros). Resetar.
- **Compra e Venda MHS** (classificados) — começar vazio.
- **Zap MHS** (estabelecimentos) — começar vazio, popular via admin.
- **Bairros** — atualmente o sistema usa lista de bairros de Piracanjuba. Substituir pela lista de Morrinhos quando for povoar Compra e Venda / Zap.

### 3.1 Dados hardcoded específicos de Piracanjuba que ainda renderizam (achados no preview)

Foram identificados na renderização da home itens específicos de Piracanjuba que estão **hardcoded em arquivos** (não vêm do DB) e precisam ser substituídos pelos equivalentes de Morrinhos:

| Item | Arquivo | Substituir por |
|---|---|---|
| Drogarias plantão (Central, Nacional, Droganova, Oriental) | `src/data/plantaoFarmacias.ts` + `src/components/admin/FarmaciaFotosAdmin.tsx` | Lista real de farmácias de Morrinhos com calendário oficial Sec. Saúde |
| PM (64) 99971-9063 | `src/app/page.tsx`, `src/app/contatos/page.tsx`, `src/app/seguranca/SegurancaClient.tsx` | Número da PM local de Morrinhos |
| Bombeiros (62) 98494-0249 | mesmos arquivos | Número dos Bombeiros de Morrinhos |
| Troca de Lâmpada (64) 93300-8200 | `src/app/page.tsx`, `src/app/contatos/page.tsx` | Plantão de iluminação pública de Morrinhos |

**Importante**: telefones com DDD 64 são da região sul de Goiás (engloba Piracanjuba e Morrinhos), mas os **números específicos** são de Piracanjuba. Substituir antes do go-live público.

### 4. Database (Supabase) — usuário vai criar manualmente

Quando o projeto Supabase Morrinhos.Ai estiver criado:

```bash
cd morrinhos-next
supabase link --project-ref <novo-project-ref>
supabase db push  # aplica as 103 migrations
```

**Importante**: a migration `20260503112956_morrinhos_lovable_data_dump.sql` é o data dump do Lovable do Piracanjuba antigo. **Não rodar essa migration** no Supabase de Morrinhos — ou o banco vai começar com dados de Piracanjuba. Renomear pra `.sql.SKIP` ou deletar antes do `db push`.

Secrets a configurar:
- `RESEND_API_KEY` (depois de criar conta Resend morrinhos.ai)
- `GEMINI_API_KEY` (compartilhada Ferro Labs)
- `FIRECRAWL_API_KEY` (compartilhada)
- `APIFY_TOKEN` (compartilhado)

### 5. DNS (Spaceship)

⚠️ **Pendente**: o domínio `morrinhos.ai` **não aparece** na conta Spaceship que o MCP está usando (`wglc4rponkn2b`). Os domínios visíveis são: `orientacoes.com`, `palheirospiracanjuba.com`, `santacatarina.ai`, `trasparenzai.com`. Confirmar:
- Em qual conta Spaceship `morrinhos.ai` está registrado?
- Se for outra conta, configurar DNS manualmente pelo painel ou re-conectar MCP com aquele login.

DNS a configurar (depois que tivermos acesso):
```
A     @                              76.76.21.21       (Vercel)
A     www                            76.76.21.21
TXT   @                              v=spf1 include:_spf.mail.hostinger.com ~all   (se usar Hostinger Email)
                                     OU equivalente do Resend-only setup
TXT   _dmarc                         v=DMARC1; p=none; rua=mailto:contato@morrinhos.ai;
CNAME resend._domainkey              <chave Resend a gerar>
TXT   _dmarc                         (DMARC)
```

### 6. Vercel deploy

Quando o Supabase estiver criado e DNS pronto:
- Criar projeto Vercel `morrinhos-next` apontando pro repo `gianlucaferro/morrinhos-next`
- Env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (se usado server-side)
- Domain: `morrinhos.ai`

### 7. Email (Resend + opcional Hostinger Email)

Replicar o setup do piracanjuba.ai:
1. Conta Resend exclusiva (`contato@morrinhos.ai`)
2. Verificar domínio `morrinhos.ai` no Resend (sa-east-1)
3. Adicionar DKIM/SPF/DMARC no DNS
4. Salvar API key restricted no 1Password (item `Resend Morrinhos`)
5. (Opcional) Mailbox Hostinger Business Email para inbound

### 8. PostHog / Analytics
Setup independente — copiar config do piracanjuba quando tiver dados rodando.

---

## 🔑 Decisões pendentes do usuário

1. **Conta Spaceship com morrinhos.ai** — não aparece via MCP. Confirma onde está.
2. **Sigla** — usei `MHS` (de Morrinhos) para `Zap MHS` / `Compra e Venda MHS` / `Dados MHS`. Trivial trocar pra `MOR` ou `MRH` se preferires (1 sed).
3. **Brand visual** — quem desenha logo/favicon/hero? Posso gerar com IA + pedir validação.
4. **Lei Orgânica** — tens o PDF da LO de Morrinhos? Senão posso buscar.
5. **Compra e Venda MHS / Zap MHS** — fazem sentido em Morrinhos (cidade 2× maior)? Começar habilitado ou desabilitar inicialmente?
6. **`sync-arrecadacao-comparativo`** — confirmei no código os IBGEs das cidades de porte similar (Inhumas, Quirinópolis etc.). Se algum estiver errado, o sync vai falhar com erro do SICONFI (fácil identificar).

---

## 📋 Próximas etapas recomendadas (ordem)

1. ✅ ~~Mass rename + identidade~~ (feito)
2. **Tu**: criar projeto Supabase `Morrinhos.Ai` em sa-east-1
3. **Tu**: confirmar conta Spaceship onde `morrinhos.ai` está
4. **Eu**: aplicar 103 migrations (PULAR a do data dump Lovable) no novo Supabase
5. **Eu**: setup repo GitHub + push
6. **Eu**: setup Vercel + DNS + ativar HTTPS
7. **Eu/Tu**: substituir brand assets visuais
8. **Eu**: deploy e ativar deploy automático no push
9. **Eu**: escrever `sync-nucleogov-generic` (substituto unificado pros scrapers Centi)
10. **Tu**: trazer Lei Orgânica de Morrinhos (PDF)
11. **Eu**: rodar todos os syncs genéricos (que já funcionam) pra popular dados iniciais
12. **Tu**: validar visualmente o site no domínio
13. **Eu**: setup Resend + Email + edge functions de email
14. **Eu**: SEO/GEO (Google Search Console, Bing, IndexNow, sitemap)
15. **Tu/Eu**: ajustar copy específica de Morrinhos quando for o momento

**MVP estimado** (sem scrapers Câmara/Prefeitura — só dados genéricos): ~2-3 dias.
**Paridade total** com Piracanjuba: ~2-3 semanas (depende de tempo no scraper NucleoGov).

---

## 📞 Plataformas oficiais detectadas

| Item | URL |
|---|---|
| Site Prefeitura | https://morrinhos.go.gov.br/ (WordPress 6.9.4) |
| Transparência Prefeitura | https://acessoainformacao.morrinhos.go.gov.br/ (NucleoGov) |
| Site Câmara | https://morrinhos.go.leg.br/ (WordPress) |
| Transparência Câmara | https://acessoainformacao.morrinhos.go.leg.br/ (NucleoGov) |
| SIG IPTU/NF-e/Servidor | https://morrinhos.prodataweb.inf.br/sig/ |
| eSUS Atenção Básica | https://esus.morrinhos.go.gov.br/ |
| Bolsa Transporte | https://sibtu.morrinhos.go.gov.br/ |
| Prefeito | Maycllyn (gestão atual) |
| Câmara — vereadores | 15 (mandato 2025-2028) |
| Câmara — endereço | Av. Cel. Fernando Barbosa nº 720, Setor Oeste |
| Câmara — telefone | (64) 3413-4879 |
| Câmara — email | administracao@morrinhos.go.leg.br |

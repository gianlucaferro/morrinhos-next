# Pedido de Auditoria — Codex

**Projeto:** Morrinhos.ai — migração de Lovable (React + Vite + Supabase Lovable Cloud) para Next.js 16 (App Router) + Vercel + Supabase próprio.
**Status:** Migração funcional mas com divergências de paridade. Site Lovable ainda em produção em `morrinhos.ai` (DNS NÃO trocado ainda — usuário esperando Codex revisar antes do switch).
**Pedido:** Auditoria sistemática de paridade Lovable vs Next — encontrar e corrigir TODA divergência de comportamento, dados ou layout.

## Atualização Codex — triagem rápida em 2026-05-03

Este documento continua sendo o checklist principal de paridade, mas alguns itens abaixo já mudaram no código atual. Antes de executar, o Claude deve tratar esta seção como a triagem mais recente.

### Itens que parecem já implementados no código atual

- `/plantao-farmacias` já usa `PlantaoFarmaciasClient` e renderiza o calendário completo agrupado por mês, com semana atual destacada e botão de compartilhar.
- `PlantaoFarmaciasHome.tsx` já mostra a semana inteira (farmácia 24h + demais), não apenas a farmácia 24h.
- `src/data/plantaoFarmacias.ts` já possui `COORDS` e `getWazeLink()`, então os botões Waze já estão modelados no frontend.
- Home já tenta renderizar os 9 indicadores municipais (`populacao`, `pib_per_capita`, `ideb_anos_iniciais`, `saneamento_cobertura`, `salario_medio_formal`, `pessoal_ocupado_formal`, `populacao_ate_meio_sm`, `frota_veiculos`, `idhm`).
- `HomeCivicInsights` já inclui "Atividade Recente da Câmara" e `RankingChart`, mas a posição na Home ainda precisa ser comparada com o Lovable.

### Pendências ainda visíveis por auditoria estática

1. **Home ainda tem imagem de fundo no hero.** `src/app/page.tsx` ainda renderiza `Image src="/hero-morrinhos.webp"` com `opacity-60`. Se o Lovable referência for apenas gradient, remover esse `Image`.
2. **Home ainda tem `AnuncioBannerPadrao`.** O arquivo segue importando e renderizando `AnuncioBannerPadrao`; o checklist abaixo diz que esse bloco não existe no Lovable.
3. **Ranking de atuação provavelmente está no lugar errado.** `HomeCivicInsights` renderiza Atividade Recente primeiro e Ranking depois, tudo no final da página. Se o Lovable coloca o ranking em outro ponto, separar o componente em `HomeRankingAtuacao` e `HomeAtividadeRecente` para posicionar cada bloco corretamente.
4. **Última competência da Prefeitura ainda é global no admin.** Em `src/components/prefeitura/PrefeituraClient.tsx`, `queryKey ["last-competencia"]` ainda consulta `remuneracao_servidores` sem filtrar `servidores.orgao_tipo = 'prefeitura'`. Isso pode exibir `2026-04` da Câmara como se fosse competência da Prefeitura.
5. **Remuneração de Executivo/Secretários ainda pode casar homônimos da Câmara.** `fetchExecutivoRemuneracao()` e `fetchSecretariosRemuneracao()` em `src/data/prefeituraApi.ts` ainda buscam `servidores` sem filtro explícito `orgao_tipo = 'prefeitura'`.
6. **A função `sync-prefeitura-mensal` precisa ser revisada antes de rodar manualmente.** Ver detalhes no arquivo `docs/CODEX_FOLHA_ABRIL_INVESTIGATION.md`: ela inclui `idorgao=23` e não grava `orgao_tipo: 'prefeitura'` no upsert de servidores.

### Correção de prioridade máxima antes do DNS switch

Separar definitivamente Prefeitura e Câmara nos dados de servidores/folha:

- queries de leitura: sempre `servidores!inner(orgao_tipo)` ou pré-lista filtrada por `orgao_tipo`;
- sync mensal Prefeitura: não incluir Câmara (`idorgao=23`) e gravar `orgao_tipo: 'prefeitura'`;
- avaliar migration para trocar a unicidade de `servidores.nome` por chave que permita o mesmo nome em órgãos diferentes, idealmente `(nome, orgao_tipo)` ou identificador oficial quando existir.

## URLs de comparação

- **Lovable (referência — produção atual):** `https://morrinhos.ai`
- **Next/Vercel (alvo da auditoria):** o último deploy production (rodar `vercel ls morrinhos-next` na raiz pra pegar a URL atual)
- **Branch:** `main` em `https://github.com/gianlucaferro/morrinhos-next`

## Bugs já corrigidos (commits recentes — re-validar)

| Bug | Commit | Arquivo |
|---|---|---|
| Top 10 salários da Prefeitura mostrando servidores da Câmara | `67adc87` | `src/components/prefeitura/PrefeituraDestaques.tsx#fetchTopSalarios` |
| Folha mensal mostrando R$ 0,00 + 0 servidores em Abril/2026 | `3db1838` | `src/components/prefeitura/PrefeituraDestaques.tsx#fetchFolhaTotal` |
| Tabs flex direction quebrado (Tailwind 4) | `ff0fbfb` | `src/components/ui/tabs.tsx` |
| Build SSR `useSearchParams` em /camara e /prefeitura | `302daab` | `src/app/{camara,prefeitura}/page.tsx` |

## Bugs visuais reportados pelo usuário (PRIORIDADE MÁXIMA)

1. **Home: ordem dos blocos diferente do Lovable** — usuário: "revise a página inicial de ponta a ponta, os cards estão aparecendo em posição diferente do que estavam no lovable"
2. **Plantão Farmácias incompleto** — usuário: "todas as farmácias não estão aparecendo dentro da aba Plantão Farmácias"
3. **Layouts diferentes nas abas Prefeitura/Câmara** — usuário: "estamos com vários layouts diferentes do que estava antes da migração"
4. **Risco de contratos (bolinhas vermelhas) faltando** + **aditivos** — usuário pediu várias vezes
5. **Header da Torre do Relógio sumiu** — pode estar em layout, não na home

Detalhamento técnico de cada um nos itens 1.B.1 a 1.B.3 abaixo.

---

## Contexto técnico

| Item | Lovable (origem) | Next.js (destino) |
|---|---|---|
| Framework | React 18 + Vite | **Next.js 16 App Router (Turbopack)** — ATENÇÃO: API/conventions diferentes do Next 14/15 |
| DB | Supabase Lovable Cloud `uulpqmylqnonbxozdbtb` (read-only — dump congelado) | Supabase próprio `oinweocqcptwxqsztlcl` (29.381 rows restauradas + 50 storage objects) |
| Hosting | Lovable (Cloudflare edge) | Vercel (`morrinhos-next` em `gianlucaferros-projects`) |
| Auth | Lovable Cloud | Supabase nativo (Google OAuth + email/password) — sem Apple |
| Email | — | Resend `contato@ferrolabs.com.br`, domínio `morrinhos.ai` (DKIM/SPF via Hostinger) |
| AI Gateway | Lovable AI Gateway | Gemini direto (chat: OpenAI-compat; áudio: `generateContent`) |
| Cron jobs | Lovable infra | `pg_cron + pg_net` com `invoke_edge_function(timeout_milliseconds := 60000)` |

Local: `/Users/gianlucaferro/Desktop/Claude Code/morrinhos-next`

⚠️ **AVISO IMPORTANTE — Next.js 16:** Esta versão tem breaking changes vs Next 14/15. Antes de escrever qualquer código, leia `node_modules/next/dist/docs/`. Não confie na sua memória sobre App Router.

---

## Bug raiz que o usuário acabou de reportar (e foi corrigido como prova de conceito)

### Sintoma
Aba "Visão Geral" da Prefeitura mostrava o card **"Top 10 maiores salários"** com servidores que **eram da Câmara**, não da Prefeitura.

### Causa
Em `src/components/prefeitura/PrefeituraDestaques.tsx#fetchTopSalarios`, a função primeiro buscava a **última competência disponível em `remuneracao_servidores` globalmente**, depois consultava o top 10 dessa competência. Resultado:

- Competência `2026-04` tinha **37 rows** em `remuneracao_servidores` — match exato com a quantidade de servidores da Câmara (37 vereadores/servidores).
- A Prefeitura ainda não tinha publicado a competência `2026-04` (último import: `2026-03`).
- Top 10 acabou sendo **100% Câmara** porque a query não filtrava `orgao_tipo='prefeitura'`.

### Fix aplicado
PostgREST inner-join embed via FK, filtrando ANTES de pegar latestComp:

```ts
const { data: latestRow } = await supabase
  .from("remuneracao_servidores")
  .select("competencia, servidores!inner(orgao_tipo)")
  .eq("servidores.orgao_tipo", "prefeitura")  // <-- ESTE filtro
  .order("competencia", { ascending: false })
  .limit(1)
  .maybeSingle();
```

Aplicado nas 3 queries da função: `latestRow`, `allRem` (mediana), `remuneracoes` (top 10).

### Validação SQL feita manualmente
- `2026-04`: 37 rows (Câmara) — pôde por descalço
- `2026-03`: ~1.300 rows com Prefeitura (correto após fix)
- Top 10 esperado da Prefeitura em 2026-03: CILTON GONCALVES DE SOUZA (MOTORISTA, R$ 130.989,55), IZALE RODRIGUES (PROFESSOR P-IV, R$ 81.972,32), ...

---

## Pedido ao Codex — escopo da auditoria

### 1. Detectar e corrigir todos os pontos com o mesmo padrão de bug

**Padrão a procurar:** qualquer query que envolva `remuneracao_servidores` SEM filtro explícito de `orgao_tipo` (ou via embed `servidores!inner(...)` ou via lista de IDs pré-filtrada).

**Pontos já mapeados (mas que precisam ser **revisados e refatorados** para o padrão `orgao_tipo`):**

| Arquivo:linha | Função | Pattern atual | Risco |
|---|---|---|---|
| `src/components/prefeitura/PrefeituraDestaques.tsx:160-197` | `fetchFolhaTotal` | Usa `fonte_url ILIKE '%camara%'` para distinguir Pref/Cam | ⚠️ Frágil. Servidor sem `fonte_url` ou com URL diferente vaza. Padronizar para `servidores.orgao_tipo` |
| `src/data/camaraApi.ts:130-161` | `fetchCamaraCustoTotal` | Usa `fonte_url ILIKE '%camara%'` + `.in("servidor_id", ids)` | ⚠️ Mesmo problema. Bug latente: latestComp pode ser de outro órgão (mesmo argumento que o fix anterior) |
| `src/components/prefeitura/PrefeituraClient.tsx:1318-1329` | `useQuery(["last-competencia"])` | latestComp de `remuneracao_servidores` SEM filtro | ⚠️ Mostrado no painel admin. Pode mostrar "Última competência: 2026-04" enquanto Prefeitura está em 2026-03 |
| `src/data/prefeituraApi.ts:131-159` | `fetchExecutivoRemuneracao` | Não filtra `orgao_tipo` no servidor — encontra qualquer match `nome ILIKE %nome%` | ⚠️ Pode pegar servidor da Câmara homônimo |
| `src/data/prefeituraApi.ts:181-244` | `fetchSecretariosRemuneracao` | Mesma vulnerabilidade homônimo | ⚠️ |

**Padrão correto a aplicar:**
```ts
.select("...,servidores!inner(orgao_tipo,nome,cargo)")
.eq("servidores.orgao_tipo", "prefeitura")  // ou "camara"
```

ou (segunda alternativa, quando o embed for inviável):
```ts
const { data: srvIds } = await supabase
  .from("servidores")
  .select("id")
  .eq("orgao_tipo", "prefeitura");
// pré-filtrar IDs e usar .in("servidor_id", ids) em batches de até 1000
```

⚠️ A coluna `servidores.fonte_url` **NÃO** deve ser usada como discriminador — ela é frágil (URL pode mudar, nem todo servidor tem). Sempre `orgao_tipo`.

---

### 1.B Bugs visuais já confirmados (após primeira passada) — COMEÇAR POR AQUI

#### 1.B.1 — Home (`/`): ordem dos blocos diferente do Lovable + blocos faltando

**Como reproduzir a comparação:** abrir `https://morrinhos.ai` (Lovable, produção pré-migração) lado a lado com a versão Vercel atual.

**Ordem real do Lovable (de cima pra baixo):**
1. Hero (logo + título + descrição + **input de busca "Buscar vereadores, leis, servidores..."** — IMPORTANTE: o hero do Lovable **não tem foto de fundo**, é só um gradient)
2. Anúncio destaque (banner patrocinado — atual: Vitorino Perfumes)
3. **Serviços rápidos** (Zap MHS / Coleta Lixo / Farmácias Plantão)
4. **Compra e Venda MHS** (banner único)
5. **Plantão de Farmácias** (LISTA COMPLETA da semana — 1 farmácia 24h em destaque + 3 demais, cada uma com foto, telefone WhatsApp, tag "24H" e **botão "Abrir no Waze"** com link de geolocalização. Header: "De DD de mês a DD de mês" + botão "Compartilhar" no WhatsApp)
6. Alerta Dengue (com casos do mês + nível + CTA "Ver dados completos" + botão Compartilhar)
7. **Contatos Úteis** (Polícia Militar, Bombeiros Morrinhos, Troca de Lâmpada de Poste — com link "Ver todos →" pra `/contatos`)
8. **Anuncie no Morrinhos.ai** (CTA com botão verde — link via WhatsApp do Gianluca, não rota interna)
9. **Morrinhos em Dados** (Saúde, Educação, Social, Impostos, Agro, Segurança — 6 cards 2x3)
10. **Indicadores do Município** (header com badge "Atualizado em: 04/2026") — **9 indicadores**, não 4:
   - População
   - PIB per capita
   - IDEB Anos Iniciais
   - Saneamento
   - Salário médio formal (em salários mínimos)
   - Empregos formais
   - Pop. até ½ salário mín. (%)
   - Frota de veículos (SENATRAN)
   - IDHM
11. **Emendas Parlamentares** (placeholder "Dados ainda não disponíveis. Serão preenchidos quando disponíveis nos portais de transparência.")
12. **Contratos** (placeholder "Dados de contratos não disponíveis." — ATENÇÃO: tem dados na DB, então o placeholder deveria ser substituído por valores reais)
13. **Atividade Recente da Câmara** (lazy-load com mensagem "Carregando atividade recente..." — provavelmente lista projetos/votações mais novos)
14. CTA secundário "Anuncie no Morrinhos.ai" (footer-style)
15. Footer (Anuncie / Fontes oficiais / Sobre / Privacidade / Instagram + CNPJ Ferro Labs)

**Ordem atual do Next (`src/app/page.tsx`):**
1. Hero — usa **`/hero-morrinhos.webp` como background com `opacity-60`** ⚠️ não está no Lovable (Lovable só usa gradient)
2. AnuncioBannerDestaque
3. DengueAlert ⚠️ posição errada (deveria estar abaixo de Plantão Farmácias)
4. PlantaoFarmaciasHome ⚠️ **mostra apenas 1 farmácia 24h** (deveria mostrar TODAS as 4 da semana — 1 destaque + 3 demais)
5. Atalhos (Zap, Coleta, Farmácia)
6. Compra e Venda MHS
7. **Câmara + Prefeitura grid 2-col** ⚠️ NÃO existe no Lovable — esse bloco é extra/inventado
8. Morrinhos em Dados
9. Indicadores ⚠️ **apenas 4 indicadores** (faltam Salário médio formal, Empregos formais, Pop ½ salário, Frota de veículos, IDHM)
10. Contratos Ativos ⚠️ pega dados reais (`fetchContratosResumo`) — Lovable mostra placeholder. **Verificar qual é o comportamento correto** (provavelmente Lovable está errado e Next está certo, mas confirmar)
11. Emendas Parlamentares (idem — dados reais vs placeholder Lovable)
12. Contatos Úteis (posição diferente — deveria estar no slot 7)
13. AnuncioBannerPadrao ⚠️ NÃO existe no Lovable
14. Anuncie CTA (posição diferente)
15. **Falta:** "Atividade Recente da Câmara"
16. **Falta:** input de busca no Hero

**Ações (todas em `src/app/page.tsx`):**
- [ ] Remover background `Image src="/hero-morrinhos.webp"` do hero (ou mover para a página `/sobre`)
- [ ] Adicionar input "Buscar vereadores, leis, servidores..." no hero (rota `/buscar?q=`)
- [ ] Reordenar para ordem Lovable: Hero → Anúncio → Atalhos → Compra/Venda → Plantão (LISTA) → Dengue → Contatos → Anuncie → Em Dados → Indicadores → Emendas → Contratos → Atividade Recente → Anuncie CTA → Footer
- [ ] **Reescrever `PlantaoFarmaciasHome.tsx`** para mostrar a semana completa (1 + 3) com Waze por farmácia + botão Compartilhar no WhatsApp
- [ ] **Adicionar 5 indicadores faltantes** em `fetchIndicadores`/Home — Salário médio formal, Empregos formais, Pop até ½ salário mín, Frota de veículos, IDHM. Verificar se existem em `indicadores` table na DB; se não, popular ou marcar como "Em breve"
- [ ] Header dos Indicadores: badge "Atualizado em: 04/2026" no canto direito (campo `atualizado_em` da query)
- [ ] **Remover** bloco "Câmara + Prefeitura grid" da home (não existe no Lovable — usuário acessa via header nav)
- [ ] **Remover** bloco AnuncioBannerPadrao (Lovable só tem 1 banner: o destaque no topo + CTA "Anuncie" no rodapé. Lovable NÃO tem segundo banner padrão no meio)
- [ ] Adicionar componente `AtividadeRecenteCamara` (lista 5 itens mais novos: projetos, votações, atos — agregados por timestamp)

#### 1.B.2 — Plantão de Farmácias (`/plantao-farmacias`): falta calendário completo

**Lovable atual:** mostra **calendário completo** com TODAS as semanas (passadas, atual, futuras) agrupadas por mês.

Estrutura visível:
```
← Voltar
🔗 Plantão de Farmácias
Calendário completo de plantão das farmácias em Morrinhos. A semana atual está destacada.

Março 2026
  14 de março a 20 de março                            [Compartilhar]
    [Foto] Drogaria São Sebastião  [24H]    [Waze]
           (64) 99340-0727
    [Foto] Drogamais                       [Waze]
           (64) 99265-4341
    [Foto] Drogaria Do Lar                  [Waze]
    [Foto] Drogaria JM Popular              [Waze]

  21 de março a 27 de março                            [Compartilhar]
    [Foto] Drogaria do Povo  [24H]          [Waze]
    ...

Abril 2026
  ... (mesma estrutura)

Maio 2026
  ... (mesma estrutura)
```

**Cada card de farmácia contém:**
- Foto da fachada (do bucket Supabase storage `farmacia-fotos`)
- Nome
- Tag amarela "24H" (apenas na primeira da semana)
- Telefone — clicável: WhatsApp se mobile/contém wa.me, ou tel: para telefones fixos com prefixo (64) 3405
- Botão **"Waze"** com link `https://waze.com/ul?ll=<lat>,<lng>&navigate=yes&zoom=17` — coordenadas armazenadas em `farmacias` table (campos `latitude`, `longitude`)

**Botão "Compartilhar"** por semana: gera link wa.me com mensagem formatada com data + 24h + demais farmácias.

**Next atual (`src/app/plantao-farmacias/page.tsx`):** mostra **apenas a semana atual** (24h em destaque + 3 demais). Sem calendário completo, sem agrupamento por mês, sem Waze, sem compartilhar por semana.

**Ações:**
- [ ] Reescrever `src/app/plantao-farmacias/page.tsx` para iterar `PLANTAO_FARMACIAS` completo, agrupar por mês (parsing da data `inicio` para extrair `YYYY-MM`), e renderizar cada semana com header de range + botão Compartilhar
- [ ] Destacar visualmente a semana atual (border laranja, bg laranja-leve)
- [ ] Adicionar fonte de coordenadas (lat/long) para cada farmácia — opções: (a) hardcoded em `src/data/plantaoFarmacias.ts`, (b) joinar com tabela `farmacias` na DB pelo nome normalizado. Lovable usa coordenadas (visível em `https://waze.com/ul?ll=-17.30434,-49.02208`).
- [ ] Atualizar `PlantaoFarmaciasHome.tsx` (componente da home) para mostrar a semana completa (1+3), não só 24h
- [ ] Adicionar botão "Compartilhar" no WhatsApp para cada bloco de semana — formato:
```
💊 *Plantão de Farmácias em Morrinhos*
📅 DD de mês a DD de mês

🕐 *Farmácia 24h:*
Nome — telefone

💊 *Demais farmácias de plantão:*
• Nome — telefone
...

Veja o calendário completo:
https://morrinhos.ai/plantao-farmacias

_Fonte: Morrinhos.ai_
```

#### 1.B.3 — Listas de farmácia incompletas no source de dados

`src/data/plantaoFarmacias.ts` tem hardcoded apenas o nome + telefone, sem coordenadas. Lovable carrega coordenadas de `farmacias` table.

```sql
-- Verificar schema da tabela farmacias
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'farmacias';

-- Verificar dados existentes
SELECT nome, telefone, latitude, longitude, foto_url FROM farmacias LIMIT 30;
```

Se a tabela existe e tem coordenadas, adaptar `PLANTAO_FARMACIAS` ou as queries pra puxar `latitude`/`longitude` por nome normalizado (já existe lógica em `normalize()`).

---

### 2. Verificar paridade visual de TODAS as abas da Prefeitura e da Câmara

Comparar com o site Lovable em produção (estado pré-migração) e relatar divergências.

**Abas Prefeitura** (`/prefeitura?tab=...`):
- [ ] visao-geral (cards: despesa, folha, top 10 salários, fornecedores, comparativo)
- [ ] saude (todas sub-abas: indicadores, financeiro, atendimentos, etc)
- [ ] educacao
- [ ] social
- [ ] impostos
- [ ] agro
- [ ] seguranca
- [ ] servidores
- [ ] contratos (⚠️ usuário reportou: precisam mostrar **aditivos** e **risco com bolinhas vermelhas**)
- [ ] obras
- [ ] licitacoes
- [ ] decretos
- [ ] portarias
- [ ] secretarias

**Abas Câmara** (`/camara?tab=...`):
- [ ] visao-geral
- [ ] vereadores
- [ ] servidores
- [ ] contratos (idem aditivos + risco)
- [ ] projetos
- [ ] atuacao-parlamentar
- [ ] atos
- [ ] despesas
- [ ] receitas
- [ ] diarias
- [ ] licitacoes

**Para cada aba:** abrir `https://morrinhos-next-kiukrzkse-gianlucaferros-projects.vercel.app/prefeitura?tab=X` (e Lovable equivalente) e validar:
1. A aba renderiza?
2. Todos os cards/tabelas/gráficos aparecem?
3. Os dados batem com o Lovable?
4. Filtros e ordenação funcionam?
5. Compartilhamento WhatsApp gera URL correta?

---

### 3. Funcionalidades específicas que o usuário marcou como CRÍTICAS

3.1. **Página do Administrador** (`/admin`) — todas operações: imports manuais, sync logs, gestão de classificados, ads. Validar que cada botão dispara a edge function correta e o resultado aparece no log.

3.2. **Banners/Anúncios** (componente `AdBanner` em `/`) — busca em `anuncios` table, deve renderizar imagem + link + tracking de impressões/cliques.

3.3. **AI Summaries** (resumos por IA de notícias, contratos, contas públicas) — chamam edge functions Gemini. Verificar se logs do `pg_cron` mostram execução periódica e se as colunas `*_resumo_ia` da DB estão sendo preenchidas.

3.4. **Contratos com aditivos** — tabela `contratos_aditivos` precisa carregar e ser exibida abaixo do contrato pai.

3.5. **Risco dos contratos (bolinhas vermelhas)** — coluna `contratos.risco_score` (ou similar) deve mapear para indicador visual: 🟢 baixo, 🟡 médio, 🔴 alto. Confirmar que Lovable usava limites: `< 33` verde, `< 66` amarelo, `>= 66` vermelho (validar contra Lovable real).

3.6. **Links externos** — TODOS os links em:
- WhatsApp Compra/Venda MHS
- ZAP MHS
- Farmácias de Plantão (rotacionado por dia)
- Contatos Úteis (delegacia, hospital, etc)
- Header da Torre do Relógio (imagem)

devem funcionar e abrir corretamente. Usuário reclamou que estava aparecendo errado pós-migração.

3.7. **Header com imagem da Torre do Relógio** — usuário reportou que sumiu. Verificar `src/components/Hero*.tsx` ou `src/app/layout.tsx`.

ATUALIZAÇÃO 03/05: revisitando o Lovable real, na página Home (`/`) o hero **NÃO tem foto de fundo** — é apenas o gradient escuro com logo + título + busca. A "Torre do Relógio" pode estar em OUTRO lugar (talvez em `/sobre`, ou no header do `layout.tsx`). Confirmar antes de adicionar.

3.8. **URL canônica e `og:image`** — Vercel deploy usa preview URL `morrinhos-next-*.vercel.app`. Antes do DNS switch, garantir que:
- `pageMetadata` em `src/lib/seo.ts` aponta para o domínio final `https://morrinhos.ai` (não preview URL)
- `next.config.ts` tem `poweredByHeader: false`
- OG image existe em `public/og.png` ou similar

3.9. **Botão "Compartilhar" em WhatsApp em todos os cards** — Lovable tem botão "Compartilhar" em quase todo card (Plantão Farmácias por semana, Alerta Dengue, Top 10 salários, Folha mensal, Maiores fornecedores, Comparativo cidades, etc). Padrão: link `https://wa.me/?text=<texto formatado>` com texto rico (emoji + dados resumidos + URL canônica). Validar que o Next preserva isso em todos os cards onde Lovable tem.

---

### 4. Crons + Edge Functions — verificar execução real

Conectar no Supabase via `mcp__86390b15__execute_sql` e rodar:

```sql
-- Ver últimas execuções de cron
SELECT jobname, status, return_message, start_time, end_time
FROM cron.job_run_details
ORDER BY start_time DESC
LIMIT 50;

-- Ver jobs ativos
SELECT jobid, jobname, schedule, command, active
FROM cron.job;
```

Verificar:
- [ ] `sync-prefeitura-mensal` (mensal, dia 5) — funcionou no último dia 5?
- [ ] `sync-prefeitura-diaria` (diária, 4h da manhã) — funcionou hoje?
- [ ] `sync-camara-*` — análogos
- [ ] `sync-noticias` — funciona com Gemini?
- [ ] `sync-health-check` — bate em 60s, não estoura timeout?
- [ ] `gerar-resumos-ia-*` — todos populando colunas `*_resumo_ia`?

Se algum cron está falhando, pegar o `return_message` e investigar a edge function correspondente em `supabase/functions/<nome>/index.ts`.

---

### 5. Email transacional — testar fluxo completo

Verificar que:
- [ ] Domínio `morrinhos.ai` está **verified** no Resend (DNS já configurado em ~03/05)
- [ ] Edge function `send-email-hook` (Send Email Hook do Supabase) responde 200 com `v1,whsec_…` HMAC
- [ ] Templates renderizam com layout do MasterEmail (header gradient + footer Ferro Labs)
- [ ] Signup → email com link verifica + abre `/auth/callback` → user logado
- [ ] Magic link → idem
- [ ] Reset password → idem
- [ ] Email change confirmation → idem

Templates em `supabase/functions/_shared/email-templates/*.tsx`.

---

### 6. Auth — validar todos os fluxos

- [ ] Email/password signup
- [ ] Email/password login
- [ ] Reset password
- [ ] Google OAuth (provider configurado em Supabase Dashboard com client_id da conta `contatoferrolabs@gmail.com`)
- [ ] Logout

Não tem Apple OAuth (decisão do usuário). Usuários Apple usam reset password.

---

### 7. SSR/Hydration — flags críticas no Next 16

Confirmar que:
- [ ] `src/app/camara/page.tsx` tem `export const dynamic = "force-dynamic"` (necessário p/ `useSearchParams` no client)
- [ ] `src/app/prefeitura/page.tsx` idem
- [ ] Componentes que tocam `window` estão envolvidos por wrapper com `dynamic(import, { ssr: false })`:
  - `ClassificadosWrapper`, `AnuncioDetalheWrapper`, `AdminWrapper`
- [ ] `next.config.ts` tem `typescript: { ignoreBuildErrors: true }` (workaround temporário p/ shadcn @base-ui — TODO: remover)
- [ ] `images.remotePatterns` cobre `oinweocqcptwxqsztlcl.supabase.co` (atual) + `uulpqmylqnonbxozdbtb.supabase.co` (legado, p/ imagens migradas)

---

### 8. Layout Tailwind 4 — atributo selectors

Bug já resolvido em `src/components/ui/tabs.tsx`:
- Tailwind 4 não reconhece `data-horizontal:flex-col`
- Padrão correto: `data-[orientation=vertical]:flex-row` (com colchetes)

Verificar se há outros lugares com esse padrão antigo de Radix v1 / Tailwind v3 que ainda usam `data-state-` ou `data-orientation` sem colchetes.

```bash
grep -rn "data-horizontal\|data-vertical\|data-orientation:\|data-state:" src/ --include="*.tsx"
```

---

### 9. Performance — Vercel build

Atual: build OK em ~30s. Mas o `ignoreBuildErrors` esconde divergências de tipo do shadcn. Após paridade, **reabilitar type-check** e corrigir os erros (a maioria é divergência de signature do `@base-ui/react` Select — `value: string | null` vs `string | undefined`).

---

### 10. Smoke tests recomendados (rodar em sequência)

**Comparação base:** abrir `https://morrinhos.ai` (Lovable produção) e a URL Vercel atual lado a lado, percorrendo na mesma ordem.

1. **Home (`/`)** — confirmar 15 blocos na ORDEM exata do Lovable (ver item 1.B.1 acima)
2. **Hero** — sem foto de fundo (apenas gradient) + input de busca presente
3. **Plantão Farmácias preview na home** — mostra a SEMANA INTEIRA (1+3 farmácias), não só 24h
4. **Indicadores na home** — 9 cards (não 4)
5. **Atividade Recente da Câmara** — bloco existe e popula
6. `/plantao-farmacias` → calendário completo agrupado por mês (mar, abr, mai, jun...) com Waze por farmácia
7. Click em Prefeitura → tabs aparecem e clicáveis
8. Click em "Visão Geral" → todos os cards renderizam
9. **Top 10 maiores salários: nomes esperados (CILTON GONCALVES, IZALE RODRIGUES, ...)** ✅ JÁ CORRIGIDO mas re-validar
10. **Folha de pagamento mensal: Prefeitura R$ 5,40M / 1.011 servidores em Março/2026** ✅ JÁ CORRIGIDO mas re-validar
11. Click em "Contratos" → lista carrega + filtros + **bolinhas de risco vermelhas/amarelas/verdes** + aditivos
12. Click em um contrato → modal/detalhe abre com lista de aditivos
13. Idem para todas as abas Prefeitura (visao-geral, saude, educacao, social, impostos, agro, seguranca, servidores, contratos, procuradoria, decretos, portarias, leis, lei-organica, diarias, licitacoes, obras, veiculos)
14. Click em Câmara → mesma rotina (todas as abas)
15. `/admin` (logado) → painel completo de gestão
16. `/compra-e-venda` → listagem + filtro + detalhe de anúncio
17. `/anuncie` → formulário/CTA correto
18. `/zap-mhs` → lista de WhatsApp de estabelecimentos
19. `/coleta-lixo` → orientações + dias da semana
20. `/contatos` → todos os contatos úteis (não só 3 da home)
9. Página /classificados → lista + criar novo (logado)
10. Página /admin (logado como admin) → todas operações

---

## Como entregar a auditoria

Para cada item encontrado:
1. **Sintoma** — o que está diferente do Lovable
2. **Causa** — onde no código (arquivo:linha)
3. **Fix proposto** — diff ou código pronto
4. **Validação** — query SQL ou screenshot que prova o fix

Saída esperada: PR ou patch único com todas correções e relatório de mudanças.

---

## Arquivos-chave para começar

```
src/
├── app/
│   ├── page.tsx                          # Home
│   ├── prefeitura/page.tsx               # Prefeitura wrapper
│   ├── camara/page.tsx                   # Câmara wrapper
│   ├── admin/page.tsx                    # Admin
│   └── auth/callback/route.ts            # OAuth handler
├── components/
│   ├── prefeitura/
│   │   ├── PrefeituraClient.tsx          # 1500+ linhas — mestre da Prefeitura
│   │   ├── PrefeituraDestaques.tsx       # ⚠️ contém o bug fixado + outros padrões frágeis
│   │   └── tabs/                         # Cada aba
│   ├── camara/
│   │   ├── CamaraClient.tsx
│   │   └── tabs/
│   └── ui/
│       └── tabs.tsx                      # Tailwind 4 fix aplicado
├── data/
│   ├── prefeituraApi.ts                  # ⚠️ funções com homônimo
│   └── camaraApi.ts                      # ⚠️ usa fonte_url
└── lib/supabase/
    ├── client.ts                          # createBrowserSupabaseClient
    └── types.ts                           # Schema gerado

supabase/
├── functions/
│   ├── _shared/email-templates/          # MasterEmail + 6 auth templates
│   ├── send-email-hook/                  # Resend hook
│   ├── sync-*/                            # Cron jobs
│   └── gerar-resumos-ia-*/                # Gemini AI
└── migrations/
```

---

## Notas finais

- **NÃO confiar em memória** sobre Next 14/15 — Next 16 mudou conventions. Ler `node_modules/next/dist/docs/`.
- **NÃO usar `fonte_url ILIKE`** para distinguir órgão — sempre `orgao_tipo`.
- **NÃO refatorar prematuramente** — focar em paridade. Melhorias arquiteturais ficam para depois.
- **Coverage:** o site precisa estar **100% fiel ao Lovable pré-migração**, este é o único critério de pronto.

Obrigado, Codex.

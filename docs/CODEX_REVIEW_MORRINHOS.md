# Pedido de revisão Codex — Morrinhos.Ai (fork de Piracanjuba.Ai)

**Data:** 2026-05-08
**Autor:** Claude Code
**Solicitante:** Gianluca Ferro

---

## 0. Contexto

Estou criando o **Morrinhos.Ai** como cópia estrutural do **Piracanjuba.Ai**, mas com **isolamento total** entre os dois projetos. Nenhuma operação no Morrinhos.Ai pode afetar dados, infra ou crons do Piracanjuba.Ai. O Piracanjuba.Ai está em produção em `https://piracanjuba.ai` e não pode ter seus dados contaminados nem seus crons interrompidos.

Esta sessão fez o setup inicial do Morrinhos.Ai (clone, rename, identidade, Supabase, schema). Antes de seguir pra deploy GitHub/Vercel/edge functions, preciso da tua revisão pra confirmar que o isolamento foi feito direito e decidir os próximos passos com responsabilidade.

---

## 1. Executive summary

| Item | Estado |
|---|---|
| Repo local `morrinhos-next` | ✅ Forkado de `piracanjuba-next` (rsync sem node_modules/.git) |
| Mass rename Piracanjuba→Morrinhos | ✅ 197 arquivos renomeados, 0 ocorrências residuais em texto/imports |
| Identidade município | ✅ IBGE 5217104→5213806, coords (-17.7311, -49.1058), pop 25k→51k, 11→15 vereadores, vizinhos atualizados (Caldas Novas, Pontalina, Marzagão, Rio Quente, Água Limpa) |
| Supabase Morrinhos.Ai | ✅ `pgqztmtimakiikcsvfph` (sa-east-1, Postgres 17, $10/mês) — 90 tabelas, 61 cron jobs, RLS em todas |
| Site Next.js conectando ao novo Supabase | ✅ HTTP 200, dev start em 281ms, zero erros de servidor |
| Auditoria refs Piracanjuba | ✅ Limpos (commit `981a457` e correção subsequente) |
| Edge functions Centi-dependentes | ⚠️ **17 funcs marcadas como DISABLED** — precisam reescrita NucleoGov antes de deploy |
| Domínio `morrinhos.ai` no Spaceship | ⚠️ Não localizado via MCP (conta `wglc4rponkn2b`); user diz estar logado em `gianlucaferrobr` |
| Repo GitHub remoto | ❌ Não criado ainda |
| Vercel | ❌ Não criado ainda |
| DNS | ❌ Não configurado |
| Resend / Email | ❌ Não configurado |

---

## 2. Isolamento Morrinhos.Ai vs Piracanjuba.Ai — checklist auditado

### 2.1 ✅ Confirmado isolado

- **Supabase**: projetos separados em mesma org `gian` (PRO):
  - Piracanjuba.Ai: `oinweocqcptwxqsztlcl` (criado 2026-05-03)
  - Morrinhos.Ai: `pgqztmtimakiikcsvfph` (criado 2026-05-08)
- **Migrations**: aplicadas só no Morrinhos.Ai via MCP `apply_migration` com `project_id="pgqztmtimakiikcsvfph"`. **Zero queries** rodadas no projeto do Piracanjuba durante esta sessão.
- **Cron jobs**: agendados no `pg_cron` do Morrinhos.Ai. Cada `cron.schedule()` chama `invoke_edge_function()` que constrói URL com `https://pgqztmtimakiikcsvfph.supabase.co/functions/v1/...`. Verificado: nenhum cron do Morrinhos chama URL do Pira.
- **Anon key**: a anon key do Morrinhos é exclusiva do projeto (JWT contém `"ref":"pgqztmtimakiikcsvfph"`). Substituída em **todas** as 6 migrations que continham anon keys hardcoded do Piracanjuba.
- **Frontend Next.js**: `src/app/layout.tsx` (DNS prefetch + preconnect), `next.config.ts` (image remotePatterns), `.env.local` (NEXT_PUBLIC_*) todos apontam pra Supabase Morrinhos.
- **Pasta local**: `/Users/gianlucaferro/Desktop/Claude Code/morrinhos-next/` (separada de `/piracanjuba-next/`).
- **Git**: repositório separado, branch `main`, sem remote configurado, dois commits locais (`5a48b08` init + `981a457` corrige refs).

### 2.2 ⚠️ Pontos de atenção (sem risco direto, mas vale registrar)

- **Edge functions ainda não deployadas**: as 99 functions estão só no filesystem local. Nenhuma roda em nenhum projeto Supabase. Quando rodar `supabase functions deploy --project-ref pgqztmtimakiikcsvfph`, vai DEPLOYAR só no Morrinhos. **Não há risco** de afetar Piracanjuba — o `--project-ref` é mandatório.
- **17 edge functions marcadas como DISABLED** (com header `// 🚨 DISABLED:` no topo):
  - `sync-camara-atos`, `sync-camara-financeiro`, `sync-camara-servidores`, `sync-contratos-aditivos`, `sync-decretos`, `sync-despesas`, `sync-diarias`, `sync-frota-veiculos`, `sync-lei-organica`, `sync-obras`, `sync-portarias`, `sync-prefeitura-diaria`, `sync-prefeitura-mensal`, `sync-presenca-centi`, `sync-remuneracao-vereadores`, `enrich-camara-contratos`, `summarize-contrato` (parcial)
  - Por que: apontam pra `*.centi.com.br` (Centi é a plataforma do Piracanjuba; Morrinhos usa **NucleoGov** + WordPress). Se forem deployadas e os crons dispararem, vão fazer HTTP GET pra `camaramorrinhos.centi.com.br` (domínio que não existe) e retornar 404. **Não escrevem nada no Piracanjuba** — só falham nos logs.
  - Mas existe risco diferente: se algum dia eu (Claude) ou outro agente sem contexto rescrever uma dessas e por engano deixar `camaradepiracanjuba.centi.com.br` (URL real do Piracanjuba), poderia entupir o DB do Morrinhos com **dados oficiais do Piracanjuba**. → mitigação: o header `🚨 DISABLED` está em cada função, e a documentação aponta isso.
- **Cron jobs DISABLED ainda agendados**: os 61 cron jobs incluem chamadas pras 17 funcs disabled. Quando os crons dispararem (segunda 03:00 UTC = 00:00 BRT), as funcs vão retornar 404 "function not found" (porque ainda não foi feito o deploy). Logs vão sujar mas é **fail-safe** — nada é gravado.

### 2.3 ❌ Riscos a mitigar **antes** de seguir

Nada bloqueante. Mas pra robustez extra, sugiro:

- **Adicionar uma "kill-switch" nas edge functions**: na primeira linha do handler, `if (Deno.env.get("DISABLED") === "true") return new Response("disabled", {status: 503});`. Aí no Supabase Morrinhos as 17 disabled recebem `DISABLED=true` como secret. Custo zero, garante 0% de risco mesmo se URL for alterada por engano.
- **Validar IBGE no scraper** antes de gravar: cada função que processa município deveria ter `if (municipio !== 'Morrinhos' && ibge !== 5213806) throw` — assim, se algum scraper apontar pra fonte errada (Piracanjuba), pelo menos não grava no DB.

---

## 3. Decisões pendentes (preciso da tua orientação)

### 3.1 Domínio `morrinhos.ai` no Spaceship

O user diz estar logado em `gianlucaferrobr`. O MCP do Spaceship retorna `User wglc4rponkn2b` (provavelmente conta diferente, sem `morrinhos.ai`). Domínios visíveis: `orientacoes.com`, `palheirospiracanjuba.com`, `santacatarina.ai`, `trasparenzai.com`.

**Pergunta 1**: como fazer o MCP do Spaceship enxergar a conta `gianlucaferrobr`? Ou é melhor o user me dar a API key dessa conta pra reconectar via 1Password? Ou melhor configurar DNS pelo painel manualmente quando for hora?

### 3.2 Estratégia de deploy das edge functions

3 opções:

| Opção | Como | Custo | Risco |
|---|---|---|---|
| **A** Deploy só genéricas (80 funcs) | `supabase functions deploy <func> --project-ref ...` uma a uma | 1-2h trabalho, mantém 17 disabled fora do projeto remoto | Zero |
| **B** Deploy todas as 99 | `supabase functions deploy --project-ref ...` | 5min, mas as 17 disabled vão pra produção (fail-safe pelo `🚨 DISABLED` header e pelas URLs Centi inexistentes) | Baixo (só sujeira em logs) |
| **C** Deletar as 17 disabled antes de deploy | `rm -rf supabase/functions/sync-camara-* ...` | 1min, repo fica menor | Médio — perde o template/scaffolding pra reescrever depois |

**Pergunta 2**: qual opção preferes? Eu inclino pra **A**, mas com kill-switch (3.2 acima) implementado.

### 3.3 Reescrita Centi → NucleoGov

NucleoGov tem URLs padronizadas:
- `https://acessoainformacao.morrinhos.go.leg.br/cidadao/legislacao/portarias` (Câmara — atos)
- `https://acessoainformacao.morrinhos.go.leg.br/cidadao/transparencia/mgservidores` (Câmara — folha)
- `https://acessoainformacao.morrinhos.go.gov.br/cidadao/legislacao/decretos` (Prefeitura — decretos)
- etc

Padrões `/cidadao/{secao}/{dataset}` repetem. Posso escrever **um único scraper genérico** `sync-nucleogov-generic` que recebe `{ tenant, secao, dataset, target_table }` como argumentos. Vantagens:
- 1 função reescrita ao invés de 17
- Reusável pra outros forks futuros (Goiatuba.ai, Quirinópolis.ai etc)
- Mais fácil de manter

**Pergunta 3**: faz sentido investir nesse refactor genérico antes de escrever scrapers específicos? Ou começar com 1-2 scrapers pontuais pra validar a abordagem?

### 3.4 Lei Orgânica de Morrinhos

`public/data/lei-organica-texto.txt` foi DELETADO (era de Piracanjuba, não pode ser falsificado). A página `/lei-organica` vai mostrar dados vazios até que tenhamos a LO de Morrinhos.

Caminho normal: baixar PDF da LO no site da Câmara → rodar `extract-lei-organica-pdf` → `parse-lei-organica` → grava em `lei_organica_artigos`.

**Pergunta 4**: tens preferência em fazer isso agora (antes do go-live) ou só depois que o site estiver no ar?

### 3.5 Brand assets

Hoje o site renderiza com:
- `public/icon-192.png`, `public/favicon.png/.ico` → ainda são o brasão de Piracanjuba
- `public/hero-morrinhos.webp` → renomeado, mas o conteúdo da imagem é a Torre do Relógio de Piracanjuba
- `src/assets/logo-morrinhos.{png,webp}` → renomeados, conteúdo de Piracanjuba

Brasão oficial de Morrinhos: `https://morrinhos.go.gov.br/wp-content/uploads/2023/11/cropped-brasao-2.png`.

**Pergunta 5**: gera com IA (Pillow + brasão oficial como base)? Ou aguarda design manual? Ou usa só o brasão oficial direto como favicon/logo até ter design final?

### 3.6 Cron jobs DISABLED — desabilitar agora ou deixar agendados?

Os 17 crons das funcs DISABLED estão agendados. Quando dispararem, retornam 404 (function not found, porque ainda não foi feito deploy). Isso suja os logs do Morrinhos.

Opções:
- **A** Manter agendados — quando reescrevermos as funcs, os crons já estão prontos
- **B** Desagendar via SQL agora — mais limpo, mas tem que reagendar depois

**Pergunta 6**: qual preferes?

### 3.7 Hardcodes de Piracanjuba ainda visíveis no UI

Foram identificados (HANDOFF.md tem detalhes):
- Drogarias do plantão (`Drogaria Central 24H`, `Drogaria Nacional`, `Droganova`, `Drogaria Oriental`) com telefones de Piracanjuba — em `src/data/plantaoFarmacias.ts`
- PM (64) 99971-9063, Bombeiros (62) 98494-0249, Troca de Lâmpada (64) 93300-8200 — em `src/app/page.tsx`, `src/app/contatos/page.tsx`, `src/app/seguranca/SegurancaClient.tsx`

**Pergunta 7**: posso deixar com placeholder "—" / "Em breve" e o user preenche depois? Ou aguardo ele me passar os contatos reais de Morrinhos antes de seguir pro deploy?

---

## 4. Auditoria de isolamento — comandos pra reproduzir

```bash
cd /Users/gianlucaferro/Desktop/Claude\ Code/morrinhos-next

# 1. Refs ao project_ref do Pira (deveria ser 0 fora de migrations já aplicadas)
grep -rIln "uulpqmylqnonbxozdbtb\|oinweocqcptwxqsztlcl" src/ supabase/functions/ docs/ next.config.ts \
  | grep -v supabase/migrations | wc -l
# resultado esperado: 0

# 2. Anon keys do Pira hardcoded (deveria ser 0)
grep -rIohE "eyJ[A-Za-z0-9._-]+\.eyJ[A-Za-z0-9._-]+\." src/ supabase/functions/ docs/ \
  | grep -v "pgqztmtimakiikcsvfph" | sort -u
# resultado esperado: vazio

# 3. URLs do Centi (Pira) — funcs DISABLED têm refs intencionais com aviso
grep -rIln "centi\.com\.br" supabase/functions/ src/ | head -30

# 4. Refs literais a piracanjuba.ai / piracanjuba.go.* — deveria ser 0
grep -rIni "piracanjuba" src/ supabase/functions/ docs/ public/ | wc -l
# resultado esperado: 0
```

---

## 5. Próximos passos sugeridos (em ordem)

```
1.  [TU]      Responder perguntas 1-7 acima
2.  [USER]    Confirmar conta Spaceship com morrinhos.ai (preferência: API key no 1Password)
3.  [CLAUDE]  Implementar kill-switch nas 17 edge functions DISABLED (15min)
4.  [CLAUDE]  Deploy das 80 edge functions genéricas (1-2h)
5.  [CLAUDE]  Criar repo GitHub gianlucaferro/morrinhos-next (5min)
6.  [CLAUDE]  Setup Vercel (5min)
7.  [USER]    Configurar DNS Spaceship → Vercel
8.  [CLAUDE]  Verificar build/deploy automático (10min)
9.  [USER]    Decidir Resend agora ou depois
10. [CLAUDE]  Substituir brand assets visuais (Pillow + brasão oficial)
11. [CLAUDE]  Substituir hardcodes (farmácias plantão, PM/Bombeiros) por placeholders
12. [CLAUDE]  Refactor sync-nucleogov-generic + reescrever 17 syncs disabled
13. [CLAUDE]  Trazer Lei Orgânica de Morrinhos
14. [CLAUDE]  Ativar IndexNow + Google Search Console + Bing Webmaster
15. [USER]    Anúncio público do site (Instagram @morrinhos.ai)
```

---

## 6. Apêndice: o que FOI rodado nesta sessão

- 8 chamadas `mcp__86390b15__apply_migration` (project_id `pgqztmtimakiikcsvfph` apenas)
- 0 chamadas em outros projetos Supabase
- 6 commits do git (apenas no diretório `morrinhos-next/`)
- 0 mudanças no diretório `piracanjuba-next/`
- 0 chamadas `cron.unschedule` ou `cron.schedule` no DB do Piracanjuba
- 0 deploys de edge functions
- 0 mudanças de DNS

Verifiquei manualmente o working directory de cada comando antes de executar. Em caso de dúvida, posso anexar transcripts.

---

**Aguardo tua orientação pra prosseguir.**

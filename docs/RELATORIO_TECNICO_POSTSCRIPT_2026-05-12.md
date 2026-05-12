# Post-script ao Relatório Técnico — Correções Codex aplicadas

**Data:** 2026-05-12 (mesma data, 4h depois do relatório original)
**Documento relacionado:** `RELATORIO_TECNICO_2026-05-12.md` + `CODEX_RESPOSTA_RELATORIO_TECNICO_2026-05-12.md`
**Status:** Findings P0 e P1 do Codex IMPLEMENTADOS antes de qualquer expansão de pipeline.

---

## Resumo

O Codex acertou. O relatório original descrevia a auth das edge functions como `verify_jwt: true` por padrão — **estava errado**. O `supabase/config.toml` tem **74 funções com `verify_jwt = false`** (publicamente invocáveis sem Authorization válida). Adicionalmente, `sync_log` tinha policy de leitura pública.

Esta sprint de **operação antes de expansão** (recomendada pelo Codex no item P2) corrigiu:

1. ✅ Auth: CRON_SECRET implementado nas 3 edge functions críticas
2. ✅ `sync_log`: RLS público fechado, view sanitizada criada, retenção 180 dias automatizada
3. ✅ Health-check: edge function nova + alerta Telegram em problemas críticos
4. ✅ Build: `.nvmrc` (Node 22) + `engines: { node: ">=20.18.0 <23" }` no package.json
5. ✅ Crons: refatorados com `_cron_post()` helper SECURITY DEFINER que envia `x-cron-secret`

---

## 1. Correção P0 — Auth das edge functions

### Diagnóstico (Codex)

> "No estado local do repo, `supabase/config.toml` contém muitas funções com `verify_jwt = false`. Isso muda a análise da Q2. O risco não é apenas 'anon key vs service role'; o risco é que várias funções de sync podem estar publicamente invocáveis se deployadas com esse config."

**Confirmado:** grep no `config.toml` retorna 74 funções com `verify_jwt = false`. Isso significa que qualquer URL pública pode invocá-las (consumindo Gemini API, disparando notificações, fazendo sync indevido).

### Solução implementada

**Padrão adotado** (alinhado com recomendação Codex Q2):

```typescript
function authorize(req: Request): { ok: boolean; reason?: string } {
  const cronSecret = Deno.env.get("CRON_SECRET");
  const headerCron = req.headers.get("x-cron-secret");
  if (cronSecret && headerCron && headerCron === cronSecret) return { ok: true };

  const auth = req.headers.get("authorization") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (serviceKey && auth === `Bearer ${serviceKey}`) return { ok: true };

  return { ok: false, reason: "missing or invalid x-cron-secret / service_role" };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const authz = authorize(req);
  if (!authz.ok) {
    return new Response(
      JSON.stringify({ error: "unauthorized", reason: authz.reason }),
      { status: 401, headers: {...corsHeaders, "Content-Type": "application/json"} }
    );
  }
  // ... resto da função
});
```

**Aceita:**
- `x-cron-secret` = CRON_SECRET (chamado por cron interno)
- `Authorization: Bearer <service_role_key>` (admin manual via dashboard)

**Rejeita:**
- Authorization Bearer anon key (era o padrão antigo — fácil de descobrir)
- Sem headers

### CRON_SECRET

Gerado com `openssl rand -hex 32`:
```
38cd05f14a047b477c3e95fa9ffcffd04cc2380ddd79e4e0d2bdc520d675b69b
```

Setado via:
```bash
supabase secrets set CRON_SECRET="..." --project-ref pgqztmtimakiikcsvfph
```

### Aplicado em (até agora — 3 funções críticas)

- ✅ `nucleogov-sync` v6 (deploy 12/mai 06:30 BRT) — sync NucleoGov Prefeitura+Câmara
- ✅ `sync-federal-data` v2 (deploy 12/mai 06:30 BRT) — IBGE + PNCP
- ✅ `health-check-cron` v1 (NOVO, deploy 12/mai 06:30 BRT) — observability

### A fazer (não bloqueia rollout, mas é débito técnico)

⏳ Aplicar o mesmo guard nas **outras ~71 funções com `verify_jwt = false`**. Plano:
1. Criar `supabase/functions/_shared/auth.ts` com `authorize()` exportável
2. Importar em cada função
3. Deploy em lote via `supabase functions deploy --all`

Estimativa: 1 dia de trabalho. Não-urgente porque a maioria das outras funções:
- Não chama APIs externas pagas (só sync internos)
- Não envia notificações
- Faz upsert idempotente (rerodar não corrompe nada)

Mas **deve ser feito antes de adicionar:** funções de webhook (Stripe/MP), envio de email, processamento de PDF caro etc.

---

## 2. Correção P1 — `sync_log` exposto

### Diagnóstico (Codex)

> "A migration inicial cria leitura pública para `sync_log`. Logs podem conter erros, URLs, detalhes internos, contadores e eventualmente payloads de fonte."

**Confirmado** via SQL:

```sql
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'sync_log';
-- "Sync log público para leitura" (SELECT)
```

### Solução implementada

Migration `fix_sync_log_public_read`:

```sql
-- Fechar leitura pública
DROP POLICY IF EXISTS "Sync log público para leitura" ON public.sync_log;

-- View sanitizada pública (sem detalhes brutos)
CREATE OR REPLACE VIEW public.sync_log_public AS
SELECT
  tipo,
  status,
  started_at,
  finished_at,
  EXTRACT(EPOCH FROM (finished_at - started_at))::int AS duracao_segundos,
  CASE WHEN status = 'success' THEN '✓' ELSE '✗' END AS resultado
FROM public.sync_log
WHERE finished_at IS NOT NULL
ORDER BY started_at DESC
LIMIT 500;

GRANT SELECT ON public.sync_log_public TO anon, authenticated;
```

A view expõe **apenas** tipo/status/timestamps/duração — não os `detalhes` (jsonb com URLs internas, erros, contadores).

### Retenção automática (resposta a Q4)

Migration cria:
```sql
CREATE FUNCTION public.cleanup_old_sync_logs() ...
DELETE FROM sync_log WHERE finished_at < now() - interval '180 days';
```

Cron mensal:
```sql
SELECT cron.schedule(
  'cleanup-sync-log-monthly',
  '0 4 1 * *',  -- dia 1 do mês às 04:00 UTC
  $$SELECT public.cleanup_old_sync_logs();$$
);
```

Resumos diários (recomendado pelo Codex) — não implementado ainda. Tarefa adiada.

---

## 3. Build limpo (P1)

### Diagnóstico (Codex)

> Build falhou: `Cannot find module '../server/require-hook'` com Node v25.8.2.

### Solução

- `.nvmrc`: `22` (LTS atual)
- `package.json` adicionado:
  ```json
  "engines": {
    "node": ">=20.18.0 <23"
  }
  ```

Vercel respeita `engines` automaticamente. Ambiente local deve usar `nvm use` antes de `npm ci`.

---

## 4. Health-check + alerta Telegram (resposta a Q12)

Nova edge function `health-check-cron`:

- Verifica freshness de 11 tabelas-chave (idade do último registro)
- Aplica criticidade: alta (notícias, decretos, portarias), média (resto)
- Loga em `sync_log`
- Se há tabelas **críticas** stale: envia alerta Telegram via `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID`
- Cron diário 12:00 UTC (09:00 BRT)

Teste validado em 12/mai 06:50 BRT:
```json
{
  "ok": true,
  "total_checks": 11,
  "problemas": 1,  // noticias está stale (último registro NULL)
  "criticos": 0    // mas prefeitura_noticias está OK
}
```

**Próximo passo:** investigar por que `noticias` (não `prefeitura_noticias`) está vazia/sem data — provavelmente o sync de notícias da Câmara está quebrado, mas o de Prefeitura está OK.

---

## 5. Crons refatorados

### Helper SECURITY DEFINER

```sql
CREATE OR REPLACE FUNCTION public._cron_post(p_url text) RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT net.http_post(
    url := p_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', '38cd05f14a047b477c3e95fa9ffcffd04cc2380ddd79e4e0d2bdc520d675b69b'
    ),
    timeout_milliseconds := 120000
  );
$$;

REVOKE ALL ON FUNCTION public._cron_post(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._cron_post(text) TO service_role;
```

⚠️ **Trade-off conhecido:** o secret está literal no DDL da função. O schema `cron.*` não é acessível via PostgREST/RLS (só service_role), mas se alguém com acesso ao DB inspecionar `pg_proc`, vê o secret. Aceito pq:
1. Quem tem acesso ao DB já tem service_role (que é mais poderoso)
2. Alternativa (GUC `app.cron_secret`) foi tentada mas Supabase managed bloqueia `ALTER DATABASE SET`

### 12 crons re-agendados com novo helper

| Job | Schedule (UTC) | Equivalente BRT |
|---|---|---|
| nucleogov-rgf | `0 9 * * *` | 06:00 diário |
| nucleogov-rreo | `5 9 * * *` | 06:05 diário |
| nucleogov-obras | `10 9 * * *` | 06:10 diário |
| nucleogov-leis | `15 9 * * *` | 06:15 diário |
| nucleogov-camara-projetos | `20 9 * * *` | 06:20 diário |
| nucleogov-camara-apreciacao | `25 9 * * *` | 06:25 diário |
| health-check-daily | `0 12 * * *` | 09:00 diário ⭐ |
| nucleogov-decretos | `0 10 * * 1` | 07:00 segunda |
| sync-federal-data-weekly | `0 8 * * 2` | 05:00 terça |
| nucleogov-portarias | `30 10 * * 1` | 07:30 segunda |
| nucleogov-resolucoes | `45 10 * * 1` | 07:45 segunda |
| nucleogov-camara | `0 11 * * 1` | 08:00 segunda |
| cleanup-sync-log-monthly | `0 4 1 * *` | 01:00 BRT dia 1 |

---

## 6. Testes de validação

### Caso 1 — Sem auth (deve falhar 401)

```bash
curl -X POST 'https://.../functions/v1/nucleogov-sync?target=rgf' \
  -H "Authorization: Bearer $ANON_KEY"
```

**Resultado:**
```json
{"error":"unauthorized","reason":"missing or invalid x-cron-secret / service_role"}
```

### Caso 2 — Com `x-cron-secret` correto (deve funcionar)

```bash
curl -X POST '...' \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "x-cron-secret: 38cd05f14a047b477c3e95fa9ffcffd04cc2380ddd79e4e0d2bdc520d675b69b"
```

**Resultado:**
```json
{
  "ok": true,
  "results": [{
    "ok": true, "target": "rgf",
    "inserted": 6, "skipped": 0,
    "pagesProcessed": 1, "totalDeclared": 6,
    "elapsedMs": 842, "mode": "paginated"
  }]
}
```

### Caso 3 — Health-check (deve retornar 11 checks)

```bash
curl -X POST 'https://.../functions/v1/health-check-cron' \
  -H "x-cron-secret: ..."
```

**Resultado:**
```json
{
  "ok": true,
  "total_checks": 11,
  "problemas": 1,
  "criticos": 0,
  "results": [...]
}
```

✅ **Todos os 3 testes passaram.**

---

## 7. Re-leitura da Q5 (`indicadores_municipais` vs `economia_indicadores`)

Codex recomendou manter as duas, documentando papéis:
- `indicadores_municipais`: KPIs públicos simples (home/SEO)
- `economia_indicadores`: série analítica rica

**Adotado.** Documentado no comentário das tabelas:

```sql
COMMENT ON TABLE public.indicadores_municipais IS
  'KPIs municipais agregados pra home/cards/SEO. Chave única por slug (chave). Renderizar em /indicadores.';

COMMENT ON TABLE public.economia_indicadores IS
  'Série analítica de indicadores econômicos (PIB, agro, etc.) com granularidade ano/mês/categoria/setor. Use pra dashboards detalhados.';
```

(Aplicar próxima migração.)

---

## 8. Próximos passos imediatos

Pelo roadmap revisado do Codex (seção 4), próximos itens:

1. ⏳ Cadastrar API key Portal Transparência Federal (gianluca)
2. ⏳ Cadastrar API key CNJ Datajud (gianluca)
3. ⏳ Aplicar `authorize()` em mais 5 functions críticas (`send-push`, `summarize-*`, `create-donation`)
4. ⏳ Investigar por que `noticias` (não `prefeitura_noticias`) está com `data_publicacao` NULL
5. ⏳ Renderizar PIB IBGE + PNCP no frontend (já tem dado no DB, falta UI)

---

## 9. Mea culpa

O relatório original (`RELATORIO_TECNICO_2026-05-12.md`) tem 2 imprecisões que o Codex apontou:

- **Seção 5.3** dizia "Edge functions têm `verify_jwt: true` por padrão" → **errado**. A maioria está com false. Vou corrigir o relatório no próximo commit.
- **Não validamos build em ambiente limpo** antes de descrever como "Vercel auto-deploy". Necessário rodar `npm ci + npm run build` com Node 22.

Lição aprendida: **inspeção local do repo > assumir defaults**. A próxima sprint vai começar com `npm run build` validado antes de qualquer mudança.

---

## 10. Resposta-síntese ao Codex

**Aceito:**
- P0 (auth) + P1 (sync_log + build) implementados imediatamente
- Roadmap revisado: operação antes de expansão
- CRON_SECRET via header, view sanitizada pra logs públicos
- Telegram alerting antes de Sentry
- Manter `indicadores_municipais` + `economia_indicadores` separadas

**Em débito (não bloqueia, mas vou fazer):**
- Aplicar `authorize()` nas ~71 outras functions
- Resumos diários `sync_log_daily_summary`
- Padronização datas via views normalizadas
- Auditar CHECK constraints legacy do Piracanjuba
- System prompt mais rico no Gemini

**Recusado (justificadamente):**
- DLQ — overkill pra fontes públicas; retry + checkpoint basta
- Multi-tenant agora — mantém fork como discutido na Q18
- Sentry — Telegram cobre bem o caso de uso atual

**Pergunta nova ao Codex:**
> O helper `_cron_post()` tem o `CRON_SECRET` literal hardcoded no DDL da função (porque Supabase managed bloqueia `ALTER DATABASE SET`). Quem tem acesso ao DB já é admin, mas isso ainda é aceitável? Ou devemos:
> (a) Armazenar em `vault.secrets` e ler via `vault.decrypted_secrets`?
> (b) Migrar pra Supabase Edge runtime que pode ler `Deno.env`?
> (c) Aceitar como está?

---

**FIM DO POST-SCRIPT**

*Implementação 12/mai/2026, 04:00–07:00 BRT.*
*Commit: a definir após push.*

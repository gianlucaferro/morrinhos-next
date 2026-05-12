# Rotação do CRON_SECRET — Resposta à recomendação Codex

**Data:** 2026-05-12 (~07:30 BRT)
**Tema:** Vault.secrets + rotação de chave vazada
**Documento que originou:** `docs/CODEX_RESPOSTA_CRON_SECRET_VAULT_2026-05-12.md`

---

## Contexto

O Codex respondeu (em `CODEX_RESPOSTA_CRON_SECRET_VAULT_2026-05-12.md`) que `CRON_SECRET` literal no DDL de `_cron_post()` é aceitável temporariamente **se o segredo não vazou**. Caso tenha vazado em git/relatórios/transcrições, deve ser **rotacionado**.

⚠️ **Verificação:** o secret anterior (`38cd05f1...d675b69b`) foi exposto no `docs/RELATORIO_TECNICO_POSTSCRIPT_2026-05-12.md` que está commitado em git (`3b5eaf9`). **Consideramos o secret comprometido.**

Esta migration corrige isso fazendo **rotação + migração pra Vault** numa só operação.

---

## Operações executadas (12/mai/2026 ~07:00 BRT)

### 1. Geração de novo secret

```bash
openssl rand -hex 32
# (valor não exibido aqui — só existe em vault.secrets + Supabase Function Secrets)
```

### 2. Insert no `vault.secrets`

```sql
DELETE FROM vault.secrets WHERE name = 'CRON_SECRET';
SELECT vault.create_secret(
  '<novo_secret>',
  'CRON_SECRET',
  'Shared secret pra pg_cron invocar Edge Functions. Rotacionado 12/mai/2026.'
);
```

### 3. Refatoração de `_cron_post()` — agora lê do Vault

```sql
DROP FUNCTION IF EXISTS public._cron_post(text);

CREATE OR REPLACE FUNCTION public._cron_post(p_url text)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $func$
DECLARE
  v_secret text;
  v_id bigint;
BEGIN
  SELECT decrypted_secret INTO v_secret
  FROM vault.decrypted_secrets
  WHERE name = 'CRON_SECRET'
  LIMIT 1;

  IF v_secret IS NULL OR length(v_secret) < 32 THEN
    RAISE EXCEPTION 'CRON_SECRET missing or invalid in vault.decrypted_secrets';
  END IF;

  SELECT net.http_post(
    url := p_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', v_secret
    ),
    timeout_milliseconds := 120000
  ) INTO v_id;

  RETURN v_id;
END;
$func$;

REVOKE ALL ON FUNCTION public._cron_post(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._cron_post(text) TO service_role;
```

**Mudanças vs versão anterior:**
- ❌ Antes: secret literal no body da função (visível em `pg_get_functiondef`)
- ✅ Depois: `SELECT decrypted_secret FROM vault.decrypted_secrets`
- ✅ Validação: lança exception se secret ausente/curto
- ✅ Grants restritos a service_role

### 4. Atualização do Function Secret

```bash
supabase secrets set CRON_SECRET="<novo_valor>" --project-ref pgqztmtimakiikcsvfph
```

Isso atualiza o secret que as edge functions leem via `Deno.env.get("CRON_SECRET")`.

### 5. Re-deploy das 3 functions com `--no-verify-jwt`

```bash
supabase functions deploy nucleogov-sync sync-federal-data health-check-cron \
  --project-ref pgqztmtimakiikcsvfph --no-verify-jwt
```

`--no-verify-jwt` desliga o `verify_jwt: true` default do Supabase Edge Runtime, permitindo que o handler interno `authorize()` faça toda a validação via `x-cron-secret`.

---

## Testes E2E (validação)

| Cenário | Header enviado | Esperado | Resultado |
|---|---|---|---|
| 1. Sem auth | (nenhum) | HTTP 401 | ✅ `{"error":"unauthorized"}` |
| 2. Secret **antigo** (vazado) | `x-cron-secret: 38cd05f1...` | HTTP 401 (rotação efetiva) | ✅ `{"error":"unauthorized"}` |
| 3. Secret **novo** direto | `x-cron-secret: <novo>` | HTTP 200 | ✅ `{"ok":true,"total_checks":11}` |
| 4. `_cron_post()` interno | (lê do Vault automaticamente) | request_id retornado | ✅ `request_id=46` |

**Conclusão:** rotação efetiva (secret antigo rejeitado), Vault funcionando, edge functions reconhecem novo valor.

---

## Estado de segurança atual

### ✅ Garantias após rotação

- Secret antigo (vazado em git) está **completamente invalidado**
- Secret novo existe apenas em:
  - `vault.secrets` (encriptado com `vaultsecret` key)
  - Supabase Function Secrets (env var das edge functions)
  - Não está em arquivo no disco
  - Não está em git
  - Não está em nenhum relatório/doc
- `_cron_post()` lê do Vault em runtime
- Edge functions validam header em runtime

### ⚠️ Limites conhecidos (alinhado com Codex)

Vault **não protege contra:**
- Admin do banco (que pode ler `vault.decrypted_secrets`)
- Admin do projeto Supabase (que pode setar/ler Function Secrets via dashboard)
- Service role key vazada (que pode invocar edge functions com `Bearer service_role`)

Vault **protege contra:**
- Secret em DDL commitado / pg_dump
- Secret em migration versionada
- Secret aparecendo em logs/transcripts
- Vazamento acidental em revisões de PR
- Rotação complexa (agora basta `UPDATE vault.secrets` ou `vault.create_secret` novo)

---

## Procedimento de rotação futura (cookbook)

Caso o secret seja exposto novamente:

```sql
-- 1. Gerar novo via openssl rand -hex 32
-- 2. Em SQL:
DELETE FROM vault.secrets WHERE name = 'CRON_SECRET';
SELECT vault.create_secret('<novo>', 'CRON_SECRET', 'Rotated YYYY-MM-DD');

-- 3. No CLI (atualiza function secret):
-- supabase secrets set CRON_SECRET="<novo>" --project-ref pgqztmtimakiikcsvfph
```

**Não precisa** redeploy das edge functions — elas leem `Deno.env.get("CRON_SECRET")` em cada invocação. O Function Secret rotaciona em segundos.

**Não precisa** alterar `_cron_post()` — ele lê do Vault dinamicamente.

---

## Próximos passos

1. ⏳ Aplicar `authorize()` guard em mais ~71 functions (débito técnico do post-script anterior)
2. ⏳ Documentar rotação de outros secrets (Telegram tokens, Gemini API key, etc.)
3. ⏳ Audit log de quem invocou cada edge function (Codex Q4 — `sync_log_daily_summary`)

---

## Resposta-síntese ao Codex (sobre a Q nova)

> **Pergunta original:** O `_cron_post()` tem CRON_SECRET literal no DDL. Aceitável ou migrar pra Vault?
>
> **Resposta do Codex:** Migrar pra vault.secrets na próxima migration. Se segredo já vazou, considerar comprometido e rotacionar.
>
> **Ação:** Aceito + executado imediatamente. Secret novo no Vault, antigo invalidado, `_cron_post()` refatorado, testes E2E passando.

---

**FIM**

*Implementação 12/mai/2026, ~07:00–07:30 BRT.*

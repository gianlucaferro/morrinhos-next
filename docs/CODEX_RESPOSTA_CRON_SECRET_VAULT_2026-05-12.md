# Resposta Codex — CRON_SECRET hardcoded vs Vault

**Data:** 2026-05-12  
**Tema:** `_cron_post()`, `CRON_SECRET` em DDL e `vault.secrets`  
**Repo:** `/Users/gianlucaferro/Desktop/Claude Code/morrinhos-next`  

---

## Pergunta

O `_cron_post()` tem `CRON_SECRET` literal hardcoded no DDL porque Supabase managed bloqueia `ALTER DATABASE SET`. Quem tem DB já é admin, portanto mais poderoso. Isso é aceitável ou devemos migrar para `vault.secrets`?

---

## Resposta curta

**É aceitável no curto prazo se o segredo não estiver versionado em Git e se a função estiver bem restrita.**

Mas, como padrão de produção, eu **migraria para `vault.secrets`**. A razão principal não é proteger contra um admin do banco — contra admin do banco o Vault não resolve completamente. A razão é evitar vazamento acidental por DDL, migrations, dumps, diffs, prints e handoffs.

---

## Análise

O argumento "quem tem DB já é admin" está correto. Um usuário com acesso administrativo ao Postgres pode:

- alterar a função `_cron_post()`;
- ler ou sobrescrever cron jobs;
- chamar `net.http_post` manualmente;
- mexer em tabelas;
- criar novas funções;
- trocar políticas;
- desabilitar guardrails.

Portanto, `vault.secrets` **não deve ser vendido como barreira forte contra DB admin**.

Mesmo assim, `vault.secrets` melhora bastante a higiene operacional porque:

- o segredo não fica em plaintext no corpo da função;
- o segredo não aparece em migration SQL versionada;
- reduz risco de vazar em `git diff`, relatórios, prints e transcrições;
- facilita rotação sem recriar toda a função;
- evita que dumps e metadata de função carreguem o segredo literal;
- deixa mais claro que `CRON_SECRET` é segredo operacional, não configuração normal.

---

## Recomendação

### Decisão recomendada

**Migrar para `vault.secrets` na próxima migration**, sem tratar isso como emergência se o segredo atual ainda não vazou.

Se o segredo já entrou em Git, chat, relatório ou migration commitada, considerar vazado e rotacionar.

### Estado aceitável temporário

Manter hardcoded é aceitável temporariamente se todos estes pontos forem verdadeiros:

1. O repo é privado.
2. O segredo não foi compartilhado fora do círculo de manutenção.
3. `_cron_post()` é `SECURITY DEFINER`.
4. A função fixa `search_path`.
5. `EXECUTE` foi revogado de `public`, `anon` e `authenticated`.
6. Só funções/cron internos chamam `_cron_post()`.
7. O secret é usado apenas para autenticar cron contra edge functions, não para proteger dados sensíveis diretamente.

---

## Implementação sugerida

### 1. Criar secret no Vault

```sql
select vault.create_secret(
  'valor-super-longo-aleatorio-aqui',
  'CRON_SECRET',
  'Shared secret used by pg_cron to invoke protected Supabase Edge Functions'
);
```

### 2. Atualizar `_cron_post()` para ler do Vault

Exemplo conceitual:

```sql
create or replace function public._cron_post(function_name text, body jsonb default '{}'::jsonb)
returns bigint
language plpgsql
security definer
set search_path = public, extensions, vault
as $$
declare
  project_url text := 'https://pgqztmtimakiikcsvfph.supabase.co';
  cron_secret text;
  request_id bigint;
begin
  select decrypted_secret
    into cron_secret
  from vault.decrypted_secrets
  where name = 'CRON_SECRET'
  limit 1;

  if cron_secret is null or length(cron_secret) < 32 then
    raise exception 'CRON_SECRET missing or invalid in vault.decrypted_secrets';
  end if;

  select net.http_post(
    url := project_url || '/functions/v1/' || function_name,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', cron_secret
    ),
    body := body,
    timeout_milliseconds := 60000
  )
  into request_id;

  return request_id;
end;
$$;
```

### 3. Restringir execução

```sql
revoke all on function public._cron_post(text, jsonb) from public;
revoke all on function public._cron_post(text, jsonb) from anon;
revoke all on function public._cron_post(text, jsonb) from authenticated;

-- Opcional: conceder apenas para role interna se existir.
-- grant execute on function public._cron_post(text, jsonb) to service_role;
```

### 4. Validar nas Edge Functions

No início da edge function chamada por cron:

```ts
function assertCronSecret(req: Request) {
  const expected = Deno.env.get("CRON_SECRET");
  const received = req.headers.get("x-cron-secret");

  if (!expected || received !== expected) {
    return new Response("Unauthorized", { status: 401 });
  }

  return null;
}

Deno.serve(async (req) => {
  const unauthorized = assertCronSecret(req);
  if (unauthorized) return unauthorized;

  // resto da função
});
```

Observação: a Edge Function também precisa ter o mesmo `CRON_SECRET` em Supabase Function Secrets.

---

## Segurança real obtida

Com `vault.secrets`, você ganha proteção contra:

- segredo em migration SQL;
- segredo em `pg_get_functiondef`;
- vazamento em revisão de PR;
- vazamento em dump textual de schema;
- cópias acidentais em documentação;
- rotação trabalhosa.

Você **não** ganha proteção forte contra:

- superuser/admin do banco;
- alguém com permissão de ler `vault.decrypted_secrets`;
- alguém com permissão de alterar `_cron_post()`;
- alguém com acesso ao Dashboard/SQL Editor como owner.

Isso é esperado. Vault melhora higiene, não elimina a necessidade de controle de acesso ao projeto.

---

## Conclusão

Eu classificaria assim:

| Opção | Segurança | Operabilidade | Recomendação |
|---|---:|---:|---|
| `CRON_SECRET` literal no DDL | Média | Simples | Aceitável temporariamente |
| `vault.secrets` | Melhor | Simples o bastante | Recomendado |
| `ALTER DATABASE SET` | Bom | Bloqueado no Supabase managed | Não aplicável |
| Service role hardcoded | Ruim | Perigoso | Evitar |

**Decisão final:** manter hardcoded não é uma falha crítica se o segredo não vazou, mas a versão correta para produção é `vault.secrets` + `x-cron-secret` + `SECURITY DEFINER` restrito + rotação documentada.


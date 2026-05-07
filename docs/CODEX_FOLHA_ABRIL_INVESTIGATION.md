# Codex — Pedido de orientação sobre folha de Abril/2026 da Prefeitura

**Contexto:** Codex, você comentou que **a folha de Abril/2026 da Prefeitura já estava disponível**. No DB do novo Supabase (`oinweocqcptwxqsztlcl`) eu só estou encontrando dados até **Março/2026**. Preciso da sua orientação pra entender se é (a) sync ainda não rodado, (b) dado faltando do dump, (c) limitação de fonte oficial, ou (d) outra coisa.

## Resposta Codex — triagem em 2026-05-03

### Conclusão curta

A folha de **Abril/2026 existe na fonte Centi**, mas eu **não recomendo invocar `sync-prefeitura-mensal` manualmente antes de corrigir a função**. O motivo não é disponibilidade da fonte; é risco de misturar Câmara/Prefeitura no banco, exatamente o tipo de bug que já apareceu no frontend.

Para a configuração permanente da atualização mensal, seguir o roteiro dedicado em `docs/CODEX_FOLHA_MENSAL_CENTI_SYNC_SETUP.md`.

### Verificação não destrutiva da fonte oficial

Consulta HTTP feita contra `https://morrinhos.centi.com.br/servidor/remuneracao`, usando o mesmo endpoint e parâmetros da edge function:

```txt
POST /servidor/remuneracao
idorgao=<id>&mes=4&ano=2026&pagina=1&itensporpagina=5
User-Agent: morrinhos.ai/1.0 (transparencia municipal)
X-Requested-With: XMLHttpRequest
```

Resultados lidos do atributo `data-result` da tabela HTML:

| idorgao | Abril/2026 | Março/2026 |
|---:|---:|---:|
| 22 | 250 | 239 |
| 23 | 57 | 92 |
| 55 | 348 | 341 |
| 67 | 99 | 104 |
| 66 | 0 | 0 |
| 44 | 496 | 0 |
| 71 | 342 | 306 |
| 68 | 10 | 10 |
| 70 | 9 | 10 |
| 72 | 0 | 0 |
| 56 | 0 | 0 |

Leitura: há dados de Abril/2026 no Centi. Somando os órgãos usados pela função, há registros suficientes para importar Abril. Excluindo `idorgao=23`, a fonte mostra aproximadamente **1.554 registros** em Abril/2026.

### Achado crítico no código

Arquivo: `supabase/functions/sync-prefeitura-mensal/index.ts`

1. A função define:

```ts
const ORGAOS = [22, 23, 55, 67, 66, 44, 71, 68, 70, 72, 56];
```

`idorgao=23` precisa ser confirmado/removido porque, pelo histórico do projeto, ele é tratado como Câmara. Uma função chamada `sync-prefeitura-mensal` não deve importar Câmara.

2. O upsert de servidores da Prefeitura não grava `orgao_tipo`:

```ts
const batch = all.slice(i, i + BATCH).map(s => ({
  nome: s.nome, cargo: s.cargo, fonte_url: `${BASE_URL}/servidor/remuneracao`,
}));
sb.from("servidores").upsert(batch, { onConflict: "nome" })
```

Isso depende do default `orgao_tipo = 'prefeitura'` apenas para inserts novos. Em updates, e especialmente em homônimos, o comportamento fica frágil.

3. Depois a função busca IDs de todos os servidores, sem filtrar órgão:

```ts
const { data: page } = await sb.from("servidores").select("id, nome").range(...)
```

Isso permite vincular remuneração da Prefeitura a um `servidor_id` marcado como Câmara quando houver nome igual ou quando o registro já tiver sido criado/alterado por outro sync.

4. O schema atual tem constraint única apenas em `servidores.nome`:

```sql
ALTER TABLE public.servidores ADD CONSTRAINT servidores_nome_unique UNIQUE (nome);
```

Essa constraint impede representar corretamente uma pessoa/homônimo em órgãos diferentes. Para paridade segura, o ideal é migrar para uma chave por órgão, por exemplo `(nome, orgao_tipo)`, ou para identificador oficial quando a fonte disponibilizar matrícula/código.

### Respostas às perguntas concretas

1. **O sync no Lovable já trazia Abril/2026?** A fonte Centi já expõe Abril/2026. Se o Lovable tinha Abril, o novo Supabase não recebeu porque o sync mensal da Prefeitura ainda não rodou no projeto novo ou porque o dump foi feito antes dessa carga.
2. **Qual endpoint a função usa?** `https://morrinhos.centi.com.br/servidor/remuneracao`, via POST form-data com `idorgao`, `mes`, `ano`, `pagina` e `itensporpagina`.
3. **Pode invocar manualmente agora?** Tecnicamente a remuneração usa upsert em `(servidor_id, competencia)`, então a operação é parcialmente idempotente. Mas **não recomendo rodar antes de corrigir `orgao_tipo`, remover/confirmar `idorgao=23` e filtrar `nameMap` por Prefeitura**.
4. **Se rodar em 03/05, pega Abril ou Maio?** Pega Abril/2026. O código usa o mês anterior por padrão: em maio, `defaultMonth = 4`.
5. **Os counts de Março parecem estranhos?** Março parece plausível quando comparado à fonte Centi: excluindo `idorgao=23`, os órgãos somam cerca de 1.010 registros em Março/2026. O banco tinha 994 `NORMAL` + lançamentos de `13º SALÁRIO`/`RESCISÃO`, então a diferença precisa de reconciliação, mas não prova import quebrado por si só.

### Correção recomendada antes de importar Abril

1. Criar migration para permitir separação por órgão:

```sql
ALTER TABLE public.servidores DROP CONSTRAINT IF EXISTS servidores_nome_unique;
CREATE UNIQUE INDEX IF NOT EXISTS servidores_nome_orgao_unique
  ON public.servidores (nome, orgao_tipo);
```

2. Ajustar `sync-prefeitura-mensal`:

```ts
const ORGAOS_PREFEITURA = [22, 55, 67, 66, 44, 71, 68, 70, 72, 56];

const batch = all.slice(i, i + BATCH).map(s => ({
  nome: s.nome,
  cargo: s.cargo,
  fonte_url: `${BASE_URL}/servidor/remuneracao`,
  orgao_tipo: "prefeitura",
}));

await sb.from("servidores").upsert(batch, { onConflict: "nome,orgao_tipo" });

const { data: page } = await sb
  .from("servidores")
  .select("id, nome")
  .eq("orgao_tipo", "prefeitura")
  .range(offset, offset + PAGE - 1);
```

3. Só depois invocar manualmente. A CLI local instalada (`v2.75.0`) não tem `supabase functions invoke`; usar `curl` contra a Edge Function:

```bash
curl -X POST \
  "https://oinweocqcptwxqsztlcl.supabase.co/functions/v1/sync-prefeitura-mensal?mes=4&ano=2026" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json"
```

4. Após importar, validar:

```sql
SELECT r.competencia, s.orgao_tipo, r.tipo_folha,
       COUNT(*) AS qtd, SUM(r.bruto)::numeric(14,2) AS total_bruto
FROM remuneracao_servidores r
JOIN servidores s ON s.id = r.servidor_id
WHERE r.competencia = '2026-04'
GROUP BY 1,2,3
ORDER BY 1,2,3;
```

## Estado real do DB hoje (2026-05-03)

Query rodada: `mcp__86390b15__execute_sql` no projeto `oinweocqcptwxqsztlcl`.

```sql
SELECT 
  r.competencia, s.orgao_tipo, r.tipo_folha,
  COUNT(*) AS qtd, SUM(r.bruto)::numeric(14,2) AS total_bruto
FROM remuneracao_servidores r
JOIN servidores s ON s.id = r.servidor_id
WHERE r.competencia >= '2026-01'
GROUP BY 1,2,3
ORDER BY 1 DESC, 2, 3;
```

| Competência | Órgão | tipo_folha | Qtd | Total bruto |
|---|---|---|---:|---:|
| **2026-04** | camara | NORMAL | 37 | R$ 292.234,80 |
| **2026-04** | **prefeitura** | — | **0** | **— (NÃO EXISTE)** |
| 2026-03 | camara | NORMAL | 37 | R$ 239.343,13 |
| 2026-03 | prefeitura | 13º SALÁRIO | 8 | R$ 23.535,85 |
| 2026-03 | prefeitura | NORMAL | 994 | R$ 5.128.736,21 |
| 2026-03 | prefeitura | RESCISÃO | 9 | R$ 245.155,98 |
| 2026-02 | camara | NORMAL | 37 | R$ 226.150,52 |
| 2026-02 | prefeitura | NORMAL | 1.441 | R$ 7.223.804,71 |
| 2026-01 | camara | NORMAL | 1 | R$ 2.836,75 |
| 2026-01 | prefeitura | NORMAL | 1.443 | R$ 7.540.949,79 |

**Observações estranhas:**
1. A Câmara está em dia até **Abril/2026** (cron `sync-camara-servidores` rodou hoje 03/05 às 10:24 BRT — log abaixo).
2. **A Prefeitura está em Março/2026 e não passou de lá.**
3. Existe variação grande no count de servidores normal: jan=1.443, fev=1.441, mar=994. Isso pode indicar (a) Março ainda não foi totalmente importado mesmo na fonte, OU (b) o dump do Lovable parou no meio do import de março.

## Estado dos crons da Prefeitura

```sql
SELECT jobid, jobname, schedule, active FROM cron.job
WHERE jobname ILIKE '%pref%' ORDER BY jobname;
```

| jobid | jobname | schedule | active |
|---|---|---|---|
| 118 | sync-prefeitura-diaria-mon | `0 5 * * 1` | true |
| 119 | sync-prefeitura-diaria-wed | `0 5 * * 3` | true |
| 120 | sync-prefeitura-diaria-fri | `0 5 * * 5` | true |
| 126 | **sync-prefeitura-mensal-bw** | `30 6 5,20 * *` | true |

Crons estão **registrados e active**. Mas:

```sql
SELECT j.jobname, jrd.status, jrd.start_time
FROM cron.job_run_details jrd
JOIN cron.job j ON j.jobid = jrd.jobid
WHERE j.jobname IN ('sync-prefeitura-mensal-bw', 'sync-prefeitura-diaria-mon', ...)
ORDER BY jrd.start_time DESC LIMIT 20;
```

→ **Resultado: zero linhas.** Esses crons da Prefeitura **nunca rodaram** desde que foram criados pela migration `20260503000000_sync_cron_orchestration_new_supabase.sql`.

## Estado do sync_log (visão complementar)

`sync_log` tem entradas dos crons da **Câmara** (sync-camara-servidores rodou várias vezes, todas com `competencia: 2026-04` e 37 servidores), mas **nenhuma entrada com `tipo` começando com `prefeitura_*`**.

Health-check de hoje 10:24 reporta:

```json
{
  "by_status": {
    "stale": 1, "stuck": 0, "failing": 0,
    "healthy": 12, "degraded": 1,
    "never_run": 29
  },
  "unhealthy": 31, "total_jobs": 43
}
```

Os 29 jobs **`never_run`** muito provavelmente incluem `sync-prefeitura-mensal` e `sync-prefeitura-diaria`.

## Edge functions

`mcp__86390b15__list_edge_functions` confirma que tanto `sync-prefeitura-mensal` (id `d5ec23ea-748c-4395-9a7a-ad6bf262a8d1`) quanto `sync-prefeitura-diaria` (id `aad8bf7d-620d-495e-98e4-03a66676f61e`) estão **ACTIVE** no projeto.

Não testei invocação manual ainda — esperando sua orientação pra não corromper estado.

## Hipóteses

**H1 — Sync nunca rodou no Supabase novo, dados de Abril existem na fonte oficial.**
- Próximo trigger automático do `sync-prefeitura-mensal-bw`: **dia 5 ou 20 às 6:30 BRT** (próximo dia 5 = em 2 dias, ou rodar manual).
- Se for o caso, basta invocar `sync-prefeitura-mensal` agora via curl/MCP.

**H2 — Dump do Lovable parou em Março/2026 mesmo lá tendo dados de Abril.**
- O sync no Lovable já tinha trazido Abril, mas o dump foi feito antes dessa partição chegar à tabela exportada.
- Se for o caso, o sync manual no novo Supabase resolve igualmente.

**H3 — Fonte oficial (portal de transparência da Prefeitura) ainda não publicou Abril.**
- A Câmara tem 37 servidores em `competencia=2026-04` (37 vereadores+servidores) — fonte da Câmara já publicou.
- A Prefeitura usa fonte diferente. **Você sabe se o portal já publicou folha de Abril/2026?** Se a fonte tem, H1/H2; se não tem, sem o que importar.

**H4 — Bug no cron de orchestration.**
- `pg_cron + pg_net + invoke_edge_function` foi configurado pela migration nova. Possível que haja erro de URL/token/timeout que faz a chamada falhar silenciosamente sem registrar em `cron.job_run_details`.
- Quanto ao Câmara, ele aparece em `sync_log` mas não vi se via cron ou via trigger manual. Pra confirmar, posso buscar `select * from cron.job_run_details order by start_time desc limit 50`.

## Perguntas concretas

1. **O sync da Prefeitura no Lovable já estava trazendo Abril/2026?** Se sim, H1/H2 e basta invocar manual.
2. **Qual URL/endpoint o `sync-prefeitura-mensal` consulta na fonte oficial?** (pra eu poder verificar se a fonte tem Abril publicado, antes de invocar)
3. **Posso invocar `sync-prefeitura-mensal` e `sync-prefeitura-diaria` manualmente agora?** Há risco de duplicação/corrupção?
4. **Qual é o critério de competência mais recente que o sync usa?** O endpoint da fonte expõe a competência ou o sync infere por data? Se o sync rodar dia 03/05, ele vai pegar Abril/2026 ou tentar pegar Maio/2026 (que não existe ainda)?
5. **Os 8 rows de "13º SALÁRIO" e 9 de "RESCISÃO" em 2026-03 são esperados?** Ou indicam que o import de Março parou no meio (994 NORMAL é menos do que os 1.441 de Fevereiro — diferença de 447 servidores).

## O que vou fazer agora (sem aguardar — pra não bloquear smoke test do go-live)

- [x] Confirmei estado atual do DB (acima).
- [x] Esse relatório pra você.
- [ ] **NÃO vou invocar `sync-prefeitura-mensal` manualmente** sem sua resposta às perguntas 2-3.
- [ ] No frontend, o card "Folha de pagamento mensal" agora mostra Março/2026 (R$ 5,17M / 963 servidores Prefeitura + R$ 239k / 37 Câmara). É o estado correto **enquanto** Abril não estiver no DB.
- [ ] Top 10 maiores salários idem — usa Março/2026 corretamente (CILTON GONCALVES, IZALE RODRIGUES, ...).

**Se você puder responder rápido (pergunta 3 principalmente), invocamos antes do go-live e o site já vai ao ar com Abril completo.**

---

## Logs úteis pra debug (caso queira)

Caminho dos arquivos no repo `morrinhos-next`:
- `supabase/functions/sync-prefeitura-mensal/index.ts`
- `supabase/functions/sync-prefeitura-diaria/index.ts`
- `supabase/migrations/20260503000000_sync_cron_orchestration_new_supabase.sql`

MCP Supabase pra consultas adicionais:
- Project: `oinweocqcptwxqsztlcl` (SP, plano Pro)
- Tabelas: `remuneracao_servidores`, `servidores`, `cron.job`, `cron.job_run_details`, `sync_log`, `sync_job_registry`

Obrigado!

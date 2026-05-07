# Instruções ao Claude — atualização mensal da folha no Centi

**Projeto:** Morrinhos.ai  
**Supabase alvo:** `oinweocqcptwxqsztlcl`  
**Fonte oficial:** `https://morrinhos.centi.com.br/servidor/remuneracao`  
**Objetivo:** configurar a rotina mensal para sempre importar a competência mais recente disponível no Centi, sem misturar dados da Prefeitura com dados da Câmara.

## Diagnóstico

A falha atual não é apenas de cron. A edge function `supabase/functions/sync-prefeitura-mensal/index.ts` tem quatro fragilidades:

1. Assume automaticamente o mês anterior. Se o Centi publicar tarde, ou se o mês anterior ainda não estiver completo, a rotina não sabe procurar a competência correta.
2. Importa `idorgao=23`, que deve ser tratado como Câmara. A rotina da Prefeitura não deve importar Câmara.
3. Faz upsert de `servidores` sem gravar `orgao_tipo: "prefeitura"`.
4. Busca `servidores` para montar `nameMap` sem filtrar `orgao_tipo`, então pode vincular remuneração de Prefeitura a um servidor marcado como Câmara.

Regra de ouro: folha da Prefeitura e folha da Câmara só podem se encontrar em relatórios comparativos finais. Na importação, no armazenamento e nas queries de leitura, sempre separar por `servidores.orgao_tipo`.

## Arquivos a alterar

- `supabase/functions/sync-prefeitura-mensal/index.ts`
- `supabase/migrations/<timestamp>_fix_prefeitura_folha_mensal_sync.sql`
- `supabase/migrations/20260503000000_sync_cron_orchestration_new_supabase.sql`, ou criar uma migration nova só para reagendar o cron
- Opcional, mas recomendado: `src/components/prefeitura/PrefeituraClient.tsx`
- Opcional, mas recomendado: `src/data/prefeituraApi.ts`

## 1. Corrigir a chave única de servidores

Hoje existe uma constraint única em `servidores.nome`. Isso é frágil porque o mesmo nome pode existir na Prefeitura e na Câmara. Criar uma migration:

```sql
-- supabase/migrations/<timestamp>_fix_prefeitura_folha_mensal_sync.sql

ALTER TABLE public.servidores
  DROP CONSTRAINT IF EXISTS servidores_nome_unique;

CREATE UNIQUE INDEX IF NOT EXISTS servidores_nome_orgao_unique
  ON public.servidores (nome, orgao_tipo);

CREATE INDEX IF NOT EXISTS idx_remuneracao_servidores_competencia
  ON public.remuneracao_servidores (competencia);

CREATE INDEX IF NOT EXISTS idx_remuneracao_servidores_servidor_competencia
  ON public.remuneracao_servidores (servidor_id, competencia);
```

Depois disso, todos os upserts de servidores devem usar:

```ts
.upsert(batch, { onConflict: "nome,orgao_tipo" })
```

## 2. Remover Câmara da rotina da Prefeitura

Em `sync-prefeitura-mensal`, trocar:

```ts
const ORGAOS = [22, 23, 55, 67, 66, 44, 71, 68, 70, 72, 56];
```

por:

```ts
const ORGAOS_PREFEITURA = [22, 55, 67, 66, 44, 71, 68, 70, 72, 56];
```

`23` fica fora porque é Câmara.

## 3. Descobrir a competência mais recente disponível no Centi

Não usar apenas “mês anterior”. A função deve:

1. respeitar `?mes=4&ano=2026` quando informado manualmente;
2. caso contrário, testar o mês atual e os 5 meses anteriores;
3. somar o `data-result` dos órgãos da Prefeitura;
4. aceitar a primeira competência com volume mínimo plausível;
5. registrar no `sync_log` a competência detectada e os counts por órgão.

Adicionar helpers como estes:

```ts
type CompetenciaDetectada = {
  mes: number;
  ano: number;
  competencia: string;
  totalFonte: number;
  countsPorOrgao: Record<number, number>;
};

const MIN_PREFEITURA_ROWS = 100;

function competenciaKey(ano: number, mes: number) {
  return `${ano}-${String(mes).padStart(2, "0")}`;
}

function parseDataResult(html: string): number {
  const match = html.match(/data-result="(\d+)"/);
  return match ? Number(match[1]) : 0;
}

function buildCandidateMonths(now = new Date()) {
  const candidates: Array<{ mes: number; ano: number }> = [];
  for (let offset = 0; offset < 6; offset++) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1));
    candidates.push({ mes: d.getUTCMonth() + 1, ano: d.getUTCFullYear() });
  }
  return candidates;
}

async function fetchFolhaCount(idorgao: number, mes: number, ano: number): Promise<number> {
  const body = new URLSearchParams({
    idorgao: String(idorgao),
    mes: String(mes),
    ano: String(ano),
    nome: "",
    cargo: "",
    decreto: "",
    admissao: "",
    pagina: "1",
    itensporpagina: "5",
  });

  const response = await fetch(`${BASE_URL}/servidor/remuneracao`, {
    method: "POST",
    headers: {
      "User-Agent": UA,
      "Content-Type": "application/x-www-form-urlencoded",
      "X-Requested-With": "XMLHttpRequest",
    },
    body: body.toString(),
  });

  if (!response.ok) return 0;
  return parseDataResult(await response.text());
}

async function descobrirCompetenciaMaisRecente(
  orgaos: number[],
  forcedMes?: number,
  forcedAno?: number
): Promise<CompetenciaDetectada> {
  const candidates =
    forcedMes && forcedAno
      ? [{ mes: forcedMes, ano: forcedAno }]
      : buildCandidateMonths();

  for (const candidate of candidates) {
    const counts = await Promise.all(
      orgaos.map(async (orgao) => [orgao, await fetchFolhaCount(orgao, candidate.mes, candidate.ano)] as const)
    );

    const countsPorOrgao = Object.fromEntries(counts) as Record<number, number>;
    const totalFonte = Object.values(countsPorOrgao).reduce((sum, count) => sum + count, 0);

    if (forcedMes && forcedAno) {
      return {
        ...candidate,
        competencia: competenciaKey(candidate.ano, candidate.mes),
        totalFonte,
        countsPorOrgao,
      };
    }

    if (totalFonte >= MIN_PREFEITURA_ROWS) {
      return {
        ...candidate,
        competencia: competenciaKey(candidate.ano, candidate.mes),
        totalFonte,
        countsPorOrgao,
      };
    }
  }

  throw new Error("Nenhuma competência recente da Prefeitura encontrada no Centi");
}
```

No início do handler, substituir a lógica de mês anterior por:

```ts
const forcedMes = url.searchParams.get("mes");
const forcedAno = url.searchParams.get("ano");
const dryRun = url.searchParams.get("dry_run") === "1";
const orgaos = orgaoFilter ? [parseInt(orgaoFilter)] : ORGAOS_PREFEITURA;

const detected = await descobrirCompetenciaMaisRecente(
  orgaos,
  forcedMes ? parseInt(forcedMes) : undefined,
  forcedAno ? parseInt(forcedAno) : undefined
);

const { mes, ano, competencia } = detected;
```

Antes de gravar no banco, permitir teste sem escrita:

```ts
if (dryRun) {
  return new Response(
    JSON.stringify({ success: true, dry_run: true, detected }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
```

## 4. Gravar servidores sempre como Prefeitura

No upsert de servidores, usar:

```ts
const batch = all.slice(i, i + BATCH).map((s) => ({
  nome: s.nome,
  cargo: s.cargo,
  fonte_url: `${BASE_URL}/servidor/remuneracao`,
  orgao_tipo: "prefeitura",
}));

await sb.from("servidores").upsert(batch, { onConflict: "nome,orgao_tipo" });
```

No `nameMap`, buscar somente Prefeitura:

```ts
const { data: page } = await sb
  .from("servidores")
  .select("id, nome")
  .eq("orgao_tipo", "prefeitura")
  .range(offset, offset + PAGE - 1);
```

## 5. Reagendar o cron para janela de publicação

Rodar apenas nos dias 5 e 20 é frágil. O Centi pode publicar em qualquer dia útil após o fechamento da folha. Como a função será idempotente, agende uma janela diária do dia 5 ao 25.

Criar migration:

```sql
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sync-prefeitura-mensal-bw') THEN
    PERFORM cron.unschedule('sync-prefeitura-mensal-bw');
  END IF;

  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sync-prefeitura-mensal-window') THEN
    PERFORM cron.unschedule('sync-prefeitura-mensal-window');
  END IF;
END $$;

SELECT cron.schedule(
  'sync-prefeitura-mensal-window',
  '30 6 5-25 * *',
  $$SELECT public.invoke_edge_function('sync-prefeitura-mensal');$$
);

UPDATE public.sync_job_registry
SET
  cron_name = 'sync-prefeitura-mensal-window',
  cron_expression = '30 6 5-25 * *',
  frequency_tier = 'monthly',
  max_stale_hours = 744,
  description_pt = 'Servidores e folha da Prefeitura; janela diária entre os dias 5 e 25 para capturar a competência mais recente publicada no Centi'
WHERE function_name = 'sync-prefeitura-mensal';
```

Horário: `06:30 UTC`, equivalente a `03:30` em Morrinhos.

## 6. Corrigir leituras que ainda usam competência global

No frontend/admin, qualquer query de última competência da Prefeitura deve filtrar Prefeitura antes de ordenar.

Padrão correto:

```ts
const { data } = await supabase
  .from("remuneracao_servidores")
  .select("competencia, servidores!inner(orgao_tipo)")
  .eq("servidores.orgao_tipo", "prefeitura")
  .order("competencia", { ascending: false })
  .limit(1)
  .maybeSingle();
```

Aplicar principalmente em:

- `src/components/prefeitura/PrefeituraClient.tsx`, query `["last-competencia"]`;
- `src/data/prefeituraApi.ts`, funções `fetchExecutivoRemuneracao()` e `fetchSecretariosRemuneracao()`.

## 7. Deploy

```bash
supabase login
supabase link --project-ref oinweocqcptwxqsztlcl
supabase db push
supabase functions deploy sync-prefeitura-mensal --project-ref oinweocqcptwxqsztlcl
```

## 8. Validação antes de importar

Primeiro fazer dry-run:

```bash
curl -X POST \
  "https://oinweocqcptwxqsztlcl.supabase.co/functions/v1/sync-prefeitura-mensal?dry_run=1" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json"
```

Resultado esperado em maio/2026: detectar `2026-04` como competência mais recente, com `totalFonte` plausível.

Para forçar Abril/2026:

```bash
curl -X POST \
  "https://oinweocqcptwxqsztlcl.supabase.co/functions/v1/sync-prefeitura-mensal?dry_run=1&mes=4&ano=2026" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json"
```

Só depois rodar sem `dry_run`:

```bash
curl -X POST \
  "https://oinweocqcptwxqsztlcl.supabase.co/functions/v1/sync-prefeitura-mensal?mes=4&ano=2026" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json"
```

## 9. SQL de validação pós-importação

Confirmar separação Prefeitura/Câmara:

```sql
SELECT r.competencia, s.orgao_tipo, r.tipo_folha,
       COUNT(*) AS qtd,
       SUM(r.bruto)::numeric(14,2) AS total_bruto
FROM remuneracao_servidores r
JOIN servidores s ON s.id = r.servidor_id
WHERE r.competencia >= '2026-03'
GROUP BY 1,2,3
ORDER BY 1 DESC,2,3;
```

Confirmar que Abril/2026 entrou na Prefeitura:

```sql
SELECT COUNT(*) AS qtd_prefeitura_abril,
       SUM(r.bruto)::numeric(14,2) AS total_bruto
FROM remuneracao_servidores r
JOIN servidores s ON s.id = r.servidor_id
WHERE r.competencia = '2026-04'
  AND s.orgao_tipo = 'prefeitura';
```

Confirmar que a função registrou sync:

```sql
SELECT tipo, status, detalhes, started_at, finished_at
FROM sync_log
WHERE tipo = 'prefeitura_mensal'
ORDER BY started_at DESC
LIMIT 10;
```

Confirmar cron:

```sql
SELECT jobid, jobname, schedule, active
FROM cron.job
WHERE jobname ILIKE '%prefeitura-mensal%'
ORDER BY jobname;
```

## 10. Critério de pronto

- `sync-prefeitura-mensal` detecta automaticamente a competência mais recente disponível no Centi.
- Abril/2026 entra em `remuneracao_servidores` para `orgao_tipo = 'prefeitura'`.
- `idorgao=23` não é importado pela rotina da Prefeitura.
- `sync_log` registra `detalhes.competencia`, `detalhes.totalFonte` e `detalhes.countsPorOrgao`.
- O cron `sync-prefeitura-mensal-window` está ativo.
- A Home/Admin/Prefeitura nunca exibem a competência da Câmara como se fosse da Prefeitura.

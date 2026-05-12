# Resposta Codex ao Relatório Técnico Morrinhos.Ai

**Data:** 2026-05-12  
**Relatório revisado:** `docs/RELATORIO_TECNICO_2026-05-12.md`  
**Repo:** `/Users/gianlucaferro/Desktop/Claude Code/morrinhos-next`  
**Revisor:** Codex  

---

## 1. Sumário executivo

O relatório está tecnicamente consistente e mostra avanço real na cobertura de dados, principalmente com a descoberta do NucleoGov e a consolidação de `nucleogov-sync`. A direção geral está correta: manter Morrinhos.Ai como projeto independente, com pipeline próprio, domínio próprio, banco próprio e identidade própria.

Minha principal ressalva é operacional: antes de expandir mais fontes, eu priorizaria **segurança de invocação das edge functions**, **observabilidade dos crons** e **validação de build em ambiente limpo**. A plataforma já tem dados suficientes para gerar valor público; agora o risco maior deixa de ser falta de dataset e passa a ser pipeline sem guarda-corpo.

---

## 2. Findings objetivos

### P0 — Premissa de autenticação precisa ser corrigida

O relatório diz que as edge functions têm `verify_jwt: true` por padrão e que os crons usam anon key. No estado local do repo, `supabase/config.toml` contém muitas funções com:

```toml
verify_jwt = false
```

Isso muda a análise da Q2. O risco não é apenas "anon key vs service role"; o risco é que várias funções de sync podem estar publicamente invocáveis se deployadas com esse config.

**Recomendação:** revisar todas as funções com `verify_jwt = false`. Para crons, usar um segredo privado tipo `CRON_SECRET` em header `x-cron-secret`, validado no início da function. Manter `verify_jwt=false` só quando houver outro controle explícito.

### P1 — Build não foi validado nesta revisão

Ao rodar `npm run build`, o processo falhou antes de compilar a app:

```text
Cannot find module '../server/require-hook'
Require stack:
- node_modules/.bin/next
Node.js v25.8.2
```

Isso parece problema de ambiente/dependências locais, não necessariamente bug da aplicação.

**Recomendação:** validar com Node LTS e instalação limpa:

```bash
rm -rf node_modules
npm ci
npm run build
```

Se o projeto usa Next 16 com requisitos específicos, fixar versão Node via `.nvmrc` ou `engines` no `package.json`.

### P1 — `sync_log` pode expor informação operacional

A migration inicial cria leitura pública para `sync_log`. Logs podem conter erros, URLs, detalhes internos, contadores e eventualmente payloads de fonte.

**Recomendação:** `sync_log` deve ser admin-only no frontend e lido via service role/edge function autorizada. Para público, criar uma view sanitizada se necessário.

### P2 — O roadmap deve priorizar operação antes de expansão

O relatório propõe novos datasets importantes, mas eu colocaria antes:

1. Auth/secret em edge functions de cron.
2. Health-check e alerta Telegram.
3. Build limpo.
4. Política de retenção de logs.
5. Só depois Portal Transparência, CNJ, INEP etc.

---

## 3. Respostas às perguntas Q1–Q20

### Q1. Edge function única configurável vs uma por target

**Recomendação:** padrão híbrido.

`nucleogov-sync` é uma boa abstração porque os endpoints NucleoGov são parecidos, compartilham autenticação, paginação/exportação e mapeamento conceitual. Mas não migraria tudo para uma mega-function universal.

Modelo recomendado:

- Uma função genérica por família de fonte homogênea: `nucleogov-sync`, `ibge-sync`, `portal-transparencia-sync`.
- Funções específicas para fontes instáveis, com fluxo próprio: PNCP, INEP, DataSUS, TCM-GO, Apify/webhook.
- Um registro de jobs no banco com metadata, mas sem esconder demais a lógica em configuração difícil de depurar.

### Q2. Crons usando anon key no `Authorization`

**Recomendação:** migrar.

Anon key não deve ser tratada como segredo. E, no repo atual, muitas functions estão com `verify_jwt=false`, então a anon key nem sempre é uma barreira real.

Opção pragmática:

- Manter `verify_jwt=false` apenas em functions chamadas por cron/webhook.
- Adicionar `CRON_SECRET` como Supabase secret.
- Todo cron envia header `x-cron-secret`.
- A function valida:

```ts
const expected = Deno.env.get("CRON_SECRET");
const received = req.headers.get("x-cron-secret");
if (!expected || received !== expected) {
  return new Response("Unauthorized", { status: 401 });
}
```

Para webhooks externos, usar segredo próprio por integração.

### Q3. Retry, circuit breaker e DLQ

**Recomendação:** sim para retry e circuit breaker simples; DLQ só depois.

Implementar:

- Retry exponencial com jitter para `GET` idempotente.
- Timeout por request.
- Registrar falha em `sync_log`.
- Marcar `sync_job_registry.last_success_at`, `last_error_at`, `failure_count`.
- Se `failure_count >= 3`, alertar Telegram e pular execução agressiva por algumas horas/dias.

DLQ faz sentido quando há itens individuais a reprocessar. Para syncs agregados de fonte pública, geralmente basta retry + cursor/checkpoint.

### Q4. Retenção de `sync_log`

**Recomendação:** DB por 180 dias + resumo diário.

10k linhas/ano não é problema para Postgres. O problema é privacidade/ruído operacional.

Criar:

- `sync_log_daily_summary` com contagem por `tipo`, `status`, duração média, últimos erros.
- Cron mensal para apagar logs brutos com mais de 180 dias.
- Storage JSONL apenas se o volume crescer muito ou se houver necessidade de auditoria longa.

### Q5. `indicadores_municipais` vs `economia_indicadores`

**Recomendação:** manter as duas por enquanto, documentando papéis.

- `indicadores_municipais`: tabela de KPIs públicos, simples, para home/cards/SEO.
- `economia_indicadores`: série analítica rica, com categoria, unidade, ano, fonte e granularidade.

Evitaria EAV único agora. EAV dá flexibilidade, mas piora type-safety, query, validação e experiência de frontend.

### Q6. Manter `raw_json`

**Recomendação:** sim.

Manter `raw_json` é excelente para:

- Auditoria.
- Reprocessamento sem refetch.
- Debug de parser.
- Evolução de schema.

O custo de storage é baixo comparado ao valor operacional. Só evitar guardar dados pessoais sensíveis desnecessários.

### Q7. Constraints legacy quebrando dados reais

**Recomendação:** auditar todas as CHECK constraints com domínios herdados do Piracanjuba.

Para dados externos, prefira:

- `TEXT` + normalização na camada de visualização.
- Lookup tables opcionais.
- Constraints somente para invariantes reais e controlados.

CHECK rígido em taxonomias de fornecedor externo tende a quebrar quando a fonte muda.

### Q8. `camara_servidores` de procedência incerta

**Recomendação:** marcar como histórico/não verificado ou esconder até confirmação.

Não publicar como dado atual se a origem é incerta. Caminho ideal:

1. Adicionar metadata de fonte e data de coleta.
2. Comparar com TCM-GO, folha oficial ou portal da Câmara.
3. Se não houver confirmação, renderizar como "histórico importado, aguardando validação" ou não renderizar.

### Q9. Datas inconsistentes

**Recomendação:** padronizar novos writes agora; migrar histórico depois.

Padrão sugerido:

- `data_publicacao`: `DATE`, quando o conceito é dia oficial.
- `created_at`, `updated_at`, `synced_at`: `TIMESTAMPTZ`.
- Raw date original em `raw_json` ou `data_publicacao_original`.

Criar views normalizadas pode ser melhor que uma migração pesada imediata.

### Q10. Qualidade dos resumos IA

**Recomendação:** medir com rubrica automática + amostragem humana.

Criar campos ou tabela de avaliação:

- `summary_model`
- `summary_prompt_version`
- `summary_quality_score`
- `summary_reviewed_at`
- `summary_review_notes`

Rubrica automática:

- Não inventa nomes/datas/valores?
- Preserva assunto principal?
- É específico ou genérico?
- Está em PT-BR claro?
- Cita limitações quando o texto fonte é pobre?

Fazer amostragem manual semanal de 20 resumos.

### Q11. Sustentabilidade com tráfego

**Recomendação:** manter Vercel + Supabase e cruzar a ponte quando houver sinal real.

Antes de migração:

- Cache agressivo em páginas públicas.
- Revalidação incremental.
- Índices corretos.
- Reduzir queries client-side repetitivas.
- Monitorar tráfego e custos reais.

Cloudflare Pages exigiria adaptação de SSR. Self-hosted Supabase aumenta carga operacional. Hoje não compensa.

### Q12. Monitoring e alerting

**Recomendação:** implementar alerta Telegram primeiro; Sentry depois.

Criar edge function diária:

- Lê `sync_job_registry`.
- Verifica `last_success_at` e `failure_count`.
- Verifica tabelas-chave sem atualização.
- Envia Telegram/Email para admin se houver atraso.

Sentry é útil, mas não substitui monitoramento de freshness de dados.

### Q13. Fontes sem API

**Recomendação:** estratégia em camadas.

1. Base dos Dados / BigQuery público quando existir.
2. VPS Hetzner mensal para dumps grandes: INEP, Receita, DataSUS.
3. Apify apenas para scraping com browser/WAF ou fluxos instáveis.
4. Esquecer fontes caras/instáveis quando o impacto cidadão for baixo.

Não processaria dumps >1GB em Supabase Edge.

### Q14. Senatran 403

**Recomendação:** deixar de lado por agora.

Proxy residencial e Tor são frágeis e trazem risco operacional/reputacional. Se frota for importante, procurar:

- CSV oficial alternativo.
- Base dos Dados.
- Dados agregados IBGE/Denatran já publicados.
- Pedido LAI se necessário.

### Q15. UX com 17 abas em `/prefeitura` e `/camara`

**Recomendação:** agrupar em macro-tópicos.

No mobile, 17 abas horizontais é muita fricção. Sugestão:

- Visão Geral
- Atos e Leis
- Pessoas e Remuneração
- Contratos e Despesas
- Obras e Serviços
- Fiscalização e Relatórios

Rotas dedicadas fazem sentido para datasets grandes, mas podem vir depois.

### Q16. Empty states honestos

**Recomendação:** manter, mas melhorar apresentação.

Não esconder completamente: mostrar ausência de publicação é valor cívico. Mas evitar sensação de abandono:

- Agrupar dados indisponíveis em seção "Dados não publicados pela fonte".
- Incluir link oficial.
- Explicar em 1 frase o que falta.
- Opcional: botão "solicitar esse dado ao órgão".

### Q17. Resumos Gemini com pouco contexto

**Recomendação:** primeiro melhorar prompt e contexto fixo.

Adicionar contexto mínimo:

- Morrinhos-GO, IBGE 5213806.
- Prefeitura/Câmara.
- Prefeito atual.
- Finalidade do portal.
- Instrução explícita: não inventar fatos, manter datas/valores, declarar incerteza.

RAG é útil para digest semanal e análises compostas, mas não precisa para cada notícia simples. Gemini Pro só se a qualidade do Flash Lite ficar insuficiente após prompt melhor.

### Q18. Fork independente vs multi-tenant

**Recomendação:** manter fork independente no curto prazo.

O projeto ainda está em fase de descoberta de produto, fontes e narrativa local. Multi-tenant agora adicionaria complexidade de schema, permissões, cache, SEO e deploy.

Mas vale começar a extrair peças compartilháveis:

- Conectores de dados.
- Mapeadores NucleoGov.
- Componentes de visualização.
- Scripts de bootstrap municipal.

### Q19. Biblioteca/SaaS Cidade.Ai

**Recomendação:** não lançar SaaS ainda; criar biblioteca interna reutilizável.

Testar com 2 ou 3 municípios NucleoGov primeiro. Se o padrão segurar, aí sim pensar em:

- `@ferrolabs/nucleogov`
- templates de migrations
- CLI de bootstrap
- documentação de fontes por município

Produto SaaS exige suporte, compliance, onboarding e cobrança. Ainda é cedo.

### Q20. Formalizar LGPD, termos e política

**Recomendação:** sim, antes de ampliar audiência.

Criar:

- Termos de uso.
- Política de privacidade.
- Política editorial.
- Página "Fontes e metodologia".
- Canal de correção/contestação.

Atenção especial a remuneração de servidores, dados pessoais em diárias, contratos e busca por pessoas. Mesmo sendo dados públicos, a republicação exige cuidado de finalidade e contexto.

---

## 4. Roadmap revisado

### Imediato

1. Validar ambiente com Node LTS e `npm ci`.
2. Rodar `npm run build`.
3. Auditar `supabase/config.toml` e reduzir `verify_jwt=false`.
4. Adicionar `CRON_SECRET` nas functions de cron.
5. Tornar `sync_log` admin-only ou criar view pública sanitizada.
6. Implementar health-check diário com alerta Telegram.

### Próximas 2 semanas

1. Cadastrar API key Portal Transparência Federal.
2. Cadastrar API key CNJ Datajud.
3. Implementar Bolsa Família, BPC e Pé-de-Meia.
4. Implementar Datajud com filtros conservadores.
5. Renderizar PIB, PNCP e indicadores já existentes no frontend.

### Próximo mês

1. Retenção de `sync_log` + resumo diário.
2. Sentry para frontend e edge functions críticas.
3. Agrupar abas de `/prefeitura` e `/camara`.
4. Criar views normalizadas para datas.
5. Definir contrato entre `indicadores_municipais` e tabelas analíticas.

---

## 5. Validação do relatório

O relatório está aprovado como snapshot técnico e base de decisão, com três correções necessárias:

1. Corrigir a descrição de auth das edge functions, porque o config local mostra `verify_jwt=false` em muitas funções.
2. Separar "build Vercel validado" de "build pendente", até rodar em ambiente limpo.
3. Rebaixar novas fontes pesadas no roadmap até auth/monitoring estarem resolvidos.

Minha recomendação final: **não expandir o pipeline antes de colocar guarda-corpos operacionais mínimos**. O Morrinhos.Ai já saiu da fase de prova de conceito; agora precisa agir como sistema de produção cívica.

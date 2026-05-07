# Data dump do Lovable (2026-05-03)

O arquivo `20260503112956_morrinhos_lovable_data_dump.sql` foi removido do Git por ser grande (15MB / 29.381 INSERTs).

Estado: **aplicado com sucesso ao Supabase `oinweocqcptwxqsztlcl` em 2026-05-03 via `supabase db push`.**

Ações executadas antes do push:
- Removido `\restrict` / `\unrestrict` (comandos psql, não SQL).
- Removido `ALTER TABLE ... DISABLE/ENABLE TRIGGER ALL` (precisa ownership).
- Removido `SET SESSION AUTHORIZATION DEFAULT`.
- TRUNCATE de todas as 70 tabelas em CASCADE antes do push.
- DROP da FK `classificados_user_id_fkey` (apontava pra `auth.users` vazio).

Resultado:
- 29.381 linhas restauradas em 70 tabelas.
- Top: remuneracao_servidores (8.5k), contratos (5.9k), camara_despesas (4.4k).

Arquivo backup local: `~/Downloads/morrinhos_data_applied.sql`

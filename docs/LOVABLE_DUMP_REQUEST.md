# Prompt para enviar ao Lovable — dump de dados do Morrinhos.ai

Cole este prompt no chat do projeto Morrinhos (https://lovable.dev/projects/...) para que o Lovable execute o dump das tabelas e Storage buckets do Supabase antigo (`uulpqmylqnonbxozdbtb`).

---

## Pedido

Estou migrando o frontend do projeto para Next.js + Vercel num Supabase próprio (`oinweocqcptwxqsztlcl`). Preciso de um dump completo de **todos os dados** das 71 tabelas do projeto e dos 3 Storage buckets, em formato que eu consiga restaurar no novo Supabase.

### Dados que preciso

**1. Banco (data-only dump das 71 tabelas em `public`):**

Por favor, execute no SQL Editor do projeto:

```sql
-- Listar todas as tabelas em public (para confirmar contagem):
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

E gere um dump com `pg_dump --data-only --schema=public` (ou equivalente). Idealmente em formato `.sql` com `INSERT` statements (não `COPY` binário, para facilitar o restore via SQL Editor do novo projeto).

Tamanho estimado: vereadores (~10 rows), classificados (algumas centenas), licitações/contratos/decretos (milhares), notícias e atos legislativos (milhares cada).

**2. Storage buckets — copiar para Supabase novo:**

Os buckets que precisam ser migrados:
- `classificados` (fotos dos anúncios — WebP, ~6 fotos por anúncio)
- `anuncios` (banners pagos)
- `farmacia-fotos` (fotos das farmácias)

Se o Lovable não puder copiar direto, pelo menos: gere a lista de objetos em cada bucket (nome + URL pública). Eu faço o `wget` em paralelo.

```sql
-- Para listar:
SELECT bucket_id, name, metadata
FROM storage.objects
WHERE bucket_id IN ('classificados', 'anuncios', 'farmacia-fotos');
```

**3. Auth users — opcional, mas útil:**

Se possível, gere também um dump dos usuários cadastrados (`auth.users`):
```sql
SELECT id, email, raw_user_meta_data, created_at
FROM auth.users;
```

(Não precisa de senhas — só para eu poder remapear usuários quando reconfigurar o OAuth no Supabase novo.)

### Como preciso receber

Qualquer formato funciona, em ordem de preferência:

1. **Arquivo `.sql` único** com todos os `INSERT` (preferido)
2. **CSV por tabela** (zipado)
3. **Acesso compartilhado ao banco** via connection string temporária (eu rodo o `pg_dump` localmente)

### Importante

- **Não derrubar o site** — quero manter o morrinhos.lovable.app no ar enquanto o cutover não acontece (DNS ainda aponta pra Lovable).
- O cutover de DNS (morrinhos.ai → Vercel) só vai ser feito **depois** que:
  - Os dados estiverem no novo Supabase
  - As páginas Next.js de Câmara/Prefeitura/Saúde estiverem reconstruídas
- Até lá, ambos os ambientes precisam ficar de pé.

### Próximos passos depois do dump

1. Restauro os dados no `oinweocqcptwxqsztlcl`
2. Reconstruo as páginas com dados reais
3. Configuro OAuth Google + Apple no novo Supabase Auth
4. Aponto DNS para Vercel
5. Pauso o projeto Lovable (mas mantenho como backup)

Obrigado!

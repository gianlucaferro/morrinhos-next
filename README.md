# Morrinhos.ai

Portal independente de transparência cidadã para Morrinhos-GO.
Forkado do [piracanjuba-next](https://github.com/gianlucaferro/piracanjuba-next).

## Stack

- **Next.js 16** (App Router) — leia `AGENTS.md` antes de mexer (breaking changes vs versões anteriores)
- **React 19** + TypeScript + Tailwind CSS 4
- **Supabase** (Postgres, Auth, Edge Functions Deno, Storage)
- **Vercel** (hosting)
- **Resend** (email transacional)

## Setup local

```bash
# 1. Instalar deps
npm install

# 2. Copiar env
cp .env.example .env.local
# preencher NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY

# 3. (Opcional) Aplicar migrations no Supabase
supabase link --project-ref <project-ref>
supabase db push

# 4. Rodar dev
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000).

## Status atual

🚧 **Em construção** — fork recente do `piracanjuba-next`. Ver [`docs/HANDOFF_MORRINHOS.md`](./docs/HANDOFF_MORRINHOS.md) para o que JÁ foi feito e o que falta.

Resumo do estado:
- ✅ Identidade do município trocada (IBGE 5213806, coords -17.7311/-49.1058, pop 51.351, 15 vereadores, vizinhos atualizados)
- ✅ Mass rename Piracanjuba → Morrinhos
- ⚠️  Brand assets (logo/favicon/hero) ainda visualmente do Piracanjuba — substituir antes do deploy
- ⚠️  Lei Orgânica deletada — precisa importar a de Morrinhos
- ⚠️  Scrapers Câmara/Prefeitura precisam ser refeitos (Centi → NucleoGov)
- ⏳ Aguardando: Supabase Morrinhos.Ai criado, conta Spaceship com morrinhos.ai

## Estrutura

- `src/app/` — rotas (Next.js App Router)
- `src/lib/data/` — fetchers SSR com `unstable_cache`
- `src/data/` — fetchers client-side
- `src/components/` — UI components
- `src/lib/seo.ts` — geração de Schema.org / OG / canonical
- `supabase/migrations/` — 103 migrations
- `supabase/functions/` — 99 edge functions Deno
- `docs/` — blueprint completo, handoff, integrações

## Plataformas oficiais consumidas

| Tipo | URL |
|---|---|
| Prefeitura | [morrinhos.go.gov.br](https://morrinhos.go.gov.br/) |
| Transparência Prefeitura | [acessoainformacao.morrinhos.go.gov.br](https://acessoainformacao.morrinhos.go.gov.br/) (NucleoGov) |
| Câmara | [morrinhos.go.leg.br](https://morrinhos.go.leg.br/) |
| Transparência Câmara | [acessoainformacao.morrinhos.go.leg.br](https://acessoainformacao.morrinhos.go.leg.br/) (NucleoGov) |

## Licença

Conteúdo: CC-BY-4.0. Código: ainda a definir.

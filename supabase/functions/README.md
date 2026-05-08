# Edge Functions — Morrinhos.ai (migrado para Supabase próprio)

## Status da migração

23 functions migradas do gateway Lovable (`ai.gateway.lovable.dev`) para Google Gemini direto:

- 22 functions de chat → `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions`
- 1 function de áudio (`transcribe-audio`) → Gemini `generateContent` com `inline_data`

Wrapper compartilhado em `_shared/ai.ts` centraliza a chamada e fornece `corsHeaders`, `MODELS`, `geminiChat`, `geminiChatComplete`, `geminiTranscribeAudio`, e mapeamento padronizado de erros.

## Secrets necessários

Configurar no Supabase (`pgqztmtimakiikcsvfph`) via Dashboard → Project Settings → Edge Functions → Secrets, ou via CLI:

```bash
supabase secrets set GEMINI_API_KEY="$(op read 'op://Dev/Gemini API Key/credential')" --project-ref pgqztmtimakiikcsvfph
```

| Secret | Origem | Usado em |
|---|---|---|
| `GEMINI_API_KEY` | Google AI Studio (https://aistudio.google.com/apikey) | todas as 23 functions migradas |
| `SUPABASE_URL` | auto-injetado pelo Supabase | functions que escrevem no DB (ex: `ai-search`) |
| `SUPABASE_SERVICE_ROLE_KEY` | auto-injetado pelo Supabase | idem |

A env var antiga `LOVABLE_API_KEY` **não é mais usada** — pode ser removida do projeto novo.

## Modelos

Mapeamento dos antigos nomes (com prefixo `google/`) para os novos:

| Antigo (Lovable) | Novo (Gemini direto) | Constante em `_shared/ai.ts` |
|---|---|---|
| `google/gemini-3-flash-preview` | `gemini-3-flash-preview` | `MODELS.flashPreview` |
| `google/gemini-2.5-flash` | `gemini-2.5-flash` | `MODELS.flash` |
| `google/gemini-2.5-flash-lite` | `gemini-2.5-flash-lite` | `MODELS.flashLite` |

`normalizeModelName()` no wrapper remove o prefixo `google/` automaticamente — mantém compatibilidade caso uma function ainda esteja usando o nome antigo.

## Functions migradas

| Function | Modelo | Notas |
|---|---|---|
| `ai-search` | `gemini-3-flash-preview` | streaming SSE |
| `analyze-contrato-risco` | `gemini-3-flash-preview` | |
| `batch-categorize-leis` | `gemini-2.5-flash-lite` | |
| `extract-lei-organica-pdf` | `gemini-2.5-flash` | |
| `optimize-description` | `gemini-2.5-flash-lite` | classificados |
| `suggest-category` | `gemini-2.5-flash-lite` | classificados |
| `summarize-artigo` | `gemini-3-flash-preview` | |
| `summarize-atuacao` | `gemini-3-flash-preview` | |
| `summarize-camara-contrato` | `gemini-2.5-flash-lite` | |
| `summarize-contrato` | `gemini-3-flash-preview` | |
| `summarize-decreto` | `gemini-2.5-flash-lite` | |
| `summarize-generic` | `gemini-2.5-flash-lite` | |
| `summarize-imposto` | `gemini-2.5-flash-lite` | |
| `summarize-lei-municipal` | `gemini-2.5-flash-lite` | |
| `summarize-lei-organica` | `gemini-3-flash-preview` | |
| `summarize-licitacao` | `gemini-3-flash-preview` | |
| `summarize-obra` | `gemini-3-flash-preview` | |
| `summarize-portaria` | `gemini-2.5-flash-lite` | |
| `summarize-secretario` | `gemini-3-flash-preview` | |
| `summarize-servidor` | `gemini-3-flash-preview` | |
| `sync-presenca-atas` | `gemini-2.5-flash` | |
| `sync-presenca-centi` | `gemini-2.5-flash` | |
| `transcribe-audio` | `gemini-2.5-flash` | reescrita; agora usa `inline_data` (Whisper não existe no Gemini) |

## Functions ainda no Supabase do Lovable (não migradas aqui)

Estas 62 functions não tinham lock-in com `ai.gateway.lovable.dev` e ficam para a fase de cutover do Supabase:

- Sync jobs (~50): `sync-vereadores`, `sync-contratos-aditivos`, `sync-emendas`, `sync-saude-*`, `sync-camara-*`, etc.
- Admin: `admin-classificados`, `admin-login`, `admin-zap-read`, `admin-zap-update`
- Auth/email: `auth-email-hook` (precisa migração à parte — usa `@lovable.dev/webhooks-js` + `@lovable.dev/email-js`)
- Pagamentos: `create-donation`, `notify-expiring-ads`, `unsubscribe-push`, `send-push`, `send-weekly-digest`
- Outros: `consulta-placa`, `import-folha-*`, `parse-folha-md`, `parse-lei-organica`, `sitemap-classificados`, `backup-zap-mhs`

Bloqueios remanescentes Lovable nas 62: `auth-email-hook` (3 imports `@lovable.dev/*`), `create-donation` e `send-weekly-digest` (referência cosmética a Lovable, sem dependência de runtime).

## Deploy

```bash
# Após configurar GEMINI_API_KEY no Supabase:
cd morrinhos-next
supabase link --project-ref pgqztmtimakiikcsvfph
supabase functions deploy --no-verify-jwt   # (sem JWT mantém compatibilidade com chamadas atuais)
```

## Rollback

Se algo der errado, basta apontar `LOVABLE_API_KEY` de volta no projeto antigo (`pgqztmtimakiikcsvfph`) — as functions antigas continuam intactas no repositório `gianlucaferro/morrinhos` (Lovable).

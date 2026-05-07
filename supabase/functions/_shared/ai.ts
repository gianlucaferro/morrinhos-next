// Wrapper para Google Gemini API.
// Substitui o antigo gateway `ai.gateway.lovable.dev` (lock-in Lovable).
// Chat: usa endpoint OpenAI-compat (https://generativelanguage.googleapis.com/v1beta/openai/).
// Áudio: usa generateContent nativo com inline_data (Whisper não existe no Gemini).

const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
const OPENAI_COMPAT_URL = `${GEMINI_BASE_URL}/openai/chat/completions`;

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

export const MODELS = {
  // Equivalentes 1:1 aos nomes que o Lovable expunha (com prefixo `google/`).
  flashPreview: "gemini-3-flash-preview",
  flash: "gemini-2.5-flash",
  flashLite: "gemini-2.5-flash-lite",
} as const;

export type ChatRole = "system" | "user" | "assistant";
export interface ChatMessage {
  role: ChatRole;
  content: string;
}

interface GeminiChatOptions {
  model: string;
  messages: ChatMessage[];
  maxTokens?: number;
  temperature?: number;
  /** Quando true, devolve o Response cru (com body em SSE) para repassar ao cliente. */
  stream?: boolean;
}

export class GeminiAuthError extends Error {
  constructor() {
    super("GEMINI_API_KEY não configurada");
    this.name = "GeminiAuthError";
  }
}

export class GeminiUpstreamError extends Error {
  status: number;
  bodyText: string;
  constructor(status: number, bodyText: string) {
    super(`Gemini upstream ${status}: ${bodyText.slice(0, 500)}`);
    this.name = "GeminiUpstreamError";
    this.status = status;
    this.bodyText = bodyText;
  }
}

function getApiKey(): string {
  const key = Deno.env.get("GEMINI_API_KEY");
  if (!key) throw new GeminiAuthError();
  return key;
}

/**
 * Tira o prefixo `google/` que era exigido pelo gateway Lovable.
 * `google/gemini-2.5-flash-lite` → `gemini-2.5-flash-lite`
 */
export function normalizeModelName(model: string): string {
  return model.startsWith("google/") ? model.slice("google/".length) : model;
}

export async function geminiChat(options: GeminiChatOptions): Promise<Response> {
  const apiKey = getApiKey();
  const body = {
    model: normalizeModelName(options.model),
    messages: options.messages,
    ...(options.maxTokens !== undefined ? { max_tokens: options.maxTokens } : {}),
    ...(options.temperature !== undefined ? { temperature: options.temperature } : {}),
    ...(options.stream ? { stream: true } : {}),
  };

  return await fetch(OPENAI_COMPAT_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

interface ChatResponseShape {
  choices?: Array<{ message?: { content?: string } }>;
}

/** Versão "completion": retorna só o texto (`choices[0].message.content`). */
export async function geminiChatComplete(options: Omit<GeminiChatOptions, "stream">): Promise<string> {
  const response = await geminiChat({ ...options, stream: false });
  if (!response.ok) {
    const bodyText = await response.text();
    throw new GeminiUpstreamError(response.status, bodyText);
  }
  const data = (await response.json()) as ChatResponseShape;
  return data.choices?.[0]?.message?.content?.trim() ?? "";
}

interface GeminiTranscribeOptions {
  audio: Uint8Array;
  mimeType: string;
  /** Instrução adicional para o modelo. Por padrão pede transcrição em português. */
  prompt?: string;
  model?: string;
}

/**
 * Transcreve áudio usando `models/{model}:generateContent` com inline_data.
 * Substitui o uso de Whisper no antigo gateway Lovable. Limite prático: 20MB.
 */
export async function geminiTranscribeAudio({
  audio,
  mimeType,
  prompt = "Transcreva o áudio em português brasileiro de forma fiel. Responda apenas com a transcrição, sem comentários.",
  model = MODELS.flash,
}: GeminiTranscribeOptions): Promise<string> {
  const apiKey = getApiKey();
  const base64 = uint8ToBase64(audio);
  const url = `${GEMINI_BASE_URL}/models/${normalizeModelName(model)}:generateContent`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: prompt },
            { inline_data: { mime_type: mimeType, data: base64 } },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const bodyText = await response.text();
    throw new GeminiUpstreamError(response.status, bodyText);
  }

  const data = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };

  const text = data.candidates?.[0]?.content?.parts
    ?.map((p) => p.text ?? "")
    .join("")
    .trim() ?? "";

  return text;
}

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

/**
 * Helper para resposta de erro padronizada nas Edge Functions.
 */
export function jsonError(message: string, status = 500): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function jsonOk(payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * Mapeia erros comuns do Gemini para HTTP do client (rate limit / créditos).
 */
export function geminiErrorToResponse(err: unknown): Response {
  if (err instanceof GeminiAuthError) {
    return jsonError("Serviço de IA não configurado.", 500);
  }
  if (err instanceof GeminiUpstreamError) {
    if (err.status === 429) return jsonError("Muitas requisições. Tente novamente em alguns segundos.", 429);
    if (err.status === 402 || err.status === 403) return jsonError("Limite de uso da IA excedido.", 402);
    if (err.status >= 500) return jsonError("Falha temporária no serviço de IA. Tente novamente.", 502);
    return jsonError(`Erro na IA (${err.status}).`, 502);
  }
  return jsonError("Erro interno na chamada de IA.", 500);
}

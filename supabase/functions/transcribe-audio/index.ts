import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  corsHeaders,
  geminiTranscribeAudio,
  geminiErrorToResponse,
  jsonError,
  jsonOk,
  MODELS,
} from "../_shared/ai.ts";

const MAX_AUDIO_BYTES = 15 * 1024 * 1024; // limite prático para inline_data (~20MB no Gemini).

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const audioFile = formData.get("file");

    if (!audioFile || !(audioFile instanceof File)) {
      return jsonError("Arquivo de áudio não encontrado.", 400);
    }

    if (audioFile.size > MAX_AUDIO_BYTES) {
      return jsonError("Áudio muito grande (limite 15MB).", 413);
    }

    const buffer = new Uint8Array(await audioFile.arrayBuffer());
    const mimeType = audioFile.type || "audio/webm";

    const text = await geminiTranscribeAudio({
      audio: buffer,
      mimeType,
      model: MODELS.flash,
    });

    if (!text) {
      return jsonOk({ error: "Não foi possível identificar a fala. Tente novamente." });
    }

    return jsonOk({ text });
  } catch (err) {
    console.error("transcribe-audio error:", err);
    return geminiErrorToResponse(err);
  }
});

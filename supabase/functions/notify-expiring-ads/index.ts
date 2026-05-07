import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// DESATIVADO: Anúncios do Compra e Venda MHS agora têm duração indeterminada.
// Esta função foi mantida apenas como no-op para preservar referências externas
// (cron jobs, integrações). Nenhuma notificação de expiração é mais enviada.
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  return new Response(
    JSON.stringify({
      message: "Função desativada — anúncios não expiram mais.",
      count: 0,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});

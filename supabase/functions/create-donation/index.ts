import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=denonext";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    const { amount, mode } = await req.json();

    // Validate amount (minimum R$2.00 = 200 centavos)
    const amountCents = Math.round(Number(amount) * 100);
    if (!amountCents || amountCents < 200 || amountCents > 1000000) {
      throw new Error("Valor inválido. Mínimo R$2,00, máximo R$10.000,00.");
    }

    // Validate mode
    const paymentMode = mode === "subscription" ? "subscription" : "payment";

    const origin =
      req.headers.get("origin") ||
      Deno.env.get("SITE_URL") ||
      "https://morrinhos.ai";

    const lineItem: Stripe.Checkout.SessionCreateParams.LineItem = {
      price_data: {
        currency: "brl",
        product_data: {
          name:
            paymentMode === "subscription"
              ? "Apoio mensal — Morrinhos.ai"
              : "Doação — Morrinhos.ai",
          description:
            paymentMode === "subscription"
              ? "Contribuição mensal para manter o projeto ativo"
              : "Contribuição voluntária para o projeto",
        },
        unit_amount: amountCents,
        ...(paymentMode === "subscription" && {
          recurring: { interval: "month" as const },
        }),
      },
      quantity: 1,
    };

    const session = await stripe.checkout.sessions.create({
      line_items: [lineItem],
      mode: paymentMode,
      success_url: `${origin}/sobre?doacao=sucesso`,
      cancel_url: `${origin}/sobre?doacao=cancelada`,
      locale: "pt-BR",
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("[CREATE-DONATION] Error:", message);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

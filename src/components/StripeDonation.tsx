"use client";

import { useState } from "react";
import { CreditCard, Loader2, Repeat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
const supabase = createBrowserSupabaseClient();
import { toast } from "sonner";

const SUGGESTED_AMOUNTS = [10, 20, 50, 100];

export default function StripeDonation() {
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState<"payment" | "subscription">("payment");
  const [loading, setLoading] = useState(false);

  const handleDonate = async () => {
    const value = parseFloat(amount.replace(",", "."));
    if (!value || value < 2) {
      toast.error("Valor mínimo: R$ 2,00");
      return;
    }
    if (value > 10000) {
      toast.error("Valor máximo: R$ 10.000,00");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-donation", {
        body: { amount: value, mode },
      });

      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("URL de checkout não recebida");
      }
    } catch (err) {
      console.error("Donation error:", err);
      toast.error("Erro ao iniciar pagamento. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Mode toggle */}
      <div className="flex rounded-lg border overflow-hidden">
        <button
          onClick={() => setMode("payment")}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-sm font-medium transition-colors ${
            mode === "payment"
              ? "bg-primary text-primary-foreground"
              : "bg-card text-muted-foreground hover:bg-muted"
          }`}
        >
          <CreditCard className="w-4 h-4" />
          Doação única
        </button>
        <button
          onClick={() => setMode("subscription")}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-sm font-medium transition-colors ${
            mode === "subscription"
              ? "bg-primary text-primary-foreground"
              : "bg-card text-muted-foreground hover:bg-muted"
          }`}
        >
          <Repeat className="w-4 h-4" />
          Apoio mensal
        </button>
      </div>

      {/* Suggested amounts */}
      <div className="flex gap-2">
        {SUGGESTED_AMOUNTS.map((v) => (
          <button
            key={v}
            onClick={() => setAmount(String(v))}
            className={`flex-1 py-2 rounded-md text-sm font-medium border transition-colors ${
              amount === String(v)
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-foreground border-border hover:bg-muted"
            }`}
          >
            R${v}
          </button>
        ))}
      </div>

      {/* Custom amount */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">
            R$
          </span>
          <Input
            type="text"
            inputMode="decimal"
            placeholder="Outro valor"
            value={amount}
            onChange={(e) => {
              const val = e.target.value.replace(/[^0-9.,]/g, "");
              setAmount(val);
            }}
            className="pl-9"
          />
        </div>
        <Button onClick={handleDonate} disabled={loading || !amount} className="shrink-0 min-w-[120px]">
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : mode === "subscription" ? (
            "Assinar"
          ) : (
            "Doar"
          )}
        </Button>
      </div>

      <p className="text-[11px] text-muted-foreground text-center">
        {mode === "subscription"
          ? "💳 Pagamento recorrente via cartão. Cancele quando quiser."
          : "💳 Pagamento único via cartão de crédito ou débito."}
      </p>
    </div>
  );
}

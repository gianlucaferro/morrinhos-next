"use client";

import Link from "next/link";
import { useState } from "react";
import { Loader2, CheckCircle2, Mail } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { toast } from "sonner";

export default function SubscriptionForm() {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    if (!consent) {
      toast.error("Você precisa concordar com a política de privacidade.");
      return;
    }

    setLoading(true);
    try {
      const supabase = createBrowserSupabaseClient();

      const { data: existing } = await supabase
        .from("subscriptions")
        .select("id")
        .eq("email", email.trim().toLowerCase())
        .maybeSingle();

      if (existing) {
        toast.info("Este e-mail já está cadastrado para receber alertas.");
        setSubscribed(true);
        return;
      }

      const { error } = await supabase
        .from("subscriptions")
        .insert({ email: email.trim().toLowerCase() });

      if (error) throw error;

      setSubscribed(true);
      toast.success("Inscrição realizada com sucesso!");
    } catch (e) {
      console.error(e);
      toast.error("Erro ao realizar inscrição. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  if (subscribed) {
    return (
      <div className="flex items-center gap-2 text-accent py-2">
        <CheckCircle2 className="w-5 h-5" />
        <span className="text-sm font-medium">
          Inscrição realizada! Você receberá atualizações semanais.
        </span>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-2 mb-3">
        <Mail className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">Assinar alertas</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Receba um resumo semanal com novos projetos, votações e atualizações da Câmara
        e Prefeitura diretamente no seu e-mail.
      </p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex gap-2">
          <Input
            type="email"
            placeholder="Seu e-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="flex-1"
          />
          <Button type="submit" disabled={loading || !consent} className="shrink-0">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Assinar"}
          </Button>
        </div>
        <label className="flex items-start gap-2 text-xs text-muted-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-0.5 shrink-0 accent-primary"
            required
          />
          <span>
            Concordo em receber a newsletter no meu e-mail e li a{" "}
            <Link href="/privacidade" className="text-primary hover:underline">
              Política de Privacidade
            </Link>
            . Você pode cancelar a qualquer momento (LGPD — Lei 13.709/2018).
          </span>
        </label>
      </form>
    </>
  );
}

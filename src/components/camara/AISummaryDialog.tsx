"use client";

import { useState, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sparkles, Loader2 } from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
const supabase = createBrowserSupabaseClient();

interface AISummaryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children?: React.ReactNode;
  resumo: string | null;
  loading: boolean;
}

export function AISummaryDialog({ open, onOpenChange, title, children, resumo, loading }: AISummaryDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base">{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {children}
          <div className="rounded-lg bg-muted/50 border p-4">
            <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-accent" /> Resumo gerado por IA
            </p>
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /> Gerando resumo...
              </div>
            ) : (
              <p className="text-sm text-foreground whitespace-pre-line leading-relaxed">{resumo}</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function useAISummary() {
  const [selectedItem, setSelectedItem] = useState<{ id: string; title: string; extra?: React.ReactNode } | null>(null);
  const [resumo, setResumo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const cache = useRef<Record<string, string>>({});

  const requestSummary = useCallback(async (id: string, tipo: string, conteudo: string, title: string, extra?: React.ReactNode, documento_url?: string) => {
    setSelectedItem({ id, title, extra });

    if (cache.current[id]) {
      setResumo(cache.current[id]);
      setLoading(false);
      return;
    }

    setResumo(null);
    setLoading(true);
    try {
      const body: Record<string, string> = { tipo, conteudo };
      if (documento_url) body.documento_url = documento_url;
      const { data, error } = await supabase.functions.invoke("summarize-generic", {
        body,
      });
      if (error) throw error;
      const r = data?.resumo || data?.error || "Não foi possível gerar o resumo.";
      cache.current[id] = r;
      setResumo(r);
    } catch {
      const r = "Não foi possível gerar o resumo no momento.";
      setResumo(r);
    } finally {
      setLoading(false);
    }
  }, []);

  const close = useCallback(() => setSelectedItem(null), []);

  return { selectedItem, resumo, loading, requestSummary, close };
}

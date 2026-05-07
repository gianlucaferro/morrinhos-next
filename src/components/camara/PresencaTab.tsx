"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchPresencaSessoes, fetchPresencaAnos } from "@/data/camaraApi";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CalendarCheck, UserCheck, UserX, ExternalLink, FileText, ShieldCheck } from "lucide-react";

const FONTE_LABELS: Record<string, string> = {
  ata: "Ata da Sessão",
  votacao: "Registro de Votação",
  registro_textual: "Registro Textual",
  lista_assinada: "Lista Assinada",
  lista_presenca: "Lista de Presença",
};

export default function PresencaTab() {
  const [ano, setAno] = useState<number | undefined>();

  const { data: anos } = useQuery({ queryKey: ["presenca-anos"], queryFn: fetchPresencaAnos });
  const { data: presencas, isLoading } = useQuery({
    queryKey: ["presenca-sessoes", ano],
    queryFn: () => fetchPresencaSessoes(ano || anos?.[0]),
    enabled: !!anos?.length,
  });

  const selectedAno = ano || anos?.[0];

  // Group by session
  const sessoes = useMemo(() => {
    if (!presencas) return [];
    const map = new Map<string, {
      titulo: string; data: string | null; tipo: string | null;
      fonte_url: string | null; ata_url: string | null;
      fonte_tipo: string | null; status: string | null;
      presentes: string[]; ausentes: string[];
    }>();
    for (const p of presencas) {
      if (p.vereador_nome === "SESSÃO") continue;
      const key = p.sessao_titulo;
      if (!map.has(key)) {
        map.set(key, {
          titulo: p.sessao_titulo, data: p.sessao_data,
          tipo: p.tipo_sessao, fonte_url: p.fonte_url,
          ata_url: p.ata_url, fonte_tipo: p.fonte_tipo,
          status: p.status_verificacao,
          presentes: [], ausentes: [],
        });
      }
      const s = map.get(key)!;
      const nome = p.vereador_nome || "Desconhecido";
      if (p.presente) s.presentes.push(nome);
      else s.ausentes.push(nome);
    }
    return Array.from(map.values()).sort((a, b) => (b.data || "").localeCompare(a.data || ""));
  }, [presencas]);

  // Ranking
  const ranking = useMemo(() => {
    if (!presencas) return [];
    const map = new Map<string, { nome: string; presentes: number; total: number }>();
    for (const p of presencas) {
      if (p.vereador_nome === "SESSÃO") continue;
      const nome = p.vereador_nome || "Desconhecido";
      if (!map.has(nome)) map.set(nome, { nome, presentes: 0, total: 0 });
      const r = map.get(nome)!;
      r.total++;
      if (p.presente) r.presentes++;
    }
    return Array.from(map.values()).sort((a, b) => (b.presentes / b.total) - (a.presentes / a.total));
  }, [presencas]);

  const totalSessoes = sessoes.length;

  return (
    <div className="container py-4 space-y-4">
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 flex items-start gap-3">
        <CalendarCheck className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
        <div>
          <p className="font-medium text-foreground text-sm">Em breve</p>
          <p className="text-sm text-muted-foreground mt-1">
            Estou conferindo manualmente as atas de presença para lançar, nos próximos dias, dados confiáveis sobre a participação dos vereadores nas sessões.
          </p>
        </div>
      </div>
    </div>
  );
}

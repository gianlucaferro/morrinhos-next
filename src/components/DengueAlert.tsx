"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Bug, AlertTriangle, ArrowRight, Share2 } from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

async function fetchDengueLatest() {
  const supabase = createBrowserSupabaseClient();
  const { data } = await supabase
    .from("saude_indicadores")
    .select("valor, valor_texto, ano, mes")
    .eq("categoria", "dengue")
    .eq("indicador", "casos_mes")
    .order("ano", { ascending: false })
    .order("mes", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();
  return data;
}

const MESES = [
  "",
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

export default function DengueAlert() {
  const { data } = useQuery({
    queryKey: ["dengue-alert-home"],
    queryFn: fetchDengueLatest,
  });

  if (!data || !data.valor) return null;

  const nivelMatch = data.valor_texto?.match(/(\d)/);
  const nivel = nivelMatch ? parseInt(nivelMatch[1]) : 0;
  const valor = Number(data.valor);

  if (nivel < 2 && valor < 20) return null;

  const mesNome = MESES[data.mes || 0];
  const isRed = nivel >= 3;
  const shareText = `Alerta Dengue em Morrinhos: ${valor} casos em ${mesNome}/${data.ano}. Nível ${nivel}/4. Elimine focos de água parada!`;

  return (
    <section>
      <div
        className={`stat-card border-l-4 ${
          isRed ? "border-l-red-500 bg-red-500/5" : "border-l-yellow-500 bg-yellow-500/5"
        }`}
      >
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg shrink-0 ${isRed ? "bg-red-500/10" : "bg-yellow-500/10"}`}>
            <Bug className={`w-5 h-5 ${isRed ? "text-red-500" : "text-yellow-500"}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className={`w-4 h-4 ${isRed ? "text-red-500" : "text-yellow-500"}`} />
              <p className={`text-sm font-semibold ${isRed ? "text-red-500" : "text-yellow-500"}`}>
                Alerta de Dengue em Morrinhos
              </p>
            </div>
            <p className="text-sm text-foreground">
              <span className="font-bold">{valor} casos</span> registrados em {mesNome}/{data.ano}.
              {nivel >= 3 && " Nível de alerta máximo."}
              {nivel === 2 && " Nível de alerta moderado."}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Elimine focos de água parada. Use repelente. Procure atendimento se tiver febre alta.
            </p>
            <div className="flex items-center gap-3 mt-2">
              <Link
                href="/saude"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium"
              >
                Ver dados completos <ArrowRight className="w-3 h-3" />
              </Link>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(
                  shareText + "\n\nVeja mais em: https://morrinhos.ai/saude"
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-[#25D366] hover:underline font-medium"
              >
                <Share2 className="w-3 h-3" /> Compartilhar
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

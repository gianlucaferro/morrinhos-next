"use client";

import { useQuery } from "@tanstack/react-query";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
const supabase = createBrowserSupabaseClient();
import { Search, FileText, ExternalLink, Download, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { AISummaryDialog, useAISummary } from "@/components/camara/AISummaryDialog";

interface AtosTabProps {
  tipoCodigo: number;
  tipoNome: string;
  descricao: string;
}

async function fetchAtos(tipoCodigo: number) {
  const { data, error } = await supabase
    .from("camara_atos")
    .select("*")
    .eq("tipo_codigo", tipoCodigo)
    .order("data_publicacao", { ascending: false });
  if (error) throw error;
  return data;
}

export default function AtosTab({ tipoCodigo, tipoNome, descricao }: AtosTabProps) {
  const [search, setSearch] = useState("");
  const { data: atos, isLoading } = useQuery({
    queryKey: ["camara-atos", tipoCodigo],
    queryFn: () => fetchAtos(tipoCodigo),
  });

  const { selectedItem, resumo, loading, requestSummary, close } = useAISummary();

  const filtered = (atos || []).filter((a) =>
    !search || [a.descricao, a.numero].some((f) => f?.toLowerCase().includes(search.toLowerCase()))
  );

  const handleClick = (a: any) => {
    const conteudo = `- Tipo: ${tipoNome}\n- Número: ${a.numero || "não informado"}\n- Ano: ${a.ano}\n- Data: ${a.data_publicacao || "não informada"}\n- Descrição: ${a.descricao || "não informada"}`;
    requestSummary(a.id, tipoNome, conteudo, `${tipoNome} ${a.numero ? `Nº ${a.numero}` : ""}`, undefined, a.documento_url || undefined);
  };

  return (
    <div className="container py-4 space-y-4">
      <p className="text-sm text-muted-foreground">{descricao}</p>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder={`Buscar ${tipoNome.toLowerCase()}...`} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      <p className="text-xs text-muted-foreground">{filtered.length} registro(s)</p>

      {isLoading && <div className="stat-card animate-pulse h-40" />}

      {!isLoading && !filtered.length && (
        <div className="stat-card text-center py-8">
          <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-semibold text-foreground">Sem registros</h3>
          <p className="text-sm text-muted-foreground mt-1">Os dados serão sincronizados automaticamente.</p>
        </div>
      )}

      <div className="space-y-2">
        {filtered.map((a) => (
          <button key={a.id} onClick={() => handleClick(a)} className="stat-card card-hover block w-full text-left">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                {a.numero && <p className="text-xs font-semibold text-primary mb-0.5">Nº {a.numero}</p>}
                <p className="text-sm text-foreground line-clamp-3">{a.descricao || "Sem descrição"}</p>
                <div className="flex items-center gap-2 mt-1">
                  {a.data_publicacao && (
                    <p className="text-[11px] text-muted-foreground">
                      {new Date(a.data_publicacao + "T12:00:00").toLocaleDateString("pt-BR")}
                    </p>
                  )}
                  <p className="text-[11px] text-primary/70 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Clique para resumo IA
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-end shrink-0 gap-1">
                <Badge variant="secondary" className="text-[10px]">{a.ano}</Badge>
                {a.documento_url && (
                  <a
                    href={a.documento_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-primary hover:text-primary/80"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>

      <AISummaryDialog
        open={!!selectedItem}
        onOpenChange={(open) => !open && close()}
        title={selectedItem?.title || ""}
        resumo={resumo}
        loading={loading}
      />
    </div>
  );
}

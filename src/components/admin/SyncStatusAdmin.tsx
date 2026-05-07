"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Clock, Database, RefreshCw, ShieldCheck, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

const supabase = createBrowserSupabaseClient();

type Status = "ok" | "warning" | "empty" | "error";

type DashboardRow = {
  key: string;
  label: string;
  fonte: string;
  records: number;
  latestAt: string | null;
  period: string | null;
  status: Status;
  note?: string;
};

type SyncLogRow = {
  id: string;
  tipo: string;
  status: string;
  started_at: string;
  finished_at: string | null;
  detalhes: unknown;
};

type EqFilter = {
  column: string;
  value: string | number | boolean;
};

type DatasetConfig = {
  key: string;
  label: string;
  fonte: string;
  table: string;
  latestColumn: string;
  periodColumn?: string;
  periodLabel?: string;
  filter?: EqFilter;
};

const DATASETS: DatasetConfig[] = [
  {
    key: "saude",
    label: "Saúde",
    fonte: "saude_indicadores",
    table: "saude_indicadores",
    latestColumn: "updated_at",
    periodColumn: "ano",
    periodLabel: "Ano",
  },
  {
    key: "educacao",
    label: "Educação",
    fonte: "educacao_indicadores",
    table: "educacao_indicadores",
    latestColumn: "updated_at",
    periodColumn: "ano_referencia",
    periodLabel: "Ano",
  },
  {
    key: "beneficios",
    label: "Benefícios Sociais",
    fonte: "beneficios_sociais",
    table: "beneficios_sociais",
    latestColumn: "updated_at",
    periodColumn: "competencia",
    periodLabel: "Competência",
  },
  {
    key: "arrecadacao",
    label: "Arrecadação",
    fonte: "arrecadacao_municipal",
    table: "arrecadacao_municipal",
    latestColumn: "updated_at",
    periodColumn: "competencia",
    periodLabel: "Competência",
  },
  {
    key: "agro",
    label: "Agro",
    fonte: "agro_indicadores",
    table: "agro_indicadores",
    latestColumn: "updated_at",
    periodColumn: "ano_referencia",
    periodLabel: "Ano",
  },
  {
    key: "seguranca",
    label: "Segurança",
    fonte: "seguranca_indicadores",
    table: "seguranca_indicadores",
    latestColumn: "updated_at",
    periodColumn: "ano",
    periodLabel: "Ano",
  },
  {
    key: "zap",
    label: "Zap MHS",
    fonte: "zap_establishments",
    table: "zap_establishments",
    latestColumn: "created_at",
    periodLabel: "Cadastro",
  },
  {
    key: "classificados",
    label: "Compra e Venda MHS",
    fonte: "classificados",
    table: "classificados",
    latestColumn: "created_at",
    periodLabel: "Cadastro",
  },
  {
    key: "farmacias",
    label: "Farmácias de Plantão",
    fonte: "farmacia_fotos",
    table: "farmacia_fotos",
    latestColumn: "updated_at",
    periodLabel: "Atualização",
  },
];

function formatDate(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusFrom(records: number, latestAt: string | null): Status {
  if (records === 0) return "empty";
  if (!latestAt) return "warning";

  const date = new Date(latestAt);
  if (Number.isNaN(date.getTime())) return "warning";

  const days = (Date.now() - date.getTime()) / 86_400_000;
  return days > 35 ? "warning" : "ok";
}

function StatusBadge({ status }: { status: Status }) {
  if (status === "ok") {
    return (
      <Badge className="bg-emerald-500 text-white">
        <CheckCircle2 className="w-3 h-3" /> OK
      </Badge>
    );
  }
  if (status === "empty") {
    return (
      <Badge variant="outline" className="border-amber-300 text-amber-700">
        <Clock className="w-3 h-3" /> Vazio
      </Badge>
    );
  }
  if (status === "error") {
    return (
      <Badge variant="destructive">
        <XCircle className="w-3 h-3" /> Erro
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="border-amber-300 text-amber-700">
      <AlertTriangle className="w-3 h-3" /> Atenção
    </Badge>
  );
}

function applyFilter<T>(query: T, filter?: EqFilter): T {
  if (!filter) return query;
  return (query as { eq: (column: string, value: EqFilter["value"]) => T }).eq(filter.column, filter.value);
}

async function countRows(table: string, filter?: EqFilter) {
  const query = applyFilter(
    supabase.from(table).select("*", { count: "exact", head: true }),
    filter
  );
  const { count, error } = await query;
  if (error) throw new Error(`${table}: ${error.message}`);
  return count || 0;
}

async function latestValue(table: string, column: string, filter?: EqFilter) {
  const query = applyFilter(
    supabase.from(table).select(column).order(column, { ascending: false }).limit(1),
    filter
  );
  const { data, error } = await query.maybeSingle();
  if (error) throw new Error(`${table}: ${error.message}`);
  return data ? String((data as unknown as Record<string, unknown>)[column] || "") : null;
}

async function datasetSummary(config: DatasetConfig): Promise<DashboardRow> {
  const [records, latestAt, period] = await Promise.all([
    countRows(config.table, config.filter),
    latestValue(config.table, config.latestColumn, config.filter),
    config.periodColumn
      ? latestValue(config.table, config.periodColumn, config.filter)
      : latestValue(config.table, config.latestColumn, config.filter),
  ]);

  return {
    key: config.key,
    label: config.label,
    fonte: config.fonte,
    records,
    latestAt,
    period,
    status: statusFrom(records, latestAt),
    note: config.periodLabel,
  };
}

async function payrollSummary(orgaoTipo: "camara" | "prefeitura"): Promise<DashboardRow> {
  const label = orgaoTipo === "camara" ? "Folha Câmara" : "Folha Prefeitura";
  const { data: servidores, count, error } = await supabase
    .from("servidores")
    .select("id", { count: "exact" })
    .eq("orgao_tipo", orgaoTipo);

  if (error) throw new Error(`${label}: ${error.message}`);

  const ids = (servidores || []).map((s) => s.id);
  if (ids.length === 0) {
    return {
      key: `folha-${orgaoTipo}`,
      label,
      fonte: "servidores + remuneracao_servidores",
      records: 0,
      latestAt: null,
      period: null,
      status: "empty",
      note: "Competência",
    };
  }

  const [latestCompetencia, latestUpdate, remunCount] = await Promise.all([
    supabase
      .from("remuneracao_servidores")
      .select("competencia")
      .in("servidor_id", ids)
      .order("competencia", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("remuneracao_servidores")
      .select("updated_at")
      .in("servidor_id", ids)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("remuneracao_servidores")
      .select("*", { count: "exact", head: true })
      .in("servidor_id", ids),
  ]);

  if (latestCompetencia.error) throw new Error(`${label}: ${latestCompetencia.error.message}`);
  if (latestUpdate.error) throw new Error(`${label}: ${latestUpdate.error.message}`);
  if (remunCount.error) throw new Error(`${label}: ${remunCount.error.message}`);

  const update = latestUpdate.data ? String(latestUpdate.data.updated_at) : null;
  const competencia = latestCompetencia.data ? String(latestCompetencia.data.competencia) : null;
  const records = count || 0;
  const holerites = remunCount.count || 0;

  return {
    key: `folha-${orgaoTipo}`,
    label,
    fonte: "servidores + remuneracao_servidores",
    records,
    latestAt: update,
    period: competencia,
    status: statusFrom(records + holerites, update),
    note: `${holerites.toLocaleString("pt-BR")} holerites`,
  };
}

async function fetchDashboard() {
  const { data: logs, error } = await supabase
    .from("sync_log")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(50);

  if (error) throw error;

  const rows = await Promise.all([
    payrollSummary("camara"),
    payrollSummary("prefeitura"),
    ...DATASETS.map(datasetSummary),
  ]);

  return {
    rows,
    logs: (logs || []) as SyncLogRow[],
  };
}

function detailText(details: unknown) {
  if (!details || typeof details !== "object" || Array.isArray(details)) return null;
  const data = details as Record<string, unknown>;
  const keys = ["competencia", "registros", "inserted", "updated", "deleted", "erro", "error", "message"];
  const parts = keys
    .filter((key) => data[key] !== undefined && data[key] !== null)
    .map((key) => `${key}: ${String(data[key])}`);
  return parts.length ? parts.join(" · ") : null;
}

export default function SyncStatusAdmin() {
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ["admin-sync-dashboard"],
    queryFn: fetchDashboard,
    staleTime: 60_000,
  });

  const totals = useMemo(() => {
    const rows = data?.rows || [];
    return {
      ok: rows.filter((row) => row.status === "ok").length,
      warning: rows.filter((row) => row.status === "warning").length,
      empty: rows.filter((row) => row.status === "empty").length,
    };
  }, [data?.rows]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
        Carregando sincronizações...
      </div>
    );
  }

  if (error) {
    return (
      <div className="stat-card border-destructive/30 bg-destructive/5">
        <p className="font-semibold text-destructive">Não foi possível carregar o painel de sincronizações.</p>
        <p className="text-sm text-muted-foreground mt-1">{error instanceof Error ? error.message : "Erro desconhecido"}</p>
      </div>
    );
  }

  const rows = data?.rows || [];
  const logs = data?.logs || [];

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            Sincronizações e integridade
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Visão rápida das bases críticas, competência disponível e separação entre Câmara e Prefeitura.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="stat-card text-center">
          <p className="text-2xl font-bold text-emerald-600">{totals.ok}</p>
          <p className="text-xs text-muted-foreground">OK</p>
        </div>
        <div className="stat-card text-center">
          <p className="text-2xl font-bold text-amber-600">{totals.warning}</p>
          <p className="text-xs text-muted-foreground">Atenção</p>
        </div>
        <div className="stat-card text-center">
          <p className="text-2xl font-bold text-muted-foreground">{totals.empty}</p>
          <p className="text-xs text-muted-foreground">Vazias</p>
        </div>
      </div>

      {logs.length === 0 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-900">
          <p className="font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            sync_log ainda está vazio
          </p>
          <p className="text-sm mt-1">
            Os crons/funções precisam gravar início, término, status, competência e erro em `sync_log` para auditoria real de sincronização.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {rows.map((row) => (
          <article key={row.key} className="stat-card">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-foreground">{row.label}</p>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <Database className="w-3 h-3" />
                  {row.fonte}
                </p>
              </div>
              <StatusBadge status={row.status} />
            </div>
            <div className="grid grid-cols-3 gap-2 mt-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Registros</p>
                <p className="font-semibold text-foreground">{row.records.toLocaleString("pt-BR")}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{row.note || "Período"}</p>
                <p className="font-semibold text-foreground">{row.period || "-"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Atualizado em</p>
                <p className="font-semibold text-foreground">{formatDate(row.latestAt)}</p>
              </div>
            </div>
          </article>
        ))}
      </div>

      <section className="stat-card">
        <h3 className="font-semibold text-foreground mb-3">Logs recentes</h3>
        {logs.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">Nenhum registro de sincronização encontrado.</p>
        ) : (
          <div className="space-y-2">
            {logs.map((log) => (
              <div key={log.id} className="rounded-md border border-border p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-foreground">{log.tipo}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(log.started_at)} até {formatDate(log.finished_at)}
                    </p>
                  </div>
                  <Badge variant={log.status === "success" || log.status === "ok" ? "default" : "outline"}>
                    {log.status}
                  </Badge>
                </div>
                {detailText(log.detalhes) && (
                  <p className="text-xs text-muted-foreground mt-2">{detailText(log.detalhes)}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

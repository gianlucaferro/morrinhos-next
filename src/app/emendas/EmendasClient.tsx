"use client";

import { useState } from "react";
import { ArrowUpDown, ExternalLink, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import EmendasRanking from "@/components/EmendasRanking";
import type { Database } from "@/lib/supabase/types";

type Tables = Database["public"]["Tables"];
type Emenda = Tables["emendas_parlamentares"]["Row"];

function fmtBRL(n: number | string | null | undefined) {
  if (n == null) return "-";
  return Number(n).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function EmendasClient({ emendas }: { emendas: Emenda[] }) {
  const [search, setSearch] = useState("");
  const [ano, setAno] = useState("todos");
  const [esfera, setEsfera] = useState("todas");
  const [sort, setSort] = useState<"recente" | "empenhado" | "pago">("recente");
  const anos = Array.from(new Set(emendas.map((e) => e.ano).filter(Boolean))).sort((a, b) => Number(b) - Number(a));
  const esferas = Array.from(
    new Set(emendas.map((e) => e.parlamentar_esfera).filter((value): value is string => Boolean(value)))
  ).sort();

  const filtered = (() => {
    const q = search.toLowerCase();
    return emendas
      .filter((e) => {
        const matchSearch = !q || `${e.parlamentar_nome || ""} ${e.objeto || ""} ${e.parlamentar_esfera || ""}`.toLowerCase().includes(q);
        const matchAno = ano === "todos" || String(e.ano) === ano;
        const matchEsfera = esfera === "todas" || e.parlamentar_esfera === esfera;
        return matchSearch && matchAno && matchEsfera;
      })
      .sort((a, b) => {
        if (sort === "empenhado") return Number(b.valor_empenhado || 0) - Number(a.valor_empenhado || 0);
        if (sort === "pago") return Number(b.valor_pago || 0) - Number(a.valor_pago || 0);
        return Number(b.ano || 0) - Number(a.ano || 0);
      });
  })();

  const totalEmpenhado = filtered.reduce((s, e) => s + Number(e.valor_empenhado || 0), 0);
  const totalPago = filtered.reduce((s, e) => s + Number(e.valor_pago || 0), 0);
  const ranking = Object.entries(
    filtered.reduce<Record<string, { total_empenhado: number; total_pago: number; count: number; esfera: string }>>((acc, e) => {
      const nome = e.parlamentar_nome || "Desconhecido";
      if (!acc[nome]) acc[nome] = { total_empenhado: 0, total_pago: 0, count: 0, esfera: e.parlamentar_esfera || "" };
      acc[nome].total_empenhado += Number(e.valor_empenhado || 0);
      acc[nome].total_pago += Number(e.valor_pago || 0);
      acc[nome].count += 1;
      return acc;
    }, {})
  ).sort((a, b) => b[1].total_pago - a[1].total_pago);

  return (
    <div className="space-y-8">
      <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <MiniStat label="Total empenhado" value={fmtBRL(totalEmpenhado)} />
        <MiniStat label="Total pago" value={fmtBRL(totalPago)} tone="green" />
        <MiniStat label="Emendas filtradas" value={String(filtered.length)} />
      </section>

      <section className="stat-card space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por parlamentar, objeto ou esfera..." className="pl-10" />
        </div>
        <div className="flex gap-1 overflow-x-auto">
          {["todos", ...anos.map(String)].map((y) => (
            <button key={y} onClick={() => setAno(y)} className={`rounded-md border px-3 py-2 text-xs whitespace-nowrap ${ano === y ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground border-border"}`}>
              {y === "todos" ? "Todos os anos" : y}
            </button>
          ))}
          {["todas", ...esferas].map((e) => (
            <button key={e} onClick={() => setEsfera(e)} className={`rounded-md border px-3 py-2 text-xs whitespace-nowrap capitalize ${esfera === e ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground border-border"}`}>
              {e === "todas" ? "Todas as esferas" : e}
            </button>
          ))}
          {[
            ["recente", "Mais recente"],
            ["empenhado", "Maior empenhado"],
            ["pago", "Maior pago"],
          ].map(([id, label]) => (
            <button key={id} onClick={() => setSort(id as typeof sort)} className={`rounded-md border px-3 py-2 text-xs whitespace-nowrap inline-flex items-center gap-1 ${sort === id ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground border-border"}`}>
              <ArrowUpDown className="w-3 h-3" />
              {label}
            </button>
          ))}
        </div>
      </section>

      <EmendasRanking emendas={filtered} />

      {ranking.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">Detalhamento do ranking</h2>
          <div className="overflow-x-auto stat-card p-0">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left">
                <tr>
                  <th className="px-4 py-2 font-medium text-muted-foreground">Parlamentar</th>
                  <th className="px-4 py-2 font-medium text-muted-foreground">Esfera</th>
                  <th className="px-4 py-2 font-medium text-muted-foreground text-right">Empenhado</th>
                  <th className="px-4 py-2 font-medium text-muted-foreground text-right">Pago</th>
                  <th className="px-4 py-2 font-medium text-muted-foreground text-right">Emendas</th>
                </tr>
              </thead>
              <tbody>
                {ranking.map(([nome, dados]) => (
                  <tr key={nome} className="border-b border-border/50 last:border-0">
                    <td className="px-4 py-2 text-foreground">{nome}</td>
                    <td className="px-4 py-2 text-muted-foreground capitalize">{dados.esfera || "-"}</td>
                    <td className="px-4 py-2 text-right text-muted-foreground">{fmtBRL(dados.total_empenhado)}</td>
                    <td className="px-4 py-2 text-right text-foreground font-medium">{fmtBRL(dados.total_pago)}</td>
                    <td className="px-4 py-2 text-right text-muted-foreground">{dados.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section>
        <h2 className="text-lg font-semibold text-foreground mb-3">Emendas ({filtered.length})</h2>
        <div className="space-y-2">
          {filtered.map((e) => (
            <article key={e.id} className="stat-card">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">{e.parlamentar_nome}</span>
                    {e.parlamentar_esfera && ` · ${e.parlamentar_esfera}`}
                    {e.ano && ` · ${e.ano}`}
                  </p>
                  <p className="text-sm text-foreground mt-1">{e.objeto?.slice(0, 280) || "-"}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Empenhado: <span className="text-foreground">{fmtBRL(e.valor_empenhado)}</span>
                    {" · "}
                    Pago: <span className="text-foreground">{fmtBRL(e.valor_pago)}</span>
                  </p>
                </div>
                {e.fonte_url && (
                  <a href={e.fonte_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1 shrink-0">
                    Fonte <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: string; tone?: "green" }) {
  return (
    <div className="stat-card text-center">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${tone === "green" ? "text-green-600" : "text-foreground"}`}>{value}</p>
    </div>
  );
}

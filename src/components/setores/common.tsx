"use client";

import { ExternalLink } from "lucide-react";
import type { ReactNode } from "react";

export function fmtNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return "-";
  return Number(value).toLocaleString("pt-BR");
}

export function fmtBRL(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return "-";
  return Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function StatCard({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "default" | "green" | "red" | "amber" | "blue";
}) {
  const toneClass = {
    default: "text-foreground",
    green: "text-green-600",
    red: "text-red-600",
    amber: "text-amber-600",
    blue: "text-blue-600",
  }[tone];

  return (
    <div className="stat-card text-center">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${toneClass}`}>{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

export function TabNav<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: T; label: string; icon?: ReactNode }[];
  active: T;
  onChange: (id: T) => void;
}) {
  return (
    <div className="overflow-x-auto scrollbar-hide">
      <div className="inline-flex min-w-full md:min-w-0 gap-1 rounded-lg bg-muted p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`h-9 shrink-0 rounded-md px-3 text-xs font-medium transition-colors inline-flex items-center gap-1.5 ${
              active === tab.id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function BarList({
  items,
  valueLabel,
  empty = "Sem dados para exibir.",
}: {
  items: { label: string; value: number; sub?: string }[];
  valueLabel?: (value: number) => string;
  empty?: string;
}) {
  const max = Math.max(...items.map((item) => item.value), 0);
  if (items.length === 0 || max <= 0) {
    return <p className="text-sm text-muted-foreground py-6 text-center">{empty}</p>;
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={`${item.label}-${item.sub || ""}`}>
          <div className="flex items-baseline justify-between gap-3 mb-1">
            <p className="text-sm font-medium text-foreground truncate">{item.label}</p>
            <p className="text-xs text-muted-foreground shrink-0">
              {valueLabel ? valueLabel(item.value) : fmtNumber(item.value)}
            </p>
          </div>
          <div className="h-3 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${Math.max((item.value / max) * 100, 4)}%` }}
            />
          </div>
          {item.sub && <p className="text-[10px] text-muted-foreground mt-1">{item.sub}</p>}
        </div>
      ))}
    </div>
  );
}

export function SourceLink({ href, label = "Fonte" }: { href?: string | null; label?: string | null }) {
  if (!href) return <span className="text-muted-foreground">-</span>;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary hover:underline inline-flex items-center gap-1"
    >
      {label || "Fonte"} <ExternalLink className="w-3 h-3" />
    </a>
  );
}

export function EmptyPanel({ title, description }: { title: string; description: string }) {
  return (
    <div className="stat-card text-center py-10">
      <p className="font-semibold text-foreground">{title}</p>
      <p className="text-sm text-muted-foreground mt-1">{description}</p>
    </div>
  );
}

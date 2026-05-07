"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Instagram, Mail, Phone, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { Vereador } from "@/lib/data/vereadores";

export default function VereadoresClient({ vereadores }: { vereadores: Vereador[] }) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("nome");
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return vereadores
      .filter((v) => !q || `${v.nome} ${v.partido || ""} ${v.cargo_mesa || ""}`.toLowerCase().includes(q))
      .sort((a, b) => {
        if (sort === "votos") return Number(b.votos_eleicao || 0) - Number(a.votos_eleicao || 0);
        if (sort === "mesa") return String(a.cargo_mesa || "zz").localeCompare(String(b.cargo_mesa || "zz"));
        return a.nome.localeCompare(b.nome);
      });
  }, [search, sort, vereadores]);

  if (vereadores.length === 0) {
    return <p className="text-muted-foreground text-center py-12">Nenhum vereador cadastrado ainda.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar vereador por nome, partido ou cargo..." className="pl-10" />
        </div>
        <div className="flex gap-1 overflow-x-auto">
          {[
            ["nome", "Nome (A-Z)"],
            ["votos", "Mais votados"],
            ["mesa", "Mesa diretora"],
          ].map(([id, label]) => (
            <button key={id} onClick={() => setSort(id)} className={`rounded-md border px-3 py-2 text-xs whitespace-nowrap ${sort === id ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground border-border"}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">{filtered.length} de {vereadores.length} vereadores exibidos.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((v) => (
          <article key={v.id} className="stat-card flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <div className="w-16 h-16 rounded-full overflow-hidden bg-muted flex-shrink-0 ring-1 ring-border">
                {v.foto_url ? (
                  <Image src={v.foto_url} alt={v.nome} width={64} height={64} className="w-full h-full object-cover" unoptimized />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl text-muted-foreground">{v.nome[0]?.toUpperCase()}</div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold text-foreground text-base truncate">{v.nome}</h2>
                <p className="text-xs text-muted-foreground">
                  {v.partido || "Sem partido"}
                  {v.cargo_mesa && <span className="ml-2 text-primary">· {v.cargo_mesa}</span>}
                </p>
                {v.votos_eleicao && (
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {v.votos_eleicao.toLocaleString("pt-BR")} votos ({v.ano_eleicao})
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 text-xs">
              {v.telefone && <Contact href={`tel:${v.telefone}`} icon={<Phone className="w-3 h-3" />} label={v.telefone} />}
              {v.email && <Contact href={`mailto:${v.email}`} icon={<Mail className="w-3 h-3" />} label={v.email} />}
              {v.instagram && <Contact href={`https://instagram.com/${v.instagram.replace("@", "")}`} icon={<Instagram className="w-3 h-3" />} label={v.instagram.replace("@", "")} external />}
            </div>

            {v.slug && (
              <Link href={`/vereadores/${v.slug}`} className="text-sm font-medium text-primary hover:underline inline-flex items-center gap-1 mt-auto pt-2 border-t border-border">
                Ver perfil completo <ArrowRight className="w-4 h-4" />
              </Link>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}

function Contact({ href, icon, label, external }: { href: string; icon: ReactNode; label: string; external?: boolean }) {
  return (
    <a href={href} target={external ? "_blank" : undefined} rel={external ? "noopener noreferrer" : undefined} className="inline-flex items-center gap-1 text-muted-foreground hover:text-primary">
      {icon}
      <span className="truncate max-w-[120px]">{label}</span>
    </a>
  );
}

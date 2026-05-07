"use client";

import { useState, useMemo, useEffect } from "react";
import { Search, X, MapPin, Clock, Link2, CalendarPlus, Check, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const COLETA_COMUM: Record<string, string[]> = {
  "Segunda-feira": ["Aeroporto","Aeroporto Sul","BNH","Bueno","Cascalho","Centro","Country Club","Ely Rocha","Estiva","Filismina","Jardim dos Buritis","Jardim Europa","Jardim Goiás 1 e 2","Jardim Primavera","Morrinhos","Pouso Alto","Primavera","São Francisco de Assis","São Vicente de Paula","Sebastião de Oliveira","Setor Boa Vista","Setor das Orquídeas","Setor Fernandes","Setor Lima","Setor Magalhães","Setor Norte","Setor Oeste","Setor Parque Machado","Setor Planalto","Setor Roberto","Vila União"],
  "Terça-feira": ["Aeroporto","Aeroporto Sul","BNH","Bueno","Cascalho","Centro","Conjunto Pouso Alto","Corredor do Homero","Country Club","Ely Rocha","Estiva","Filismina","Jardim dos Buritis","Jardim Europa","Jardim Primavera","Pecuária","Morrinhos","Pouso Alto","Primavera","Recanto do Bosque","São Francisco de Assis","São Vicente de Paula","Sebastião de Oliveira","Setor Boa Vista","Setor das Orquídeas","Setor Fernandes","Setor Lima","Setor Magalhães","Setor Norte","Setor Oeste","Setor Parque Machado","Setor Planalto","Setor Roberto","Vila União"],
  "Quarta-feira": ["Aeroporto","Aeroporto Sul","BNH","Bueno","Cascalho","Centro","Country Club","Ely Rocha","Estiva","Filismina","Jardim dos Buritis","Jardim Europa","Jardim Goiás 1 e 2","Jardim Primavera","Morrinhos","Pouso Alto","Primavera","São Francisco de Assis","São Vicente de Paula","Sebastião de Oliveira","Setor Boa Vista","Setor das Orquídeas","Setor Fernandes","Setor Lima","Setor Magalhães","Setor Norte","Setor Oeste","Setor Parque Machado","Setor Planalto","Setor Roberto","Vila União"],
  "Quinta-feira": ["Aeroporto","Aeroporto Sul","BNH","Bueno","Cascalho","Centro","Country Club","Ely Rocha","Estiva","Filismina","Jardim dos Buritis","Jardim Europa","Jardim Goiás 1 e 2","Jardim Primavera","Morrinhos","Pouso Alto","Primavera","São Francisco de Assis","São Vicente de Paula","Sebastião de Oliveira","Setor Boa Vista","Setor das Orquídeas","Setor Fernandes","Setor Lima","Setor Magalhães","Setor Norte","Setor Oeste","Setor Parque Machado","Setor Planalto","Setor Roberto","Vila União"],
  "Sexta-feira": ["Aeroporto","Aeroporto Sul","BNH","Bueno","Cascalho","Centro","Conjunto Pouso Alto","Country Club","Ely Rocha","Estiva","Filismina","Jardim dos Buritis","Jardim Europa","Jardim Goiás 1 e 2","Jardim Primavera","Pecuária","Morrinhos","Pouso Alto","Primavera","Recanto do Bosque","São Francisco de Assis","São Vicente de Paula","Sebastião de Oliveira","Setor Boa Vista","Setor das Orquídeas","Setor Fernandes","Setor Lima","Setor Magalhães","Setor Norte","Setor Oeste","Setor Parque Machado","Setor Planalto","Setor Roberto","Vila União"],
  "Sábado": ["Av. Expedicionário","Cachoeira","Cargil","Centro","Contêineres","Grão Dourado","Rochedo","Silo da COAPIL"],
};

const COLETA_SELETIVA: Record<string, string[]> = {
  "Segunda-feira": ["Centro"],
  "Sexta-feira": ["Centro"],
  "Terça-feira": ["Jardim Goiás 1 e 2","BNH","Estiva","Jardim Primavera","São Vicente de Paula","Sebastião de Oliveira","Setor Boa Vista","Bueno","Setor Fernandes","Setor Magalhães","Setor Parque Machado","São Francisco de Assis"],
  "Quarta-feira": ["Aeroporto","Cascalho","Jardim dos Buritis","Jardim Europa","Setor Oeste","Pouso Alto","Aeroporto Sul","Setor das Orquídeas","Setor Roberto"],
  "Quinta-feira": ["Country Club","Ely Rocha","Filismina","Morrinhos","Primavera","Recanto do Bosque","Setor Lima","Setor Norte","Setor Planalto","Vila União"],
};

const WEEK_ORDER = ["Segunda-feira","Terça-feira","Quarta-feira","Quinta-feira","Sexta-feira","Sábado"];
const WEEK_IDX: Record<string, number> = { "Segunda-feira":1,"Terça-feira":2,"Quarta-feira":3,"Quinta-feira":4,"Sexta-feira":5,"Sábado":6 };
const EXEMPLOS = [
  "Aeroporto","Aeroporto Sul","Av. Expedicionário","BNH","Bueno","Cachoeira","Cargil","Cascalho","Centro","Conjunto Pouso Alto","Contêineres","Corredor do Homero","Country Club","Ely Rocha","Estiva","Filismina","Grão Dourado","Jardim dos Buritis","Jardim Europa","Jardim Goiás 1 e 2","Jardim Primavera","Pecuária","Morrinhos","Pouso Alto","Primavera","Recanto do Bosque","Rochedo","São Francisco de Assis","São Vicente de Paula","Sebastião de Oliveira","Setor Boa Vista","Setor das Orquídeas","Setor Fernandes","Setor Lima","Setor Magalhães","Setor Norte","Setor Oeste","Setor Parque Machado","Setor Planalto","Setor Roberto","Silo da COAPIL","Vila União",
];

function norm(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^a-z0-9\s]/g,"").trim();
}
function slugify(s: string) {
  return norm(s).replace(/\s+/g, "-");
}
function matchBairro(bairro: string, query: string) {
  const nb = norm(bairro), nq = norm(query);
  if (nb.includes(nq) || nq.includes(nb)) return true;
  return nq.split(" ").every(w => nb.includes(w));
}

const allBairros = [...new Set([...Object.values(COLETA_COMUM).flat(),...Object.values(COLETA_SELETIVA).flat()])].sort((a,b)=>a.localeCompare(b,"pt-BR"));

function getDias(bairro: string, data: Record<string, string[]>) {
  return Object.entries(data).filter(([,l])=>l.some(x=>matchBairro(x,bairro)||matchBairro(bairro,x))).map(([d])=>d);
}

type Status = "hoje" | "amanha" | "futuro" | "passou" | "proxima";

function getDaysUntil(diaName: string) {
  const target = WEEK_IDX[diaName];
  if (target === undefined) return 99;
  return (target - new Date().getDay() + 7) % 7;
}

function getStatus(diaName: string): Status {
  const today = new Date().getDay();
  const idx = WEEK_IDX[diaName];
  if (idx === undefined) return "futuro";
  const daysUntil = getDaysUntil(diaName);
  if (daysUntil === 0) return "hoje";
  if (daysUntil === 1) return "amanha";
  if (today === 0 || idx > today) return "futuro";
  return "passou";
}

function getProximaDia(dias: string[]) {
  if (!dias.length) return null;
  const com = dias.map(d=>({d, daysUntil: getDaysUntil(d), status: getStatus(d)}));
  com.sort((a,b)=>a.daysUntil-b.daysUntil);
  const next = com[0];
  return { d: next.d, status: next.status === "passou" ? "proxima" as Status : next.status };
}

const WEEK_RRULE_ANTERIOR: Record<string, string> = { "Segunda-feira":"SU","Terça-feira":"MO","Quarta-feira":"TU","Quinta-feira":"WE","Sexta-feira":"TH","Sábado":"FR" };

function proximaOcorrenciaAnterior(diaName: string) {
  const today = new Date();
  const todayDow = today.getDay();
  const targetDow = WEEK_IDX[diaName] ?? 1;
  const reminderDow = (targetDow + 6) % 7;
  const diff = (reminderDow - todayDow + 7) % 7;
  const d = new Date(today);
  d.setDate(today.getDate() + diff);
  d.setHours(18, 0, 0, 0);
  if (d.getTime() <= today.getTime()) {
    d.setDate(d.getDate() + 7);
  }
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}${mm}${dd}`;
}

function horarioEvento(dataStr: string) {
  return `${dataStr}T180000/${dataStr}T183000`;
}

type CalendarReminderEvent = {
  label: string;
  url: string;
  tipo: "comum" | "seletiva";
};

function calendarReminderButtonClass(tipo: CalendarReminderEvent["tipo"]) {
  const base = "inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-colors";

  if (tipo === "seletiva") {
    return `${base} bg-emerald-600 border border-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:border-emerald-400 dark:text-emerald-950 dark:hover:bg-emerald-400`;
  }

  return `${base} bg-card border border-blue-200 dark:border-blue-700 text-blue-800 dark:text-blue-200 hover:bg-blue-100 dark:hover:bg-blue-900/50`;
}

function gerarEventosCalendario(bairro: string, diasComum: string[], diasSeletiva: string[]) {
  const eventos: CalendarReminderEvent[] = [];
  diasComum.forEach(dia => {
    const rrule = WEEK_RRULE_ANTERIOR[dia];
    if (!rrule) return;
    const inicio = proximaOcorrenciaAnterior(dia);
    const params = new URLSearchParams({
      action: "TEMPLATE",
      text: `🗑️ Coloque o lixo na rua hoje! — ${bairro}`,
      details: `Amanhã é dia de coleta de LIXO COMUM no ${bairro}.\n\n✅ Use saco PRETO\n✅ Coloque na calçada até as 18h (hoje!)\n\nO caminhão passa amanhã cedo.`,
      dates: horarioEvento(inicio),
      recur: `RRULE:FREQ=WEEKLY;BYDAY=${rrule}`,
    });
    eventos.push({ label: `Lixo comum — lembrete (${dia})`, url: `https://calendar.google.com/calendar/render?${params}`, tipo: "comum" });
  });
  diasSeletiva.forEach(dia => {
    const rrule = WEEK_RRULE_ANTERIOR[dia];
    if (!rrule) return;
    const inicio = proximaOcorrenciaAnterior(dia);
    const params = new URLSearchParams({
      action: "TEMPLATE",
      text: `♻️ Coloque os recicláveis na rua hoje! — ${bairro}`,
      details: `Amanhã é dia de COLETA SELETIVA no ${bairro}.\n\n✅ Use saco BRANCO, AZUL ou VERDE\n✅ Materiais devem estar limpos e secos\n✅ Coloque na calçada até as 18h (hoje!)\n\nO caminhão passa amanhã cedo.`,
      dates: horarioEvento(inicio),
      recur: `RRULE:FREQ=WEEKLY;BYDAY=${rrule}`,
    });
    eventos.push({ label: `Seletiva — lembrete (${dia})`, url: `https://calendar.google.com/calendar/render?${params}`, tipo: "seletiva" });
  });
  return eventos;
}

function StatusBadge({ status }: { status: Status }) {
  const map: Record<string, { className: string; text: string }> = {
    hoje: { className: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300", text: "Hoje" },
    amanha: { className: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300", text: "Amanhã" },
    futuro: { className: "bg-secondary text-secondary-foreground", text: "Esta semana" },
    passou: { className: "bg-secondary text-muted-foreground", text: "Próxima semana" },
    proxima: { className: "bg-secondary text-muted-foreground", text: "Próxima semana" },
  };
  const m = map[status] || map.passou;
  return <span className={`text-xs rounded-full px-2.5 py-0.5 font-semibold ${m.className}`}>{m.text}</span>;
}

interface Saco { cor: string; borda: string; label: string }

function SacoPreto() {
  return (
    <div className="flex flex-col items-center gap-1 opacity-85">
      <svg width="42" height="56" viewBox="0 0 42 56" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M16 5.5 Q21 3 26 5.5" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" fill="none" />
        <path d="M14 8 C7 10 5 17 5 23 L6 47 C6 50 9 52 12 52 L30 52 C33 52 36 50 36 47 L37 23 C37 17 35 10 28 8 Z" fill="#1c1917" stroke="#44403c" strokeWidth="1.5" />
        <path d="M13 21 Q21 17 29 21" stroke="#3f3f3f" strokeWidth="1.5" strokeLinecap="round" fill="none" />
        <path d="M13 28 Q21 24 29 28" stroke="#3f3f3f" strokeWidth="1.2" strokeLinecap="round" fill="none" />
        <path d="M15 35 Q21 32 27 35" stroke="#3f3f3f" strokeWidth="1" strokeLinecap="round" fill="none" />
      </svg>
      <span className="text-sm text-muted-foreground font-semibold">Saco preto</span>
    </div>
  );
}

function SacosColoridos() {
  const cores = [
    { fill: "#f5f5f4", stroke: "#a8a29e" },
    { fill: "#3b82f6", stroke: "#2563eb" },
    { fill: "#22c55e", stroke: "#16a34a" },
  ];

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex gap-1 items-end">
        {cores.map((c, i) => (
          <svg key={i} width="24" height="32" viewBox="0 0 24 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M9 3 Q12 1.5 15 3" stroke={c.stroke} strokeWidth="1.5" strokeLinecap="round" fill="none" />
            <path d="M8 5 C4 6 3 10 3 13 L3.5 27 C3.5 29 5 30 7 30 L17 30 C19 30 20.5 29 20.5 27 L21 13 C21 10 20 6 16 5 Z" fill={c.fill} stroke={c.stroke} strokeWidth="1.2" />
            <path d="M7 12 Q12 10 17 12" stroke={c.stroke} strokeWidth="1" strokeLinecap="round" fill="none" opacity=".6" />
          </svg>
        ))}
      </div>
      <span className="text-sm text-muted-foreground font-semibold text-center leading-tight">
        Branco, azul<br />ou verde
      </span>
    </div>
  );
}

function ColetaCard({ titulo, subtitulo, dias, sacos, seletivaMsg, reciclaveis, naoRec }: {
  titulo: string; subtitulo: string; dias: string[]; sacos: Saco[]; seletivaMsg: string | null; reciclaveis: string[] | null; naoRec: string[] | null;
}) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-base font-bold">{titulo}</CardTitle>
        <p className="text-sm text-muted-foreground">{subtitulo}</p>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0">
        {dias.length > 0 ? (
          <div className="space-y-3">
            <div>
              {dias.map(d => (
                <div key={d} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                  <span className="text-sm font-medium text-foreground">{d}</span>
                  <StatusBadge status={getStatus(d)} />
                </div>
              ))}
            </div>
            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Saco correto</div>
              {sacos.length === 1 ? (
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-full shrink-0" style={{ background: sacos[0].cor, border: `2px solid ${sacos[0].borda}` }}/>
                  <span className="text-sm font-medium text-foreground">{sacos[0].label}</span>
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    {sacos.map((sc, i) => (
                      <span key={sc.label} className="inline-flex items-center gap-1">
                        <span className="w-[18px] h-[18px] rounded-full shrink-0 inline-block" style={{ background: sc.cor, border: `2px solid ${sc.borda}` }}/>
                        <span className="text-sm font-medium text-foreground">{sc.label}</span>
                        {i < sacos.length - 1 && <span className="text-xs text-muted-foreground italic mx-0.5">ou</span>}
                      </span>
                    ))}
                  </div>
                  {seletivaMsg && <p className="text-xs text-muted-foreground italic leading-snug">{seletivaMsg}</p>}
                </div>
              )}
            </div>
            {reciclaveis && (
              <div className="grid grid-cols-3 gap-1.5">
                {reciclaveis.map(r => {
                  const [emoji, ...rest] = r.split(" ");
                  return (
                    <div key={r} className="bg-blue-50 dark:bg-blue-950/30 rounded-lg py-1.5 px-1 text-center flex flex-col items-center gap-0.5">
                      <span className="text-lg">{emoji}</span>
                      <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">{rest.join(" ")}</span>
                    </div>
                  );
                })}
              </div>
            )}
            {naoRec && (
              <div>
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Não vai na seletiva</div>
                <div className="flex flex-wrap gap-1">
                  {naoRec.map(x => <span key={x} className="bg-red-100 dark:bg-red-950/30 text-red-800 dark:text-red-300 rounded-full px-2.5 py-0.5 text-xs">{x}</span>)}
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground text-center py-4">Não encontrado para este bairro</p>
        )}
      </CardContent>
    </Card>
  );
}

function ProximaBanner({ proxima, tipo }: { proxima: { d: string; status: Status }; tipo: "comum" | "seletiva" }) {
  const isComum = tipo === "comum";
  const icon = isComum ? "🗑️" : "♻️";
  const sub = isComum ? "Saco preto · coloque até as 18h do dia anterior" : "Saco branco, azul ou verde (qualquer cor serve)";

  let badge = null;
  let diaText = proxima.d;
  if (proxima.status === "hoje") badge = <Badge className="bg-green-600 text-white ml-2 text-xs">Hoje!</Badge>;
  else if (proxima.status === "amanha") badge = <Badge className="bg-amber-600 text-white ml-2 text-xs">Amanhã</Badge>;
  else if (proxima.status === "proxima") diaText += " (próxima semana)";

  return (
    <div className={`rounded-xl p-4 flex items-center gap-3.5 border ${isComum ? "bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/20 border-green-200 dark:border-green-800" : "bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20 border-blue-200 dark:border-blue-800"}`}>
      <span className="text-[30px] shrink-0 mt-0.5">{icon}</span>
      <div className="flex-1">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">{isComum ? "Próxima coleta de lixo comum" : "Próxima coleta seletiva"}</div>
        <div className="text-2xl font-extrabold text-foreground flex items-center flex-wrap gap-2">{diaText} {badge}</div>
        <div className="text-sm text-muted-foreground">{sub}</div>
      </div>
      <div className="shrink-0 flex items-center justify-center pl-2">
        {isComum ? <SacoPreto /> : <SacosColoridos />}
      </div>
    </div>
  );
}

function EmptyState({ onPick }: { onPick: (b: string) => void }) {
  return (
    <div className="text-center py-12 px-6">
      <div className="text-5xl mb-4">🏘️</div>
      <h2 className="text-xl font-semibold text-foreground mb-2">Digite o nome do seu bairro</h2>
      <p className="text-base text-muted-foreground leading-relaxed max-w-md mx-auto">
        Você vai saber os dias exatos, o saco certo e o horário limite para cada tipo de coleta.
      </p>
      <div className="flex flex-wrap gap-2 justify-center mt-4">
        {EXEMPLOS.map(b => (
          <button key={b} onClick={() => onPick(b)} className="bg-secondary text-secondary-foreground rounded-full px-4 py-1.5 text-sm hover:bg-secondary/80 transition-colors">{b}</button>
        ))}
      </div>
    </div>
  );
}

export default function ColetaLixoClient() {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [showDD, setShowDD] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shareError, setShareError] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [showCal, setShowCal] = useState(false);

  // Read URL on mount
  useEffect(() => {
    let cancelled = false;

    queueMicrotask(() => {
      try {
        const slug = new URLSearchParams(window.location.search).get("bairro");
        if (slug) {
          const found = allBairros.find(b => slugify(b) === slug);
          if (!cancelled && found) setSelected(found);
        }
      } catch {}
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    if (!query.trim()) return allBairros.slice(0, 8);
    return allBairros.filter(b => matchBairro(b, query)).slice(0, 10);
  }, [query]);

  function pick(b: string) { setSelected(b); setQuery(b); setShowDD(false); setShowCal(false); }
  function reset() { setSelected(null); setQuery(""); setShowDD(false); setShowCal(false); setCopied(false); setShareError(false); setShareUrl(""); }
  function fallbackCopy(text: string) {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    if (!ok) throw new Error("copy_failed");
  }
  function writeClipboard(text: string) {
    try {
      fallbackCopy(text);
      return Promise.resolve();
    } catch {
      // Continue to the async Clipboard API when the legacy click-time copy is blocked.
    }

    if (navigator.clipboard?.writeText) {
      return Promise.race([
        navigator.clipboard.writeText(text),
        new Promise<void>((_, reject) => setTimeout(() => reject(new Error("clipboard_timeout")), 800)),
      ]);
    }

    return Promise.reject(new Error("copy_unavailable"));
  }
  function copiarLink(bairro: string) {
    const url = new URL(window.location.href);
    url.searchParams.set("bairro", slugify(bairro));
    const text = url.toString();
    setShareUrl(text);

    writeClipboard(text).then(() => {
      setCopied(true);
      setShareError(false);
      setTimeout(() => setCopied(false), 2500);
    }).catch(() => {
      try {
        fallbackCopy(text);
        setCopied(true);
        setShareError(false);
        setTimeout(() => setCopied(false), 2500);
      } catch {
          setShareError(true);
          setTimeout(() => setShareError(false), 2500);
      }
    });
  }

  const diasC = selected ? getDias(selected, COLETA_COMUM) : [];
  const diasS = selected ? getDias(selected, COLETA_SELETIVA) : [];
  const proxC = selected ? getProximaDia(diasC) : null;
  const proxS = selected ? getProximaDia(diasS) : null;
  const eventos = selected ? gerarEventosCalendario(selected, diasC, diasS) : [];

  return (
    <div className="container max-w-2xl py-6 space-y-6">
      <div className="text-center space-y-3 pb-2">
        <div className="inline-flex items-center gap-1.5 bg-green-100 dark:bg-green-900/40 border border-green-200 dark:border-green-800 rounded-full px-3 py-1 text-xs font-medium text-green-800 dark:text-green-300">
          🗑️ Prefeitura de Morrinhos
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">Quando colocar o lixo na rua?</h1>
        <p className="text-base text-muted-foreground leading-relaxed max-w-md mx-auto">
          Digite seu bairro e saiba exatamente quais dias o caminhão passa, qual saco usar e o horário certo.
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground">Qual é o seu bairro?</label>
        <div className="relative">
          <div className="relative flex items-center">
            <Search className="absolute left-3 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Ex: Centro, Jardim Europa, BNH..."
              value={selected || query}
              onChange={e => { setQuery(e.target.value); setSelected(null); setShowDD(true); setShowCal(false); }}
              onFocus={() => setShowDD(true)}
              onBlur={() => setTimeout(() => setShowDD(false), 150)}
              autoComplete="off"
              className="pl-9 pr-8 h-12 text-base rounded-xl border-green-200 dark:border-green-800 focus-visible:ring-green-500"
            />
            {(query || selected) && (
              <button onClick={reset} className="absolute right-3 text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          {showDD && !selected && filtered.length > 0 && (
            <div className="absolute top-full mt-1.5 left-0 right-0 bg-card rounded-xl border shadow-lg z-50 overflow-hidden max-h-72 overflow-y-auto">
              {filtered.map(b => (
                <button key={b} onMouseDown={() => pick(b)} className="flex items-center gap-2.5 w-full px-4 py-3 text-sm text-foreground hover:bg-secondary transition-colors text-left border-b border-border/30 last:border-0">
                  <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="font-medium">{b}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {!selected ? (
        <EmptyState onPick={pick} />
      ) : (
        <div className="space-y-4">
          <div className="flex items-start justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              <span className="text-xl font-bold text-foreground">{selected}</span>
            </div>
            <div className="flex flex-wrap gap-1.5 items-center">
              <Button variant="outline" size="sm" onClick={reset} className="rounded-full text-xs">Trocar bairro</Button>
              <Button variant="outline" size="sm" onClick={() => copiarLink(selected)} className={`rounded-full text-xs ${copied ? "bg-green-100 dark:bg-green-900/40 border-green-300 dark:border-green-700 text-green-800 dark:text-green-300" : ""}`}>
                {copied ? <><Check className="w-3.5 h-3.5 mr-1" /> Link copiado!</> : shareError ? <><X className="w-3.5 h-3.5 mr-1" /> Não copiou</> : <><Link2 className="w-3.5 h-3.5 mr-1" /> Compartilhar</>}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowCal(v => !v)} className={`rounded-full text-xs ${showCal ? "bg-blue-100 dark:bg-blue-900/40 border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-300" : ""}`}>
                <CalendarPlus className="w-3.5 h-3.5 mr-1" /> Lembrar
              </Button>
            </div>
          </div>

          {shareError && shareUrl && (
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-3 space-y-2">
              <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
                Não consegui copiar automaticamente neste navegador. Use o link abaixo:
              </p>
              <Input
                readOnly
                value={shareUrl}
                onFocus={(e) => e.currentTarget.select()}
                className="h-9 text-xs bg-background"
              />
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`Coleta de lixo no ${selected}: ${shareUrl}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-900 dark:text-amber-100 hover:underline"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Enviar pelo WhatsApp
              </a>
            </div>
          )}

          {showCal && (
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-4 space-y-3">
              <p className="text-sm font-bold text-blue-800 dark:text-blue-200">📅 Adicionar lembretes ao Google Calendar</p>
              <p className="text-sm text-blue-700 dark:text-blue-300 leading-relaxed">
                Clique em cada botão para criar um evento recorrente. O Google Calendar vai abrir em nova aba para você confirmar.
              </p>
              <div className="flex flex-wrap gap-2">
                {eventos.map(ev => (
                  <a key={ev.label} href={ev.url} target="_blank" rel="noopener noreferrer" className={calendarReminderButtonClass(ev.tipo)}>{ev.label}</a>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2.5">
            {proxC && <ProximaBanner proxima={proxC} tipo="comum" />}
            {proxS && <ProximaBanner proxima={proxS} tipo="seletiva" />}
          </div>

          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-3 flex items-start gap-2.5">
            <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <span className="text-sm text-amber-900 dark:text-amber-200 leading-relaxed">
              Coloque o lixo na calçada <strong>até as 18h do dia anterior</strong> à coleta. Sacos devem estar bem fechados.
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <ColetaCard
              titulo="🗑️ Lixo comum"
              subtitulo="Restos de comida e resíduos úmidos"
              dias={WEEK_ORDER.filter(d => diasC.includes(d))}
              sacos={[{ cor: "#1c1917", borda: "#57534e", label: "Preto" }]}
              seletivaMsg={null}
              reciclaveis={null}
              naoRec={null}
            />
            <ColetaCard
              titulo="♻️ Coleta seletiva"
              subtitulo="Recicláveis limpos e secos"
              dias={diasS}
              sacos={[
                { cor: "#f5f5f4", borda: "#a8a29e", label: "Branco" },
                { cor: "#3b82f6", borda: "#2563eb", label: "Azul" },
                { cor: "#22c55e", borda: "#16a34a", label: "Verde" },
              ]}
              seletivaMsg="Qualquer uma dessas cores serve."
              reciclaveis={["📦 Papelão","🧴 Plástico","🥫 Metal","🍾 Vidro","📰 Papel","🥛 Tetra Pak"]}
              naoRec={["Restos de comida","Papel higiênico","Fraldas","Isopor"]}
            />
          </div>

          <div className="bg-secondary/50 rounded-xl p-4 text-center space-y-0.5">
            <p className="text-xs text-muted-foreground">Dados fornecidos pela Prefeitura Municipal de Morrinhos · 2025</p>
            <p className="text-xs text-muted-foreground">Dúvidas? Entre em contato com a Prefeitura.</p>
          </div>
        </div>
      )}
    </div>
  );
}

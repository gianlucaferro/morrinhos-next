"use client";

import { useEffect, useState } from "react";
import { Minus, Plus, Sun, Moon, Instagram } from "lucide-react";

function FontSizeControl() {
  const sizes = ["font-sm", "font-md", "font-lg", "font-xl"] as const;
  const labels = ["A-", "A", "A+", "A++"];
  const [current, setCurrent] = useState(1);

  const change = (dir: number) => {
    const next = Math.max(0, Math.min(sizes.length - 1, current + dir));
    setCurrent(next);
    document.documentElement.className = document.documentElement.className
      .replace(/font-(sm|md|lg|xl)/g, "")
      .trim();
    document.documentElement.classList.add(sizes[next]);
  };

  return (
    <div
      className="flex items-center gap-1"
      role="group"
      aria-label="Ajustar tamanho da fonte"
    >
      <button
        onClick={() => change(-1)}
        className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded hover:bg-secondary text-muted-foreground"
        aria-label="Diminuir fonte"
      >
        <Minus className="w-3.5 h-3.5" />
      </button>
      <span className="text-xs font-medium text-muted-foreground w-6 text-center">
        {labels[current]}
      </span>
      <button
        onClick={() => change(1)}
        className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded hover:bg-secondary text-muted-foreground"
        aria-label="Aumentar fonte"
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function DarkModeToggle() {
  const [dark, setDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  if (!mounted) {
    return <div className="min-w-[44px] min-h-[44px]" />;
  }

  return (
    <button
      onClick={toggle}
      className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-md hover:bg-secondary transition-colors text-muted-foreground"
      aria-label={dark ? "Ativar modo claro" : "Ativar modo escuro"}
    >
      {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  );
}

export default function HeaderControls() {
  return (
    <div className="flex items-center gap-1 md:gap-2">
      <FontSizeControl />
      <DarkModeToggle />
      <a
        href="https://www.instagram.com/morrinhos.ai"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Instagram @morrinhos.ai"
        className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-md hover:bg-secondary transition-colors"
        style={{ color: "#E1306C" }}
      >
        <Instagram className="w-4 h-4" />
      </a>
    </div>
  );
}

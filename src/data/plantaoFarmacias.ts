export interface Farmacia {
  nome: string;
  telefone: string;
  tipo: "whatsapp" | "fixo";
}

export interface SemanaPlantao {
  inicio: string; // "YYYY-MM-DD"
  farmacia24h: Farmacia;
  demais: Farmacia[];
}

function f(nome: string, telefone: string): Farmacia {
  const tipo = telefone.includes("3405") ? "fixo" : "whatsapp";
  return { nome, telefone, tipo };
}

export const PLANTAO_FARMACIAS: SemanaPlantao[] = [
  {
    inicio: "2026-03-14",
    farmacia24h: f("Drogaria São Sebastião", "(64) 3405-1734"),
    demais: [f("Drogamais", "(64) 99265-4341"), f("Drogaria Do Lar", "(64) 3405-1448"), f("Drogaria JM Popular", "(64) 99203-0312")],
  },
  {
    inicio: "2026-03-21",
    farmacia24h: f("Drogaria do Povo", "(64) 99218-0444"),
    demais: [f("Drogaria Santa Luzia", "(64) 3405-3028"), f("Farma Vidda", "(64) 99237-3232"), f("Drogaria Machado", "(64) 3405-1859")],
  },
  {
    inicio: "2026-03-28",
    farmacia24h: f("Drogaria Nacional", "(64) 3405-1815"),
    demais: [f("Drogaria Central", "(64) 99327-9097"), f("Droganova", "(64) 99607-4282"), f("Drogaria Oriental", "(64) 3405-5779")],
  },
  {
    inicio: "2026-04-04",
    farmacia24h: f("Drogaria São José", "(64) 3405-3093"),
    demais: [f("Drogaria Preço Popular", "(64) 3405-5401"), f("Drogaria Santa Rita", "(64) 3405-1361"), f("Drogaria São Pedro", "(64) 99246-4938")],
  },
  {
    inicio: "2026-04-11",
    farmacia24h: f("Drogaria Marina", "(64) 99334-3139"),
    demais: [f("Drogaria Bem Estar", "(64) 99280-9691"), f("Drogaria Morrinhos", "(64) 3405-1441"), f("Drogaria Aliança", "(64) 3405-2252")],
  },
  {
    inicio: "2026-04-18",
    farmacia24h: f("Drogaria São Sebastião", "(64) 3405-1734"),
    demais: [f("Drogamais", "(64) 99265-4341"), f("Drogaria Do Lar", "(64) 3405-1448"), f("Drogaria JM Popular", "(64) 99203-0312")],
  },
  {
    inicio: "2026-04-25",
    farmacia24h: f("Drogaria Santa Luzia", "(64) 3405-3028"),
    demais: [f("Drogaria do Povo", "(64) 99218-0444"), f("Farma Vidda", "(64) 99237-3232"), f("Drogaria Machado", "(64) 3405-1859")],
  },
  {
    inicio: "2026-05-02",
    farmacia24h: f("Drogaria Central", "(64) 99327-9097"),
    demais: [f("Drogaria Nacional", "(64) 3405-1815"), f("Droganova", "(64) 99607-4282"), f("Drogaria Oriental", "(64) 3405-5779")],
  },
  {
    inicio: "2026-05-09",
    farmacia24h: f("Drogaria Preço Popular", "(64) 3405-5401"),
    demais: [f("Drogaria São José", "(64) 3405-3093"), f("Drogaria Santa Rita", "(64) 3405-1361"), f("Drogaria São Pedro", "(64) 99246-4938")],
  },
  {
    inicio: "2026-05-16",
    farmacia24h: f("Drogaria Morrinhos", "(64) 3405-1441"),
    demais: [f("Drogaria Bem Estar", "(64) 99280-9691"), f("Drogaria Marina", "(64) 99334-3139"), f("Drogaria Aliança", "(64) 3405-2252")],
  },
  {
    inicio: "2026-05-23",
    farmacia24h: f("Drogamais", "(64) 99265-4341"),
    demais: [f("Drogaria São Sebastião", "(64) 3405-1734"), f("Drogaria Do Lar", "(64) 3405-1448"), f("Drogaria JM Popular", "(64) 99203-0312")],
  },
  {
    inicio: "2026-05-30",
    farmacia24h: f("Farma Vidda", "(64) 99237-3232"),
    demais: [f("Drogaria do Povo", "(64) 99218-0444"), f("Drogaria Santa Luzia", "(64) 3405-3028"), f("Drogaria Machado", "(64) 3405-1859")],
  },
  {
    inicio: "2026-06-06",
    farmacia24h: f("Droganova", "(64) 99607-4282"),
    demais: [f("Drogaria Nacional", "(64) 3405-1815"), f("Drogaria Central", "(64) 99327-9097"), f("Drogaria Oriental", "(64) 3405-5779")],
  },
  {
    inicio: "2026-06-13",
    farmacia24h: f("Drogaria Santa Rita", "(64) 3405-1361"),
    demais: [f("Drogaria São José", "(64) 3405-3093"), f("Drogaria Preço Popular", "(64) 3405-5401"), f("Drogaria São Pedro", "(64) 99246-4938")],
  },
  {
    inicio: "2026-06-20",
    farmacia24h: f("Drogaria Aliança", "(64) 3405-2252"),
    demais: [f("Drogaria Bem Estar", "(64) 99280-9691"), f("Drogaria Marina", "(64) 99334-3139"), f("Drogaria Morrinhos", "(64) 3405-1441")],
  },
  {
    inicio: "2026-06-27",
    farmacia24h: f("Drogaria Do Lar", "(64) 3405-1448"),
    demais: [f("Drogaria São Sebastião", "(64) 3405-1734"), f("Drogamais", "(64) 99265-4341"), f("Drogaria JM Popular", "(64) 99203-0312")],
  },
  {
    inicio: "2026-07-04",
    farmacia24h: f("Drogaria Machado", "(64) 3405-1859"),
    demais: [f("Drogaria do Povo", "(64) 99218-0444"), f("Drogaria Santa Luzia", "(64) 3405-3028"), f("Farma Vidda", "(64) 99237-3232")],
  },
  {
    inicio: "2026-07-11",
    farmacia24h: f("Drogaria Oriental", "(64) 3405-5779"),
    demais: [f("Drogaria Nacional", "(64) 3405-1815"), f("Drogaria Central", "(64) 99327-9097"), f("Droganova", "(64) 99607-4282")],
  },
  {
    inicio: "2026-07-18",
    farmacia24h: f("Drogaria São Pedro", "(64) 99246-4938"),
    demais: [f("Drogaria São José", "(64) 3405-3093"), f("Drogaria Preço Popular", "(64) 3405-5401"), f("Drogaria Santa Rita", "(64) 3405-1361")],
  },
  {
    inicio: "2026-07-25",
    farmacia24h: f("Drogaria Bem Estar", "(64) 99280-9691"),
    demais: [f("Drogaria Marina", "(64) 99334-3139"), f("Drogaria Morrinhos", "(64) 3405-1441"), f("Drogaria Aliança", "(64) 3405-2252")],
  },
  {
    inicio: "2026-08-01",
    farmacia24h: f("Drogaria JM Popular", "(64) 99203-0312"),
    demais: [f("Drogaria São Sebastião", "(64) 3405-1734"), f("Drogamais", "(64) 99265-4341"), f("Drogaria Do Lar", "(64) 3405-1448")],
  },
  {
    inicio: "2026-08-08",
    farmacia24h: f("Drogaria do Povo", "(64) 99218-0444"),
    demais: [f("Drogaria Santa Luzia", "(64) 3405-3028"), f("Farma Vidda", "(64) 99237-3232"), f("Drogaria Machado", "(64) 3405-1859")],
  },
  {
    inicio: "2026-08-15",
    farmacia24h: f("Drogaria Nacional", "(64) 3405-1815"),
    demais: [f("Drogaria Central", "(64) 99327-9097"), f("Droganova", "(64) 99607-4282"), f("Drogaria Oriental", "(64) 3405-5779")],
  },
  {
    inicio: "2026-08-22",
    farmacia24h: f("Drogaria São José", "(64) 3405-3093"),
    demais: [f("Drogaria Preço Popular", "(64) 3405-5401"), f("Drogaria Santa Rita", "(64) 3405-1361"), f("Drogaria São Pedro", "(64) 99246-4938")],
  },
  {
    inicio: "2026-08-29",
    farmacia24h: f("Drogaria Marina", "(64) 99334-3139"),
    demais: [f("Drogaria Bem Estar", "(64) 99280-9691"), f("Drogaria Morrinhos", "(64) 3405-1441"), f("Drogaria Aliança", "(64) 3405-2252")],
  },
  {
    inicio: "2026-09-05",
    farmacia24h: f("Drogaria São Sebastião", "(64) 3405-1734"),
    demais: [f("Drogamais", "(64) 99265-4341"), f("Drogaria Do Lar", "(64) 3405-1448"), f("Drogaria JM Popular", "(64) 99203-0312")],
  },
  {
    inicio: "2026-09-12",
    farmacia24h: f("Drogaria Santa Luzia", "(64) 3405-3028"),
    demais: [f("Drogaria do Povo", "(64) 99218-0444"), f("Farma Vidda", "(64) 99237-3232"), f("Drogaria Machado", "(64) 3405-1859")],
  },
  {
    inicio: "2026-09-19",
    farmacia24h: f("Drogaria Central", "(64) 99327-9097"),
    demais: [f("Drogaria Nacional", "(64) 3405-1815"), f("Droganova", "(64) 99607-4282"), f("Drogaria Oriental", "(64) 3405-5779")],
  },
  {
    inicio: "2026-09-26",
    farmacia24h: f("Drogaria Preço Popular", "(64) 3405-5401"),
    demais: [f("Drogaria São José", "(64) 3405-3093"), f("Drogaria Santa Rita", "(64) 3405-1361"), f("Drogaria São Pedro", "(64) 99246-4938")],
  },
  {
    inicio: "2026-10-03",
    farmacia24h: f("Drogaria Morrinhos", "(64) 3405-1441"),
    demais: [f("Drogaria Bem Estar", "(64) 99280-9691"), f("Drogaria Marina", "(64) 99334-3139"), f("Drogaria Aliança", "(64) 3405-2252")],
  },
  {
    inicio: "2026-10-10",
    farmacia24h: f("Drogamais", "(64) 99265-4341"),
    demais: [f("Drogaria São Sebastião", "(64) 3405-1734"), f("Drogaria Do Lar", "(64) 3405-1448"), f("Drogaria JM Popular", "(64) 99203-0312")],
  },
  {
    inicio: "2026-10-17",
    farmacia24h: f("Farma Vidda", "(64) 99237-3232"),
    demais: [f("Drogaria do Povo", "(64) 99218-0444"), f("Drogaria Santa Luzia", "(64) 3405-3028"), f("Drogaria Machado", "(64) 3405-1859")],
  },
  {
    inicio: "2026-10-24",
    farmacia24h: f("Droganova", "(64) 99607-4282"),
    demais: [f("Drogaria Nacional", "(64) 3405-1815"), f("Drogaria Central", "(64) 99327-9097"), f("Drogaria Oriental", "(64) 3405-5779")],
  },
  {
    inicio: "2026-10-31",
    farmacia24h: f("Drogaria Santa Rita", "(64) 3405-1361"),
    demais: [f("Drogaria São José", "(64) 3405-3093"), f("Drogaria Preço Popular", "(64) 3405-5401"), f("Drogaria São Pedro", "(64) 99246-4938")],
  },
  {
    inicio: "2026-11-07",
    farmacia24h: f("Drogaria Aliança", "(64) 3405-2252"),
    demais: [f("Drogaria Bem Estar", "(64) 99280-9691"), f("Drogaria Marina", "(64) 99334-3139"), f("Drogaria Morrinhos", "(64) 3405-1441")],
  },
  {
    inicio: "2026-11-14",
    farmacia24h: f("Drogaria Do Lar", "(64) 3405-1448"),
    demais: [f("Drogaria São Sebastião", "(64) 3405-1734"), f("Drogamais", "(64) 99265-4341"), f("Drogaria JM Popular", "(64) 99203-0312")],
  },
  {
    inicio: "2026-11-21",
    farmacia24h: f("Drogaria Machado", "(64) 3405-1859"),
    demais: [f("Drogaria do Povo", "(64) 99218-0444"), f("Drogaria Santa Luzia", "(64) 3405-3028"), f("Farma Vidda", "(64) 99237-3232")],
  },
  {
    inicio: "2026-11-28",
    farmacia24h: f("Drogaria Oriental", "(64) 3405-5779"),
    demais: [f("Drogaria Nacional", "(64) 3405-1815"), f("Drogaria Central", "(64) 99327-9097"), f("Droganova", "(64) 99607-4282")],
  },
  {
    inicio: "2026-12-05",
    farmacia24h: f("Drogaria São Pedro", "(64) 99246-4938"),
    demais: [f("Drogaria São José", "(64) 3405-3093"), f("Drogaria Preço Popular", "(64) 3405-5401"), f("Drogaria Santa Rita", "(64) 3405-1361")],
  },
  {
    inicio: "2026-12-12",
    farmacia24h: f("Drogaria Bem Estar", "(64) 99280-9691"),
    demais: [f("Drogaria Marina", "(64) 99334-3139"), f("Drogaria Morrinhos", "(64) 3405-1441"), f("Drogaria Aliança", "(64) 3405-2252")],
  },
  {
    inicio: "2026-12-19",
    farmacia24h: f("Drogaria JM Popular", "(64) 99203-0312"),
    demais: [f("Drogaria São Sebastião", "(64) 3405-1734"), f("Drogamais", "(64) 99265-4341"), f("Drogaria Do Lar", "(64) 3405-1448")],
  },
  {
    inicio: "2026-12-26",
    farmacia24h: f("Drogaria do Povo", "(64) 99218-0444"),
    demais: [f("Drogaria Santa Luzia", "(64) 3405-3028"), f("Farma Vidda", "(64) 99237-3232"), f("Drogaria Machado", "(64) 3405-1859")],
  },
  {
    inicio: "2027-01-02",
    farmacia24h: f("Drogaria Nacional", "(64) 3405-1815"),
    demais: [f("Drogaria Central", "(64) 99327-9097"), f("Droganova", "(64) 99607-4282"), f("Drogaria Oriental", "(64) 3405-5779")],
  },
  {
    inicio: "2027-01-09",
    farmacia24h: f("Drogaria São José", "(64) 3405-3093"),
    demais: [f("Drogaria Preço Popular", "(64) 3405-5401"), f("Drogaria Santa Rita", "(64) 3405-1361"), f("Drogaria São Pedro", "(64) 99246-4938")],
  },
  {
    inicio: "2027-01-16",
    farmacia24h: f("Drogaria Marina", "(64) 99334-3139"),
    demais: [f("Drogaria Bem Estar", "(64) 99280-9691"), f("Drogaria Morrinhos", "(64) 3405-1441"), f("Drogaria Aliança", "(64) 3405-2252")],
  },
  {
    inicio: "2027-01-23",
    farmacia24h: f("Drogaria São Sebastião", "(64) 3405-1734"),
    demais: [f("Drogamais", "(64) 99265-4341"), f("Drogaria Do Lar", "(64) 3405-1448"), f("Drogaria JM Popular", "(64) 99203-0312")],
  },
  {
    inicio: "2027-01-30",
    farmacia24h: f("Drogaria Santa Luzia", "(64) 3405-3028"),
    demais: [f("Drogaria do Povo", "(64) 99218-0444"), f("Farma Vidda", "(64) 99237-3232"), f("Drogaria Machado", "(64) 3405-1859")],
  },
  {
    inicio: "2027-02-06",
    farmacia24h: f("Drogaria Central", "(64) 99327-9097"),
    demais: [f("Drogaria Nacional", "(64) 3405-1815"), f("Droganova", "(64) 99607-4282"), f("Drogaria Oriental", "(64) 3405-5779")],
  },
  {
    inicio: "2027-02-13",
    farmacia24h: f("Drogaria Preço Popular", "(64) 3405-5401"),
    demais: [f("Drogaria São José", "(64) 3405-3093"), f("Drogaria Santa Rita", "(64) 3405-1361"), f("Drogaria São Pedro", "(64) 99246-4938")],
  },
  {
    inicio: "2027-02-20",
    farmacia24h: f("Drogaria Morrinhos", "(64) 3405-1441"),
    demais: [f("Drogaria Bem Estar", "(64) 99280-9691"), f("Drogaria Marina", "(64) 99334-3139"), f("Drogaria Aliança", "(64) 3405-2252")],
  },
];

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

function parseDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function formatDia(d: Date): string {
  return `${d.getDate()} de ${MESES[d.getMonth()]}`;
}

export function getPeriodo(semana: SemanaPlantao, nextSemana?: SemanaPlantao): { de: string; ate: string } {
  const inicio = parseDate(semana.inicio);
  let fim: Date;
  if (nextSemana) {
    fim = parseDate(nextSemana.inicio);
    fim.setDate(fim.getDate() - 1);
  } else {
    fim = new Date(inicio);
    fim.setDate(fim.getDate() + 6);
  }
  return { de: formatDia(inicio), ate: formatDia(fim) };
}

export function getSemanaAtual(): number {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  for (let i = PLANTAO_FARMACIAS.length - 1; i >= 0; i--) {
    const inicio = parseDate(PLANTAO_FARMACIAS[i].inicio);
    if (hoje >= inicio) return i;
  }
  return 0;
}

export function getMesAno(semana: SemanaPlantao): string {
  const d = parseDate(semana.inicio);
  return `${MESES[d.getMonth()].charAt(0).toUpperCase() + MESES[d.getMonth()].slice(1)} ${d.getFullYear()}`;
}

export function getTelefoneLink(farmacia: Farmacia): string {
  const num = farmacia.telefone.replace(/\D/g, "");
  if (farmacia.tipo === "whatsapp") {
    const msg = encodeURIComponent("Olá, vim pelo Morrinhos.ai. Estou precisando de ");
    return `https://wa.me/55${num}?text=${msg}`;
  }
  return `tel:+55${num}`;
}

const COORDS: Record<string, [number, number]> = {
  "Drogaria Bem Estar":      [-17.3043, -49.0221],
  "Drogaria do Povo":        [-17.3030, -49.0190],
  "Drogaria Nacional":       [-17.3035, -49.0250],
  "Drogaria São José":       [-17.3050, -49.0200],
  "Drogaria São Sebastião":  [-17.3040, -49.0217],
  "Drogaria Santa Luzia":    [-17.3040, -49.0217],
  "Drogamais":               [-17.3042, -49.0220],
  "Droganova":               [-17.3100, -49.0339],
  "Drogaria Central":        [-17.30434, -49.02208],
  "Drogaria Preço Popular":      [-17.3049, -49.0253],
  "Drogaria Marina":         [-17.3049, -49.0253],
  "Farma Vidda":      [-17.3040, -49.0200],
  "Drogaria JM Popular":     [-17.3100, -49.0339],
  "Drogaria Machado":        [-17.3041, -49.0217],
  "Drogaria Oriental":       [-17.29964, -49.02673],
  "Drogaria São Pedro":      [-17.3020, -49.0260],
  "Drogaria Aliança":        [-17.3126, -49.0342],
  "Drogaria Do Lar":         [-17.3041, -49.0217],
  "Drogaria Santa Rita":     [-17.30398, -49.02208],
  "Drogaria Morrinhos":    [-17.30400, -49.02170],
};

export function getWazeLink(farmacia: Farmacia): string | null {
  const c = COORDS[farmacia.nome];
  if (!c) return null;
  return `https://waze.com/ul?ll=${c[0]},${c[1]}&navigate=yes&zoom=17`;
}

export function gerarTextoCompartilhamento(semana: SemanaPlantao, nextSemana?: SemanaPlantao): string {
  const p = getPeriodo(semana, nextSemana);
  const icon24 = "🕐";
  const iconFarm = "💊";
  const lines = [
    `${iconFarm} *Plantão de Farmácias em Morrinhos*`,
    `📅 ${p.de} a ${p.ate}`,
    "",
    `${icon24} *Farmácia 24h:*`,
    `${semana.farmacia24h.nome} — ${semana.farmacia24h.telefone}`,
    "",
    `${iconFarm} *Demais farmácias de plantão:*`,
    ...semana.demais.map((f) => `• ${f.nome} — ${f.telefone}`),
    "",
    `Veja o calendário completo:`,
    `https://morrinhos.ai/plantao-farmacias`,
    "",
    `_Fonte: Morrinhos.ai_`,
  ];
  return lines.join("\n");
}

export function getShareWhatsAppLink(semana: SemanaPlantao, nextSemana?: SemanaPlantao): string {
  return `https://wa.me/?text=${encodeURIComponent(gerarTextoCompartilhamento(semana, nextSemana))}`;
}

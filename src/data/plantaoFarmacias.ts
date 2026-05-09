// Calendário oficial de plantão de farmácias de Morrinhos.
// TODO: Importar do site oficial da Vigilância Sanitária / Secretaria de Saúde de Morrinhos
// quando estiver disponível. Por enquanto, vazio — o componente exibe "Em breve".
//
// Fonte oficial pendente: https://morrinhos.go.gov.br ou Vigilância Sanitária Municipal.

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

export const PLANTAO_FARMACIAS: SemanaPlantao[] = [];

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

function parseDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function formatDia(d: Date): string {
  return `${d.getDate()} de ${MESES[d.getMonth()]}`;
}

export function getPeriodo(
  semana: SemanaPlantao,
  nextSemana?: SemanaPlantao,
): { de: string; ate: string } {
  const inicio = parseDate(semana.inicio);
  const fim = nextSemana ? parseDate(nextSemana.inicio) : new Date(inicio.getTime() + 7 * 86400000);
  fim.setDate(fim.getDate() - 1);
  return { de: formatDia(inicio), ate: formatDia(fim) };
}

export function getSemanaAtual(): number {
  // Sem dados ainda — retorna -1 pra sinalizar ao componente exibir "Em breve".
  if (PLANTAO_FARMACIAS.length === 0) return -1;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  for (let i = PLANTAO_FARMACIAS.length - 1; i >= 0; i--) {
    if (parseDate(PLANTAO_FARMACIAS[i].inicio) <= hoje) return i;
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
    return `https://wa.me/55${num}`;
  }
  return `tel:+55${num}`;
}

export function getWazeLink(_farmacia: Farmacia): string | null {
  // Coordenadas das farmácias de Morrinhos pendentes.
  return null;
}

export function gerarTextoCompartilhamento(
  semana: SemanaPlantao,
  nextSemana?: SemanaPlantao,
): string {
  const p = getPeriodo(semana, nextSemana);
  return `Plantão de farmácias em Morrinhos — ${p.de} a ${p.ate}\n\n` +
    `🕐 24h: ${semana.farmacia24h.nome} — ${semana.farmacia24h.telefone}\n` +
    semana.demais.map((f) => `• ${f.nome} — ${f.telefone}`).join("\n") +
    `\n\nMais em https://morrinhos.ai/plantao-farmacias`;
}

export function getShareWhatsAppLink(
  semana: SemanaPlantao,
  nextSemana?: SemanaPlantao,
): string {
  return `https://wa.me/?text=${encodeURIComponent(gerarTextoCompartilhamento(semana, nextSemana))}`;
}

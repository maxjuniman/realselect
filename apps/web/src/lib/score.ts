export type ScoreTone = "verde" | "roxo" | "empate";

export function placar(match: {
  scheduled?: boolean;
  scoreA: number | null;
  scoreB: number | null;
  goalDiffA: number;
}) {
  if (match.scheduled) return "—";
  if (match.scoreA !== null && match.scoreB !== null) return `${match.scoreA} x ${match.scoreB}`;
  if (match.goalDiffA === 0) return "0 x 0";
  return `+${Math.abs(match.goalDiffA)}`;
}

export function winnerTone(match: {
  scheduled?: boolean;
  scoreA: number | null;
  scoreB: number | null;
  goalDiffA: number;
  colorA?: string;
}): ScoreTone {
  if (match.scheduled) return "empate";
  const aWon = match.scoreA !== null && match.scoreB !== null ? match.scoreA > match.scoreB : match.goalDiffA > 0;
  const bWon = match.scoreA !== null && match.scoreB !== null ? match.scoreB > match.scoreA : match.goalDiffA < 0;
  if (!aWon && !bWon) return "empate";
  const colorA = match.colorA === "roxo" ? "roxo" : "verde";
  const colorB = colorA === "verde" ? "roxo" : "verde";
  return aWon ? colorA : colorB;
}

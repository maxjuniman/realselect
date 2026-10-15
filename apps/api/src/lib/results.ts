export type Side = "A" | "B";

const DAY = 24 * 60 * 60 * 1000;

export function playerScore(team: Side, goalDiffA: number) {
  const goalDiff = team === "A" ? goalDiffA : -goalDiffA;
  if (goalDiff > 0) return { result: "win" as const, points: 3, goalDiff };
  if (goalDiff < 0) return { result: "loss" as const, points: 0, goalDiff };
  return { result: "draw" as const, points: 1, goalDiff };
}

/** Mesma conta da coluna Ordenamento da planilha, somada por jogador. */
export function orderPiece(points: number, goalDiff: number, playedOn: Date, won: boolean, today = new Date()) {
  const matchDay = Date.UTC(playedOn.getUTCFullYear(), playedOn.getUTCMonth(), playedOn.getUTCDate());
  const todayDay = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const daysSince = Math.round((todayDay - matchDay) / DAY);
  const recency = won ? daysSince * -0.00000001 : 0;
  return points + 0.001 + goalDiff * 0.00001 + recency;
}

export function isRankingPlayer(name: string) {
  return name.trim().toLocaleLowerCase("pt-BR") !== "gol contra";
}

export function scoreLine(scoreA: number | null, scoreB: number | null, goalDiffA: number) {
  if (scoreA !== null && scoreB !== null) return `${scoreA} x ${scoreB}`;
  if (goalDiffA === 0) return "Empate";
  if (goalDiffA > 0) return `A levou (saldo +${goalDiffA})`;
  return `B levou (saldo +${Math.abs(goalDiffA)})`;
}

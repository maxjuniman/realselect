import type { PlayerRef } from "@/lib/types";

export type TeamColor = "verde" | "roxo";

export type ParsedTeams =
  | {
      ok: true;
      colorA: TeamColor;
      scoreA: number;
      scoreB: number;
      teamA: PlayerRef[];
      teamB: PlayerRef[];
    }
  | { ok: false; message: string };

const header = /^(verde|roxo)\s*:?\s*(\d{1,2})$/i;

function fold(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ");
}

function resolve(token: string, players: PlayerRef[]) {
  const key = fold(token);
  const byName = players.filter((player) => fold(player.name) === key);
  if (byName.length === 1) return { player: byName[0] };
  if (byName.length > 1) return { problem: `Há mais de um jogador chamado ${token}.` };
  const byNick = players.filter((player) => player.nickname && fold(player.nickname) === key);
  if (byNick.length === 1) return { player: byNick[0] };
  if (byNick.length > 1) return { problem: `Há mais de um jogador chamado ${token}.` };
  return { problem: token };
}

export function parseTeamList(text: string, players: PlayerRef[]): ParsedTeams {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (!lines.length) return { ok: false, message: "Cole a lista dos times." };

  const blocks: { color: TeamColor; score: number; names: string[] }[] = [];
  let current: (typeof blocks)[number] | null = null;
  for (const line of lines) {
    const match = line.match(header);
    if (match) {
      current = { color: match[1].toLocaleLowerCase("pt-BR") as TeamColor, score: Number(match[2]), names: [] };
      blocks.push(current);
      continue;
    }
    if (!current) return { ok: false, message: "Comece cada time com a cor e o placar, como VERDE 8." };
    current.names.push(line);
  }

  if (blocks.length !== 2) return { ok: false, message: "A lista precisa ter o time verde e o time roxo." };
  const colors = new Set(blocks.map((block) => block.color));
  if (!colors.has("verde") || !colors.has("roxo")) {
    return { ok: false, message: "A lista precisa ter um time verde e um time roxo." };
  }

  const missing: string[] = [];
  const problems: string[] = [];
  const used = new Map<string, string>();
  const teams = blocks.map((block) => {
    if (!block.names.length) problems.push(`O time ${block.color} está sem jogadores.`);
    const found: PlayerRef[] = [];
    for (const name of block.names) {
      const result = resolve(name, players);
      if (!result.player) {
        if (result.problem === name) missing.push(name);
        else if (result.problem) problems.push(result.problem);
        continue;
      }
      const previous = used.get(result.player.id);
      if (previous) problems.push(`${result.player.name} aparece mais de uma vez.`);
      used.set(result.player.id, block.color);
      found.push(result.player);
    }
    return found;
  });

  if (missing.length) problems.unshift(`Não encontrei na listagem: ${missing.join(", ")}.`);
  if (problems.length) return { ok: false, message: problems.join(" ") };

  return {
    ok: true,
    colorA: blocks[0].color,
    scoreA: blocks[0].score,
    scoreB: blocks[1].score,
    teamA: teams[0],
    teamB: teams[1],
  };
}

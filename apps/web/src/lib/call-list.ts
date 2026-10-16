import { formatTinyDate, nextTuesday } from "./format";
import { positionRank } from "./roster";
import type { MatchDetail, PlayerRef } from "./types";

function byName(a: PlayerRef, b: PlayerRef) {
  return a.name.localeCompare(b.name, "pt-BR");
}

function byPosition(a: PlayerRef, b: PlayerRef) {
  const rank = positionRank(a.positions?.[0]) - positionRank(b.positions?.[0]);
  return rank || byName(a, b);
}

function isKeeper(player: PlayerRef) {
  return player.positions?.[0] === "Goleiro";
}

function isSuplente(player: PlayerRef) {
  return player.squad === "suplente" || Boolean(player.guest);
}

function localIso(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function nextGameDate(matches: MatchDetail[], today = new Date()) {
  const todayIso = localIso(today);
  const scheduled = matches
    .filter((match) => match.scheduled && match.playedOn >= todayIso)
    .map((match) => match.playedOn)
    .sort();
  if (scheduled[0]) return scheduled[0];

  let date = nextTuesday(today);
  const played = new Set(matches.filter((match) => !match.scheduled).map((match) => match.playedOn));
  if (played.has(date)) {
    const [year, month, day] = date.split("-").map(Number);
    date = localIso(new Date(year, month - 1, day + 7));
  }
  return date;
}

function latestDates(matches: MatchDetail[]) {
  const playedOn = new Map<string, string>();
  const professorOn = new Map<string, string>();
  for (const match of matches) {
    if (match.scheduled) continue;
    if (match.professor) {
      const previous = professorOn.get(match.professor.id);
      if (!previous || match.playedOn > previous) professorOn.set(match.professor.id, match.playedOn);
    }
    for (const player of [...match.teamA, ...match.teamB]) {
      const previous = playedOn.get(player.id);
      if (!previous || match.playedOn > previous) playedOn.set(player.id, match.playedOn);
    }
  }
  return { playedOn, professorOn };
}

function byQueue(dates: Map<string, string>) {
  return (a: PlayerRef, b: PlayerRef) => {
    const left = dates.get(a.id) ?? "";
    const right = dates.get(b.id) ?? "";
    if (left !== right) return left < right ? -1 : 1;
    return byName(a, b);
  };
}

export function substituteQueue(players: PlayerRef[], matches: MatchDetail[]) {
  const active = players.filter((player) => player.active !== false && isSuplente(player) && player.name.trim().toLocaleLowerCase("pt-BR") !== "gol contra");
  const queue = byQueue(latestDates(matches).playedOn);
  return [...active.filter(isKeeper).sort(queue), ...active.filter((player) => !isKeeper(player)).sort(queue)];
}

function numbered(players: PlayerRef[]) {
  return players.map((player, index) => `${index + 1}. ${player.name}`).join("\n");
}

export function lastProfessorId(matches: MatchDetail[]) {
  let best: { id: string; playedOn: string } | null = null;
  for (const match of matches) {
    if (match.scheduled || !match.professor) continue;
    if (!best || match.playedOn > best.playedOn) best = { id: match.professor.id, playedOn: match.playedOn };
  }
  return best?.id ?? null;
}

export function nextInRotation<T extends { id: string }>(order: T[], lastId: string | null, absentIds: Iterable<string>) {
  if (!order.length) return undefined;
  const absent = new Set(absentIds);
  const start = order.findIndex((item) => item.id === lastId);
  for (let step = 1; step <= order.length; step += 1) {
    const item = order[(start + step) % order.length];
    if (!absent.has(item.id)) return item;
  }
  return undefined;
}

export type CallListOptions = {
  today?: Date;
  order?: string[];
  absentIds?: string[];
};

export function buildCallList(players: PlayerRef[], matches: MatchDetail[], options: CallListOptions = {}) {
  const absent = new Set(options.absentIds ?? []);
  const active = players.filter((player) => player.active !== false && player.name.trim().toLocaleLowerCase("pt-BR") !== "gol contra" && !absent.has(player.id));
  const mensalistas = active.filter((player) => !isSuplente(player)).sort(byPosition);
  const { professorOn } = latestDates(matches);
  const date = nextGameDate(matches, options.today ?? new Date());
  const roster = players.filter((player) => player.active !== false && !isSuplente(player));
  const rotation = (options.order ?? []).flatMap((id) => {
    const player = roster.find((item) => item.id === id);
    return player ? [player] : [];
  });
  const professor = rotation.length
    ? nextInRotation(rotation, lastProfessorId(matches), absent)
    : nextInRotation([...roster].sort(byQueue(professorOn)), null, absent);

  const blocks = [
    numbered(mensalistas.filter(isKeeper)),
    numbered(mensalistas.filter((player) => !isKeeper(player))),
    numbered(substituteQueue(active, matches)),
  ].filter(Boolean);
  return [
    `Futibas TERÇA-FEIRA ${formatTinyDate(date)} 18:30 BOMBONERA`,
    "OBS: Quem não for, retira o nome da lista",
    `OBS2: Professor ${professor?.name ?? "a definir"}`,
    "",
    blocks.join("\n\n"),
  ]
    .join("\n")
    .trimEnd();
}

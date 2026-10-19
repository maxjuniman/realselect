const POSITIONS = ["Goleiro", "Zaga", "Meio", "Ataque"] as const;

function positionRank(position?: string) {
  const index = POSITIONS.indexOf(position as (typeof POSITIONS)[number]);
  return index === -1 ? POSITIONS.length : index;
}

function formatTinyDate(iso: string) {
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year.slice(2)}`;
}

function nextTuesday(from = new Date()) {
  const date = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const add = (2 - date.getDay() + 7) % 7;
  date.setDate(date.getDate() + add);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export type PlayerRef = {
  id: string;
  name: string;
  guest: boolean;
  active?: boolean;
  squad?: string;
  injured?: boolean;
  positions?: string[];
};

export type MatchDetail = {
  id: string;
  playedOn: string;
  scheduled: boolean;
  professor: { id: string; name: string } | null;
  teamA: { id: string; name: string; guest: boolean }[];
  teamB: { id: string; name: string; guest: boolean }[];
};

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

function substituteGroups(players: PlayerRef[], matches: MatchDetail[]) {
  const active = players.filter((player) => player.active !== false && isSuplente(player) && player.name.trim().toLocaleLowerCase("pt-BR") !== "gol contra");
  const queue = byQueue(latestDates(matches).playedOn);
  return {
    keepers: active.filter(isKeeper).sort(queue),
    field: active.filter((player) => !isKeeper(player)).sort(queue),
  };
}

export function substituteQueue(players: PlayerRef[], matches: MatchDetail[]) {
  const groups = substituteGroups(players, matches);
  return [...groups.keepers, ...groups.field];
}

export function gameSequence(players: PlayerRef[], matches: MatchDetail[], today = new Date()) {
  const eligible = players.filter((player) => player.active !== false && player.name.trim().toLocaleLowerCase("pt-BR") !== "gol contra");
  const played = matches
    .filter((match) => !match.scheduled)
    .sort((left, right) => right.playedOn.localeCompare(left.playedOn) || right.id.localeCompare(left.id));
  const recent = new Set(played.slice(0, 10).map((match) => match.id));
  const cutoff = localIso(new Date(today.getFullYear(), today.getMonth() - 12, today.getDate()));
  const totals = new Map(eligible.map((player) => [player.id, { last10: 0, last12Months: 0 }]));
  for (const match of played) {
    const ids = new Set([...match.teamA, ...match.teamB].map((player) => player.id));
    for (const id of ids) {
      const total = totals.get(id);
      if (!total) continue;
      if (recent.has(match.id)) total.last10 += 1;
      if (match.playedOn >= cutoff) total.last12Months += 1;
    }
  }
  return eligible
    .map((player) => ({ player, last10: totals.get(player.id)?.last10 ?? 0, last12Months: totals.get(player.id)?.last12Months ?? 0 }))
    .sort((left, right) => left.last10 - right.last10 || left.last12Months - right.last12Months || byName(left.player, right.player));
}

export function lastProfessorId(matches: MatchDetail[]) {
  let best: { id: string; playedOn: string } | null = null;
  for (const match of matches) {
    if (match.scheduled || !match.professor) continue;
    if (!best || match.playedOn > best.playedOn) best = { id: match.professor.id, playedOn: match.playedOn };
  }
  return best?.id ?? null;
}

function walkProfessorSlots<T extends { id: string; injured?: boolean }>(order: T[], slots: { playerId: string; cancelled?: boolean }[]) {
  const byId = new Map(order.map((player) => [player.id, player]));
  const skipped: T[] = [];
  const seen = new Set<string>();
  for (const slot of slots) {
    if (slot.cancelled) continue;
    const player = byId.get(slot.playerId);
    if (!player) continue;
    if (player.injured) {
      if (!seen.has(player.id)) {
        seen.add(player.id);
        skipped.push(player);
      }
      continue;
    }
    return { next: player, skipped };
  }
  return { next: undefined, skipped };
}

export function skippedProfessors<T extends { id: string; injured?: boolean }>(order: T[], slots: { playerId: string; cancelled?: boolean }[]) {
  return walkProfessorSlots(order, slots).skipped;
}

export function nextProfessor<T extends { id: string; injured?: boolean }>(order: T[], slots: { playerId: string; cancelled?: boolean }[], fallbackFromId: string | null) {
  const found = walkProfessorSlots(order, slots);
  if (found.next) return found.next;
  const blocked = order.filter((player) => player.injured).map((player) => player.id);
  return nextInRotation(order, fallbackFromId, blocked);
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

export const PROFESSOR_HORIZON = "2026-12-31";

export function upcomingTuesdays(matches: MatchDetail[], today = new Date(), end = PROFESSOR_HORIZON) {
  const played = matches.filter((match) => !match.scheduled).map((match) => match.playedOn);
  const last = [...played].sort().at(-1);
  let start = nextTuesday(today);
  if (last && last >= start) {
    const [year, month, day] = last.split("-").map(Number);
    start = nextTuesday(new Date(year, month - 1, day + 1));
  }
  const playedSet = new Set(played);
  const dates: string[] = [];
  let cursor = start;
  while (cursor <= end) {
    if (!playedSet.has(cursor)) dates.push(cursor);
    const [year, month, day] = cursor.split("-").map(Number);
    const next = new Date(year, month - 1, day + 7);
    const nextMonth = String(next.getMonth() + 1).padStart(2, "0");
    const nextDay = String(next.getDate()).padStart(2, "0");
    cursor = `${next.getFullYear()}-${nextMonth}-${nextDay}`;
  }
  return dates;
}

export type PlannedSlot = { playedOn: string; playerId: string; cancelled?: boolean };

export function buildFutureSlots(order: { id: string }[], lastId: string | null, dates: string[], plans: PlannedSlot[]) {
  const saved = new Map(plans.map((plan) => [plan.playedOn, plan]));
  let cursor = Math.max(order.findIndex((player) => player.id === lastId), -1);
  return dates.flatMap((playedOn) => {
    const chosen = saved.get(playedOn);
    if (chosen && order.some((player) => player.id === chosen.playerId)) {
      cursor = order.findIndex((player) => player.id === chosen.playerId);
      return [{ playedOn, playerId: chosen.playerId, cancelled: Boolean(chosen.cancelled) }];
    }
    if (!order.length) return [];
    cursor = (cursor + 1) % order.length;
    const player = order[cursor];
    return player ? [{ playedOn, playerId: player.id, cancelled: false }] : [];
  });
}

export type CallListOptions = {
  today?: Date;
  order?: string[];
  absentIds?: string[];
  plans?: PlannedSlot[];
  barbecue?: boolean;
};

export function isFirstTuesday(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day || day > 7) return false;
  return new Date(year, month - 1, day).getDay() === 2;
}

export function listGameDate(players: PlayerRef[], matches: MatchDetail[], options: CallListOptions = {}) {
  const roster = players.filter((player) => player.active !== false && !isSuplente(player));
  const rotation = (options.order ?? []).flatMap((id) => {
    const player = roster.find((item) => item.id === id);
    return player ? [player] : [];
  });
  const today = options.today ?? new Date();
  const future = buildFutureSlots(rotation, lastProfessorId(matches), upcomingTuesdays(matches, today), options.plans ?? []);
  const open = future.find((slot) => !slot.cancelled);
  return open?.playedOn ?? nextGameDate(matches, today);
}

export function buildCallList(players: PlayerRef[], matches: MatchDetail[], options: CallListOptions = {}) {
  const absent = new Set(options.absentIds ?? []);
  const active = players.filter((player) => player.active !== false && player.name.trim().toLocaleLowerCase("pt-BR") !== "gol contra" && !absent.has(player.id));
  const mensalistas = active.filter((player) => !isSuplente(player)).sort(byPosition);
  const { professorOn } = latestDates(matches);
  const roster = players.filter((player) => player.active !== false && !isSuplente(player));
  const rotation = (options.order ?? []).flatMap((id) => {
    const player = roster.find((item) => item.id === id);
    return player ? [player] : [];
  });
  const today = options.today ?? new Date();
  const future = buildFutureSlots(rotation, lastProfessorId(matches), upcomingTuesdays(matches, today), options.plans ?? []);
  const professor = rotation.length
    ? nextProfessor(rotation, future, lastProfessorId(matches))
    : nextInRotation(
        [...roster].sort(byQueue(professorOn)),
        null,
        roster.filter((player) => player.injured).map((player) => player.id),
      );
  const gameDate = listGameDate(players, matches, options);
  const marks = new Map(gameSequence(active, matches, today).map((row) => [row.player.id, row]));
  const grouped = substituteGroups(active, matches);
  const queue = byQueue(latestDates(matches).playedOn);
  const byRecent = (left: PlayerRef, right: PlayerRef) => {
    const diff = (marks.get(right.id)?.last10 ?? 0) - (marks.get(left.id)?.last10 ?? 0);
    return diff || queue(left, right);
  };
  const subs = {
    keepers: [...grouped.keepers].sort(byRecent),
    field: [...grouped.field].sort(byRecent),
  };

  function lines(title: string, people: PlayerRef[], meat = false) {
    if (!people.length) return "";
    const body = people
      .map((player, index) => {
        if (player.injured) return `${index + 1}. `;
        const row = marks.get(player.id);
        const position = player.positions?.[0];
        const place = position ? ` (${position})` : "";
        const count = row ? ` ${row.last10}/10` : "";
        const mark = meat ? " 🍖" : "";
        return `${index + 1}. ${player.name}${place}${count}${mark}`;
      })
      .join("\n");
    return `${title}\n${body}`;
  }

  const barbecue = options.barbecue ?? isFirstTuesday(gameDate);
  const blocks = [
    lines("Goleiros", mensalistas.filter(isKeeper), barbecue),
    lines("Jogadores", mensalistas.filter((player) => !isKeeper(player)), barbecue),
    lines("Goleiros suplentes", subs.keepers),
    lines("Suplentes", subs.field),
  ].filter(Boolean);
  return [
    `Futibas TERÇA-FEIRA ${formatTinyDate(gameDate)} 18:30 BOMBONERA`,
    "OBS: Quem não for, retira o nome da lista",
    `OBS2: Professor ${professor?.name ?? "a definir"}`,
    "",
    blocks.join("\n\n"),
  ]
    .join("\n")
    .trimEnd();
}

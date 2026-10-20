import { formatTinyDate } from "./format";
import type { MatchDetail, Season } from "./types";

const skipped = new Set(["gol contra", "goleiro de aluguel"]);

function fold(name: string) {
  return name.trim().toLocaleLowerCase("pt-BR").replace(/\s+/g, " ");
}

export type HistoryCell = {
  matchId: string;
  result: "win" | "loss" | "draw";
  points: number;
};

export type HistoryColumn = {
  id: string;
  playedOn: string;
  label: string;
  seasonCode: string;
  seasonName: string;
};

export type HistoryRow = {
  id: string;
  name: string;
  guest: boolean;
  points: number;
  games: number;
  goalDiff: number;
  cells: (HistoryCell | null)[];
};

export function historyHref(primary: string, extras: string[]) {
  const params = new URLSearchParams();
  params.set("temporada", primary);
  const more = extras.filter((code) => code && code !== primary);
  if (more.length) params.set("mais", more.join(","));
  return `/historico?${params.toString()}`;
}

export function extraSeasonCodes(raw: string | undefined, seasons: Season[], primary: string) {
  if (!raw) return [];
  const known = new Set(seasons.map((season) => season.code));
  const seen = new Set<string>();
  const codes: string[] = [];
  for (const part of raw.split(",")) {
    const code = part.trim();
    if (!code || code === primary || !known.has(code) || seen.has(code)) continue;
    seen.add(code);
    codes.push(code);
  }
  return codes;
}

export function seasonBands(columns: HistoryColumn[]) {
  const bands: { code: string; name: string; count: number }[] = [];
  for (const column of columns) {
    const last = bands.at(-1);
    if (last?.code === column.seasonCode) last.count += 1;
    else bands.push({ code: column.seasonCode, name: column.seasonName, count: 1 });
  }
  return bands;
}

export function buildHistory(matches: MatchDetail[]) {
  const played = matches
    .filter((match) => !match.scheduled)
    .sort((a, b) => a.playedOn.localeCompare(b.playedOn) || a.id.localeCompare(b.id));
  const columns: HistoryColumn[] = played.map((match) => ({
    id: match.id,
    playedOn: match.playedOn,
    label: formatTinyDate(match.playedOn),
    seasonCode: match.season.code,
    seasonName: match.season.name,
  }));
  const index = new Map(columns.map((column, position) => [column.id, position]));
  const rows = new Map<string, HistoryRow>();

  for (const match of played) {
    const position = index.get(match.id);
    if (position === undefined) continue;
    for (const player of [...match.teamA, ...match.teamB]) {
      if (skipped.has(fold(player.name))) continue;
      const row = rows.get(player.id) ?? {
        id: player.id,
        name: player.name,
        guest: player.guest,
        points: 0,
        games: 0,
        goalDiff: 0,
        cells: columns.map(() => null),
      };
      if (!row.cells[position]) {
        row.cells[position] = { matchId: match.id, result: player.result, points: player.points };
        row.points += player.points;
        row.games += 1;
        row.goalDiff += player.goalDiff;
      }
      rows.set(player.id, row);
    }
  }

  const ordered = [...rows.values()].sort(
    (a, b) => b.points - a.points || b.games - a.games || b.goalDiff - a.goalDiff || a.name.localeCompare(b.name, "pt-BR"),
  );
  return { columns, rows: ordered };
}

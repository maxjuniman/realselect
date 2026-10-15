import { readFileSync } from "node:fs";
import path from "node:path";
import { isoToDate } from "./lib/dates.js";
import { prisma } from "./lib/prisma.js";

type SeedFile = {
  seasons: { code: string; name: string; year: number; half: number }[];
  players: { name: string; guest: boolean }[];
  matches: {
    season: string;
    date: string;
    goalDiffA: number;
    scoreA: number | null;
    scoreB: number | null;
    scoreLabel: string | null;
    professor: string | null;
    teams: { A: string[]; B: string[] };
    events: { player: string | null; type: string; count: number }[];
  }[];
};

function fold(value: string) {
  return value.trim().toLocaleLowerCase("pt-BR");
}

export async function seedChampionship(force = false) {
  const existing = await prisma.match.count();
  if (existing && !force) return false;

  const file = JSON.parse(readFileSync(path.join(process.cwd(), "prisma", "seed-data.json"), "utf8")) as SeedFile;
  const latestDate = file.matches.reduce((max, match) => (match.date > max ? match.date : max), "1970-01-01");
  const cutoff = isoToDate(latestDate);
  cutoff.setUTCDate(cutoff.getUTCDate() - 400);
  const cutoffIso = cutoff.toISOString().slice(0, 10);
  const recent = new Set<string>();
  for (const match of file.matches) {
    if (match.date < cutoffIso) continue;
    for (const name of [...match.teams.A, ...match.teams.B]) recent.add(fold(name));
  }
  const currentSeason = file.matches.reduce((best, match) => (match.date > best.date ? match : best)).season;

  await prisma.match.deleteMany();
  await prisma.player.deleteMany();
  await prisma.season.deleteMany();

  await prisma.season.createMany({
    data: file.seasons
      .filter((season) => season.code !== "OFF")
      .map((season) => ({ ...season, isCurrent: season.code === currentSeason })),
  });
  await prisma.player.createMany({
    data: file.players.map((player) => ({
      name: player.name,
      guest: player.guest,
      active: player.guest ? fold(player.name) !== "gol contra" && recent.has(fold(player.name)) : recent.has(fold(player.name)),
    })),
  });

  const seasons = await prisma.season.findMany();
  const players = await prisma.player.findMany();
  const seasonByCode = new Map(seasons.map((season) => [season.code, season.id]));
  const playerByName = new Map(players.map((player) => [fold(player.name), player.id]));

  for (const entry of file.matches) {
    const seasonId = seasonByCode.get(entry.season);
    if (!seasonId) continue;
    const professorId = entry.professor ? playerByName.get(fold(entry.professor)) ?? null : null;
    const match = await prisma.match.create({
      data: {
        seasonId,
        playedOn: isoToDate(entry.date),
        scoreA: entry.scoreA,
        scoreB: entry.scoreB,
        goalDiffA: entry.goalDiffA,
        scoreLabel: entry.scoreLabel,
        professorId,
        origin: "planilha",
      },
    });
    const names = [
      ...entry.teams.A.map((name) => ({ name, team: "A" })),
      ...entry.teams.B.map((name) => ({ name, team: "B" })),
    ];
    const usedPlayers = new Set<string>();
    const appearances = names.flatMap((item) => {
      const playerId = playerByName.get(fold(item.name));
      if (!playerId || usedPlayers.has(playerId)) return [];
      usedPlayers.add(playerId);
      return [{ matchId: match.id, playerId, team: item.team }];
    });
    await prisma.matchAppearance.createMany({ data: appearances });
    const events = entry.events
      .map((event) => {
        if (event.type === "own_goal" || !event.player) {
          return { matchId: match.id, playerId: null, type: event.type === "goal" ? "own_goal" : event.type, count: event.count };
        }
        const playerId = playerByName.get(fold(event.player));
        if (!playerId) return null;
        return { matchId: match.id, playerId, type: event.type, count: event.count };
      })
      .filter((item): item is { matchId: string; playerId: string | null; type: string; count: number } => Boolean(item));
    if (events.length) await prisma.matchEvent.createMany({ data: events });
  }

  return true;
}

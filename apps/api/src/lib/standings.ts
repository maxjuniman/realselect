import { dateToIso } from "./dates.js";
import { prisma } from "./prisma.js";
import { isRankingPlayer, orderPiece, playerScore } from "./results.js";

export async function getSeason(code?: string | null) {
  if (code) {
    const season = await prisma.season.findUnique({ where: { code } });
    if (season) return season;
  }
  const current = await prisma.season.findFirst({ where: { isCurrent: true } });
  if (current) return current;
  return prisma.season.findFirst({ orderBy: [{ year: "desc" }, { half: "desc" }] });
}

export async function standingsFor(seasonId: string) {
  const [appearances, events, season] = await Promise.all([
    prisma.matchAppearance.findMany({
      where: { match: { seasonId, scheduled: false } },
      include: {
        player: true,
        match: { select: { playedOn: true, goalDiffA: true } },
      },
    }),
    prisma.matchEvent.groupBy({
      by: ["playerId", "type"],
      where: { match: { seasonId, scheduled: false }, playerId: { not: null } },
      _sum: { count: true },
    }),
    prisma.season.findUniqueOrThrow({ where: { id: seasonId } }),
  ]);

  const goals = new Map<string, { goals: number; assists: number }>();
  for (const event of events) {
    if (!event.playerId) continue;
    const bucket = goals.get(event.playerId) ?? { goals: 0, assists: 0 };
    if (event.type === "goal") bucket.goals += event._sum.count ?? 0;
    if (event.type === "assist") bucket.assists += event._sum.count ?? 0;
    goals.set(event.playerId, bucket);
  }

  const rows = new Map<
    string,
    {
      player: { id: string; name: string; guest: boolean };
      points: number;
      games: number;
      wins: number;
      draws: number;
      losses: number;
      goalDiff: number;
      lastWin: string | null;
      lastMatch: string | null;
      orderKey: number;
    }
  >();

  for (const appearance of appearances) {
    if (!isRankingPlayer(appearance.player.name)) continue;
    const score = playerScore(appearance.team as "A" | "B", appearance.match.goalDiffA);
    const current = rows.get(appearance.playerId) ?? {
      player: {
        id: appearance.player.id,
        name: appearance.player.name,
        guest: appearance.player.guest,
      },
      points: 0,
      games: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalDiff: 0,
      lastWin: null,
      lastMatch: null,
      orderKey: 0,
    };
    const playedOn = dateToIso(appearance.match.playedOn);
    current.points += score.points;
    current.games += 1;
    current.goalDiff += score.goalDiff;
    current.orderKey += orderPiece(score.points, score.goalDiff, appearance.match.playedOn, score.result === "win");
    if (score.result === "win") {
      current.wins += 1;
      if (!current.lastWin || playedOn > current.lastWin) current.lastWin = playedOn;
    } else if (score.result === "draw") current.draws += 1;
    else current.losses += 1;
    if (!current.lastMatch || playedOn > current.lastMatch) current.lastMatch = playedOn;
    rows.set(appearance.playerId, current);
  }

  const ordered = [...rows.values()].sort(
    (a, b) => b.orderKey - a.orderKey || a.player.name.localeCompare(b.player.name, "pt-BR"),
  );

  return {
    season,
    rows: ordered.map((row, index) => {
      const shooting = goals.get(row.player.id) ?? { goals: 0, assists: 0 };
      return {
        position: index + 1,
        ...row,
        goals: shooting.goals,
        assists: shooting.assists,
        utilization: row.games ? row.points / (row.games * 3) : 0,
      };
    }),
  };
}

export async function scorersFor(seasonId: string) {
  const season = await prisma.season.findUniqueOrThrow({ where: { id: seasonId } });
  const events = await prisma.matchEvent.findMany({
    where: { match: { seasonId, scheduled: false } },
    include: { player: true },
  });
  const rows = new Map<string, { player: { id: string; name: string; guest: boolean }; goals: number; assists: number }>();
  let ownGoals = 0;
  for (const event of events) {
    if (event.type === "own_goal" || !event.player || !isRankingPlayer(event.player.name)) {
      if (event.type === "own_goal" || event.type === "goal") ownGoals += event.count;
      continue;
    }
    const current = rows.get(event.playerId!) ?? {
      player: { id: event.player.id, name: event.player.name, guest: event.player.guest },
      goals: 0,
      assists: 0,
    };
    if (event.type === "goal") current.goals += event.count;
    if (event.type === "assist") current.assists += event.count;
    rows.set(event.playerId!, current);
  }
  const ordered = [...rows.values()]
    .filter((row) => row.goals > 0 || row.assists > 0)
    .sort((a, b) => b.goals - a.goals || b.assists - a.assists || a.player.name.localeCompare(b.player.name, "pt-BR"));
  return {
    season,
    ownGoals,
    rows: ordered.map((row, index) => ({
      position: index + 1,
      ...row,
      participations: row.goals + row.assists,
    })),
  };
}

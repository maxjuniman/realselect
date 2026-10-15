import type { FastifyInstance } from "fastify";
import { addDays, dateToIso } from "../lib/dates.js";
import { matchInclude, presentMatch } from "../lib/matches.js";
import { prisma } from "../lib/prisma.js";
import { isRankingPlayer, playerScore } from "../lib/results.js";
import { getSeason, scorersFor, standingsFor } from "../lib/standings.js";

export async function publicRoutes(app: FastifyInstance) {
  app.get("/health", async () => ({ ok: true, service: "realselect-api" }));

  app.get("/seasons", async () => {
    const seasons = await prisma.season.findMany({ orderBy: [{ year: "desc" }, { half: "desc" }] });
    return seasons;
  });

  app.get("/players", async () => {
    const players = await prisma.player.findMany({
      where: { name: { not: "Gol contra" } },
      orderBy: { name: "asc" },
      select: { id: true, name: true, active: true, guest: true },
    });
    return players;
  });

  app.get<{ Querystring: { season?: string } }>("/standings", async (request, reply) => {
    const season = await getSeason(request.query.season);
    if (!season) return reply.code(404).send({ message: "Nenhuma temporada cadastrada." });
    return standingsFor(season.id);
  });

  app.get<{ Querystring: { season?: string } }>("/scorers", async (request, reply) => {
    const season = await getSeason(request.query.season);
    if (!season) return reply.code(404).send({ message: "Nenhuma temporada cadastrada." });
    return scorersFor(season.id);
  });

  app.get<{ Querystring: { season?: string } }>("/matches", async (request) => {
    const season = request.query.season
      ? await prisma.season.findUnique({ where: { code: request.query.season } })
      : null;
    const matches = await prisma.match.findMany({
      where: season ? { seasonId: season.id } : undefined,
      include: matchInclude,
      orderBy: { playedOn: "desc" },
    });
    return matches.map(presentMatch);
  });

  app.get<{ Params: { id: string } }>("/matches/:id", async (request, reply) => {
    const match = await prisma.match.findUnique({
      where: { id: request.params.id },
      include: matchInclude,
    });
    if (!match) return reply.code(404).send({ message: "Jogo não encontrado." });
    return presentMatch(match);
  });

  app.get<{ Params: { id: string }; Querystring: { season?: string } }>("/players/:id", async (request, reply) => {
    const player = await prisma.player.findUnique({ where: { id: request.params.id } });
    if (!player || !isRankingPlayer(player.name)) {
      return reply.code(404).send({ message: "Jogador não encontrado." });
    }
    const appearances = await prisma.matchAppearance.findMany({
      where: { playerId: player.id },
      include: {
        match: { include: { season: true, events: { where: { playerId: player.id } } } },
      },
      orderBy: { match: { playedOn: "desc" } },
    });

    const seasonIds = [...new Set(appearances.map((item) => item.match.seasonId))];
    const tables = await Promise.all(seasonIds.map((id) => standingsFor(id)));
    const bySeason = new Map(tables.map((table) => [table.season.id, table]));

    return {
      player: { id: player.id, name: player.name, guest: player.guest, active: player.active },
      seasons: tables
        .map((table) => {
          const row = table.rows.find((item) => item.player.id === player.id);
          if (!row) return null;
          return {
            ...row,
            season: { code: table.season.code, name: table.season.name, year: table.season.year, half: table.season.half },
          };
        })
        .filter((row): row is NonNullable<typeof row> => Boolean(row))
        .sort((a, b) => b.season.year - a.season.year || b.season.half - a.season.half),
      matches: appearances.map((item) => {
        const score = playerScore(item.team as "A" | "B", item.match.goalDiffA);
        const goals = item.match.events.filter((event) => event.type === "goal").reduce((sum, event) => sum + event.count, 0);
        const assists = item.match.events.filter((event) => event.type === "assist").reduce((sum, event) => sum + event.count, 0);
        const table = bySeason.get(item.match.seasonId);
        return {
          id: item.match.id,
          playedOn: dateToIso(item.match.playedOn),
          season: { code: item.match.season.code, name: item.match.season.name },
          team: item.team,
          result: score.result,
          points: score.points,
          goalDiff: score.goalDiff,
          scoreA: item.match.scoreA,
          scoreB: item.match.scoreB,
          goalDiffA: item.match.goalDiffA,
          goals,
          assists,
          position: table?.rows.find((row) => row.player.id === player.id)?.position ?? null,
        };
      }),
    };
  });

  app.get<{ Querystring: { scope?: string } }>("/attendance", async (request) => {
    const scope = request.query.scope === "year" ? "year" : "last10";
    const matches = await prisma.match.findMany({
      orderBy: { playedOn: "desc" },
      include: { appearances: { include: { player: true } } },
    });
    const latest = matches[0] ? dateToIso(matches[0].playedOn) : null;
    const selected =
      scope === "last10"
        ? matches.slice(0, 10)
        : matches.filter((match) => latest && dateToIso(match.playedOn) >= addDays(latest, -365));

    const rows = new Map<string, { player: { id: string; name: string; guest: boolean }; games: number; lastMatch: string }>();
    for (const match of selected) {
      const playedOn = dateToIso(match.playedOn);
      for (const appearance of match.appearances) {
        if (!isRankingPlayer(appearance.player.name)) continue;
        const current = rows.get(appearance.playerId) ?? {
          player: { id: appearance.player.id, name: appearance.player.name, guest: appearance.player.guest },
          games: 0,
          lastMatch: playedOn,
        };
        current.games += 1;
        if (playedOn > current.lastMatch) current.lastMatch = playedOn;
        rows.set(appearance.playerId, current);
      }
    }

    const ordered = [...rows.values()].sort(
      (a, b) => b.games - a.games || a.player.name.localeCompare(b.player.name, "pt-BR"),
    );
    const dates = selected.map((match) => dateToIso(match.playedOn)).sort();
    return {
      scope,
      label: scope === "last10" ? "Últimos 10 jogos" : "Últimos 12 meses",
      matchCount: selected.length,
      from: dates[0] ?? null,
      to: dates.at(-1) ?? null,
      rows: ordered,
    };
  });
}

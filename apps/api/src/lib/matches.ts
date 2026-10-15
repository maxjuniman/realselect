import type { Match, Player, Season } from "@prisma/client";
import { z } from "zod";
import { dateToIso, isoToDate, seasonFromCode } from "./dates.js";
import { prisma } from "./prisma.js";
import { playerScore, scoreLine } from "./results.js";

const appearanceSchema = z.object({
  playerId: z.string().min(1),
  team: z.enum(["A", "B"]),
});

const eventSchema = z.object({
  playerId: z.string().min(1).nullable().optional(),
  type: z.enum(["goal", "assist", "own_goal"]),
  count: z.number().int().positive().max(30),
});

export const matchInputSchema = z.object({
  playedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  seasonCode: z.string().min(4).max(20),
  scoreA: z.number().int().min(0).max(99).nullable().optional(),
  scoreB: z.number().int().min(0).max(99).nullable().optional(),
  goalDiffA: z.number().int().min(-99).max(99).optional(),
  professorId: z.string().min(1).nullable().optional(),
  appearances: z.array(appearanceSchema).min(2),
  events: z.array(eventSchema).default([]),
});

export type MatchInput = z.infer<typeof matchInputSchema>;

type SaveFailure = { ok: false; error: string; status: 400 | 409 };
type SaveSuccess = { ok: true; match: { id: string } };

export function validateLineups(input: MatchInput) {
  const seen = new Set<string>();
  let teamA = 0;
  let teamB = 0;
  for (const appearance of input.appearances) {
    if (seen.has(appearance.playerId)) {
      return "Cada jogador só pode estar em um time.";
    }
    seen.add(appearance.playerId);
    if (appearance.team === "A") teamA += 1;
    else teamB += 1;
  }
  if (!teamA || !teamB) return "Os dois times precisam ter pelo menos um jogador.";
  for (const event of input.events) {
    if (event.type === "own_goal") continue;
    if (!event.playerId || !seen.has(event.playerId)) {
      return "Gols e assistências precisam ser de quem jogou.";
    }
  }
  return null;
}

export async function saveMatch(input: MatchInput, matchId?: string): Promise<SaveFailure | SaveSuccess> {
  const lineupError = validateLineups(input);
  if (lineupError) return { ok: false, error: lineupError, status: 400 };

  const meta = seasonFromCode(input.seasonCode);
  const season = await prisma.season.upsert({
    where: { code: meta.code },
    update: {},
    create: meta,
  });

  const playedOn = isoToDate(input.playedOn);
  const duplicate = await prisma.match.findUnique({
    where: { seasonId_playedOn: { seasonId: season.id, playedOn } },
  });
  if (duplicate && duplicate.id !== matchId) {
    return { ok: false, error: "Já existe jogo nessa data neste semestre.", status: 409 };
  }

  const playerIds = input.appearances.map((item) => item.playerId);
  const players = await prisma.player.findMany({ where: { id: { in: playerIds } } });
  if (players.length !== playerIds.length) {
    return { ok: false, error: "Um dos jogadores não foi encontrado.", status: 400 };
  }
  if (input.professorId) {
    const professor = await prisma.player.findUnique({ where: { id: input.professorId } });
    if (!professor) return { ok: false, error: "Professor não encontrado.", status: 400 };
  }

  const hasScore = typeof input.scoreA === "number" && typeof input.scoreB === "number";
  const goalDiffA = hasScore ? input.scoreA! - input.scoreB! : input.goalDiffA;
  if (typeof goalDiffA !== "number") {
    return { ok: false, error: "Informe o placar dos dois times.", status: 400 };
  }
  const data = {
    seasonId: season.id,
    playedOn,
    scoreA: hasScore ? input.scoreA! : null,
    scoreB: hasScore ? input.scoreB! : null,
    goalDiffA,
    scoreLabel: hasScore ? `${input.scoreA}x${input.scoreB}` : null,
    professorId: input.professorId || null,
    origin: "manual" as const,
  };

  const mergedEvents = new Map<string, { playerId: string | null; type: string; count: number }>();
  for (const event of input.events) {
    const playerId = event.type === "own_goal" ? null : event.playerId ?? null;
    const key = `${playerId ?? "own"}:${event.type}`;
    const current = mergedEvents.get(key) ?? { playerId, type: event.type, count: 0 };
    current.count += event.count;
    mergedEvents.set(key, current);
  }

  const match = await prisma.$transaction(async (tx) => {
    const saved = matchId
      ? await tx.match.update({ where: { id: matchId }, data })
      : await tx.match.create({ data });
    if (matchId) {
      await tx.matchAppearance.deleteMany({ where: { matchId } });
      await tx.matchEvent.deleteMany({ where: { matchId } });
    }
    await tx.matchAppearance.createMany({
      data: input.appearances.map((item) => ({
        matchId: saved.id,
        playerId: item.playerId,
        team: item.team,
      })),
    });
    if (mergedEvents.size) {
      await tx.matchEvent.createMany({
        data: [...mergedEvents.values()].map((event) => ({
          matchId: saved.id,
          playerId: event.playerId,
          type: event.type,
          count: event.count,
        })),
      });
    }
    return saved;
  });

  return { ok: true, match };
}

type MatchWithRelations = Match & {
  season: Season;
  professor: Player | null;
  appearances: { team: string; player: Player }[];
  events: { id: string; type: string; count: number; player: Player | null }[];
};

export function presentMatch(match: MatchWithRelations) {
  const byName = (a: { player: Player }, b: { player: Player }) =>
    a.player.name.localeCompare(b.player.name, "pt-BR");
  const teamA = match.appearances.filter((item) => item.team === "A").sort(byName);
  const teamB = match.appearances.filter((item) => item.team === "B").sort(byName);
  const lineup = (items: typeof teamA) =>
    items.map((item) => {
      const score = playerScore(item.team as "A" | "B", match.goalDiffA);
      const goals = match.events
        .filter((event) => event.player?.id === item.player.id && event.type === "goal")
        .reduce((sum, event) => sum + event.count, 0);
      const assists = match.events
        .filter((event) => event.player?.id === item.player.id && event.type === "assist")
        .reduce((sum, event) => sum + event.count, 0);
      return {
        id: item.player.id,
        name: item.player.name,
        guest: item.player.guest,
        result: score.result,
        points: score.points,
        goalDiff: score.goalDiff,
        goals,
        assists,
      };
    });

  return {
    id: match.id,
    playedOn: dateToIso(match.playedOn),
    season: { id: match.season.id, code: match.season.code, name: match.season.name },
    scoreA: match.scoreA,
    scoreB: match.scoreB,
    goalDiffA: match.goalDiffA,
    scoreLabel: scoreLine(match.scoreA, match.scoreB, match.goalDiffA),
    origin: match.origin,
    professor: match.professor ? { id: match.professor.id, name: match.professor.name } : null,
    ownGoals: match.events.filter((event) => event.type === "own_goal").reduce((sum, event) => sum + event.count, 0),
    teamA: lineup(teamA),
    teamB: lineup(teamB),
  };
}

export const matchInclude = {
  season: true,
  professor: true,
  appearances: { include: { player: true } },
  events: { include: { player: true } },
} as const;

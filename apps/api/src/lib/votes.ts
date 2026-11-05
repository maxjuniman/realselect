import { dateToIso, isoToDate } from "./dates.js";
import { prisma } from "./prisma.js";
import { isStandingPlayer } from "./results.js";

export const AWARDS_FROM = "2026-10-27";

type Viewer = { role: "player"; playerId: string } | { role: "admin" } | null;

const voteInclude = {
  voter: { select: { id: true, name: true } },
  craque: { select: { id: true, name: true } },
  pereba: { select: { id: true, name: true } },
} as const;

export function voteOpen(match: { playedOn: Date; scheduled: boolean }) {
  return !match.scheduled && dateToIso(match.playedOn) >= AWARDS_FROM;
}

function tally(votes: { id: string; name: string }[]) {
  const rows = new Map<string, { id: string; name: string; votes: number }>();
  for (const person of votes) {
    const row = rows.get(person.id) ?? { id: person.id, name: person.name, votes: 0 };
    row.votes += 1;
    rows.set(person.id, row);
  }
  return [...rows.values()].sort((left, right) => right.votes - left.votes || left.name.localeCompare(right.name, "pt-BR"));
}

export async function awardsFor(matchId: string, viewer: Viewer) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: { votes: { include: voteInclude } },
  });
  if (!match) return null;
  const open = voteOpen(match);
  const mine = viewer?.role === "player" ? match.votes.find((vote) => vote.voterId === viewer.playerId) : undefined;
  const revealed = viewer?.role === "admin" || Boolean(mine);
  return {
    open,
    role: viewer?.role ?? "guest",
    selfId: viewer?.role === "player" ? viewer.playerId : null,
    mine: mine ? { craqueId: mine.craqueId, craque: mine.craque.name, perebaId: mine.perebaId, pereba: mine.pereba.name } : null,
    tally: revealed
      ? {
          craque: tally(match.votes.map((vote) => vote.craque)),
          pereba: tally(match.votes.map((vote) => vote.pereba)),
        }
      : { craque: [], pereba: [] },
    ballots:
      viewer?.role === "admin"
        ? [...match.votes]
            .sort((left, right) => left.voter.name.localeCompare(right.voter.name, "pt-BR"))
            .map((vote) => ({
              voterId: vote.voter.id,
              voter: vote.voter.name,
              craqueId: vote.craque.id,
              craque: vote.craque.name,
              perebaId: vote.pereba.id,
              pereba: vote.pereba.name,
            }))
        : null,
  };
}

function top(rows: { id: string; name: string; votes: number }[]) {
  if (!rows.length) return [];
  const best = rows[0].votes;
  return rows.filter((row) => row.votes === best).map(({ id, name, votes }) => ({ id, name, votes }));
}

function ballotsOf(votes: { voter: { id: string; name: string }; craque: { id: string; name: string }; pereba: { id: string; name: string } }[]) {
  return [...votes]
    .sort((left, right) => left.voter.name.localeCompare(right.voter.name, "pt-BR"))
    .map((vote) => ({
      voterId: vote.voter.id,
      voter: vote.voter.name,
      craqueId: vote.craque.id,
      craque: vote.craque.name,
      perebaId: vote.pereba.id,
      pereba: vote.pereba.name,
    }));
}

export async function seasonAwards(seasonCode: string) {
  const season = await prisma.season.findUnique({ where: { code: seasonCode } });
  if (!season) return null;
  const matches = await prisma.match.findMany({
    where: { seasonId: season.id, scheduled: false, playedOn: { gte: isoToDate(AWARDS_FROM) } },
    include: { votes: { include: voteInclude } },
    orderBy: { playedOn: "desc" },
  });
  const games = matches.map((match) => {
    const craque = tally(match.votes.map((vote) => vote.craque));
    const pereba = tally(match.votes.map((vote) => vote.pereba));
    return {
      id: match.id,
      playedOn: dateToIso(match.playedOn),
      craque: top(craque),
      pereba: top(pereba),
      ballots: ballotsOf(match.votes),
    };
  });
  const craqueVotes = matches.flatMap((match) => match.votes.map((vote) => vote.craque));
  const perebaVotes = matches.flatMap((match) => match.votes.map((vote) => vote.pereba));
  return {
    season: { code: season.code, name: season.name },
    craque: top(tally(craqueVotes)),
    pereba: top(tally(perebaVotes)),
    matches: games,
  };
}

export async function saveVote(matchId: string, voterId: string, craqueId: string, perebaId: string) {
  if (craqueId === voterId || perebaId === voterId) {
    return { ok: false as const, status: 400, error: "Você não pode votar em si mesmo." };
  }
  if (craqueId === perebaId) {
    return { ok: false as const, status: 400, error: "O craque e a pereba precisam ser pessoas diferentes." };
  }
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: { appearances: { include: { player: true } } },
  });
  if (!match) return { ok: false as const, status: 404, error: "Jogo não encontrado." };
  if (!voteOpen(match)) return { ok: false as const, status: 400, error: "Esse jogo não está aberto para voto." };
  const existing = await prisma.matchVote.findUnique({ where: { matchId_voterId: { matchId, voterId } } });
  if (existing) return { ok: false as const, status: 409, error: "O voto não pode ser alterado." };
  const allowed = new Set(match.appearances.filter((item) => isStandingPlayer(item.player.name)).map((item) => item.playerId));
  if (!allowed.has(craqueId) || !allowed.has(perebaId)) {
    return { ok: false as const, status: 400, error: "Escolha alguém que jogou." };
  }
  await prisma.matchVote.create({ data: { matchId, voterId, craqueId, perebaId } });
  return { ok: true as const };
}

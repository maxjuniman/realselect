import { dateToIso } from "./dates.js";
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
  return {
    open,
    role: viewer?.role ?? "guest",
    mine: mine ? { craqueId: mine.craqueId, craque: mine.craque.name, perebaId: mine.perebaId, pereba: mine.pereba.name } : null,
    tally: {
      craque: tally(match.votes.map((vote) => vote.craque)),
      pereba: tally(match.votes.map((vote) => vote.pereba)),
    },
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

export async function saveVote(matchId: string, voterId: string, craqueId: string, perebaId: string) {
  if (craqueId === perebaId) {
    return { ok: false as const, status: 400, error: "O craque e a pereba precisam ser pessoas diferentes." };
  }
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: { appearances: { include: { player: true } } },
  });
  if (!match) return { ok: false as const, status: 404, error: "Jogo não encontrado." };
  if (!voteOpen(match)) return { ok: false as const, status: 400, error: "Esse jogo não está aberto para voto." };
  const allowed = new Set(match.appearances.filter((item) => isStandingPlayer(item.player.name)).map((item) => item.playerId));
  if (!allowed.has(craqueId) || !allowed.has(perebaId)) {
    return { ok: false as const, status: 400, error: "Escolha alguém que jogou." };
  }
  await prisma.matchVote.upsert({
    where: { matchId_voterId: { matchId, voterId } },
    create: { matchId, voterId, craqueId, perebaId },
    update: { craqueId, perebaId },
  });
  return { ok: true as const };
}

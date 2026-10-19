import { dateToIso, isoToDate } from "./dates.js";
import { prisma } from "./prisma.js";

export const DEFAULT_PROFESSOR_ORDER = [
  "Dioury",
  "Henrique",
  "Edy",
  "Rafael",
  "Marcelo",
  "Mateus Schmitz",
  "Dinho",
  "Robson",
  "Cristiano",
  "Max",
  "Marciano",
  "Everton",
  "Avila",
  "Iury",
  "Bruno",
  "Leomar",
];

type Named = { id: string; name: string };

function fold(name: string) {
  return name.trim().toLocaleLowerCase("pt-BR");
}

function findByLabel(players: Named[], label: string, used: Set<string>) {
  const folded = fold(label);
  const available = players.filter((player) => !used.has(player.id));
  const exact = available.find((player) => fold(player.name) === folded);
  if (exact) return exact;
  const prefixed = available.filter((player) => fold(player.name).startsWith(`${folded} `));
  return prefixed.length === 1 ? prefixed[0] : undefined;
}

async function mensalistas() {
  return prisma.player.findMany({
    where: { active: true, squad: "mensalista", guest: false, NOT: { name: "Gol contra" } },
    select: { id: true, name: true, positions: true },
    orderBy: { name: "asc" },
  });
}

async function writeOrder(playerIds: string[]) {
  await prisma.$transaction([
    prisma.professorTurn.deleteMany(),
    prisma.professorTurn.createMany({ data: playerIds.map((playerId, sort) => ({ playerId, sort })) }),
  ]);
}

export async function ensureProfessorOrder() {
  const players = await mensalistas();
  const turns = await prisma.professorTurn.findMany({ orderBy: { sort: "asc" } });
  if (!turns.length) {
    const used = new Set<string>();
    const seeded: string[] = [];
    for (const label of DEFAULT_PROFESSOR_ORDER) {
      const match = findByLabel(players, label, used);
      if (!match) continue;
      seeded.push(match.id);
      used.add(match.id);
    }
    const rest = players.filter((player) => !used.has(player.id)).map((player) => player.id);
    if (seeded.length || rest.length) await writeOrder([...seeded, ...rest]);
    return;
  }

  const allowed = new Set(players.map((player) => player.id));
  const kept = turns.map((turn) => turn.playerId).filter((id) => allowed.has(id));
  const have = new Set(kept);
  const missing = players.filter((player) => !have.has(player.id)).map((player) => player.id);
  const next = [...kept, ...missing];
  const same = next.length === turns.length && next.every((id, index) => turns[index]?.playerId === id);
  if (!same) await writeOrder(next);
}

export async function professorRoster() {
  await ensureProfessorOrder();
  const turns = await prisma.professorTurn.findMany({
    orderBy: { sort: "asc" },
    include: { player: { select: { id: true, name: true, positions: true, injured: true } } },
  });
  const absences = await prisma.gameAbsence.findMany({ orderBy: { playedOn: "asc" } });
  const plans = await prisma.professorPlan.findMany({ orderBy: { playedOn: "asc" } });
  return {
    order: turns.map((turn) => turn.player),
    absences: absences.map((absence) => ({ playedOn: dateToIso(absence.playedOn), playerId: absence.playerId })),
    plans: plans.map((plan) => ({ playedOn: dateToIso(plan.playedOn), playerId: plan.playerId, cancelled: plan.cancelled })),
  };
}

export async function saveProfessorPlans(slots: { playedOn: string; playerId: string; cancelled?: boolean }[]) {
  const players = await mensalistas();
  const allowed = new Set(players.map((player) => player.id));
  if (slots.some((slot) => !allowed.has(slot.playerId))) return { ok: false as const, error: "O professor precisa ser mensalista." };
  const uniqueDates = new Set(slots.map((slot) => slot.playedOn));
  if (uniqueDates.size !== slots.length) return { ok: false as const, error: "Cada terça só pode ter um professor." };
  await prisma.$transaction([
    prisma.professorPlan.deleteMany(),
    prisma.professorPlan.createMany({
      data: slots.map((slot) => ({ playedOn: isoToDate(slot.playedOn), playerId: slot.playerId, cancelled: Boolean(slot.cancelled) })),
    }),
  ]);
  return { ok: true as const };
}

export async function saveProfessorOrder(playerIds: string[]) {
  const players = await mensalistas();
  const allowed = new Set(players.map((player) => player.id));
  if (playerIds.some((id) => !allowed.has(id))) return { ok: false as const, error: "A ordem aceita só mensalistas." };
  const unique = [...new Set(playerIds)];
  const have = new Set(unique);
  const missing = players.filter((player) => !have.has(player.id)).map((player) => player.id);
  await writeOrder([...unique, ...missing]);
  return { ok: true as const };
}

export async function saveAbsences(playedOn: string, playerIds: string[]) {
  const date = isoToDate(playedOn);
  const unique = [...new Set(playerIds)];
  const known = await prisma.player.findMany({ where: { id: { in: unique } }, select: { id: true } });
  if (known.length !== unique.length) return { ok: false as const, error: "Jogador não encontrado." };
  await prisma.$transaction([
    prisma.gameAbsence.deleteMany({ where: { playedOn: date } }),
    prisma.gameAbsence.createMany({ data: unique.map((playerId) => ({ playedOn: date, playerId })) }),
  ]);
  return { ok: true as const };
}

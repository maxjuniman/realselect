import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { login, requireUser } from "../lib/auth.js";
import { seasonFromCode } from "../lib/dates.js";
import { matchInclude, matchInputSchema, presentMatch, saveMatch } from "../lib/matches.js";
import { prisma } from "../lib/prisma.js";
import { professorRoster, saveAbsences, saveProfessorOrder, saveProfessorPlans } from "../lib/professors.js";
import { POSITIONS, SQUADS, cleanPositions } from "../lib/roster.js";

const playerSchema = z.object({
  name: z.string().trim().min(2).max(60),
  active: z.boolean().optional(),
  guest: z.boolean().optional(),
  squad: z.enum(SQUADS).optional(),
  injured: z.boolean().optional(),
  positions: z.array(z.enum(POSITIONS)).max(2).optional(),
});

async function sameName(name: string, ignoreId?: string) {
  const players = await prisma.player.findMany({ select: { id: true, name: true } });
  const folded = name.trim().toLocaleLowerCase("pt-BR");
  return players.find((player) => player.id !== ignoreId && player.name.toLocaleLowerCase("pt-BR") === folded);
}

export async function adminRoutes(app: FastifyInstance) {
  app.post("/auth/login", async (request, reply) => {
    const body = z.object({ email: z.string().email(), password: z.string().min(4) }).safeParse(request.body);
    if (!body.success) return reply.code(400).send({ message: "Informe e-mail e senha." });
    const session = await login(body.data.email, body.data.password);
    if (!session) return reply.code(401).send({ message: "E-mail ou senha incorretos." });
    return session;
  });

  app.get("/auth/me", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return;
    return { id: user.id, name: user.name, email: user.email };
  });

  app.post("/admin/players", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return;
    const body = playerSchema.safeParse(request.body);
    if (!body.success) return reply.code(400).send({ message: "Confira o nome, o grupo e as posições." });
    if (await sameName(body.data.name)) return reply.code(409).send({ message: "Já existe um jogador com esse nome." });
    const squad = body.data.squad ?? "mensalista";
    const player = await prisma.player.create({
      data: {
        name: body.data.name.trim(),
        active: body.data.active ?? true,
        squad,
        guest: body.data.guest ?? squad === "suplente",
        positions: cleanPositions(body.data.positions ?? []),
      },
    });
    return player;
  });

  app.patch<{ Params: { id: string } }>("/admin/players/:id", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return;
    const body = playerSchema.partial().safeParse(request.body);
    if (!body.success) return reply.code(400).send({ message: "Dados inválidos." });
    if (body.data.name && (await sameName(body.data.name, request.params.id))) {
      return reply.code(409).send({ message: "Já existe um jogador com esse nome." });
    }
    const current = await prisma.player.findUnique({ where: { id: request.params.id } });
    if (!current) return reply.code(404).send({ message: "Jogador não encontrado." });
    const squad = body.data.squad ?? current.squad;
    const active = body.data.active ?? current.active;
    const mensalista = active && squad === "mensalista" && !current.guest && (body.data.guest ?? current.guest) !== true;
    const injured = mensalista ? (body.data.injured ?? current.injured) : false;
    if (body.data.injured === true && !mensalista) {
      return reply.code(400).send({ message: "Só mensalista pode ficar machucado." });
    }
    try {
      return await prisma.player.update({
        where: { id: request.params.id },
        data: {
          name: body.data.name?.trim(),
          active: body.data.active,
          squad: body.data.squad,
          guest: body.data.squad ? body.data.squad === "suplente" : body.data.guest,
          injured,
          positions: body.data.positions ? cleanPositions(body.data.positions) : undefined,
        },
      });
    } catch {
      return reply.code(404).send({ message: "Jogador não encontrado." });
    }
  });

  app.post("/admin/matches", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return;
    const body = matchInputSchema.safeParse(request.body);
    if (!body.success) return reply.code(400).send({ message: "Confira data, placar e escalação." });
    const saved = await saveMatch(body.data);
    if (!saved.ok) return reply.code(saved.status).send({ message: saved.error });
    const match = await prisma.match.findUniqueOrThrow({ where: { id: saved.match.id }, include: matchInclude });
    return presentMatch(match);
  });

  app.patch<{ Params: { id: string } }>("/admin/matches/:id", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return;
    const existing = await prisma.match.findUnique({ where: { id: request.params.id } });
    if (!existing) return reply.code(404).send({ message: "Jogo não encontrado." });
    const body = matchInputSchema.safeParse(request.body);
    if (!body.success) return reply.code(400).send({ message: "Confira data, placar e escalação." });
    const saved = await saveMatch(body.data, existing.id);
    if (!saved.ok) return reply.code(saved.status).send({ message: saved.error });
    const match = await prisma.match.findUniqueOrThrow({ where: { id: saved.match.id }, include: matchInclude });
    return presentMatch(match);
  });

  app.delete<{ Params: { id: string } }>("/admin/matches/:id", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return;
    try {
      await prisma.match.delete({ where: { id: request.params.id } });
      return { ok: true };
    } catch {
      return reply.code(404).send({ message: "Jogo não encontrado." });
    }
  });

  app.post("/admin/seasons", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return;
    const body = z.object({ code: z.string().min(4).max(20), current: z.boolean().optional() }).safeParse(request.body);
    if (!body.success) return reply.code(400).send({ message: "Informe o código da temporada." });
    const meta = seasonFromCode(body.data.code);
    const season = await prisma.season.upsert({
      where: { code: meta.code },
      update: {},
      create: meta,
    });
    if (body.data.current) {
      await prisma.season.updateMany({ data: { isCurrent: false } });
      return prisma.season.update({ where: { id: season.id }, data: { isCurrent: true } });
    }
    return season;
  });

  app.get("/admin/professors", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return;
    return professorRoster();
  });

  app.put("/admin/professors", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return;
    const body = z.object({ playerIds: z.array(z.string().min(1)).max(80) }).safeParse(request.body);
    if (!body.success) return reply.code(400).send({ message: "Informe a ordem dos mensalistas." });
    const saved = await saveProfessorOrder(body.data.playerIds);
    if (!saved.ok) return reply.code(400).send({ message: saved.error });
    return professorRoster();
  });

  app.put("/admin/professor-plans", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return;
    const body = z
      .object({
        slots: z
          .array(z.object({ playedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), playerId: z.string().min(1), cancelled: z.boolean().optional() }))
          .max(60),
      })
      .safeParse(request.body);
    if (!body.success) return reply.code(400).send({ message: "Informe as terças e os professores." });
    const saved = await saveProfessorPlans(body.data.slots);
    if (!saved.ok) return reply.code(400).send({ message: saved.error });
    return professorRoster();
  });

  app.put("/admin/absences", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return;
    const body = z
      .object({
        playedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        playerIds: z.array(z.string().min(1)).max(80),
      })
      .safeParse(request.body);
    if (!body.success) return reply.code(400).send({ message: "Informe a data e quem falta." });
    const saved = await saveAbsences(body.data.playedOn, body.data.playerIds);
    if (!saved.ok) return reply.code(400).send({ message: saved.error });
    return professorRoster();
  });

  app.patch<{ Params: { id: string } }>("/admin/seasons/:id", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return;
    const body = z.object({ current: z.boolean() }).safeParse(request.body);
    if (!body.success) return reply.code(400).send({ message: "Dados inválidos." });
    const season = await prisma.season.findUnique({ where: { id: request.params.id } });
    if (!season) return reply.code(404).send({ message: "Temporada não encontrada." });
    if (body.data.current) await prisma.season.updateMany({ data: { isCurrent: false } });
    return prisma.season.update({ where: { id: season.id }, data: { isCurrent: body.data.current } });
  });
}

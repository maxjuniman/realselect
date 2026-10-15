import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { login, requireUser } from "../lib/auth.js";
import { seasonFromCode } from "../lib/dates.js";
import { matchInclude, matchInputSchema, presentMatch, saveMatch } from "../lib/matches.js";
import { prisma } from "../lib/prisma.js";

const playerSchema = z.object({
  name: z.string().trim().min(2).max(60),
  active: z.boolean().optional(),
  guest: z.boolean().optional(),
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
    if (!body.success) return reply.code(400).send({ message: "Nome inválido." });
    if (await sameName(body.data.name)) return reply.code(409).send({ message: "Já existe um jogador com esse nome." });
    const player = await prisma.player.create({
      data: {
        name: body.data.name.trim(),
        active: body.data.active ?? true,
        guest: body.data.guest ?? false,
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
    try {
      return await prisma.player.update({
        where: { id: request.params.id },
        data: {
          name: body.data.name?.trim(),
          active: body.data.active,
          guest: body.data.guest,
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

import type { FastifyInstance } from "fastify";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { createUser, hashPassword, login, loginPlayer, requireSession, requireUser } from "../lib/auth.js";
import { dateToIso, isoToDate, seasonFromCode } from "../lib/dates.js";
import { matchInclude, matchInputSchema, presentMatch, saveMatch } from "../lib/matches.js";
import { removePhoto, savePhoto } from "../lib/photos.js";
import { prisma } from "../lib/prisma.js";
import { professorRoster, saveAbsences, saveProfessorOrder, saveProfessorPlans } from "../lib/professors.js";
import { sendTelegramText } from "../lib/telegram-lista.js";
import { POSITIONS, SQUADS, cleanPositions } from "../lib/roster.js";

const photoField = z.string().max(1_800_000).nullable().optional();
const birthField = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional();

const playerSchema = z.object({
  name: z.string().trim().min(2).max(60),
  nickname: z.string().trim().max(40).nullable().optional(),
  birthDate: birthField,
  photo: photoField,
  active: z.boolean().optional(),
  guest: z.boolean().optional(),
  squad: z.enum(SQUADS).optional(),
  injured: z.boolean().optional(),
  positions: z.array(z.enum(POSITIONS)).max(2).optional(),
});

const profileSchema = z.object({
  name: z.string().trim().min(2).max(60),
  nickname: z.string().trim().max(40).nullable().optional(),
  birthDate: birthField,
  photo: photoField,
  positions: z.array(z.enum(POSITIONS)).max(2).optional(),
  password: z.string().min(4).max(60).optional(),
});

function presentPlayer<T extends { passwordHash?: string | null; birthDate?: Date | null }>(player: T) {
  const { passwordHash, ...rest } = player;
  return {
    ...rest,
    birthDate: rest.birthDate instanceof Date ? dateToIso(rest.birthDate) : (rest.birthDate ?? null),
    hasPassword: Boolean(passwordHash),
  };
}

async function nextPhoto(playerId: string, current: string | null, incoming: string | null | undefined) {
  if (incoming === undefined) return undefined;
  if (!incoming) {
    await removePhoto(current);
    return null;
  }
  if (incoming.startsWith("/uploads/")) return incoming;
  const saved = await savePhoto(incoming, playerId);
  await removePhoto(current);
  return saved;
}

async function sameName(name: string, ignoreId?: string) {
  const players = await prisma.player.findMany({ select: { id: true, name: true } });
  const folded = name.trim().toLocaleLowerCase("pt-BR");
  return players.find((player) => player.id !== ignoreId && player.name.toLocaleLowerCase("pt-BR") === folded);
}

export async function adminRoutes(app: FastifyInstance) {
  app.post("/auth/login", async (request, reply) => {
    const body = z
      .object({
        login: z.string().trim().min(2).max(80).optional(),
        email: z.string().trim().optional(),
        password: z.string().min(4),
      })
      .safeParse(request.body);
    const identity = (body.success ? body.data.login || body.data.email || "" : "").trim();
    if (!body.success || !identity) return reply.code(400).send({ message: "Informe o e-mail ou o nome, e a senha." });
    if (identity.includes("@")) {
      const session = await login(identity, body.data.password);
      if (!session) return reply.code(401).send({ message: "E-mail ou senha incorretos." });
      return session;
    }
    const session = await loginPlayer(identity, body.data.password);
    if ("error" in session) return reply.code(401).send({ message: session.error });
    return session;
  });

  app.post("/auth/register", async (request, reply) => {
    const body = z
      .object({
        name: z.string().trim().min(2).max(60),
        birthDate: birthField,
        password: z.string().min(4).max(60),
      })
      .safeParse(request.body);
    if (!body.success) return reply.code(400).send({ message: "Confira o nome, a data e a senha." });
    const wanted = body.data.name.trim().toLocaleLowerCase("pt-BR");
    const accounts = await prisma.playerAccount.findMany();
    const current = accounts.find((item) => item.name.trim().toLocaleLowerCase("pt-BR") === wanted);
    if (current?.access === "approved") return reply.code(409).send({ message: "Esse cadastro já foi aprovado. Entre com o nome e a senha." });
    const data = {
      name: body.data.name.trim(),
      birthDate: body.data.birthDate ? isoToDate(body.data.birthDate) : null,
      passwordHash: hashPassword(body.data.password),
      access: "pending",
      playerId: current?.access === "denied" ? null : current?.playerId,
    };
    if (current) await prisma.playerAccount.update({ where: { id: current.id }, data });
    else await prisma.playerAccount.create({ data });
    return { ok: true, message: "Cadastro enviado. Quando o organizador vincular e aprovar, entre com seu nome e a senha." };
  });

  app.post("/auth/player", async (request, reply) => {
    const body = z.object({ name: z.string().trim().min(2).max(60), password: z.string().min(4) }).safeParse(request.body);
    if (!body.success) return reply.code(400).send({ message: "Informe o nome e a senha." });
    const session = await loginPlayer(body.data.name, body.data.password);
    if ("error" in session) return reply.code(401).send({ message: session.error });
    return session;
  });

  app.get("/auth/me", async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    if (session.role === "player") return { role: "player", id: session.player.id, name: session.player.name };
    return { role: "admin", id: session.user.id, name: session.user.name, email: session.user.email };
  });

  app.patch("/me", { bodyLimit: 2_000_000 }, async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    if (session.role !== "player") return reply.code(403).send({ message: "Essa área é do organizador." });
    const body = profileSchema.safeParse(request.body);
    if (!body.success) return reply.code(400).send({ message: "Confira nome, data e posições." });
    if (await sameName(body.data.name, session.player.id)) return reply.code(409).send({ message: "Já existe um jogador com esse nome." });
    if (body.data.password && bcrypt.compareSync(body.data.password, session.account.passwordHash)) {
      return reply.code(400).send({ message: "Escolha uma senha diferente da atual." });
    }
    let photo: string | null | undefined;
    try {
      photo = await nextPhoto(session.player.id, session.player.photo, body.data.photo);
    } catch (error) {
      return reply.code(400).send({ message: error instanceof Error ? error.message : "Foto inválida." });
    }
    const player = await prisma.player.update({
      where: { id: session.player.id },
      data: {
        name: body.data.name.trim(),
        nickname: body.data.nickname?.trim() || null,
        birthDate: body.data.birthDate ? isoToDate(body.data.birthDate) : null,
        photo,
        positions: cleanPositions(body.data.positions ?? session.player.positions),
      },
    });
    if (body.data.password) {
      await prisma.playerAccount.update({ where: { id: session.account.id }, data: { passwordHash: hashPassword(body.data.password) } });
    }
    return presentPlayer(player);
  });

  app.post("/admin/players", { bodyLimit: 2_000_000 }, async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return;
    const body = playerSchema.safeParse(request.body);
    if (!body.success) return reply.code(400).send({ message: "Confira o nome, o grupo e as posições." });
    if (await sameName(body.data.name)) return reply.code(409).send({ message: "Já existe um jogador com esse nome." });
    const squad = body.data.squad ?? "mensalista";
    const player = await prisma.player.create({
      data: {
        name: body.data.name.trim(),
        nickname: body.data.nickname?.trim() || null,
        birthDate: body.data.birthDate ? isoToDate(body.data.birthDate) : null,
        active: body.data.active ?? true,
        squad,
        guest: body.data.guest ?? squad === "suplente",
        positions: cleanPositions(body.data.positions ?? []),
      },
    });
    let photo: string | null | undefined;
    try {
      photo = await nextPhoto(player.id, null, body.data.photo);
    } catch (error) {
      await prisma.player.delete({ where: { id: player.id } });
      return reply.code(400).send({ message: error instanceof Error ? error.message : "Foto inválida." });
    }
    const saved = photo === undefined ? player : await prisma.player.update({ where: { id: player.id }, data: { photo } });
    return presentPlayer(saved);
  });

  app.patch<{ Params: { id: string } }>("/admin/players/:id", { bodyLimit: 2_000_000 }, async (request, reply) => {
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
    let photo: string | null | undefined;
    try {
      photo = await nextPhoto(current.id, current.photo, body.data.photo);
    } catch (error) {
      return reply.code(400).send({ message: error instanceof Error ? error.message : "Foto inválida." });
    }
    try {
      const player = await prisma.player.update({
        where: { id: request.params.id },
        data: {
          name: body.data.name?.trim(),
          nickname: body.data.nickname === undefined ? undefined : body.data.nickname?.trim() || null,
          birthDate: body.data.birthDate === undefined ? undefined : body.data.birthDate ? isoToDate(body.data.birthDate) : null,
          photo,
          active: body.data.active,
          squad: body.data.squad,
          guest: body.data.squad ? body.data.squad === "suplente" : body.data.guest,
          injured,
          positions: body.data.positions ? cleanPositions(body.data.positions) : undefined,
        },
      });
      return presentPlayer(player);
    } catch {
      return reply.code(404).send({ message: "Jogador não encontrado." });
    }
  });

  app.get("/admin/player-access", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return;
    const rank = { pending: 0, approved: 1, denied: 2 };
    const accounts = await prisma.playerAccount.findMany({
      include: { player: { select: { id: true, name: true } } },
    });
    return accounts
      .map((account) => ({
        id: account.id,
        name: account.name,
        birthDate: account.birthDate ? dateToIso(account.birthDate) : null,
        access: account.access,
        player: account.player,
      }))
      .sort((left, right) => (rank[left.access as keyof typeof rank] ?? 9) - (rank[right.access as keyof typeof rank] ?? 9) || left.name.localeCompare(right.name, "pt-BR"));
  });

  app.post("/admin/player-access", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return;
    const body = z
      .object({
        accountId: z.string().min(1),
        playerId: z.string().min(1).nullable().optional(),
        access: z.enum(["approved", "denied"]),
      })
      .safeParse(request.body);
    if (!body.success) return reply.code(400).send({ message: "Informe o cadastro e a decisão." });
    const account = await prisma.playerAccount.findUnique({ where: { id: body.data.accountId } });
    if (!account) return reply.code(404).send({ message: "Cadastro não encontrado." });
    if (body.data.access === "denied") {
      await prisma.playerAccount.update({ where: { id: account.id }, data: { access: "denied", playerId: null } });
      return { ok: true };
    }
    if (!body.data.playerId) return reply.code(400).send({ message: "Escolha o jogador para vincular." });
    const player = await prisma.player.findUnique({ where: { id: body.data.playerId } });
    if (!player || player.name === "Gol contra") return reply.code(404).send({ message: "Jogador não encontrado." });
    const taken = await prisma.playerAccount.findUnique({ where: { playerId: player.id } });
    if (taken && taken.id !== account.id) return reply.code(409).send({ message: "Esse jogador já está vinculado a outro acesso." });
    await prisma.playerAccount.update({ where: { id: account.id }, data: { access: "approved", playerId: player.id } });
    if (!player.birthDate && account.birthDate) {
      await prisma.player.update({ where: { id: player.id }, data: { birthDate: account.birthDate } });
    }
    return { ok: true };
  });

  app.get("/admin/organizers", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return;
    return prisma.user.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, email: true } });
  });

  app.post("/admin/organizers", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return;
    const body = z
      .object({
        name: z.string().trim().min(2).max(60),
        email: z.string().trim().email(),
        password: z.string().min(4).max(60),
      })
      .safeParse(request.body);
    if (!body.success) return reply.code(400).send({ message: "Confira nome, e-mail e senha." });
    const email = body.data.email.toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return reply.code(409).send({ message: "Já existe um organizador com esse e-mail." });
    const created = await createUser(body.data.name, email, body.data.password);
    return { id: created.id, name: created.name, email: created.email };
  });

  app.patch<{ Params: { id: string } }>("/admin/organizers/:id", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return;
    const body = z
      .object({
        name: z.string().trim().min(2).max(60),
        email: z.string().trim().email(),
        password: z.string().min(4).max(60).optional(),
      })
      .safeParse(request.body);
    if (!body.success) return reply.code(400).send({ message: "Confira nome, e-mail e senha." });
    const current = await prisma.user.findUnique({ where: { id: request.params.id } });
    if (!current) return reply.code(404).send({ message: "Organizador não encontrado." });
    const email = body.data.email.toLowerCase();
    const taken = await prisma.user.findUnique({ where: { email } });
    if (taken && taken.id !== current.id) return reply.code(409).send({ message: "Já existe um organizador com esse e-mail." });
    const saved = await prisma.user.update({
      where: { id: current.id },
      data: {
        name: body.data.name.trim(),
        email,
        ...(body.data.password ? { passwordHash: hashPassword(body.data.password) } : {}),
      },
      select: { id: true, name: true, email: true },
    });
    return saved;
  });

  app.delete<{ Params: { id: string } }>("/admin/organizers/:id", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return;
    if (user.id === request.params.id) return reply.code(400).send({ message: "Você não pode remover o próprio acesso." });
    const total = await prisma.user.count();
    if (total <= 1) return reply.code(400).send({ message: "O painel precisa de pelo menos um organizador." });
    const current = await prisma.user.findUnique({ where: { id: request.params.id } });
    if (!current) return reply.code(404).send({ message: "Organizador não encontrado." });
    await prisma.user.delete({ where: { id: current.id } });
    return { ok: true };
  });

  app.patch<{ Params: { id: string } }>("/admin/player-access/:id", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return;
    const body = z
      .object({
        name: z.string().trim().min(2).max(60),
        birthDate: birthField,
        password: z.string().min(4).max(60).optional(),
        playerId: z.string().min(1).nullable().optional(),
      })
      .safeParse(request.body);
    if (!body.success) return reply.code(400).send({ message: "Confira o nome e o jogador vinculado." });
    const account = await prisma.playerAccount.findUnique({ where: { id: request.params.id } });
    if (!account) return reply.code(404).send({ message: "Cadastro não encontrado." });
    const wanted = body.data.name.trim().toLocaleLowerCase("pt-BR");
    const accounts = await prisma.playerAccount.findMany({ select: { id: true, name: true } });
    if (accounts.some((item) => item.id !== account.id && item.name.trim().toLocaleLowerCase("pt-BR") === wanted)) {
      return reply.code(409).send({ message: "Já existe um cadastro com esse nome." });
    }
    let playerId = account.playerId;
    if (body.data.playerId === null) {
      if (account.access === "approved") return reply.code(400).send({ message: "Escolha o jogador vinculado." });
      playerId = null;
    } else if (body.data.playerId) {
      const player = await prisma.player.findUnique({ where: { id: body.data.playerId } });
      if (!player || player.name === "Gol contra") return reply.code(404).send({ message: "Jogador não encontrado." });
      const taken = await prisma.playerAccount.findUnique({ where: { playerId: player.id } });
      if (taken && taken.id !== account.id) return reply.code(409).send({ message: "Esse jogador já está vinculado a outro acesso." });
      playerId = player.id;
      const birthDate = body.data.birthDate ? isoToDate(body.data.birthDate) : null;
      if (!player.birthDate && birthDate) {
        await prisma.player.update({ where: { id: player.id }, data: { birthDate } });
      }
    }
    const birthDate = body.data.birthDate ? isoToDate(body.data.birthDate) : null;
    await prisma.playerAccount.update({
      where: { id: account.id },
      data: {
        name: body.data.name.trim(),
        birthDate,
        playerId,
        ...(body.data.password ? { passwordHash: hashPassword(body.data.password) } : {}),
      },
    });
    return { ok: true };
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

  app.post("/admin/call-list", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return;
    const body = z.object({ text: z.string().trim().min(1).max(4096) }).safeParse(request.body);
    if (!body.success || !body.data.text.startsWith("Futibas TERÇA-FEIRA")) {
      return reply.code(400).send({ message: "A lista da terça não está pronta." });
    }
    try {
      await sendTelegramText(body.data.text);
      return { ok: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Não consegui enviar no Telegram.";
      return reply.code(502).send({ message });
    }
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

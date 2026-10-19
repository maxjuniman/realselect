import bcrypt from "bcryptjs";
import type { FastifyReply, FastifyRequest } from "fastify";
import jwt from "jsonwebtoken";
import { prisma } from "./prisma.js";

function secret() {
  return process.env.JWT_SECRET || "realselect-dev-secret";
}

export async function createUser(name: string, email: string, password: string) {
  const normalized = email.toLowerCase().trim();
  const passwordHash = bcrypt.hashSync(password, 10);
  return prisma.user.upsert({
    where: { email: normalized },
    update: { name, passwordHash },
    create: { name, email: normalized, passwordHash },
  });
}

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (!user || !bcrypt.compareSync(password, user.passwordHash)) return null;
  const token = jwt.sign({ sub: user.id, role: "admin", email: user.email }, secret(), { expiresIn: "30d" });
  return { token, user: { id: user.id, name: user.name, email: user.email } };
}

export async function loginPlayer(name: string, password: string) {
  const wanted = name.trim().toLocaleLowerCase("pt-BR");
  const players = await prisma.player.findMany({
    where: { active: true, squad: "mensalista", guest: false },
    select: { id: true, name: true, passwordHash: true, access: true },
  });
  const player = players.find((item) => item.name.trim().toLocaleLowerCase("pt-BR") === wanted && item.name !== "Gol contra");
  if (!player) return { error: "Nome não encontrado entre os mensalistas." };
  if (!player.passwordHash || player.access === "none") return { error: "Cadastre-se para pedir acesso." };
  if (!bcrypt.compareSync(password, player.passwordHash)) return { error: "Nome ou senha incorretos." };
  if (player.access === "pending") return { error: "Seu cadastro ainda espera a aprovação do organizador." };
  if (player.access !== "approved") return { error: "O organizador não liberou esse acesso." };
  const token = jwt.sign({ sub: player.id, role: "player" }, secret(), { expiresIn: "30d" });
  return { token, player: { id: player.id, name: player.name } };
}

export function hashPassword(password: string) {
  return bcrypt.hashSync(password, 10);
}

export async function requireUser(request: FastifyRequest, reply: FastifyReply) {
  const header = request.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    reply.code(401).send({ message: "Faça login para continuar." });
    return null;
  }
  try {
    const payload = jwt.verify(header.slice(7), secret()) as { sub: string; role?: string };
    if (payload.role === "player") {
      reply.code(403).send({ message: "Essa área é do organizador." });
      return null;
    }
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) {
      reply.code(401).send({ message: "Sessão inválida." });
      return null;
    }
    return user;
  } catch {
    reply.code(401).send({ message: "Sessão expirada. Entre de novo." });
    return null;
  }
}

export async function requireSession(request: FastifyRequest, reply: FastifyReply) {
  const header = request.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    reply.code(401).send({ message: "Faça login para continuar." });
    return null;
  }
  try {
    const payload = jwt.verify(header.slice(7), secret()) as { sub: string; role?: string };
    if (payload.role === "player") {
      const player = await prisma.player.findUnique({ where: { id: payload.sub } });
      if (!player || player.access !== "approved" || !player.active || player.guest || player.squad !== "mensalista" || player.name === "Gol contra") {
        reply.code(401).send({ message: "Sessão inválida." });
        return null;
      }
      return { role: "player" as const, player };
    }
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) {
      reply.code(401).send({ message: "Sessão inválida." });
      return null;
    }
    return { role: "admin" as const, user };
  } catch {
    reply.code(401).send({ message: "Sessão expirada. Entre de novo." });
    return null;
  }
}

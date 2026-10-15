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
  const token = jwt.sign({ sub: user.id, email: user.email }, secret(), { expiresIn: "30d" });
  return { token, user: { id: user.id, name: user.name, email: user.email } };
}

export async function requireUser(request: FastifyRequest, reply: FastifyReply) {
  const header = request.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    reply.code(401).send({ message: "Faça login para continuar." });
    return null;
  }
  try {
    const payload = jwt.verify(header.slice(7), secret()) as { sub: string };
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

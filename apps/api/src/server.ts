import cors from "@fastify/cors";
import Fastify from "fastify";
import { ensureProfessorOrder } from "./lib/professors.js";
import { prisma } from "./lib/prisma.js";
import { cleanPositions } from "./lib/roster.js";
import { seedChampionship } from "./seed.js";
import { adminRoutes } from "./routes/admin.js";
import { publicRoutes } from "./routes/public.js";

export async function start() {
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: process.env.CORS_ORIGIN === "*" ? true : process.env.CORS_ORIGIN || true });
  await app.register(publicRoutes);
  await app.register(adminRoutes);

  app.setErrorHandler((error, _request, reply) => {
    app.log.error(error);
    reply.code(500).send({ message: "Erro interno. Tente de novo." });
  });

  const imported = await seedChampionship(false);
  if (imported) app.log.info("Histórico da planilha importado.");
  const moved = await prisma.player.updateMany({
    where: { guest: true, squad: "mensalista" },
    data: { squad: "suplente" },
  });
  if (moved.count) app.log.info({ count: moved.count }, "Avulsos antigos foram para o grupo de suplentes.");
  const roster = await prisma.player.findMany({ select: { id: true, positions: true } });
  for (const player of roster) {
    const positions = cleanPositions(player.positions);
    const same = positions.length === player.positions.length && positions.every((item, index) => item === player.positions[index]);
    if (!same) await prisma.player.update({ where: { id: player.id }, data: { positions } });
  }
  await ensureProfessorOrder();

  const port = Number(process.env.PORT || 3333);
  await app.listen({ port, host: "0.0.0.0" });

  const shutdown = async () => {
    await app.close();
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

import { loadEnv } from "../src/lib/env.js";
import { prisma } from "../src/lib/prisma.js";
import { seedChampionship } from "../src/seed.js";

loadEnv();

const seeded = await seedChampionship(true);
console.log(seeded ? "Histórico da planilha importado." : "Importação ignorada.");
await prisma.$disconnect();

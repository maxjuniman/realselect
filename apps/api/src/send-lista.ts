import { existsSync, readFileSync } from "node:fs";
import { loadEnv } from "./lib/env.js";
import { prisma } from "./lib/prisma.js";
import { sendCallList } from "./lib/telegram-lista.js";

function loadCronEnv() {
  const file = "/etc/realselect-cron.env";
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq);
    if (process.env[key] !== undefined) continue;
    process.env[key] = JSON.parse(line.slice(eq + 1)) as string;
  }
}

loadCronEnv();
loadEnv();

try {
  const text = await sendCallList();
  console.log(`Lista enviada (${text.length} caracteres).`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}

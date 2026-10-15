import { createUser } from "./lib/auth.js";
import { loadEnv } from "./lib/env.js";
import { prisma } from "./lib/prisma.js";

loadEnv();

const [name, email, password] = process.argv.slice(2);

if (!name || !email || !password) {
  console.error('Uso: node dist/create-user.js "Nome" "email@exemplo.com" "senha"');
  process.exit(1);
}

const user = await createUser(name, email, password);
console.log(`Usuário salvo no banco: ${user.email}`);
await prisma.$disconnect();

import { chmodSync, writeFileSync } from "node:fs";

const keys = ["DATABASE_URL", "TELEGRAM_BOT_TOKEN", "TELEGRAM_CHAT_ID", "TZ", "PATH", "HOME"];
const body = keys
  .filter((key) => process.env[key])
  .map((key) => `${key}=${JSON.stringify(process.env[key])}`)
  .join("\n");

writeFileSync("/etc/realselect-cron.env", `${body}\n`, { mode: 0o600 });
chmodSync("/etc/realselect-cron.env", 0o600);

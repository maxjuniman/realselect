import { dateToIso } from "./dates.js";
import { prisma } from "./prisma.js";
import { buildCallList } from "./call-list.js";

export function saoPauloToday(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);
  return new Date(year, month - 1, day, 12, 0, 0);
}

export async function currentCallList(now = new Date()) {
  const [players, matches, turns, plans] = await Promise.all([
    prisma.player.findMany({
      select: { id: true, name: true, guest: true, active: true, squad: true, injured: true, positions: true },
    }),
    prisma.match.findMany({
      include: {
        professor: { select: { id: true, name: true } },
        appearances: { include: { player: { select: { id: true, name: true, guest: true } } } },
      },
    }),
    prisma.professorTurn.findMany({ orderBy: { sort: "asc" }, select: { playerId: true } }),
    prisma.professorPlan.findMany({ orderBy: { playedOn: "asc" } }),
  ]);

  return buildCallList(
    players,
    matches.map((match) => ({
      id: match.id,
      playedOn: dateToIso(match.playedOn),
      scheduled: match.scheduled,
      professor: match.professor,
      teamA: match.appearances.filter((item) => item.team === "A").map((item) => item.player),
      teamB: match.appearances.filter((item) => item.team === "B").map((item) => item.player),
    })),
    {
      today: saoPauloToday(now),
      order: turns.map((turn) => turn.playerId),
      plans: plans.map((plan) => ({
        playedOn: dateToIso(plan.playedOn),
        playerId: plan.playerId,
        cancelled: plan.cancelled,
      })),
    },
  );
}

export async function sendTelegramText(text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    throw new Error("Defina TELEGRAM_BOT_TOKEN e TELEGRAM_CHAT_ID.");
  }
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
  const body = (await response.json()) as { ok?: boolean; description?: string };
  if (!response.ok || !body.ok) {
    throw new Error(body.description || `Telegram recusou o envio (${response.status}).`);
  }
  return text;
}

export async function sendCallList(now = new Date()) {
  return sendTelegramText(await currentCallList(now));
}

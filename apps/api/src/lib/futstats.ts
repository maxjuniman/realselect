import { isoToDate } from "./dates.js";
import { prisma } from "./prisma.js";

export const FUTSTATS_ORIGIN = "https://futstats.pages.dev";
export const FUTSTATS_KEY = process.env.FUTSTATS_KEY || "MmUsx9n9jRPRTwZRsG9Mf-CZ";

type FsGoal = {
  id: string;
  note?: string;
  human?: { autor?: string; assist?: string };
};
type FsRoster = { id: string; name: string; number: string };
type FsEvent = { type: string; outcome?: string; player?: string | null };
type FsMatch = {
  match?: { date?: string };
  goals?: FsGoal[];
  season?: { id: string; label: string }[];
  roster_seed?: FsRoster[];
  events_seed?: FsEvent[];
};
type ClubPlayer = { id: string; name: string; nickname: string | null; shirtNumber: string | null };

function fold(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ");
}

function blank(label: string | undefined) {
  const value = (label ?? "").trim();
  if (!value || value === "—" || value === "-" || /^n[uú]mero n[aã]o lido$/i.test(value)) return "";
  return value;
}

function shirtFromNote(note: string | undefined, kind: "Autor" | "Assistência") {
  const match = new RegExp(`${kind}:\\s*camisa\\s+(01|[1-9]\\d?)`, "i").exec(note ?? "");
  return match?.[1] ?? "";
}

async function pull(path: string) {
  const url = `${FUTSTATS_ORIGIN}${path}${path.includes("?") ? "&" : "?"}k=${encodeURIComponent(FUTSTATS_KEY)}`;
  const response = await fetch(url, {
    headers: { "User-Agent": "RealSelect/1.0", Accept: "text/javascript, application/json, text/html" },
  });
  if (!response.ok) throw new Error("O Fut Stats não respondeu.");
  return response.text();
}

function parseData(source: string) {
  const start = source.indexOf("window.FS=");
  if (start < 0) throw new Error("Não achei os dados do Fut Stats.");
  let json = source.slice(start + "window.FS=".length).trim();
  if (json.endsWith(";")) json = json.slice(0, -1);
  return JSON.parse(json) as FsMatch;
}

function resolvePlayer(label: string, shirt: string, players: ClubPlayer[]) {
  const name = blank(label);
  if (name) {
    const folded = fold(name);
    const exact = players.filter((player) => fold(player.name) === folded || fold(player.nickname ?? "") === folded);
    if (exact.length === 1) return exact[0];
    const close = players.filter((player) => {
      const full = fold(player.name);
      return full.startsWith(`${folded} `) || folded.startsWith(`${full} `);
    });
    if (close.length === 1) return close[0];
  }
  if (shirt) {
    const byShirt = players.filter((player) => player.shirtNumber === shirt || player.shirtNumber === shirt.padStart(2, "0"));
    if (byShirt.length === 1) return byShirt[0];
  }
  return null;
}

export function embedUrl(date?: string) {
  const key = `k=${encodeURIComponent(FUTSTATS_KEY)}`;
  if (date) return `${FUTSTATS_ORIGIN}/${date}/prototipo/?${key}`;
  return `${FUTSTATS_ORIGIN}/?${key}`;
}

let cached: { at: number; matches: { date: string; label: string; embed: string }[] } | null = null;

export async function listFutStats() {
  if (cached && Date.now() - cached.at < 5 * 60 * 1000) return cached.matches;
  const dates = new Set<string>();
  const labels = new Map<string, string>();
  const html = await pull("/painel/");
  for (const match of html.matchAll(/(\d{4}-\d{2}-\d{2})\/prototipo/g)) dates.add(match[1]);
  if (!dates.size) throw new Error("Nenhuma partida no Fut Stats.");
  const newest = [...dates].sort().at(-1)!;
  const pack = parseData(await pull(`/${newest}/prototipo/data.js`));
  for (const row of pack.season ?? []) {
    dates.add(row.id);
    labels.set(row.id, row.label);
  }
  const matches = [...dates]
    .sort((a, b) => b.localeCompare(a))
    .map((date) => ({ date, label: labels.get(date) ?? date, embed: embedUrl(date) }));
  cached = { at: Date.now(), matches };
  return matches;
}

export async function importFutStats() {
  const catalog = await listFutStats();
  const players = await prisma.player.findMany({
    select: { id: true, name: true, nickname: true, shirtNumber: true },
  });
  const report: {
    date: string;
    status: string;
    goals: number;
    assists: number;
    skipped: string[];
  }[] = [];

  for (const item of catalog) {
    const playedOn = isoToDate(item.date);
    const match = await prisma.match.findFirst({
      where: { playedOn, scheduled: false },
      include: { appearances: true },
    });
    if (!match) {
      report.push({ date: item.date, status: "Sem jogo lançado nesta data.", goals: 0, assists: 0, skipped: [] });
      continue;
    }
    const pack = parseData(await pull(`/${item.date}/prototipo/data.js`));
    const roster = new Map((pack.roster_seed ?? []).map((row) => [row.id, row]));
    const inMatch = new Set(match.appearances.map((row) => row.playerId));
    const tallies = new Map<string, { playerId: string | null; type: "goal" | "assist" | "own_goal"; count: number }>();
    const skipped: string[] = [];

    function add(playerId: string | null, type: "goal" | "assist" | "own_goal") {
      const key = `${playerId ?? "own"}:${type}`;
      const current = tallies.get(key) ?? { playerId, type, count: 0 };
      current.count += 1;
      tallies.set(key, current);
    }

    function take(label: string, shirt: string, kind: "gol" | "assistência") {
      const player = resolvePlayer(label, shirt, players);
      if (!player) {
        skipped.push(`${kind} de ${label || `camisa ${shirt}` || "sem nome"}`);
        return null;
      }
      if (!inMatch.has(player.id)) {
        skipped.push(`${player.name} não estava neste jogo`);
        return null;
      }
      return player;
    }

    const goals = pack.goals ?? [];
    if (goals.length) {
      for (const goal of goals) {
        const scorer = take(goal.human?.autor ?? "", shirtFromNote(goal.note, "Autor"), "gol");
        if (scorer) add(scorer.id, "goal");
        const assistLabel = blank(goal.human?.assist);
        if (assistLabel) {
          const helper = take(assistLabel, shirtFromNote(goal.note, "Assistência"), "assistência");
          if (helper && helper.id !== scorer?.id) add(helper.id, "assist");
        }
      }
    } else {
      for (const event of pack.events_seed ?? []) {
        if (event.type !== "shot" || event.outcome !== "gol" || !event.player) continue;
        const row = roster.get(event.player);
        if (!row) continue;
        const scorer = take(row.name, row.number, "gol");
        if (scorer) add(scorer.id, "goal");
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.matchEvent.deleteMany({ where: { matchId: match.id, type: { in: ["goal", "assist", "own_goal"] } } });
      if (tallies.size) {
        await tx.matchEvent.createMany({
          data: [...tallies.values()].map((event) => ({
            matchId: match.id,
            playerId: event.playerId,
            type: event.type,
            count: event.count,
          })),
        });
      }
    });

    report.push({
      date: item.date,
      status: "Lançado",
      goals: [...tallies.values()].filter((event) => event.type === "goal").reduce((sum, event) => sum + event.count, 0),
      assists: [...tallies.values()].filter((event) => event.type === "assist").reduce((sum, event) => sum + event.count, 0),
      skipped,
    });
  }

  return { embed: embedUrl(), matches: catalog, report };
}

export async function futStatsPublic() {
  try {
    const matches = await listFutStats();
    return { embed: embedUrl(), matches };
  } catch {
    return { embed: embedUrl(), matches: [] as { date: string; label: string; embed: string }[] };
  }
}

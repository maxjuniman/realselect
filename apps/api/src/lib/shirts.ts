import { prisma } from "./prisma.js";

export const KNOWN_SHIRTS: { name: string; number: string }[] = [
  { name: "Edy", number: "1" },
  { name: "Everton", number: "01" },
  { name: "Rafael Chaves", number: "3" },
  { name: "Lucão", number: "4" },
  { name: "Max", number: "5" },
  { name: "Dinho", number: "6" },
  { name: "Cristiano", number: "7" },
  { name: "Leomar", number: "8" },
  { name: "Dioury", number: "9" },
  { name: "Bruno", number: "10" },
  { name: "Mateus", number: "11" },
  { name: "Marciano", number: "12" },
  { name: "Marcelo", number: "17" },
  { name: "Cabral", number: "19" },
  { name: "Iury", number: "20" },
  { name: "Daniel", number: "23" },
  { name: "Henrique", number: "27" },
  { name: "Avila", number: "44" },
  { name: "Fábio", number: "2" },
  { name: "NG", number: "77" },
];

function fold(name: string) {
  return name.trim().toLocaleLowerCase("pt-BR").normalize("NFD").replace(/\p{M}/gu, "");
}

function matchPlayer(players: { id: string; name: string; nickname: string | null; shirtNumber: string | null }[], label: string) {
  const folded = fold(label);
  const exact = players.filter((player) => fold(player.name) === folded || fold(player.nickname ?? "") === folded);
  if (exact.length === 1) return exact[0];
  if (exact.length > 1) return undefined;
  const close = players.filter((player) => {
    const name = fold(player.name);
    return name.startsWith(`${folded} `) || folded.startsWith(`${name} `);
  });
  return close.length === 1 ? close[0] : undefined;
}

export async function shirtOwner(number: string | null | undefined, ignoreId?: string) {
  if (number == null) return null;
  return prisma.player.findFirst({
    where: { shirtNumber: number, ...(ignoreId ? { id: { not: ignoreId } } : {}) },
    select: { id: true, name: true },
  });
}

export async function applyKnownShirts() {
  const players = await prisma.player.findMany({ select: { id: true, name: true, nickname: true, shirtNumber: true } });
  const taken = new Set(players.flatMap((player) => (player.shirtNumber ? [player.shirtNumber] : [])));
  let count = 0;
  for (const row of KNOWN_SHIRTS) {
    if (taken.has(row.number)) continue;
    const player = matchPlayer(players, row.name);
    if (!player || player.shirtNumber != null) continue;
    await prisma.player.update({ where: { id: player.id }, data: { shirtNumber: row.number } });
    player.shirtNumber = row.number;
    taken.add(row.number);
    count += 1;
  }
  return count;
}

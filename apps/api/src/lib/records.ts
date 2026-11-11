import { prisma } from "./prisma.js";

export const DEFAULT_RECORDS: { title: string; value: string; holders: { name: string; note: string }[] }[] = [
  { title: "Vitórias seguidas", value: "12", holders: [{ name: "Max", note: "2025" }] },
  { title: "Derrotas seguidas", value: "10", holders: [{ name: "Will", note: "2025" }] },
  { title: "Gols na temporada", value: "48", holders: [{ name: "Max", note: "1/2026" }] },
  {
    title: "Gols em 1 jogo",
    value: "7",
    holders: [
      { name: "Iury", note: "21/10/25" },
      { name: "Marcio", note: "26/06/25" },
      { name: "Max", note: "25/08/26" },
    ],
  },
  {
    title: "Assistências em 1 jogo",
    value: "5",
    holders: [
      { name: "Dinho", note: "11/3/25" },
      { name: "Mateus", note: "18/3/25" },
      { name: "Ricky", note: "28/04/26" },
    ],
  },
  { title: "Assistências na temporada", value: "28", holders: [{ name: "Iury", note: "1/2026" }] },
  {
    title: "Maior vitória como professor",
    value: "10",
    holders: [
      { name: "Anderson", note: "2/2022" },
      { name: "Everton", note: "1/2023" },
    ],
  },
  {
    title: "Maior derrota como professor",
    value: "-12",
    holders: [
      { name: "Dioury", note: "1/2022" },
      { name: "Marciano", note: "1/2022" },
    ],
  },
  { title: "Melhor campanha", value: "54", holders: [{ name: "Iury", note: "1/2026" }] },
];

const recordInclude = {
  holders: { orderBy: { sort: "asc" as const } },
};

function present(records: { id: string; title: string; value: string; holders: { name: string; note: string }[] }[]) {
  return records.map((record) => ({
    id: record.id,
    title: record.title,
    value: record.value,
    holders: record.holders.map((holder) => ({ name: holder.name, note: holder.note })),
  }));
}

export async function listRecords() {
  const records = await prisma.clubRecord.findMany({ orderBy: { sort: "asc" }, include: recordInclude });
  return present(records);
}

export async function ensureRecords() {
  const count = await prisma.clubRecord.count();
  if (count > 0) return 0;
  for (const [index, row] of DEFAULT_RECORDS.entries()) {
    await prisma.clubRecord.create({
      data: {
        title: row.title,
        value: row.value,
        sort: index,
        holders: { create: row.holders.map((holder, sort) => ({ ...holder, sort })) },
      },
    });
  }
  return DEFAULT_RECORDS.length;
}

export async function saveRecords(rows: { title: string; value: string; holders: { name: string; note?: string }[] }[]) {
  await prisma.$transaction(async (tx) => {
    await tx.recordHolder.deleteMany();
    await tx.clubRecord.deleteMany();
    for (const [index, row] of rows.entries()) {
      await tx.clubRecord.create({
        data: {
          title: row.title.trim(),
          value: row.value.trim(),
          sort: index,
          holders: {
            create: row.holders
              .filter((holder) => holder.name.trim())
              .map((holder, sort) => ({ name: holder.name.trim(), note: holder.note?.trim() ?? "", sort })),
          },
        },
      });
    }
  });
  return listRecords();
}

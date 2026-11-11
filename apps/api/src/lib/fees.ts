import { prisma } from "./prisma.js";

type FeeInput = {
  year: number;
  month: number;
  carried: number;
  paid: number;
  goalkeeper: number;
  missing: number;
  gear: number;
  extra: number;
  fee: number;
  barbecue: number;
};

const FIELDS = ["carried", "paid", "goalkeeper", "missing", "gear", "extra", "fee", "barbecue"] as const;

function brl(text: string) {
  const negative = text.startsWith("-");
  const [reais, frac = "00"] = text.replace("-", "").split(",");
  const cents = Number(reais.replace(/\./g, "")) * 100 + Number(frac.padEnd(2, "0").slice(0, 2));
  return negative ? -cents : cents;
}

const SEED = [
  ["2024-09", "896,08", "918,00", "-38,49", "0,00", "0,00", "152,00", "-680,00", "-544,45"],
  ["2024-10", "703,14", "1.300,00", "-76,98", "0,00", "0,00", "120,00", "-1.060,00", "-399,07"],
  ["2024-11", "587,09", "1.040,00", "-58,49", "0,00", "0,00", "40,00", "-720,00", "-421,84"],
  ["2024-12", "466,76", "780,00", "-76,98", "0,00", "-103,72", "100,00", "-750,00", "-761,81"],
  ["2025-01", "-345,75", "1.040,00", "-115,47", "0,00", "0,00", "180,00", "-840,00", "-145,18"],
  ["2025-02", "-226,40", "1.040,00", "-76,98", "0,00", "0,00", "20,00", "-840,00", "-168,90"],
  ["2025-03", "-252,28", "1.300,00", "-106,98", "0,00", "0,00", "120,00", "-630,00", "-470,50"],
  ["2025-04", "-39,76", "1.300,00", "-76,98", "0,00", "0,00", "260,00", "-1.050,00", "-225,00"],
  ["2025-05", "168,26", "1.300,00", "0,00", "0,00", "0,00", "300,00", "-840,00", "-528,40"],
  ["2025-06", "399,86", "1.300,00", "-76,98", "0,00", "-78,20", "260,00", "-840,00", "-326,03"],
  ["2025-07", "638,65", "1.300,00", "-153,96", "0,00", "0,00", "260,00", "-1.050,00", "-570,40"],
  ["2025-08", "424,29", "1.300,00", "-111,98", "0,00", "0,00", "180,00", "-840,00", "-457,73"],
  ["2025-09", "494,58", "1.300,00", "-140,00", "0,00", "-80,00", "300,00", "-1.100,00", "-375,85"],
  ["2025-10", "398,73", "1.300,00", "-76,50", "0,00", "0,00", "200,00", "-880,00", "-486,55"],
  ["2025-11", "455,68", "1.300,00", "-185,00", "0,00", "0,00", "140,00", "-880,00", "-266,02"],
  ["2025-12", "564,66", "1.300,00", "-150,00", "0,00", "-34,06", "160,00", "-660,00", "-1.409,59"],
  ["2026-01", "-228,99", "1.300,00", "-70,00", "0,00", "0,00", "260,00", "-880,00", "-310,00"],
  ["2026-02", "71,01", "1.300,00", "-70,00", "0,00", "0,00", "160,00", "-880,00", "-480,00"],
  ["2026-03", "101,01", "1.300,00", "0,00", "0,00", "0,00", "320,00", "-1.100,00", "-249,65"],
  ["2026-04", "371,36", "1.300,00", "-35,00", "0,00", "0,00", "260,00", "-880,00", "-553,00"],
  ["2026-05", "463,36", "1.300,00", "-70,00", "0,00", "0,00", "0,00", "-880,00", "-254,00"],
  ["2026-06", "559,36", "1.300,00", "-70,00", "0,00", "-105,00", "0,00", "-1.100,00", "-525,00"],
  ["2026-07", "59,36", "1.300,00", "0,00", "0,00", "0,00", "0,00", "-880,00", "-315,00"],
  ["2026-08", "164,36", "1.300,00", "-35,00", "0,00", "0,00", "240,00", "-880,00", "-495,00"],
  ["2026-09", "294,36", "1.300,00", "0,00", "0,00", "0,00", "0,00", "-1.100,00", "-270,00"],
].map(([when, carried, paid, goalkeeper, missing, gear, extra, fee, barbecue]) => {
  const [year, month] = when.split("-").map(Number);
  return { year, month, carried: brl(carried), paid: brl(paid), goalkeeper: brl(goalkeeper), missing: brl(missing), gear: brl(gear), extra: brl(extra), fee: brl(fee), barbecue: brl(barbecue) };
});

export function balanceOf(row: Omit<FeeInput, "year" | "month">) {
  return FIELDS.reduce((total, field) => total + row[field], 0);
}

export function chainFees(rows: FeeInput[]) {
  const sorted = [...rows].sort((a, b) => a.year - b.year || a.month - b.month);
  let previous = 0;
  return sorted.map((row, index) => {
    const carried = index === 0 ? row.carried : previous;
    const next = { ...row, carried };
    previous = balanceOf(next);
    return { ...next, balance: previous };
  });
}

export async function listFees() {
  const rows = await prisma.feeMonth.findMany({ orderBy: [{ year: "asc" }, { month: "asc" }] });
  return chainFees(rows).map((row, index) => ({ ...row, id: rows[index]?.id ?? `${row.year}-${row.month}` }));
}

export async function ensureFees() {
  const count = await prisma.feeMonth.count();
  if (count > 0) return 0;
  await prisma.feeMonth.createMany({ data: chainFees(SEED).map(({ balance: _balance, ...row }) => row) });
  return SEED.length;
}

export async function saveFees(rows: FeeInput[]) {
  const seen = new Set<string>();
  for (const row of rows) {
    const key = `${row.year}-${row.month}`;
    if (seen.has(key)) return { ok: false as const, error: "Cada mês só pode aparecer uma vez." };
    seen.add(key);
  }
  const chained = chainFees(rows);
  await prisma.$transaction(async (tx) => {
    await tx.feeMonth.deleteMany();
    if (chained.length) {
      await tx.feeMonth.createMany({
        data: chained.map(({ balance: _balance, ...row }) => row),
      });
    }
  });
  return { ok: true as const, fees: await listFees() };
}

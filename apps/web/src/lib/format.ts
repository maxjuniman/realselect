export function formatLongDate(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  const formatted = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

export function formatShortDate(iso: string) {
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
}

export function formatTinyDate(iso: string) {
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year.slice(2)}`;
}

export function formatPercent(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatDiff(value: number) {
  return value > 0 ? `+${value}` : String(value);
}

export function formatMoney(cents: number) {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  const reais = Math.floor(abs / 100).toLocaleString("pt-BR");
  const frac = String(abs % 100).padStart(2, "0");
  return `${sign}R$ ${reais},${frac}`;
}

export function moneyInput(cents: number) {
  return formatMoney(cents).replace("R$ ", "");
}

export function parseMoney(text: string) {
  const cleaned = text.trim().replace(/\s/g, "").replace("R$", "").replace("−", "-");
  if (!cleaned) return 0;
  const negative = cleaned.startsWith("-");
  const body = cleaned.replace(/-/g, "");
  if (!body || body === ",") return null;
  let normalized = body;
  if (body.includes(",") && body.includes(".")) normalized = body.replace(/\./g, "").replace(",", ".");
  else if (body.includes(",")) normalized = body.replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(body)) normalized = body.replace(/\./g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  const [reais, frac = ""] = normalized.split(".");
  const cents = Number(reais) * 100 + Number(frac.padEnd(2, "0").slice(0, 2));
  return negative ? -cents : cents;
}

export function resultLabel(result: "win" | "loss" | "draw") {
  if (result === "win") return "Vitória";
  if (result === "draw") return "Empate";
  return "Derrota";
}

export function nextTuesday(from = new Date()) {
  const date = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const add = (2 - date.getDay() + 7) % 7;
  date.setDate(date.getDate() + add);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function seasonCodeFromDate(iso: string) {
  const [year, month] = iso.split("-").map(Number);
  return `0${month <= 6 ? 1 : 2}_${year}`;
}

export function semesterTuesdays(year: number, half: number) {
  if (!year || (half !== 1 && half !== 2)) return 0;
  const start = new Date(Date.UTC(year, half === 1 ? 0 : 6, 1));
  const end = new Date(Date.UTC(year, half === 1 ? 6 : 12, 0));
  const cursor = new Date(start);
  cursor.setUTCDate(1 + ((2 - start.getUTCDay() + 7) % 7));
  let count = 0;
  while (cursor <= end) {
    count += 1;
    cursor.setUTCDate(cursor.getUTCDate() + 7);
  }
  return count;
}

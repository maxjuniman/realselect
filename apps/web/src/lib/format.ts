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

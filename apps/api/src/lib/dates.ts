export function dateToIso(value: Date) {
  return value.toISOString().slice(0, 10);
}

export function isoToDate(iso: string) {
  return new Date(`${iso}T12:00:00.000Z`);
}

export function seasonFromCode(code: string) {
  const semester = /^0([12])_(\d{4})$/.exec(code);
  if (semester) {
    const half = Number(semester[1]);
    const year = Number(semester[2]);
    return { code, name: `${half}º semestre ${year}`, year, half };
  }
  const yearly = /^(\d{4})$/.exec(code);
  if (yearly) {
    const year = Number(yearly[1]);
    return { code, name: `Temporada ${year}`, year, half: 0 };
  }
  return { code, name: code, year: 0, half: 0 };
}

export function seasonCodeFromDate(iso: string) {
  const [year, month] = iso.split("-").map(Number);
  const half = month <= 6 ? 1 : 2;
  return `0${half}_${year}`;
}

export function addDays(iso: string, days: number) {
  const date = isoToDate(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return dateToIso(date);
}

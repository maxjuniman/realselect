import type { Attendance, MatchDetail, Season, Standings } from "./types";

const base = process.env.API_PROXY_URL || "http://127.0.0.1:3333";

export class ApiError extends Error {
  status: number;
  constructor(status: number) {
    super(`API ${status}`);
    this.status = status;
  }
}

export async function api<T>(path: string): Promise<T> {
  const response = await fetch(`${base}${path}`, { cache: "no-store" });
  if (!response.ok) throw new ApiError(response.status);
  return response.json() as Promise<T>;
}

export async function loadSeasons() {
  return api<Season[]>("/seasons");
}

export async function loadStandings(season?: string) {
  const query = season ? `?season=${encodeURIComponent(season)}` : "";
  return api<Standings>(`/standings${query}`);
}

export async function loadMatches(season?: string) {
  const query = season ? `?season=${encodeURIComponent(season)}` : "";
  return api<MatchDetail[]>(`/matches${query}`);
}

export async function loadAttendance(scope: string) {
  return api<Attendance>(`/attendance?scope=${scope}`);
}

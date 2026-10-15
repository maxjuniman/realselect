export type Season = {
  id: string;
  code: string;
  name: string;
  year: number;
  half: number;
  isCurrent: boolean;
};

export type PlayerRef = {
  id: string;
  name: string;
  guest: boolean;
  active?: boolean;
  squad?: "mensalista" | "suplente";
  positions?: string[];
};

export type StandingRow = {
  position: number;
  player: { id: string; name: string; guest: boolean };
  points: number;
  games: number;
  wins: number;
  draws: number;
  losses: number;
  goalDiff: number;
  goals: number;
  assists: number;
  utilization: number;
  lastWin: string | null;
  lastMatch: string | null;
};

export type Standings = { season: Season; rows: StandingRow[] };

export type LinePlayer = {
  id: string;
  name: string;
  guest: boolean;
  result: "win" | "loss" | "draw";
  points: number;
  goalDiff: number;
  goals: number;
  assists: number;
};

export type MatchDetail = {
  id: string;
  playedOn: string;
  season: { id: string; code: string; name: string };
  scoreA: number | null;
  scoreB: number | null;
  goalDiffA: number;
  scoreLabel: string;
  origin: string;
  professor: { id: string; name: string } | null;
  ownGoals: number;
  teamA: LinePlayer[];
  teamB: LinePlayer[];
};

export type ScorerRow = {
  position: number;
  player: { id: string; name: string; guest: boolean };
  goals: number;
  assists: number;
  participations: number;
};

export type Attendance = {
  scope: string;
  label: string;
  matchCount: number;
  from: string | null;
  to: string | null;
  rows: { player: { id: string; name: string; guest: boolean }; games: number; lastMatch: string }[];
};

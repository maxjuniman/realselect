export const AWARDS_FROM = "2026-10-27";

export function awardsOpen(match: { playedOn: string; scheduled: boolean }) {
  return !match.scheduled && match.playedOn.slice(0, 10) >= AWARDS_FROM;
}

export function awardCandidate(name: string) {
  const folded = name.trim().toLocaleLowerCase("pt-BR").replace(/\s+/g, " ");
  return folded !== "gol contra" && folded !== "goleiro de aluguel";
}

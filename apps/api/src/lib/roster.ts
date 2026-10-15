export const POSITIONS = ["Goleiro", "Zaga", "Meio", "Ataque"] as const;

export const SQUADS = ["mensalista", "suplente"] as const;

const LEGACY: Record<string, (typeof POSITIONS)[number]> = {
  Goleiro: "Goleiro",
  Lateral: "Zaga",
  Zagueiro: "Zaga",
  Zaga: "Zaga",
  Volante: "Meio",
  Meia: "Meio",
  Meio: "Meio",
  Atacante: "Ataque",
  Ataque: "Ataque",
};

export function cleanPositions(values: readonly string[]) {
  const mapped = values
    .map((value) => LEGACY[value.trim()] ?? "")
    .filter((value): value is (typeof POSITIONS)[number] => Boolean(value));
  return [...new Set(mapped)].slice(0, 2);
}

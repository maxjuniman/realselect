export const POSITIONS = ["Goleiro", "Lateral", "Zagueiro", "Volante", "Meia", "Atacante"] as const;

export const SQUADS = ["mensalista", "suplente"] as const;

export function cleanPositions(values: readonly string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].slice(0, 2);
}

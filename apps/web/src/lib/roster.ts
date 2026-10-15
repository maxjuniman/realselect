export const POSITIONS = ["Goleiro", "Zaga", "Meio", "Ataque"] as const;

export const GROUPS = [
  { id: "mensalista", label: "Mensalistas", open: true },
  { id: "suplente", label: "Suplentes", open: true },
  { id: "inativo", label: "Inativos", open: false },
] as const;

export type GroupId = (typeof GROUPS)[number]["id"];

export function positionRank(position?: string) {
  const index = POSITIONS.indexOf(position as (typeof POSITIONS)[number]);
  return index === -1 ? POSITIONS.length : index;
}

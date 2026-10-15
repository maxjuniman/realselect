export const POSITIONS = ["Goleiro", "Lateral", "Zagueiro", "Volante", "Meia", "Atacante"] as const;

export const GROUPS = [
  { id: "mensalista", label: "Mensalistas" },
  { id: "suplente", label: "Suplentes" },
  { id: "inativo", label: "Inativos" },
] as const;

export type GroupId = (typeof GROUPS)[number]["id"];

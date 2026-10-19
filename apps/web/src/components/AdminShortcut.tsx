"use client";

import { useSession } from "@/components/Session";
import { ButtonLink } from "@/styles/ui";

export function AdminShortcut() {
  const session = useSession();
  if (session?.role !== "admin") return null;
  return <ButtonLink href="/admin/jogos">Jogos</ButtonLink>;
}

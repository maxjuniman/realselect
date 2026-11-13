"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import styled from "styled-components";
import { clientApi } from "@/lib/client";
import { GhostButton, Muted } from "@/styles/ui";

type Report = {
  report: { date: string; status: string; goals: number; assists: number; skipped: string[] }[];
};

export function ImportFutStats() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  async function run() {
    setBusy(true);
    setNote("");
    try {
      const saved = await clientApi<Report>("/admin/futstats/import", { method: "POST", body: JSON.stringify({}) });
      const done = saved.report.filter((row) => row.status === "Lançado");
      const goals = done.reduce((sum, row) => sum + row.goals, 0);
      const assists = done.reduce((sum, row) => sum + row.assists, 0);
      setNote(`Gols e assistências de ${done.length} jogo(s) foram para a artilharia (${goals} gols, ${assists} assistências).`);
      router.refresh();
    } catch (caught) {
      setNote(caught instanceof Error ? caught.message : "Não foi possível importar o Fut Stats.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Wrap>
      <GhostButton type="button" disabled={busy} onClick={() => void run()}>
        {busy ? "Importando..." : "Importar gols do Fut Stats"}
      </GhostButton>
      {note ? <Muted>{note}</Muted> : null}
    </Wrap>
  );
}

const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: flex-end;
`;

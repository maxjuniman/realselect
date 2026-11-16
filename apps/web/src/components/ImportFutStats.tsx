"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styled from "styled-components";
import { clientApi } from "@/lib/client";
import { ErrorText, GhostButton, Muted, PrimaryButton, Table, TableWrap, Td, Th } from "@/styles/ui";

export type ImportRow = {
  date: string;
  status: string;
  changed: boolean;
  before: { goals: string; assists: string };
  after: { goals: string; assists: string };
  goals: number;
  assists: number;
  skipped: string[];
};

export function ImportFutStats() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [rows, setRows] = useState<ImportRow[] | null>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !busy) setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, busy]);

  async function run() {
    setBusy(true);
    setError("");
    setRows(null);
    setOpen(true);
    try {
      const saved = await clientApi<{ report: ImportRow[] }>("/admin/futstats/import", { method: "POST", body: JSON.stringify({}) });
      setRows(saved.report);
      if (saved.report.some((row) => row.changed)) router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível importar o Fut Stats.");
    } finally {
      setBusy(false);
    }
  }

  const changed = rows?.filter((row) => row.changed).length ?? 0;

  return (
    <>
      <GhostButton type="button" disabled={busy} onClick={() => void run()}>
        {busy ? "Importando..." : "Importar gols do Fut Stats"}
      </GhostButton>
      {open ? (
        <Backdrop onClick={() => !busy && setOpen(false)}>
          <Dialog role="dialog" aria-label="Comparativo da importação" onClick={(event) => event.stopPropagation()}>
            <h2>Importação do Fut Stats</h2>
            {busy ? <Muted>Comparando gols e assistências...</Muted> : null}
            {error ? <ErrorText>{error}</ErrorText> : null}
            {rows ? (
              <>
                <Muted>
                  {changed
                    ? `${changed} jogo(s) estavam diferentes do site e foram atualizados.`
                    : "Nada mudou: o que está no site já bate com o Fut Stats."}
                </Muted>
                <TableWrap>
                  <Table>
                    <thead>
                      <tr>
                        <Th>Data</Th>
                        <Th>Situação</Th>
                        <Th>No site</Th>
                        <Th>Fut Stats</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => (
                        <tr key={row.date}>
                          <Td $name>{row.date.split("-").reverse().join("/")}</Td>
                          <Td>{row.status}</Td>
                          <Td>
                            {row.before.goals}
                            <Muted> · {row.before.assists}</Muted>
                          </Td>
                          <Td>
                            {row.after.goals}
                            <Muted> · {row.after.assists}</Muted>
                            {row.skipped.length ? <Muted> · {row.skipped.join("; ")}</Muted> : null}
                          </Td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </TableWrap>
              </>
            ) : null}
            <PrimaryButton type="button" disabled={busy} onClick={() => setOpen(false)}>
              Fechar
            </PrimaryButton>
          </Dialog>
        </Backdrop>
      ) : null}
    </>
  );
}

const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 30;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgba(28, 16, 34, 0.46);
`;

const Dialog = styled.div`
  width: min(920px, 100%);
  max-height: min(860px, 100%);
  overflow: auto;
  background: ${({ theme }) => theme.paper};
  padding: 22px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 14px;
  h2 {
    margin: 0;
    font-family: ${({ theme }) => theme.display};
    font-stretch: 87.5%;
    font-weight: 700;
    font-size: 32px;
    letter-spacing: -0.03em;
    line-height: 0.95;
  }
`;

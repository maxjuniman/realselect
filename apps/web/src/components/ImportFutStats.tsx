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
  lances: { id: string; team: string; autor: string; assist: string }[];
  annotated: boolean;
};

export function ImportFutStats() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [rows, setRows] = useState<ImportRow[] | null>(null);
  const [notes, setNotes] = useState<unknown[]>([]);
  const [notesName, setNotesName] = useState("");

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !busy) setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, busy]);

  async function onNotes(files: FileList | null) {
    if (!files?.length) {
      setNotes([]);
      setNotesName("");
      return;
    }
    try {
      const parsed: unknown[] = [];
      for (const file of files) {
        const json = JSON.parse(await file.text()) as unknown;
        if (Array.isArray(json)) parsed.push(...json);
        else parsed.push(json);
      }
      setNotes(parsed);
      setNotesName([...files].map((file) => file.name).join(", "));
      setError("");
    } catch {
      setNotes([]);
      setNotesName("");
      setError("Esse arquivo de anotações não é um JSON válido.");
    }
  }

  async function run() {
    setBusy(true);
    setError("");
    setRows(null);
    setOpen(true);
    try {
      const saved = await clientApi<{ report: ImportRow[] }>("/admin/futstats/import", {
        method: "POST",
        body: JSON.stringify({ annotations: notes }),
      });
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
      <Actions>
        <FileLabel>
          <input type="file" accept="application/json,.json" multiple onChange={(event) => void onNotes(event.target.files)} />
          Anexar anotações
        </FileLabel>
        <GhostButton type="button" disabled={busy} onClick={() => void run()}>
          {busy ? "Importando..." : "Importar gols do Fut Stats"}
        </GhostButton>
      </Actions>
      {notesName ? <Muted>Anotações: {notesName}</Muted> : null}
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
                    : "Nada mudou: o que está no site já bate com o arquivo publicado do Fut Stats."}
                </Muted>
                <Muted>
                  Correções feitas na tela de revisão do Fut Stats ficam só no navegador. Para importar o que você validou, use Exportar anotações e anexe o JSON.
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
                          <Td>
                            {row.status}
                            {row.annotated ? <Muted> · com anotações</Muted> : null}
                          </Td>
                          <Td>
                            {row.before.goals}
                            <Muted> · {row.before.assists}</Muted>
                          </Td>
                          <Td>
                            {row.after.goals}
                            <Muted> · {row.after.assists}</Muted>
                            {row.skipped.length ? <Muted> · {row.skipped.join("; ")}</Muted> : null}
                            {row.lances.length ? (
                              <LanceList>
                                {row.lances.map((lance) => (
                                  <li key={lance.id}>
                                    {lance.id} {lance.team} {lance.autor}
                                    {lance.assist && lance.assist !== "—" ? ` · ${lance.assist}` : ""}
                                  </li>
                                ))}
                              </LanceList>
                            ) : null}
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

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
`;

const FileLabel = styled.label`
  position: relative;
  display: inline-grid;
  place-items: center;
  min-height: 40px;
  padding: 0 14px;
  border: 1px solid ${({ theme }) => theme.line};
  background: ${({ theme }) => theme.card};
  color: ${({ theme }) => theme.ink};
  font: inherit;
  font-weight: 600;
  cursor: pointer;
  input {
    position: absolute;
    inset: 0;
    opacity: 0;
    cursor: pointer;
  }
  &:hover {
    color: ${({ theme }) => theme.purpleDeep};
  }
`;

const LanceList = styled.ul`
  margin: 8px 0 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 2px;
  color: ${({ theme }) => theme.muted};
  font-size: 13px;
`;

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

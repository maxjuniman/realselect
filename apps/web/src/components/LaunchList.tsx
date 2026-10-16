"use client";

import { useState } from "react";
import styled from "styled-components";
import { clientApi } from "@/lib/client";
import { buildCallList, nextGameDate } from "@/lib/call-list";
import type { MatchDetail, PlayerRef, ProfessorRoster } from "@/lib/types";
import { Actions, GhostButton, Muted, PrimaryButton } from "@/styles/ui";

export function LaunchList() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [text, setText] = useState("");
  const [note, setNote] = useState("");

  async function openList() {
    setBusy(true);
    setNote("");
    try {
      const [players, matches, roster] = await Promise.all([
        clientApi<PlayerRef[]>("/players"),
        clientApi<MatchDetail[]>("/matches"),
        clientApi<ProfessorRoster>("/admin/professors"),
      ]);
      const date = nextGameDate(matches);
      const absentIds = roster.absences.filter((absence) => absence.playedOn === date).map((absence) => absence.playerId);
      setText(buildCallList(players, matches, { order: roster.order.map((player) => player.id), absentIds }));
      setOpen(true);
    } catch (error) {
      setText("");
      setNote(error instanceof Error ? error.message : "Não consegui montar a lista.");
      setOpen(true);
    } finally {
      setBusy(false);
    }
  }

  async function share() {
    setNote("");
    try {
      if (navigator.share) {
        await navigator.share({ text });
        setNote("Escolha o grupo do Futibas no WhatsApp.");
        return;
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
    }
    try {
      await navigator.clipboard.writeText(text);
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
      setNote("O texto foi copiado. No WhatsApp, escolha o grupo e cole a lista.");
    } catch {
      setNote("Copie o texto acima e cole no grupo do WhatsApp.");
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setNote("Lista copiada.");
    } catch {
      setNote("Selecione o texto e copie manualmente.");
    }
  }

  return (
    <>
      <GhostButton type="button" onClick={openList} disabled={busy}>
        {busy ? "Montando..." : "Lançar lista"}
      </GhostButton>
      {open ? (
        <Backdrop onMouseDown={() => setOpen(false)}>
          <Dialog role="dialog" aria-modal="true" aria-labelledby="call-list-title" onMouseDown={(event) => event.stopPropagation()}>
            <h2 id="call-list-title">Lista da próxima terça</h2>
            {text ? <Preview readOnly value={text} aria-label="Texto da lista" /> : null}
            {note ? <Muted>{note}</Muted> : null}
            <Actions>
              <GhostButton type="button" onClick={() => setOpen(false)}>
                Fechar
              </GhostButton>
              {text ? (
                <GhostButton type="button" onClick={copy}>
                  Copiar
                </GhostButton>
              ) : null}
              {text ? (
                <PrimaryButton type="button" onClick={share}>
                  Compartilhar no WhatsApp
                </PrimaryButton>
              ) : null}
            </Actions>
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
  width: min(560px, 100%);
  max-height: min(860px, 100%);
  overflow: auto;
  background: ${({ theme }) => theme.paper};
  padding: 22px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  h2 {
    margin: 0;
    font-family: ${({ theme }) => theme.display};
    font-stretch: 87.5%;
    font-weight: 700;
    font-size: 36px;
    letter-spacing: -0.03em;
    line-height: 0.95;
  }
`;

const Preview = styled.textarea`
  width: 100%;
  min-height: 320px;
  resize: vertical;
  border: 1px solid ${({ theme }) => theme.ink};
  background: ${({ theme }) => theme.card};
  color: ${({ theme }) => theme.ink};
  padding: 12px;
  font: inherit;
  line-height: 1.45;
  white-space: pre;
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.purpleDeep};
    outline-offset: 2px;
  }
`;

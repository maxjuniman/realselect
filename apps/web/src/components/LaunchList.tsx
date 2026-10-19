"use client";

import { useRef, useState } from "react";
import styled from "styled-components";
import { clientApi } from "@/lib/client";
import { buildCallList } from "@/lib/call-list";
import type { MatchDetail, PlayerRef, ProfessorRoster } from "@/lib/types";
import { Actions, Check, GhostButton, Muted, PrimaryButton } from "@/styles/ui";

type ListSource = {
  players: PlayerRef[];
  matches: MatchDetail[];
  order: string[];
  plans: ProfessorRoster["plans"];
};

export function LaunchList() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [text, setText] = useState("");
  const [note, setNote] = useState("");
  const [barbecue, setBarbecue] = useState(false);
  const [sending, setSending] = useState(false);
  const [source, setSource] = useState<ListSource | null>(null);
  const preview = useRef<HTMLTextAreaElement>(null);

  function compose(data: ListSource, meat: boolean) {
    return buildCallList(data.players, data.matches, { order: data.order, plans: data.plans ?? [], barbecue: meat });
  }

  async function openList() {
    setBusy(true);
    setNote("");
    try {
      const [players, matches, roster] = await Promise.all([
        clientApi<PlayerRef[]>("/players"),
        clientApi<MatchDetail[]>("/matches"),
        clientApi<ProfessorRoster>("/admin/professors"),
      ]);
      const next = { players, matches, order: roster.order.map((player) => player.id), plans: roster.plans ?? [] };
      setSource(next);
      setText(compose(next, barbecue));
      setOpen(true);
    } catch (error) {
      setText("");
      setNote(error instanceof Error ? error.message : "Não consegui montar a lista.");
      setOpen(true);
    } finally {
      setBusy(false);
    }
  }

  async function testBot() {
    setSending(true);
    setNote("");
    try {
      await clientApi("/admin/call-list", { method: "POST", body: JSON.stringify({ text }) });
      setNote("Lista enviada no Telegram.");
    } catch (error) {
      setNote(error instanceof Error ? error.message : "Não consegui enviar no Telegram.");
    } finally {
      setSending(false);
    }
  }

  function share() {
    setNote("");
    const link = document.createElement("a");
    link.href = `https://wa.me/?text=${encodeURIComponent(text)}`;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    link.remove();
    setNote("O WhatsApp abriu com a lista. Escolha o grupo.");
  }

  function copy() {
    setNote("");
    const area = preview.current;
    if (area) {
      area.focus();
      area.select();
    }
    let copied = false;
    try {
      copied = document.execCommand("copy");
    } catch {
      copied = false;
    }
    if (copied) {
      setNote("Lista copiada.");
      return;
    }
    if (!navigator.clipboard) {
      setNote("Selecione o texto e copie manualmente.");
      return;
    }
    void navigator.clipboard.writeText(text).then(
      () => setNote("Lista copiada."),
      () => setNote("Selecione o texto e copie manualmente."),
    );
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
            {text ? (
              <Check>
                <input
                  type="checkbox"
                  checked={barbecue}
                  onChange={(event) => {
                    const marked = event.target.checked;
                    setBarbecue(marked);
                    if (source) setText(compose(source, marked));
                  }}
                />
                Dia de churrasco
              </Check>
            ) : null}
            {text ? <Preview ref={preview} readOnly value={text} aria-label="Texto da lista" /> : null}
            {note ? <Muted>{note}</Muted> : null}
            <Actions>
              <GhostButton type="button" onClick={() => setOpen(false)}>
                Fechar
              </GhostButton>
              {text ? (
                <GhostButton type="button" onClick={copy} disabled={sending}>
                  Copiar
                </GhostButton>
              ) : null}
              {text ? (
                <GhostButton type="button" onClick={testBot} disabled={sending}>
                  {sending ? "Enviando..." : "Testar o bot"}
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

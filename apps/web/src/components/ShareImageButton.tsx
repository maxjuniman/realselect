"use client";

import { useState } from "react";
import styled from "styled-components";
import { copyPng, downloadPng } from "@/lib/share-image";
import { ErrorText, GhostButton, Muted, PrimaryButton } from "@/styles/ui";

const Box = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  max-width: 280px;
  p {
    margin: 0;
  }
`;

const IconButton = styled.button`
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  border: 1px solid ${({ theme }) => theme.ink};
  padding: 0;
  background: transparent;
  color: ${({ theme }) => theme.ink};
  cursor: pointer;
  &:hover:not(:disabled) {
    color: ${({ theme }) => theme.purpleDeep};
    border-color: ${({ theme }) => theme.purpleDeep};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.purpleDeep};
    outline-offset: 2px;
  }
  &:disabled {
    opacity: 0.45;
    cursor: default;
  }
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
  width: min(420px, 100%);
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

const Choices = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

function ShareIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 16V4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M7.5 8.5 12 4l4.5 4.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 13v6a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function ShareImageButton({
  disabled,
  filename,
  onImage,
}: {
  disabled?: boolean;
  filename: string;
  onImage: () => Promise<Blob>;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  function close() {
    if (busy) return;
    setOpen(false);
    setError("");
  }

  async function run(mode: "download" | "copy") {
    setBusy(true);
    setNote("");
    setError("");
    const image = onImage();
    try {
      if (mode === "copy") {
        await copyPng(image);
        setNote("A imagem foi copiada. No WhatsApp, cole na conversa.");
      } else {
        await downloadPng(await image, filename);
        setNote("A imagem foi baixada. No WhatsApp, anexe esse arquivo na conversa.");
      }
      setOpen(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível gerar a imagem.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Box>
      <IconButton type="button" aria-label="Compartilhar" disabled={disabled || busy} onClick={() => { setError(""); setOpen(true); }}>
        <ShareIcon />
      </IconButton>
      {error && !open ? <ErrorText>{error}</ErrorText> : null}
      {note ? <Muted>{note}</Muted> : null}
      {open ? (
        <Backdrop onMouseDown={close}>
          <Dialog role="dialog" aria-modal="true" aria-labelledby="share-image-title" onMouseDown={(event) => event.stopPropagation()}>
            <h2 id="share-image-title">Compartilhar</h2>
            <Muted>Baixe o arquivo ou copie a imagem para colar no WhatsApp.</Muted>
            {error ? <ErrorText>{error}</ErrorText> : null}
            <Choices>
              <GhostButton type="button" disabled={busy} onClick={() => run("download")}>
                {busy ? "Gerando..." : "Baixar"}
              </GhostButton>
              <PrimaryButton type="button" disabled={busy} onClick={() => run("copy")}>
                {busy ? "Gerando..." : "Copiar"}
              </PrimaryButton>
            </Choices>
            <GhostButton type="button" onClick={close}>
              Fechar
            </GhostButton>
          </Dialog>
        </Backdrop>
      ) : null}
    </Box>
  );
}

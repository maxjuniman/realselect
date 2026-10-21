"use client";

import { useState } from "react";
import styled from "styled-components";
import { ErrorText, GhostButton, Muted } from "@/styles/ui";

const Box = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  max-width: 360px;
  p {
    margin: 0;
  }
`;

export function ShareImageButton({
  disabled,
  onShare,
}: {
  disabled?: boolean;
  onShare: () => Promise<"shared" | "downloaded">;
}) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  async function share() {
    setBusy(true);
    setNote("");
    setError("");
    try {
      const result = await onShare();
      if (result === "downloaded") setNote("A imagem foi baixada. No WhatsApp, anexe esse arquivo na conversa.");
    } catch (caught) {
      if (caught instanceof Error && caught.name === "AbortError") return;
      setError(caught instanceof Error ? caught.message : "Não foi possível compartilhar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Box>
      <GhostButton type="button" disabled={disabled || busy} onClick={share}>
        {busy ? "Gerando imagem..." : "Compartilhar no WhatsApp"}
      </GhostButton>
      {error ? <ErrorText>{error}</ErrorText> : null}
      {note ? <Muted>{note}</Muted> : null}
    </Box>
  );
}

"use client";

import { useEffect, useState } from "react";
import styled from "styled-components";
import { clientApi } from "@/lib/client";
import { formatShortDate } from "@/lib/format";
import { photoUrl } from "@/lib/photo";
import { ErrorText, Muted, PageTitle, Stack } from "@/styles/ui";

type AccessRow = {
  id: string;
  name: string;
  nickname: string | null;
  birthDate: string | null;
  photo: string | null;
  positions: string[];
  access: "pending" | "approved" | "denied";
};

const labels = { pending: "Esperando", approved: "Liberado", denied: "Recusado" };

export default function AccessPage() {
  const [rows, setRows] = useState<AccessRow[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  async function load() {
    const data = await clientApi<AccessRow[]>("/admin/player-access");
    setRows(data);
  }

  useEffect(() => {
    load().catch((caught: Error) => setError(caught.message));
  }, []);

  async function decide(playerId: string, access: "approved" | "denied") {
    setBusy(playerId);
    setError("");
    try {
      await clientApi("/admin/player-access", { method: "POST", body: JSON.stringify({ playerId, access }) });
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível salvar a decisão.");
    } finally {
      setBusy("");
    }
  }

  return (
    <Stack>
      <PageTitle>Acessos</PageTitle>
      <Muted>O jogador se cadastra na tela de login. Aqui você libera ou recusa a entrada.</Muted>
      {error ? <ErrorText>{error}</ErrorText> : null}
      {rows.length ? (
        <List>
          {rows.map((row) => (
            <Row key={row.id}>
              {row.photo ? <Face src={photoUrl(row.photo)} alt="" /> : <Face as="span" />}
              <Who>
                <strong>{row.name}{row.nickname ? ` · ${row.nickname}` : ""}</strong>
                <Status>
                  {labels[row.access]}
                  {row.positions.length ? ` · ${row.positions.join(" · ")}` : ""}
                  {row.birthDate ? ` · ${formatShortDate(row.birthDate)}` : ""}
                </Status>
              </Who>
              <Actions>
                {row.access === "approved" ? null : (
                  <TextButton type="button" disabled={busy === row.id} onClick={() => decide(row.id, "approved")}>
                    Aprovar
                  </TextButton>
                )}
                {row.access === "denied" ? null : (
                  <TextButton type="button" disabled={busy === row.id} onClick={() => decide(row.id, "denied")}>
                    Recusar
                  </TextButton>
                )}
              </Actions>
            </Row>
          ))}
        </List>
      ) : (
        <Muted>Nenhum cadastro por enquanto.</Muted>
      )}
    </Stack>
  );
}

const List = styled.div`
  display: flex;
  flex-direction: column;
`;

const Row = styled.div`
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  padding: 12px 0;
  border-top: 1px solid ${({ theme }) => theme.line};
`;

const Face = styled.img`
  width: 44px;
  height: 44px;
  object-fit: cover;
  border-radius: 8px;
  background: ${({ theme }) => theme.line};
`;

const Who = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
`;

const Status = styled.span`
  color: ${({ theme }) => theme.muted};
  font-size: 14px;
`;

const Actions = styled.div`
  display: flex;
  gap: 14px;
`;

const TextButton = styled.button`
  border: 0;
  padding: 0;
  background: transparent;
  color: ${({ theme }) => theme.purpleDeep};
  font: inherit;
  font-weight: 700;
  cursor: pointer;
  &:disabled {
    opacity: 0.5;
  }
`;

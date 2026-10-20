"use client";

import { useEffect, useState } from "react";
import styled from "styled-components";
import { clientApi } from "@/lib/client";
import { formatShortDate } from "@/lib/format";
import type { PlayerRef } from "@/lib/types";
import { ButtonLink, ErrorText, Muted, PageTitle, SectionTitle, Select, Stack } from "@/styles/ui";

type AccessRow = {
  id: string;
  name: string;
  birthDate: string | null;
  access: "pending" | "approved" | "denied";
  player: { id: string; name: string } | null;
};

const labels = { pending: "Esperando", approved: "Liberado", denied: "Recusado" };

export default function AccessPage() {
  const [rows, setRows] = useState<AccessRow[]>([]);
  const [players, setPlayers] = useState<PlayerRef[]>([]);
  const [choice, setChoice] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  async function load() {
    const [data, roster] = await Promise.all([
      clientApi<AccessRow[]>("/admin/player-access"),
      clientApi<PlayerRef[]>("/players"),
    ]);
    setRows(data);
    setPlayers(roster.filter((player) => player.name !== "Gol contra"));
  }

  useEffect(() => {
    load().catch((caught: Error) => setError(caught.message));
  }, []);

  async function decide(accountId: string, access: "approved" | "denied", playerId?: string) {
    setBusy(accountId);
    setError("");
    try {
      await clientApi("/admin/player-access", { method: "POST", body: JSON.stringify({ accountId, access, playerId: playerId || null }) });
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
      <Muted>O cadastro não cria jogador. Vincule o pedido a alguém que já está na lista.</Muted>
      {error ? <ErrorText>{error}</ErrorText> : null}
      {rows.length ? (
        <List>
          {rows.map((row) => {
            const selected = choice[row.id] ?? row.player?.id ?? "";
            return (
              <Row key={row.id}>
                <Who>
                  <strong>{row.name}</strong>
                  <Status>
                    {labels[row.access]}
                    {row.birthDate ? ` · ${formatShortDate(row.birthDate)}` : ""}
                    {row.player ? ` · ${row.player.name}` : ""}
                  </Status>
                </Who>
                <Select value={selected} onChange={(event) => setChoice((current) => ({ ...current, [row.id]: event.target.value }))}>
                  <option value="">Escolher jogador</option>
                  {players.map((player) => (
                    <option key={player.id} value={player.id}>
                      {player.name}
                    </option>
                  ))}
                </Select>
                <Actions>
                  {row.access === "approved" && selected === row.player?.id ? null : (
                    <TextButton type="button" disabled={busy === row.id || !selected} onClick={() => decide(row.id, "approved", selected)}>
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
            );
          })}
        </List>
      ) : (
        <Muted>Nenhum cadastro por enquanto.</Muted>
      )}

      <SectionTitle>Organizadores</SectionTitle>
      <Muted>Nome, e-mail e senha de quem organiza ficam em Usuários.</Muted>
      <ButtonLink href="/admin/usuarios">Abrir usuários</ButtonLink>
    </Stack>
  );
}

const List = styled.div`
  display: flex;
  flex-direction: column;
`;

const Row = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(180px, 240px) auto;
  gap: 12px;
  align-items: center;
  padding: 12px 0;
  border-top: 1px solid ${({ theme }) => theme.line};
  @media (max-width: 720px) {
    grid-template-columns: 1fr;
  }
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

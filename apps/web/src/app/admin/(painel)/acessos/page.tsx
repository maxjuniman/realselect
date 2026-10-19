"use client";

import { FormEvent, useEffect, useState } from "react";
import styled from "styled-components";
import { clientApi } from "@/lib/client";
import { formatShortDate } from "@/lib/format";
import type { PlayerRef } from "@/lib/types";
import { ErrorText, Field, Muted, PageTitle, PrimaryButton, SectionTitle, Select, Stack, TextInput } from "@/styles/ui";

type AccessRow = {
  id: string;
  name: string;
  birthDate: string | null;
  access: "pending" | "approved" | "denied";
  player: { id: string; name: string } | null;
};

type Organizer = { id: string; name: string; email: string };

const labels = { pending: "Esperando", approved: "Liberado", denied: "Recusado" };

export default function AccessPage() {
  const [rows, setRows] = useState<AccessRow[]>([]);
  const [players, setPlayers] = useState<PlayerRef[]>([]);
  const [choice, setChoice] = useState<Record<string, string>>({});
  const [organizers, setOrganizers] = useState<Organizer[]>([]);
  const [orgName, setOrgName] = useState("");
  const [orgEmail, setOrgEmail] = useState("");
  const [orgPassword, setOrgPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  async function load() {
    const [data, users, roster] = await Promise.all([
      clientApi<AccessRow[]>("/admin/player-access"),
      clientApi<Organizer[]>("/admin/organizers"),
      clientApi<PlayerRef[]>("/players"),
    ]);
    setRows(data);
    setOrganizers(users);
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

  async function createOrganizer(event: FormEvent) {
    event.preventDefault();
    setBusy("organizer");
    setError("");
    try {
      await clientApi("/admin/organizers", {
        method: "POST",
        body: JSON.stringify({ name: orgName, email: orgEmail, password: orgPassword }),
      });
      setOrgName("");
      setOrgEmail("");
      setOrgPassword("");
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível criar o organizador.");
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
      <Muted>Quem organiza entra com o e-mail na mesma tela de login.</Muted>
      <OrgList>
        {organizers.map((organizer) => (
          <OrgRow key={organizer.id}>
            <strong>{organizer.name}</strong>
            <Status>{organizer.email}</Status>
          </OrgRow>
        ))}
      </OrgList>
      <OrgForm onSubmit={createOrganizer}>
        <Field>
          Nome
          <TextInput value={orgName} onChange={(event) => setOrgName(event.target.value)} required />
        </Field>
        <Field>
          E-mail
          <TextInput type="email" value={orgEmail} onChange={(event) => setOrgEmail(event.target.value)} required />
        </Field>
        <Field>
          Senha
          <TextInput type="password" autoComplete="new-password" value={orgPassword} onChange={(event) => setOrgPassword(event.target.value)} required minLength={4} />
        </Field>
        <PrimaryButton disabled={busy === "organizer"}>{busy === "organizer" ? "Criando..." : "Criar organizador"}</PrimaryButton>
      </OrgForm>
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

const OrgList = styled.div`
  display: flex;
  flex-direction: column;
`;

const OrgRow = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 0;
  border-top: 1px solid ${({ theme }) => theme.line};
`;

const OrgForm = styled.form`
  display: grid;
  gap: 12px;
  max-width: 420px;
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

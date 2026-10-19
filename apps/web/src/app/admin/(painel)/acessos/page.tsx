"use client";

import { FormEvent, useEffect, useState } from "react";
import styled from "styled-components";
import { clientApi } from "@/lib/client";
import { formatShortDate } from "@/lib/format";
import { photoUrl } from "@/lib/photo";
import { ErrorText, Field, Muted, PageTitle, PrimaryButton, SectionTitle, Stack, TextInput } from "@/styles/ui";

type AccessRow = {
  id: string;
  name: string;
  nickname: string | null;
  birthDate: string | null;
  photo: string | null;
  positions: string[];
  access: "pending" | "approved" | "denied";
};

type Organizer = { id: string; name: string; email: string };

const labels = { pending: "Esperando", approved: "Liberado", denied: "Recusado" };

export default function AccessPage() {
  const [rows, setRows] = useState<AccessRow[]>([]);
  const [organizers, setOrganizers] = useState<Organizer[]>([]);
  const [orgName, setOrgName] = useState("");
  const [orgEmail, setOrgEmail] = useState("");
  const [orgPassword, setOrgPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  async function load() {
    const [data, users] = await Promise.all([
      clientApi<AccessRow[]>("/admin/player-access"),
      clientApi<Organizer[]>("/admin/organizers"),
    ]);
    setRows(data);
    setOrganizers(users);
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

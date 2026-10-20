"use client";

import { FormEvent, useEffect, useState } from "react";
import styled from "styled-components";
import { useSession } from "@/components/Session";
import { clientApi } from "@/lib/client";
import { formatShortDate } from "@/lib/format";
import type { PlayerRef } from "@/lib/types";
import { DangerButton, ErrorText, Field, GhostButton, Muted, PageTitle, PrimaryButton, SectionTitle, Select, Stack, TextInput } from "@/styles/ui";

type Organizer = { id: string; name: string; email: string };
type AccessRow = {
  id: string;
  name: string;
  birthDate: string | null;
  access: "pending" | "approved" | "denied";
  player: { id: string; name: string } | null;
};

type Editor =
  | { kind: "create" }
  | { kind: "organizer"; id: string }
  | { kind: "remove"; id: string }
  | { kind: "player"; id: string }
  | { kind: "revoke"; id: string };

const labels = { pending: "Esperando", approved: "Liberado", denied: "Recusado" };

export default function UsersPage() {
  const session = useSession();
  const [organizers, setOrganizers] = useState<Organizer[]>([]);
  const [rows, setRows] = useState<AccessRow[]>([]);
  const [players, setPlayers] = useState<PlayerRef[]>([]);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [playerId, setPlayerId] = useState("");
  const [choice, setChoice] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [deciding, setDeciding] = useState("");

  const mine = session?.role === "admin" ? session.id : "";

  async function load() {
    const [users, access, roster] = await Promise.all([
      clientApi<Organizer[]>("/admin/organizers"),
      clientApi<AccessRow[]>("/admin/player-access"),
      clientApi<PlayerRef[]>("/players"),
    ]);
    setOrganizers(users);
    setRows(access);
    setPlayers(roster.filter((player) => player.name !== "Gol contra"));
  }

  useEffect(() => {
    load().catch((caught: Error) => setError(caught.message));
  }, []);

  function close() {
    setEditor(null);
    setError("");
  }

  function openOrganizer(organizer?: Organizer) {
    setError("");
    setName(organizer?.name ?? "");
    setEmail(organizer?.email ?? "");
    setPassword("");
    setEditor(organizer ? { kind: "organizer", id: organizer.id } : { kind: "create" });
  }

  function openPlayer(row: AccessRow) {
    setError("");
    setName(row.name);
    setBirthDate(row.birthDate ?? "");
    setPlayerId(row.player?.id ?? "");
    setPassword("");
    setEditor({ kind: "player", id: row.id });
  }

  async function saveOrganizer(event: FormEvent) {
    event.preventDefault();
    if (!editor || (editor.kind !== "organizer" && editor.kind !== "create")) return;
    setBusy(true);
    setError("");
    try {
      const body = { name, email, ...(password ? { password } : {}) };
      if (editor.kind === "create") {
        await clientApi("/admin/organizers", { method: "POST", body: JSON.stringify({ ...body, password }) });
      } else {
        await clientApi(`/admin/organizers/${editor.id}`, { method: "PATCH", body: JSON.stringify(body) });
      }
      close();
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível salvar o organizador.");
    } finally {
      setBusy(false);
    }
  }

  async function removeOrganizer() {
    if (editor?.kind !== "remove") return;
    setBusy(true);
    setError("");
    try {
      await clientApi(`/admin/organizers/${editor.id}`, { method: "DELETE" });
      close();
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível remover o organizador.");
    } finally {
      setBusy(false);
    }
  }

  async function decide(accountId: string, access: "approved" | "denied", linkedId?: string) {
    setDeciding(accountId);
    setError("");
    try {
      await clientApi("/admin/player-access", {
        method: "POST",
        body: JSON.stringify({ accountId, access, playerId: linkedId || null }),
      });
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível salvar a decisão.");
    } finally {
      setDeciding("");
    }
  }

  async function savePlayer(event: FormEvent) {
    event.preventDefault();
    if (editor?.kind !== "player") return;
    setBusy(true);
    setError("");
    try {
      await clientApi(`/admin/player-access/${editor.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name,
          birthDate: birthDate || null,
          playerId: playerId || null,
          ...(password ? { password } : {}),
        }),
      });
      close();
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível salvar o jogador.");
    } finally {
      setBusy(false);
    }
  }

  async function revokePlayer() {
    if (editor?.kind !== "revoke") return;
    setBusy(true);
    setError("");
    try {
      await clientApi("/admin/player-access", {
        method: "POST",
        body: JSON.stringify({ accountId: editor.id, access: "denied" }),
      });
      close();
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível tirar o acesso.");
    } finally {
      setBusy(false);
    }
  }

  const removing = editor?.kind === "remove" ? organizers.find((item) => item.id === editor.id) : null;
  const revoking = editor?.kind === "revoke" ? rows.find((item) => item.id === editor.id) : null;
  const editing = editor?.kind === "player" ? rows.find((item) => item.id === editor.id) : null;

  return (
    <Stack>
      <PageTitle>Usuários</PageTitle>
      <Muted>Quem pode entrar no painel. Organizador entra com o e-mail. Jogador entra com o nome, depois que o cadastro for aprovado.</Muted>
      {error && !editor ? <ErrorText>{error}</ErrorText> : null}

      <Head>
        <SectionTitle>Organizadores</SectionTitle>
        <GhostButton type="button" onClick={() => openOrganizer()}>
          Novo organizador
        </GhostButton>
      </Head>
      <List>
        {organizers.map((organizer) => (
          <Row key={organizer.id}>
            <Who>
              <strong>
                {organizer.name}
                {organizer.id === mine ? " · você" : ""}
              </strong>
              <Status>{organizer.email}</Status>
            </Who>
            <Actions>
              <TextButton type="button" aria-label={`Editar ${organizer.name}`} onClick={() => openOrganizer(organizer)}>
                Editar
              </TextButton>
              {organizer.id === mine ? null : (
                <TextButton type="button" aria-label={`Remover ${organizer.name}`} onClick={() => setEditor({ kind: "remove", id: organizer.id })}>
                  Remover
                </TextButton>
              )}
            </Actions>
          </Row>
        ))}
      </List>

      <SectionTitle>Jogadores</SectionTitle>
      <Muted>O cadastro não cria jogador. Vincule o pedido a alguém que já está na lista.</Muted>
      {rows.length ? (
        <List>
          {rows.map((row) => {
            const selected = choice[row.id] ?? row.player?.id ?? "";
            const sameApproved = row.access === "approved" && selected === row.player?.id;
            return (
              <PlayerRow key={row.id} $linked={row.access === "approved"}>
                <Who>
                  <strong>{row.name}</strong>
                  <Status>
                    {labels[row.access]}
                    {row.birthDate ? ` · ${formatShortDate(row.birthDate)}` : ""}
                    {row.player ? ` · ${row.player.name}` : ""}
                  </Status>
                </Who>
                {row.access === "approved" ? null : (
                  <Select aria-label={`Vincular ${row.name}`} value={selected} onChange={(event) => setChoice((current) => ({ ...current, [row.id]: event.target.value }))}>
                    <option value="">Escolher jogador</option>
                    {players.map((player) => (
                      <option key={player.id} value={player.id}>
                        {player.name}
                      </option>
                    ))}
                  </Select>
                )}
                <Actions>
                  {sameApproved ? null : (
                    <TextButton type="button" aria-label={`Aprovar ${row.name}`} disabled={deciding === row.id || !selected} onClick={() => decide(row.id, "approved", selected)}>
                      Aprovar
                    </TextButton>
                  )}
                  {row.access === "denied" ? null : row.access === "approved" ? (
                    <TextButton type="button" aria-label={`Tirar acesso de ${row.name}`} onClick={() => setEditor({ kind: "revoke", id: row.id })}>
                      Tirar acesso
                    </TextButton>
                  ) : (
                    <TextButton type="button" aria-label={`Recusar ${row.name}`} disabled={deciding === row.id} onClick={() => decide(row.id, "denied")}>
                      Recusar
                    </TextButton>
                  )}
                  <TextButton type="button" aria-label={`Editar ${row.name}`} onClick={() => openPlayer(row)}>
                    Editar
                  </TextButton>
                </Actions>
              </PlayerRow>
            );
          })}
        </List>
      ) : (
        <Muted>Nenhum cadastro por enquanto.</Muted>
      )}

      {editor?.kind === "create" || editor?.kind === "organizer" ? (
        <Backdrop onMouseDown={close}>
          <Dialog aria-modal="true" aria-labelledby="user-dialog-title" onMouseDown={(event) => event.stopPropagation()} onSubmit={saveOrganizer}>
            <DialogHead>
              <h2 id="user-dialog-title">{editor.kind === "create" ? "Novo organizador" : "Editar organizador"}</h2>
              <GhostButton type="button" onClick={close}>
                Fechar
              </GhostButton>
            </DialogHead>
            <Field>
              Nome
              <TextInput value={name} onChange={(event) => setName(event.target.value)} required />
            </Field>
            <Field>
              E-mail
              <TextInput type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
            </Field>
            <Field>
              {editor.kind === "create" ? "Senha" : "Nova senha"}
              <TextInput
                type="password"
                autoComplete="new-password"
                value={password}
                minLength={4}
                required={editor.kind === "create"}
                placeholder={editor.kind === "organizer" ? "Em branco mantém a atual" : ""}
                onChange={(event) => setPassword(event.target.value)}
              />
            </Field>
            {error ? <ErrorText>{error}</ErrorText> : null}
            <PrimaryButton disabled={busy}>{busy ? "Salvando..." : "Salvar"}</PrimaryButton>
          </Dialog>
        </Backdrop>
      ) : null}

      {editor?.kind === "player" ? (
        <Backdrop onMouseDown={close}>
          <Dialog aria-modal="true" aria-labelledby="player-user-title" onMouseDown={(event) => event.stopPropagation()} onSubmit={savePlayer}>
            <DialogHead>
              <h2 id="player-user-title">Editar jogador</h2>
              <GhostButton type="button" onClick={close}>
                Fechar
              </GhostButton>
            </DialogHead>
            <Field>
              Nome de login
              <TextInput value={name} onChange={(event) => setName(event.target.value)} required />
            </Field>
            <Field>
              Nascimento
              <TextInput type="date" value={birthDate} onChange={(event) => setBirthDate(event.target.value)} />
            </Field>
            <Field>
              Jogador vinculado
              <Select value={playerId} onChange={(event) => setPlayerId(event.target.value)} required={editing?.access === "approved"}>
                <option value="">Escolher jogador</option>
                {players.map((player) => (
                  <option key={player.id} value={player.id}>
                    {player.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field>
              Nova senha
              <TextInput
                type="password"
                autoComplete="new-password"
                minLength={4}
                value={password}
                placeholder="Em branco mantém a atual"
                onChange={(event) => setPassword(event.target.value)}
              />
            </Field>
            {error ? <ErrorText>{error}</ErrorText> : null}
            <PrimaryButton disabled={busy || (editing?.access === "approved" && !playerId)}>{busy ? "Salvando..." : "Salvar"}</PrimaryButton>
          </Dialog>
        </Backdrop>
      ) : null}

      {removing ? (
        <Backdrop onMouseDown={close}>
          <Dialog as="div" role="dialog" aria-modal="true" aria-labelledby="remove-user-title" onMouseDown={(event) => event.stopPropagation()}>
            <DialogHead>
              <h2 id="remove-user-title">Remover acesso</h2>
            </DialogHead>
            <Muted>
              {removing.name} deixa de entrar com {removing.email}.
            </Muted>
            {error ? <ErrorText>{error}</ErrorText> : null}
            <DialogActions>
              <GhostButton type="button" onClick={close}>
                Cancelar
              </GhostButton>
              <DangerButton type="button" disabled={busy} onClick={removeOrganizer}>
                {busy ? "Removendo..." : "Confirmar remoção"}
              </DangerButton>
            </DialogActions>
          </Dialog>
        </Backdrop>
      ) : null}

      {revoking ? (
        <Backdrop onMouseDown={close}>
          <Dialog as="div" role="dialog" aria-modal="true" aria-labelledby="revoke-user-title" onMouseDown={(event) => event.stopPropagation()}>
            <DialogHead>
              <h2 id="revoke-user-title">Tirar acesso</h2>
            </DialogHead>
            <Muted>{revoking.name} deixa de entrar no painel. O cadastro fica recusado.</Muted>
            {error ? <ErrorText>{error}</ErrorText> : null}
            <DialogActions>
              <GhostButton type="button" onClick={close}>
                Cancelar
              </GhostButton>
              <DangerButton type="button" disabled={busy} onClick={revokePlayer}>
                {busy ? "Salvando..." : "Confirmar"}
              </DangerButton>
            </DialogActions>
          </Dialog>
        </Backdrop>
      ) : null}
    </Stack>
  );
}

const Head = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-end;
  flex-wrap: wrap;
`;

const List = styled.div`
  display: flex;
  flex-direction: column;
`;

const Row = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  padding: 12px 0;
  border-top: 1px solid ${({ theme }) => theme.line};
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

const PlayerRow = styled.div<{ $linked?: boolean }>`
  display: grid;
  grid-template-columns: ${({ $linked }) => ($linked ? "minmax(0, 1fr) auto" : "minmax(0, 1fr) minmax(180px, 240px) auto")};
  gap: 12px;
  align-items: center;
  padding: 12px 0;
  border-top: 1px solid ${({ theme }) => theme.line};
  @media (max-width: 720px) {
    grid-template-columns: 1fr;
  }
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

const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 30;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgba(28, 16, 34, 0.46);
`;

const Dialog = styled.form`
  width: min(420px, 100%);
  background: ${({ theme }) => theme.paper};
  padding: 22px 22px 26px;
  display: flex;
  flex-direction: column;
  gap: 14px;
`;

const DialogHead = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
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

const DialogActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
`;

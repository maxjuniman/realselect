"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { clientApi } from "@/lib/client";
import { GROUPS, POSITIONS, positionRank, type GroupId } from "@/lib/roster";
import type { PlayerRef } from "@/lib/types";
import { ErrorText, Field, Muted, PageTitle, PanelHead, PrimaryButton, Select, Stack, TextInput } from "@/styles/ui";

function groupOf(player: PlayerRef): GroupId {
  if (!player.active) return "inativo";
  return player.squad === "suplente" ? "suplente" : "mensalista";
}

type Draft = {
  id?: string;
  name: string;
  group: GroupId;
  first: string;
  second: string;
};

const emptyDraft = (): Draft => ({ name: "", group: "mensalista", first: "", second: "" });

export default function PlayersAdminPage() {
  const [players, setPlayers] = useState<PlayerRef[]>([]);
  const [open, setOpen] = useState<Record<GroupId, boolean>>({
    mensalista: true,
    suplente: true,
    inativo: false,
  });
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState("");

  async function load() {
    const data = await clientApi<PlayerRef[]>("/players");
    setPlayers(data);
  }

  useEffect(() => {
    load().catch((caught: Error) => setError(caught.message));
  }, []);

  useEffect(() => {
    if (!draft) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setDraft(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [draft]);

  const grouped = useMemo(() => {
    return GROUPS.map((item) => ({
      ...item,
      players: players
        .filter((player) => groupOf(player) === item.id)
        .sort((a, b) => positionRank(a.positions?.[0]) - positionRank(b.positions?.[0]) || a.name.localeCompare(b.name, "pt-BR")),
    }));
  }, [players]);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!draft) return;
    setError("");
    const positions = [draft.first, draft.second].filter(Boolean);
    try {
      if (draft.id) {
        await clientApi(`/admin/players/${draft.id}`, {
          method: "PATCH",
          body: JSON.stringify({ name: draft.name, positions }),
        });
      } else {
        await clientApi("/admin/players", {
          method: "POST",
          body: JSON.stringify({
            name: draft.name,
            active: draft.group !== "inativo",
            squad: draft.group === "suplente" ? "suplente" : "mensalista",
            positions,
          }),
        });
      }
      setDraft(null);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível salvar.");
    }
  }

  async function move(player: PlayerRef, next: GroupId) {
    setError("");
    try {
      await clientApi(`/admin/players/${player.id}`, {
        method: "PATCH",
        body: JSON.stringify(next === "inativo" ? { active: false } : { active: true, squad: next }),
      });
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível mover o jogador.");
    }
  }

  function edit(player: PlayerRef) {
    setError("");
    setDraft({
      id: player.id,
      name: player.name,
      group: groupOf(player),
      first: player.positions?.[0] ?? "",
      second: player.positions?.[1] ?? "",
    });
  }

  return (
    <Stack>
      <PanelHead $flush>
        <PageTitle>Jogadores</PageTitle>
        <AddButton type="button" aria-label="Adicionar jogador" onClick={() => { setError(""); setDraft(emptyDraft()); }}>
          <PlusIcon />
        </AddButton>
      </PanelHead>
      {error && !draft ? <ErrorText>{error}</ErrorText> : null}
      <Groups>
        {grouped.map((item) => (
          <Group key={item.id}>
            <GroupButton type="button" aria-expanded={open[item.id]} onClick={() => setOpen((current) => ({ ...current, [item.id]: !current[item.id] }))}>
              <Chevron $open={open[item.id]} />
              <GroupName>{item.label}</GroupName>
              <Count>{item.players.length}</Count>
            </GroupButton>
            {open[item.id] ? (
              item.players.length ? (
                <List>
                  {item.players.map((player) => {
                    const positions = player.positions ?? [];
                    return (
                      <Row key={player.id}>
                        <Who>
                          <Name>{player.name}</Name>
                          <Spot>{positions.length ? positions.join(" · ") : "Sem posição"}</Spot>
                        </Who>
                        <Tools>
                          <IconButton type="button" aria-label={`Editar ${player.name}`} title="Editar" onClick={() => edit(player)}>
                            <PencilIcon />
                          </IconButton>
                          {GROUPS.filter((option) => option.id !== item.id).map((option) => (
                            <IconButton
                              key={option.id}
                              type="button"
                              aria-label={`Mover ${player.name} para ${option.label.toLowerCase()}`}
                              title={option.label}
                              onClick={() => move(player, option.id)}
                            >
                              <GroupIcon group={option.id} />
                            </IconButton>
                          ))}
                        </Tools>
                      </Row>
                    );
                  })}
                </List>
              ) : (
                <Muted>Nenhum jogador neste grupo.</Muted>
              )
            ) : null}
          </Group>
        ))}
      </Groups>

      {draft ? (
        <Backdrop onMouseDown={() => setDraft(null)}>
          <Dialog role="dialog" aria-modal="true" aria-labelledby="player-dialog-title" onMouseDown={(event) => event.stopPropagation()} onSubmit={save}>
            <DialogHead>
              <h2 id="player-dialog-title">{draft.id ? "Editar jogador" : "Novo jogador"}</h2>
              <IconButton type="button" aria-label="Fechar" onClick={() => setDraft(null)}>
                <CloseIcon />
              </IconButton>
            </DialogHead>
            <Field>
              Nome
              <TextInput value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} required autoFocus />
            </Field>
            {draft.id ? null : (
              <Field>
                Grupo
                <Select value={draft.group} onChange={(event) => setDraft({ ...draft, group: event.target.value as GroupId })}>
                  <option value="mensalista">Mensalista</option>
                  <option value="suplente">Suplente</option>
                  <option value="inativo">Inativo</option>
                </Select>
              </Field>
            )}
            <Field>
              1ª posição
              <Select value={draft.first} onChange={(event) => setDraft({ ...draft, first: event.target.value, second: event.target.value === draft.second ? "" : draft.second })}>
                <option value="">Sem posição</option>
                {POSITIONS.map((position) => (
                  <option key={position} value={position}>
                    {position}
                  </option>
                ))}
              </Select>
            </Field>
            <Field>
              2ª posição
              <Select value={draft.second} onChange={(event) => setDraft({ ...draft, second: event.target.value })}>
                <option value="">Nenhuma</option>
                {POSITIONS.filter((position) => position !== draft.first).map((position) => (
                  <option key={position} value={position}>
                    {position}
                  </option>
                ))}
              </Select>
            </Field>
            {error ? <ErrorText>{error}</ErrorText> : null}
            <PrimaryButton>{draft.id ? "Salvar" : "Adicionar"}</PrimaryButton>
          </Dialog>
        </Backdrop>
      ) : null}
    </Stack>
  );
}

function GroupIcon({ group }: { group: GroupId }) {
  if (group === "mensalista") return <StarIcon />;
  if (group === "suplente") return <SwapIcon />;
  return <IdleIcon />;
}

function PlusIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 20l4.1-1L19 8.1 15.9 5 5.1 15.9 4 20z" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="m13.8 7.1 3.1 3.1" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path d="m12 3.6 2.1 4.5 4.9.7-3.5 3.4.8 4.9L12 14.8 7.7 17.1l.8-4.9L5 8.8l4.9-.7L12 3.6z" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function SwapIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 8h11l-3.2-3.2M17 16H6l3.2 3.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function IdleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="8" r="3" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M6.5 19c1.1-2.3 3-3.5 5.5-3.5s4.4 1.2 5.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M5 5l14 14" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function Chevron({ $open }: { $open: boolean }) {
  return (
    <ChevronSvg $open={$open} width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </ChevronSvg>
  );
}

const AddButton = styled.button`
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  border: 0;
  padding: 0;
  background: ${({ theme }) => theme.purpleDeep};
  color: white;
  cursor: pointer;
  &:hover {
    background: ${({ theme }) => theme.purple};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.purpleDeep};
    outline-offset: 3px;
  }
`;

const IconButton = styled.button`
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  border: 0;
  padding: 0;
  background: transparent;
  color: ${({ theme }) => theme.ink};
  cursor: pointer;
  &:hover {
    color: ${({ theme }) => theme.purpleDeep};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.purpleDeep};
    outline-offset: 2px;
  }
`;

const Groups = styled.div`
  display: flex;
  flex-direction: column;
`;

const Group = styled.section`
  border-top: 1px solid ${({ theme }) => theme.ink};
  &:last-child {
    border-bottom: 1px solid ${({ theme }) => theme.ink};
  }
`;

const GroupButton = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 0;
  border: 0;
  background: transparent;
  color: ${({ theme }) => theme.ink};
  cursor: pointer;
  text-align: left;
`;

const GroupName = styled.span`
  font-family: ${({ theme }) => theme.display};
  font-stretch: 87.5%;
  font-weight: 700;
  font-size: 28px;
  letter-spacing: -0.03em;
  line-height: 1;
`;

const Count = styled.span`
  margin-left: auto;
  color: ${({ theme }) => theme.muted};
  font-variant-numeric: tabular-nums;
`;

const ChevronSvg = styled.svg<{ $open: boolean }>`
  transform: rotate(${({ $open }) => ($open ? "0deg" : "-90deg")});
`;

const List = styled.div`
  display: flex;
  flex-direction: column;
  padding-bottom: 8px;
`;

const Row = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  padding: 6px 0 6px 30px;
  border-top: 1px solid ${({ theme }) => theme.line};
`;

const Who = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
`;

const Name = styled.span`
  font-weight: 700;
`;

const Spot = styled.span`
  color: ${({ theme }) => theme.muted};
  font-size: 14px;
`;

const Tools = styled.div`
  display: flex;
  align-items: center;
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

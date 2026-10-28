"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import styled from "styled-components";
import { useSession } from "@/components/Session";
import { clientApi } from "@/lib/client";
import { photoUrl, shrinkPhoto } from "@/lib/photo";
import { GROUPS, POSITIONS, positionRank, type GroupId } from "@/lib/roster";
import type { PlayerRef } from "@/lib/types";
import { ErrorText, Field, Muted, PageTitle, PanelHead, PrimaryButton, Search, Select, Stack, TextInput } from "@/styles/ui";

function foldName(value: string) {
  return value.trim().toLocaleLowerCase("pt-BR").normalize("NFD").replace(/\p{M}/gu, "");
}

function groupOf(player: PlayerRef): GroupId {
  if (!player.active) return "inativo";
  return player.squad === "suplente" ? "suplente" : "mensalista";
}

type Draft = {
  id?: string;
  name: string;
  nickname: string;
  birthDate: string;
  photo: string | null;
  photoData: string | null;
  clearPhoto: boolean;
  password: string;
  group: GroupId;
  first: string;
  second: string;
};

const emptyDraft = (): Draft => ({
  name: "",
  nickname: "",
  birthDate: "",
  photo: null,
  photoData: null,
  clearPhoto: false,
  password: "",
  group: "mensalista",
  first: "",
  second: "",
});

export default function PlayersAdminPage() {
  const session = useSession();
  const mine = session?.role === "player";
  const [players, setPlayers] = useState<PlayerRef[]>([]);
  const [open, setOpen] = useState<Record<GroupId, boolean>>({
    mensalista: true,
    suplente: true,
    inativo: false,
  });
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const photoRef = useRef<HTMLInputElement>(null);

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
    const term = foldName(query);
    return GROUPS.map((item) => ({
      ...item,
      players: players
        .filter((player) => groupOf(player) === item.id)
        .filter((player) => !term || foldName(player.name).includes(term) || foldName(player.nickname ?? "").includes(term))
        .sort((a, b) => positionRank(a.positions?.[0]) - positionRank(b.positions?.[0]) || a.name.localeCompare(b.name, "pt-BR")),
    }));
  }, [players, query]);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!draft) return;
    setError("");
    if (draft.password.trim() && draft.password.trim().length < 4) {
      setError("A senha precisa ter pelo menos 4 caracteres.");
      return;
    }
    const positions = [draft.first, draft.second].filter(Boolean);
    const profile = {
      name: draft.name,
      nickname: draft.nickname.trim() || null,
      birthDate: draft.birthDate || null,
      positions,
      ...(draft.photoData ? { photo: draft.photoData } : draft.clearPhoto ? { photo: null } : {}),
      ...(draft.password.trim() ? { password: draft.password.trim() } : {}),
    };
    try {
      if (mine) {
        await clientApi("/me", { method: "PATCH", body: JSON.stringify(profile) });
      } else if (draft.id) {
        await clientApi(`/admin/players/${draft.id}`, {
          method: "PATCH",
          body: JSON.stringify(profile),
        });
      } else {
        await clientApi("/admin/players", {
          method: "POST",
          body: JSON.stringify({
            ...profile,
            active: draft.group !== "inativo",
            squad: draft.group === "suplente" ? "suplente" : "mensalista",
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
        body: JSON.stringify(next === "inativo" ? { active: false, injured: false } : { active: true, squad: next, injured: next === "mensalista" ? Boolean(player.injured) : false }),
      });
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível mover o jogador.");
    }
  }

  async function hurt(player: PlayerRef) {
    setError("");
    try {
      await clientApi(`/admin/players/${player.id}`, {
        method: "PATCH",
        body: JSON.stringify({ injured: !player.injured }),
      });
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível marcar o jogador.");
    }
  }

  function edit(player: PlayerRef) {
    setError("");
    setDraft({
      id: player.id,
      name: player.name,
      nickname: player.nickname ?? "",
      birthDate: player.birthDate ?? "",
      photo: player.photo ?? null,
      photoData: null,
      clearPhoto: false,
      password: "",
      group: groupOf(player),
      first: player.positions?.[0] ?? "",
      second: player.positions?.[1] ?? "",
    });
  }

  async function pickPhoto(file: File | undefined) {
    if (!file || !draft) return;
    if (!file.type.startsWith("image/")) {
      setError("Envie uma imagem.");
      return;
    }
    try {
      const photoData = await shrinkPhoto(file);
      setDraft({ ...draft, photoData, clearPhoto: false });
      setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não consegui ler a foto.");
    }
  }

  const preview = draft?.photoData || (draft && !draft.clearPhoto && draft.photo ? photoUrl(draft.photo) : "");

  if (!session) return null;

  return (
    <Stack>
      <PanelHead $flush>
        <PageTitle>Jogadores</PageTitle>
        {mine ? null : (
          <AddButton type="button" aria-label="Adicionar jogador" onClick={() => { setError(""); setDraft(emptyDraft()); }}>
            <PlusIcon />
          </AddButton>
        )}
      </PanelHead>
      {error && !draft ? <ErrorText>{error}</ErrorText> : null}
      <Search aria-label="Buscar jogador" placeholder="Buscar jogador" value={query} onChange={(event) => setQuery(event.target.value)} />
      {query.trim() && grouped.every((item) => !item.players.length) ? <Muted>Nenhum jogador com esse nome.</Muted> : null}
      <Groups>
        {grouped.filter((item) => !query.trim() || item.players.length).map((item) => (
          <Group key={item.id}>
            <GroupButton type="button" aria-expanded={Boolean(query.trim()) || open[item.id]} onClick={() => setOpen((current) => ({ ...current, [item.id]: !current[item.id] }))}>
              <Chevron $open={Boolean(query.trim()) || open[item.id]} />
              <GroupName>{item.label}</GroupName>
              <Count>{item.players.length}</Count>
            </GroupButton>
            {query.trim() || open[item.id] ? (
              item.players.length ? (
                <List>
                  {item.players.map((player) => {
                    const positions = player.positions ?? [];
                    return (
                      <Row key={player.id}>
                        <Who>
                          {player.photo ? <Face src={photoUrl(player.photo)} alt="" /> : null}
                          <Identity>
                            <Name>{player.name}{player.nickname ? ` · ${player.nickname}` : ""}</Name>
                            <Spot>
                              {player.injured ? "Machucado" : positions.length ? positions.join(" · ") : "Sem posição"}
                            </Spot>
                          </Identity>
                        </Who>
                        <Tools>
                          {mine ? (
                            session && player.id === session.id ? (
                              <IconButton type="button" aria-label="Editar meu cadastro" title="Meu cadastro" onClick={() => edit(player)}>
                                <PencilIcon />
                              </IconButton>
                            ) : null
                          ) : item.id === "mensalista" ? (
                            <HurtButton
                              type="button"
                              $on={Boolean(player.injured)}
                              aria-pressed={Boolean(player.injured)}
                              aria-label={player.injured ? `Tirar machucado de ${player.name}` : `Marcar ${player.name} como machucado`}
                              title={player.injured ? "Machucado" : "Marcar machucado"}
                              onClick={() => hurt(player)}
                            >
                              <HurtIcon $on={Boolean(player.injured)} />
                            </HurtButton>
                          ) : null}
                          {mine ? null : (
                            <>
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
                            </>
                          )}
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
              <h2 id="player-dialog-title">{mine ? "Meu cadastro" : draft.id ? "Editar jogador" : "Novo jogador"}</h2>
              <IconButton type="button" aria-label="Fechar" onClick={() => setDraft(null)}>
                <CloseIcon />
              </IconButton>
            </DialogHead>
            <Field>
              Nome
              <TextInput value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} required autoFocus />
            </Field>
            <Field>
              Apelido
              <TextInput value={draft.nickname} onChange={(event) => setDraft({ ...draft, nickname: event.target.value })} />
            </Field>
            <Field>
              Data de nascimento
              <TextInput type="date" value={draft.birthDate} onChange={(event) => setDraft({ ...draft, birthDate: event.target.value })} />
            </Field>
            <PhotoBlock>
              <span>Foto</span>
              <PhotoButton type="button" aria-label={preview ? "Trocar foto" : "Escolher foto"} onClick={() => photoRef.current?.click()}>
                {preview ? <Portrait src={preview} alt="" /> : <PersonShadow />}
              </PhotoButton>
              {preview ? (
                <TextButton type="button" onClick={() => setDraft({ ...draft, photoData: null, clearPhoto: true, photo: null })}>
                  Tirar foto
                </TextButton>
              ) : null}
              <PhotoFile
                ref={photoRef}
                type="file"
                accept="image/*"
                tabIndex={-1}
                onChange={(event) => {
                  pickPhoto(event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
            </PhotoBlock>
            {mine ? (
              <Field>
                Nova senha
                <TextInput type="password" autoComplete="new-password" value={draft.password} onChange={(event) => setDraft({ ...draft, password: event.target.value })} placeholder="Deixe em branco para manter" />
              </Field>
            ) : null}
            {mine || draft.id ? null : (
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

function HurtIcon({ $on }: { $on: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 8h8v8H8z" fill={$on ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 4v16M4 12h16" fill="none" stroke="currentColor" strokeWidth="1.8" />
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

function PersonShadow() {
  return (
    <svg width="78" height="78" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4zm0 2c-4.4 0-8 2.2-8 5v1h16v-1c0-2.8-3.6-5-8-5z" />
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

const HurtButton = styled.button<{ $on: boolean }>`
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  border: 0;
  padding: 0;
  background: transparent;
  color: ${({ $on, theme }) => ($on ? theme.loss : theme.ink)};
  cursor: pointer;
  &:hover {
    color: ${({ theme }) => theme.loss};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.purpleDeep};
    outline-offset: 2px;
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
  align-items: center;
  gap: 10px;
  min-width: 0;
`;

const Identity = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
`;

const Face = styled.img`
  width: 36px;
  height: 36px;
  object-fit: cover;
  border-radius: 8px;
  background: ${({ theme }) => theme.line};
`;

const PhotoBlock = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  font-weight: 600;
`;

const PhotoButton = styled.button`
  width: 96px;
  height: 96px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  display: grid;
  place-items: center;
  overflow: hidden;
  cursor: pointer;
  color: ${({ theme }) => theme.muted};
  background: ${({ theme }) => theme.line};
`;

const Portrait = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const PhotoFile = styled.input`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  border: 0;
`;

const TextButton = styled.button`
  width: fit-content;
  border: 0;
  padding: 0;
  background: transparent;
  color: ${({ theme }) => theme.purpleDeep};
  font: inherit;
  font-weight: 700;
  cursor: pointer;
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

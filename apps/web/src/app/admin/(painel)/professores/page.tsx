"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import styled from "styled-components";
import { SeasonSelect } from "@/components/SeasonSelect";
import { ShareImageButton } from "@/components/ShareImageButton";
import { buildFutureSlots, lastProfessorId, nextProfessor, skippedProfessors, upcomingTuesdays } from "@/lib/call-list";
import { clientApi } from "@/lib/client";
import { formatShortDate, seasonCodeFromDate } from "@/lib/format";
import { placar, winnerTone } from "@/lib/score";
import { professorsImage, type ProfessorImageRow } from "@/lib/table-image";
import type { MatchDetail, ProfessorRoster, Season } from "@/lib/types";
import { Actions, ErrorText, Field, GhostButton, MiniButton, Muted, PageTitle, PanelHead, PrimaryButton, ScoreText, SectionTitle, Select, Stack, TextInput } from "@/styles/ui";

type Turn = ProfessorRoster["order"][number];

function professorSaldo(match: MatchDetail) {
  const id = match.professor?.id;
  if (!id) return null;
  const player = [...match.teamA, ...match.teamB].find((item) => item.id === id);
  return player ? player.goalDiff : null;
}

function scoreOf(match: MatchDetail) {
  if (match.scoreA !== null && match.scoreB !== null) return `${match.scoreA}x${match.scoreB}`;
  return placar(match);
}

function professorImageRow(row: {
  kind: "played" | "future";
  player: { name: string };
  game?: MatchDetail;
  playedOn?: string;
  season?: string;
  cancelled?: boolean;
}): ProfessorImageRow {
  if (row.kind === "played" && row.game) {
    return {
      name: row.player.name,
      date: formatShortDate(row.game.playedOn),
      season: row.game.season.code,
      saldo: professorSaldo(row.game),
      placar: scoreOf(row.game),
      tone: winnerTone(row.game),
    };
  }
  return {
    name: row.cancelled ? "Sem professor" : row.player.name,
    date: formatShortDate(row.playedOn ?? ""),
    season: row.season ?? "",
    saldo: null,
    placar: "",
    tone: "empate",
  };
}

function skipSentence(people: { name: string }[]) {
  if (!people.length) return "";
  const names = people.map((player) => player.name);
  const label = names.length === 1 ? names[0] : names.length === 2 ? `${names[0]} e ${names[1]}` : `${names.slice(0, -1).join(", ")} e ${names.at(-1)}`;
  return names.length === 1 ? ` ${label} está machucado e pulou a vez.` : ` ${label} estão machucados e pularam a vez.`;
}

export default function ProfessorsPage() {
  return (
    <Suspense fallback={<Muted>Abrindo a ordem...</Muted>}>
      <ProfessorsRoster />
    </Suspense>
  );
}

function ProfessorsRoster() {
  const params = useSearchParams();
  const [order, setOrder] = useState<Turn[]>([]);
  const [matches, setMatches] = useState<MatchDetail[]>([]);
  const [plans, setPlans] = useState<{ playedOn: string; playerId: string; cancelled?: boolean }[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [orderOpen, setOrderOpen] = useState(false);
  const [editing, setEditing] = useState<Turn | null>(null);
  const [draftName, setDraftName] = useState("");
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);

  const current = seasons.find((season) => season.isCurrent) ?? seasons[0];
  const selected = seasons.find((season) => season.code === params.get("temporada")) ?? current;
  const seasonMatches = selected ? matches.filter((match) => match.season.code === selected.code) : [];
  const played = seasonMatches
    .filter((match) => !match.scheduled && match.professor)
    .sort((left, right) => left.playedOn.localeCompare(right.playedOn) || left.id.localeCompare(right.id));
  const dates = upcomingTuesdays(matches);
  const slots = buildFutureSlots(order, lastProfessorId(matches), dates, plans);
  const future = slots
    .map((slot, index) => ({ ...slot, index, season: seasonCodeFromDate(slot.playedOn) }))
    .filter((slot) => !selected || slot.season === selected.code);
  const rows = [
    ...played.map((game) => ({
      kind: "played" as const,
      player: order.find((item) => item.id === game.professor?.id) ?? { id: game.professor!.id, name: game.professor!.name, positions: [] as string[] },
      game,
    })),
    ...future.map((slot) => ({
      kind: "future" as const,
      player: order.find((item) => item.id === slot.playerId) ?? { id: slot.playerId, name: "—", positions: [] as string[] },
      playedOn: slot.playedOn,
      season: slot.season,
      index: slot.index,
      cancelled: Boolean(slot.cancelled),
    })),
  ];
  const latestId = [...played].sort((left, right) => right.playedOn.localeCompare(left.playedOn))[0]?.id;
  const next = nextProfessor(order, slots, lastProfessorId(matches));
  const skipped = skippedProfessors(order, slots);

  useEffect(() => {
    Promise.all([clientApi<Season[]>("/seasons"), clientApi<MatchDetail[]>("/matches"), clientApi<ProfessorRoster>("/admin/professors")])
      .then(([loadedSeasons, loadedMatches, roster]) => {
        setSeasons(loadedSeasons);
        setMatches(loadedMatches);
        setOrder(roster.order);
        setPlans(roster.plans ?? []);
        setReady(true);
      })
      .catch((caught: Error) => {
        setError(caught.message);
        setReady(true);
      });
  }, []);

  function openEdit(player: Turn) {
    setEditing(player);
    setDraftName(player.name);
    setError("");
  }

  async function saveName(event: FormEvent) {
    event.preventDefault();
    if (!editing || busy) return;
    const name = draftName.trim();
    if (name.length < 2) return;
    setBusy(true);
    setError("");
    try {
      await clientApi(`/admin/players/${editing.id}`, { method: "PATCH", body: JSON.stringify({ name }) });
      setOrder((current) => current.map((player) => (player.id === editing.id ? { ...player, name } : player)));
      setMatches((current) =>
        current.map((match) => ({
          ...match,
          professor: match.professor?.id === editing.id ? { ...match.professor, name } : match.professor,
          teamA: match.teamA.map((player) => (player.id === editing.id ? { ...player, name } : player)),
          teamB: match.teamB.map((player) => (player.id === editing.id ? { ...player, name } : player)),
        })),
      );
      setEditing(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não consegui salvar o nome.");
    } finally {
      setBusy(false);
    }
  }

  async function persist(nextSlots: { playedOn: string; playerId: string; cancelled?: boolean }[]) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const saved = await clientApi<ProfessorRoster>("/admin/professor-plans", {
        method: "PUT",
        body: JSON.stringify({ slots: nextSlots }),
      });
      setPlans(saved.plans ?? nextSlots);
      setOrder(saved.order);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não consegui salvar os professores.");
    } finally {
      setBusy(false);
    }
  }

  function swap(index: number, delta: number) {
    const target = index + delta;
    const current = slots[index];
    const other = slots[target];
    if (!current || !other) return;
    const nextSlots = slots.map((slot, position) => {
      if (position === index) return { ...slot, playerId: other.playerId };
      if (position === target) return { ...slot, playerId: current.playerId };
      return slot;
    });
    void persist(nextSlots);
  }

  function changeProfessor(index: number, playerId: string) {
    void persist(slots.map((slot, position) => (position === index ? { ...slot, playerId } : slot)));
  }

  async function moveOrder(index: number, delta: number) {
    const target = index + delta;
    if (busy || target < 0 || target >= order.length) return;
    const nextOrder = [...order];
    const [player] = nextOrder.splice(index, 1);
    if (!player) return;
    nextOrder.splice(target, 0, player);
    setBusy(true);
    setError("");
    try {
      const saved = await clientApi<ProfessorRoster>("/admin/professors", {
        method: "PUT",
        body: JSON.stringify({ playerIds: nextOrder.map((item) => item.id) }),
      });
      setOrder(saved.order);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não consegui salvar a ordem.");
    } finally {
      setBusy(false);
    }
  }

  function cancelSlot(index: number) {
    void persist(slots.map((slot, position) => (position === index ? { ...slot, cancelled: true } : slot)));
  }

  function restoreSlot(index: number) {
    void persist(slots.map((slot, position) => (position === index ? { ...slot, cancelled: false } : slot)));
  }

  return (
    <Stack>
      <PanelHead $flush>
        <PageTitle>Professores</PageTitle>
        <GhostButton type="button" disabled={!order.length} onClick={() => { setError(""); setOrderOpen(true); }}>
          Ordem
        </GhostButton>
      </PanelHead>
      {ready ? (
        <Muted>Nas terças, no máximo se troca o jogo. A sequência fica em Ordem.</Muted>
      ) : (
        <Muted>Abrindo a ordem...</Muted>
      )}
      {selected ? <SeasonSelect seasons={seasons} value={selected.code} path="/admin/professores" /> : null}
      {next ? (
        <Muted>
          Próximo professor: {next.name}.{skipSentence(skipped)}
        </Muted>
      ) : skipped.length ? (
        <Muted>
          Próximo professor: a definir.{skipSentence(skipped)}
        </Muted>
      ) : null}
      {error && !orderOpen && !editing ? <ErrorText>{error}</ErrorText> : null}
      {ready && !order.length && !error ? <Muted>Nenhum mensalista na ordem.</Muted> : null}
      {order.length ? (
        <Scroll>
          <ShareRow>
            <SectionTitle>Jogos</SectionTitle>
            <ShareImageButton
              disabled={!rows.length}
              filename="professores-real-select.png"
              onImage={() => professorsImage(selected?.name ?? "Temporada", rows.map(professorImageRow))}
            />
          </ShareRow>
          <Grid>
            <Head>
              <span>Professor</span>
              <span>Data</span>
              <span>Semestre</span>
              <span>Saldo</span>
              <span>Placar</span>
              <span>Ações</span>
            </Head>
            {rows.map((row) => {
              const saldo = row.kind === "played" ? professorSaldo(row.game) : null;
              const date = row.kind === "played" ? row.game.playedOn : row.playedOn;
              const season = row.kind === "played" ? row.game.season.code : row.season;
              return (
                <Line key={row.kind === "played" ? row.game.id : row.playedOn}>
                  {row.kind === "future" && row.cancelled ? (
                    <Name>Sem professor</Name>
                  ) : row.kind === "future" ? (
                    <ProfessorSelect aria-label={`Professor em ${formatShortDate(row.playedOn)}`} value={row.player.id} disabled={busy} onChange={(event) => changeProfessor(row.index, event.target.value)}>
                      {order.map((player) => (
                        <option key={player.id} value={player.id}>
                          {player.name}
                          {player.injured ? " (machucado)" : ""}
                        </option>
                      ))}
                    </ProfessorSelect>
                  ) : (
                    <Name>{row.player.name}</Name>
                  )}
                  <DateText $latest={row.kind === "played" && row.game.id === latestId}>{formatShortDate(date)}</DateText>
                  <span>{season}</span>
                  {saldo === null ? <span /> : <Result $value={saldo}>{saldo}</Result>}
                  {row.kind === "played" ? <ScoreText $tone={winnerTone(row.game)}>{scoreOf(row.game)}</ScoreText> : <span />}
                  <Arrows>
                    {row.kind === "future" && row.cancelled ? (
                      <MiniButton type="button" aria-label={`Adicionar professor em ${formatShortDate(row.playedOn)}`} disabled={busy} onClick={() => restoreSlot(row.index)}>
                        Adicionar
                      </MiniButton>
                    ) : row.kind === "future" ? (
                      <>
                        <MiniButton type="button" aria-label={`Subir ${row.player.name} em ${formatShortDate(row.playedOn)}`} disabled={busy || row.index === 0 || Boolean(slots[row.index - 1]?.cancelled)} onClick={() => swap(row.index, -1)}>
                          ↑
                        </MiniButton>
                        <MiniButton type="button" aria-label={`Descer ${row.player.name} em ${formatShortDate(row.playedOn)}`} disabled={busy || row.index === slots.length - 1 || Boolean(slots[row.index + 1]?.cancelled)} onClick={() => swap(row.index, 1)}>
                          ↓
                        </MiniButton>
                        <MiniButton type="button" aria-label={`Cancelar jogo em ${formatShortDate(row.playedOn)}`} disabled={busy} onClick={() => cancelSlot(row.index)}>
                          Cancelar
                        </MiniButton>
                      </>
                    ) : null}
                  </Arrows>
                </Line>
              );
            })}
          </Grid>
        </Scroll>
      ) : null}
      {orderOpen ? (
        <Backdrop onMouseDown={() => setOrderOpen(false)}>
          <OrderDialog role="dialog" aria-modal="true" aria-labelledby="order-title" onMouseDown={(event) => event.stopPropagation()}>
            <h2 id="order-title">Ordem</h2>
            <OrderList>
              {order.map((player, index) => (
                <OrderLine key={player.id}>
                  <Name>
                    {index + 1}. {player.name}
                    {player.injured ? " (machucado)" : ""}
                  </Name>
                  <Arrows>
                    <MiniButton type="button" aria-label={`Subir ${player.name} na ordem`} disabled={busy || index === 0} onClick={() => void moveOrder(index, -1)}>
                      ↑
                    </MiniButton>
                    <MiniButton type="button" aria-label={`Descer ${player.name} na ordem`} disabled={busy || index === order.length - 1} onClick={() => void moveOrder(index, 1)}>
                      ↓
                    </MiniButton>
                    <MiniButton type="button" aria-label={`Editar ${player.name}`} disabled={busy} onClick={() => openEdit(player)}>
                      Editar
                    </MiniButton>
                  </Arrows>
                </OrderLine>
              ))}
            </OrderList>
            {error ? <ErrorText>{error}</ErrorText> : null}
            <Actions>
              <GhostButton type="button" onClick={() => setOrderOpen(false)}>
                Fechar
              </GhostButton>
            </Actions>
          </OrderDialog>
        </Backdrop>
      ) : null}
      {editing ? (
        <EditBackdrop onMouseDown={() => setEditing(null)}>
          <Dialog role="dialog" aria-modal="true" aria-labelledby="edit-player-title" onMouseDown={(event) => event.stopPropagation()}>
            <h2 id="edit-player-title">Editar jogador</h2>
            <form onSubmit={saveName}>
              <Field>
                Nome
                <TextInput aria-label="Nome do jogador" value={draftName} autoFocus onChange={(event) => setDraftName(event.target.value)} />
              </Field>
              {error ? <ErrorText>{error}</ErrorText> : null}
              <Actions>
                <GhostButton type="button" onClick={() => setEditing(null)}>
                  Cancelar
                </GhostButton>
                <PrimaryButton type="submit" disabled={busy || draftName.trim().length < 2}>
                  Salvar
                </PrimaryButton>
              </Actions>
            </form>
          </Dialog>
        </EditBackdrop>
      ) : null}
    </Stack>
  );
}

const ShareRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin: 8px 0 14px;
`;

const Scroll = styled.div`
  width: 100%;
  min-width: 0;
  overflow-x: auto;
`;

const columns = "minmax(0, 1fr) 104px 84px 52px 64px 210px";

const OrderLine = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 40px;
  border-bottom: 1px solid ${({ theme }) => theme.line};
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

const EditBackdrop = styled(Backdrop)`
  z-index: 40;
`;

const Dialog = styled.div`
  width: min(440px, 100%);
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
  form {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
`;

const OrderDialog = styled(Dialog)`
  width: min(520px, 100%);
  max-height: min(720px, calc(100vh - 40px));
`;

const OrderList = styled.div`
  overflow: auto;
  min-height: 0;
`;

const ProfessorSelect = styled(Select)`
  width: 100%;
  min-width: 0;
  max-width: 100%;
`;

const Grid = styled.div`
  width: 100%;
  min-width: 0;
`;

const Head = styled.div`
  display: grid;
  grid-template-columns: ${columns};
  column-gap: 8px;
  align-items: center;
  font-size: 13px;
  font-weight: 700;
  padding-bottom: 8px;
  border-bottom: 1px solid ${({ theme }) => theme.ink};
  > * {
    min-width: 0;
  }
  > :last-child {
    justify-self: end;
  }
`;

const Line = styled.div`
  display: grid;
  grid-template-columns: ${columns};
  column-gap: 8px;
  align-items: center;
  min-height: 44px;
  border-bottom: 1px solid ${({ theme }) => theme.line};
  > * {
    min-width: 0;
  }
`;

const Name = styled.b`
  min-width: 0;
`;

const DateText = styled.span<{ $latest: boolean }>`
  justify-self: start;
  padding: 2px 6px;
  font-weight: ${({ $latest }) => ($latest ? 700 : 500)};
  color: ${({ $latest }) => ($latest ? "#ffffff" : "inherit")};
  background: ${({ $latest }) => ($latest ? "#008000" : "transparent")};
`;

const Result = styled.span<{ $value: number }>`
  font-weight: 700;
  justify-self: start;
  padding: 2px 8px;
  color: ${({ $value, theme }) => ($value > 0 ? theme.gold : $value < 0 ? theme.loss : theme.ink)};
  background: ${({ $value }) => ($value > 0 ? "#00800022" : $value < 0 ? "#b4233a22" : "transparent")};
`;

const Arrows = styled.div`
  display: flex;
  gap: 6px;
  justify-content: flex-end;
`;

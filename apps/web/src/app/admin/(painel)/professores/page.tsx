"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import styled from "styled-components";
import { SeasonSelect } from "@/components/SeasonSelect";
import { buildFutureSlots, lastProfessorId, nextInRotation, upcomingTuesdays } from "@/lib/call-list";
import { clientApi } from "@/lib/client";
import { formatShortDate, seasonCodeFromDate } from "@/lib/format";
import { placar, winnerTone } from "@/lib/score";
import type { MatchDetail, ProfessorRoster, Season } from "@/lib/types";
import { ErrorText, MiniButton, Muted, PageTitle, PanelHead, ScoreText, SectionTitle, Select, Stack } from "@/styles/ui";

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
  const upcoming = slots.find((slot) => !slot.cancelled);
  const next = order.find((player) => player.id === upcoming?.playerId) ?? nextInRotation(order, lastProfessorId(matches), []);

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

  async function moveOrder(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= order.length || busy) return;
    const previous = order;
    const nextOrder = [...order];
    const item = nextOrder[index];
    if (!item) return;
    nextOrder.splice(index, 1);
    nextOrder.splice(target, 0, item);
    setOrder(nextOrder);
    setBusy(true);
    setError("");
    try {
      const saved = await clientApi<ProfessorRoster>("/admin/professors", {
        method: "PUT",
        body: JSON.stringify({ playerIds: nextOrder.map((player) => player.id) }),
      });
      setOrder(saved.order);
      setPlans(saved.plans ?? plans);
    } catch (caught) {
      setOrder(previous);
      setError(caught instanceof Error ? caught.message : "Não consegui salvar a ordem.");
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

  function removeSlot(index: number) {
    const current = slots[index];
    if (!order.length || !current || current.cancelled) return;
    const openPeople = slots.filter((slot) => !slot.cancelled).map((slot) => slot.playerId);
    const openAt = slots.filter((slot) => !slot.cancelled).findIndex((slot) => slot.playedOn === current.playedOn);
    if (openAt < 0) return;
    openPeople.splice(openAt, 1);
    const after = openPeople.at(-1) ?? current.playerId;
    const at = order.findIndex((player) => player.id === after);
    const fill = order[(at + 1) % order.length];
    if (fill) openPeople.push(fill.id);
    let cursor = 0;
    void persist(
      slots.map((slot) => {
        if (slot.cancelled) return slot;
        const playerId = openPeople[cursor] ?? fill?.id ?? slot.playerId;
        cursor += 1;
        return { ...slot, playerId };
      }),
    );
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
      </PanelHead>
      {ready ? (
        <Muted>A ordem abaixo é o ciclo original. As terças até 31/12/2026 ficam em seguida: dá para trocar, tirar uma ocorrência ou cancelar o jogo.</Muted>
      ) : (
        <Muted>Abrindo a ordem...</Muted>
      )}
      {selected ? <SeasonSelect seasons={seasons} value={selected.code} path="/admin/professores" /> : null}
      {next ? <Muted>Próximo professor: {next.name}.</Muted> : null}
      {error ? <ErrorText>{error}</ErrorText> : null}
      {ready && !order.length && !error ? <Muted>Nenhum mensalista na ordem.</Muted> : null}
      {order.length ? (
        <Stack>
          <SectionTitle>Ordem</SectionTitle>
          <OrderGrid>
            {order.map((player, index) => (
              <OrderLine key={player.id}>
                <Name>
                  {index + 1}. {player.name}
                </Name>
                <Arrows>
                  <MiniButton type="button" aria-label={`Subir ${player.name} na ordem`} disabled={busy || index === 0} onClick={() => moveOrder(index, -1)}>
                    ↑
                  </MiniButton>
                  <MiniButton type="button" aria-label={`Descer ${player.name} na ordem`} disabled={busy || index === order.length - 1} onClick={() => moveOrder(index, 1)}>
                    ↓
                  </MiniButton>
                </Arrows>
              </OrderLine>
            ))}
          </OrderGrid>
        </Stack>
      ) : null}
      {order.length ? (
        <Scroll>
          <SectionTitle>Jogos</SectionTitle>
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
                    <Select aria-label={`Professor em ${formatShortDate(row.playedOn)}`} value={row.player.id} disabled={busy} onChange={(event) => changeProfessor(row.index, event.target.value)}>
                      {order.map((player) => (
                        <option key={player.id} value={player.id}>
                          {player.name}
                        </option>
                      ))}
                    </Select>
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
                        <MiniButton type="button" aria-label={`Tirar ${row.player.name} em ${formatShortDate(row.playedOn)}`} disabled={busy} onClick={() => removeSlot(row.index)}>
                          Tirar
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
    </Stack>
  );
}

const Scroll = styled.div`
  overflow-x: auto;
`;

const columns = "minmax(160px, 1.6fr) 118px 96px 72px 72px 280px";

const OrderGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 8px 16px;
`;

const OrderLine = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 40px;
  border-bottom: 1px solid ${({ theme }) => theme.line};
`;

const Grid = styled.div`
  min-width: 860px;
`;

const Head = styled.div`
  display: grid;
  grid-template-columns: ${columns};
  column-gap: 12px;
  align-items: center;
  font-size: 13px;
  font-weight: 700;
  padding-bottom: 8px;
  border-bottom: 1px solid ${({ theme }) => theme.ink};
  > :last-child {
    justify-self: end;
  }
`;

const Line = styled.div`
  display: grid;
  grid-template-columns: ${columns};
  column-gap: 12px;
  align-items: center;
  min-height: 44px;
  border-bottom: 1px solid ${({ theme }) => theme.line};
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

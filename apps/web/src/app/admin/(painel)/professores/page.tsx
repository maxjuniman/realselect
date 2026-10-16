"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import styled from "styled-components";
import { SeasonSelect } from "@/components/SeasonSelect";
import { lastProfessorId, nextInRotation } from "@/lib/call-list";
import { clientApi } from "@/lib/client";
import { formatShortDate } from "@/lib/format";
import { placar, winnerTone } from "@/lib/score";
import type { MatchDetail, ProfessorRoster, Season } from "@/lib/types";
import { ErrorText, MiniButton, Muted, PageTitle, PanelHead, ScoreText, Stack } from "@/styles/ui";

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
  const playedIds = new Set(played.map((match) => match.professor?.id));
  const rows = [
    ...played.map((game) => ({ player: order.find((item) => item.id === game.professor?.id) ?? { id: game.professor!.id, name: game.professor!.name, positions: [] as string[] }, game })),
    ...order.filter((player) => !playedIds.has(player.id)).map((player) => ({ player, game: null as MatchDetail | null })),
  ];
  const latestId = [...played].sort((left, right) => right.playedOn.localeCompare(left.playedOn))[0]?.id;
  const next = nextInRotation(order, lastProfessorId(matches), []);

  useEffect(() => {
    Promise.all([clientApi<Season[]>("/seasons"), clientApi<MatchDetail[]>("/matches"), clientApi<ProfessorRoster>("/admin/professors")])
      .then(([loadedSeasons, loadedMatches, roster]) => {
        setSeasons(loadedSeasons);
        setMatches(loadedMatches);
        setOrder(roster.order);
        setReady(true);
      })
      .catch((caught: Error) => {
        setError(caught.message);
        setReady(true);
      });
  }, []);

  async function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= order.length || busy) return;
    const item = order[index];
    if (!item) return;
    const previous = order;
    const nextOrder = [...order];
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
    } catch (caught) {
      setOrder(previous);
      setError(caught instanceof Error ? caught.message : "Não consegui salvar a ordem.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Stack>
      <PanelHead $flush>
        <PageTitle>Professores</PageTitle>
      </PanelHead>
      {ready ? (
        <Muted>A ordem volta para o primeiro quando acaba. Para mudar a vez, desça a pessoa na lista. Os jogos abaixo estão por data.</Muted>
      ) : (
        <Muted>Abrindo a ordem...</Muted>
      )}
      {selected ? <SeasonSelect seasons={seasons} value={selected.code} path="/admin/professores" /> : null}
      {next ? <Muted>Próximo professor: {next.name}.</Muted> : null}
      {error ? <ErrorText>{error}</ErrorText> : null}
      {ready && !order.length && !error ? <Muted>Nenhum mensalista na ordem.</Muted> : null}
      {order.length ? (
        <Scroll>
          <Grid>
            <Head>
              <span>Professor</span>
              <span>Data</span>
              <span>Semestre</span>
              <span>Saldo</span>
              <span>Placar</span>
              <span>Ações</span>
            </Head>
            {rows.map(({ player, game }) => {
              const index = order.findIndex((item) => item.id === player.id);
              const saldo = game ? professorSaldo(game) : null;
              return (
                <Line key={game ? game.id : player.id}>
                  <Name>{player.name}</Name>
                  <DateText $latest={game?.id === latestId}>{game ? formatShortDate(game.playedOn) : ""}</DateText>
                  <span>{game?.season.code ?? ""}</span>
                  {saldo === null ? <span /> : <Result $value={saldo}>{saldo}</Result>}
                  {game ? <ScoreText $tone={winnerTone(game)}>{scoreOf(game)}</ScoreText> : <span />}
                  <Arrows>
                    {index >= 0 ? (
                      <>
                        <MiniButton type="button" aria-label={`Subir ${player.name}`} disabled={busy || index === 0} onClick={() => move(index, -1)}>
                          ↑
                        </MiniButton>
                        <MiniButton type="button" aria-label={`Descer ${player.name}`} disabled={busy || index === order.length - 1} onClick={() => move(index, 1)}>
                          ↓
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

const columns = "minmax(140px, 1.5fr) 118px 96px 72px 72px 88px";

const Grid = styled.div`
  min-width: 640px;
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

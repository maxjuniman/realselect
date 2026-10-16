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

function playedGames(matches: MatchDetail[]) {
  const games = new Map<string, MatchDetail[]>();
  for (const match of matches) {
    if (match.scheduled || !match.professor) continue;
    const bucket = games.get(match.professor.id) ?? [];
    bucket.push(match);
    games.set(match.professor.id, bucket);
  }
  for (const bucket of games.values()) bucket.sort((left, right) => left.playedOn.localeCompare(right.playedOn));
  return games;
}

function resultOf(match: MatchDetail) {
  if (match.scoreA !== null && match.scoreB !== null) return match.scoreA - match.scoreB;
  return match.goalDiffA;
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
  const games = playedGames(seasonMatches);
  const rounds = Math.max(1, ...order.map((player) => games.get(player.id)?.length ?? 0));
  const latestId = [...seasonMatches].filter((match) => !match.scheduled && match.professor).sort((left, right) => right.playedOn.localeCompare(left.playedOn))[0]?.id;
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
        <Muted>A ordem volta para o primeiro quando acaba. Para mudar a vez, desça a pessoa na lista. Os jogos abaixo são os que já aconteceram.</Muted>
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
              <span>Resultado</span>
              <span>Placar</span>
              <span />
            </Head>
            {Array.from({ length: rounds }, (_, round) =>
              order.map((player, index) => {
                const game = games.get(player.id)?.[round];
                const result = game ? resultOf(game) : null;
                return (
                  <Line key={`${player.id}-${round}`} $break={index === order.length - 1 && round < rounds - 1}>
                    <Name>{player.name}</Name>
                    <DateText $latest={game?.id === latestId}>{game ? formatShortDate(game.playedOn) : ""}</DateText>
                    <span>{game?.season.code ?? ""}</span>
                    {result === null ? <span /> : <Result $value={result}>{result}</Result>}
                    {game ? <ScoreText $tone={winnerTone(game)}>{scoreOf(game)}</ScoreText> : <span />}
                    <Arrows>
                      {round === 0 ? (
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
              }),
            )}
          </Grid>
        </Scroll>
      ) : null}
    </Stack>
  );
}

const Scroll = styled.div`
  overflow-x: auto;
`;

const columns = "minmax(140px, 1.5fr) 118px 96px 90px 72px auto";

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
`;

const Line = styled.div<{ $break: boolean }>`
  display: grid;
  grid-template-columns: ${columns};
  column-gap: 12px;
  align-items: center;
  min-height: 44px;
  border-bottom: 1px solid ${({ theme, $break }) => ($break ? theme.ink : theme.line)};
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

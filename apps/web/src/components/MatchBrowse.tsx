"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import styled from "styled-components";
import { ImportFutStats } from "@/components/ImportFutStats";
import { LaunchList } from "@/components/LaunchList";
import { MatchAwards } from "@/components/MatchAwards";
import { useSession } from "@/components/Session";
import { clientApi } from "@/lib/client";
import { awardsOpen } from "@/lib/awards";
import { formatLongDate, formatTinyDate } from "@/lib/format";
import { placar, winnerTone } from "@/lib/score";
import type { FutStatsCatalog, LinePlayer, MatchDetail } from "@/lib/types";
import { Actions, ButtonLink, List, Muted, ScoreText } from "@/styles/ui";

export function OrganizerMatchActions() {
  const session = useSession();
  if (session?.role === "player") return null;
  return (
    <HeadActions>
      <Actions>
        <LaunchList />
        <ImportFutStats />
        <ButtonLink href="/admin/jogos/novo">Novo jogo</ButtonLink>
      </Actions>
    </HeadActions>
  );
}

function named(players: LinePlayer[], field: "goals" | "assists") {
  return players
    .filter((player) => player[field] > 0)
    .sort((left, right) => right[field] - left[field] || left.name.localeCompare(right.name, "pt-BR"))
    .map((player) => (player[field] > 1 ? `${player.name} (${player[field]})` : player.name))
    .join(", ");
}

export function MatchBrowse({ matches, basePath }: { matches: MatchDetail[]; basePath: "/jogos" | "/admin/jogos" }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [videos, setVideos] = useState<Set<string>>(new Set());
  const session = useSession();
  const admin = basePath.startsWith("/admin");
  const organizer = admin && session?.role !== "player";

  useEffect(() => {
    clientApi<FutStatsCatalog>("/futstats")
      .then((catalog) => setVideos(new Set(catalog.matches.map((item) => item.date))))
      .catch(() => setVideos(new Set()));
  }, []);

  return (
    <List>
      {matches.map((match) => {
        const open = openId === match.id;
        const players = [...match.teamA, ...match.teamB];
        const goals = named(players, "goals");
        const assists = named(players, "assists");
        const professor = match.professor
          ? `Prof. ${match.professor.name}`
          : admin
            ? match.scheduled
              ? "Antes do jogo"
              : "Sem professor"
            : `${match.teamA.length} x ${match.teamB.length}`;
        const when = admin ? formatTinyDate(match.playedOn) : formatLongDate(match.playedOn);
        return (
          <Item key={match.id}>
            <Row>
              <DateLink href={`${basePath}/${match.id}`}>{when}</DateLink>
              {admin ? <ScoreText $tone={winnerTone(match)}>{placar(match)}</ScoreText> : <strong>{match.scoreLabel}</strong>}
              <Professor>{professor}</Professor>
              <Tools>
                {awardsOpen(match) ? <MatchAwards matchId={match.id} playedOn={match.playedOn} players={players} ballots={organizer} /> : null}
                {videos.has(match.playedOn) ? (
                  <IconLink href={`/videos?jogo=${match.playedOn}`} aria-label={`Vídeos do jogo ${when}`}>
                    <PlayIcon />
                  </IconLink>
                ) : null}
                <IconButton type="button" aria-expanded={open} aria-label={open ? `Ocultar detalhes do jogo ${when}` : `Detalhes do jogo ${when}`} onClick={() => setOpenId(open ? null : match.id)}>
                  <ListIcon />
                </IconButton>
              </Tools>
            </Row>
            {open ? (
              <Detail>
                {match.scheduled ? (
                  <Muted>Esse jogo ainda não foi lançado.</Muted>
                ) : (
                  <>
                    <p>
                      <b>Gols.</b> {goals || "ninguém"}
                    </p>
                    <p>
                      <b>Assistências.</b> {assists || "ninguém"}
                    </p>
                  </>
                )}
              </Detail>
            ) : null}
          </Item>
        );
      })}
    </List>
  );
}

function PlayIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M8 5v14l12-7Z" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M4 6h16v2H4V6Zm0 5h16v2H4v-2Zm0 5h16v2H4v-2Z" />
    </svg>
  );
}

const HeadActions = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
`;

const Item = styled.article`
  border-bottom: 1px solid ${({ theme }) => theme.line};
`;

const Row = styled.div`
  display: grid;
  grid-template-columns: minmax(110px, 0.8fr) minmax(72px, 0.6fr) minmax(0, 1.4fr) auto;
  gap: 12px 16px;
  align-items: center;
  padding: 12px 0;
  @media (max-width: 860px) {
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-areas:
      "date tools"
      "score tools"
      "prof tools";
    > :nth-child(1) {
      grid-area: date;
    }
    > :nth-child(2) {
      grid-area: score;
    }
    > :nth-child(3) {
      grid-area: prof;
    }
    > :nth-child(4) {
      grid-area: tools;
    }
  }
`;

const DateLink = styled(Link)`
  font-weight: 700;
  &:hover {
    color: ${({ theme }) => theme.purpleDeep};
  }
`;

const Professor = styled(Muted)`
  justify-self: start;
`;

const Tools = styled.div`
  display: flex;
  gap: 8px;
  justify-self: end;
`;

const IconLink = styled(Link)`
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  background: ${({ theme }) => theme.purple};
  color: white;
  &:hover {
    background: ${({ theme }) => theme.purpleDeep};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.purpleDeep};
    outline-offset: 3px;
  }
`;

const IconButton = styled.button`
  width: 40px;
  height: 40px;
  padding: 0;
  border: 0;
  display: grid;
  place-items: center;
  background: ${({ theme }) => theme.purple};
  color: white;
  cursor: pointer;
  &:hover {
    background: ${({ theme }) => theme.purpleDeep};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.purpleDeep};
    outline-offset: 3px;
  }
`;

const Detail = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 0 0 12px;
  p {
    margin: 0;
  }
  b {
    font-weight: 700;
  }
`;

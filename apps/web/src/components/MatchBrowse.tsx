"use client";

import { useState } from "react";
import styled from "styled-components";
import { MatchAwards } from "@/components/MatchAwards";
import { awardsOpen } from "@/lib/awards";
import { formatLongDate, formatTinyDate } from "@/lib/format";
import { placar, winnerTone } from "@/lib/score";
import type { LinePlayer, MatchDetail } from "@/lib/types";
import { List, ListLink, Muted, ScoreText } from "@/styles/ui";

function named(players: LinePlayer[], field: "goals" | "assists") {
  return players
    .filter((player) => player[field] > 0)
    .sort((left, right) => right[field] - left[field] || left.name.localeCompare(right.name, "pt-BR"))
    .map((player) => (player[field] > 1 ? `${player.name} (${player[field]})` : player.name))
    .join(", ");
}

export function MatchBrowse({ matches, basePath }: { matches: MatchDetail[]; basePath: "/jogos" | "/admin/jogos" }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const admin = basePath.startsWith("/admin");

  return (
    <List>
      {matches.map((match) => {
        const open = openId === match.id;
        const players = [...match.teamA, ...match.teamB];
        const goals = named(players, "goals");
        const assists = named(players, "assists");
        return (
          <Item key={match.id}>
            <ListLink href={`${basePath}/${match.id}`}>
              <span>{admin ? formatTinyDate(match.playedOn) : formatLongDate(match.playedOn)}</span>
              {admin ? <ScoreText $tone={winnerTone(match)}>{placar(match)}</ScoreText> : <strong>{match.scoreLabel}</strong>}
              <Muted as="span">
                {match.professor ? `Prof. ${match.professor.name}` : admin ? (match.scheduled ? "Antes do jogo" : "Sem professor") : `${match.teamA.length} x ${match.teamB.length}`}
              </Muted>
            </ListLink>
            {goals || assists ?
              <Toggle type="button" aria-expanded={open} onClick={() => setOpenId(open ? null : match.id)}>
                {open ? "Ocultar detalhes" : "Ver detalhes"}
              </Toggle>
            : null}
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
            {awardsOpen(match) ? <MatchAwards matchId={match.id} playedOn={match.playedOn} players={players} ballots={admin} /> : null}
          </Item>
        );
      })}
    </List>
  );
}

const Item = styled.article`
  border-bottom: 1px solid ${({ theme }) => theme.line};
  padding-bottom: 10px;
  a {
    border-bottom: 0;
    padding-bottom: 6px;
  }
`;

const Toggle = styled.button`
  border: 0;
  padding: 0 0 4px;
  background: transparent;
  color: ${({ theme }) => theme.purpleDeep};
  font: inherit;
  font-weight: 700;
  cursor: pointer;
  &:hover {
    text-decoration: underline;
    text-underline-offset: 3px;
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
  padding: 4px 0 6px;
  p {
    margin: 0;
  }
  b {
    font-weight: 700;
  }
`;

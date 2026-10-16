"use client";

import { useEffect, useState } from "react";
import styled from "styled-components";
import { gameSequence } from "@/lib/call-list";
import { clientApi } from "@/lib/client";
import type { MatchDetail, PlayerRef } from "@/lib/types";
import { ErrorText, Muted, PageTitle, PanelHead, Stack } from "@/styles/ui";

export default function SequencePage() {
  const [players, setPlayers] = useState<PlayerRef[]>([]);
  const [matches, setMatches] = useState<MatchDetail[]>([]);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    Promise.all([clientApi<PlayerRef[]>("/players"), clientApi<MatchDetail[]>("/matches")])
      .then(([loadedPlayers, loadedMatches]) => {
        setPlayers(loadedPlayers);
        setMatches(loadedMatches);
        setReady(true);
      })
      .catch((caught: Error) => {
        setError(caught.message);
        setReady(true);
      });
  }, []);

  const rows = [...gameSequence(players, matches)].sort(
    (left, right) => right.last10 - left.last10 || right.last12Months - left.last12Months || left.player.name.localeCompare(right.player.name, "pt-BR"),
  );

  return (
    <Stack>
      <PanelHead $flush>
        <PageTitle>Sequência de jogos</PageTitle>
      </PanelHead>
      <Muted>Quantos jogos cada um fez nos últimos 10 jogos e nos últimos 12 meses. Quem jogou mais aparece primeiro.</Muted>
      {error ? <ErrorText>{error}</ErrorText> : null}
      {!ready ? <Muted>Abrindo a sequência...</Muted> : null}
      {ready && rows.length ? (
        <Scroll>
          <Grid>
            <Head>
              <span>Jogador</span>
              <span>Últimos 10</span>
              <span>12 meses</span>
            </Head>
            {rows.map((row) => (
              <Line key={row.player.id}>
                <b>{row.player.name}</b>
                <span>{row.last10}</span>
                <span>{row.last12Months}</span>
              </Line>
            ))}
          </Grid>
        </Scroll>
      ) : null}
    </Stack>
  );
}

const Scroll = styled.div`
  overflow-x: auto;
`;

const columns = "minmax(180px, 1.6fr) 120px 120px";

const Grid = styled.div`
  min-width: 420px;
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

const Line = styled.div`
  display: grid;
  grid-template-columns: ${columns};
  column-gap: 12px;
  align-items: center;
  min-height: 44px;
  border-bottom: 1px solid ${({ theme }) => theme.line};
`;

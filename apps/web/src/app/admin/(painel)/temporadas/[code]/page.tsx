"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { StandingsTable } from "@/components/StandingsTable";
import { clientApi } from "@/lib/client";
import { formatLongDate } from "@/lib/format";
import type { MatchDetail, ScorerRow, Season, Standings } from "@/lib/types";
import {
  Actions,
  ButtonLink,
  Empty,
  ErrorText,
  GhostButton,
  PrimaryButton,
  List,
  ListLink,
  Muted,
  PageTitle,
  Panel,
  PanelHead,
  RankRow,
  SectionTitle,
  Stack,
  Table,
  TableWrap,
  Td,
  Th,
} from "@/styles/ui";

type View = "classificacao" | "artilharia" | "jogos";

const views: { id: View; label: string }[] = [
  { id: "classificacao", label: "Classificação" },
  { id: "artilharia", label: "Artilharia" },
  { id: "jogos", label: "Jogos" },
];

export default function SeasonDataPage() {
  const params = useParams<{ code: string }>();
  const code = decodeURIComponent(params.code);
  const [view, setView] = useState<View>("classificacao");
  const [table, setTable] = useState<Standings | null>(null);
  const [scorers, setScorers] = useState<{ ownGoals: number; rows: ScorerRow[] } | null>(null);
  const [matches, setMatches] = useState<MatchDetail[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const query = `season=${encodeURIComponent(code)}`;
    Promise.all([
      clientApi<Standings>(`/standings?${query}`),
      clientApi<{ season: Season; ownGoals: number; rows: ScorerRow[] }>(`/scorers?${query}`),
      clientApi<MatchDetail[]>(`/matches?${query}`),
    ])
      .then(([standings, scoring, games]) => {
        setTable(standings);
        setScorers(scoring);
        setMatches(games);
        setLoaded(true);
      })
      .catch((caught: Error) => setError(caught.message));
  }, [code]);

  return (
    <Stack>
      <PanelHead $flush>
        <div>
          <ButtonLink href="/admin/temporadas" $variant="ghost">
            Temporadas
          </ButtonLink>
          <PageTitle>{table?.season.name ?? code}</PageTitle>
        </div>
      </PanelHead>
      {error ? <ErrorText>{error}</ErrorText> : null}
      {!loaded && !error ? <Muted>Carregando a temporada...</Muted> : null}
      <Actions>
        {views.map((item) => {
          const Button = view === item.id ? PrimaryButton : GhostButton;
          return (
            <Button key={item.id} type="button" onClick={() => setView(item.id)}>
              {item.label}
            </Button>
          );
        })}
      </Actions>

      {view === "classificacao" && table ? <StandingsTable rows={table.rows} seasonName={table.season.name} /> : null}

      {view === "artilharia" && scorers ? (
        <Panel>
          <SectionTitle>Artilharia</SectionTitle>
          <Muted>
            {scorers.ownGoals ? `${scorers.ownGoals} gols contra neste semestre.` : "Gols e assistências lançados nos jogos."}
          </Muted>
          {scorers.rows.length ? (
            <TableWrap>
              <Table>
                <thead>
                  <tr>
                    <Th>#</Th>
                    <Th>Jogador</Th>
                    <Th $num>Gols</Th>
                    <Th $num>Assist.</Th>
                    <Th $num>Participações</Th>
                  </tr>
                </thead>
                <tbody>
                  {scorers.rows.map((row) => (
                    <RankRow key={row.player.id} $rank={row.position <= 3 ? row.position : 0}>
                      <Td $place>{row.position}</Td>
                      <Td $name>{row.player.name}</Td>
                      <Td $num>{row.goals}</Td>
                      <Td $num>{row.assists}</Td>
                      <Td $num>{row.participations}</Td>
                    </RankRow>
                  ))}
                </tbody>
              </Table>
            </TableWrap>
          ) : loaded ? (
            <Empty>Ainda não há gols lançados neste semestre.</Empty>
          ) : null}
        </Panel>
      ) : null}

      {view === "jogos" ? (
        <Panel>
          <SectionTitle>Jogos</SectionTitle>
          {matches.length ? (
            <List>
              {matches.map((match) => (
                <ListLink key={match.id} href={`/admin/jogos/${match.id}`}>
                  <span>{formatLongDate(match.playedOn)}</span>
                  <strong>{match.scoreLabel}</strong>
                  <Muted as="span">{match.professor ? `Prof. ${match.professor.name}` : `${match.teamA.length} x ${match.teamB.length}`}</Muted>
                </ListLink>
              ))}
            </List>
          ) : loaded ? (
            <Empty>Nenhum jogo neste semestre.</Empty>
          ) : null}
        </Panel>
      ) : null}
    </Stack>
  );
}

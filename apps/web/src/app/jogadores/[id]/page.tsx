import { notFound } from "next/navigation";
import { ApiError, api } from "@/lib/api";
import { formatDiff, formatPercent, formatShortDate, resultLabel } from "@/lib/format";
import { List, ListLink, Muted, PageBlock, PageTitle, Panel, PanelHead, SectionTitle, Stat, StatGrid, Table, TableWrap, Td, Th } from "@/styles/ui";
import type { StandingRow } from "@/lib/types";

type PlayerPayload = {
  player: { id: string; name: string; guest: boolean; active: boolean; squad?: string; positions?: string[] };
  seasons: (StandingRow & { season: { code: string; name: string; year: number; half: number } })[];
  matches: {
    id: string;
    playedOn: string;
    season: { code: string; name: string };
    team: string;
    result: "win" | "loss" | "draw";
    points: number;
    goalDiff: number;
    goals: number;
    assists: number;
  }[];
};

export default async function PlayerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let data: PlayerPayload;
  try {
    data = await api<PlayerPayload>(`/players/${id}`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
  const current = data.seasons[0];

  return (
    <PageBlock>
      <PageTitle>{data.player.name}</PageTitle>
      {current ? (
        <>
          <Muted>
            {current.position}º lugar no {current.season.name}
            {data.player.positions?.length ? `, ${data.player.positions.join(" e ")}` : ""}
            {data.player.guest ? ", como suplente" : ""}.
          </Muted>
          <StatGrid>
            <Stat><b>{current.points}</b><span>Pontos</span></Stat>
            <Stat><b>{current.games}</b><span>Jogos</span></Stat>
            <Stat><b>{formatDiff(current.goalDiff)}</b><span>Saldo</span></Stat>
            <Stat><b>{formatPercent(current.utilization)}</b><span>Aproveitamento</span></Stat>
          </StatGrid>
        </>
      ) : (
        <Muted>Sem jogos lançados.</Muted>
      )}

      {data.seasons.length > 1 ? (
        <Panel $gap>
          <PanelHead><SectionTitle>Temporadas</SectionTitle></PanelHead>
          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <Th>Semestre</Th>
                  <Th $num>#</Th>
                  <Th $num>P</Th>
                  <Th $num>J</Th>
                  <Th $num>SG</Th>
                </tr>
              </thead>
              <tbody>
                {data.seasons.map((season) => (
                  <tr key={season.season.code}>
                    <Td>{season.season.name}</Td>
                    <Td $num>{season.position}</Td>
                    <Td $num>{season.points}</Td>
                    <Td $num>{season.games}</Td>
                    <Td $num>{formatDiff(season.goalDiff)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </TableWrap>
        </Panel>
      ) : null}

      <Panel>
        <PanelHead><SectionTitle>Jogos</SectionTitle></PanelHead>
        <List>
          {data.matches.map((match) => (
            <ListLink key={match.id} href={`/jogos/${match.id}`}>
              <span>{formatShortDate(match.playedOn)}</span>
              <span>
                Time {match.team} · {resultLabel(match.result)}
                {match.goals ? ` · ${match.goals} gol${match.goals > 1 ? "s" : ""}` : ""}
              </span>
              <b>
                {match.points} pts · {formatDiff(match.goalDiff)}
              </b>
            </ListLink>
          ))}
        </List>
      </Panel>
    </PageBlock>
  );
}

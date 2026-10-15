import { SeasonSelect } from "@/components/SeasonSelect";
import { loadMatches, loadSeasons, loadStandings } from "@/lib/api";
import { formatLongDate } from "@/lib/format";
import { Empty, List, ListLink, Muted, Panel, PanelHead, SectionTitle } from "@/styles/ui";

export const metadata = { title: "Jogos" };

export default async function MatchesPage({ searchParams }: { searchParams: Promise<{ temporada?: string }> }) {
  const params = await searchParams;
  const [seasons, table] = await Promise.all([loadSeasons(), loadStandings(params.temporada)]);
  const matches = await loadMatches(table.season.code);

  return (
    <Panel $top>
      <PanelHead>
        <SectionTitle>Jogos</SectionTitle>
        <SeasonSelect seasons={seasons} value={table.season.code} path="/jogos" />
      </PanelHead>
      <List>
        {matches.map((match) => (
          <ListLink key={match.id} href={`/jogos/${match.id}`}>
            <span>{formatLongDate(match.playedOn)}</span>
            <strong>{match.scoreLabel}</strong>
            <Muted as="span">{match.professor ? `Prof. ${match.professor.name}` : `${match.teamA.length} x ${match.teamB.length}`}</Muted>
          </ListLink>
        ))}
      </List>
      {!matches.length ? <Empty>Nenhum jogo neste semestre.</Empty> : null}
    </Panel>
  );
}

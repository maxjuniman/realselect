import { MatchBrowse } from "@/components/MatchBrowse";
import { SeasonSelect } from "@/components/SeasonSelect";
import { loadMatches, loadSeasons, loadStandings } from "@/lib/api";
import { Empty, Panel, PanelHead, SectionTitle } from "@/styles/ui";

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
      <MatchBrowse matches={matches} basePath="/jogos" />
      {!matches.length ? <Empty>Nenhum jogo neste semestre.</Empty> : null}
    </Panel>
  );
}

import { SeasonBanner } from "@/components/SeasonBanner";
import { SeasonSelect } from "@/components/SeasonSelect";
import { StandingsTable } from "@/components/StandingsTable";
import { api, loadSeasons, loadStandings } from "@/lib/api";
import type { ScorerRow, Season } from "@/lib/types";
import { Empty, PageTitle, Panel, PanelHead, Rules, SectionTitle } from "@/styles/ui";

export default async function HomePage({ searchParams }: { searchParams: Promise<{ temporada?: string }> }) {
  const params = await searchParams;
  try {
    const [seasons, table] = await Promise.all([loadSeasons(), loadStandings(params.temporada)]);
    const scorers = await api<{ season: Season; rows: ScorerRow[] }>(`/scorers?season=${encodeURIComponent(table.season.code)}`);

    return (
      <>
        <SeasonBanner seasonName={table.season.name} rows={table.rows} scorers={scorers.rows} />

        <Panel>
          <PanelHead>
            <SectionTitle>Classificação</SectionTitle>
            <SeasonSelect seasons={seasons} value={table.season.code} path="/" />
          </PanelHead>
          <Rules>Critérios de desempate: mais jogos, saldo de gols e vitória mais recente.</Rules>
          <StandingsTable rows={table.rows} seasonName={table.season.name} />
        </Panel>
      </>
    );
  } catch {
    return (
      <Panel $pad>
        <PageTitle>O campeonato ainda não respondeu</PageTitle>
        <Empty>Confira se a API está no ar e atualize a página.</Empty>
      </Panel>
    );
  }
}

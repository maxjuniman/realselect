import { SeasonSelect } from "@/components/SeasonSelect";
import { StandingsTable } from "@/components/StandingsTable";
import { loadSeasons, loadStandings } from "@/lib/api";
import { Empty, Hero, HeroArt, HeroCopy, PageTitle, Panel, PanelHead, Rules, SectionTitle } from "@/styles/ui";

export default async function HomePage({ searchParams }: { searchParams: Promise<{ temporada?: string }> }) {
  const params = await searchParams;
  try {
    const [seasons, table] = await Promise.all([loadSeasons(), loadStandings(params.temporada)]);
    const leader = table.rows[0];

    return (
      <>
        <Hero>
          <HeroCopy>
            <h1>{leader ? `${leader.player.name} lidera com ${leader.points} pontos` : table.season.name}</h1>
          </HeroCopy>
          <HeroArt>
            <img src="/brand/mascot.png" alt="Mascote do Real Select" />
          </HeroArt>
        </Hero>

        <Panel>
          <PanelHead>
            <SectionTitle>Classificação</SectionTitle>
            <SeasonSelect seasons={seasons} value={table.season.code} path="/" />
          </PanelHead>
          <Rules>Critérios de desempate: mais jogos, saldo de gols e vitória mais recente.</Rules>
          <StandingsTable rows={table.rows} />
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

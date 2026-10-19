import { LaunchList } from "@/components/LaunchList";
import { MatchBrowse } from "@/components/MatchBrowse";
import { SeasonSelect } from "@/components/SeasonSelect";
import { loadMatches, loadSeasons } from "@/lib/api";
import { Actions, ButtonLink, Empty, PageTitle, PanelHead, Stack } from "@/styles/ui";

export const metadata = { title: "Jogos" };

export default async function AdminMatchesPage({ searchParams }: { searchParams: Promise<{ temporada?: string }> }) {
  const params = await searchParams;
  const seasons = await loadSeasons();
  const current = seasons.find((season) => season.isCurrent) ?? seasons[0];
  const code = params.temporada || current?.code;
  const selected = seasons.find((season) => season.code === code);
  const matches = selected ? await loadMatches(selected.code) : [];

  return (
    <Stack>
      <PanelHead $flush>
        <PageTitle>Jogos</PageTitle>
        <Actions>
          <LaunchList />
          <ButtonLink href="/admin/jogos/novo">Novo jogo</ButtonLink>
        </Actions>
      </PanelHead>
      {selected ? <SeasonSelect seasons={seasons} value={selected.code} path="/admin/jogos" /> : null}
      <MatchBrowse matches={matches} basePath="/admin/jogos" />
      {!matches.length ? <Empty>Nenhum jogo neste semestre.</Empty> : null}
    </Stack>
  );
}

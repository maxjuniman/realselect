import { VoteBoard } from "@/components/VoteBoard";
import { SeasonSelect } from "@/components/SeasonSelect";
import { loadSeasons } from "@/lib/api";
import { Empty, PageTitle, Stack } from "@/styles/ui";

export const metadata = { title: "Votação" };

export default async function VotesPage({ searchParams }: { searchParams: Promise<{ temporada?: string }> }) {
  const params = await searchParams;
  const seasons = await loadSeasons();
  const current = seasons.find((season) => season.isCurrent) ?? seasons[0];
  const code = params.temporada || current?.code;
  const selected = seasons.find((season) => season.code === code);

  return (
    <Stack>
      <PageTitle>Votação</PageTitle>
      {selected ? <SeasonSelect seasons={seasons} value={selected.code} path="/admin/votacao" /> : null}
      {selected ? <VoteBoard season={selected.code} /> : <Empty>Nenhuma temporada cadastrada.</Empty>}
    </Stack>
  );
}

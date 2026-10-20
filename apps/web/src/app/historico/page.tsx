import { HistoryBoard } from "@/components/HistoryBoard";
import { loadMatches, loadSeasons } from "@/lib/api";
import { buildHistory, extraSeasonCodes } from "@/lib/history";
import { Empty, PageTitle, Panel } from "@/styles/ui";

export const metadata = { title: "Histórico" };

export default async function HistoryPage({ searchParams }: { searchParams: Promise<{ temporada?: string; mais?: string }> }) {
  const params = await searchParams;
  try {
    const seasons = await loadSeasons();
    const primary = seasons.find((season) => season.code === params.temporada) ?? seasons.find((season) => season.isCurrent) ?? seasons[0];
    if (!primary) {
      return (
        <Panel $top $pad>
          <PageTitle>Histórico</PageTitle>
          <Empty>Nenhuma temporada cadastrada.</Empty>
        </Panel>
      );
    }
    const extras = extraSeasonCodes(params.mais, seasons, primary.code);
    const selected = [primary.code, ...extras];
    const batches = await Promise.all(selected.map((code) => loadMatches(code)));
    const history = buildHistory(batches.flat());

    return (
      <Panel $top>
        <HistoryBoard seasons={seasons} primary={primary.code} extras={extras} columns={history.columns} rows={history.rows} />
      </Panel>
    );
  } catch {
    return (
      <Panel $top $pad>
        <PageTitle>O histórico ainda não respondeu</PageTitle>
        <Empty>Confira se a API está no ar e atualize a página.</Empty>
      </Panel>
    );
  }
}

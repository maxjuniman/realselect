import { HistoryBoard } from "@/components/HistoryBoard";
import { loadMatches, loadSeasons } from "@/lib/api";
import { buildHistory, extraSeasonCodes } from "@/lib/history";
import { Empty, PageTitle } from "@/styles/ui";

export const metadata = { title: "Histórico" };

export default async function AdminHistoryPage({ searchParams }: { searchParams: Promise<{ temporada?: string; mais?: string }> }) {
  const params = await searchParams;
  try {
    const seasons = await loadSeasons();
    const primary = seasons.find((season) => season.code === params.temporada) ?? seasons.find((season) => season.isCurrent) ?? seasons[0];
    if (!primary) {
      return (
        <>
          <PageTitle>Histórico</PageTitle>
          <Empty>Nenhuma temporada cadastrada.</Empty>
        </>
      );
    }
    const extras = extraSeasonCodes(params.mais, seasons, primary.code);
    const selected = [primary.code, ...extras];
    const batches = await Promise.all(selected.map((code) => loadMatches(code)));
    const history = buildHistory(batches.flat());

    return <HistoryBoard seasons={seasons} primary={primary.code} extras={extras} columns={history.columns} rows={history.rows} share path="/admin/historico" />;
  } catch {
    return (
      <>
        <PageTitle>O histórico ainda não respondeu</PageTitle>
        <Empty>Confira se a API está no ar e atualize a página.</Empty>
      </>
    );
  }
}

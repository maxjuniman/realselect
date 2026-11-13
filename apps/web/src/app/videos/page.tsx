import { FutStatsFrame } from "@/components/FutStatsFrame";
import { loadFutStats } from "@/lib/api";
import { Empty, PageTitle, Panel, PanelHead, Rules } from "@/styles/ui";

export const metadata = { title: "Vídeos" };

export default async function VideosPage({ searchParams }: { searchParams: Promise<{ jogo?: string }> }) {
  const params = await searchParams;
  try {
    const catalog = await loadFutStats();
    const chosen = catalog.matches.find((item) => item.date === params.jogo);
    return (
      <Panel $top>
        <PanelHead>
          <PageTitle>Vídeos</PageTitle>
        </PanelHead>
        <Rules>Gols e lances do Fut Stats. Os números entram na artilharia depois que o organizador importa.</Rules>
        <FutStatsFrame src={chosen?.embed || catalog.embed} />
      </Panel>
    );
  } catch {
    return (
      <Panel $top $pad>
        <PageTitle>Vídeos</PageTitle>
        <Empty>O Fut Stats ainda não respondeu. Confira se a API está no ar e atualize a página.</Empty>
      </Panel>
    );
  }
}

import { RecordsBoard } from "@/components/RecordsBoard";
import { api } from "@/lib/api";
import type { ClubRecord } from "@/lib/types";
import { Empty, PageTitle, Panel } from "@/styles/ui";

export const metadata = { title: "Recordes" };

export default async function RecordsPage() {
  try {
    const records = await api<ClubRecord[]>("/records");
    return <RecordsBoard initial={records} />;
  } catch {
    return (
      <Panel $top $pad>
        <PageTitle>Recordes</PageTitle>
        <Empty>Os recordes ainda não responderam. Confira se a API está no ar e atualize a página.</Empty>
      </Panel>
    );
  }
}

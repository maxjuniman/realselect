import { MatchForm } from "@/components/MatchForm";
import { api, loadSeasons } from "@/lib/api";
import { Muted, PageTitle, Stack } from "@/styles/ui";
import type { PlayerRef } from "@/lib/types";

export const metadata = { title: "Nova terça" };

export default async function NewMatchPage() {
  const [players, seasons] = await Promise.all([api<PlayerRef[]>("/players"), loadSeasons()]);
  return (
    <Stack>
      <PageTitle>Nova terça</PageTitle>
      <Muted>Monte o A e o B, lance o placar e os gols. A classificação atualiza na hora.</Muted>
      <MatchForm players={players} seasons={seasons} />
    </Stack>
  );
}

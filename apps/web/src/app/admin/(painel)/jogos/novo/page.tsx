import { MatchForm } from "@/components/MatchForm";
import { api, loadSeasons } from "@/lib/api";
import { Muted, PageTitle, Stack } from "@/styles/ui";
import type { PlayerRef } from "@/lib/types";

export const metadata = { title: "Novo jogo" };

export default async function NewLineupPage() {
  const [players, seasons] = await Promise.all([api<PlayerRef[]>("/players"), loadSeasons()]);
  return (
    <Stack>
      <PageTitle>Novo jogo</PageTitle>
      <Muted>Monte a escalação, ou cole a lista com as cores e o placar para separar os times.</Muted>
      <MatchForm players={players} seasons={seasons} lineupOnly />
    </Stack>
  );
}

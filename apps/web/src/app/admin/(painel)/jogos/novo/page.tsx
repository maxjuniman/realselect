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
      <Muted>Monte só a escalação. O placar, os gols e o professor entram depois que a terça acontecer.</Muted>
      <MatchForm players={players} seasons={seasons} lineupOnly />
    </Stack>
  );
}

import { MatchForm } from "@/components/MatchForm";
import { api, loadSeasons } from "@/lib/api";
import { PageTitle, Stack } from "@/styles/ui";
import type { MatchDetail, PlayerRef } from "@/lib/types";

export default async function EditMatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [match, players, seasons] = await Promise.all([
    api<MatchDetail>(`/matches/${id}`),
    api<PlayerRef[]>("/players"),
    loadSeasons(),
  ]);
  return (
    <Stack>
      <PageTitle>Editar jogo</PageTitle>
      <MatchForm players={players} seasons={seasons} initial={match} />
    </Stack>
  );
}

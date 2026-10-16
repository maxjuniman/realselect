import { LaunchList } from "@/components/LaunchList";
import { SeasonSelect } from "@/components/SeasonSelect";
import { loadMatches, loadSeasons } from "@/lib/api";
import { formatTinyDate } from "@/lib/format";
import { placar, winnerTone } from "@/lib/score";
import { Actions, ButtonLink, Empty, List, ListLink, Muted, PageTitle, PanelHead, ScoreText, Stack } from "@/styles/ui";

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
      <List>
        {matches.map((match) => (
          <ListLink key={match.id} href={`/admin/jogos/${match.id}`}>
            <span>{formatTinyDate(match.playedOn)}</span>
            <ScoreText $tone={winnerTone(match)}>{placar(match)}</ScoreText>
            <Muted as="span">{match.professor ? `Prof. ${match.professor.name}` : match.scheduled ? "Antes do jogo" : "Sem professor"}</Muted>
          </ListLink>
        ))}
      </List>
      {!matches.length ? <Empty>Nenhum jogo neste semestre.</Empty> : null}
    </Stack>
  );
}

import { loadMatches, loadStandings } from "@/lib/api";
import { formatShortDate } from "@/lib/format";
import { ButtonLink, List, ListLink, PageTitle, Panel, PanelHead, SectionTitle, Stack, Stat, StatGrid } from "@/styles/ui";

export const metadata = { title: "Painel" };

export default async function AdminHome() {
  const table = await loadStandings();
  const matches = (await loadMatches(table.season.code)).slice(0, 6);
  const leader = table.rows[0];

  return (
    <Stack>
      <PanelHead $flush>
        <PageTitle>Painel</PageTitle>
        <ButtonLink href="/admin/jogos">Jogos</ButtonLink>
      </PanelHead>
      <StatGrid>
        <Stat><b>{table.season.name}</b><span>Temporada atual</span></Stat>
        <Stat><b>{leader ? leader.player.name : "—"}</b><span>Líder</span></Stat>
        <Stat><b>{leader ? leader.points : 0}</b><span>Pontos do líder</span></Stat>
        <Stat><b>{matches.length ? formatShortDate(matches[0].playedOn) : "—"}</b><span>Último jogo</span></Stat>
      </StatGrid>
      <Panel>
        <PanelHead><SectionTitle>Últimos jogos</SectionTitle></PanelHead>
        <List>
          {matches.map((match) => (
            <ListLink key={match.id} href={`/admin/jogos/${match.id}`}>
              <span>{formatShortDate(match.playedOn)}</span>
              <strong>{match.scoreLabel}</strong>
              <span>Editar</span>
            </ListLink>
          ))}
        </List>
      </Panel>
    </Stack>
  );
}

import { SeasonSelect } from "@/components/SeasonSelect";
import { loadScorers, loadSeasons, loadStandings } from "@/lib/api";
import { Empty, NameLink, PageTitle, PanelHead, RankRow, Rules, Stack, Table, TableWrap, Td, Th } from "@/styles/ui";

export const metadata = { title: "Artilharia" };

export default async function AdminScorersPage({ searchParams }: { searchParams: Promise<{ temporada?: string }> }) {
  const params = await searchParams;
  const seasons = await loadSeasons();
  const table = await loadStandings(params.temporada);
  const scorers = await loadScorers(table.season.code);
  const goals = scorers.rows.reduce((sum, row) => sum + row.goals, 0);
  const assists = scorers.rows.reduce((sum, row) => sum + row.assists, 0);
  const participations = scorers.rows.reduce((sum, row) => sum + row.participations, 0);

  return (
    <Stack>
      <PanelHead $flush>
        <PageTitle>Artilharia</PageTitle>
        <SeasonSelect seasons={seasons} value={table.season.code} path="/admin/artilharia" />
      </PanelHead>
      <Rules>
        Gols e assistências lançados por jogo, inclusive os importados do Fut Stats. {scorers.ownGoals ? `${scorers.ownGoals} gols contra no semestre.` : ""}
      </Rules>
      <TableWrap>
        <Table>
          <thead>
            <tr>
              <Th>#</Th>
              <Th>Jogador</Th>
              <Th $num>Gols ({goals})</Th>
              <Th $num>Assist. ({assists})</Th>
              <Th $num>Participações ({participations})</Th>
            </tr>
          </thead>
          <tbody>
            {scorers.rows.map((row) => (
              <RankRow key={row.player.id} $rank={row.position <= 3 ? row.position : 0}>
                <Td $place>{row.position}</Td>
                <Td $name>
                  <NameLink href={`/jogadores/${row.player.id}`}>{row.player.name}</NameLink>
                </Td>
                <Td $num>{row.goals}</Td>
                <Td $num>{row.assists}</Td>
                <Td $num>{row.participations}</Td>
              </RankRow>
            ))}
          </tbody>
        </Table>
      </TableWrap>
      {!scorers.rows.length ? <Empty>Ainda não há gols lançados neste semestre.</Empty> : null}
    </Stack>
  );
}

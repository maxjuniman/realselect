import { SeasonSelect } from "@/components/SeasonSelect";
import { api, loadSeasons, loadStandings } from "@/lib/api";
import { Empty, NameLink, Panel, PanelHead, RankRow, Rules, SectionTitle, Table, TableWrap, Td, Th } from "@/styles/ui";
import type { ScorerRow, Season } from "@/lib/types";

export const metadata = { title: "Artilharia" };

export default async function ScorersPage({ searchParams }: { searchParams: Promise<{ temporada?: string }> }) {
  const params = await searchParams;
  const seasons = await loadSeasons();
  const table = await loadStandings(params.temporada);
  const scorers = await api<{ season: Season; ownGoals: number; rows: ScorerRow[] }>(
    `/scorers?season=${encodeURIComponent(table.season.code)}`,
  );

  return (
    <Panel $top>
      <PanelHead>
        <SectionTitle>Artilharia</SectionTitle>
        <SeasonSelect seasons={seasons} value={table.season.code} path="/artilharia" />
      </PanelHead>
      <Rules>
        Gols e assistências lançados por jogo. {scorers.ownGoals ? `${scorers.ownGoals} gols contra no semestre.` : ""}
      </Rules>
      <TableWrap>
        <Table>
          <thead>
            <tr>
              <Th>#</Th>
              <Th>Jogador</Th>
              <Th $num>Gols</Th>
              <Th $num>Assist.</Th>
              <Th $num>Participações</Th>
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
      {!scorers.rows.length ? (
        <Empty>Ainda não há gols lançados neste semestre. O histórico antigo da planilha guardava quase só o saldo.</Empty>
      ) : null}
    </Panel>
  );
}

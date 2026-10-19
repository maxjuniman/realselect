import { StandingsTable } from "@/components/StandingsTable";
import { loadMatches, loadScorers, loadStandings } from "@/lib/api";
import { formatShortDate } from "@/lib/format";
import type { ScorerRow } from "@/lib/types";
import { ButtonLink, Empty, List, ListLink, NameLink, PageTitle, Panel, PanelHead, RankRow, SectionTitle, Stack, Stat, StatGrid, Table, TableWrap, Td, Th } from "@/styles/ui";

export const metadata = { title: "Painel" };

function byName(left: ScorerRow, right: ScorerRow) {
  return left.player.name.localeCompare(right.player.name, "pt-BR");
}

function Ranking({ title, rows, label }: { title: string; rows: ScorerRow[]; label: "Gols" | "Assistências" }) {
  return (
    <Panel>
      <PanelHead>
        <SectionTitle>{title}</SectionTitle>
      </PanelHead>
      {rows.length ? (
        <TableWrap>
          <Table>
            <thead>
              <tr>
                <Th>#</Th>
                <Th>Jogador</Th>
                <Th $num>{label}</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <RankRow key={row.player.id} $rank={index < 3 ? index + 1 : 0}>
                  <Td $place>{index + 1}</Td>
                  <Td $name>
                    <NameLink href={`/jogadores/${row.player.id}`}>{row.player.name}</NameLink>
                  </Td>
                  <Td $num>{label === "Gols" ? row.goals : row.assists}</Td>
                </RankRow>
              ))}
            </tbody>
          </Table>
        </TableWrap>
      ) : (
        <Empty>Ninguém nesta temporada.</Empty>
      )}
    </Panel>
  );
}

export default async function AdminHome() {
  const table = await loadStandings();
  const [scorers, matches] = await Promise.all([loadScorers(table.season.code), loadMatches(table.season.code)]);
  const recent = matches.slice(0, 6);
  const leader = table.rows.find((row) => row.player.name.trim().toLocaleLowerCase("pt-BR").replace(/\s+/g, " ") !== "goleiro de aluguel");
  const goals = [...scorers.rows].filter((row) => row.goals > 0).sort((left, right) => right.goals - left.goals || right.assists - left.assists || byName(left, right));
  const assists = [...scorers.rows].filter((row) => row.assists > 0).sort((left, right) => right.assists - left.assists || right.goals - left.goals || byName(left, right));

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
        <Stat><b>{recent.length ? formatShortDate(recent[0].playedOn) : "—"}</b><span>Último jogo</span></Stat>
      </StatGrid>
      <Panel>
        <PanelHead>
          <SectionTitle>Classificação</SectionTitle>
        </PanelHead>
        <StandingsTable rows={table.rows} />
      </Panel>
      <Ranking title="Artilharia" rows={goals} label="Gols" />
      <Ranking title="Assistências" rows={assists} label="Assistências" />
      <Panel>
        <PanelHead><SectionTitle>Últimos jogos</SectionTitle></PanelHead>
        <List>
          {recent.map((match) => (
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

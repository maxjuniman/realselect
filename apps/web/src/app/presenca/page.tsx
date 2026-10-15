import { loadAttendance } from "@/lib/api";
import { formatShortDate } from "@/lib/format";
import { Actions, ButtonLink, Guest, NameLink, Panel, PanelHead, Rules, SectionTitle, Table, TableWrap, Td, Th } from "@/styles/ui";

export const metadata = { title: "Presença" };

export default async function AttendancePage({ searchParams }: { searchParams: Promise<{ periodo?: string }> }) {
  const params = await searchParams;
  const scope = params.periodo === "ano" ? "year" : "last10";
  const data = await loadAttendance(scope);

  return (
    <Panel $top>
      <PanelHead>
        <SectionTitle>{data.label}</SectionTitle>
        <Actions>
          <ButtonLink href="/presenca" $variant={scope === "last10" ? "primary" : "ghost"}>
            10 jogos
          </ButtonLink>
          <ButtonLink href="/presenca?periodo=ano" $variant={scope === "year" ? "primary" : "ghost"}>
            12 meses
          </ButtonLink>
        </Actions>
      </PanelHead>
      <Rules>
        {data.matchCount} terças
        {data.from && data.to ? `, de ${formatShortDate(data.from)} a ${formatShortDate(data.to)}` : ""}.
      </Rules>
      <TableWrap>
        <Table>
          <thead>
            <tr>
              <Th>Jogador</Th>
              <Th $num>Jogos</Th>
              <Th>Último jogo</Th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row) => (
              <tr key={row.player.id}>
                <Td $name>
                  <NameLink href={`/jogadores/${row.player.id}`}>{row.player.name}</NameLink>
                  {row.player.guest ? <Guest>avulso</Guest> : null}
                </Td>
                <Td $num>{row.games}</Td>
                <Td>{formatShortDate(row.lastMatch)}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </TableWrap>
    </Panel>
  );
}

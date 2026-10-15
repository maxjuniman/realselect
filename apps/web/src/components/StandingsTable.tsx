"use client";

import { useMemo, useState } from "react";
import { formatDiff, formatPercent, formatShortDate } from "@/lib/format";
import { Empty, Guest, Muted, NameLink, RankRow, Search, Table, TableWrap, Td, Th, Toolbar } from "@/styles/ui";
import type { StandingRow } from "@/lib/types";

export function StandingsTable({ rows }: { rows: StandingRow[] }) {
  const [query, setQuery] = useState("");
  const visible = useMemo(() => {
    const term = query.trim().toLocaleLowerCase("pt-BR");
    if (!term) return rows;
    return rows.filter((row) => row.player.name.toLocaleLowerCase("pt-BR").includes(term));
  }, [query, rows]);

  return (
    <div>
      <Toolbar>
        <Search placeholder="Buscar jogador" value={query} onChange={(event) => setQuery(event.target.value)} />
        <Muted>{visible.length} jogadores</Muted>
      </Toolbar>
      <TableWrap>
        <Table>
          <thead>
            <tr>
              <Th>#</Th>
              <Th>Jogador</Th>
              <Th $num>P</Th>
              <Th $num>J</Th>
              <Th $num $extra>V</Th>
              <Th $num $extra>E</Th>
              <Th $num $extra>D</Th>
              <Th $num>SG</Th>
              <Th $num>Aprov.</Th>
              <Th $extra>Última vitória</Th>
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <RankRow key={row.player.id} $rank={!query && row.position <= 3 ? row.position : 0}>
                <Td $place>{row.position}</Td>
                <Td $name>
                  <NameLink href={`/jogadores/${row.player.id}`}>{row.player.name}</NameLink>
                  {row.player.guest ? <Guest>avulso</Guest> : null}
                </Td>
                <Td $num>{row.points}</Td>
                <Td $num>{row.games}</Td>
                <Td $num $extra>{row.wins}</Td>
                <Td $num $extra>{row.draws}</Td>
                <Td $num $extra>{row.losses}</Td>
                <Td $num>{formatDiff(row.goalDiff)}</Td>
                <Td $num>{formatPercent(row.utilization)}</Td>
                <Td $extra>{row.lastWin ? formatShortDate(row.lastWin) : "—"}</Td>
              </RankRow>
            ))}
          </tbody>
        </Table>
      </TableWrap>
      {!visible.length ? <Empty>Nenhum jogador com esse nome.</Empty> : null}
    </div>
  );
}

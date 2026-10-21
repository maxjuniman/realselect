"use client";

import { useState } from "react";
import { StandingsTable } from "@/components/StandingsTable";
import { formatShortDate } from "@/lib/format";
import type { MatchDetail, ScorerRow, StandingRow } from "@/lib/types";
import { Actions, Empty, GhostButton, List, ListLink, NameLink, PrimaryButton, RankRow, Table, TableWrap, Td, Th } from "@/styles/ui";

type Tab = "classificacao" | "artilharia" | "assistencias" | "jogos";

const tabs: { id: Tab; label: string }[] = [
  { id: "classificacao", label: "Classificação" },
  { id: "artilharia", label: "Artilharia" },
  { id: "assistencias", label: "Assistências" },
  { id: "jogos", label: "Jogos" },
];

function Ranking({ rows, label }: { rows: ScorerRow[]; label: "Gols" | "Assistências" }) {
  if (!rows.length) return <Empty>Ninguém nesta temporada.</Empty>;
  return (
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
  );
}

export function SummaryTabs({
  rows,
  goals,
  assists,
  matches,
  seasonName,
}: {
  rows: StandingRow[];
  goals: ScorerRow[];
  assists: ScorerRow[];
  matches: MatchDetail[];
  seasonName?: string;
}) {
  const [tab, setTab] = useState<Tab>("classificacao");

  return (
    <div>
      <Actions aria-label="Resumo da temporada">
        {tabs.map((item) => {
          const Button = tab === item.id ? PrimaryButton : GhostButton;
          return (
            <Button key={item.id} type="button" aria-pressed={tab === item.id} onClick={() => setTab(item.id)}>
              {item.label}
            </Button>
          );
        })}
      </Actions>
      <div>
        {tab === "classificacao" ? <StandingsTable rows={rows} seasonName={seasonName} share /> : null}
        {tab === "artilharia" ? <Ranking rows={goals} label="Gols" /> : null}
        {tab === "assistencias" ? <Ranking rows={assists} label="Assistências" /> : null}
        {tab === "jogos" ? (
          matches.length ? (
            <List>
              {matches.map((match) => (
                <ListLink key={match.id} href={`/admin/jogos/${match.id}`}>
                  <span>{formatShortDate(match.playedOn)}</span>
                  <strong>{match.scoreLabel}</strong>
                  <span>Editar</span>
                </ListLink>
              ))}
            </List>
          ) : (
            <Empty>Nenhum jogo nesta temporada.</Empty>
          )
        ) : null}
      </div>
    </div>
  );
}

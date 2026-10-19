import { AdminShortcut } from "@/components/AdminShortcut";
import { SummaryTabs } from "@/components/SummaryTabs";
import { loadMatches, loadScorers, loadStandings } from "@/lib/api";
import { formatShortDate } from "@/lib/format";
import type { ScorerRow } from "@/lib/types";
import { PageTitle, PanelHead, Stack, Stat, StatGrid } from "@/styles/ui";

export const metadata = { title: "Painel" };

function byName(left: ScorerRow, right: ScorerRow) {
  return left.player.name.localeCompare(right.player.name, "pt-BR");
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
        <AdminShortcut />
      </PanelHead>
      <StatGrid>
        <Stat><b>{table.season.name}</b><span>Temporada atual</span></Stat>
        <Stat><b>{leader ? leader.player.name : "—"}</b><span>Líder</span></Stat>
        <Stat><b>{leader ? leader.points : 0}</b><span>Pontos do líder</span></Stat>
        <Stat><b>{recent.length ? formatShortDate(recent[0].playedOn) : "—"}</b><span>Último jogo</span></Stat>
      </StatGrid>
      <SummaryTabs rows={table.rows} goals={goals} assists={assists} matches={recent} />
    </Stack>
  );
}

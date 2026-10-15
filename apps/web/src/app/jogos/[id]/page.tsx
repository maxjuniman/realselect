import { notFound } from "next/navigation";
import { ApiError, api } from "@/lib/api";
import { formatDiff, formatLongDate, resultLabel } from "@/lib/format";
import { Kicker, Lineup, Muted, NameLink, PageBlock, PageTitle, Pill, PlayerLine, Scoreline, SideCard } from "@/styles/ui";
import type { LinePlayer, MatchDetail } from "@/lib/types";

function Team({ title, tone, players }: { title: string; tone: "a" | "b"; players: LinePlayer[] }) {
  return (
    <SideCard>
      <h2>
        <Pill $tone={tone}>{title}</Pill>
      </h2>
      {players.map((player) => (
        <PlayerLine key={player.id}>
          <div>
            <NameLink href={`/jogadores/${player.id}`}>{player.name}</NameLink>
            <Muted>
              {resultLabel(player.result)}, saldo {formatDiff(player.goalDiff)}
              {player.goals ? `, ${player.goals} gol${player.goals > 1 ? "s" : ""}` : ""}
              {player.assists ? `, ${player.assists} assistência${player.assists > 1 ? "s" : ""}` : ""}
            </Muted>
          </div>
          <b>{player.points} pts</b>
        </PlayerLine>
      ))}
    </SideCard>
  );
}

export default async function MatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let match: MatchDetail;
  try {
    match = await api<MatchDetail>(`/matches/${id}`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
  return (
    <PageBlock>
      <Kicker>{match.season.name}</Kicker>
      <PageTitle>{formatLongDate(match.playedOn)}</PageTitle>
      <Scoreline>{match.scoreLabel}</Scoreline>
      <Muted>
        {match.professor ? `Professor da rodada: ${match.professor.name}. ` : ""}
        {match.ownGoals ? `${match.ownGoals} gol contra. ` : ""}
        {match.origin === "planilha" ? "Registro importado da planilha." : "Lançado no painel."}
      </Muted>
      <Lineup>
        <Team title="Time A" tone="a" players={match.teamA} />
        <Team title="Time B" tone="b" players={match.teamB} />
      </Lineup>
    </PageBlock>
  );
}

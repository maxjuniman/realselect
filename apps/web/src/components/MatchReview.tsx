"use client";

import { useState } from "react";
import { MatchAwards } from "@/components/MatchAwards";
import { awardsOpen } from "@/lib/awards";
import { shareLineupImage } from "@/lib/lineup-image";
import { formatLongDate } from "@/lib/format";
import type { LinePlayer, MatchDetail } from "@/lib/types";
import { Actions, ButtonLink, ErrorText, Lineup, Muted, PageTitle, Pill, PlayerLine, PrimaryButton, SideCard, Stack } from "@/styles/ui";

export function MatchReview({ match }: { match: MatchDetail }) {
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [sharing, setSharing] = useState(false);

  async function share() {
    setError("");
    setNote("");
    setSharing(true);
    try {
      const result = await shareLineupImage(match);
      if (result === "downloaded") setNote("A imagem foi baixada. No WhatsApp, anexe esse arquivo na conversa.");
    } catch (caught) {
      if (caught instanceof Error && caught.name === "AbortError") return;
      setError(caught instanceof Error ? caught.message : "Não foi possível compartilhar.");
    } finally {
      setSharing(false);
    }
  }

  return (
    <Stack>
      <div>
        <ButtonLink href="/admin/jogos" $variant="ghost">
          Jogos
        </ButtonLink>
        <PageTitle>{formatLongDate(match.playedOn)}</PageTitle>
        <Muted>
          {match.season.name}
          {match.scheduled ? ". Escalação, ainda sem resultado." : `. ${match.scoreLabel}.`}
          {match.professor ? ` Professor: ${match.professor.name}.` : " Sem professor."}
        </Muted>
      </div>
      <Lineup>
        <Team title="Time A" tone="a" players={match.teamA} />
        <Team title="Time B" tone="b" players={match.teamB} />
      </Lineup>
      {awardsOpen(match) ? <MatchAwards matchId={match.id} playedOn={match.playedOn} players={[...match.teamA, ...match.teamB]} /> : null}
      {error ? <ErrorText>{error}</ErrorText> : null}
      {note ? <Muted>{note}</Muted> : null}
      <Actions>
        {match.scheduled ? (
          <PrimaryButton type="button" disabled={sharing} onClick={share}>
            {sharing ? "Gerando imagem..." : "Compartilhar no WhatsApp"}
          </PrimaryButton>
        ) : null}
        <ButtonLink href={`/admin/jogo/${match.id}`} $variant={match.scheduled ? "ghost" : "primary"}>
          Editar
        </ButtonLink>
      </Actions>
    </Stack>
  );
}

function Team({ title, tone, players }: { title: string; tone: "a" | "b"; players: LinePlayer[] }) {
  return (
    <SideCard>
      <h2>
        <Pill $tone={tone}>{title}</Pill>
      </h2>
      {players.map((player) => (
        <PlayerLine key={player.id}>
          <div>
            <b>{player.name}</b>
            {player.goals || player.assists ? (
              <Muted>
                {player.goals ? `${player.goals} gol${player.goals > 1 ? "s" : ""}` : ""}
                {player.goals && player.assists ? " · " : ""}
                {player.assists ? `${player.assists} assistência${player.assists > 1 ? "s" : ""}` : ""}
              </Muted>
            ) : null}
          </div>
        </PlayerLine>
      ))}
      {!players.length ? <Muted>Ninguém neste time.</Muted> : null}
    </SideCard>
  );
}

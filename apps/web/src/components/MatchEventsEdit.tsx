"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styled from "styled-components";
import { clientApi } from "@/lib/client";
import type { LinePlayer, MatchDetail } from "@/lib/types";
import { ErrorText, GhostButton, Muted, PrimaryButton } from "@/styles/ui";

function counts(players: LinePlayer[], field: "goals" | "assists") {
  const map: Record<string, number> = {};
  for (const player of players) {
    if (player[field]) map[player.id] = player[field];
  }
  return map;
}

export function MatchEventsEdit({ match }: { match: MatchDetail }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [goals, setGoals] = useState<Record<string, number>>({});
  const [assists, setAssists] = useState<Record<string, number>>({});
  const [ownGoals, setOwnGoals] = useState(0);

  const colorA = match.colorA === "roxo" ? "roxo" : "verde";
  const colorB = colorA === "verde" ? "roxo" : "verde";
  const verde = colorA === "verde" ? match.teamA : match.teamB;
  const roxo = colorA === "roxo" ? match.teamA : match.teamB;

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !busy) setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, busy]);

  function show() {
    setGoals(counts([...match.teamA, ...match.teamB], "goals"));
    setAssists(counts([...match.teamA, ...match.teamB], "assists"));
    setOwnGoals(match.ownGoals);
    setError("");
    setOpen(true);
  }

  function bump(kind: "goals" | "assists", id: string, delta: number) {
    const setter = kind === "goals" ? setGoals : setAssists;
    setter((current) => ({ ...current, [id]: Math.max(0, Math.min(30, (current[id] ?? 0) + delta)) }));
  }

  async function save() {
    setBusy(true);
    setError("");
    try {
      const events = [...match.teamA, ...match.teamB].flatMap((player) => {
        const items: { playerId: string | null; type: "goal" | "assist" | "own_goal"; count: number }[] = [];
        if (goals[player.id]) items.push({ playerId: player.id, type: "goal", count: goals[player.id] });
        if (assists[player.id]) items.push({ playerId: player.id, type: "assist", count: assists[player.id] });
        return items;
      });
      if (ownGoals) events.push({ playerId: null, type: "own_goal", count: ownGoals });
      await clientApi<MatchDetail>(`/admin/matches/${match.id}/events`, { method: "PATCH", body: JSON.stringify({ events }) });
      setOpen(false);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível salvar os gols.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <GhostButton type="button" onClick={show}>
        Editar gols
      </GhostButton>
      {open ? (
        <Backdrop onClick={() => !busy && setOpen(false)}>
          <Dialog role="dialog" aria-label={`Editar gols de ${match.playedOn}`} onClick={(event) => event.stopPropagation()}>
            <h2>Gols e assistências</h2>
            <Muted>Ajuste o que o Fut Stats errou ou o que faltou lançar. O placar do jogo não muda.</Muted>
            <Teams>
              <TeamColumn tone="verde" players={verde} goals={goals} assists={assists} onBump={bump} />
              <TeamColumn tone="roxo" players={roxo} goals={goals} assists={assists} onBump={bump} />
            </Teams>
            <OwnLine>
              <span>Gol contra</span>
              <Stepper>
                <Step type="button" aria-label="Tirar gol contra" onClick={() => setOwnGoals((value) => Math.max(0, value - 1))}>
                  −
                </Step>
                <Count>{ownGoals}</Count>
                <Step type="button" aria-label="Adicionar gol contra" onClick={() => setOwnGoals((value) => Math.min(30, value + 1))}>
                  +
                </Step>
              </Stepper>
            </OwnLine>
            {error ? <ErrorText>{error}</ErrorText> : null}
            <Actions>
              <GhostButton type="button" disabled={busy} onClick={() => setOpen(false)}>
                Cancelar
              </GhostButton>
              <PrimaryButton type="button" disabled={busy} onClick={() => void save()}>
                {busy ? "Salvando..." : "Salvar"}
              </PrimaryButton>
            </Actions>
          </Dialog>
        </Backdrop>
      ) : null}
    </>
  );
}

function TeamColumn({
  tone,
  players,
  goals,
  assists,
  onBump,
}: {
  tone: "verde" | "roxo";
  players: LinePlayer[];
  goals: Record<string, number>;
  assists: Record<string, number>;
  onBump: (kind: "goals" | "assists", id: string, delta: number) => void;
}) {
  return (
    <Team $tone={tone}>
      <strong>{tone === "verde" ? "Verde" : "Roxo"}</strong>
      {players.map((player) => (
        <Player key={player.id}>
          <b>{player.name}</b>
          <Stat>
            <span>Gol</span>
            <Stepper>
              <Step type="button" $tone={tone} aria-label={`Tirar gol de ${player.name}`} onClick={() => onBump("goals", player.id, -1)}>
                −
              </Step>
              <Count>{goals[player.id] ?? 0}</Count>
              <Step type="button" $tone={tone} $fill aria-label={`Adicionar gol de ${player.name}`} onClick={() => onBump("goals", player.id, 1)}>
                +
              </Step>
            </Stepper>
          </Stat>
          <Stat>
            <span>Assist.</span>
            <Stepper>
              <Step type="button" $tone={tone} aria-label={`Tirar assistência de ${player.name}`} onClick={() => onBump("assists", player.id, -1)}>
                −
              </Step>
              <Count>{assists[player.id] ?? 0}</Count>
              <Step type="button" $tone={tone} $fill aria-label={`Adicionar assistência de ${player.name}`} onClick={() => onBump("assists", player.id, 1)}>
                +
              </Step>
            </Stepper>
          </Stat>
        </Player>
      ))}
    </Team>
  );
}

const paint = { verde: "#008000", roxo: "#993aa2" };

const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 30;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgba(28, 16, 34, 0.46);
`;

const Dialog = styled.div`
  width: min(860px, 100%);
  max-height: min(860px, 100%);
  overflow: auto;
  background: ${({ theme }) => theme.paper};
  padding: 22px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  h2 {
    margin: 0;
    font-family: ${({ theme }) => theme.display};
    font-stretch: 87.5%;
    font-weight: 700;
    font-size: 32px;
    letter-spacing: -0.03em;
    line-height: 0.95;
  }
`;

const Teams = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px 24px;
  @media (max-width: 720px) {
    grid-template-columns: 1fr;
  }
`;

const Team = styled.div<{ $tone: "verde" | "roxo" }>`
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-left: 10px;
  box-shadow: inset 3px 0 0 ${({ $tone }) => paint[$tone]};
  strong {
    color: ${({ $tone }) => paint[$tone]};
    text-transform: uppercase;
    letter-spacing: 0.04em;
    font-size: 12px;
  }
`;

const Player = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-bottom: 8px;
  border-bottom: 1px solid ${({ theme }) => theme.line};
`;

const Stat = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  color: ${({ theme }) => theme.muted};
`;

const OwnLine = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
`;

const Stepper = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`;

const Step = styled.button<{ $tone?: "verde" | "roxo"; $fill?: boolean }>`
  width: 28px;
  height: 28px;
  padding: 0;
  border: 1px solid ${({ $tone }) => ($tone ? paint[$tone] : "currentColor")};
  background: ${({ $fill, $tone }) => ($fill && $tone ? paint[$tone] : "transparent")};
  color: ${({ $fill, $tone, theme }) => ($fill ? "white" : $tone ? paint[$tone] : theme.ink)};
  cursor: pointer;
`;

const Count = styled.span`
  min-width: 1.4em;
  text-align: center;
  font-weight: 700;
  color: ${({ theme }) => theme.ink};
`;

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

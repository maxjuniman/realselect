"use client";

import { useEffect, useState } from "react";
import styled from "styled-components";
import { lastProfessorId, nextGameDate, nextInRotation, substituteQueue } from "@/lib/call-list";
import { clientApi } from "@/lib/client";
import { formatTinyDate } from "@/lib/format";
import type { MatchDetail, PlayerRef, ProfessorRoster } from "@/lib/types";
import { ErrorText, MiniButton, Muted, PageTitle, PanelHead, Person, SectionTitle, Stack } from "@/styles/ui";

type Turn = ProfessorRoster["order"][number];

export default function ProfessorsPage() {
  const [order, setOrder] = useState<Turn[]>([]);
  const [absences, setAbsences] = useState<ProfessorRoster["absences"]>([]);
  const [matches, setMatches] = useState<MatchDetail[]>([]);
  const [substitutes, setSubstitutes] = useState<PlayerRef[]>([]);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);

  const date = nextGameDate(matches);
  const absentIds = absences.filter((absence) => absence.playedOn === date).map((absence) => absence.playerId);
  const next = nextInRotation(order, lastProfessorId(matches), absentIds);

  function apply(roster: ProfessorRoster) {
    setOrder(roster.order);
    setAbsences(roster.absences);
  }

  useEffect(() => {
    Promise.all([
      clientApi<PlayerRef[]>("/players"),
      clientApi<MatchDetail[]>("/matches"),
      clientApi<ProfessorRoster>("/admin/professors"),
    ])
      .then(([players, loadedMatches, roster]) => {
        setMatches(loadedMatches);
        setSubstitutes(substituteQueue(players, loadedMatches));
        apply(roster);
        setReady(true);
      })
      .catch((caught: Error) => {
        setError(caught.message);
        setReady(true);
      });
  }, []);

  async function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= order.length || busy) return;
    const item = order[index];
    if (!item) return;
    const previous = order;
    const nextOrder = [...order];
    nextOrder.splice(index, 1);
    nextOrder.splice(target, 0, item);
    setOrder(nextOrder);
    setBusy(true);
    setError("");
    try {
      apply(await clientApi<ProfessorRoster>("/admin/professors", {
        method: "PUT",
        body: JSON.stringify({ playerIds: nextOrder.map((player) => player.id) }),
      }));
    } catch (caught) {
      setOrder(previous);
      setError(caught instanceof Error ? caught.message : "Não consegui salvar a ordem.");
    } finally {
      setBusy(false);
    }
  }

  async function toggle(playerId: string) {
    if (busy) return;
    const previous = absences;
    const current = absences.filter((absence) => absence.playedOn === date).map((absence) => absence.playerId);
    const playerIds = current.includes(playerId) ? current.filter((id) => id !== playerId) : [...current, playerId];
    setAbsences([
      ...absences.filter((absence) => absence.playedOn !== date),
      ...playerIds.map((id) => ({ playedOn: date, playerId: id })),
    ]);
    setBusy(true);
    setError("");
    try {
      apply(await clientApi<ProfessorRoster>("/admin/absences", {
        method: "PUT",
        body: JSON.stringify({ playedOn: date, playerIds }),
      }));
    } catch (caught) {
      setAbsences(previous);
      setError(caught instanceof Error ? caught.message : "Não consegui marcar a falta.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Stack>
      <PanelHead $flush>
        <PageTitle>Professores</PageTitle>
      </PanelHead>
      {ready ? (
        <Muted>
          A ordem é só de mensalistas. Quando acaba, volta para o primeiro. Inativar tira a pessoa só da terça {formatTinyDate(date)}, da lista e da vez de professor.
        </Muted>
      ) : (
        <Muted>Abrindo a ordem...</Muted>
      )}
      {next ? <Muted>Próximo professor: {next.name}.</Muted> : null}
      {error ? <ErrorText>{error}</ErrorText> : null}
      {ready && !order.length && !error ? <Muted>Nenhum mensalista na ordem.</Muted> : null}
      <div>
        {order.map((player, index) => (
          <Row key={player.id} $out={absentIds.includes(player.id)}>
            <Person>
              <span>
                <b>
                  {index + 1}. {player.name}
                </b>
                {player.positions[0] ? <Muted as="span"> {player.positions[0]}</Muted> : null}
                {absentIds.includes(player.id) ? <Muted as="span"> · Falta</Muted> : null}
              </span>
              <Actions>
                <MiniButton type="button" aria-label={`Subir ${player.name}`} disabled={busy || index === 0} onClick={() => move(index, -1)}>
                  ↑
                </MiniButton>
                <MiniButton type="button" aria-label={`Descer ${player.name}`} disabled={busy || index === order.length - 1} onClick={() => move(index, 1)}>
                  ↓
                </MiniButton>
                <MiniButton type="button" aria-label={`${absentIds.includes(player.id) ? "Ativar" : "Inativar"} ${player.name}`} onClick={() => toggle(player.id)} disabled={busy}>
                  {absentIds.includes(player.id) ? "Ativar" : "Inativar"}
                </MiniButton>
              </Actions>
            </Person>
          </Row>
        ))}
      </div>
      {substitutes.length ? (
        <Block>
          <SectionTitle>Suplentes</SectionTitle>
          <Muted>Quem está há mais tempo sem jogar vem primeiro. Inativar também vale só nesta terça.</Muted>
          {substitutes.map((player) => (
            <Row key={player.id} $out={absentIds.includes(player.id)}>
              <Person>
                <span>
                  <b>{player.name}</b>
                  {player.positions?.[0] ? <Muted as="span"> {player.positions[0]}</Muted> : null}
                  {absentIds.includes(player.id) ? <Muted as="span"> · Falta</Muted> : null}
                </span>
                <MiniButton type="button" aria-label={`${absentIds.includes(player.id) ? "Ativar" : "Inativar"} ${player.name}`} onClick={() => toggle(player.id)} disabled={busy}>
                  {absentIds.includes(player.id) ? "Ativar" : "Inativar"}
                </MiniButton>
              </Person>
            </Row>
          ))}
        </Block>
      ) : null}
    </Stack>
  );
}

const Block = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 12px;
`;

const Row = styled.div<{ $out: boolean }>`
  opacity: ${({ $out }) => ($out ? 0.55 : 1)};
`;

const Actions = styled.div`
  display: flex;
  gap: 6px;
  align-items: center;
`;

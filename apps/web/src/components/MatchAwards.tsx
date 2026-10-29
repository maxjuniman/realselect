"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { awardCandidate } from "@/lib/awards";
import { clientApi } from "@/lib/client";
import { formatLongDate, formatTinyDate } from "@/lib/format";
import { ErrorText, Field, GhostButton, Muted, PrimaryButton, Select, Table, Td, Th } from "@/styles/ui";

type Person = { id: string; name: string };
type Count = Person & { votes: number };
type Ballot = { voterId: string; voter: string; craqueId: string; craque: string; perebaId: string; pereba: string };
type Awards = {
  open: boolean;
  role: "guest" | "player" | "admin";
  mine: { craqueId: string; craque: string; perebaId: string; pereba: string } | null;
  tally: { craque: Count[]; pereba: Count[] };
  ballots: Ballot[] | null;
};

function named(rows: Count[]) {
  return rows.map((row) => `${row.name} (${row.votes})`).join(", ");
}

function participants(players: Person[]) {
  const byId = new Map<string, Person>();
  for (const player of players) {
    if (!awardCandidate(player.name) || byId.has(player.id)) continue;
    byId.set(player.id, player);
  }
  return [...byId.values()].sort((left, right) => left.name.localeCompare(right.name, "pt-BR"));
}

export function MatchAwards({
  matchId,
  playedOn,
  players,
  ballots = false,
}: {
  matchId: string;
  playedOn: string;
  players: Person[];
  ballots?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [awards, setAwards] = useState<Awards | null>(null);
  const [craqueId, setCraqueId] = useState("");
  const [perebaId, setPerebaId] = useState("");
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const craqueRef = useRef<HTMLSelectElement>(null);
  const perebaRef = useRef<HTMLSelectElement>(null);
  const when = formatTinyDate(playedOn);
  const lineup = participants(players);
  const titleId = `vote-${matchId}`;

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !saving) setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, saving]);

  function applyMine(data: Awards) {
    const allowed = new Set(lineup.map((player) => player.id));
    setCraqueId(data.mine && allowed.has(data.mine.craqueId) ? data.mine.craqueId : "");
    setPerebaId(data.mine && allowed.has(data.mine.perebaId) ? data.mine.perebaId : "");
  }

  function show() {
    setOpen(true);
    setError("");
    setNote("");
    if (awards || loading) return;
    setLoading(true);
    clientApi<Awards>(`/matches/${matchId}/votes`)
      .then((data) => {
        setAwards(data);
        applyMine(data);
        if (!data.open) setOpen(false);
      })
      .catch((caught: unknown) => {
        setError(caught instanceof Error ? caught.message : "Não foi possível carregar os votos.");
      })
      .finally(() => setLoading(false));
  }

  function close() {
    if (saving) return;
    setOpen(false);
  }

  async function save() {
    const nextCraque = craqueRef.current?.value || craqueId;
    const nextPereba = perebaRef.current?.value || perebaId;
    setError("");
    setNote("");
    if (!nextCraque || !nextPereba) {
      setError("Escolha o craque e a pereba.");
      return;
    }
    if (nextCraque === nextPereba) {
      setError("O craque e a pereba precisam ser pessoas diferentes.");
      return;
    }
    if (!lineup.some((player) => player.id === nextCraque) || !lineup.some((player) => player.id === nextPereba)) {
      setError("Escolha alguém que jogou.");
      return;
    }
    setSaving(true);
    try {
      const data = await clientApi<Awards>(`/matches/${matchId}/votes`, {
        method: "PUT",
        body: JSON.stringify({ craqueId: nextCraque, perebaId: nextPereba }),
      });
      setAwards(data);
      applyMine(data);
      setNote("Voto salvo.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível salvar o voto.");
    } finally {
      setSaving(false);
    }
  }

  const label = ballots ? "Votos" : awards?.mine ? "Alterar voto" : "Votar";
  const hasVotes = Boolean(awards && (awards.tally.craque.length || awards.tally.pereba.length));
  const showForm = awards?.role === "player";

  return (
    <>
      <Open type="button" aria-label={`${label} no jogo ${when}`} onClick={show}>
        <Star />
      </Open>
      {open ? (
        <Backdrop onMouseDown={close}>
          <Dialog role="dialog" aria-modal="true" aria-labelledby={titleId} onMouseDown={(event) => event.stopPropagation()}>
            <h2 id={titleId}>{ballots ? "Quem votou" : "Craque e pereba"}</h2>
            <Muted>{formatLongDate(playedOn)}{ballots ? "." : ". Escolha entre quem jogou."}</Muted>
            {loading ? <Muted>Carregando votos...</Muted> : null}
            {showForm ? (
              <Form>
                <Field>
                  Craque do jogo
                  <Select ref={craqueRef} aria-label={`Craque do jogo ${when}`} value={craqueId} onChange={(event) => setCraqueId(event.target.value)}>
                    <option value="">Escolher</option>
                    {lineup.map((player) => (
                      <option key={player.id} value={player.id}>
                        {player.name}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field>
                  Pereba do jogo
                  <Select ref={perebaRef} aria-label={`Pereba do jogo ${when}`} value={perebaId} onChange={(event) => setPerebaId(event.target.value)}>
                    <option value="">Escolher</option>
                    {lineup.map((player) => (
                      <option key={player.id} value={player.id}>
                        {player.name}
                      </option>
                    ))}
                  </Select>
                </Field>
                <PrimaryButton type="button" disabled={saving || !lineup.length} onClick={() => void save()}>
                  {saving ? "Salvando..." : "Salvar voto"}
                </PrimaryButton>
              </Form>
            ) : null}
            {awards?.role === "guest" ? <Enter href="/admin/login">Entre para escolher o craque e a pereba.</Enter> : null}
            {awards?.role === "admin" ? (
              awards.ballots?.length ? (
                <Sheet>
                  <Table>
                    <thead>
                      <tr>
                        <Th>
                          <VisuallyHidden>Quem votou</VisuallyHidden>
                        </Th>
                        <Th>Craque</Th>
                        <Th>Pereba</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {awards.ballots.map((ballot) => (
                        <tr key={ballot.voterId}>
                          <Td $name>{ballot.voter}</Td>
                          <Td>{ballot.craque}</Td>
                          <Td>{ballot.pereba}</Td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </Sheet>
              ) : (
                <Muted>Ninguém votou ainda.</Muted>
              )
            ) : null}
            {hasVotes ? (
              <Tally>
                <p>Craque: {named(awards!.tally.craque) || "ninguém"}</p>
                <p>Pereba: {named(awards!.tally.pereba) || "ninguém"}</p>
              </Tally>
            ) : null}
            {note ? <Muted>{note}</Muted> : null}
            {error ? <ErrorText>{error}</ErrorText> : null}
            <GhostButton type="button" onClick={close}>
              Fechar
            </GhostButton>
          </Dialog>
        </Backdrop>
      ) : null}
    </>
  );
}

function Star() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="m12 3 2.6 5.6 6.1.8-4.5 4.2 1.1 6.1L12 16.8 6.7 19.7l1.1-6.1L3.3 9.4l6.1-.8L12 3Z" />
    </svg>
  );
}

const Open = styled.button`
  width: 40px;
  height: 40px;
  padding: 0;
  border: 0;
  display: grid;
  place-items: center;
  background: ${({ theme }) => theme.purple};
  color: white;
  cursor: pointer;
  &:hover {
    background: ${({ theme }) => theme.purpleDeep};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.purpleDeep};
    outline-offset: 3px;
  }
`;

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
  width: min(640px, 100%);
  max-height: min(860px, 100%);
  overflow: auto;
  background: ${({ theme }) => theme.paper};
  padding: 22px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
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

const Form = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
  width: 100%;
  select {
    width: 100%;
  }
`;

const Enter = styled(Link)`
  color: ${({ theme }) => theme.purpleDeep};
  font-weight: 700;
  &:hover {
    text-decoration: underline;
    text-underline-offset: 3px;
  }
`;

const Sheet = styled.div`
  width: 100%;
  overflow-x: auto;
`;

const VisuallyHidden = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
`;

const Tally = styled.div`
  p {
    margin: 0;
  }
`;

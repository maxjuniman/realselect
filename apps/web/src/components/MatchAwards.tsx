"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { awardCandidate } from "@/lib/awards";
import { clientApi } from "@/lib/client";
import { formatTinyDate } from "@/lib/format";
import { ErrorText, Field, Muted, PrimaryButton, Select } from "@/styles/ui";

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

function choices(players: Person[], current: Person | null) {
  const list = players.filter((player) => awardCandidate(player.name));
  if (current && !list.some((player) => player.id === current.id)) list.push(current);
  return list.sort((left, right) => left.name.localeCompare(right.name, "pt-BR"));
}

export function MatchAwards({ matchId, playedOn, players }: { matchId: string; playedOn: string; players: Person[] }) {
  const [awards, setAwards] = useState<Awards | null>(null);
  const [craqueId, setCraqueId] = useState("");
  const [perebaId, setPerebaId] = useState("");
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const craqueRef = useRef<HTMLSelectElement>(null);
  const perebaRef = useRef<HTMLSelectElement>(null);
  const when = formatTinyDate(playedOn);

  useEffect(() => {
    let cancel = false;
    clientApi<Awards>(`/matches/${matchId}/votes`)
      .then((data) => {
        if (cancel) return;
        setAwards(data);
        setCraqueId(data.mine?.craqueId ?? "");
        setPerebaId(data.mine?.perebaId ?? "");
      })
      .catch((caught: unknown) => {
        if (!cancel) setError(caught instanceof Error ? caught.message : "Não foi possível carregar os votos.");
      });
    return () => {
      cancel = true;
    };
  }, [matchId]);

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
    setSaving(true);
    try {
      const data = await clientApi<Awards>(`/matches/${matchId}/votes`, {
        method: "PUT",
        body: JSON.stringify({ craqueId: nextCraque, perebaId: nextPereba }),
      });
      setAwards(data);
      setCraqueId(data.mine?.craqueId ?? "");
      setPerebaId(data.mine?.perebaId ?? "");
      setNote("Voto salvo.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível salvar o voto.");
    } finally {
      setSaving(false);
    }
  }

  if (awards && !awards.open) return null;
  const craqueOptions = choices(players, awards?.mine ? { id: awards.mine.craqueId, name: awards.mine.craque } : null);
  const perebaOptions = choices(players, awards?.mine ? { id: awards.mine.perebaId, name: awards.mine.pereba } : null);
  const hasVotes = Boolean(awards && (awards.tally.craque.length || awards.tally.pereba.length));

  return (
    <Box>
      <b>Craque e pereba</b>
      {!awards && !error ? <Muted>Carregando votos...</Muted> : null}
      {awards?.role === "guest" ? <Enter href="/admin/login">Entre para escolher o craque e a pereba.</Enter> : null}
      {awards?.role === "player" ? (
        <Form>
          <Field>
            Craque do jogo
            <Select ref={craqueRef} aria-label={`Craque do jogo ${when}`} value={craqueId} onChange={(event) => setCraqueId(event.target.value)}>
              <option value="">Escolher</option>
              {craqueOptions.map((player) => (
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
              {perebaOptions.map((player) => (
                <option key={player.id} value={player.id}>
                  {player.name}
                </option>
              ))}
            </Select>
          </Field>
          <PrimaryButton type="button" disabled={saving || !craqueOptions.length} onClick={() => void save()}>
            {saving ? "Salvando..." : "Salvar voto"}
          </PrimaryButton>
        </Form>
      ) : null}
      {awards?.role === "admin" ? (
        <Ballots>
          <b>Quem votou</b>
          {awards.ballots?.length ? (
            awards.ballots.map((ballot) => (
              <p key={ballot.voterId}>
                {ballot.voter} votou em {ballot.craque} como craque e em {ballot.pereba} como pereba.
              </p>
            ))
          ) : (
            <Muted>Ninguém votou ainda.</Muted>
          )}
        </Ballots>
      ) : null}
      {hasVotes ? (
        <Tally>
          <p>Craque: {named(awards!.tally.craque) || "ninguém"}</p>
          <p>Pereba: {named(awards!.tally.pereba) || "ninguém"}</p>
        </Tally>
      ) : null}
      {note ? <Muted>{note}</Muted> : null}
      {error ? <ErrorText>{error}</ErrorText> : null}
    </Box>
  );
}

const Box = styled.section`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  margin: 4px 0 12px;
  padding-top: 8px;
  border-top: 1px solid ${({ theme }) => theme.line};
  > b {
    font-weight: 700;
  }
`;

const Form = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto;
  gap: 10px;
  align-items: end;
  width: min(720px, 100%);
  @media (max-width: 720px) {
    grid-template-columns: 1fr;
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

const Ballots = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  b {
    font-weight: 700;
  }
  p {
    margin: 0;
  }
`;

const Tally = styled.div`
  p {
    margin: 0;
  }
`;

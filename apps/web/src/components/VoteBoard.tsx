"use client";

import { useEffect, useState } from "react";
import styled from "styled-components";
import { clientApi } from "@/lib/client";
import { formatLongDate, formatShortDate } from "@/lib/format";
import { Empty, ErrorText, GhostButton, Muted, Table, Td, Th } from "@/styles/ui";

type Person = { id: string; name: string; votes: number };
type Ballot = { voterId: string; voter: string; craque: string; pereba: string };
type Game = {
  id: string;
  playedOn: string;
  craque: Person[];
  pereba: Person[];
  ballots: Ballot[];
};
type Summary = {
  season: { code: string; name: string };
  craque: Person[];
  pereba: Person[];
  matches: Game[];
};

function names(people: Person[]) {
  if (!people.length) return "ninguém";
  const label = people.map((person) => person.name).join(" e ");
  return `${label} (${people[0].votes})`;
}

export function VoteBoard({ season }: { season: string }) {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;
    setSummary(null);
    setError("");
    setOpenId(null);
    clientApi<Summary>(`/admin/votes?season=${encodeURIComponent(season)}`)
      .then((data) => {
        if (!cancel) setSummary(data);
      })
      .catch((caught: unknown) => {
        if (!cancel) setError(caught instanceof Error ? caught.message : "Não foi possível carregar a votação.");
      });
    return () => {
      cancel = true;
    };
  }, [season]);

  useEffect(() => {
    if (!openId) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpenId(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openId]);

  if (error) return <ErrorText>{error}</ErrorText>;
  if (!summary) return <Muted>Carregando votos...</Muted>;
  const open = summary.matches.find((match) => match.id === openId) ?? null;

  return (
    <>
      <Leaders>
        <div>
          <Muted>Craque da temporada</Muted>
          <strong>{names(summary.craque)}</strong>
        </div>
        <div>
          <Muted>Pereba da temporada</Muted>
          <strong>{names(summary.pereba)}</strong>
        </div>
      </Leaders>
      {summary.matches.length ? (
        <List>
          {summary.matches.map((match) => {
            const when = formatShortDate(match.playedOn);
            return (
              <Row key={match.id}>
                <p>
                  {when}, craque {names(match.craque)}, pereba {names(match.pereba)}
                </p>
                <Open type="button" aria-label={`Ver votos de ${when}`} onClick={() => setOpenId(match.id)}>
                  Ver votos
                </Open>
              </Row>
            );
          })}
        </List>
      ) : (
        <Empty>Nenhum jogo com votação neste semestre.</Empty>
      )}
      {open ? (
        <Backdrop onMouseDown={() => setOpenId(null)}>
          <Dialog role="dialog" aria-modal="true" aria-labelledby="vote-summary-title" onMouseDown={(event) => event.stopPropagation()}>
            <h2 id="vote-summary-title">Quem votou</h2>
            <Muted>{formatLongDate(open.playedOn)}</Muted>
            {open.ballots.length ? (
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
                    {open.ballots.map((ballot) => (
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
            )}
            <GhostButton type="button" onClick={() => setOpenId(null)}>
              Fechar
            </GhostButton>
          </Dialog>
        </Backdrop>
      ) : null}
    </>
  );
}

const Leaders = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  strong {
    display: block;
    margin-top: 4px;
    font-size: 28px;
    font-stretch: 87.5%;
    font-weight: 700;
    letter-spacing: -0.03em;
    line-height: 1.1;
  }
  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const List = styled.div`
  display: flex;
  flex-direction: column;
`;

const Row = styled.article`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 12px 0;
  border-bottom: 1px solid ${({ theme }) => theme.line};
  p {
    margin: 0;
  }
  @media (max-width: 640px) {
    flex-direction: column;
    align-items: flex-start;
  }
`;

const Open = styled.button`
  border: 0;
  padding: 0;
  background: transparent;
  color: ${({ theme }) => theme.purpleDeep};
  font: inherit;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  &:hover {
    text-decoration: underline;
    text-underline-offset: 3px;
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

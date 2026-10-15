"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import styled from "styled-components";
import { clientApi } from "@/lib/client";
import { formatDiff, nextTuesday, seasonCodeFromDate } from "@/lib/format";
import {
  Actions,
  Bucket,
  Check,
  DangerButton,
  ErrorText,
  Field,
  Guest,
  MiniButton,
  Muted,
  Person,
  Picker,
  PrimaryButton,
  ScoreBox,
  ScorePad,
  ScoreRow,
  Search,
  Select,
  Stack,
  TextInput,
  Times,
  Toolbar,
} from "@/styles/ui";
import type { MatchDetail, PlayerRef, Season } from "@/lib/types";

type Side = "A" | "B" | "out";

export function MatchForm({
  players,
  seasons,
  initial,
  lineupOnly = false,
}: {
  players: PlayerRef[];
  seasons: Season[];
  initial?: MatchDetail;
  lineupOnly?: boolean;
}) {
  const router = useRouter();
  const [playedOn, setPlayedOn] = useState(initial?.playedOn ?? nextTuesday());
  const [seasonCode, setSeasonCode] = useState(initial?.season.code ?? seasonCodeFromDate(nextTuesday()));
  const [scoreA, setScoreA] = useState(initial?.scoreA ?? 0);
  const [scoreB, setScoreB] = useState(initial?.scoreB ?? 0);
  const [keepDiff, setKeepDiff] = useState(Boolean(initial && initial.origin === "planilha" && initial.scoreA === null));
  const [professorId, setProfessorId] = useState(initial?.professor?.id ?? "");
  const [colorA, setColorA] = useState<"verde" | "roxo">(initial?.colorA === "roxo" ? "roxo" : "verde");
  const [showInactive, setShowInactive] = useState(false);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [sides, setSides] = useState<Record<string, Side>>(() => {
    const map: Record<string, Side> = {};
    initial?.teamA.forEach((player) => (map[player.id] = "A"));
    initial?.teamB.forEach((player) => (map[player.id] = "B"));
    return map;
  });
  const [goals, setGoals] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    [...(initial?.teamA ?? []), ...(initial?.teamB ?? [])].forEach((player) => {
      if (player.goals) map[player.id] = player.goals;
    });
    return map;
  });
  const [assists, setAssists] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    [...(initial?.teamA ?? []), ...(initial?.teamB ?? [])].forEach((player) => {
      if (player.assists) map[player.id] = player.assists;
    });
    return map;
  });

  const visible = useMemo(() => {
    const term = query.trim().toLocaleLowerCase("pt-BR");
    return players
      .filter((player) => showInactive || player.active || sides[player.id])
      .filter((player) => !term || player.name.toLocaleLowerCase("pt-BR").includes(term))
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [players, query, showInactive, sides]);

  const teamA = players.filter((player) => sides[player.id] === "A");
  const teamB = players.filter((player) => sides[player.id] === "B");
  const playing = [...teamA, ...teamB];
  const tuesday = new Date(`${playedOn}T12:00:00`).getUTCDay() === 2;

  function setSide(id: string, side: Side) {
    setSides((current) => ({ ...current, [id]: side }));
  }

  function bump(kind: "goals" | "assists", id: string, delta: number) {
    const setter = kind === "goals" ? setGoals : setAssists;
    setter((current) => ({ ...current, [id]: Math.max(0, (current[id] ?? 0) + delta) }));
  }

  async function save() {
    setError("");
    if (!teamA.length || !teamB.length) {
      setError("Coloque pelo menos um jogador em cada time.");
      return;
    }
    if (!lineupOnly && !keepDiff && (Number.isNaN(scoreA) || Number.isNaN(scoreB))) {
      setError("Informe o placar dos dois times.");
      return;
    }
    setSaving(true);
    try {
      const body = {
        playedOn,
        seasonCode,
        scoreA: lineupOnly || keepDiff ? null : scoreA,
        scoreB: lineupOnly || keepDiff ? null : scoreB,
        goalDiffA: lineupOnly ? 0 : initial?.goalDiffA ?? 0,
        professorId: lineupOnly ? null : professorId || null,
        scheduled: lineupOnly,
        colorA,
        appearances: [
          ...teamA.map((player) => ({ playerId: player.id, team: "A" })),
          ...teamB.map((player) => ({ playerId: player.id, team: "B" })),
        ],
        events: lineupOnly ? [] : playing.flatMap((player) => {
          const items = [];
          if (goals[player.id]) items.push({ playerId: player.id, type: "goal", count: goals[player.id] });
          if (assists[player.id]) items.push({ playerId: player.id, type: "assist", count: assists[player.id] });
          return items;
        }),
      };
      const saved = initial
        ? await clientApi<MatchDetail>(`/admin/matches/${initial.id}`, { method: "PATCH", body: JSON.stringify(body) })
        : await clientApi<MatchDetail>("/admin/matches", { method: "POST", body: JSON.stringify(body) });
      router.push(`/admin/jogos/${saved.id}`);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!initial || !confirm("Apagar este jogo da classificação?")) return;
    setSaving(true);
    try {
      await clientApi(`/admin/matches/${initial.id}`, { method: "DELETE" });
      router.push("/admin/jogos");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível apagar.");
      setSaving(false);
    }
  }

  return (
    <Stack>
      {lineupOnly ? (
        <Field>
          Data
          <TextInput
            type="date"
            value={playedOn}
            onChange={(event) => {
              setPlayedOn(event.target.value);
              setSeasonCode(seasonCodeFromDate(event.target.value));
            }}
          />
          {!tuesday ? <Muted>Essa data não é terça. Dá para salvar mesmo assim.</Muted> : null}
        </Field>
      ) : (
      <ScorePad>
        <ScoreRow>
          <Field>
            Data
            <TextInput
              type="date"
              value={playedOn}
              onChange={(event) => {
                setPlayedOn(event.target.value);
                if (!initial) setSeasonCode(seasonCodeFromDate(event.target.value));
              }}
            />
          </Field>
          <ScoreBox>
            Time A
            <input type="number" min={0} max={99} value={scoreA} disabled={keepDiff} onChange={(event) => setScoreA(Number(event.target.value))} />
          </ScoreBox>
          <Times>x</Times>
          <ScoreBox>
            Time B
            <input type="number" min={0} max={99} value={scoreB} disabled={keepDiff} onChange={(event) => setScoreB(Number(event.target.value))} />
          </ScoreBox>
          <Field>
            Semestre
            <Select value={seasonCode} onChange={(event) => setSeasonCode(event.target.value)}>
              {seasons.map((season) => (
                <option key={season.id} value={season.code}>
                  {season.name}
                </option>
              ))}
              {!seasons.some((season) => season.code === seasonCode) ? <option value={seasonCode}>{seasonCode}</option> : null}
            </Select>
          </Field>
        </ScoreRow>
        {!tuesday ? <Muted>Essa data não é terça. Dá para salvar mesmo assim.</Muted> : null}
        {initial && initial.origin === "planilha" && initial.scoreA === null ? (
          <Check>
            <input type="checkbox" checked={keepDiff} onChange={(event) => setKeepDiff(event.target.checked)} />
            Manter só o saldo da planilha ({formatDiff(initial.goalDiffA)} para o time A)
          </Check>
        ) : null}
      </ScorePad>
      )}

      {initial?.scheduled ? <Muted>Este jogo ainda é só a escalação. Lance o placar, os gols e o professor.</Muted> : null}

      <Toolbar $flush>
        <Search placeholder="Buscar jogador" value={query} onChange={(event) => setQuery(event.target.value)} />
        <Check>
          <input type="checkbox" checked={showInactive} onChange={(event) => setShowInactive(event.target.checked)} />
          Mostrar inativos
        </Check>
      </Toolbar>

      <ColorRow>
        <span>Cor do time A</span>
        <ColorBall type="button" $tone="verde" $on={colorA === "verde"} aria-pressed={colorA === "verde"} aria-label="Time A verde" onClick={() => setColorA("verde")} />
        <ColorBall type="button" $tone="roxo" $on={colorA === "roxo"} aria-pressed={colorA === "roxo"} aria-label="Time A roxo" onClick={() => setColorA("roxo")} />
        <Muted as="span">O time B fica {colorA === "verde" ? "roxo" : "verde"}.</Muted>
      </ColorRow>

      <Picker>
        <TeamBucket title="Time A" count={teamA.length} tone={colorA} players={teamA} goals={goals} assists={assists} onMove={setSide} onBump={bump} events={!lineupOnly} />
        <Bucket>
          <h3>Fora</h3>
          {visible
            .filter((player) => !sides[player.id] || sides[player.id] === "out")
            .map((player) => (
              <Person key={player.id}>
                <span>
                  {player.name}
                  {player.guest ? <Guest>suplente</Guest> : null}
                </span>
                <Actions>
                  <MiniButton type="button" onClick={() => setSide(player.id, "A")}>A</MiniButton>
                  <MiniButton type="button" onClick={() => setSide(player.id, "B")}>B</MiniButton>
                </Actions>
              </Person>
            ))}
        </Bucket>
        <TeamBucket title="Time B" count={teamB.length} tone={colorA === "verde" ? "roxo" : "verde"} players={teamB} goals={goals} assists={assists} onMove={setSide} onBump={bump} events={!lineupOnly} />
      </Picker>

      {lineupOnly ? null : (
      <Field>
        Professor da rodada
        <Select value={professorId} onChange={(event) => setProfessorId(event.target.value)}>
          <option value="">Sem professor</option>
          {playing
            .slice()
            .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
            .map((player) => (
              <option key={player.id} value={player.id}>
                {player.name}
              </option>
            ))}
        </Select>
      </Field>
      )}

      {error ? <ErrorText>{error}</ErrorText> : null}
      <Actions>
        <PrimaryButton type="button" disabled={saving} onClick={save}>
          {saving ? "Salvando..." : lineupOnly ? "Salvar escalação" : "Salvar jogo"}
        </PrimaryButton>
        {initial ? (
          <DangerButton type="button" disabled={saving} onClick={remove}>
            Apagar jogo
          </DangerButton>
        ) : null}
      </Actions>
    </Stack>
  );
}

function TeamBucket({
  title,
  count,
  tone,
  players,
  goals,
  assists,
  onMove,
  onBump,
  events = true,
}: {
  title: string;
  count: number;
  tone: "verde" | "roxo";
  players: PlayerRef[];
  goals: Record<string, number>;
  assists: Record<string, number>;
  onMove: (id: string, side: Side) => void;
  onBump: (kind: "goals" | "assists", id: string, delta: number) => void;
  events?: boolean;
}) {
  return (
    <Bucket>
      <h3>
        <TeamName $tone={tone}>{title}</TeamName>
        <Muted as="span">{count}</Muted>
      </h3>
      {players
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
        .map((player) => (
          <Person key={player.id}>
            <div>
              <b>{player.name}</b>
              {events ? (
                <Counters>
                  <span>Gol</span>
                  <Ball type="button" $tone={tone} aria-label={`Tirar gol de ${player.name}`} onClick={() => onBump("goals", player.id, -1)}>
                    −
                  </Ball>
                  <Count>{goals[player.id] ?? 0}</Count>
                  <Ball type="button" $tone={tone} $fill aria-label={`Adicionar gol de ${player.name}`} onClick={() => onBump("goals", player.id, 1)}>
                    +
                  </Ball>
                  <span>Assist.</span>
                  <Ball type="button" $tone={tone} aria-label={`Tirar assistência de ${player.name}`} onClick={() => onBump("assists", player.id, -1)}>
                    −
                  </Ball>
                  <Count>{assists[player.id] ?? 0}</Count>
                  <Ball type="button" $tone={tone} $fill aria-label={`Adicionar assistência de ${player.name}`} onClick={() => onBump("assists", player.id, 1)}>
                    +
                  </Ball>
                </Counters>
              ) : null}
            </div>
            <RemoveButton type="button" aria-label={`Tirar ${player.name}`} onClick={() => onMove(player.id, "out")}>
              ×
            </RemoveButton>
          </Person>
        ))}
    </Bucket>
  );
}

const paint = {
  verde: "#008000",
  roxo: "#993aa2",
};

const ColorRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
`;

const ColorBall = styled.button<{ $tone: "verde" | "roxo"; $on: boolean }>`
  width: 28px;
  height: 28px;
  border-radius: 50%;
  padding: 0;
  cursor: pointer;
  border: 2px solid ${({ $tone }) => paint[$tone]};
  background: ${({ $tone, $on }) => ($on ? paint[$tone] : "transparent")};
  box-shadow: ${({ $on, $tone }) => ($on ? `0 0 0 3px ${$tone === "verde" ? "#00800033" : "#993aa233"}` : "none")};
`;

const TeamName = styled.span<{ $tone: "verde" | "roxo" }>`
  border-bottom: 3px solid ${({ $tone }) => paint[$tone]};
  padding-bottom: 4px;
`;

const Counters = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
  flex-wrap: wrap;
  span {
    color: ${({ theme }) => theme.muted};
    font-size: 13px;
    font-weight: 600;
  }
`;

const Count = styled.b`
  min-width: 16px;
  text-align: center;
  font-variant-numeric: tabular-nums;
`;

const Ball = styled.button<{ $tone: "verde" | "roxo"; $fill?: boolean }>`
  width: 34px;
  height: 34px;
  border-radius: 50%;
  padding: 0;
  display: grid;
  place-items: center;
  cursor: pointer;
  font-size: 20px;
  font-weight: 700;
  line-height: 1;
  border: 2px solid ${({ $tone }) => paint[$tone]};
  background: ${({ $tone, $fill }) => ($fill ? paint[$tone] : "transparent")};
  color: ${({ $tone, $fill }) => ($fill ? "#ffffff" : paint[$tone])};
  &:focus-visible {
    outline: 2px solid ${({ $tone }) => paint[$tone]};
    outline-offset: 2px;
  }
`;

const RemoveButton = styled.button`
  width: 36px;
  height: 36px;
  border: 0;
  background: transparent;
  color: ${({ theme }) => theme.ink};
  font-size: 26px;
  line-height: 1;
  cursor: pointer;
  &:hover {
    color: ${({ theme }) => theme.loss};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.purpleDeep};
    outline-offset: 2px;
  }
`;

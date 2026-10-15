"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
  Pill,
  PrimaryButton,
  ScoreBox,
  ScorePad,
  ScoreRow,
  Search,
  Select,
  Stack,
  Stepper,
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
}: {
  players: PlayerRef[];
  seasons: Season[];
  initial?: MatchDetail;
}) {
  const router = useRouter();
  const [playedOn, setPlayedOn] = useState(initial?.playedOn ?? nextTuesday());
  const [seasonCode, setSeasonCode] = useState(initial?.season.code ?? seasonCodeFromDate(nextTuesday()));
  const [scoreA, setScoreA] = useState(initial?.scoreA ?? 0);
  const [scoreB, setScoreB] = useState(initial?.scoreB ?? 0);
  const [keepDiff, setKeepDiff] = useState(initial ? initial.scoreA === null : false);
  const [professorId, setProfessorId] = useState(initial?.professor?.id ?? "");
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
    if (!keepDiff && (Number.isNaN(scoreA) || Number.isNaN(scoreB))) {
      setError("Informe o placar dos dois times.");
      return;
    }
    setSaving(true);
    try {
      const body = {
        playedOn,
        seasonCode,
        scoreA: keepDiff ? null : scoreA,
        scoreB: keepDiff ? null : scoreB,
        goalDiffA: initial?.goalDiffA ?? 0,
        professorId: professorId || null,
        appearances: [
          ...teamA.map((player) => ({ playerId: player.id, team: "A" })),
          ...teamB.map((player) => ({ playerId: player.id, team: "B" })),
        ],
        events: playing.flatMap((player) => {
          const items = [];
          if (goals[player.id]) items.push({ playerId: player.id, type: "goal", count: goals[player.id] });
          if (assists[player.id]) items.push({ playerId: player.id, type: "assist", count: assists[player.id] });
          return items;
        }),
      };
      const saved = initial
        ? await clientApi<MatchDetail>(`/admin/matches/${initial.id}`, { method: "PATCH", body: JSON.stringify(body) })
        : await clientApi<MatchDetail>("/admin/matches", { method: "POST", body: JSON.stringify(body) });
      router.push(`/jogos/${saved.id}`);
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
      router.push("/admin");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível apagar.");
      setSaving(false);
    }
  }

  return (
    <Stack>
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
        {initial && initial.scoreA === null ? (
          <Check>
            <input type="checkbox" checked={keepDiff} onChange={(event) => setKeepDiff(event.target.checked)} />
            Manter só o saldo da planilha ({formatDiff(initial.goalDiffA)} para o time A)
          </Check>
        ) : null}
      </ScorePad>

      <Toolbar $flush>
        <Search placeholder="Buscar jogador" value={query} onChange={(event) => setQuery(event.target.value)} />
        <Check>
          <input type="checkbox" checked={showInactive} onChange={(event) => setShowInactive(event.target.checked)} />
          Mostrar inativos
        </Check>
      </Toolbar>

      <Picker>
        <TeamBucket title="Time A" count={teamA.length} tone="a" players={teamA} goals={goals} assists={assists} onMove={setSide} onBump={bump} />
        <Bucket>
          <h3>Fora</h3>
          {visible
            .filter((player) => !sides[player.id] || sides[player.id] === "out")
            .map((player) => (
              <Person key={player.id}>
                <span>
                  {player.name}
                  {player.guest ? <Guest>avulso</Guest> : null}
                </span>
                <Actions>
                  <MiniButton type="button" onClick={() => setSide(player.id, "A")}>A</MiniButton>
                  <MiniButton type="button" onClick={() => setSide(player.id, "B")}>B</MiniButton>
                </Actions>
              </Person>
            ))}
        </Bucket>
        <TeamBucket title="Time B" count={teamB.length} tone="b" players={teamB} goals={goals} assists={assists} onMove={setSide} onBump={bump} />
      </Picker>

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

      {error ? <ErrorText>{error}</ErrorText> : null}
      <Actions>
        <PrimaryButton type="button" disabled={saving} onClick={save}>
          {saving ? "Salvando..." : "Salvar jogo"}
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
}: {
  title: string;
  count: number;
  tone: "a" | "b";
  players: PlayerRef[];
  goals: Record<string, number>;
  assists: Record<string, number>;
  onMove: (id: string, side: Side) => void;
  onBump: (kind: "goals" | "assists", id: string, delta: number) => void;
}) {
  return (
    <Bucket>
      <h3>
        <Pill $tone={tone}>{title}</Pill>
        <Muted as="span">{count}</Muted>
      </h3>
      {players
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
        .map((player) => (
          <Person key={player.id}>
            <div>
              <b>{player.name}</b>
              <Stepper>
                <span>G</span>
                <button type="button" onClick={() => onBump("goals", player.id, -1)}>-</button>
                <span>{goals[player.id] ?? 0}</span>
                <button type="button" onClick={() => onBump("goals", player.id, 1)}>+</button>
                <span>A</span>
                <button type="button" onClick={() => onBump("assists", player.id, -1)}>-</button>
                <span>{assists[player.id] ?? 0}</span>
                <button type="button" onClick={() => onBump("assists", player.id, 1)}>+</button>
              </Stepper>
            </div>
            <MiniButton type="button" onClick={() => onMove(player.id, "out")}>
              Tirar
            </MiniButton>
          </Person>
        ))}
    </Bucket>
  );
}

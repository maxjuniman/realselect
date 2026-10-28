"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import styled from "styled-components";
import { clientApi } from "@/lib/client";
import { formatDiff, nextTuesday, seasonCodeFromDate } from "@/lib/format";
import { positionRank } from "@/lib/roster";
import { parseTeamList } from "@/lib/team-list";
import {
  Actions,
  Bucket,
  Check,
  DangerButton,
  ErrorText,
  Field,
  GhostButton,
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
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [listOpen, setListOpen] = useState(false);
  const [listText, setListText] = useState("");
  const [verdeScore, setVerdeScore] = useState("");
  const [roxoScore, setRoxoScore] = useState("");
  const [listError, setListError] = useState("");
  const [fromList, setFromList] = useState(false);
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
      .sort(byPosition);
  }, [players, query, showInactive, sides]);

  const teamA = players.filter((player) => sides[player.id] === "A");
  const teamB = players.filter((player) => sides[player.id] === "B");
  const playing = [...teamA, ...teamB];
  const professors = players
    .filter(isMensalista)
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  const assigned = players.find((player) => player.id === professorId);
  const professorOptions = assigned && !professors.some((player) => player.id === assigned.id) ? [...professors, assigned] : professors;
  const tuesday = new Date(`${playedOn}T12:00:00`).getUTCDay() === 2;
  const scoring = !lineupOnly || fromList;

  function setSide(id: string, side: Side) {
    setSides((current) => ({ ...current, [id]: side }));
  }

  function bump(kind: "goals" | "assists", id: string, delta: number) {
    const setter = kind === "goals" ? setGoals : setAssists;
    setter((current) => ({ ...current, [id]: Math.max(0, (current[id] ?? 0) + delta) }));
  }

  function applyList() {
    const verdeText = verdeScore.trim();
    const roxoText = roxoScore.trim();
    const verde = Number(verdeText);
    const roxo = Number(roxoText);
    if (!/^\d{1,2}$/.test(verdeText) || !/^\d{1,2}$/.test(roxoText) || verde > 99 || roxo > 99) {
      setListError("Informe o placar do verde e do roxo.");
      return;
    }
    const activePlayers = players.filter((player) => player.active !== false);
    const parsed = parseTeamList(listText, activePlayers, { verde, roxo });
    if (!parsed.ok) {
      setListError(parsed.message);
      return;
    }
    const next: Record<string, Side> = {};
    parsed.teamA.forEach((player) => (next[player.id] = "A"));
    parsed.teamB.forEach((player) => (next[player.id] = "B"));
    setSides(next);
    setColorA(parsed.colorA);
    setScoreA(parsed.scoreA);
    setScoreB(parsed.scoreB);
    setKeepDiff(false);
    setFromList(true);
    setListError("");
    setListOpen(false);
  }

  function askSave() {
    if (!teamA.length || !teamB.length) {
      setNotice({ step: "result", ok: false, message: "Coloque pelo menos um jogador em cada time." });
      return;
    }
    if (scoring && !keepDiff && (Number.isNaN(scoreA) || Number.isNaN(scoreB))) {
      setNotice({ step: "result", ok: false, message: "Informe o placar dos dois times." });
      return;
    }
    setNotice({ step: "confirm", action: "save" });
  }

  async function save() {
    setSaving(true);
    try {
      const body = {
        playedOn,
        seasonCode,
        scoreA: scoring && !keepDiff ? scoreA : null,
        scoreB: scoring && !keepDiff ? scoreB : null,
        goalDiffA: scoring && !keepDiff ? scoreA - scoreB : lineupOnly ? 0 : initial?.goalDiffA ?? 0,
        professorId: scoring ? professorId || null : null,
        scheduled: !scoring,
        colorA,
        appearances: [
          ...teamA.map((player) => ({ playerId: player.id, team: "A" })),
          ...teamB.map((player) => ({ playerId: player.id, team: "B" })),
        ],
        events: !scoring ? [] : playing.flatMap((player) => {
          const items = [];
          if (goals[player.id]) items.push({ playerId: player.id, type: "goal", count: goals[player.id] });
          if (assists[player.id]) items.push({ playerId: player.id, type: "assist", count: assists[player.id] });
          return items;
        }),
      };
      const saved = initial
        ? await clientApi<MatchDetail>(`/admin/matches/${initial.id}`, { method: "PATCH", body: JSON.stringify(body) })
        : await clientApi<MatchDetail>("/admin/matches", { method: "POST", body: JSON.stringify(body) });
      setNotice({
        step: "result",
        ok: true,
        message: scoring ? "Jogo salvo." : "Escalação salva.",
        href: `/admin/jogos/${saved.id}`,
      });
    } catch (caught) {
      setNotice({ step: "result", ok: false, message: caught instanceof Error ? caught.message : "Não foi possível salvar." });
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!initial) return;
    setSaving(true);
    try {
      await clientApi(`/admin/matches/${initial.id}`, { method: "DELETE" });
      setNotice({ step: "result", ok: true, message: "Jogo apagado.", href: "/admin/jogos" });
    } catch (caught) {
      setNotice({ step: "result", ok: false, message: caught instanceof Error ? caught.message : "Não foi possível apagar." });
      setSaving(false);
    }
  }

  function closeNotice() {
    if (notice?.step === "result" && notice.ok && notice.href) {
      router.push(notice.href);
      router.refresh();
    }
    setNotice(null);
  }

  return (
    <Stack>
      {!initial ? (
        <GhostButton type="button" onClick={() => setListOpen(true)}>
          Importar times
        </GhostButton>
      ) : null}
      {listOpen ? (
        <Backdrop onMouseDown={() => setListOpen(false)}>
          <ListDialog role="dialog" aria-modal="true" aria-labelledby="team-list-title" onMouseDown={(event) => event.stopPropagation()}>
            <ListHead>
              <h2 id="team-list-title">Importar times</h2>
              <GhostButton type="button" onClick={() => setListOpen(false)}>
                Fechar
              </GhostButton>
            </ListHead>
            <ScoreRow>
              <ScoreBox>
                Verde
                <input type="number" min={0} max={99} value={verdeScore} onChange={(event) => setVerdeScore(event.target.value)} />
              </ScoreBox>
              <Times>x</Times>
              <ScoreBox>
                Roxo
                <input type="number" min={0} max={99} value={roxoScore} onChange={(event) => setRoxoScore(event.target.value)} />
              </ScoreBox>
            </ScoreRow>
            <ListInput
              aria-label="Nomes dos times"
              value={listText}
              rows={12}
              placeholder={"VERDE\nMarciano\n\nROXO\nEdy"}
              onChange={(event) => setListText(event.target.value)}
            />
            {listError ? <ErrorText>{listError}</ErrorText> : null}
            <PrimaryButton type="button" onClick={applyList}>
              Separar times
            </PrimaryButton>
          </ListDialog>
        </Backdrop>
      ) : null}
      {!scoring ? (
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
        <TeamBucket title="Time A" count={teamA.length} tone={colorA} players={teamA} goals={goals} assists={assists} onMove={setSide} onBump={bump} events={scoring} />
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
        <TeamBucket title="Time B" count={teamB.length} tone={colorA === "verde" ? "roxo" : "verde"} players={teamB} goals={goals} assists={assists} onMove={setSide} onBump={bump} events={scoring} />
      </Picker>

      {!scoring ? null : (
      <Field>
        Professor da rodada
        <Select value={professorId} onChange={(event) => setProfessorId(event.target.value)}>
          <option value="">Sem professor</option>
          {professorOptions.map((player) => (
              <option key={player.id} value={player.id}>
                {player.name}
              </option>
            ))}
        </Select>
      </Field>
      )}

      <Actions>
        <PrimaryButton type="button" disabled={saving} onClick={askSave}>
          {saving ? "Salvando..." : scoring ? "Salvar jogo" : "Salvar escalação"}
        </PrimaryButton>
        {initial ? (
          <DangerButton type="button" disabled={saving} onClick={() => setNotice({ step: "confirm", action: "delete" })}>
            Apagar jogo
          </DangerButton>
        ) : null}
      </Actions>
      {notice ? (
        <Backdrop onMouseDown={() => (notice.step === "confirm" ? setNotice(null) : closeNotice())}>
          <Dialog role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
            {notice.step === "confirm" ? (
              <>
                <h2>{notice.action === "delete" ? "Apagar este jogo?" : scoring ? "Salvar este jogo?" : "Salvar esta escalação?"}</h2>
                <Muted>{notice.action === "delete" ? "Ele sai da classificação." : "Confira times, placar e professor antes de confirmar."}</Muted>
                <Actions>
                  <GhostButton type="button" onClick={() => setNotice(null)}>
                    Cancelar
                  </GhostButton>
                  <PrimaryButton type="button" disabled={saving} onClick={notice.action === "delete" ? remove : save}>
                    {saving ? "Salvando..." : "Confirmar"}
                  </PrimaryButton>
                </Actions>
              </>
            ) : (
              <>
                <h2>{notice.ok ? "Pronto" : "Não deu certo"}</h2>
                <Muted>{notice.message}</Muted>
                <PrimaryButton type="button" onClick={closeNotice}>
                  Ok
                </PrimaryButton>
              </>
            )}
          </Dialog>
        </Backdrop>
      ) : null}
    </Stack>
  );
}

type Notice =
  | { step: "confirm"; action: "save" | "delete" }
  | { step: "result"; ok: boolean; message: string; href?: string }
  | null;

function isMensalista(player: PlayerRef) {
  return player.active !== false && player.squad !== "suplente" && !player.guest;
}

function byPosition(a: PlayerRef, b: PlayerRef) {
  return positionRank(a.positions?.[0]) - positionRank(b.positions?.[0]) || a.name.localeCompare(b.name, "pt-BR");
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
        .sort(byPosition)
        .map((player) => (
          <Slot key={player.id}>
            <NameLine>
              <b>{player.name}</b>
              <RemoveButton type="button" aria-label={`Tirar ${player.name}`} onClick={() => onMove(player.id, "out")}>
                ×
              </RemoveButton>
            </NameLine>
            {events ? (
              <>
                <StatLine>
                  <span>Gol</span>
                  <Balls>
                    <Ball type="button" $tone={tone} aria-label={`Tirar gol de ${player.name}`} onClick={() => onBump("goals", player.id, -1)}>
                      −
                    </Ball>
                    <Count>{goals[player.id] ?? 0}</Count>
                    <Ball type="button" $tone={tone} $fill aria-label={`Adicionar gol de ${player.name}`} onClick={() => onBump("goals", player.id, 1)}>
                      +
                    </Ball>
                  </Balls>
                </StatLine>
                <StatLine>
                  <span>Assist.</span>
                  <Balls>
                    <Ball type="button" $tone={tone} aria-label={`Tirar assistência de ${player.name}`} onClick={() => onBump("assists", player.id, -1)}>
                      −
                    </Ball>
                    <Count>{assists[player.id] ?? 0}</Count>
                    <Ball type="button" $tone={tone} $fill aria-label={`Adicionar assistência de ${player.name}`} onClick={() => onBump("assists", player.id, 1)}>
                      +
                    </Ball>
                  </Balls>
                </StatLine>
              </>
            ) : null}
          </Slot>
        ))}
    </Bucket>
  );
}

const ListDialog = styled.div`
  width: min(560px, 100%);
  max-height: calc(100vh - 40px);
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
    font-size: 36px;
    letter-spacing: -0.03em;
    line-height: 0.95;
  }
`;

const ListHead = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
`;

const ListInput = styled.textarea`
  width: 100%;
  min-height: 220px;
  resize: vertical;
  border: 1px solid ${({ theme }) => theme.ink};
  background: ${({ theme }) => theme.card};
  border-radius: 0;
  padding: 10px 12px;
  font: inherit;
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.purpleDeep};
    outline-offset: 2px;
  }
`;

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

const Slot = styled.div`
  padding: 8px 0;
  border-bottom: 1px solid ${({ theme }) => theme.line};
`;

const NameLine = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
`;

const StatLine = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 6px;
  span {
    color: ${({ theme }) => theme.muted};
    font-size: 13px;
    font-weight: 600;
  }
`;

const Balls = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
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
  width: min(420px, 100%);
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
    font-size: 36px;
    letter-spacing: -0.03em;
    line-height: 0.95;
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

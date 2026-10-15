"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { clientApi } from "@/lib/client";
import { GROUPS, POSITIONS, type GroupId } from "@/lib/roster";
import type { PlayerRef } from "@/lib/types";
import { Actions, ErrorText, GhostButton, Guest, Muted, PageTitle, Panel, PrimaryButton, Search, SectionTitle, Select, SplitRow, Stack } from "@/styles/ui";

function groupOf(player: PlayerRef): GroupId {
  if (!player.active) return "inativo";
  return player.squad === "suplente" ? "suplente" : "mensalista";
}

export default function PlayersAdminPage() {
  const [players, setPlayers] = useState<PlayerRef[]>([]);
  const [name, setName] = useState("");
  const [group, setGroup] = useState<GroupId>("mensalista");
  const [first, setFirst] = useState("");
  const [second, setSecond] = useState("");
  const [error, setError] = useState("");

  async function load() {
    const data = await clientApi<PlayerRef[]>("/players");
    setPlayers(data.sort((a, b) => a.name.localeCompare(b.name, "pt-BR")));
  }

  useEffect(() => {
    load().catch((caught: Error) => setError(caught.message));
  }, []);

  const grouped = useMemo(() => {
    return GROUPS.map((item) => ({
      ...item,
      players: players.filter((player) => groupOf(player) === item.id),
    }));
  }, [players]);

  async function create(event: FormEvent) {
    event.preventDefault();
    setError("");
    const positions = [first, second].filter(Boolean);
    try {
      await clientApi("/admin/players", {
        method: "POST",
        body: JSON.stringify({
          name,
          active: group !== "inativo",
          squad: group === "suplente" ? "suplente" : "mensalista",
          positions,
        }),
      });
      setName("");
      setGroup("mensalista");
      setFirst("");
      setSecond("");
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível criar.");
    }
  }

  async function move(player: PlayerRef, next: GroupId) {
    setError("");
    try {
      await clientApi(`/admin/players/${player.id}`, {
        method: "PATCH",
        body: JSON.stringify(
          next === "inativo" ? { active: false } : { active: true, squad: next },
        ),
      });
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível mover o jogador.");
    }
  }

  async function savePositions(player: PlayerRef, nextFirst: string, nextSecond: string) {
    setError("");
    try {
      await clientApi(`/admin/players/${player.id}`, {
        method: "PATCH",
        body: JSON.stringify({ positions: [nextFirst, nextSecond].filter(Boolean) }),
      });
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível salvar a posição.");
    }
  }

  return (
    <Stack>
      <PageTitle>Jogadores</PageTitle>
      <Panel as="form" $pad onSubmit={create}>
        <Actions>
          <Search placeholder="Nome do jogador" value={name} onChange={(event) => setName(event.target.value)} required />
          <Select value={group} onChange={(event) => setGroup(event.target.value as GroupId)}>
            <option value="mensalista">Mensalista</option>
            <option value="suplente">Suplente</option>
            <option value="inativo">Inativo</option>
          </Select>
          <PositionSelect value={first} other={second} placeholder="1ª posição" onChange={setFirst} />
          <PositionSelect value={second} other={first} placeholder="2ª posição" onChange={setSecond} />
          <PrimaryButton>Adicionar</PrimaryButton>
        </Actions>
        {error ? <ErrorText>{error}</ErrorText> : null}
      </Panel>
      {grouped.map((item) => (
        <Panel key={item.id} $gap>
          <SectionTitle>
            {item.label}
            <Guest>{item.players.length}</Guest>
          </SectionTitle>
          {item.players.length ? (
            item.players.map((player) => {
              const positions = player.positions ?? [];
              return (
                <SplitRow key={player.id}>
                  <span>
                    <b>{player.name}</b>
                    {positions.length ? <Guest>{positions.join(" · ")}</Guest> : null}
                  </span>
                  <Actions>
                    <PositionSelect
                      value={positions[0] ?? ""}
                      other={positions[1] ?? ""}
                      placeholder="1ª posição"
                      onChange={(value) => savePositions(player, value, positions[1] ?? "")}
                    />
                    <PositionSelect
                      value={positions[1] ?? ""}
                      other={positions[0] ?? ""}
                      placeholder="2ª posição"
                      onChange={(value) => savePositions(player, positions[0] ?? "", value)}
                    />
                    {GROUPS.filter((option) => option.id !== item.id).map((option) => (
                      <GhostButton key={option.id} type="button" onClick={() => move(player, option.id)}>
                        {option.id === "inativo" ? "Inativar" : option.label.replace(/s$/, "")}
                      </GhostButton>
                    ))}
                  </Actions>
                </SplitRow>
              );
            })
          ) : (
            <Muted>Nenhum jogador neste grupo.</Muted>
          )}
        </Panel>
      ))}
    </Stack>
  );
}

function PositionSelect({
  value,
  other,
  placeholder,
  onChange,
}: {
  value: string;
  other: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <Select value={value} onChange={(event) => onChange(event.target.value)} aria-label={placeholder}>
      <option value="">{placeholder}</option>
      {POSITIONS.map((position) => (
        <option key={position} value={position} disabled={other.length > 0 && position === other}>
          {position}
        </option>
      ))}
    </Select>
  );
}

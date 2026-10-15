"use client";

import { FormEvent, useEffect, useState } from "react";
import { clientApi } from "@/lib/client";
import { Actions, Check, ErrorText, GhostButton, Guest, PageTitle, Panel, PrimaryButton, Search, SplitRow, Stack } from "@/styles/ui";
import type { PlayerRef } from "@/lib/types";

export default function PlayersAdminPage() {
  const [players, setPlayers] = useState<PlayerRef[]>([]);
  const [name, setName] = useState("");
  const [guest, setGuest] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    const data = await clientApi<PlayerRef[]>("/players");
    setPlayers(data.sort((a, b) => a.name.localeCompare(b.name, "pt-BR")));
  }

  useEffect(() => {
    load().catch((caught: Error) => setError(caught.message));
  }, []);

  async function create(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      await clientApi("/admin/players", { method: "POST", body: JSON.stringify({ name, guest, active: true }) });
      setName("");
      setGuest(false);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível criar.");
    }
  }

  async function toggle(player: PlayerRef, patch: Partial<PlayerRef>) {
    await clientApi(`/admin/players/${player.id}`, { method: "PATCH", body: JSON.stringify(patch) });
    await load();
  }

  return (
    <Stack>
      <PageTitle>Jogadores</PageTitle>
      <Panel as="form" $pad onSubmit={create}>
        <Actions>
          <Search placeholder="Nome do jogador" value={name} onChange={(event) => setName(event.target.value)} required />
          <Check>
            <input type="checkbox" checked={guest} onChange={(event) => setGuest(event.target.checked)} />
            Avulso
          </Check>
          <PrimaryButton>Adicionar</PrimaryButton>
        </Actions>
        {error ? <ErrorText>{error}</ErrorText> : null}
      </Panel>
      <Panel>
        {players.map((player) => (
          <SplitRow key={player.id}>
            <span>
              <b>{player.name}</b>
              {player.guest ? <Guest>avulso</Guest> : null}
              {!player.active ? <Guest>inativo</Guest> : null}
            </span>
            <Actions>
              <GhostButton type="button" onClick={() => toggle(player, { active: !player.active })}>
                {player.active ? "Inativar" : "Reativar"}
              </GhostButton>
              <GhostButton type="button" onClick={() => toggle(player, { guest: !player.guest })}>
                {player.guest ? "Tornar fixo" : "Marcar avulso"}
              </GhostButton>
            </Actions>
          </SplitRow>
        ))}
      </Panel>
    </Stack>
  );
}

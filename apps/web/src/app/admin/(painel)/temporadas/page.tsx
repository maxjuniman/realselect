"use client";

import { useEffect, useState } from "react";
import { clientApi } from "@/lib/client";
import { Actions, ButtonLink, ErrorText, GhostButton, Guest, Muted, PageTitle, Panel, PanelHead, PrimaryButton, SplitRow, Stack } from "@/styles/ui";
import type { Season } from "@/lib/types";

export default function SeasonsAdminPage() {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [error, setError] = useState("");

  async function load() {
    setSeasons(await clientApi<Season[]>("/seasons"));
  }

  useEffect(() => {
    load().catch((caught: Error) => setError(caught.message));
  }, []);

  async function makeCurrent(season: Season) {
    await clientApi(`/admin/seasons/${season.id}`, { method: "PATCH", body: JSON.stringify({ current: true }) });
    await load();
  }

  const latest = seasons[0];
  const next = latest ? (latest.half === 1 ? `02_${latest.year}` : `01_${latest.year + 1}`) : "01_2027";

  return (
    <Stack>
      <PanelHead $flush>
        <PageTitle>Temporadas</PageTitle>
        <PrimaryButton
          type="button"
          onClick={async () => {
            await clientApi("/admin/seasons", { method: "POST", body: JSON.stringify({ code: next, current: true }) });
            await load();
          }}
        >
          Abrir {next}
        </PrimaryButton>
      </PanelHead>
      {error ? <ErrorText>{error}</ErrorText> : null}
      <Muted>O semestre novo também é criado sozinho quando você lança a primeira terça dele.</Muted>
      <Panel>
        {seasons.map((season) => (
          <SplitRow key={season.id}>
            <span>
              <b>{season.name}</b>
              {season.isCurrent ? <Guest>atual</Guest> : null}
            </span>
            <Actions>
              <ButtonLink href={`/admin/temporadas/${season.code}`} $variant="ghost">
                Ver dados
              </ButtonLink>
              {!season.isCurrent ? (
                <GhostButton type="button" onClick={() => makeCurrent(season)}>
                  Tornar atual
                </GhostButton>
              ) : (
                <Muted as="span">Em andamento</Muted>
              )}
            </Actions>
          </SplitRow>
        ))}
      </Panel>
    </Stack>
  );
}

import Link from "next/link";
import type { ScorerRow, StandingRow } from "@/lib/types";
import { AwardCard, AwardRow, Banner, BannerHead, BannerKicker, BannerMain, BannerMascot, BannerNote, Crown, PlaceMark, PlacePoints, Podium, PodiumCard } from "@/styles/ui";

export function SeasonBanner({ seasonName, rows, scorers }: { seasonName: string; rows: StandingRow[]; scorers: ScorerRow[] }) {
  const ranked = rows.length >= 3 ? [rows[1], rows[0], rows[2]].filter((row): row is StandingRow => Boolean(row)) : rows.slice(0, 3);
  const scorer = [...scorers].filter((row) => row.goals > 0).sort((left, right) => right.goals - left.goals || right.assists - left.assists)[0];
  const assist = [...scorers].filter((row) => row.assists > 0).sort((left, right) => right.assists - left.assists || right.goals - left.goals)[0];

  return (
    <Banner>
      <BannerHead>
        <BannerKicker>{seasonName}</BannerKicker>
        <BannerNote>Tabela oficial de pontuação</BannerNote>
      </BannerHead>
      <BannerMain>
        {ranked.length ? (
          <Podium $count={ranked.length}>
            {ranked.map((row) => (
              <PodiumCard key={row.player.id} $rank={row.position}>
                {row.position === 1 ? (
                  <Crown>
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z" />
                    </svg>
                  </Crown>
                ) : null}
                <PlaceMark $rank={row.position}>{row.position}º</PlaceMark>
                <Link href={`/jogadores/${row.player.id}`}>{row.player.name}</Link>
                <PlacePoints $rank={row.position}>
                  <b>{row.points}</b>
                  pts
                </PlacePoints>
              </PodiumCard>
            ))}
          </Podium>
        ) : null}
        {scorer || assist ? (
          <AwardRow>
            {scorer ? (
              <AwardCard $tone="green">
                <div>
                  <span>Artilheiro</span>
                  <Link href={`/jogadores/${scorer.player.id}`}>{scorer.player.name}</Link>
                </div>
                <strong>
                  <b>{scorer.goals}</b>
                  <em>{scorer.goals === 1 ? "gol" : "gols"}</em>
                </strong>
              </AwardCard>
            ) : null}
            {assist ? (
              <AwardCard $tone="purple">
                <div>
                  <span>Assistências</span>
                  <Link href={`/jogadores/${assist.player.id}`}>{assist.player.name}</Link>
                </div>
                <strong>
                  <b>{assist.assists}</b>
                  <em>{assist.assists === 1 ? "assistência" : "assistências"}</em>
                </strong>
              </AwardCard>
            ) : null}
          </AwardRow>
        ) : null}
      </BannerMain>
      <BannerMascot>
        <img src="/brand/mascote2.png" alt="Mascote do Real Select" />
      </BannerMascot>
    </Banner>
  );
}

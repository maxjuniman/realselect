import Link from "next/link";
import type { ScorerRow, StandingRow } from "@/lib/types";
import { AwardCard, AwardRow, Banner, BannerKicker, BannerMain, BannerMascot, Crown, PlaceMark, PlacePoints, Podium, PodiumCard } from "@/styles/ui";

function countLabel(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`;
}

export function SeasonBanner({ seasonName, rows, scorers }: { seasonName: string; rows: StandingRow[]; scorers: ScorerRow[] }) {
  const ranked = rows.length >= 3 ? [rows[1], rows[0], rows[2]].filter((row): row is StandingRow => Boolean(row)) : rows.slice(0, 3);
  const scorer = [...scorers].filter((row) => row.goals > 0).sort((left, right) => right.goals - left.goals || right.assists - left.assists)[0];
  const assist = [...scorers].filter((row) => row.assists > 0).sort((left, right) => right.assists - left.assists || right.goals - left.goals)[0];

  return (
    <Banner>
      <BannerMain>
        <BannerKicker>{seasonName}</BannerKicker>
        {ranked.length ? (
          <Podium $count={ranked.length}>
            {ranked.map((row) => (
              <PodiumCard key={row.player.id} $rank={row.position}>
                {row.position === 1 ? (
                  <Crown>
                    <svg viewBox="0 0 88 56" aria-hidden="true">
                      <defs>
                        <filter id="season-crown-glow" x="-35%" y="-35%" width="170%" height="170%">
                          <feDropShadow dx="0" dy="0" stdDeviation="1.4" floodColor="#c8ffe0" floodOpacity="1" />
                        </filter>
                      </defs>
                      <g filter="url(#season-crown-glow)" fill="none" stroke="#f7fff9" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M8 42 L20 18 L32 30 L44 6 L56 30 L68 18 L80 42" />
                        <path d="M14 48 H74" />
                      </g>
                      <g filter="url(#season-crown-glow)" fill="#f7fff9">
                        <circle cx="20" cy="16" r="2.6" />
                        <circle cx="44" cy="5" r="2.8" />
                        <circle cx="68" cy="16" r="2.6" />
                      </g>
                    </svg>
                  </Crown>
                ) : null}
                <PlaceMark>{row.position}º</PlaceMark>
                <Link href={`/jogadores/${row.player.id}`}>{row.player.name}</Link>
                <PlacePoints>
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
              <AwardCard>
                <span>Artilheiro</span>
                <Link href={`/jogadores/${scorer.player.id}`}>{scorer.player.name}</Link>
                <em>{countLabel(scorer.goals, "gol", "gols")}</em>
              </AwardCard>
            ) : null}
            {assist ? (
              <AwardCard>
                <span>Assistências</span>
                <Link href={`/jogadores/${assist.player.id}`}>{assist.player.name}</Link>
                <em>{countLabel(assist.assists, "assistência", "assistências")}</em>
              </AwardCard>
            ) : null}
          </AwardRow>
        ) : null}
      </BannerMain>
      <BannerMascot />
    </Banner>
  );
}

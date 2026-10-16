import Link from "next/link";
import type { ScorerRow, StandingRow } from "@/lib/types";
import { AwardCard, AwardRow, Banner, BannerKicker, BannerMain, BannerMascot, PlaceMark, PlacePoints, Podium, PodiumCard } from "@/styles/ui";

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
      <BannerMascot>
        <img src="/brand/mascot.png" alt="Mascote do Real Select" />
      </BannerMascot>
    </Banner>
  );
}

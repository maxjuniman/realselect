"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import styled from "styled-components";
import { ShareImageButton } from "@/components/ShareImageButton";
import { formatShortDate, resultLabel } from "@/lib/format";
import { historyHref, seasonBands, type HistoryColumn, type HistoryRow } from "@/lib/history";
import { shareHistoryImage } from "@/lib/table-image";
import type { Season } from "@/lib/types";
import { Empty, PanelHead, Rules, SectionTitle, Select } from "@/styles/ui";

const Filters = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-top: 16px;
`;

const SeasonList = styled.fieldset`
  border: 0;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  legend {
    padding: 0;
    margin-bottom: 8px;
    font-size: 14px;
    font-weight: 700;
  }
`;

const SeasonOption = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 40px;
  padding: 6px 10px;
  border: 1px solid ${({ theme }) => theme.ink};
  background: ${({ theme }) => theme.card};
  font-size: 14px;
  cursor: pointer;
  input {
    accent-color: ${({ theme }) => theme.purpleDeep};
  }
`;

const Legend = styled.ul`
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
  margin: 14px 0 0;
  padding: 0;
  list-style: none;
  li {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
  }
`;

const Swatch = styled.span<{ $tone: "win" | "loss" | "draw" | "miss" }>`
  width: 18px;
  height: 18px;
  border: 1px solid ${({ theme }) => theme.line};
  background: ${({ $tone }) =>
    $tone === "win" ? "#c9efd6" : $tone === "loss" ? "#f8cfd6" : $tone === "draw" ? "#ffe59a" : "#ffffff"};
`;

const Scroller = styled.div`
  margin-top: 16px;
  overflow: auto;
  max-height: min(720px, calc(100vh - 180px));
  border-top: 1px solid ${({ theme }) => theme.ink};
`;

const Grid = styled.table`
  border-collapse: separate;
  border-spacing: 0;
  min-width: 100%;
  font-size: 13px;
`;

const HeadCell = styled.th<{ $band?: number; $corner?: boolean; $total?: boolean; $under?: boolean }>`
  position: sticky;
  top: ${({ $under }) => ($under ? "28px" : "0")};
  z-index: 2;
  background: ${({ $band, theme }) => ($band === 1 ? theme.purpleDeep : theme.ink)};
  color: white;
  font-weight: 600;
  text-align: center;
  vertical-align: bottom;
  padding: 0;
  height: ${({ $corner, $total }) => ($corner || $total ? "auto" : "118px")};
  min-width: ${({ $corner }) => ($corner ? "148px" : "36px")};
  border-right: 1px solid rgba(255, 255, 255, 0.16);
  border-bottom: 1px solid ${({ theme }) => theme.ink};
`;

const BandCell = styled.th<{ $band?: number; $edge?: "left" | "right" }>`
  position: sticky;
  top: 0;
  z-index: ${({ $edge }) => ($edge ? 5 : 2)};
  left: ${({ $edge }) => ($edge === "left" ? "0" : "auto")};
  right: ${({ $edge }) => ($edge === "right" ? "0" : "auto")};
  min-width: ${({ $edge }) => ($edge === "left" ? "148px" : $edge === "right" ? "48px" : "0")};
  height: 28px;
  background: ${({ $band, theme }) => ($band === 1 ? theme.purpleDeep : theme.ink)};
  color: white;
  font-size: 12px;
  font-weight: 600;
  text-align: left;
  padding: 0 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  white-space: nowrap;
`;

const DateLink = styled(Link)`
  display: flex;
  align-items: flex-end;
  justify-content: center;
  height: 118px;
  color: white;
  writing-mode: vertical-rl;
  transform: rotate(180deg);
  font-size: 12px;
  letter-spacing: 0.04em;
  white-space: nowrap;
`;

const NameHead = styled(HeadCell)`
  left: 0;
  z-index: 4;
  text-align: left;
  padding: 8px 10px;
  vertical-align: bottom;
`;

const TotalHead = styled(HeadCell)`
  right: 0;
  z-index: 4;
  min-width: 48px;
  padding: 8px 6px;
  vertical-align: bottom;
`;

const NameCell = styled.td`
  position: sticky;
  left: 0;
  z-index: 1;
  background: ${({ theme }) => theme.card};
  border-right: 1px solid ${({ theme }) => theme.line};
  border-bottom: 1px solid ${({ theme }) => theme.line};
  padding: 0 10px;
  white-space: nowrap;
  font-weight: 700;
  a {
    color: inherit;
  }
  a:hover {
    color: ${({ theme }) => theme.purpleDeep};
  }
`;

const TotalCell = styled.td`
  position: sticky;
  right: 0;
  z-index: 1;
  background: ${({ theme }) => theme.paper};
  border-left: 1px solid ${({ theme }) => theme.line};
  border-bottom: 1px solid ${({ theme }) => theme.line};
  text-align: center;
  font-weight: 700;
  min-width: 48px;
`;

const PointCell = styled.td<{ $result?: "win" | "loss" | "draw" }>`
  padding: 0;
  width: 36px;
  min-width: 36px;
  height: 32px;
  text-align: center;
  border-right: 1px solid rgba(28, 16, 34, 0.08);
  border-bottom: 1px solid rgba(28, 16, 34, 0.08);
  background: ${({ $result }) =>
    $result === "win" ? "#c9efd6" : $result === "loss" ? "#f8cfd6" : $result === "draw" ? "#ffe59a" : "#ffffff"};
  color: ${({ $result }) => ($result === "win" ? "#14663a" : $result === "loss" ? "#9d2438" : $result === "draw" ? "#6d5308" : "inherit")};
  a {
    display: grid;
    place-items: center;
    min-height: 32px;
    color: inherit;
    font-weight: 700;
  }
  a:hover {
    outline: 2px solid ${({ theme }) => theme.ink};
    outline-offset: -2px;
  }
`;

export function HistoryBoard({
  seasons,
  primary,
  extras,
  columns,
  rows,
}: {
  seasons: Season[];
  primary: string;
  extras: string[];
  columns: HistoryColumn[];
  rows: HistoryRow[];
}) {
  const router = useRouter();
  const bands = seasonBands(columns);
  const imageTitle = [primary, ...extras]
    .map((code) => seasons.find((season) => season.code === code)?.name)
    .filter((name): name is string => Boolean(name))
    .join(" + ");
  const bandOf = new Map<string, number>();
  bands.forEach((band, index) => bandOf.set(band.code, index % 2));
  const several = bands.length > 1;
  const others = seasons.filter((season) => season.code !== primary);

  function open(nextPrimary: string, nextExtras: string[]) {
    router.push(historyHref(nextPrimary, nextExtras), { scroll: false });
  }

  return (
    <>
      <PanelHead>
        <SectionTitle>Histórico</SectionTitle>
        <Select
          aria-label="Temporada"
          value={primary}
          onChange={(event) => open(event.target.value, extras.filter((code) => code !== event.target.value))}
        >
          {seasons.map((season) => (
            <option key={season.id} value={season.code}>
              {season.name}
              {season.isCurrent ? " · atual" : ""}
            </option>
          ))}
        </Select>
      </PanelHead>
      <Filters>
        <SeasonList>
          <legend>Juntar outras temporadas</legend>
          {others.map((season) => {
            const on = extras.includes(season.code);
            return (
              <SeasonOption key={season.id}>
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => open(primary, on ? extras.filter((code) => code !== season.code) : [...extras, season.code])}
                />
                {season.name}
              </SeasonOption>
            );
          })}
        </SeasonList>
      </Filters>
      <Rules>Cada casa é a pontuação da terça. A soma fica na última coluna.</Rules>
      <ShareImageButton disabled={!rows.length || !columns.length} onShare={() => shareHistoryImage(imageTitle || "Temporadas", columns, rows)} />
      <Legend>
        <li>
          <Swatch $tone="win" />3 vitória
        </li>
        <li>
          <Swatch $tone="draw" />1 empate
        </li>
        <li>
          <Swatch $tone="loss" />0 derrota
        </li>
        <li>
          <Swatch $tone="miss" />em branco, não jogou
        </li>
      </Legend>
      {!columns.length ? <Empty>Nenhum jogo nestas temporadas.</Empty> : null}
      {columns.length ? (
        <Scroller>
          <Grid>
            <thead>
              {several ? (
                <tr>
                  <BandCell $edge="left" />
                  {bands.map((band) => (
                    <BandCell key={band.code} colSpan={band.count} $band={bandOf.get(band.code)}>
                      {band.name}
                    </BandCell>
                  ))}
                  <BandCell $edge="right" />
                </tr>
              ) : null}
              <tr>
                <NameHead scope="col" $corner $under={several}>
                  Jogador
                </NameHead>
                {columns.map((column) => (
                  <HeadCell key={column.id} $band={bandOf.get(column.seasonCode)} $under={several} scope="col">
                    <DateLink href={`/jogos/${column.id}`} aria-label={formatShortDate(column.playedOn)} title={formatShortDate(column.playedOn)}>
                      {column.label}
                    </DateLink>
                  </HeadCell>
                ))}
                <TotalHead scope="col" $total $under={several}>
                  Pts
                </TotalHead>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <NameCell>
                    <Link href={`/jogadores/${row.id}`}>{row.name}</Link>
                  </NameCell>
                  {row.cells.map((cell, index) => {
                    const column = columns[index];
                    const when = formatShortDate(column.playedOn);
                    if (!cell) return <PointCell key={column.id} title={`${row.name}, ${when}, não jogou`} />;
                    return (
                      <PointCell key={column.id} $result={cell.result}>
                        <Link
                          href={`/jogos/${cell.matchId}`}
                          aria-label={`${row.name}, ${when}, ${resultLabel(cell.result)}, ${cell.points} pontos`}
                        >
                          {cell.points}
                        </Link>
                      </PointCell>
                    );
                  })}
                  <TotalCell>{row.points}</TotalCell>
                </tr>
              ))}
            </tbody>
          </Grid>
        </Scroller>
      ) : null}
    </>
  );
}

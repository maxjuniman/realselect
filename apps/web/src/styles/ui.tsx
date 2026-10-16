"use client";

import Link from "next/link";
import styled, { css } from "styled-components";

const mobile = "@media (max-width: 860px)";

const display = css`
  font-family: ${({ theme }) => theme.display};
  font-stretch: 87.5%;
  font-weight: 700;
  letter-spacing: -0.03em;
  line-height: 0.95;
`;

export const Shell = styled.main`
  width: min(1040px, calc(100% - 40px));
  margin: 0 auto;
  padding-top: 28px;
`;

export const Footer = styled.footer`
  width: min(1040px, calc(100% - 40px));
  margin: 0 auto;
  padding: 36px 0 48px;
  color: ${({ theme }) => theme.muted};
  font-size: 14px;
`;

export const Panel = styled.section<{ $top?: boolean; $pad?: boolean; $gap?: boolean }>`
  background: transparent;
  border: 0;
  border-radius: 0;
  box-shadow: none;
  margin-top: ${({ $top, $gap }) => ($top || $gap ? "36px" : "0")};
  padding: ${({ $pad }) => ($pad ? "8px 0 16px" : "0")};
`;

export const PanelHead = styled.div<{ $flush?: boolean }>`
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-end;
  padding: 0 0 12px;
  border-bottom: 1px solid ${({ theme }) => theme.ink};
  flex-wrap: wrap;
`;

export const Toolbar = styled.div<{ $flush?: boolean }>`
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  padding: 14px 0;
  flex-wrap: wrap;
`;

export const PageTitle = styled.h1`
  ${display}
  font-size: clamp(36px, 5vw, 52px);
  margin: 0;
`;

export const SectionTitle = styled.h2`
  ${display}
  font-size: clamp(28px, 4vw, 36px);
  margin: 0;
`;

export const Kicker = styled.p`
  margin: 0 0 8px;
  font-size: 16px;
  font-weight: 500;
  color: ${({ theme }) => theme.muted};
`;

export const Muted = styled.p`
  color: ${({ theme }) => theme.muted};
  max-width: 62ch;
`;

export const Rules = styled.p`
  margin: 12px 0 0;
  max-width: 68ch;
  font-size: 15px;
  color: ${({ theme }) => theme.muted};
`;

export const Stack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

export const Actions = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
`;

const control = css`
  border: 1px solid ${({ theme }) => theme.ink};
  background: ${({ theme }) => theme.card};
  border-radius: 0;
  padding: 10px 12px;
  min-height: 44px;
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.purpleDeep};
    outline-offset: 2px;
  }
`;

export const Search = styled.input`
  ${control}
  min-width: min(260px, 100%);
`;

export const Select = styled.select`
  ${control}
  background: ${({ theme }) => theme.card};
`;

export const TextInput = styled.input<{ $reveal?: boolean }>`
  ${control}
  padding-right: ${({ $reveal }) => ($reveal ? "44px" : "12px")};
`;

export const PasswordWrap = styled.span`
  position: relative;
  display: block;
`;

export const RevealButton = styled.button`
  position: absolute;
  top: 0;
  right: 0;
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  border: 0;
  padding: 0;
  background: transparent;
  color: ${({ theme }) => theme.ink};
  cursor: pointer;
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.purpleDeep};
    outline-offset: -2px;
  }
`;

export const Field = styled.label`
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-weight: 600;
`;

export const Check = styled.label`
  display: flex;
  gap: 8px;
  align-items: center;
  font-weight: 600;
`;

const buttonBase = css`
  border: 0;
  border-radius: 0;
  min-height: 44px;
  padding: 0 16px;
  font-weight: 700;
  cursor: pointer;
  &:disabled {
    opacity: 0.6;
    cursor: wait;
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.purpleDeep};
    outline-offset: 3px;
  }
`;

export const PrimaryButton = styled.button`
  ${buttonBase}
  background: ${({ theme }) => theme.purpleDeep};
  color: white;
  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.purple};
  }
`;

export const GhostButton = styled.button`
  ${buttonBase}
  background: transparent;
  color: ${({ theme }) => theme.ink};
  border: 1px solid ${({ theme }) => theme.ink};
`;

export const DangerButton = styled.button`
  ${buttonBase}
  background: transparent;
  color: ${({ theme }) => theme.loss};
  border: 1px solid ${({ theme }) => theme.loss};
`;

export const MiniButton = styled.button`
  border: 1px solid ${({ theme }) => theme.ink};
  background: ${({ theme }) => theme.card};
  color: ${({ theme }) => theme.ink};
  border-radius: 0;
  min-width: 36px;
  height: 36px;
  padding: 0 10px;
  font-weight: 700;
  cursor: pointer;
  &:hover {
    background: ${({ theme }) => theme.purpleDeep};
    color: white;
    border-color: ${({ theme }) => theme.purpleDeep};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.purpleDeep};
    outline-offset: 2px;
  }
`;

export const ButtonLink = styled(Link)<{ $variant?: "primary" | "ghost" }>`
  ${buttonBase}
  display: inline-grid;
  place-items: center;
  background: ${({ $variant, theme }) => ($variant === "ghost" ? "transparent" : theme.purpleDeep)};
  color: ${({ $variant, theme }) => ($variant === "ghost" ? theme.ink : "white")};
  border: 1px solid ${({ $variant, theme }) => ($variant === "ghost" ? theme.ink : theme.purpleDeep)};
  &:hover {
    background: ${({ $variant, theme }) => ($variant === "ghost" ? theme.ink : theme.purple)};
    color: white;
    border-color: ${({ $variant, theme }) => ($variant === "ghost" ? theme.ink : theme.purple)};
  }
`;

export const ErrorText = styled.p`
  background: transparent;
  color: ${({ theme }) => theme.loss};
  padding: 8px 0;
  border-top: 2px solid ${({ theme }) => theme.loss};
`;

export const Guest = styled.span`
  margin-left: 8px;
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.muted};
`;

export const Empty = styled.p`
  padding: 20px 0 8px;
  color: ${({ theme }) => theme.muted};
  max-width: 62ch;
`;

export const TableWrap = styled.div`
  overflow-x: auto;
`;

const cell = css<{ $num?: boolean; $extra?: boolean }>`
  text-align: ${({ $num }) => ($num ? "right" : "left")};
  padding: 11px 10px;
  border-bottom: 1px solid ${({ theme }) => theme.line};
  white-space: nowrap;
  font-variant-numeric: ${({ $num }) => ($num ? "tabular-nums" : "normal")};
  ${({ $extra }) =>
    $extra &&
    css`
      ${mobile} {
        display: none;
      }
    `}
`;

export const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

export const Th = styled.th<{ $num?: boolean; $extra?: boolean }>`
  ${cell}
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.muted};
  border-bottom-color: ${({ theme }) => theme.ink};
`;

export const Td = styled.td<{ $num?: boolean; $extra?: boolean; $place?: boolean; $name?: boolean }>`
  ${cell}
  font-stretch: ${({ $place }) => ($place ? "87.5%" : "100%")};
  font-size: ${({ $place }) => ($place ? "22px" : "inherit")};
  font-weight: ${({ $place, $name }) => ($place || $name ? 700 : 500)};
  a:hover {
    color: ${({ theme }) => theme.purpleDeep};
  }
`;

export const RankRow = styled.tr<{ $rank?: number }>`
  td:first-child {
    box-shadow: inset 4px 0 0
      ${({ $rank, theme }) => ($rank === 1 ? theme.gold : $rank === 2 ? theme.silver : $rank === 3 ? theme.bronze : "transparent")};
  }
  &:hover {
    background: rgba(153, 58, 162, 0.05);
  }
`;

export const List = styled.div`
  display: flex;
  flex-direction: column;
`;

export const ScoreText = styled.strong<{ $tone: "verde" | "roxo" | "empate" }>`
  color: ${({ $tone, theme }) => ($tone === "verde" ? theme.gold : $tone === "roxo" ? theme.purple : theme.ink)};
`;

export const ListLink = styled(Link)`
  display: grid;
  grid-template-columns: minmax(260px, 34%) 1fr auto;
  gap: 16px;
  align-items: baseline;
  padding: 14px 0;
  border-bottom: 1px solid ${({ theme }) => theme.line};
  > :first-child {
    white-space: nowrap;
  }
  &:hover {
    color: ${({ theme }) => theme.purpleDeep};
  }
  ${mobile} {
    grid-template-columns: 1fr;
    gap: 2px;
    > :first-child {
      white-space: normal;
    }
  }
`;

export const SplitRow = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid ${({ theme }) => theme.line};
  flex-wrap: wrap;
`;

export const StatGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  border-top: 1px solid ${({ theme }) => theme.ink};
  border-bottom: 1px solid ${({ theme }) => theme.ink};
  ${mobile} {
    grid-template-columns: 1fr 1fr;
  }
`;

export const Stat = styled.div`
  padding: 14px 16px 14px 0;
  background: transparent;
  border: 0;
  b {
    display: block;
    ${display}
    font-size: 32px;
  }
  span {
    color: ${({ theme }) => theme.muted};
    font-size: 14px;
  }
`;

export const Lineup = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 28px;
  margin-top: 28px;
  ${mobile} {
    grid-template-columns: 1fr;
  }
`;

export const SideCard = styled(Panel)`
  padding: 0;
  h2 {
    margin: 0 0 4px;
  }
`;

export const PlayerLine = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: baseline;
  padding: 10px 0;
  border-bottom: 1px solid ${({ theme }) => theme.line};
`;

export const NameLink = styled(Link)`
  font-weight: 700;
  &:hover {
    color: ${({ theme }) => theme.purpleDeep};
  }
`;

export const Pill = styled.span<{ $tone: "a" | "b" | "win" | "loss" | "draw" }>`
  display: inline-block;
  padding: 0 0 6px;
  font-size: 18px;
  font-weight: 700;
  font-stretch: 87.5%;
  border-bottom: 3px solid
    ${({ $tone, theme }) =>
      $tone === "a" ? theme.ink : $tone === "b" ? theme.purple : $tone === "win" ? theme.win : $tone === "loss" ? theme.loss : theme.draw};
  color: ${({ theme }) => theme.ink};
`;

export const Scoreline = styled.p`
  ${display}
  font-size: clamp(56px, 8vw, 84px);
  margin: 8px 0 12px;
`;

export const PageBlock = styled.article`
  margin-top: 8px;
`;

export const Hero = styled.section`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 200px;
  column-gap: 28px;
  align-items: end;
  margin: 8px 0 40px;
  ${mobile} {
    grid-template-columns: minmax(0, 1fr) 96px;
    column-gap: 12px;
    margin-bottom: 28px;
  }
`;

export const HeroCopy = styled.div`
  h1 {
    ${display}
    font-size: clamp(40px, 6vw, 64px);
    max-width: 14ch;
    margin: 0 0 14px;
  }
  p {
    margin: 0;
    font-size: 18px;
    max-width: 42ch;
    line-height: 1.45;
  }
  ${mobile} {
    display: contents;
    h1 {
      grid-column: 1 / -1;
      max-width: 11ch;
      margin: 0 0 16px;
    }
    p {
      grid-column: 1;
      grid-row: 2;
      align-self: end;
    }
  }
`;

export const LeaderChip = styled.div`
  display: none;
`;

export const PositionBadge = styled.span`
  display: none;
`;

export const Banner = styled.section`
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 250px;
  align-items: end;
  gap: 8px;
  margin: 4px 0 36px;
  padding: 26px 0 0 26px;
  background: #9335a3;
  color: #ffffff;
  border-bottom: 4px solid ${({ theme }) => theme.gold};
  overflow: hidden;
  ${mobile} {
    grid-template-columns: 1fr;
    margin-bottom: 28px;
    padding: 16px 14px 16px;
  }
`;

export const BannerMain = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
  padding-bottom: 22px;
  ${mobile} {
    gap: 12px;
    padding-bottom: 16px;
  }
`;

export const BannerKicker = styled.p`
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.78);
  ${mobile} {
    min-height: 72px;
    padding-right: 96px;
  }
`;

export const Podium = styled.ol<{ $count: number }>`
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: ${({ $count }) => ($count >= 3 ? "1fr 1.12fr 1fr" : $count === 2 ? "1fr 1fr" : "minmax(0, 280px)")};
  gap: 10px;
  align-items: end;
  ${mobile} {
    gap: 6px;
  }
`;

export const PodiumCard = styled.li<{ $rank: number }>`
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: 2px;
  min-height: ${({ $rank }) => ($rank === 1 ? "164px" : $rank === 2 ? "132px" : "112px")};
  padding: 14px 14px 12px;
  background: ${({ $rank }) => ($rank === 1 ? "#ffffff" : "rgba(255, 255, 255, 0.14)")};
  color: ${({ $rank, theme }) => ($rank === 1 ? theme.ink : "#ffffff")};
  box-shadow: ${({ $rank }) => ($rank === 1 ? "inset 0 4px 0 #008000" : "inset 0 0 0 1px rgba(255,255,255,0.2)")};
  a {
    color: inherit;
    font-family: ${({ theme }) => theme.display};
    font-stretch: 87.5%;
    font-weight: 700;
    font-size: ${({ $rank }) => ($rank === 1 ? "26px" : "18px")};
    letter-spacing: -0.03em;
    line-height: 0.98;
    overflow-wrap: anywhere;
  }
  a:hover {
    text-decoration: underline;
    text-decoration-thickness: 2px;
    text-underline-offset: 3px;
  }
  ${mobile} {
    min-height: ${({ $rank }) => ($rank === 1 ? "128px" : $rank === 2 ? "108px" : "96px")};
    padding: 10px 8px 8px;
    a {
      font-size: ${({ $rank }) => ($rank === 1 ? "18px" : "14px")};
    }
  }
`;

export const PlaceMark = styled.span`
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  opacity: 0.7;
`;

export const PlacePoints = styled.span`
  margin-top: 8px;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.02em;
  b {
    margin-right: 4px;
    font-family: ${({ theme }) => theme.display};
    font-stretch: 87.5%;
    font-size: 32px;
    font-weight: 700;
    letter-spacing: -0.04em;
    line-height: 0.9;
  }
  ${mobile} {
    b {
      font-size: 24px;
    }
  }
`;

export const AwardRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  ${mobile} {
    gap: 6px;
  }
`;

export const AwardCard = styled.article`
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
  padding: 12px 14px;
  background: rgba(255, 255, 255, 0.12);
  box-shadow: inset 3px 0 0 rgba(255, 255, 255, 0.85);
  span {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.74);
  }
  a {
    color: #ffffff;
    font-family: ${({ theme }) => theme.display};
    font-stretch: 87.5%;
    font-weight: 700;
    font-size: 22px;
    letter-spacing: -0.03em;
    line-height: 1;
    overflow-wrap: anywhere;
  }
  a:hover {
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  em {
    font-style: normal;
    font-weight: 700;
    font-size: 14px;
    color: rgba(255, 255, 255, 0.9);
    white-space: nowrap;
  }
  ${mobile} {
    padding: 10px;
    span {
      letter-spacing: 0.06em;
    }
    a {
      font-size: 16px;
    }
  }
`;

export const BannerMascot = styled.div`
  align-self: end;
  justify-self: end;
  img {
    display: block;
    width: 250px;
    height: auto;
  }
  ${mobile} {
    position: absolute;
    top: 8px;
    right: 0;
    img {
      width: 104px;
    }
  }
`;

export const HeroArt = styled.div`
  display: flex;
  align-items: flex-end;
  justify-content: flex-end;
  img {
    width: 200px;
    height: auto;
  }
  ${mobile} {
    grid-column: 2;
    grid-row: 2;
    img {
      width: 96px;
    }
  }
`;

export const LoginWrap = styled.div`
  min-height: 70vh;
  display: grid;
  grid-template-columns: 180px minmax(0, 420px);
  gap: 36px;
  align-items: center;
  justify-content: start;
  padding: 12px 0 64px;
  img {
    width: 180px;
  }
  ${mobile} {
    grid-template-columns: 1fr;
    img {
      width: 120px;
    }
  }
`;

export const LoginCard = styled.form`
  background: transparent;
  border: 0;
  border-radius: 0;
  box-shadow: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
  h1 {
    ${display}
    font-size: 56px;
    margin: 0;
  }
  input {
    width: 100%;
  }
`;

export const AdminShell = styled.div`
  display: grid;
  grid-template-columns: 180px minmax(0, 1fr);
  gap: 36px;
  padding: 8px 0 48px;
  ${mobile} {
    grid-template-columns: 1fr;
    gap: 16px;
  }
`;

export const AdminNav = styled.aside`
  display: flex;
  flex-direction: column;
  gap: 2px;
  align-self: start;
  position: sticky;
  top: 92px;
  ${mobile} {
    position: static;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 8px 14px;
  }
`;

export const AdminLink = styled(Link)<{ $active?: boolean }>`
  padding: 8px 0 8px 12px;
  border-radius: 0;
  font-weight: ${({ $active }) => ($active ? 700 : 500)};
  box-shadow: inset 3px 0 0 ${({ $active, theme }) => ($active ? theme.gold : "transparent")};
  color: ${({ theme }) => theme.ink};
  &:hover {
    color: ${({ theme }) => theme.purpleDeep};
  }
`;

export const Picker = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(240px, 1.15fr) minmax(0, 1fr);
  gap: 16px;
  align-items: start;
  ${mobile} {
    grid-template-columns: 1fr;
  }
`;

export const Bucket = styled.section`
  background: transparent;
  border: 0;
  border-top: 3px solid ${({ theme }) => theme.ink};
  border-radius: 0;
  min-height: 180px;
  padding: 12px 0;
  &:nth-child(2) {
    border-top-color: ${({ theme }) => theme.line};
  }
  &:last-child {
    border-top-color: ${({ theme }) => theme.purple};
  }
  h3 {
    margin: 0 0 10px;
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    ${display}
    font-size: 22px;
  }
`;

export const Person = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 8px;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid ${({ theme }) => theme.line};
  background: transparent;
  margin: 0;
  > :first-child {
    min-width: 0;
  }
`;

export const Stepper = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  button {
    width: 28px;
    height: 28px;
    border-radius: 0;
    border: 1px solid ${({ theme }) => theme.ink};
    background: ${({ theme }) => theme.card};
    cursor: pointer;
    font-weight: 700;
  }
`;

export const ScoreRow = styled.div`
  display: flex;
  gap: 16px;
  align-items: flex-end;
  flex-wrap: wrap;
`;

export const ScoreBox = styled.label`
  text-align: left;
  font-weight: 600;
  display: flex;
  flex-direction: column;
  gap: 6px;
  input {
    width: 88px;
    font-stretch: 87.5%;
    font-weight: 700;
    font-size: 48px;
    text-align: center;
    height: 72px;
    border: 0;
    border-bottom: 3px solid ${({ theme }) => theme.ink};
    background: transparent;
    border-radius: 0;
  }
`;

export const Times = styled.b`
  ${display}
  font-size: 42px;
  padding-bottom: 8px;
`;

export const ScorePad = styled.div`
  background: transparent;
  border: 0;
  border-bottom: 1px solid ${({ theme }) => theme.ink};
  border-radius: 0;
  padding: 0 0 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
`;

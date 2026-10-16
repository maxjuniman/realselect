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

const bannerFloat = css`
  @keyframes bannerFloat {
    0%,
    100% {
      transform: translateY(-8px) rotate(0deg);
    }
    50% {
      transform: translateY(-14px) rotate(2deg);
    }
  }
  animation: bannerFloat 4s ease-in-out infinite;
`;

const bannerPulse = css`
  @keyframes bannerPulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.35;
    }
  }
  animation: bannerPulse 1.6s ease-in-out infinite;
`;

export const Banner = styled.section`
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  grid-template-areas:
    "head"
    "main";
  row-gap: 24px;
  align-items: center;
  aspect-ratio: 2.52 / 1;
  margin: 4px 0 36px;
  padding: 32px 32% 40px 36px;
  border-radius: 24px;
  color: #ffffff;
  overflow: hidden;
  border: 1px solid rgba(88, 28, 135, 0.5);
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.45);
  background:
    radial-gradient(circle at 80% 20%, rgba(168, 85, 247, 0.25) 0%, transparent 40%),
    radial-gradient(circle at 20% 80%, rgba(0, 255, 136, 0.15) 0%, transparent 40%),
    linear-gradient(135deg, #2d124d 0%, #160829 100%);
  &::before {
    content: "";
    position: absolute;
    inset: 0;
    pointer-events: none;
    background-image:
      linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px),
      linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
    background-size: 30px 30px;
  }
  &::after {
    content: "";
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 6px;
    background: linear-gradient(90deg, #a855f7, #00ff88, #00f0ff);
    box-shadow: 0 0 15px #00ff88;
  }
  ${mobile} {
    row-gap: 18px;
    aspect-ratio: auto;
    margin-bottom: 28px;
    padding: 20px 16px 28px;
    border-radius: 18px;
  }
`;

export const BannerHead = styled.div`
  position: relative;
  z-index: 1;
  grid-area: head;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
`;

export const BannerMain = styled.div`
  position: relative;
  z-index: 1;
  grid-area: main;
  display: flex;
  flex-direction: column;
  gap: 24px;
  min-width: 0;
  ${mobile} {
    gap: 16px;
  }
`;

export const BannerKicker = styled.p`
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #00ff88;
  text-shadow: 0 0 10px rgba(0, 255, 136, 0.6);
  &::before {
    content: "";
    width: 10px;
    height: 10px;
    flex: 0 0 auto;
    border-radius: 999px;
    background: #00ff88;
    box-shadow: 0 0 8px #00ff88;
    ${bannerPulse}
  }
`;

export const BannerNote = styled.p`
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(216, 180, 254, 0.6);
  ${mobile} {
    display: none;
  }
`;

export const Podium = styled.ol<{ $count: number }>`
  position: relative;
  list-style: none;
  margin: 0;
  padding: 28px 0 0;
  display: grid;
  grid-template-columns: ${({ $count }) => ($count >= 3 ? "1fr 1fr 1fr" : $count === 2 ? "1fr 1fr" : "minmax(0, 220px)")};
  gap: 12px;
  align-items: end;
  ${mobile} {
    gap: 8px;
    padding-top: 26px;
  }
`;

export const PodiumCard = styled.li<{ $rank: number }>`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 2px;
  min-width: 0;
  padding: ${({ $rank }) => ($rank === 1 ? "20px 12px 16px" : "14px 10px 12px")};
  border-radius: 16px;
  color: #ffffff;
  background: ${({ $rank }) => ($rank === 1 ? "rgba(48, 18, 84, 0.75)" : "rgba(35, 14, 61, 0.55)")};
  border: ${({ $rank }) => ($rank === 1 ? "1.5px solid rgba(0, 255, 136, 0.7)" : "1px solid rgba(255, 255, 255, 0.1)")};
  box-shadow: ${({ $rank }) => ($rank === 1 ? "0 0 20px rgba(0, 255, 136, 0.4), inset 0 0 15px rgba(0, 255, 136, 0.2)" : "none")};
  backdrop-filter: blur(12px);
  ${({ $rank }) =>
    $rank === 1
      ? bannerFloat
      : css`
          transition: transform 0.3s ease, border-color 0.3s ease;
          &:hover {
            transform: scale(1.05);
            border-color: rgba(192, 132, 252, 0.4);
          }
        `};
  a {
    max-width: 100%;
    color: #ffffff;
    font-weight: 800;
    font-size: ${({ $rank }) => ($rank === 1 ? "24px" : "18px")};
    letter-spacing: -0.03em;
    line-height: 1.05;
    overflow-wrap: anywhere;
    text-shadow: ${({ $rank }) => ($rank === 1 ? "0 0 10px rgba(168, 85, 247, 0.6)" : "none")};
  }
  a:hover {
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  ${mobile} {
    padding: ${({ $rank }) => ($rank === 1 ? "16px 8px 12px" : "12px 6px 10px")};
    border-radius: 14px;
    a {
      font-size: ${({ $rank }) => ($rank === 1 ? "16px" : "14px")};
    }
  }
`;

export const Crown = styled.span`
  position: absolute;
  top: -26px;
  left: 50%;
  z-index: 1;
  width: 40px;
  height: 40px;
  color: #00ff88;
  transform: translateX(-50%);
  filter: drop-shadow(0 0 8px rgba(0, 255, 136, 0.8));
  svg {
    display: block;
    width: 40px;
    height: 40px;
    fill: currentColor;
  }
  ${mobile} {
    top: -22px;
    width: 32px;
    height: 32px;
    svg {
      width: 32px;
      height: 32px;
    }
  }
`;

export const PlaceMark = styled.span<{ $rank: number }>`
  font-size: ${({ $rank }) => ($rank === 1 ? "14px" : "13px")};
  font-weight: 800;
  color: ${({ $rank }) => ($rank === 1 ? "#00ff88" : "#d8b4fe")};
  text-shadow: ${({ $rank }) => ($rank === 1 ? "0 0 10px rgba(0, 255, 136, 0.6)" : "none")};
`;

export const PlacePoints = styled.span<{ $rank: number }>`
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 4px;
  margin-top: 8px;
  font-size: 12px;
  font-weight: 700;
  color: ${({ $rank }) => ($rank === 1 ? "#00ff88" : "#d8b4fe")};
  b {
    font-size: ${({ $rank }) => ($rank === 1 ? "32px" : "24px")};
    font-weight: 900;
    letter-spacing: -0.04em;
    line-height: 0.9;
    color: ${({ $rank }) => ($rank === 1 ? "#00ff88" : "#ffffff")};
    text-shadow: ${({ $rank }) => ($rank === 1 ? "0 0 10px rgba(0, 255, 136, 0.6)" : "none")};
  }
  ${mobile} {
    b {
      font-size: ${({ $rank }) => ($rank === 1 ? "22px" : "18px")};
    }
  }
`;

export const AwardRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

export const AwardCard = styled.article<{ $tone: "green" | "purple" }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-width: 0;
  padding: 16px;
  border-radius: 12px;
  background: rgba(35, 14, 61, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-left: 4px solid ${({ $tone }) => ($tone === "green" ? "#00ff88" : "#a855f7")};
  backdrop-filter: blur(12px);
  transition: background 0.2s ease;
  &:hover {
    background: rgba(88, 28, 135, 0.4);
  }
  div {
    min-width: 0;
  }
  span {
    display: block;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #d8b4fe;
  }
  a {
    color: #ffffff;
    font-weight: 900;
    font-size: 20px;
    letter-spacing: -0.03em;
    line-height: 1.1;
    overflow-wrap: anywhere;
  }
  a:hover {
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  strong {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    flex: 0 0 auto;
  }
  b {
    font-size: 26px;
    font-weight: 900;
    line-height: 1;
    color: ${({ $tone }) => ($tone === "green" ? "#00ff88" : "#d8b4fe")};
  }
  em {
    font-style: normal;
    font-weight: 600;
    font-size: 12px;
    color: #e9d5ff;
  }
  ${mobile} {
    padding: 12px;
    a {
      font-size: 16px;
    }
    b {
      font-size: 22px;
    }
  }
`;

export const BannerMascot = styled.div`
  position: absolute;
  z-index: 2;
  top: 10%;
  right: 0;
  width: 20%;
  height: 80%;
  pointer-events: none;
  &::before {
    content: "";
    position: absolute;
    left: 10%;
    right: 10%;
    top: 18%;
    bottom: 8%;
    border-radius: 999px;
    background: rgba(147, 51, 234, 0.45);
    filter: blur(28px);
  }
  img {
    position: absolute;
    z-index: 1;
    height: 109.8%;
    width: auto;
    max-width: none;
    top: -7.1%;
    right: 10%;
    transform: translateX(39.4%);
    filter: drop-shadow(0 10px 18px rgba(0, 0, 0, 0.45));
  }
  ${mobile} {
    top: auto;
    bottom: 8px;
    width: 92px;
    height: 146px;
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

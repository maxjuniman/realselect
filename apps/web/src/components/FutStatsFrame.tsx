"use client";

import styled from "styled-components";

export function FutStatsFrame({ src }: { src: string }) {
  return <Frame src={src} title="Fut Stats" allow="fullscreen" allowFullScreen loading="lazy" />;
}

const Frame = styled.iframe`
  display: block;
  width: 100%;
  height: 90vh;
  min-height: 640px;
  border: 0;
  background: ${({ theme }) => theme.card};
`;

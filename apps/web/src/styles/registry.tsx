"use client";

import { useState } from "react";
import { useServerInsertedHTML } from "next/navigation";
import { ServerStyleSheet, StyleSheetManager, ThemeProvider, createGlobalStyle } from "styled-components";
import { theme } from "./theme";

const GlobalStyle = createGlobalStyle`
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: ${({ theme }) => theme.font};
    color: ${({ theme }) => theme.ink};
    background: ${({ theme }) => theme.paper};
    min-height: 100vh;
    font-size: 16px;
    line-height: 1.45;
  }
  a { color: inherit; text-decoration: none; }
  button, input, select { font: inherit; color: inherit; }
  img { max-width: 100%; }
  h1, h2, h3, p { margin: 0; }
  :focus-visible {
    outline: 2px solid ${({ theme }) => theme.purpleDeep};
    outline-offset: 3px;
  }
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation: none !important;
      transition: none !important;
    }
  }
`;

export function StyledComponentsRegistry({ children }: { children: React.ReactNode }) {
  const [sheet] = useState(() => new ServerStyleSheet());

  useServerInsertedHTML(() => {
    const styles = sheet.getStyleElement();
    sheet.instance.clearTag();
    return <>{styles}</>;
  });

  const tree = (
    <ThemeProvider theme={theme}>
      <GlobalStyle />
      {children}
    </ThemeProvider>
  );

  if (typeof window !== "undefined") return tree;

  return <StyleSheetManager sheet={sheet.instance}>{tree}</StyleSheetManager>;
}

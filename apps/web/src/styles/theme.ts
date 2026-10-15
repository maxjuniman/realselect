export const theme = {
  purple: "#993aa2",
  purpleDeep: "#4c124f",
  purpleInk: "#993AA2",
  magenta: "#993aa2",
  gold: "#008000",
  silver: "#8e95a3",
  bronze: "#a56a34",
  paper: "#f7f4f6",
  card: "#ffffff",
  line: "#e3d7e4",
  ink: "#1c1022",
  muted: "#5e4d63",
  win: "#1b7a42",
  loss: "#b4233a",
  draw: "#8a5a10",
  shadow: "none",
  font: 'var(--font-anybody), "Segoe UI", sans-serif',
  display: 'var(--font-anybody), "Segoe UI", sans-serif',
};

export type AppTheme = typeof theme;

declare module "styled-components" {
  export interface DefaultTheme extends AppTheme {}
}

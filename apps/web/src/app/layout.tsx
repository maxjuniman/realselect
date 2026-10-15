import type { Metadata, Viewport } from "next";
import { Anybody } from "next/font/google";
import { Header } from "@/components/Header";
import { PwaRegister } from "@/components/PwaRegister";
import { StyledComponentsRegistry } from "@/styles/registry";
import { Footer, Shell } from "@/styles/ui";

const anybody = Anybody({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-anybody",
  axes: ["wdth"],
});

export const metadata: Metadata = {
  title: { default: "Real Select FC", template: "%s · Real Select FC" },
  description: "Campeonato de pontos corridos do Futibas de Terça. Um jogo por semana, classificação por semestre.",
  applicationName: "Real Select",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, title: "Real Select", statusBarStyle: "black-translucent" },
  icons: { icon: "/icons/icon-192.png", apple: "/icons/icon-192.png" },
};

export const viewport: Viewport = {
  themeColor: "#4c124f",
  width: "device-width",
  initialScale: 1,
};

export const dynamic = "force-dynamic";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={anybody.variable}>
      <body>
        <StyledComponentsRegistry>
          <Header />
          <Shell>{children}</Shell>
          <Footer>Real Select, desde 2018.</Footer>
          <PwaRegister />
        </StyledComponentsRegistry>
      </body>
    </html>
  );
}

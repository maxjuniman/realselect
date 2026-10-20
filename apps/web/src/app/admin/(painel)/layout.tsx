"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import styled from "styled-components";
import { SessionProvider } from "@/components/Session";
import { clientApi } from "@/lib/client";
import type { Session } from "@/lib/types";
import { AdminLink, AdminNav, AdminShell, GhostButton, Muted } from "@/styles/ui";

const adminLinks = [
  { href: "/admin", label: "Resumo" },
  { href: "/admin/jogos", label: "Jogos" },
  { href: "/admin/jogadores", label: "Jogadores" },
  { href: "/admin/professores", label: "Professores" },
  { href: "/admin/sequencia", label: "Sequência" },
  { href: "/admin/temporadas", label: "Temporadas" },
  { href: "/admin/usuarios", label: "Usuários" },
];

const playerLinks = [
  { href: "/admin", label: "Resumo" },
  { href: "/admin/jogadores", label: "Jogadores" },
];

const AdminMain = styled.div`
  min-width: 0;
`;

export default function PainelLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    if (!localStorage.getItem("rs_token")) {
      router.replace("/admin/login");
      return;
    }
    clientApi<Session>("/auth/me")
      .then(setSession)
      .catch(() => {
        localStorage.removeItem("rs_token");
        router.replace("/admin/login");
      });
  }, [router]);

  const allowed = !session || session.role !== "player" || pathname === "/admin" || pathname.startsWith("/admin/jogadores");

  useEffect(() => {
    if (session && !allowed) router.replace("/admin");
  }, [allowed, router, session]);

  if (!session) return <Muted>Abrindo o painel...</Muted>;

  const links = session.role === "player" ? playerLinks : adminLinks;

  return (
    <SessionProvider session={session}>
    <AdminShell>
      <AdminNav>
        {links.map((link) => (
          <AdminLink
            key={link.href}
            href={link.href}
            $active={
              link.href === "/admin"
                ? pathname === "/admin"
                : link.href === "/admin/jogos"
                  ? pathname.startsWith("/admin/jogos") || pathname.startsWith("/admin/jogo/")
                  : pathname.startsWith(link.href)
            }
          >
            {link.label}
          </AdminLink>
        ))}
        <GhostButton
          type="button"
          onClick={() => {
            localStorage.removeItem("rs_token");
            router.replace("/admin/login");
          }}
        >
          Sair
        </GhostButton>
        <Link href="/">Ver site</Link>
      </AdminNav>
      <AdminMain>{allowed ? children : <Muted>Abrindo o painel...</Muted>}</AdminMain>
    </AdminShell>
    </SessionProvider>
  );
}

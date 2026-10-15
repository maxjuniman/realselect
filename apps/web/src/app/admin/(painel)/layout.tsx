"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AdminLink, AdminNav, AdminShell, GhostButton, Muted } from "@/styles/ui";

const links = [
  { href: "/admin", label: "Resumo" },
  { href: "/admin/jogo/novo", label: "Nova terça" },
  { href: "/admin/jogadores", label: "Jogadores" },
  { href: "/admin/temporadas", label: "Temporadas" },
];

export default function PainelLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("rs_token")) router.replace("/admin/login");
    else setReady(true);
  }, [router]);

  if (!ready) return <Muted>Abrindo o painel...</Muted>;

  return (
    <AdminShell>
      <AdminNav>
        {links.map((link) => (
          <AdminLink key={link.href} href={link.href} $active={pathname === link.href}>
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
      <div>{children}</div>
    </AdminShell>
  );
}

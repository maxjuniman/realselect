"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styled from "styled-components";

const links = [
  { href: "/", label: "Classificação" },
  { href: "/jogos", label: "Jogos" },
  { href: "/artilharia", label: "Artilharia" },
  { href: "/presenca", label: "Presença" },
];

const Bar = styled.header`
  position: sticky;
  top: 0;
  z-index: 20;
  background: ${({ theme }) => theme.purpleInk};
  color: white;
  border-bottom: 4px solid ${({ theme }) => theme.gold};
`;

const Inner = styled.div`
  width: min(1040px, calc(100% - 40px));
  margin: 0 auto;
  display: flex;
  align-items: center;
  gap: 28px;
  min-height: 72px;
`;

const Brand = styled(Link)`
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: max-content;
  img {
    width: 44px;
    height: 44px;
    object-fit: contain;
  }
  strong {
    display: block;
    font-stretch: 87.5%;
    font-weight: 700;
    font-size: 22px;
    letter-spacing: -0.03em;
    line-height: 1;
  }
  small {
    display: block;
    margin-top: 2px;
    color: rgba(255, 255, 255, 0.78);
    font-size: 13px;
    font-weight: 500;
  }
`;

const Nav = styled.nav`
  display: flex;
  gap: 4px 18px;
  flex: 1;
  @media (max-width: 860px) {
    display: none;
  }
`;

const NavLink = styled(Link)<{ $active?: boolean }>`
  color: white;
  padding: 8px 0 6px;
  font-weight: ${({ $active }) => ($active ? 700 : 500)};
  font-size: 15px;
  box-shadow: inset 0 -3px 0 ${({ $active, theme }) => ($active ? theme.gold : "transparent")};
  &:hover {
    box-shadow: inset 0 -3px 0 ${({ theme }) => theme.gold};
  }
`;

const AdminLink = styled(Link)<{ $active?: boolean }>`
  margin-left: auto;
  color: white;
  padding: 8px 0 6px;
  font-weight: ${({ $active }) => ($active ? 700 : 500)};
  font-size: 15px;
  box-shadow: inset 0 -3px 0 ${({ $active, theme }) => ($active ? theme.gold : "transparent")};
  &:hover {
    box-shadow: inset 0 -3px 0 ${({ theme }) => theme.gold};
  }
`;

const MobileNav = styled.nav`
  display: none;
  width: min(1040px, calc(100% - 40px));
  margin: 0 auto;
  gap: 8px 14px;
  padding: 0 0 12px;
  @media (max-width: 860px) {
    display: flex;
    flex-wrap: wrap;
  }
`;

const MobileLink = styled(Link)<{ $active?: boolean }>`
  color: white;
  padding: 4px 0;
  font-size: 14px;
  font-weight: ${({ $active }) => ($active ? 700 : 500)};
  white-space: nowrap;
  box-shadow: inset 0 -3px 0 ${({ $active, theme }) => ($active ? theme.gold : "transparent")};
`;

export function Header() {
  const pathname = usePathname();
  const current = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  const admin = pathname.startsWith("/admin");

  return (
    <Bar>
      <Inner>
        <Brand href="/">
          <img src="/brand/logo.png" alt="Escudo Real Select" />
          <span>
            <strong>Real Select</strong>
            <small>Futibas de terça</small>
          </span>
        </Brand>
        <Nav>
          {links.map((link) => (
            <NavLink key={link.href} href={link.href} $active={current(link.href)}>
              {link.label}
            </NavLink>
          ))}
        </Nav>
        <AdminLink href="/admin" $active={admin}>
          Painel
        </AdminLink>
      </Inner>
      <MobileNav aria-label="Seções">
        {links.map((link) => (
          <MobileLink key={link.href} href={link.href} $active={current(link.href)}>
            {link.label}
          </MobileLink>
        ))}
      </MobileNav>
    </Bar>
  );
}

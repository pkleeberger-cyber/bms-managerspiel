"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const adminNavigationItems = [
  { href: "/admin", icon: "🏠", label: "Leitstand" },
  { href: "/admin/season", icon: "📅", label: "Saison" },
  { href: "/admin/matchday", icon: "⚽", label: "Spieltage" },
  { href: "/admin/transfers", icon: "💰", label: "Transfers" },
  { href: "/admin/managers", icon: "👤", label: "Manager" },
  { href: "/admin/users", icon: "🔐", label: "Benutzer" },
  { href: "/admin/players", icon: "🧍", label: "Spieler" },
  { href: "/admin/import", icon: "📥", label: "Importe" },
  { href: "/admin/system", icon: "⚙", label: "System" },
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === "/admin") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminNavigation() {
  const pathname = usePathname();

  return (
    <nav className="admin-navigation" aria-label="BMS Office Navigation">
      <span>BMS Office</span>
      <div>
        {adminNavigationItems.map((item) => (
          <Link
            className={isActive(pathname, item.href) ? "active" : undefined}
            href={item.href}
            key={item.href}
          >
            <span aria-hidden="true">{item.icon}</span>
            <strong>{item.label}</strong>
          </Link>
        ))}
      </div>
    </nav>
  );
}

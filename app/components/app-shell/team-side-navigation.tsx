"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { teamNavigation } from "@/components/app-shell/navigation-config";

const activePathAliases: Record<string, string[]> = {
  "/team/overview": ["/"],
  "/team/kader": ["/team/squad"],
  "/team/historie": ["/team/history"],
};

function isActive(pathname: string, href: string): boolean {
  if (pathname === href || pathname.startsWith(`${href}/`)) {
    return true;
  }

  return activePathAliases[href]?.some(
    (alias) => pathname === alias || pathname.startsWith(`${alias}/`),
  ) ?? false;
}

export function TeamSideNavigation({
  defaultManagerSeasonId,
}: {
  defaultManagerSeasonId?: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const managerSeasonId =
    searchParams.get("managerSeasonId") ?? defaultManagerSeasonId;

  return (
    <nav className="team-side-navigation" aria-label="Mein Team Navigation">
      <span>Mein Team</span>
      <div>
        {teamNavigation.map((item) => (
          <Link
            className={isActive(pathname, item.href) ? "active" : undefined}
            href={withManagerContext(item.href, managerSeasonId)}
            key={item.href}
          >
            <span aria-hidden="true">{getTeamNavigationIcon(item.label)}</span>
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}

function withManagerContext(href: string, managerSeasonId?: string | null) {
  if (!managerSeasonId) {
    return href;
  }

  return `${href}?managerSeasonId=${encodeURIComponent(managerSeasonId)}`;
}

function getTeamNavigationIcon(label: string) {
  switch (label) {
    case "Übersicht":
      return "▦";
    case "Profil":
      return "◉";
    case "Kader":
      return "👥";
    case "Transfers":
      return "↗";
    case "Spiele":
      return "🎯";
    case "Historie":
      return "◷";
    default:
      return "•";
  }
}

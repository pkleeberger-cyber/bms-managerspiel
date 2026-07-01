"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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

export function TeamSideNavigation() {
  const pathname = usePathname();

  return (
    <nav className="team-side-navigation" aria-label="Mein Team Navigation">
      <span>Mein Team</span>
      <div>
        {teamNavigation.map((item) => (
          <Link
            className={isActive(pathname, item.href) ? "active" : undefined}
            href={item.href}
            key={item.href}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}

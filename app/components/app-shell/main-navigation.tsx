"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { mainNavigation } from "@/components/app-shell/navigation-config";

function isActive(pathname: string, href: string): boolean {
  if (href === "/" || href === "/team/overview") {
    return pathname === "/" || pathname.startsWith("/team");
  }

  if (href.startsWith("/competitions")) {
    return pathname.startsWith("/competitions");
  }

  return pathname.startsWith(href);
}

export function MainNavigation() {
  const pathname = usePathname();

  return (
    <nav className="main-navigation" aria-label="Hauptnavigation">
      <div className="navigation-inner">
        {mainNavigation.map((item) => (
          <Link
            className={isActive(pathname, item.href) ? "active" : ""}
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

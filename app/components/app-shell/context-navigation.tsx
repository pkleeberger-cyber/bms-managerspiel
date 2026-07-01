"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  competitionNavigation,
  teamNavigation,
  type NavigationItem,
} from "@/components/app-shell/navigation-config";

function getContext(pathname: string): {
  title: string;
  items: NavigationItem[];
} {
  if (pathname.startsWith("/competitions")) {
    return { title: "Wettbewerbe", items: competitionNavigation };
  }

  if (pathname === "/" || pathname.startsWith("/team")) {
    return { title: "Mein Team", items: teamNavigation };
  }

  if (pathname.startsWith("/news")) {
    return { title: "News", items: [] };
  }

  if (pathname.startsWith("/forum")) {
    return { title: "Forum", items: [] };
  }

  return { title: "Administration", items: [] };
}

export function ContextNavigation() {
  const pathname = usePathname();
  const context = getContext(pathname);

  if (pathname === "/" || pathname.startsWith("/team")) {
    return null;
  }

  return (
    <nav className="context-navigation" aria-label={`${context.title} Navigation`}>
      <div className="context-inner">
        <span className="context-title">{context.title}</span>
        {context.items.length > 0 ? (
          <div className="context-links">
            {context.items.map((item) => (
              <Link
                className={pathname === item.href ? "active" : ""}
                href={item.href}
                key={item.href}
              >
                {item.label}
              </Link>
            ))}
          </div>
        ) : (
          <span className="context-placeholder">Bereichsübersicht</span>
        )}
      </div>
    </nav>
  );
}

"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

import { AdminContext } from "@/components/admin-shell/admin-context";
import { AdminHeader } from "@/components/admin-shell/admin-header";
import type { AdminHeaderContext } from "@/components/admin-shell/admin-header";
import { AdminNavigation } from "@/components/admin-shell/admin-navigation";

const defaultAdminContext: AdminHeaderContext = {
  activeCompetition: "Erste Liga",
  currentMatchday: "1",
  currentSeason: "2026/27",
  currentUser: "Office Admin",
  databaseStatus: "Datenbank aktiv",
};

export function AdminShell({
  children,
  context = defaultAdminContext,
}: {
  children: ReactNode;
  context?: AdminHeaderContext;
}) {
  const pathname = usePathname();
  const isFullWidthWorkspace =
    pathname === "/admin/matchday" ||
    pathname === "/admin/matchday/calculate" ||
    pathname === "/admin/matchday/data-entry" ||
    pathname === "/admin/matchday/review";

  return (
    <section className="admin-office-shell">
      <AdminNavigation />
      <div className="admin-office-main">
        <AdminHeader context={context} />
        <div
          className={
            isFullWidthWorkspace
              ? "admin-office-workspace full-width"
              : "admin-office-workspace"
          }
        >
          <div className="admin-office-content">{children}</div>
          {isFullWidthWorkspace ? null : <AdminContext />}
        </div>
      </div>
    </section>
  );
}

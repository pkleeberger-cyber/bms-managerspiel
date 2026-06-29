import type { ReactNode } from "react";

import { ContextNavigation } from "@/components/app-shell/context-navigation";
import { MainNavigation } from "@/components/app-shell/main-navigation";
import { ManagerHeader } from "@/components/app-shell/manager-header";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell">
      <ManagerHeader />
      <MainNavigation />
      <ContextNavigation />
      <main className="content-area">{children}</main>
      <footer className="app-footer">
        <span>BMS Managerspiel</span>
        <span>Saison 2026/27</span>
      </footer>
    </div>
  );
}

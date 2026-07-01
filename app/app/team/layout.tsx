import type { ReactNode } from "react";

import { TeamSideNavigation } from "@/components/app-shell/team-side-navigation";

export default function TeamLayout({ children }: { children: ReactNode }) {
  return (
    <div className="team-content-layout">
      <TeamSideNavigation />
      {children}
    </div>
  );
}

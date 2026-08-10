import type { ReactNode } from "react";
import { Suspense } from "react";

import { loadManagerContext } from "@/application/manager-context-service";
import { TeamManagerContext } from "@/components/app-shell/team-manager-context";

export default async function TeamLayout({ children }: { children: ReactNode }) {
  const managerContext = await loadManagerContext();

  return (
    <Suspense fallback={<TeamLayoutFallback>{children}</TeamLayoutFallback>}>
      <TeamManagerContext managerContext={managerContext}>
        {children}
      </TeamManagerContext>
    </Suspense>
  );
}

function TeamLayoutFallback({ children }: { children: ReactNode }) {
  return (
    <div className="team-content-layout">
      <div />
      <div className="team-shell-content">{children}</div>
    </div>
  );
}

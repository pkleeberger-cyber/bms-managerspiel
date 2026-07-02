import { loadCurrentMatchdayLifecycle } from "@/application/matchday-operations-service";
import type { MatchdayLifecycleStatus } from "@/domain/matchday-lifecycle";

import { MatchdayReleaseCenter } from "./release-center";

export const dynamic = "force-dynamic";

const lifecycleStatusLabels: Record<MatchdayLifecycleStatus, string> = {
  DRAFT: "Entwurf",
  DATA_ENTRY_OPEN: "Datenerfassung geöffnet",
  DATA_ENTRY_COMPLETE: "Datenerfassung abgeschlossen",
  CALCULATED: "Berechnet",
  PUBLISHED_PRELIMINARY: "Vorläufig veröffentlicht",
  REOPENED: "Erneut geöffnet",
  PUBLISHED_OFFICIAL: "Offiziell abgeschlossen",
  ARCHIVED: "Archiviert",
};

export default async function MatchdayReleaseCenterPage() {
  const { lifecycle } = await loadCurrentMatchdayLifecycle();

  return (
    <MatchdayReleaseCenter
      competitionName={lifecycle.competitionName}
      lifecycleStatus={lifecycleStatusLabels[lifecycle.currentStatus]}
      matchday={lifecycle.matchday}
      seasonName={lifecycle.seasonName}
      versionNumber={lifecycle.currentVersion.versionNumber}
    />
  );
}

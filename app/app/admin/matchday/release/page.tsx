import type { MatchdayLifecycleStatus } from "@/domain/matchday-lifecycle";
import {
  loadMatchdayWorkflow,
  parseMatchdayParam,
} from "@/application/matchday-workflow-service";
import { loadMatchdayLineupPreflight } from "@/application/matchday-lineup-preflight-service";

import { MatchdayReleaseCenter } from "./release-center";

export const dynamic = "force-dynamic";

type ReleasePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const lifecycleStatusLabels: Record<MatchdayLifecycleStatus, string> = {
  DRAFT: "Entwurf",
  DATA_ENTRY_OPEN: "Datenerfassung geöffnet",
  DATA_ENTERED: "Daten erfasst",
  DATA_ENTRY_COMPLETE: "Datenerfassung abgeschlossen",
  CALCULATED: "Berechnet",
  PRELIMINARY_PUBLISHED: "Vorläufig veröffentlicht",
  PUBLISHED_PRELIMINARY: "Vorläufig veröffentlicht",
  MANUAL_REVIEW_CONFIRMED: "Malusprüfung bestätigt",
  CORRECTIONS_CONFIRMED: "Korrekturen bestätigt",
  OFFICIALLY_CLOSED: "Offiziell abgeschlossen",
  REOPENED: "Erneut geöffnet",
  PUBLISHED_OFFICIAL: "Offiziell abgeschlossen",
  ARCHIVED: "Archiviert",
};

export default async function MatchdayReleaseCenterPage({
  searchParams,
}: ReleasePageProps) {
  const params = await searchParams;
  const selectedMatchday = parseMatchdayParam(params?.matchday);
  const [workflow, lineupPreflight] = await Promise.all([
    loadMatchdayWorkflow(selectedMatchday),
    loadMatchdayLineupPreflight(selectedMatchday),
  ]);

  return (
    <MatchdayReleaseCenter
      competitionName={workflow.competitionName}
      lifecycleStatus={
        workflow.selectedStatus === "SCHEDULED"
          ? "Geplant"
          : lifecycleStatusLabels[workflow.selectedStatus]
      }
      matchday={workflow.selectedMatchday}
      seasonName={workflow.seasonName}
      openWarningCount={lineupPreflight.missingSlotCount}
      versionNumber={workflow.metrics.resultCount}
    />
  );
}

import {
  createCorrectionPropagationPlan,
  createMatchdayVersion,
  getLatestPublishedMatchdayVersion,
} from "./matchday-lifecycle";
import type {
  MatchdayLifecycleStatus,
  MatchdayVersion,
  OperationalMatchdayLifecycleSnapshot,
} from "./types";

const seasonId = "season-2026-27";
const competitionId = "erste-liga-2026-27";
const matchday = 17;

export const preliminaryMatchdayVersion = createMatchdayVersion({
  id: "md17-v1-preliminary",
  seasonId,
  competitionId,
  matchday,
  status: "PUBLISHED_PRELIMINARY",
  createdAt: "2027-01-18T09:23:00.000Z",
  createdBy: "admin:league-office",
  reason: "Preliminary publication after first calculation cycle.",
  calculationSnapshotJson: {
    source: "official-matchday-processor",
    managerEvaluations: 612,
    fixturesCalculated: 306,
    ruleCandidates: 43,
  },
  publishedAt: "2027-01-18T09:30:00.000Z",
});

export const reopenedCorrectionStatus: MatchdayLifecycleStatus = "REOPENED";

export const correctedOfficialMatchdayVersion = createMatchdayVersion({
  id: "md17-v2-corrected-official",
  seasonId,
  competitionId,
  matchday,
  status: "PUBLISHED_OFFICIAL",
  previousVersions: [preliminaryMatchdayVersion],
  createdAt: "2027-01-18T12:44:00.000Z",
  createdBy: "admin:league-office",
  reason:
    "Kicker source correction for one real-player event after preliminary publication.",
  calculationSnapshotJson: {
    source: "official-matchday-processor",
    correctionStartMatchday: 17,
    managerEvaluations: 612,
    fixturesCalculated: 306,
    ruleCandidates: 43,
  },
  publishedAt: "2027-01-18T12:55:00.000Z",
});

export const matchday17Versions: readonly MatchdayVersion[] = [
  preliminaryMatchdayVersion,
  correctedOfficialMatchdayVersion,
];

export const visibleMatchday17Version =
  getLatestPublishedMatchdayVersion(matchday17Versions);

export const matchday17CorrectionPropagationPlan =
  createCorrectionPropagationPlan({
    seasonId,
    competitionId,
    correctionStartMatchday: 17,
    finalMatchday: 34,
    reason:
      "A correction to matchday 17 affects all downstream tables, events, history and current standings.",
  });

export const matchdayLifecycleFixture = {
  seasonId,
  competitionId,
  matchday,
  preliminaryMatchdayVersion,
  reopenedCorrectionStatus,
  correctedOfficialMatchdayVersion,
  visibleMatchday17Version,
  correctionPropagationPlan: matchday17CorrectionPropagationPlan,
} as const;

export const operationalMatchdayLifecycleFixture: OperationalMatchdayLifecycleSnapshot = {
  seasonName: "2026/27",
  competitionName: "Erste Liga",
  matchday,
  currentStatus: reopenedCorrectionStatus,
  currentVersion: correctedOfficialMatchdayVersion,
  versions: matchday17Versions,
  versionHistory: [
    {
      versionNumber: 1,
      title: "Erstberechnung",
      status: "CALCULATED",
      createdAt: "2027-01-18T09:23:00.000Z",
      reason: "Engine calculation completed.",
    },
    {
      versionNumber: 1,
      title: "Vorläufig veröffentlicht",
      status: "PUBLISHED_PRELIMINARY",
      createdAt: "2027-01-18T09:30:00.000Z",
      reason: "Managers can see preliminary matchday results.",
    },
    {
      versionNumber: 2,
      title: "Notenkorrektur",
      status: "PUBLISHED_OFFICIAL",
      createdAt: "2027-01-18T12:55:00.000Z",
      reason: "Corrected source data published as new official version.",
    },
    {
      versionNumber: 2,
      title: "Zur Korrektur geöffnet",
      status: "REOPENED",
      createdAt: "2027-01-18T13:20:00.000Z",
      reason: "Additional admin correction pending before republishing.",
    },
  ],
  lastCalculationAt: "2027-01-18T12:44:00.000Z",
  lastPublishedAt: "2027-01-18T12:55:00.000Z",
  correctionPending: true,
  correctionReason: "Zusätzliche Admin-Korrektur vor erneuter Veröffentlichung.",
  correctionPropagationPlan: matchday17CorrectionPropagationPlan,
};

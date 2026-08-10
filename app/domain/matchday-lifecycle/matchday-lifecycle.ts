import type {
  CorrectionPropagationInput,
  CorrectionPropagationPlan,
  CreateMatchdayVersionInput,
  MatchdayLifecycleStatus,
  MatchdayLifecycleTransition,
  MatchdayLifecycleTransitionReason,
  MatchdayLifecycleValidationIssue,
  MatchdayVersion,
} from "./types";

export class MatchdayLifecycleError extends Error {
  constructor(readonly issues: readonly MatchdayLifecycleValidationIssue[]) {
    super(issues.map((issue) => issue.message).join("; "));
    this.name = "MatchdayLifecycleError";
  }
}

export const matchdayLifecycleTransitions: readonly MatchdayLifecycleTransition[] = [
  {
    from: "DRAFT",
    to: "DATA_ENTRY_OPEN",
    reason: "OPEN_DATA_ENTRY",
    requiresVersion: false,
  },
  {
    from: "DATA_ENTRY_OPEN",
    to: "DATA_ENTERED",
    reason: "COMPLETE_DATA_ENTRY",
    requiresVersion: false,
  },
  {
    from: "DATA_ENTERED",
    to: "CALCULATED",
    reason: "CALCULATION_COMPLETED",
    requiresVersion: true,
  },
  {
    from: "DATA_ENTRY_COMPLETE",
    to: "CALCULATED",
    reason: "CALCULATION_COMPLETED",
    requiresVersion: true,
  },
  {
    from: "CALCULATED",
    to: "PRELIMINARY_PUBLISHED",
    reason: "PRELIMINARY_PUBLICATION",
    requiresVersion: true,
  },
  {
    from: "PRELIMINARY_PUBLISHED",
    to: "MANUAL_REVIEW_CONFIRMED",
    reason: "ADMIN_CORRECTION",
    requiresVersion: false,
  },
  {
    from: "MANUAL_REVIEW_CONFIRMED",
    to: "CORRECTIONS_CONFIRMED",
    reason: "ADMIN_CORRECTION",
    requiresVersion: false,
  },
  {
    from: "CORRECTIONS_CONFIRMED",
    to: "OFFICIALLY_CLOSED",
    reason: "OFFICIAL_PUBLICATION",
    requiresVersion: true,
  },
  {
    from: "OFFICIALLY_CLOSED",
    to: "ARCHIVED",
    reason: "SEASON_ARCHIVAL",
    requiresVersion: false,
  },
  {
    from: "PUBLISHED_PRELIMINARY",
    to: "REOPENED",
    reason: "CORRECTION_REOPENED",
    requiresVersion: false,
  },
  {
    from: "REOPENED",
    to: "DATA_ENTRY_OPEN",
    reason: "OPEN_DATA_ENTRY",
    requiresVersion: false,
  },
  {
    from: "REOPENED",
    to: "DATA_ENTRY_COMPLETE",
    reason: "COMPLETE_DATA_ENTRY",
    requiresVersion: false,
  },
  {
    from: "REOPENED",
    to: "CALCULATED",
    reason: "CALCULATION_COMPLETED",
    requiresVersion: true,
  },
  {
    from: "CALCULATED",
    to: "PUBLISHED_OFFICIAL",
    reason: "OFFICIAL_PUBLICATION",
    requiresVersion: true,
  },
  {
    from: "PUBLISHED_PRELIMINARY",
    to: "PUBLISHED_OFFICIAL",
    reason: "OFFICIAL_PUBLICATION",
    requiresVersion: true,
  },
  {
    from: "PUBLISHED_OFFICIAL",
    to: "REOPENED",
    reason: "ADMIN_CORRECTION",
    requiresVersion: false,
  },
  {
    from: "PUBLISHED_OFFICIAL",
    to: "ARCHIVED",
    reason: "SEASON_ARCHIVAL",
    requiresVersion: false,
  },
];

export function getAllowedMatchdayTransitions(
  from: MatchdayLifecycleStatus,
): readonly MatchdayLifecycleTransition[] {
  return matchdayLifecycleTransitions.filter(
    (transition) => transition.from === from,
  );
}

export function canTransitionMatchdayStatus(
  from: MatchdayLifecycleStatus,
  to: MatchdayLifecycleStatus,
): boolean {
  return matchdayLifecycleTransitions.some(
    (transition) => transition.from === from && transition.to === to,
  );
}

export function getMatchdayTransitionReason(
  from: MatchdayLifecycleStatus,
  to: MatchdayLifecycleStatus,
): MatchdayLifecycleTransitionReason | null {
  return (
    matchdayLifecycleTransitions.find(
      (transition) => transition.from === from && transition.to === to,
    )?.reason ?? null
  );
}

export function assertMatchdayStatusTransition(
  from: MatchdayLifecycleStatus,
  to: MatchdayLifecycleStatus,
): void {
  if (canTransitionMatchdayStatus(from, to)) {
    return;
  }

  throw new MatchdayLifecycleError([
    {
      code: "INVALID_STATUS_TRANSITION",
      message: `Cannot transition matchday lifecycle from ${from} to ${to}.`,
      from,
      to,
    },
  ]);
}

export function createMatchdayVersion(
  input: CreateMatchdayVersionInput,
): MatchdayVersion {
  const previousHighestVersion =
    input.previousVersions?.reduce(
      (highest, version) => Math.max(highest, version.versionNumber),
      0,
    ) ?? 0;

  return {
    id: input.id,
    seasonId: input.seasonId,
    competitionId: input.competitionId,
    matchday: input.matchday,
    versionNumber: previousHighestVersion + 1,
    status: input.status,
    createdAt: input.createdAt,
    createdBy: input.createdBy,
    reason: input.reason,
    calculationSnapshotJson: input.calculationSnapshotJson,
    publishedAt: input.publishedAt,
  };
}

export function getLatestPublishedMatchdayVersion(
  versions: readonly MatchdayVersion[],
): MatchdayVersion | null {
  const publishedVersions = versions.filter((version) =>
    isVisiblePublishedStatus(version.status),
  );

  if (publishedVersions.length === 0) {
    return null;
  }

  return publishedVersions.reduce((latest, version) =>
    version.versionNumber > latest.versionNumber ? version : latest,
  );
}

export function isVisiblePublishedStatus(
  status: MatchdayLifecycleStatus,
): boolean {
  return (
    status === "PRELIMINARY_PUBLISHED" ||
    status === "PUBLISHED_PRELIMINARY" ||
    status === "MANUAL_REVIEW_CONFIRMED" ||
    status === "CORRECTIONS_CONFIRMED" ||
    status === "OFFICIALLY_CLOSED" ||
    status === "PUBLISHED_OFFICIAL" ||
    status === "ARCHIVED"
  );
}

export function createCorrectionPropagationPlan(
  input: CorrectionPropagationInput,
): CorrectionPropagationPlan {
  if (
    !Number.isInteger(input.correctionStartMatchday) ||
    !Number.isInteger(input.finalMatchday) ||
    input.correctionStartMatchday < 1 ||
    input.finalMatchday < input.correctionStartMatchday
  ) {
    throw new MatchdayLifecycleError([
      {
        code: "INVALID_MATCHDAY_RANGE",
        message:
          "Correction propagation requires an integer start matchday and a final matchday greater than or equal to it.",
      },
    ]);
  }

  return {
    seasonId: input.seasonId,
    competitionId: input.competitionId,
    correctionStartMatchday: input.correctionStartMatchday,
    affectedMatchdays: createMatchdayRange(
      input.correctionStartMatchday,
      input.finalMatchday,
    ),
    requiresTableRebuild: true,
    requiresEventRebuild: true,
    requiresHistoryRebuild: true,
    reason: input.reason,
  };
}

function createMatchdayRange(startMatchday: number, finalMatchday: number) {
  return Array.from(
    { length: finalMatchday - startMatchday + 1 },
    (_, index) => startMatchday + index,
  );
}

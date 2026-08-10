export type MatchdayLifecycleStatus =
  | "DRAFT"
  | "DATA_ENTRY_OPEN"
  | "DATA_ENTERED"
  | "DATA_ENTRY_COMPLETE"
  | "CALCULATED"
  | "PRELIMINARY_PUBLISHED"
  | "PUBLISHED_PRELIMINARY"
  | "MANUAL_REVIEW_CONFIRMED"
  | "CORRECTIONS_CONFIRMED"
  | "OFFICIALLY_CLOSED"
  | "REOPENED"
  | "PUBLISHED_OFFICIAL"
  | "ARCHIVED";

export type MatchdayLifecycleTransitionReason =
  | "INITIAL_SETUP"
  | "OPEN_DATA_ENTRY"
  | "COMPLETE_DATA_ENTRY"
  | "CALCULATION_COMPLETED"
  | "PRELIMINARY_PUBLICATION"
  | "CORRECTION_REOPENED"
  | "OFFICIAL_PUBLICATION"
  | "SEASON_ARCHIVAL"
  | "ADMIN_CORRECTION";

export type MatchdayLifecycleTransition = {
  from: MatchdayLifecycleStatus;
  to: MatchdayLifecycleStatus;
  reason: MatchdayLifecycleTransitionReason;
  requiresVersion: boolean;
};

export type JsonPrimitive = string | number | boolean | null;

export type JsonValue =
  | JsonPrimitive
  | { readonly [key: string]: JsonValue }
  | readonly JsonValue[];

export type MatchdayVersion = {
  id: string;
  seasonId: string;
  competitionId: string;
  matchday: number;
  versionNumber: number;
  status: MatchdayLifecycleStatus;
  createdAt: string;
  createdBy?: string;
  reason?: string;
  calculationSnapshotJson?: JsonValue;
  publishedAt?: string;
};

export type CreateMatchdayVersionInput = {
  id: string;
  seasonId: string;
  competitionId: string;
  matchday: number;
  status: MatchdayLifecycleStatus;
  createdAt: string;
  previousVersions?: readonly MatchdayVersion[];
  createdBy?: string;
  reason?: string;
  calculationSnapshotJson?: JsonValue;
  publishedAt?: string;
};

export type CorrectionPropagationInput = {
  seasonId: string;
  competitionId: string;
  correctionStartMatchday: number;
  finalMatchday: number;
  reason: string;
};

export type CorrectionPropagationPlan = {
  seasonId: string;
  competitionId: string;
  correctionStartMatchday: number;
  affectedMatchdays: readonly number[];
  requiresTableRebuild: true;
  requiresEventRebuild: true;
  requiresHistoryRebuild: true;
  reason: string;
};

export type MatchdayLifecycleErrorCode =
  | "INVALID_STATUS_TRANSITION"
  | "INVALID_MATCHDAY_RANGE";

export type MatchdayLifecycleValidationIssue = {
  code: MatchdayLifecycleErrorCode;
  message: string;
  from?: MatchdayLifecycleStatus;
  to?: MatchdayLifecycleStatus;
};

export type MatchdayVersionHistoryEntry = {
  versionNumber: number;
  title: string;
  status: MatchdayLifecycleStatus;
  createdAt: string;
  reason: string;
};

export type OperationalMatchdayLifecycleSnapshot = {
  seasonName: string;
  competitionName: string;
  matchday: number;
  currentStatus: MatchdayLifecycleStatus;
  currentVersion: MatchdayVersion;
  versions: readonly MatchdayVersion[];
  versionHistory: readonly MatchdayVersionHistoryEntry[];
  lastCalculationAt?: string;
  lastPublishedAt?: string;
  correctionPending: boolean;
  correctionReason?: string;
  correctionPropagationPlan?: CorrectionPropagationPlan;
};

import type {
  CompetitionLifecycleAction,
  CompetitionLifecycleSnapshot,
  CompetitionLifecycleStatus,
  CompetitionLifecycleTimelineEntry,
  CompetitionType,
} from "./types";

export const competitionLifecycleStatusOrder = {
  LEAGUE_1: [
    "CREATED",
    "PARTICIPANTS_CONFIRMED",
    "FIXTURE_GENERATED",
    "READY",
    "ACTIVE",
    "COMPLETED",
  ],
  LEAGUE_2: [
    "CREATED",
    "PARTICIPANTS_CONFIRMED",
    "FIXTURE_GENERATED",
    "READY",
    "ACTIVE",
    "COMPLETED",
  ],
  CUP: ["CREATED", "DRAW_REQUIRED", "ROUND_READY", "ACTIVE", "COMPLETED"],
  EUROPE: [
    "CREATED",
    "PARTICIPANTS_REQUIRED",
    "LEAGUE_PHASE_READY",
    "ACTIVE",
    "KNOCKOUT_READY",
    "COMPLETED",
  ],
  SUPERCUP: [
    "CREATED",
    "PARTICIPANTS_REQUIRED",
    "FIXTURE_READY",
    "READY",
    "COMPLETED",
  ],
} as const satisfies Record<
  CompetitionType,
  readonly CompetitionLifecycleStatus[]
>;

const availableActionsByStatus: Record<
  CompetitionType,
  Partial<Record<CompetitionLifecycleStatus, readonly CompetitionLifecycleAction[]>>
> = {
  LEAGUE_1: {
    CREATED: ["CONFIRM_PARTICIPANTS"],
    PARTICIPANTS_CONFIRMED: ["GENERATE_FIXTURE"],
    FIXTURE_GENERATED: ["MARK_READY"],
    READY: ["ACTIVATE_LEAGUE"],
    ACTIVE: ["COMPLETE_COMPETITION"],
    COMPLETED: [],
  },
  LEAGUE_2: {
    CREATED: ["CONFIRM_PARTICIPANTS"],
    PARTICIPANTS_CONFIRMED: ["GENERATE_FIXTURE"],
    FIXTURE_GENERATED: ["MARK_READY"],
    READY: ["ACTIVATE_LEAGUE"],
    ACTIVE: ["COMPLETE_COMPETITION"],
    COMPLETED: [],
  },
  CUP: {
    CREATED: ["RUN_DRAW"],
    DRAW_REQUIRED: ["RUN_DRAW"],
    ROUND_READY: ["ACTIVATE_CUP", "GENERATE_NEXT_ROUND"],
    ACTIVE: ["GENERATE_NEXT_ROUND", "COMPLETE_COMPETITION"],
    COMPLETED: [],
  },
  EUROPE: {
    CREATED: ["GENERATE_EUROPE_PARTICIPANTS"],
    PARTICIPANTS_REQUIRED: ["GENERATE_EUROPE_PARTICIPANTS"],
    LEAGUE_PHASE_READY: ["START_LEAGUE_PHASE"],
    ACTIVE: ["PREPARE_KNOCKOUT"],
    KNOCKOUT_READY: ["COMPLETE_COMPETITION"],
    COMPLETED: [],
  },
  SUPERCUP: {
    CREATED: ["CONFIRM_PARTICIPANTS"],
    PARTICIPANTS_REQUIRED: ["GENERATE_SUPERCUP_FIXTURE"],
    FIXTURE_READY: ["MARK_READY"],
    READY: ["COMPLETE_COMPETITION"],
    COMPLETED: [],
  },
};

const completedActionsByStatus: Record<
  CompetitionType,
  Partial<Record<CompetitionLifecycleStatus, readonly CompetitionLifecycleAction[]>>
> = {
  LEAGUE_1: {
    CREATED: [],
    PARTICIPANTS_CONFIRMED: ["CONFIRM_PARTICIPANTS"],
    FIXTURE_GENERATED: ["CONFIRM_PARTICIPANTS", "GENERATE_FIXTURE"],
    READY: ["CONFIRM_PARTICIPANTS", "GENERATE_FIXTURE", "MARK_READY"],
    ACTIVE: [
      "CONFIRM_PARTICIPANTS",
      "GENERATE_FIXTURE",
      "MARK_READY",
      "ACTIVATE_LEAGUE",
    ],
    COMPLETED: [
      "CONFIRM_PARTICIPANTS",
      "GENERATE_FIXTURE",
      "MARK_READY",
      "ACTIVATE_LEAGUE",
      "COMPLETE_COMPETITION",
    ],
  },
  LEAGUE_2: {
    CREATED: [],
    PARTICIPANTS_CONFIRMED: ["CONFIRM_PARTICIPANTS"],
    FIXTURE_GENERATED: ["CONFIRM_PARTICIPANTS", "GENERATE_FIXTURE"],
    READY: ["CONFIRM_PARTICIPANTS", "GENERATE_FIXTURE", "MARK_READY"],
    ACTIVE: [
      "CONFIRM_PARTICIPANTS",
      "GENERATE_FIXTURE",
      "MARK_READY",
      "ACTIVATE_LEAGUE",
    ],
    COMPLETED: [
      "CONFIRM_PARTICIPANTS",
      "GENERATE_FIXTURE",
      "MARK_READY",
      "ACTIVATE_LEAGUE",
      "COMPLETE_COMPETITION",
    ],
  },
  CUP: {
    CREATED: [],
    DRAW_REQUIRED: [],
    ROUND_READY: ["RUN_DRAW"],
    ACTIVE: ["RUN_DRAW", "ACTIVATE_CUP"],
    COMPLETED: ["RUN_DRAW", "ACTIVATE_CUP", "COMPLETE_COMPETITION"],
  },
  EUROPE: {
    CREATED: [],
    PARTICIPANTS_REQUIRED: [],
    LEAGUE_PHASE_READY: ["GENERATE_EUROPE_PARTICIPANTS"],
    ACTIVE: ["GENERATE_EUROPE_PARTICIPANTS", "START_LEAGUE_PHASE"],
    KNOCKOUT_READY: [
      "GENERATE_EUROPE_PARTICIPANTS",
      "START_LEAGUE_PHASE",
      "PREPARE_KNOCKOUT",
    ],
    COMPLETED: [
      "GENERATE_EUROPE_PARTICIPANTS",
      "START_LEAGUE_PHASE",
      "PREPARE_KNOCKOUT",
      "COMPLETE_COMPETITION",
    ],
  },
  SUPERCUP: {
    CREATED: [],
    PARTICIPANTS_REQUIRED: [],
    FIXTURE_READY: ["GENERATE_SUPERCUP_FIXTURE"],
    READY: ["GENERATE_SUPERCUP_FIXTURE", "MARK_READY"],
    COMPLETED: [
      "GENERATE_SUPERCUP_FIXTURE",
      "MARK_READY",
      "COMPLETE_COMPETITION",
    ],
  },
};

export function getCompetitionLifecycleProgressPercent(
  competitionType: CompetitionType,
  status: CompetitionLifecycleStatus,
): number {
  const statusOrder: readonly CompetitionLifecycleStatus[] =
    competitionLifecycleStatusOrder[competitionType];
  const statusIndex = statusOrder.indexOf(status);

  if (statusIndex < 0) {
    return 0;
  }

  return Math.round((statusIndex / (statusOrder.length - 1)) * 100);
}

export function getAvailableCompetitionLifecycleActions(
  competitionType: CompetitionType,
  status: CompetitionLifecycleStatus,
): readonly CompetitionLifecycleAction[] {
  return availableActionsByStatus[competitionType][status] ?? [];
}

export function getCompletedCompetitionLifecycleActions(
  competitionType: CompetitionType,
  status: CompetitionLifecycleStatus,
): readonly CompetitionLifecycleAction[] {
  return completedActionsByStatus[competitionType][status] ?? [];
}

export function getNextRecommendedCompetitionLifecycleAction(
  competitionType: CompetitionType,
  status: CompetitionLifecycleStatus,
): CompetitionLifecycleAction | null {
  return getAvailableCompetitionLifecycleActions(competitionType, status)[0] ?? null;
}

export function createCompetitionLifecycleSnapshot(input: {
  competitionId: string;
  competitionType: CompetitionType;
  status: CompetitionLifecycleStatus;
  timelineEntries: readonly CompetitionLifecycleTimelineEntry[];
}): CompetitionLifecycleSnapshot {
  return {
    competitionId: input.competitionId,
    competitionType: input.competitionType,
    status: input.status,
    progressPercent: getCompetitionLifecycleProgressPercent(
      input.competitionType,
      input.status,
    ),
    availableActions: getAvailableCompetitionLifecycleActions(
      input.competitionType,
      input.status,
    ),
    completedActions: getCompletedCompetitionLifecycleActions(
      input.competitionType,
      input.status,
    ),
    nextRecommendedAction: getNextRecommendedCompetitionLifecycleAction(
      input.competitionType,
      input.status,
    ),
    timelineEntries: input.timelineEntries,
  };
}

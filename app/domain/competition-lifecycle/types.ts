export type CompetitionType =
  | "LEAGUE_1"
  | "LEAGUE_2"
  | "CUP"
  | "EUROPE"
  | "SUPERCUP";

export type LeagueCompetitionLifecycleStatus =
  | "CREATED"
  | "PARTICIPANTS_CONFIRMED"
  | "FIXTURE_GENERATED"
  | "READY"
  | "ACTIVE"
  | "COMPLETED";

export type CupCompetitionLifecycleStatus =
  | "CREATED"
  | "DRAW_REQUIRED"
  | "ROUND_READY"
  | "ACTIVE"
  | "COMPLETED";

export type EuropeCompetitionLifecycleStatus =
  | "CREATED"
  | "PARTICIPANTS_REQUIRED"
  | "LEAGUE_PHASE_READY"
  | "ACTIVE"
  | "KNOCKOUT_READY"
  | "COMPLETED";

export type SupercupCompetitionLifecycleStatus =
  | "CREATED"
  | "PARTICIPANTS_REQUIRED"
  | "FIXTURE_READY"
  | "READY"
  | "COMPLETED";

export type CompetitionLifecycleStatus =
  | LeagueCompetitionLifecycleStatus
  | CupCompetitionLifecycleStatus
  | EuropeCompetitionLifecycleStatus
  | SupercupCompetitionLifecycleStatus;

export type CompetitionLifecycleAction =
  | "CONFIRM_PARTICIPANTS"
  | "GENERATE_FIXTURE"
  | "MARK_READY"
  | "ACTIVATE_LEAGUE"
  | "RUN_DRAW"
  | "GENERATE_NEXT_ROUND"
  | "ACTIVATE_CUP"
  | "GENERATE_EUROPE_PARTICIPANTS"
  | "START_LEAGUE_PHASE"
  | "PREPARE_KNOCKOUT"
  | "GENERATE_SUPERCUP_FIXTURE"
  | "COMPLETE_COMPETITION";

export type CompetitionLifecycleTimelineEntry = {
  time: string;
  action: string;
  user?: string;
  description: string;
};

export type CompetitionLifecycleSnapshot = {
  competitionId: string;
  competitionType: CompetitionType;
  status: CompetitionLifecycleStatus;
  progressPercent: number;
  availableActions: readonly CompetitionLifecycleAction[];
  completedActions: readonly CompetitionLifecycleAction[];
  nextRecommendedAction: CompetitionLifecycleAction | null;
  timelineEntries: readonly CompetitionLifecycleTimelineEntry[];
};

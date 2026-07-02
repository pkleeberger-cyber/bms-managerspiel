export type LineupId =
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | 8
  | 9
  | 10
  | 11
  | 12
  | 13
  | 14
  | 15
  | 16
  | 17
  | 18;

export type StarterLineupId = 1 | 3 | 4 | 5 | 8 | 9 | 10 | 11 | 12 | 15 | 16;

export type BackupLineupId = 2 | 6 | 7 | 13 | 14 | 17 | 18;

export type PlayerPosition = "goalkeeper" | "defender" | "midfielder" | "forward";

export type KickerRating =
  | 1
  | 1.5
  | 2
  | 2.5
  | 3
  | 3.5
  | 4
  | 4.5
  | 5
  | 5.5
  | 6;

type CompetitionScoringConfigBase = {
  competitionId: string;
  useKickerRatings: boolean;
  defaultRatingIfNoRating?: number;
  countAppearanceWithoutRating: boolean;
  goalsCountWithoutRating: boolean;
  teamOfWeekEnabled: boolean;
  yellowRedEnabled: boolean;
  redEnabled: boolean;
};

export type CompetitionScoringConfig = CompetitionScoringConfigBase & (
  | {
      phaseId: string;
      roundId?: never;
    }
  | {
      phaseId?: never;
      roundId: string;
    }
);

export type SquadAssignmentReason =
  | "INITIAL_SQUAD"
  | "REAL_TRANSFER_REPLACEMENT"
  | "WINTER_TRANSFER"
  | "ADMIN_CORRECTION";

export type ManagerSquadAssignment = {
  managerId: string;
  competitionId: string;
  playerId: string;
  playerName: string;
  slotId: LineupId;
  validFromMatchday: number;
  validToMatchday: number | null;
  reason: SquadAssignmentReason;
};

export type PlayerLineup = {
  lineupId: LineupId;
  playerId: string;
  playerName: string;
};

export type EffectiveSquad = {
  managerId: string;
  competitionId: string;
  matchday: number;
  players: PlayerLineup[];
};

export type ResolveEffectiveSquadInput = {
  managerId: string;
  competitionId: string;
  matchday: number;
  assignments: readonly ManagerSquadAssignment[];
};

export type PlayerMatchData = {
  playerId: string;
  kickerRating: number | null;
  goals: number;
  yellowRedCard: boolean;
  redCard: boolean;
  teamOfTheWeek: boolean;
};

export type TeamValidity = "VALID" | "INVALID";

export type ManagerMatchdayPenalty = {
  managerId: string;
  competitionId: string;
  validFromMatchday: number;
  validToMatchday: number | null;
  points: number;
  reason: string;
  affectedSlotId?: LineupId;
};

export type PlayerPointBreakdown = {
  rating: number;
  appearance: number;
  goals: number;
  cards: number;
  teamOfTheWeek: number;
};

export type CalculatedPlayer = {
  lineupId: LineupId;
  evaluatedForLineupId: StarterLineupId;
  playerId: string;
  playerName: string;
  position: PlayerPosition;
  kickerRating: KickerRating;
  usedAutomaticRating: boolean;
  wasReplacement: boolean;
  matchData: Omit<PlayerMatchData, "playerId" | "kickerRating">;
  points: PlayerPointBreakdown;
  totalPoints: number;
};

export type PositionTotals = Record<PlayerPosition, number>;

export type CalculatedTeam = {
  positionTotals: PositionTotals;
  playerPoints: number;
  manualPenaltyPoints: number;
  totalPoints: number;
};

export type LineupReplacement = {
  starterLineupId: StarterLineupId;
  replacementLineupId: BackupLineupId | null;
  position: PlayerPosition;
};

export type LineupStatistics = {
  bestPlayer: CalculatedPlayer | null;
  worstPlayer: CalculatedPlayer | null;
  strongestPositionGroup: PlayerPosition | null;
  weakestPositionGroup: PlayerPosition | null;
  startersReplaced: number;
  unevaluatedPositions: number;
};

type MatchLineupResultBase = {
  managerId: string;
  competitionId: string;
  matchday: number;
  teamValidity: TeamValidity;
  effectiveSquad: EffectiveSquad;
  appliedPenalties: ManagerMatchdayPenalty[];
};

export type CalculatedMatchLineupResult = MatchLineupResultBase & {
  calculationStatus: "CALCULATED";
  teamValidity: "VALID";
  evaluatedPlayers: CalculatedPlayer[];
  team: CalculatedTeam;
  replacements: LineupReplacement[];
  statistics: LineupStatistics;
};

export type InvalidMatchLineupResult = MatchLineupResultBase & {
  calculationStatus: "SKIPPED_INVALID_TEAM";
  teamValidity: "INVALID";
  evaluatedPlayers: [];
  team: null;
  replacements: [];
  statistics: null;
};

export type MatchLineupResult = CalculatedMatchLineupResult | InvalidMatchLineupResult;

export type CalculateMatchLineupInput = {
  managerId: string;
  competitionId: string;
  matchday: number;
  teamValidity: TeamValidity;
  assignments: readonly ManagerSquadAssignment[];
  matchData: readonly PlayerMatchData[];
  penalties?: readonly ManagerMatchdayPenalty[];
  scoringConfig?: CompetitionScoringConfig;
};

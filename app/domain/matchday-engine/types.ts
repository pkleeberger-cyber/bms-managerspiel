import type { BmsEvent } from "../../types/events";
import type {
  LeagueCompetitionConfig,
  LeagueContext,
  PreviousLeagueTableRow,
  UpdatedLeagueTable,
} from "../league-engine";
import type {
  CalculatedMatchLineupResult,
  CompetitionScoringConfig,
  ManagerMatchdayPenalty,
  ManagerSquadAssignment,
  PlayerMatchData,
  TeamValidity,
} from "../lineup-engine";
import type { MatchResult } from "../match-engine";
import type {
  BmsRule,
  OfficialMatchResult,
  RuleAuditEntry,
  RuleLogEntry,
} from "../rules-engine";

export type OfficialFixture = {
  fixtureId: string;
  homeManagerId: string;
  awayManagerId: string;
};

export type ManagerTeamValidity = {
  managerId: string;
  validity: TeamValidity;
};

export type MatchdayValidationCode =
  | "DUPLICATE_MATCH"
  | "MISSING_TEAM"
  | "MISSING_FIXTURE"
  | "DUPLICATE_MANAGER"
  | "DUPLICATE_SQUAD_SLOT"
  | "MISSING_LINEUP"
  | "MISSING_TEAM_VALIDITY"
  | "DUPLICATE_TEAM_VALIDITY"
  | "INVALID_TEAM_UNSUPPORTED"
  | "INVALID_TIMESTAMP";

export type MatchdayValidationIssue = {
  code: MatchdayValidationCode;
  message: string;
  managerId?: string;
  fixtureId?: string;
  slotId?: number;
};

export type ProcessMatchdayInput = {
  competition: LeagueCompetitionConfig;
  matchday: number;
  previousLeagueTable: readonly PreviousLeagueTableRow[];
  fixtures: readonly OfficialFixture[];
  squadAssignments: readonly ManagerSquadAssignment[];
  kickerMatchData: readonly PlayerMatchData[];
  manualPenalties: readonly ManagerMatchdayPenalty[];
  teamValidity: readonly ManagerTeamValidity[];
  calculationTimestamp: string;
  scoringConfig?: CompetitionScoringConfig;
};

export type CalculatedFixtureLineups = {
  fixtureId: string;
  homeTeam: CalculatedMatchLineupResult;
  awayTeam: CalculatedMatchLineupResult;
};

export type MatchdayResult = {
  competition: LeagueCompetitionConfig;
  matchday: number;
  calculatedLineups: CalculatedFixtureLineups[];
  matchResults: MatchResult[];
  updatedLeagueTable: UpdatedLeagueTable;
  leagueContext: LeagueContext;
  allEvents: BmsEvent[];
  heroEvent: BmsEvent | null;
  calculationTimestamp: string;
};

export type OfficialMatchdayValidationCode =
  | "INCOMPLETE_CALCULATED_MATCHDAY"
  | "BROKEN_AUDIT_CHAIN";

export type OfficialMatchdayValidationIssue = {
  code: OfficialMatchdayValidationCode;
  message: string;
  ruleId?: string;
  homeManagerId?: string;
  awayManagerId?: string;
};

export type ProcessOfficialMatchdayInput = ProcessMatchdayInput & {
  rules: readonly BmsRule[];
  publicationTimestamp: string;
};

export type OfficialMatchdayMetadata = {
  competitionId: string;
  matchday: number;
  calculationTimestamp: string;
  publicationTimestamp: string;
  calculatedMatchCount: number;
  officialMatchCount: number;
};

export type OfficialMatchdayResult = {
  calculatedMatchday: MatchdayResult;
  officialResults: OfficialMatchResult[];
  officialLeagueTable: UpdatedLeagueTable;
  officialLeagueContext: LeagueContext;
  officialEvents: BmsEvent[];
  heroEvent: BmsEvent | null;
  appliedRules: BmsRule[];
  ruleLog: RuleLogEntry[];
  auditTrail: RuleAuditEntry[];
  metadata: OfficialMatchdayMetadata;
};

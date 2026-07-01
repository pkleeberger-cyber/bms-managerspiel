import type {
  MatchOutcome,
  MatchResult,
  MatchTeamResult,
  MatchWinner,
} from "../match-engine";

export type RuleType =
  | "TEAM_INVALID"
  | "TEAM_PENALTY"
  | "POINT_ADJUSTMENT"
  | "MATCH_OVERRIDE"
  | "ADMIN_NOTE";

export type RuleBase = {
  id: string;
  type: RuleType;
  competitionId: string;
  validFromMatchday: number;
  validToMatchday: number | null;
  reason: string;
  createdAt: string;
  administrator?: string;
};

export type TeamInvalidRule = RuleBase & {
  type: "TEAM_INVALID";
  managerId: string;
  invalidFantasyGoals?: number;
};

export type TeamPenaltyRule = RuleBase & {
  type: "TEAM_PENALTY";
  managerId: string;
  points: number;
};

export type PointAdjustmentRule = RuleBase & {
  type: "POINT_ADJUSTMENT";
  managerId: string;
  points: number;
};

export type MatchOverrideRule = RuleBase & {
  type: "MATCH_OVERRIDE";
  homeManagerId: string;
  awayManagerId: string;
  homeFantasyGoals: number;
  awayFantasyGoals: number;
};

export type AdminNoteRule = RuleBase & {
  type: "ADMIN_NOTE";
  managerId?: string;
  homeManagerId?: string;
  awayManagerId?: string;
};

export type BmsRule =
  | TeamInvalidRule
  | TeamPenaltyRule
  | PointAdjustmentRule
  | MatchOverrideRule
  | AdminNoteRule;

export type CalculatedMatchdayResult = {
  competition: {
    id: string;
  };
  matchday: number;
  matchResults: readonly MatchResult[];
  calculationTimestamp: string;
};

export type OfficialScore = {
  home: number;
  away: number;
};

export type OfficialMatchResult = {
  calculatedResult: MatchResult;
  officialResult: MatchResult;
  calculatedGoals: OfficialScore;
  officialGoals: OfficialScore;
  outcome: MatchOutcome;
  winner: MatchWinner;
  leaguePoints: {
    home: 0 | 1 | 3;
    away: 0 | 1 | 3;
  };
  teams: {
    home: MatchTeamResult;
    away: MatchTeamResult;
  };
  appliedRuleIds: string[];
};

export type RuleLogStatus = "APPLIED" | "RECORDED";

export type RuleLogEntry = {
  ruleId: string;
  ruleType: RuleType;
  status: RuleLogStatus;
  reason: string;
  timestamp: string;
  administrator?: string;
  homeManagerId?: string;
  awayManagerId?: string;
};

export type RuleAuditEntry = {
  ruleId: string;
  ruleType: Exclude<RuleType, "ADMIN_NOTE">;
  homeManagerId: string;
  awayManagerId: string;
  oldValue: OfficialScore;
  newValue: OfficialScore;
  reason: string;
  timestamp: string;
  administrator?: string;
};

export type ApplyRulesInput = {
  calculatedMatchday: CalculatedMatchdayResult;
  rules: readonly BmsRule[];
  publicationTimestamp: string;
};

export type RulesEngineResult = {
  calculatedMatchday: CalculatedMatchdayResult;
  appliedRules: BmsRule[];
  officialResults: OfficialMatchResult[];
  ruleLog: RuleLogEntry[];
  auditTrail: RuleAuditEntry[];
  publicationTimestamp: string;
};

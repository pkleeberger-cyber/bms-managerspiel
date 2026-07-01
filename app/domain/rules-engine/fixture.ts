import { matchEngineFixtureResult } from "../match-engine/fixture";
import type { MatchResult } from "../match-engine";

import { applyRulesToMatchday } from "./rules-engine";
import type {
  BmsRule,
  CalculatedMatchdayResult,
} from "./types";

const competitionId = "historical-erste-liga";
const matchday = 34;
const calculationTimestamp = "2026-06-30T18:00:00.000Z";
const publicationTimestamp = "2026-06-30T18:15:00.000Z";

export const thomasCalculatedMatchResult: MatchResult = {
  ...matchEngineFixtureResult,
  competitionId,
  matchday,
  outcome: "AWAY_WIN",
  winner: {
    side: "AWAY",
    managerId: "manager-ben",
  },
  fantasyGoals: {
    home: 13,
    away: 28,
  },
  leaguePoints: {
    home: 0,
    away: 3,
  },
  teams: {
    home: {
      managerId: "manager-thomas",
      fantasyGoalsFor: 13,
      fantasyGoalsAgainst: 28,
      fantasyGoalDifference: -15,
      leaguePoints: 0,
    },
    away: {
      managerId: "manager-ben",
      fantasyGoalsFor: 28,
      fantasyGoalsAgainst: 13,
      fantasyGoalDifference: 15,
      leaguePoints: 3,
    },
  },
};

export const thomasCalculatedMatchdayFixture: CalculatedMatchdayResult = {
  competition: {
    id: competitionId,
  },
  matchday,
  matchResults: [thomasCalculatedMatchResult],
  calculationTimestamp,
};

export const thomasInvalidTeamRule: BmsRule = {
  id: "historical-thomas-invalid-team",
  type: "TEAM_INVALID",
  competitionId,
  validFromMatchday: matchday,
  validToMatchday: matchday,
  managerId: "manager-thomas",
  reason: "No valid team submitted for the official matchday",
  createdAt: publicationTimestamp,
  administrator: "historical-import",
};

const calculatedSnapshot = JSON.stringify(thomasCalculatedMatchdayFixture);

export const thomasOfficialMatchdayFixture = applyRulesToMatchday({
  calculatedMatchday: thomasCalculatedMatchdayFixture,
  rules: [thomasInvalidTeamRule],
  publicationTimestamp,
});

const thomasOfficialResult = thomasOfficialMatchdayFixture.officialResults[0];
const thomasAudit = thomasOfficialMatchdayFixture.auditTrail[0];

const genericRulesFixture = [
  {
    id: "temporary-team-penalty",
    type: "TEAM_PENALTY",
    competitionId,
    validFromMatchday: matchday,
    validToMatchday: matchday,
    managerId: "manager-thomas",
    points: -2,
    reason: "Temporary administrative penalty",
    createdAt: publicationTimestamp,
  },
  {
    id: "historical-point-correction",
    type: "POINT_ADJUSTMENT",
    competitionId,
    validFromMatchday: matchday,
    validToMatchday: null,
    managerId: "manager-thomas",
    points: 1,
    reason: "Confirmed historical point correction",
    createdAt: publicationTimestamp,
  },
  {
    id: "exceptional-match-override",
    type: "MATCH_OVERRIDE",
    competitionId,
    validFromMatchday: matchday,
    validToMatchday: matchday,
    homeManagerId: "manager-thomas",
    awayManagerId: "manager-ben",
    homeFantasyGoals: 7,
    awayFantasyGoals: 9,
    reason: "Exceptional official result decision",
    createdAt: publicationTimestamp,
  },
  {
    id: "official-publication-note",
    type: "ADMIN_NOTE",
    competitionId,
    validFromMatchday: matchday,
    validToMatchday: matchday,
    homeManagerId: "manager-thomas",
    awayManagerId: "manager-ben",
    reason: "Historical decision verified during import",
    createdAt: publicationTimestamp,
  },
] as const satisfies readonly BmsRule[];

export const genericRulesFixtureResult = applyRulesToMatchday({
  calculatedMatchday: thomasCalculatedMatchdayFixture,
  rules: genericRulesFixture,
  publicationTimestamp,
});

export const rulesEngineFixtureProof = {
  reproducesThomasOfficialResult:
    thomasOfficialResult.calculatedGoals.home === 13
    && thomasOfficialResult.officialGoals.home === 0
    && thomasOfficialResult.officialGoals.away === 28,
  updatesOpponentResult:
    thomasOfficialResult.teams.away.fantasyGoalsAgainst === 0
    && thomasOfficialResult.teams.away.fantasyGoalDifference === 28,
  preservesLeaguePoints:
    thomasOfficialResult.leaguePoints.home === 0
    && thomasOfficialResult.leaguePoints.away === 3,
  createsAuditTrail:
    thomasAudit.ruleType === "TEAM_INVALID"
    && thomasAudit.oldValue.home === 13
    && thomasAudit.newValue.home === 0
    && thomasAudit.reason === thomasInvalidTeamRule.reason
    && thomasAudit.administrator === "historical-import",
  supportsPenaltyAdjustmentAndOverride:
    genericRulesFixtureResult.auditTrail.length === 3
    && genericRulesFixtureResult.officialResults[0].officialGoals.home === 7
    && genericRulesFixtureResult.officialResults[0].officialGoals.away === 9,
  recordsAdminNotes:
    genericRulesFixtureResult.ruleLog.some((entry) => (
      entry.ruleType === "ADMIN_NOTE" && entry.status === "RECORDED"
    )),
  preservesCalculatedMatchday:
    JSON.stringify(thomasCalculatedMatchdayFixture) === calculatedSnapshot
    && thomasOfficialResult.calculatedGoals.home === 13
    && thomasOfficialResult.calculatedResult.fantasyGoals.home === 13,
} as const;

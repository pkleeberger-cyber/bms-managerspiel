import type {
  MatchOutcome,
  MatchTeamSide,
} from "../match-engine";
import type {
  ApplyRulesInput,
  BmsRule,
  CalculatedMatchdayResult,
  OfficialMatchResult,
  OfficialScore,
  RuleAuditEntry,
  RuleLogEntry,
  RulesEngineResult,
} from "./types";

export class RulesEngineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RulesEngineError";
  }
}

function isValidTimestamp(value: string): boolean {
  return value !== "" && !Number.isNaN(Date.parse(value));
}

function isRulePeriodValid(rule: BmsRule): boolean {
  return Number.isInteger(rule.validFromMatchday)
    && rule.validFromMatchday >= 1
    && (
      rule.validToMatchday === null
      || (
        Number.isInteger(rule.validToMatchday)
        && rule.validToMatchday >= rule.validFromMatchday
      )
    );
}

function validateInput(input: ApplyRulesInput): void {
  if (!input.calculatedMatchday.competition.id) {
    throw new RulesEngineError("Calculated matchday competition ID is required");
  }

  if (!Number.isInteger(input.calculatedMatchday.matchday) || input.calculatedMatchday.matchday < 1) {
    throw new RulesEngineError(`Invalid matchday: ${input.calculatedMatchday.matchday}`);
  }

  if (!isValidTimestamp(input.publicationTimestamp)) {
    throw new RulesEngineError("Publication timestamp must be a valid ISO-compatible timestamp");
  }

  const ruleIds = new Set<string>();

  for (const rule of input.rules) {
    if (!rule.id) {
      throw new RulesEngineError("Every rule requires an ID");
    }

    if (ruleIds.has(rule.id)) {
      throw new RulesEngineError(`Duplicate rule ID: ${rule.id}`);
    }
    ruleIds.add(rule.id);

    if (!rule.reason.trim()) {
      throw new RulesEngineError(`Rule ${rule.id} requires a reason`);
    }

    if (!isValidTimestamp(rule.createdAt)) {
      throw new RulesEngineError(`Rule ${rule.id} has an invalid creation timestamp`);
    }

    if (!isRulePeriodValid(rule)) {
      throw new RulesEngineError(`Rule ${rule.id} has an invalid matchday period`);
    }

    if (
      (rule.type === "TEAM_PENALTY" || rule.type === "POINT_ADJUSTMENT")
      && (!Number.isFinite(rule.points) || rule.points === 0)
    ) {
      throw new RulesEngineError(`Rule ${rule.id} requires a finite non-zero point value`);
    }

    if (
      rule.type === "TEAM_INVALID"
      && rule.invalidFantasyGoals !== undefined
      && !Number.isFinite(rule.invalidFantasyGoals)
    ) {
      throw new RulesEngineError(`Rule ${rule.id} has invalid fantasy goals`);
    }

    if (
      rule.type === "MATCH_OVERRIDE"
      && (
        !Number.isFinite(rule.homeFantasyGoals)
        || !Number.isFinite(rule.awayFantasyGoals)
      )
    ) {
      throw new RulesEngineError(`Rule ${rule.id} has an invalid match override`);
    }
  }
}

function isActiveRule(
  rule: BmsRule,
  calculatedMatchday: CalculatedMatchdayResult,
): boolean {
  return rule.competitionId === calculatedMatchday.competition.id
    && rule.validFromMatchday <= calculatedMatchday.matchday
    && (rule.validToMatchday === null || rule.validToMatchday >= calculatedMatchday.matchday);
}

function getOutcome(score: OfficialScore): MatchOutcome {
  if (score.home > score.away) {
    return "HOME_WIN";
  }

  if (score.home < score.away) {
    return "AWAY_WIN";
  }

  return "DRAW";
}

function getLeaguePoints(outcome: MatchOutcome): { home: 0 | 1 | 3; away: 0 | 1 | 3 } {
  if (outcome === "HOME_WIN") {
    return { home: 3, away: 0 };
  }

  if (outcome === "AWAY_WIN") {
    return { home: 0, away: 3 };
  }

  return { home: 1, away: 1 };
}

function getManagerSide(
  result: OfficialMatchResult,
  managerId: string,
): MatchTeamSide | null {
  if (result.teams.home.managerId === managerId) {
    return "HOME";
  }

  if (result.teams.away.managerId === managerId) {
    return "AWAY";
  }

  return null;
}

function matchesOverrideTarget(
  result: OfficialMatchResult,
  homeManagerId: string,
  awayManagerId: string,
): boolean {
  return result.teams.home.managerId === homeManagerId
    && result.teams.away.managerId === awayManagerId;
}

function createOfficialResult(
  calculatedResult: OfficialMatchResult["calculatedResult"],
): OfficialMatchResult {
  return {
    calculatedResult,
    officialResult: {
      ...calculatedResult,
      winner: calculatedResult.winner ? { ...calculatedResult.winner } : null,
      fantasyGoals: { ...calculatedResult.fantasyGoals },
      leaguePoints: { ...calculatedResult.leaguePoints },
      teams: {
        home: { ...calculatedResult.teams.home },
        away: { ...calculatedResult.teams.away },
      },
    },
    calculatedGoals: { ...calculatedResult.fantasyGoals },
    officialGoals: { ...calculatedResult.fantasyGoals },
    outcome: calculatedResult.outcome,
    winner: calculatedResult.winner ? { ...calculatedResult.winner } : null,
    leaguePoints: { ...calculatedResult.leaguePoints },
    teams: {
      home: { ...calculatedResult.teams.home },
      away: { ...calculatedResult.teams.away },
    },
    appliedRuleIds: [],
  };
}

function updateOfficialResult(
  result: OfficialMatchResult,
  officialGoals: OfficialScore,
  ruleId: string,
): OfficialMatchResult {
  const outcome = getOutcome(officialGoals);
  const leaguePoints = getLeaguePoints(outcome);
  const homeManagerId = result.teams.home.managerId;
  const awayManagerId = result.teams.away.managerId;
  const officialResult = {
    ...result.calculatedResult,
    outcome,
    winner: outcome === "DRAW"
      ? null
      : {
          side: outcome === "HOME_WIN" ? "HOME" as const : "AWAY" as const,
          managerId: outcome === "HOME_WIN" ? homeManagerId : awayManagerId,
        },
    fantasyGoals: { ...officialGoals },
    leaguePoints: { ...leaguePoints },
    teams: {
      home: {
        managerId: homeManagerId,
        fantasyGoalsFor: officialGoals.home,
        fantasyGoalsAgainst: officialGoals.away,
        fantasyGoalDifference: officialGoals.home - officialGoals.away,
        leaguePoints: leaguePoints.home,
      },
      away: {
        managerId: awayManagerId,
        fantasyGoalsFor: officialGoals.away,
        fantasyGoalsAgainst: officialGoals.home,
        fantasyGoalDifference: officialGoals.away - officialGoals.home,
        leaguePoints: leaguePoints.away,
      },
    },
  };

  return {
    ...result,
    officialResult,
    officialGoals: { ...officialGoals },
    outcome,
    winner: outcome === "DRAW"
      ? null
      : {
          side: outcome === "HOME_WIN" ? "HOME" : "AWAY",
          managerId: outcome === "HOME_WIN" ? homeManagerId : awayManagerId,
        },
    leaguePoints,
    teams: {
      home: {
        managerId: homeManagerId,
        fantasyGoalsFor: officialGoals.home,
        fantasyGoalsAgainst: officialGoals.away,
        fantasyGoalDifference: officialGoals.home - officialGoals.away,
        leaguePoints: leaguePoints.home,
      },
      away: {
        managerId: awayManagerId,
        fantasyGoalsFor: officialGoals.away,
        fantasyGoalsAgainst: officialGoals.home,
        fantasyGoalDifference: officialGoals.away - officialGoals.home,
        leaguePoints: leaguePoints.away,
      },
    },
    appliedRuleIds: [...result.appliedRuleIds, ruleId],
  };
}

function getRuleTargetIndex(
  results: readonly OfficialMatchResult[],
  rule: Exclude<BmsRule, { type: "ADMIN_NOTE" }>,
): number {
  const index = rule.type === "MATCH_OVERRIDE"
    ? results.findIndex((result) => matchesOverrideTarget(
        result,
        rule.homeManagerId,
        rule.awayManagerId,
      ))
    : results.findIndex((result) => getManagerSide(result, rule.managerId) !== null);

  if (index === -1) {
    throw new RulesEngineError(`No calculated match found for active rule ${rule.id}`);
  }

  return index;
}

function getAdjustedScore(
  result: OfficialMatchResult,
  rule: Exclude<BmsRule, { type: "ADMIN_NOTE" }>,
): OfficialScore {
  if (rule.type === "MATCH_OVERRIDE") {
    return {
      home: rule.homeFantasyGoals,
      away: rule.awayFantasyGoals,
    };
  }

  const side = getManagerSide(result, rule.managerId);

  if (!side) {
    throw new RulesEngineError(`Manager ${rule.managerId} is not part of rule target match`);
  }

  const currentValue = side === "HOME"
    ? result.officialGoals.home
    : result.officialGoals.away;
  const newValue = rule.type === "TEAM_INVALID"
    ? rule.invalidFantasyGoals ?? 0
    : currentValue + rule.points;

  return side === "HOME"
    ? { home: newValue, away: result.officialGoals.away }
    : { home: result.officialGoals.home, away: newValue };
}

function createLogEntry(
  rule: BmsRule,
  status: RuleLogEntry["status"],
  timestamp: string,
  result?: OfficialMatchResult,
): RuleLogEntry {
  return {
    ruleId: rule.id,
    ruleType: rule.type,
    status,
    reason: rule.reason,
    timestamp,
    ...(rule.administrator ? { administrator: rule.administrator } : {}),
    ...(result
      ? {
          homeManagerId: result.teams.home.managerId,
          awayManagerId: result.teams.away.managerId,
        }
      : {}),
  };
}

function createAuditEntry(
  rule: Exclude<BmsRule, { type: "ADMIN_NOTE" }>,
  result: OfficialMatchResult,
  oldValue: OfficialScore,
  newValue: OfficialScore,
  timestamp: string,
): RuleAuditEntry {
  return {
    ruleId: rule.id,
    ruleType: rule.type,
    homeManagerId: result.teams.home.managerId,
    awayManagerId: result.teams.away.managerId,
    oldValue: { ...oldValue },
    newValue: { ...newValue },
    reason: rule.reason,
    timestamp,
    ...(rule.administrator ? { administrator: rule.administrator } : {}),
  };
}

export function applyRulesToMatchday(input: ApplyRulesInput): RulesEngineResult {
  validateInput(input);

  const appliedRules = input.rules.filter((rule) => isActiveRule(
    rule,
    input.calculatedMatchday,
  ));
  const officialResults = input.calculatedMatchday.matchResults.map(createOfficialResult);
  const ruleLog: RuleLogEntry[] = [];
  const auditTrail: RuleAuditEntry[] = [];

  for (const rule of appliedRules) {
    if (rule.type === "ADMIN_NOTE") {
      ruleLog.push(createLogEntry(rule, "RECORDED", input.publicationTimestamp));
      continue;
    }

    const resultIndex = getRuleTargetIndex(officialResults, rule);
    const currentResult = officialResults[resultIndex];
    const oldValue = { ...currentResult.officialGoals };
    const newValue = getAdjustedScore(currentResult, rule);
    const updatedResult = updateOfficialResult(currentResult, newValue, rule.id);

    officialResults[resultIndex] = updatedResult;
    ruleLog.push(createLogEntry(rule, "APPLIED", input.publicationTimestamp, updatedResult));
    auditTrail.push(createAuditEntry(
      rule,
      updatedResult,
      oldValue,
      newValue,
      input.publicationTimestamp,
    ));
  }

  return {
    calculatedMatchday: input.calculatedMatchday,
    appliedRules: [...appliedRules],
    officialResults,
    ruleLog,
    auditTrail,
    publicationTimestamp: input.publicationTimestamp,
  };
}

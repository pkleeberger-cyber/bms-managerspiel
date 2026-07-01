import {
  calculateLeagueStoryFromUpdatedTable,
  calculateLeagueTable,
} from "../league-engine";
import type { MatchResult } from "../match-engine";
import {
  applyRulesToMatchday,
} from "../rules-engine";
import type {
  OfficialMatchResult,
  OfficialScore,
  RuleAuditEntry,
} from "../rules-engine";
import {
  processCalculatedMatchday,
} from "./matchday-processor";
import type {
  OfficialMatchdayResult,
  OfficialMatchdayValidationIssue,
  ProcessOfficialMatchdayInput,
} from "./types";

export class OfficialMatchdayValidationError extends Error {
  readonly issues: OfficialMatchdayValidationIssue[];

  constructor(issues: OfficialMatchdayValidationIssue[]) {
    super(`Official matchday validation failed with ${issues.length} issue${issues.length === 1 ? "" : "s"}`);
    this.name = "OfficialMatchdayValidationError";
    this.issues = issues;
  }
}

function getMatchKey(homeManagerId: string, awayManagerId: string): string {
  return `${homeManagerId}:${awayManagerId}`;
}

function scoresEqual(first: OfficialScore, second: OfficialScore): boolean {
  return first.home === second.home && first.away === second.away;
}

function validateCalculatedCompleteness(
  input: ProcessOfficialMatchdayInput,
  calculatedMatchResults: readonly MatchResult[],
): OfficialMatchdayValidationIssue[] {
  const issues: OfficialMatchdayValidationIssue[] = [];

  if (calculatedMatchResults.length !== input.fixtures.length) {
    issues.push({
      code: "INCOMPLETE_CALCULATED_MATCHDAY",
      message: `Calculated ${calculatedMatchResults.length} matches for ${input.fixtures.length} fixtures`,
    });
  }

  const resultKeys = new Set(calculatedMatchResults.map((result) => getMatchKey(
    result.teams.home.managerId,
    result.teams.away.managerId,
  )));

  for (const fixture of input.fixtures) {
    const key = getMatchKey(fixture.homeManagerId, fixture.awayManagerId);

    if (!resultKeys.has(key)) {
      issues.push({
        code: "INCOMPLETE_CALCULATED_MATCHDAY",
        message: `Calculated matchday is missing fixture ${fixture.fixtureId}`,
        homeManagerId: fixture.homeManagerId,
        awayManagerId: fixture.awayManagerId,
      });
    }
  }

  return issues;
}

function validateRuleLogs(
  officialResult: OfficialMatchdayResult,
): OfficialMatchdayValidationIssue[] {
  const issues: OfficialMatchdayValidationIssue[] = [];
  const appliedRuleIds = officialResult.appliedRules.map((rule) => rule.id);
  const loggedRuleIds = officialResult.ruleLog.map((entry) => entry.ruleId);

  if (
    appliedRuleIds.length !== loggedRuleIds.length
    || appliedRuleIds.some((ruleId, index) => loggedRuleIds[index] !== ruleId)
  ) {
    issues.push({
      code: "BROKEN_AUDIT_CHAIN",
      message: "Applied rules and rule log are not aligned",
    });
  }

  const mutatingRuleIds = officialResult.appliedRules
    .filter((rule) => rule.type !== "ADMIN_NOTE")
    .map((rule) => rule.id);
  const auditedRuleIds = officialResult.auditTrail.map((entry) => entry.ruleId);

  if (
    mutatingRuleIds.length !== auditedRuleIds.length
    || mutatingRuleIds.some((ruleId, index) => auditedRuleIds[index] !== ruleId)
  ) {
    issues.push({
      code: "BROKEN_AUDIT_CHAIN",
      message: "Mutating rules and audit trail are not aligned",
    });
  }

  return issues;
}

function getAuditsForMatch(
  auditTrail: readonly RuleAuditEntry[],
  result: OfficialMatchResult,
): RuleAuditEntry[] {
  return auditTrail.filter((entry) => (
    entry.homeManagerId === result.teams.home.managerId
    && entry.awayManagerId === result.teams.away.managerId
  ));
}

function validateMatchAuditChain(
  result: OfficialMatchResult,
  auditTrail: readonly RuleAuditEntry[],
): OfficialMatchdayValidationIssue[] {
  const issues: OfficialMatchdayValidationIssue[] = [];
  const audits = getAuditsForMatch(auditTrail, result);
  let currentScore = { ...result.calculatedGoals };

  for (const audit of audits) {
    if (!scoresEqual(audit.oldValue, currentScore)) {
      issues.push({
        code: "BROKEN_AUDIT_CHAIN",
        message: `Rule ${audit.ruleId} does not continue from the previous official score`,
        ruleId: audit.ruleId,
        homeManagerId: audit.homeManagerId,
        awayManagerId: audit.awayManagerId,
      });
    }

    currentScore = { ...audit.newValue };
  }

  if (!scoresEqual(currentScore, result.officialGoals)) {
    issues.push({
      code: "BROKEN_AUDIT_CHAIN",
      message: "Final audited score does not match the official result",
      homeManagerId: result.teams.home.managerId,
      awayManagerId: result.teams.away.managerId,
    });
  }

  const auditRuleIds = audits.map((audit) => audit.ruleId);

  if (
    auditRuleIds.length !== result.appliedRuleIds.length
    || auditRuleIds.some((ruleId, index) => result.appliedRuleIds[index] !== ruleId)
  ) {
    issues.push({
      code: "BROKEN_AUDIT_CHAIN",
      message: "Official match rule IDs do not match its audit entries",
      homeManagerId: result.teams.home.managerId,
      awayManagerId: result.teams.away.managerId,
    });
  }

  return issues;
}

export function validateOfficialMatchdayAudit(
  officialResult: OfficialMatchdayResult,
): OfficialMatchdayValidationIssue[] {
  return [
    ...validateRuleLogs(officialResult),
    ...officialResult.officialResults.flatMap((result) => validateMatchAuditChain(
      result,
      officialResult.auditTrail,
    )),
  ];
}

export function processOfficialMatchday(
  input: ProcessOfficialMatchdayInput,
): OfficialMatchdayResult {
  const calculatedMatchday = processCalculatedMatchday(input);
  const completenessIssues = validateCalculatedCompleteness(
    input,
    calculatedMatchday.matchResults,
  );

  if (completenessIssues.length > 0) {
    throw new OfficialMatchdayValidationError(completenessIssues);
  }

  const rulesResult = applyRulesToMatchday({
    calculatedMatchday,
    rules: input.rules,
    publicationTimestamp: input.publicationTimestamp,
  });
  const officialMatchResults = rulesResult.officialResults.map(
    (result) => result.officialResult,
  );
  const officialLeagueTable = calculateLeagueTable({
    previousLeagueTable: input.previousLeagueTable,
    matchResults: officialMatchResults,
    competitionId: input.competition.id,
    matchday: input.matchday,
  });
  const officialStory = calculateLeagueStoryFromUpdatedTable({
    competition: input.competition,
    matchday: input.matchday,
    previousLeagueTable: input.previousLeagueTable,
    matchResults: officialMatchResults,
    updatedLeagueTable: officialLeagueTable,
  });
  const result: OfficialMatchdayResult = {
    calculatedMatchday,
    officialResults: rulesResult.officialResults,
    officialLeagueTable,
    officialLeagueContext: officialStory.leagueContext,
    officialEvents: officialStory.allGeneratedEvents,
    heroEvent: officialStory.heroEvent,
    appliedRules: rulesResult.appliedRules,
    ruleLog: rulesResult.ruleLog,
    auditTrail: rulesResult.auditTrail,
    metadata: {
      competitionId: input.competition.id,
      matchday: input.matchday,
      calculationTimestamp: input.calculationTimestamp,
      publicationTimestamp: input.publicationTimestamp,
      calculatedMatchCount: calculatedMatchday.matchResults.length,
      officialMatchCount: rulesResult.officialResults.length,
    },
  };
  const auditIssues = validateOfficialMatchdayAudit(result);

  if (auditIssues.length > 0) {
    throw new OfficialMatchdayValidationError(auditIssues);
  }

  return result;
}

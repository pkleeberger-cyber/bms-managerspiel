import {
  OFFICIAL_LINEUP_IDS,
  calculateMatchLineup,
} from "../lineup-engine";
import type {
  ManagerSquadAssignment,
} from "../lineup-engine";
import {
  calculateLeagueStoryFromUpdatedTable,
  calculateLeagueTable,
} from "../league-engine";
import { calculateMatchResult } from "../match-engine";
import type {
  CalculatedFixtureLineups,
  MatchdayResult,
  MatchdayValidationIssue,
  OfficialFixture,
  ProcessMatchdayInput,
} from "./types";

export class MatchdayValidationError extends Error {
  readonly issues: MatchdayValidationIssue[];

  constructor(issues: MatchdayValidationIssue[]) {
    super(`Matchday validation failed with ${issues.length} issue${issues.length === 1 ? "" : "s"}`);
    this.name = "MatchdayValidationError";
    this.issues = issues;
  }
}

function isActiveAssignment(
  assignment: ManagerSquadAssignment,
  competitionId: string,
  matchday: number,
): boolean {
  return assignment.competitionId === competitionId
    && assignment.validFromMatchday <= matchday
    && (assignment.validToMatchday === null || assignment.validToMatchday >= matchday);
}

function validateFixtures(
  input: ProcessMatchdayInput,
  issues: MatchdayValidationIssue[],
): void {
  const knownManagers = new Set(input.previousLeagueTable.map((row) => row.managerId));
  const fixtureIds = new Set<string>();
  const matchPairs = new Set<string>();
  const managerAppearances = new Map<string, number>();

  for (const fixture of input.fixtures) {
    if (fixtureIds.has(fixture.fixtureId)) {
      issues.push({
        code: "DUPLICATE_MATCH",
        message: `Duplicate fixture ID: ${fixture.fixtureId}`,
        fixtureId: fixture.fixtureId,
      });
    }
    fixtureIds.add(fixture.fixtureId);

    const matchPair = [fixture.homeManagerId, fixture.awayManagerId].sort().join(":");

    if (matchPairs.has(matchPair)) {
      issues.push({
        code: "DUPLICATE_MATCH",
        message: `Duplicate match pairing: ${matchPair}`,
        fixtureId: fixture.fixtureId,
      });
    }
    matchPairs.add(matchPair);

    for (const managerId of [fixture.homeManagerId, fixture.awayManagerId]) {
      if (!knownManagers.has(managerId)) {
        issues.push({
          code: "MISSING_TEAM",
          message: `Fixture manager is missing from the previous league table: ${managerId}`,
          managerId,
          fixtureId: fixture.fixtureId,
        });
      }

      managerAppearances.set(managerId, (managerAppearances.get(managerId) ?? 0) + 1);
    }
  }

  for (const [managerId, appearances] of managerAppearances) {
    if (appearances > 1) {
      issues.push({
        code: "DUPLICATE_MANAGER",
        message: `Manager appears in ${appearances} fixtures: ${managerId}`,
        managerId,
      });
    }
  }

  for (const managerId of knownManagers) {
    if (!managerAppearances.has(managerId)) {
      issues.push({
        code: "MISSING_FIXTURE",
        message: `No official fixture found for manager: ${managerId}`,
        managerId,
      });
    }
  }
}

function validatePreviousTable(
  input: ProcessMatchdayInput,
  issues: MatchdayValidationIssue[],
): void {
  const managerIds = new Set<string>();

  for (const row of input.previousLeagueTable) {
    if (managerIds.has(row.managerId)) {
      issues.push({
        code: "DUPLICATE_MANAGER",
        message: `Duplicate manager in previous league table: ${row.managerId}`,
        managerId: row.managerId,
      });
    }

    managerIds.add(row.managerId);
  }
}

function validateSquads(
  input: ProcessMatchdayInput,
  issues: MatchdayValidationIssue[],
): void {
  const managers = new Set(input.previousLeagueTable.map((row) => row.managerId));
  const activeAssignments = input.squadAssignments.filter((assignment) => (
    isActiveAssignment(assignment, input.competition.id, input.matchday)
  ));

  for (const managerId of managers) {
    const managerAssignments = activeAssignments.filter((assignment) => assignment.managerId === managerId);

    for (const slotId of OFFICIAL_LINEUP_IDS) {
      const assignmentsForSlot = managerAssignments.filter((assignment) => assignment.slotId === slotId);

      if (assignmentsForSlot.length === 0) {
        issues.push({
          code: "MISSING_LINEUP",
          message: `Missing lineup assignment for manager ${managerId}, slot ${slotId}`,
          managerId,
          slotId,
        });
      } else if (assignmentsForSlot.length > 1) {
        issues.push({
          code: "DUPLICATE_SQUAD_SLOT",
          message: `Duplicate active lineup assignments for manager ${managerId}, slot ${slotId}`,
          managerId,
          slotId,
        });
      }
    }
  }
}

function validateTeamValidity(
  input: ProcessMatchdayInput,
  issues: MatchdayValidationIssue[],
): void {
  const managers = new Set(input.previousLeagueTable.map((row) => row.managerId));

  for (const managerId of managers) {
    const validityEntries = input.teamValidity.filter((entry) => entry.managerId === managerId);

    if (validityEntries.length === 0) {
      issues.push({
        code: "MISSING_TEAM_VALIDITY",
        message: `Missing team validity for manager: ${managerId}`,
        managerId,
      });
      continue;
    }

    if (validityEntries.length > 1) {
      issues.push({
        code: "DUPLICATE_TEAM_VALIDITY",
        message: `Duplicate team validity for manager: ${managerId}`,
        managerId,
      });
      continue;
    }

    if (validityEntries[0].validity === "INVALID") {
      issues.push({
        code: "INVALID_TEAM_UNSUPPORTED",
        message: `Invalid team result handling is not configured for manager: ${managerId}`,
        managerId,
      });
    }
  }
}

export function validateMatchdayInput(input: ProcessMatchdayInput): MatchdayValidationIssue[] {
  const issues: MatchdayValidationIssue[] = [];

  validatePreviousTable(input, issues);
  validateFixtures(input, issues);
  validateSquads(input, issues);
  validateTeamValidity(input, issues);

  if (!input.calculationTimestamp || Number.isNaN(Date.parse(input.calculationTimestamp))) {
    issues.push({
      code: "INVALID_TIMESTAMP",
      message: "Calculation timestamp must be a valid ISO-compatible timestamp",
    });
  }

  return issues;
}

function getValidTeamValidity(input: ProcessMatchdayInput, managerId: string): "VALID" {
  const validity = input.teamValidity.find((entry) => entry.managerId === managerId)?.validity;

  if (validity !== "VALID") {
    throw new MatchdayValidationError([{
      code: "INVALID_TEAM_UNSUPPORTED",
      message: `Manager cannot be calculated normally: ${managerId}`,
      managerId,
    }]);
  }

  return validity;
}

function calculateFixtureLineups(
  input: ProcessMatchdayInput,
  fixture: OfficialFixture,
): CalculatedFixtureLineups {
  const homeTeam = calculateMatchLineup({
    managerId: fixture.homeManagerId,
    competitionId: input.competition.id,
    matchday: input.matchday,
    teamValidity: getValidTeamValidity(input, fixture.homeManagerId),
    assignments: input.squadAssignments,
    matchData: input.kickerMatchData,
    penalties: input.manualPenalties,
  });
  const awayTeam = calculateMatchLineup({
    managerId: fixture.awayManagerId,
    competitionId: input.competition.id,
    matchday: input.matchday,
    teamValidity: getValidTeamValidity(input, fixture.awayManagerId),
    assignments: input.squadAssignments,
    matchData: input.kickerMatchData,
    penalties: input.manualPenalties,
  });

  return {
    fixtureId: fixture.fixtureId,
    homeTeam,
    awayTeam,
  };
}

export function processCalculatedMatchday(input: ProcessMatchdayInput): MatchdayResult {
  const validationIssues = validateMatchdayInput(input);

  if (validationIssues.length > 0) {
    throw new MatchdayValidationError(validationIssues);
  }

  const calculatedLineups = input.fixtures.map((fixture) => calculateFixtureLineups(input, fixture));
  const matchResults = calculatedLineups.map((fixtureLineups) => calculateMatchResult({
    homeTeam: fixtureLineups.homeTeam,
    awayTeam: fixtureLineups.awayTeam,
    competitionId: input.competition.id,
    matchday: input.matchday,
  }));
  const updatedLeagueTable = calculateLeagueTable({
    previousLeagueTable: input.previousLeagueTable,
    matchResults,
    competitionId: input.competition.id,
    matchday: input.matchday,
  });
  const storyResult = calculateLeagueStoryFromUpdatedTable({
    competition: input.competition,
    matchday: input.matchday,
    previousLeagueTable: input.previousLeagueTable,
    matchResults,
    updatedLeagueTable,
  });

  return {
    competition: { ...input.competition },
    matchday: input.matchday,
    calculatedLineups,
    matchResults,
    updatedLeagueTable,
    leagueContext: storyResult.leagueContext,
    allEvents: storyResult.allGeneratedEvents,
    heroEvent: storyResult.heroEvent,
    calculationTimestamp: input.calculationTimestamp,
  };
}

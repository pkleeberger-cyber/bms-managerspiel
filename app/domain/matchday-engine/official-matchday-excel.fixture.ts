import {
  excelMappedManagerSnapshots,
} from "../lineup-engine/excel-matchday-reality.fixture";
import type {
  ManagerSquadAssignment,
  PlayerMatchData,
} from "../lineup-engine";
import {
  officialMatchdayFixtures,
} from "../match-engine/excel-matchday-verification";
import type {
  PreviousLeagueTableRow,
} from "../league-engine";
import type {
  BmsRule,
} from "../rules-engine";
import {
  processOfficialMatchday,
  validateOfficialMatchdayAudit,
} from "./official-matchday-processor";
import type {
  OfficialFixture,
  ProcessOfficialMatchdayInput,
} from "./types";

const competition = {
  id: "excel-full-matchday-reality",
  totalMatchdays: 34,
  pointsPerWin: 3,
  europeRanks: [1, 2, 3, 4],
  relegationRanks: [16, 17, 18],
} as const;
const matchday = 34;
const calculationTimestamp = "2026-06-30T19:00:00.000Z";
const publicationTimestamp = "2026-06-30T19:15:00.000Z";
const fixtureManagerNames = new Set(officialMatchdayFixtures.flatMap((fixture) => [
  fixture.homeManagerName,
  fixture.awayManagerName,
]));
const managerSnapshots = excelMappedManagerSnapshots.filter((snapshot) => (
  fixtureManagerNames.has(snapshot.managerName)
));
const snapshotByName = new Map(managerSnapshots.map((snapshot) => [
  snapshot.managerName,
  snapshot,
]));

function getManagerId(managerName: string): string {
  const managerId = snapshotByName.get(managerName)?.managerId;

  if (!managerId) {
    throw new Error(`Missing historical manager snapshot for ${managerName}`);
  }

  return managerId;
}

const fixtures = officialMatchdayFixtures.map((fixture, index): OfficialFixture => ({
  fixtureId: `${competition.id}-${matchday}-${index + 1}`,
  homeManagerId: getManagerId(fixture.homeManagerName),
  awayManagerId: getManagerId(fixture.awayManagerName),
}));

const previousLeagueTable = managerSnapshots.map((snapshot, index): PreviousLeagueTableRow => ({
  position: index + 1,
  managerId: snapshot.managerId,
  teamId: `historical-team-${index + 1}`,
  teamName: `${snapshot.managerName} Team`,
  managerName: snapshot.managerName,
  matchesPlayed: 33,
  wins: 0,
  draws: 0,
  losses: 0,
  fantasyGoalsFor: 0,
  fantasyGoalsAgainst: 0,
  fantasyGoalDifference: 0,
  leaguePoints: managerSnapshots.length - index,
  formLastFive: [],
}));

const squadAssignments = managerSnapshots.flatMap(
  (snapshot) => snapshot.assignments,
) satisfies readonly ManagerSquadAssignment[];
const kickerMatchData = managerSnapshots.flatMap(
  (snapshot) => snapshot.matchData,
) satisfies readonly PlayerMatchData[];
const thomasManagerId = getManagerId("Thomas");
const benManagerId = getManagerId("Ben");

const historicalThomasRule = {
  id: "historical-matchday-34-thomas-invalid",
  type: "TEAM_INVALID",
  competitionId: competition.id,
  validFromMatchday: matchday,
  validToMatchday: matchday,
  managerId: thomasManagerId,
  reason: "No valid squad submitted",
  createdAt: publicationTimestamp,
  administrator: "historical-import",
} as const satisfies BmsRule;

export const officialMatchdayExcelFixtureInput: ProcessOfficialMatchdayInput = {
  competition,
  matchday,
  previousLeagueTable,
  fixtures,
  squadAssignments,
  kickerMatchData,
  manualPenalties: [],
  teamValidity: managerSnapshots.map((snapshot) => ({
    managerId: snapshot.managerId,
    validity: "VALID" as const,
  })),
  calculationTimestamp,
  rules: [historicalThomasRule],
  publicationTimestamp,
};

const inputSnapshot = JSON.stringify(officialMatchdayExcelFixtureInput);

export const officialMatchdayExcelFixtureResult = processOfficialMatchday(
  officialMatchdayExcelFixtureInput,
);

const calculatedThomasMatch = officialMatchdayExcelFixtureResult.calculatedMatchday.matchResults.find(
  (result) => result.teams.home.managerId === thomasManagerId
    && result.teams.away.managerId === benManagerId,
);
const officialThomasMatch = officialMatchdayExcelFixtureResult.officialResults.find(
  (result) => result.teams.home.managerId === thomasManagerId
    && result.teams.away.managerId === benManagerId,
);
const calculatedThomasTableRow = officialMatchdayExcelFixtureResult
  .calculatedMatchday.updatedLeagueTable.rows
  .find((row) => row.managerId === thomasManagerId);
const officialThomasTableRow = officialMatchdayExcelFixtureResult
  .officialLeagueTable.rows
  .find((row) => row.managerId === thomasManagerId);
const historicalScoreByMatch = new Map(officialMatchdayFixtures.map((fixture) => [
  `${getManagerId(fixture.homeManagerName)}:${getManagerId(fixture.awayManagerName)}`,
  {
    home: fixture.homeFantasyGoals,
    away: fixture.awayFantasyGoals,
  },
]));
const brokenAuditResult = {
  ...officialMatchdayExcelFixtureResult,
  auditTrail: officialMatchdayExcelFixtureResult.auditTrail.map((entry, index) => (
    index === 0
      ? {
          ...entry,
          oldValue: {
            ...entry.oldValue,
            home: 999,
          },
        }
      : entry
  )),
};
const brokenAuditIssues = validateOfficialMatchdayAudit(brokenAuditResult);

export const officialMatchdayExcelFixtureProof = {
  processesEveryHistoricalFixture:
    officialMatchdayExcelFixtureResult.metadata.calculatedMatchCount === 9
    && officialMatchdayExcelFixtureResult.metadata.officialMatchCount === 9,
  preservesThomasCalculation:
    calculatedThomasMatch?.fantasyGoals.home === 13
    && officialThomasMatch?.calculatedGoals.home === 13
    && officialThomasMatch.calculatedResult.fantasyGoals.home === 13,
  publishesThomasOfficialResult:
    officialThomasMatch?.officialGoals.home === 0
    && officialThomasMatch.officialGoals.away === 28
    && officialThomasMatch.officialResult.fantasyGoals.home === 0,
  reproducesEveryOfficialWorkbookScore:
    officialMatchdayExcelFixtureResult.officialResults.every((result) => {
      const expected = historicalScoreByMatch.get(getMatchKey(
        result.teams.home.managerId,
        result.teams.away.managerId,
      ));

      return expected?.home === result.officialGoals.home
        && expected.away === result.officialGoals.away;
    }),
  createsOfficialLeagueTable:
    calculatedThomasTableRow?.fantasyGoalsFor === 13
    && officialThomasTableRow?.fantasyGoalsFor === 0
    && officialThomasTableRow.fantasyGoalsAgainst === 28,
  createsOfficialStoryData:
    officialMatchdayExcelFixtureResult.officialLeagueContext.lowestScoringTeam
      ?.team.managerId === thomasManagerId
    && officialMatchdayExcelFixtureResult.officialEvents.length > 0
    && officialMatchdayExcelFixtureResult.heroEvent !== null,
  createsCompleteAudit:
    officialMatchdayExcelFixtureResult.appliedRules.length === 1
    && officialMatchdayExcelFixtureResult.ruleLog.length === 1
    && officialMatchdayExcelFixtureResult.auditTrail.length === 1
    && officialMatchdayExcelFixtureResult.auditTrail[0].oldValue.home === 13
    && officialMatchdayExcelFixtureResult.auditTrail[0].newValue.home === 0,
  detectsBrokenAuditChain:
    brokenAuditIssues.some((issue) => issue.code === "BROKEN_AUDIT_CHAIN"),
  preservesProcessorInput:
    JSON.stringify(officialMatchdayExcelFixtureInput) === inputSnapshot,
} as const;

function getMatchKey(homeManagerId: string, awayManagerId: string): string {
  return `${homeManagerId}:${awayManagerId}`;
}

import type {
  ManagerMatchdayPenalty,
  ManagerSquadAssignment,
} from "../lineup-engine";
import type { PreviousLeagueTableRow } from "../league-engine";
import type { BmsRule } from "../rules-engine";
import {
  officialMatchdayExcelFixtureInput,
} from "./official-matchday-excel.fixture";
import { processOfficialMatchday } from "./official-matchday-processor";
import type {
  OfficialFixture,
  ProcessOfficialMatchdayInput,
} from "./types";

const competition = {
  id: "zweite-liga-fixture",
  totalMatchdays: 34,
  pointsPerWin: 3,
  europeRanks: [1, 2],
  relegationRanks: [5, 6],
} as const;
const sourceFixtures = officialMatchdayExcelFixtureInput.fixtures.slice(0, 3);
const selectedManagerIds = new Set(sourceFixtures.flatMap((fixture) => [
  fixture.homeManagerId,
  fixture.awayManagerId,
]));

const fixtures = sourceFixtures.map((fixture, index): OfficialFixture => ({
  fixtureId: `${competition.id}-${officialMatchdayExcelFixtureInput.matchday}-${index + 1}`,
  homeManagerId: fixture.homeManagerId,
  awayManagerId: fixture.awayManagerId,
}));

const previousLeagueTable = officialMatchdayExcelFixtureInput.previousLeagueTable
  .filter((row) => selectedManagerIds.has(row.managerId))
  .map((row, index): PreviousLeagueTableRow => ({
    ...row,
    position: index + 1,
    teamId: `${competition.id}-team-${index + 1}`,
    leaguePoints: 6 - index,
  }));

const squadAssignments = officialMatchdayExcelFixtureInput.squadAssignments
  .filter((assignment) => selectedManagerIds.has(assignment.managerId))
  .map((assignment): ManagerSquadAssignment => ({
    ...assignment,
    competitionId: competition.id,
  }));

const selectedPlayerIds = new Set(
  squadAssignments.map((assignment) => assignment.playerId),
);

const manualPenalties = officialMatchdayExcelFixtureInput.manualPenalties
  .filter((penalty) => selectedManagerIds.has(penalty.managerId))
  .map((penalty): ManagerMatchdayPenalty => ({
    ...penalty,
    competitionId: competition.id,
  }));

const rules = officialMatchdayExcelFixtureInput.rules.flatMap((rule): BmsRule[] => {
  if (rule.type === "TEAM_INVALID" && selectedManagerIds.has(rule.managerId)) {
    return [{
      ...rule,
      id: `${competition.id}-${rule.id}`,
      competitionId: competition.id,
    }];
  }

  return [];
});

export const secondLeagueOfficialFixtureInput: ProcessOfficialMatchdayInput = {
  competition,
  matchday: officialMatchdayExcelFixtureInput.matchday,
  previousLeagueTable,
  fixtures,
  squadAssignments,
  kickerMatchData: officialMatchdayExcelFixtureInput.kickerMatchData.filter(
    (player) => selectedPlayerIds.has(player.playerId),
  ),
  manualPenalties,
  teamValidity: officialMatchdayExcelFixtureInput.teamValidity.filter(
    (entry) => selectedManagerIds.has(entry.managerId),
  ),
  calculationTimestamp: officialMatchdayExcelFixtureInput.calculationTimestamp,
  rules,
  publicationTimestamp: officialMatchdayExcelFixtureInput.publicationTimestamp,
};

export const secondLeagueOfficialFixtureResult = processOfficialMatchday(
  secondLeagueOfficialFixtureInput,
);

export const secondLeagueOfficialFixtureProof = {
  hasSixTeams:
    secondLeagueOfficialFixtureResult.officialLeagueTable.rows.length === 6,
  hasThreeMatches:
    secondLeagueOfficialFixtureResult.officialResults.length === 3,
  hasOfficialStory:
    secondLeagueOfficialFixtureResult.officialEvents.length > 0
    && secondLeagueOfficialFixtureResult.heroEvent !== null,
} as const;

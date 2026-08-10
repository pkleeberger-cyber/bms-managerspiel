import {
  OFFICIAL_LINEUP_IDS,
  OFFICIAL_STARTER_IDS,
} from "../lineup-engine";
import type {
  ManagerMatchdayPenalty,
  ManagerSquadAssignment,
  PlayerMatchData,
} from "../lineup-engine";
import { previousLeagueTableFixture } from "../league-engine/fixture";
import {
  processCalculatedMatchday,
  validateMatchdayInput,
} from "./matchday-processor";
import type {
  ManagerTeamValidity,
  OfficialFixture,
  ProcessMatchdayInput,
} from "./types";

const competition = {
  id: "erste-liga",
  totalMatchdays: 34,
  pointsPerWin: 3,
  europeRanks: [3, 4, 5, 6],
  relegationRanks: [5, 6],
} as const;

const managerRatings = [
  { managerId: "manager-alpha", rating: 3.5 },
  { managerId: "manager-beta", rating: 3 },
  { managerId: "manager-gamma", rating: 3.5 },
  { managerId: "manager-delta", rating: 3.5 },
  { managerId: "manager-epsilon", rating: 3 },
  { managerId: "manager-zeta", rating: 4 },
] as const;

const starterIds = new Set<number>(OFFICIAL_STARTER_IDS);

export const matchdaySquadAssignmentsFixture = managerRatings.flatMap(({ managerId }) => (
  OFFICIAL_LINEUP_IDS.map((slotId) => ({
    managerId,
    competitionId: competition.id,
    playerId: `${managerId}-player-${slotId}`,
    playerName: `${managerId} Player ${slotId}`,
    slotId,
    validFromMatchday: 1,
    validToMatchday: null,
    reason: "INITIAL_SQUAD" as const,
  }))
)) satisfies readonly ManagerSquadAssignment[];

export const matchdayKickerDataFixture = managerRatings.flatMap(({ managerId, rating }) => (
  OFFICIAL_LINEUP_IDS.map((slotId): PlayerMatchData => {
    const isStarter = starterIds.has(slotId);
    const isAlphaMissingDefender = managerId === "manager-alpha" && slotId === 3;
    const isAlphaDefenderReplacement = managerId === "manager-alpha" && slotId === 6;
    const isZetaMissingForward = managerId === "manager-zeta" && slotId === 15;

    return {
      playerId: `${managerId}-player-${slotId}`,
      kickerRating: isAlphaDefenderReplacement
        ? 3.5
        : isStarter && !isAlphaMissingDefender && !isZetaMissingForward
          ? rating
          : null,
      goals: 0,
      yellowRedCard: false,
      redCard: false,
      teamOfTheWeek: false,
    };
  })
)) satisfies readonly PlayerMatchData[];

export const matchdayManualPenaltiesFixture = [
  {
    managerId: "manager-alpha",
    competitionId: competition.id,
    validFromMatchday: 9,
    validToMatchday: 9,
    points: -2,
    reason: "Administrative correction",
  },
] as const satisfies readonly ManagerMatchdayPenalty[];

export const matchdayTeamValidityFixture = managerRatings.map(({ managerId }) => ({
  managerId,
  validity: "VALID" as const,
})) satisfies readonly ManagerTeamValidity[];

export const officialFixturesFixture = [
  {
    fixtureId: "erste-liga-9-1",
    homeManagerId: "manager-alpha",
    awayManagerId: "manager-beta",
  },
  {
    fixtureId: "erste-liga-9-2",
    homeManagerId: "manager-gamma",
    awayManagerId: "manager-delta",
  },
  {
    fixtureId: "erste-liga-9-3",
    homeManagerId: "manager-epsilon",
    awayManagerId: "manager-zeta",
  },
] as const satisfies readonly OfficialFixture[];

export const matchdayProcessorFixtureInput: ProcessMatchdayInput = {
  competition,
  matchday: 9,
  previousLeagueTable: previousLeagueTableFixture,
  fixtures: officialFixturesFixture,
  squadAssignments: matchdaySquadAssignmentsFixture,
  kickerMatchData: matchdayKickerDataFixture,
  manualPenalties: matchdayManualPenaltiesFixture,
  teamValidity: matchdayTeamValidityFixture,
  calculationTimestamp: "2026-08-29T18:00:00.000Z",
};

const historicalInputSnapshot = JSON.stringify(matchdayProcessorFixtureInput);

export const matchdayProcessorFixtureResult = processCalculatedMatchday(matchdayProcessorFixtureInput);

const alphaLineup = matchdayProcessorFixtureResult.calculatedLineups.find(
  (fixture) => fixture.homeTeam.managerId === "manager-alpha",
)?.homeTeam;
const zetaLineup = matchdayProcessorFixtureResult.calculatedLineups.find(
  (fixture) => fixture.awayTeam.managerId === "manager-zeta",
)?.awayTeam;

const invalidFixtureInput: ProcessMatchdayInput = {
  ...matchdayProcessorFixtureInput,
  fixtures: [
    officialFixturesFixture[0],
    officialFixturesFixture[0],
    {
      fixtureId: "invalid-unknown-team",
      homeManagerId: "manager-gamma",
      awayManagerId: "manager-unknown",
    },
  ],
  squadAssignments: matchdaySquadAssignmentsFixture.filter((assignment) => !(
    assignment.managerId === "manager-alpha" && assignment.slotId === 1
  )),
};
const validationFixtureIssues = validateMatchdayInput(invalidFixtureInput);

export const matchdayProcessorFixtureProof = {
  calculatesAllFixtures:
    matchdayProcessorFixtureResult.calculatedLineups.length === 3
    && matchdayProcessorFixtureResult.matchResults.length === 3,
  calculatesAllSixTeams:
    new Set(matchdayProcessorFixtureResult.calculatedLineups.flatMap((fixture) => [
      fixture.homeTeam.managerId,
      fixture.awayTeam.managerId,
    ])).size === 6,
  appliesSingleReplacement:
    alphaLineup?.statistics.startersReplaced === 1
    && alphaLineup.replacements.some((replacement) => (
      replacement.starterLineupId === 3 && replacement.replacementLineupId === 6
    )),
  keepsUnresolvedPosition:
    zetaLineup?.statistics.unevaluatedPositions === 1,
  appliesManualPenalty:
    alphaLineup?.team.playerPoints === 11
    && alphaLineup.team.manualPenaltyPoints === -2
    && alphaLineup.team.totalPoints === 9,
  updatesLeagueAndStory:
    matchdayProcessorFixtureResult.updatedLeagueTable.rows[0]?.teamId === "team-beta"
    && matchdayProcessorFixtureResult.heroEvent?.type === "LEADER_CHANGED"
    && matchdayProcessorFixtureResult.leagueContext.titleGap === 2,
  returnsTimestamp:
    matchdayProcessorFixtureResult.calculationTimestamp === "2026-08-29T18:00:00.000Z",
  preservesInputs:
    JSON.stringify(matchdayProcessorFixtureInput) === historicalInputSnapshot,
  detectsValidationErrors:
    validationFixtureIssues.some((issue) => issue.code === "DUPLICATE_MATCH")
    && validationFixtureIssues.some((issue) => issue.code === "MISSING_TEAM")
    && validationFixtureIssues.some((issue) => issue.code === "MISSING_FIXTURE")
    && validationFixtureIssues.some((issue) => issue.code === "DUPLICATE_MANAGER"),
} as const;

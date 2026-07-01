import {
  leagueMatchResultsFixture,
  previousLeagueTableFixture,
} from "./fixture";
import { calculateLeagueStory } from "./league-story-engine";

const previousTableSnapshot = JSON.stringify(previousLeagueTableFixture);
const matchResultsSnapshot = JSON.stringify(leagueMatchResultsFixture);

export const leagueStoryEngineFixtureResult = calculateLeagueStory({
  competition: {
    id: "erste-liga",
    totalMatchdays: 34,
    pointsPerWin: 3,
    europeRanks: [3, 4, 5, 6],
    relegationRanks: [5, 6],
  },
  matchday: 9,
  previousLeagueTable: previousLeagueTableFixture,
  matchResults: leagueMatchResultsFixture,
});

const leaderChangedEvent = leagueStoryEngineFixtureResult.allGeneratedEvents.find(
  (event) => event.type === "LEADER_CHANGED",
);
const titleRaceEvent = leagueStoryEngineFixtureResult.allGeneratedEvents.find(
  (event) => event.type === "TITLE_RACE_CLOSE",
);
const newLeaderPayload = leaderChangedEvent?.payload.newLeader as { teamId?: string } | undefined;
const oldLeaderPayload = leaderChangedEvent?.payload.oldLeader as { teamId?: string; rank?: number } | undefined;

export const leagueStoryEngineFixtureProof = {
  updatesLeagueTable:
    leagueStoryEngineFixtureResult.updatedLeagueTable.rows[0]?.teamId === "team-beta"
    && leagueStoryEngineFixtureResult.updatedLeagueTable.rows[1]?.teamId === "team-alpha",
  detectsLeaderChange:
    newLeaderPayload?.teamId === "team-beta"
    && oldLeaderPayload?.teamId === "team-alpha"
    && oldLeaderPayload.rank === 1,
  keepsTitleRaceClose:
    titleRaceEvent?.payload.gap === 2,
  ranksCorrectHero:
    leagueStoryEngineFixtureResult.heroEvent?.type === "LEADER_CHANGED"
    && leagueStoryEngineFixtureResult.heroEvent.priority === 120,
  buildsLeagueContext:
    leagueStoryEngineFixtureResult.leagueContext.leader.teamId === "team-beta"
    && leagueStoryEngineFixtureResult.leagueContext.lastPlace.teamId === "team-zeta"
    && leagueStoryEngineFixtureResult.leagueContext.titleGap === 2
    && leagueStoryEngineFixtureResult.leagueContext.largestPositionJump?.team.teamId === "team-beta"
    && leagueStoryEngineFixtureResult.leagueContext.highestScoringTeam?.team.teamId === "team-beta"
    && leagueStoryEngineFixtureResult.leagueContext.lowestScoringTeam?.fantasyGoals === -5,
  preservesHistoricalInputs:
    JSON.stringify(previousLeagueTableFixture) === previousTableSnapshot
    && JSON.stringify(leagueMatchResultsFixture) === matchResultsSnapshot,
} as const;

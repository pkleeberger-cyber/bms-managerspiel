import {
  calculateMatchLineup,
} from "../lineup-engine";
import {
  lineupEngineFixtureAssignments,
  lineupEngineFixtureMatchData,
  lineupEngineFixtureResult,
} from "../lineup-engine/fixture";
import type {
  ManagerSquadAssignment,
  PlayerMatchData,
} from "../lineup-engine";

import { calculateMatchResult } from "./match-engine";

const awayManagerId = "manager-adler";

const awayAssignments = lineupEngineFixtureAssignments.map((assignment) => ({
  ...assignment,
  managerId: awayManagerId,
  playerId: `away-${assignment.playerId}`,
  playerName: `${assignment.playerName} Away`,
})) satisfies readonly ManagerSquadAssignment[];

const awayMatchData = lineupEngineFixtureMatchData.map((matchData) => {
  const kickerRating = matchData.playerId === "player-08-new"
    ? 3.5
    : matchData.playerId === "player-15"
      ? 2
      : matchData.kickerRating;

  return {
    ...matchData,
    playerId: `away-${matchData.playerId}`,
    kickerRating,
  };
}) satisfies readonly PlayerMatchData[];

export const awayLineupFixtureResult = calculateMatchLineup({
  managerId: awayManagerId,
  competitionId: "erste-liga",
  matchday: 7,
  teamValidity: "VALID",
  assignments: awayAssignments,
  matchData: awayMatchData,
});

export const matchEngineFixtureResult = calculateMatchResult({
  homeTeam: lineupEngineFixtureResult,
  awayTeam: awayLineupFixtureResult,
  competitionId: "erste-liga",
  matchday: 7,
});

export const matchEngineFixtureProof = {
  determinesHomeWinner:
    matchEngineFixtureResult.outcome === "HOME_WIN"
    && matchEngineFixtureResult.winner?.side === "HOME",
  assignsLeaguePoints:
    matchEngineFixtureResult.leaguePoints.home === 3
    && matchEngineFixtureResult.leaguePoints.away === 0,
  usesFinalTeamTotalsAsFantasyGoals:
    matchEngineFixtureResult.fantasyGoals.home === 52
    && matchEngineFixtureResult.fantasyGoals.away === 43,
  calculatesGoalDifference:
    matchEngineFixtureResult.teams.home.fantasyGoalDifference === 9
    && matchEngineFixtureResult.teams.away.fantasyGoalDifference === -9,
  calculatesPositionComparison:
    matchEngineFixtureResult.positionComparison.goalkeeper === 0
    && matchEngineFixtureResult.positionComparison.defender === 0
    && matchEngineFixtureResult.positionComparison.midfielder === 8
    && matchEngineFixtureResult.positionComparison.forward === 4,
  determinesTopPerformers:
    matchEngineFixtureResult.topPerformers.bestPlayer?.player.playerId === "player-15"
    && matchEngineFixtureResult.topPerformers.worstPlayer?.player.playerId === "player-04"
    && matchEngineFixtureResult.topPerformers.highestScoringTeam === "HOME"
    && matchEngineFixtureResult.topPerformers.lowestScoringTeam === "AWAY",
} as const;

import {
  lineupEngineFixtureAssignments,
  lineupEngineFixtureMatchData,
} from "./fixture";
import { calculateMatchLineup } from "./lineup-engine";
import { pokalRoundsOneAndTwoScoringConfig } from "./scoring-config";
import type {
  ManagerSquadAssignment,
  PlayerMatchData,
} from "./types";

const managerId = "manager-patrick";
const assignments = lineupEngineFixtureAssignments.map(
  (assignment): ManagerSquadAssignment => ({
    ...assignment,
    competitionId: pokalRoundsOneAndTwoScoringConfig.competitionId,
  }),
);
const matchData = lineupEngineFixtureMatchData.map(
  (player): PlayerMatchData => ({
    ...player,
    kickerRating: null,
  }),
);

export const pokalScoringConfigFixtureResult = calculateMatchLineup({
  managerId,
  competitionId: pokalRoundsOneAndTwoScoringConfig.competitionId,
  matchday: 7,
  teamValidity: "VALID",
  assignments,
  matchData,
  scoringConfig: pokalRoundsOneAndTwoScoringConfig,
});

const yellowRedPlayer = pokalScoringConfigFixtureResult.evaluatedPlayers.find(
  (player) => player.lineupId === 12,
);
const teamOfTheWeekPlayer =
  pokalScoringConfigFixtureResult.evaluatedPlayers.find(
    (player) => player.lineupId === 15,
  );
const goalWithoutRatingPlayer =
  pokalScoringConfigFixtureResult.evaluatedPlayers.find(
    (player) => player.lineupId === 16,
  );

export const pokalScoringConfigFixtureProof = {
  evaluatesEveryStarterWithConfiguredDefault:
    pokalScoringConfigFixtureResult.evaluatedPlayers.length === 11
    && pokalScoringConfigFixtureResult.evaluatedPlayers.every(
      (player) => player.kickerRating === 3.5 && player.usedAutomaticRating,
    ),
  keepsAppearancePendingAndConfigurable:
    pokalScoringConfigFixtureResult.evaluatedPlayers.every(
      (player) => player.points.appearance === 0,
    ),
  countsGoalsWithoutKickerRating:
    goalWithoutRatingPlayer?.points.goals === 3,
  keepsCardsEnabled:
    yellowRedPlayer?.points.cards === -3,
  disablesTeamOfTheWeek:
    teamOfTheWeekPlayer?.matchData.teamOfTheWeek === true
    && teamOfTheWeekPlayer.points.teamOfTheWeek === 0,
} as const;

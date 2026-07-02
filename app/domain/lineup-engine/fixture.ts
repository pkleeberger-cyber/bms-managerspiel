import { calculateMatchLineup } from "./lineup-engine";
import { createDefaultCompetitionScoringConfig } from "./scoring-config";
import { getEffectiveSquad } from "./squad-resolver";
import type {
  ManagerMatchdayPenalty,
  ManagerSquadAssignment,
  PlayerLineup,
  PlayerMatchData,
} from "./types";

const managerId = "manager-patrick";
const competitionId = "erste-liga";

const currentSquadPlayers = [
  { lineupId: 1, playerId: "player-01", playerName: "Nils Berger" },
  { lineupId: 2, playerId: "player-02", playerName: "Tom Seidel" },
  { lineupId: 3, playerId: "player-03", playerName: "Jan Keller" },
  { lineupId: 4, playerId: "player-04", playerName: "David König" },
  { lineupId: 5, playerId: "player-05", playerName: "Mats Lorenz" },
  { lineupId: 6, playerId: "player-06", playerName: "Luca Weber" },
  { lineupId: 7, playerId: "player-07", playerName: "Eric Baum" },
  { lineupId: 8, playerId: "player-08-new", playerName: "Milan Becker" },
  { lineupId: 9, playerId: "player-09", playerName: "Felix Winter" },
  { lineupId: 10, playerId: "player-10", playerName: "Noah Krämer" },
  { lineupId: 11, playerId: "player-11", playerName: "Leon Vogt" },
  { lineupId: 12, playerId: "player-12", playerName: "Emil Schuster" },
  { lineupId: 13, playerId: "player-13", playerName: "Paul Neumann" },
  { lineupId: 14, playerId: "player-14", playerName: "Finn Werner" },
  { lineupId: 15, playerId: "player-15", playerName: "Anton Fischer" },
  { lineupId: 16, playerId: "player-16", playerName: "Maximilian Wolf" },
  { lineupId: 17, playerId: "player-17", playerName: "Ben Richter" },
  { lineupId: 18, playerId: "player-18", playerName: "Ole Schwarz" },
] as const satisfies readonly PlayerLineup[];

export const lineupEngineFixtureAssignments = [
  ...currentSquadPlayers
    .filter((player) => player.lineupId !== 8)
    .map((player) => ({
      managerId,
      competitionId,
      playerId: player.playerId,
      playerName: player.playerName,
      slotId: player.lineupId,
      validFromMatchday: 1,
      validToMatchday: null,
      reason: "INITIAL_SQUAD" as const,
    })),
  {
    managerId,
    competitionId,
    playerId: "player-08-old",
    playerName: "Jonas Hartmann",
    slotId: 8,
    validFromMatchday: 1,
    validToMatchday: 3,
    reason: "INITIAL_SQUAD",
  },
  {
    managerId,
    competitionId,
    playerId: "player-08-new",
    playerName: "Milan Becker",
    slotId: 8,
    validFromMatchday: 4,
    validToMatchday: null,
    reason: "REAL_TRANSFER_REPLACEMENT",
  },
] as const satisfies readonly ManagerSquadAssignment[];

export const lineupEngineFixtureMatchData = [
  { playerId: "player-01", kickerRating: null, goals: 0, yellowRedCard: false, redCard: false, teamOfTheWeek: false },
  { playerId: "player-02", kickerRating: 2.5, goals: 0, yellowRedCard: false, redCard: false, teamOfTheWeek: false },
  { playerId: "player-03", kickerRating: null, goals: 0, yellowRedCard: false, redCard: false, teamOfTheWeek: false },
  { playerId: "player-04", kickerRating: null, goals: 0, yellowRedCard: false, redCard: true, teamOfTheWeek: false },
  { playerId: "player-05", kickerRating: 3, goals: 0, yellowRedCard: false, redCard: false, teamOfTheWeek: false },
  { playerId: "player-06", kickerRating: 2, goals: 0, yellowRedCard: false, redCard: false, teamOfTheWeek: false },
  { playerId: "player-07", kickerRating: 1, goals: 0, yellowRedCard: false, redCard: false, teamOfTheWeek: false },
  { playerId: "player-08-old", kickerRating: 1.5, goals: 0, yellowRedCard: false, redCard: false, teamOfTheWeek: false },
  { playerId: "player-08-new", kickerRating: 1.5, goals: 0, yellowRedCard: false, redCard: false, teamOfTheWeek: false },
  { playerId: "player-09", kickerRating: null, goals: 0, yellowRedCard: false, redCard: false, teamOfTheWeek: false },
  { playerId: "player-10", kickerRating: 4, goals: 0, yellowRedCard: false, redCard: false, teamOfTheWeek: false },
  { playerId: "player-11", kickerRating: 3.5, goals: 0, yellowRedCard: false, redCard: false, teamOfTheWeek: false },
  { playerId: "player-12", kickerRating: 2, goals: 0, yellowRedCard: true, redCard: false, teamOfTheWeek: false },
  { playerId: "player-13", kickerRating: 2.5, goals: 1, yellowRedCard: false, redCard: false, teamOfTheWeek: false },
  { playerId: "player-14", kickerRating: 1, goals: 0, yellowRedCard: false, redCard: false, teamOfTheWeek: false },
  { playerId: "player-15", kickerRating: 1, goals: 2, yellowRedCard: false, redCard: false, teamOfTheWeek: true },
  { playerId: "player-16", kickerRating: null, goals: 1, yellowRedCard: false, redCard: false, teamOfTheWeek: false },
  { playerId: "player-17", kickerRating: 2, goals: 0, yellowRedCard: false, redCard: false, teamOfTheWeek: false },
  { playerId: "player-18", kickerRating: 2.5, goals: 0, yellowRedCard: false, redCard: false, teamOfTheWeek: false },
] as const satisfies readonly PlayerMatchData[];

export const lineupEngineFixturePenalties = [
  {
    managerId,
    competitionId,
    validFromMatchday: 7,
    validToMatchday: 7,
    points: -2,
    reason: "Missing replacement after real-life transfer",
    affectedSlotId: 6,
  },
  {
    managerId,
    competitionId,
    validFromMatchday: 7,
    validToMatchday: 7,
    points: -1,
    reason: "Administrative correction",
  },
] as const satisfies readonly ManagerMatchdayPenalty[];

export const historicalSquadMatchdayTwo = getEffectiveSquad({
  managerId,
  competitionId,
  matchday: 2,
  assignments: lineupEngineFixtureAssignments,
});

export const historicalSquadMatchdaySeven = getEffectiveSquad({
  managerId,
  competitionId,
  matchday: 7,
  assignments: lineupEngineFixtureAssignments,
});

export const historicalMatchdayTwoResult = calculateMatchLineup({
  managerId,
  competitionId,
  matchday: 2,
  teamValidity: "VALID",
  assignments: lineupEngineFixtureAssignments,
  matchData: lineupEngineFixtureMatchData,
  penalties: lineupEngineFixturePenalties,
});

export const lineupEngineFixtureResult = calculateMatchLineup({
  managerId,
  competitionId,
  matchday: 7,
  teamValidity: "VALID",
  assignments: lineupEngineFixtureAssignments,
  matchData: lineupEngineFixtureMatchData,
  penalties: lineupEngineFixturePenalties,
});

const explicitDefaultConfigResult = calculateMatchLineup({
  managerId,
  competitionId,
  matchday: 7,
  teamValidity: "VALID",
  assignments: lineupEngineFixtureAssignments,
  matchData: lineupEngineFixtureMatchData,
  penalties: lineupEngineFixturePenalties,
  scoringConfig: createDefaultCompetitionScoringConfig(competitionId),
});

export const invalidTeamFixtureResult = calculateMatchLineup({
  managerId,
  competitionId,
  matchday: 7,
  teamValidity: "INVALID",
  assignments: lineupEngineFixtureAssignments,
  matchData: lineupEngineFixtureMatchData,
  penalties: lineupEngineFixturePenalties,
});

export const lineupEngineFixtureProof = {
  historicalMatchdayUsesOriginalPlayer:
    historicalSquadMatchdayTwo.players.find((player) => player.lineupId === 8)?.playerId === "player-08-old",
  laterMatchdayUsesReplacementPlayer:
    historicalSquadMatchdaySeven.players.find((player) => player.lineupId === 8)?.playerId === "player-08-new",
  historicalCalculationRemainsStable:
    historicalMatchdayTwoResult.evaluatedPlayers.find((player) => player.lineupId === 8)?.playerId === "player-08-old",
  evaluatesElevenPlayers: lineupEngineFixtureResult.evaluatedPlayers.length === 11,
  usesLowestReplacementIdsFirst:
    lineupEngineFixtureResult.evaluatedPlayers.some((player) => player.lineupId === 6 && player.evaluatedForLineupId === 3)
    && !lineupEngineFixtureResult.evaluatedPlayers.some((player) => player.lineupId === 7),
  keepsRedCardWithoutRating:
    lineupEngineFixtureResult.evaluatedPlayers.some((player) => player.lineupId === 4 && player.kickerRating === 3.5),
  keepsGoalWithoutRating:
    lineupEngineFixtureResult.evaluatedPlayers.some((player) => player.lineupId === 16 && player.kickerRating === 3.5),
  combinesMultiplePenalties:
    lineupEngineFixtureResult.team.playerPoints === 55
    && lineupEngineFixtureResult.team.manualPenaltyPoints === -3
    && lineupEngineFixtureResult.team.totalPoints === 52,
  explicitDefaultPreservesLeagueScoring:
    JSON.stringify(explicitDefaultConfigResult)
      === JSON.stringify(lineupEngineFixtureResult),
  invalidTeamIsNotCalculated: invalidTeamFixtureResult.calculationStatus === "SKIPPED_INVALID_TEAM"
    && invalidTeamFixtureResult.team === null,
} as const;

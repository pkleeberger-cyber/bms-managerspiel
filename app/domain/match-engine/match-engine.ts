import { POSITION_ORDER } from "../lineup-engine";
import type {
  CalculatedMatchLineupResult,
  PlayerPosition,
} from "../lineup-engine";

import type {
  CalculateMatchResultInput,
  MatchOutcome,
  MatchPlayerPerformance,
  MatchResult,
  MatchTeamLine,
  MatchTeamSide,
  ValidatedMatchResultInput,
} from "./types";

export class MatchCalculationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MatchCalculationError";
  }
}

function assertCalculatedTeam(
  team: CalculateMatchResultInput["homeTeam"],
  side: MatchTeamSide,
  competitionId: string,
  matchday: number,
): asserts team is CalculatedMatchLineupResult {
  if (team.calculationStatus !== "CALCULATED") {
    throw new MatchCalculationError(`${side} team has no calculated lineup result`);
  }

  if (team.competitionId !== competitionId) {
    throw new MatchCalculationError(`${side} team belongs to competition ${team.competitionId}, expected ${competitionId}`);
  }

  if (team.matchday !== matchday) {
    throw new MatchCalculationError(`${side} team belongs to matchday ${team.matchday}, expected ${matchday}`);
  }
}

function validateInput(input: CalculateMatchResultInput): ValidatedMatchResultInput {
  if (!Number.isInteger(input.matchday) || input.matchday < 1) {
    throw new MatchCalculationError(`Invalid matchday: ${input.matchday}`);
  }

  if (!input.competitionId) {
    throw new MatchCalculationError("Competition ID is required");
  }

  assertCalculatedTeam(input.homeTeam, "HOME", input.competitionId, input.matchday);
  assertCalculatedTeam(input.awayTeam, "AWAY", input.competitionId, input.matchday);

  return {
    ...input,
    homeTeam: input.homeTeam,
    awayTeam: input.awayTeam,
  };
}

function getOutcome(homeGoals: number, awayGoals: number): MatchOutcome {
  if (homeGoals > awayGoals) {
    return "HOME_WIN";
  }

  if (homeGoals < awayGoals) {
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

function getPositionComparison(
  homeTeam: CalculatedMatchLineupResult,
  awayTeam: CalculatedMatchLineupResult,
): Record<PlayerPosition, number> {
  return {
    goalkeeper: homeTeam.team.positionTotals.goalkeeper - awayTeam.team.positionTotals.goalkeeper,
    defender: homeTeam.team.positionTotals.defender - awayTeam.team.positionTotals.defender,
    midfielder: homeTeam.team.positionTotals.midfielder - awayTeam.team.positionTotals.midfielder,
    forward: homeTeam.team.positionTotals.forward - awayTeam.team.positionTotals.forward,
  };
}

function getPlayerPerformance(
  homeTeam: CalculatedMatchLineupResult,
  awayTeam: CalculatedMatchLineupResult,
  direction: "best" | "worst",
): MatchPlayerPerformance | null {
  const players: MatchPlayerPerformance[] = [
    ...homeTeam.evaluatedPlayers.map((player) => ({ team: "HOME" as const, player })),
    ...awayTeam.evaluatedPlayers.map((player) => ({ team: "AWAY" as const, player })),
  ];

  if (players.length === 0) {
    return null;
  }

  return players.sort((first, second) => {
    const pointDifference = direction === "best"
      ? second.player.totalPoints - first.player.totalPoints
      : first.player.totalPoints - second.player.totalPoints;
    const teamDifference = first.team === second.team ? 0 : first.team === "HOME" ? -1 : 1;

    return pointDifference || teamDifference || first.player.lineupId - second.player.lineupId;
  })[0];
}

function getTeamLine(
  homeTeam: CalculatedMatchLineupResult,
  awayTeam: CalculatedMatchLineupResult,
  direction: "best" | "worst",
): MatchTeamLine {
  const lines: MatchTeamLine[] = [
    ...POSITION_ORDER.map((position) => ({
      team: "HOME" as const,
      position,
      points: homeTeam.team.positionTotals[position],
    })),
    ...POSITION_ORDER.map((position) => ({
      team: "AWAY" as const,
      position,
      points: awayTeam.team.positionTotals[position],
    })),
  ];

  return lines.sort((first, second) => {
    const pointDifference = direction === "best"
      ? second.points - first.points
      : first.points - second.points;
    const teamDifference = first.team === second.team ? 0 : first.team === "HOME" ? -1 : 1;

    return pointDifference
      || teamDifference
      || POSITION_ORDER.indexOf(first.position) - POSITION_ORDER.indexOf(second.position);
  })[0];
}

function getScoringTeam(homeGoals: number, awayGoals: number, direction: "highest" | "lowest"): MatchTeamSide | "TIED" {
  if (homeGoals === awayGoals) {
    return "TIED";
  }

  const homeMatchesDirection = direction === "highest" ? homeGoals > awayGoals : homeGoals < awayGoals;

  return homeMatchesDirection ? "HOME" : "AWAY";
}

export function calculateMatchResult(input: CalculateMatchResultInput): MatchResult {
  const { homeTeam, awayTeam, competitionId, matchday } = validateInput(input);
  const homeGoals = homeTeam.team.totalPoints;
  const awayGoals = awayTeam.team.totalPoints;
  const outcome = getOutcome(homeGoals, awayGoals);
  const leaguePoints = getLeaguePoints(outcome);

  return {
    competitionId,
    matchday,
    outcome,
    winner: outcome === "DRAW"
      ? null
      : {
          side: outcome === "HOME_WIN" ? "HOME" : "AWAY",
          managerId: outcome === "HOME_WIN" ? homeTeam.managerId : awayTeam.managerId,
        },
    fantasyGoals: {
      home: homeGoals,
      away: awayGoals,
    },
    leaguePoints,
    teams: {
      home: {
        managerId: homeTeam.managerId,
        fantasyGoalsFor: homeGoals,
        fantasyGoalsAgainst: awayGoals,
        fantasyGoalDifference: homeGoals - awayGoals,
        leaguePoints: leaguePoints.home,
      },
      away: {
        managerId: awayTeam.managerId,
        fantasyGoalsFor: awayGoals,
        fantasyGoalsAgainst: homeGoals,
        fantasyGoalDifference: awayGoals - homeGoals,
        leaguePoints: leaguePoints.away,
      },
    },
    positionComparison: getPositionComparison(homeTeam, awayTeam),
    topPerformers: {
      bestPlayer: getPlayerPerformance(homeTeam, awayTeam, "best"),
      worstPlayer: getPlayerPerformance(homeTeam, awayTeam, "worst"),
      bestTeamLine: getTeamLine(homeTeam, awayTeam, "best"),
      worstTeamLine: getTeamLine(homeTeam, awayTeam, "worst"),
      highestScoringTeam: getScoringTeam(homeGoals, awayGoals, "highest"),
      lowestScoringTeam: getScoringTeam(homeGoals, awayGoals, "lowest"),
    },
  };
}

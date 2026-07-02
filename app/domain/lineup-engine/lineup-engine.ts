import {
  BACKUP_IDS_BY_POSITION,
  OFFICIAL_STARTER_IDS,
  POSITION_ORDER,
  getPositionForLineupId,
} from "./lineup-structure";
import {
  calculatePointBreakdown,
  getEffectiveRating,
  isValidKickerRating,
  sumPointBreakdown,
} from "./scoring";
import { createDefaultCompetitionScoringConfig } from "./scoring-config";
import { getEffectiveSquad } from "./squad-resolver";
import type {
  BackupLineupId,
  CalculateMatchLineupInput,
  CalculatedMatchLineupResult,
  CalculatedPlayer,
  CalculatedTeam,
  CompetitionScoringConfig,
  InvalidMatchLineupResult,
  LineupId,
  LineupReplacement,
  LineupStatistics,
  ManagerMatchdayPenalty,
  MatchLineupResult,
  PlayerLineup,
  PlayerMatchData,
  PlayerPosition,
  PositionTotals,
  StarterLineupId,
} from "./types";

function createMatchDataMap(matchData: readonly PlayerMatchData[]): Map<string, PlayerMatchData> {
  const matchDataByPlayerId = new Map<string, PlayerMatchData>();

  for (const playerMatchData of matchData) {
    if (playerMatchData.goals < 0 || !Number.isInteger(playerMatchData.goals)) {
      throw new Error(`Goals must be a non-negative integer for player ${playerMatchData.playerId}`);
    }

    if (matchDataByPlayerId.has(playerMatchData.playerId)) {
      throw new Error(`Duplicate match data for player: ${playerMatchData.playerId}`);
    }

    matchDataByPlayerId.set(playerMatchData.playerId, playerMatchData);
  }

  return matchDataByPlayerId;
}

function createPlayerByLineupId(players: readonly PlayerLineup[]): Map<LineupId, PlayerLineup> {
  return new Map(players.map((player) => [player.lineupId, player]));
}

function calculatePlayer(
  player: PlayerLineup,
  matchData: PlayerMatchData,
  evaluatedForLineupId: StarterLineupId,
  scoringConfig: CompetitionScoringConfig,
): CalculatedPlayer | null {
  const effectiveRating = getEffectiveRating(matchData, scoringConfig);

  if (!effectiveRating) {
    return null;
  }

  const position = getPositionForLineupId(player.lineupId);
  const points = calculatePointBreakdown(
    position,
    effectiveRating.rating,
    matchData,
    scoringConfig,
    effectiveRating.source,
  );

  return {
    lineupId: player.lineupId,
    evaluatedForLineupId,
    playerId: player.playerId,
    playerName: player.playerName,
    position,
    kickerRating: effectiveRating.rating,
    usedAutomaticRating: effectiveRating.usedAutomaticRating,
    wasReplacement: player.lineupId !== evaluatedForLineupId,
    matchData: {
      goals: matchData.goals,
      yellowRedCard: matchData.yellowRedCard,
      redCard: matchData.redCard,
      teamOfTheWeek: matchData.teamOfTheWeek,
    },
    points,
    totalPoints: sumPointBreakdown(points),
  };
}

function getPositionTotals(players: readonly CalculatedPlayer[]): PositionTotals {
  const totals: PositionTotals = {
    goalkeeper: 0,
    defender: 0,
    midfielder: 0,
    forward: 0,
  };

  for (const player of players) {
    totals[player.position] += player.totalPoints;
  }

  return totals;
}

function getPlayerByPoints(players: readonly CalculatedPlayer[], direction: "best" | "worst"): CalculatedPlayer | null {
  if (players.length === 0) {
    return null;
  }

  return [...players].sort((first, second) => {
    const pointDifference = direction === "best"
      ? second.totalPoints - first.totalPoints
      : first.totalPoints - second.totalPoints;

    return pointDifference || first.lineupId - second.lineupId;
  })[0];
}

function getPositionByTotal(positionTotals: PositionTotals, direction: "strongest" | "weakest"): PlayerPosition {
  return [...POSITION_ORDER].sort((first, second) => {
    const pointDifference = direction === "strongest"
      ? positionTotals[second] - positionTotals[first]
      : positionTotals[first] - positionTotals[second];

    return pointDifference || POSITION_ORDER.indexOf(first) - POSITION_ORDER.indexOf(second);
  })[0];
}

function isValidPeriod(validFromMatchday: number, validToMatchday: number | null): boolean {
  return Number.isInteger(validFromMatchday)
    && validFromMatchday >= 1
    && (
      validToMatchday === null
      || (Number.isInteger(validToMatchday) && validToMatchday >= validFromMatchday)
    );
}

export function getApplicablePenalties(
  penalties: readonly ManagerMatchdayPenalty[],
  managerId: string,
  competitionId: string,
  matchday: number,
): ManagerMatchdayPenalty[] {
  return penalties.filter((penalty) => {
    if (!isValidPeriod(penalty.validFromMatchday, penalty.validToMatchday)) {
      throw new Error(`Invalid penalty period: ${penalty.reason}`);
    }

    if (!Number.isFinite(penalty.points)) {
      throw new Error(`Invalid penalty points: ${penalty.reason}`);
    }

    return penalty.managerId === managerId
      && penalty.competitionId === competitionId
      && penalty.validFromMatchday <= matchday
      && (penalty.validToMatchday === null || penalty.validToMatchday >= matchday);
  });
}

function calculateResolvedLineup(
  players: readonly PlayerLineup[],
  matchData: readonly PlayerMatchData[],
  appliedPenalties: readonly ManagerMatchdayPenalty[],
  scoringConfig: CompetitionScoringConfig,
): {
  evaluatedPlayers: CalculatedPlayer[];
  team: CalculatedTeam;
  replacements: LineupReplacement[];
  statistics: LineupStatistics;
} {
  const playerByLineupId = createPlayerByLineupId(players);
  const matchDataByPlayerId = createMatchDataMap(matchData);
  const usedReplacementIds = new Set<BackupLineupId>();
  const evaluatedPlayers: CalculatedPlayer[] = [];
  const replacements: LineupReplacement[] = [];

  for (const starterLineupId of OFFICIAL_STARTER_IDS) {
    const position = getPositionForLineupId(starterLineupId);
    const starter = playerByLineupId.get(starterLineupId);
    const starterMatchData = starter ? matchDataByPlayerId.get(starter.playerId) : undefined;
    const calculatedStarter = starter && starterMatchData
      ? calculatePlayer(
          starter,
          starterMatchData,
          starterLineupId,
          scoringConfig,
        )
      : null;

    if (calculatedStarter) {
      evaluatedPlayers.push(calculatedStarter);
      continue;
    }

    const replacement = BACKUP_IDS_BY_POSITION[position]
      .filter((backupLineupId) => !usedReplacementIds.has(backupLineupId))
      .flatMap((backupLineupId) => {
        const backup = playerByLineupId.get(backupLineupId);
        const backupMatchData = backup ? matchDataByPlayerId.get(backup.playerId) : undefined;
        const calculatedBackup = backup && backupMatchData
          ? calculatePlayer(
              backup,
              backupMatchData,
              starterLineupId,
              scoringConfig,
            )
          : null;

        return calculatedBackup ? [{ backupLineupId, calculatedBackup }] : [];
      })[0];

    if (replacement) {
      usedReplacementIds.add(replacement.backupLineupId);
      evaluatedPlayers.push(replacement.calculatedBackup);
    }

    replacements.push({
      starterLineupId,
      replacementLineupId: replacement?.backupLineupId ?? null,
      position,
    });
  }

  const positionTotals = getPositionTotals(evaluatedPlayers);
  const playerPoints = Object.values(positionTotals).reduce((total, points) => total + points, 0);
  const manualPenaltyPoints = appliedPenalties.reduce((total, penalty) => total + penalty.points, 0);

  return {
    evaluatedPlayers,
    team: {
      positionTotals,
      playerPoints,
      manualPenaltyPoints,
      totalPoints: playerPoints + manualPenaltyPoints,
    },
    replacements,
    statistics: {
      bestPlayer: getPlayerByPoints(evaluatedPlayers, "best"),
      worstPlayer: getPlayerByPoints(evaluatedPlayers, "worst"),
      strongestPositionGroup: evaluatedPlayers.length > 0 ? getPositionByTotal(positionTotals, "strongest") : null,
      weakestPositionGroup: evaluatedPlayers.length > 0 ? getPositionByTotal(positionTotals, "weakest") : null,
      startersReplaced: replacements.filter((replacement) => replacement.replacementLineupId !== null).length,
      unevaluatedPositions: OFFICIAL_STARTER_IDS.length - evaluatedPlayers.length,
    },
  };
}

export function calculateMatchLineup(
  input: CalculateMatchLineupInput & { teamValidity: "VALID" },
): CalculatedMatchLineupResult;
export function calculateMatchLineup(
  input: CalculateMatchLineupInput & { teamValidity: "INVALID" },
): InvalidMatchLineupResult;
export function calculateMatchLineup(input: CalculateMatchLineupInput): MatchLineupResult;
export function calculateMatchLineup(input: CalculateMatchLineupInput): MatchLineupResult {
  const scoringConfig = input.scoringConfig
    ?? createDefaultCompetitionScoringConfig(input.competitionId);

  if (scoringConfig.competitionId !== input.competitionId) {
    throw new Error(
      `Scoring config belongs to ${scoringConfig.competitionId}, expected ${input.competitionId}`,
    );
  }

  const phaseOrRoundId = scoringConfig.phaseId ?? scoringConfig.roundId;

  if (!phaseOrRoundId.trim()) {
    throw new Error("Scoring config requires a non-empty phase or round ID");
  }

  if (
    scoringConfig.defaultRatingIfNoRating !== undefined
    && !isValidKickerRating(scoringConfig.defaultRatingIfNoRating)
  ) {
    throw new Error(
      `Invalid default rating: ${scoringConfig.defaultRatingIfNoRating}`,
    );
  }

  const effectiveSquad = getEffectiveSquad({
    managerId: input.managerId,
    competitionId: input.competitionId,
    matchday: input.matchday,
    assignments: input.assignments,
  });
  const appliedPenalties = getApplicablePenalties(
    input.penalties ?? [],
    input.managerId,
    input.competitionId,
    input.matchday,
  );

  if (input.teamValidity === "INVALID") {
    return {
      managerId: input.managerId,
      competitionId: input.competitionId,
      matchday: input.matchday,
      teamValidity: "INVALID",
      calculationStatus: "SKIPPED_INVALID_TEAM",
      effectiveSquad,
      appliedPenalties,
      evaluatedPlayers: [],
      team: null,
      replacements: [],
      statistics: null,
    };
  }

  const result = calculateResolvedLineup(
    effectiveSquad.players,
    input.matchData,
    appliedPenalties,
    scoringConfig,
  );

  return {
    managerId: input.managerId,
    competitionId: input.competitionId,
    matchday: input.matchday,
    teamValidity: "VALID",
    calculationStatus: "CALCULATED",
    effectiveSquad,
    appliedPenalties,
    ...result,
  };
}

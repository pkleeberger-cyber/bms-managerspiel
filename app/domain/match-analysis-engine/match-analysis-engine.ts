import {
  OFFICIAL_LINEUP_IDS,
  OFFICIAL_STARTER_IDS,
  POSITION_ORDER,
  getPositionForLineupId,
} from "../lineup-engine";
import type {
  CalculatedMatchLineupResult,
  CalculatedPlayer,
  PositionTotals,
  StarterLineupId,
} from "../lineup-engine";
import type { MatchTeamSide } from "../match-engine";
import type { OfficialMatchdayResult } from "../matchday-engine";
import type { BmsRule, OfficialMatchResult } from "../rules-engine";
import type {
  AnalysisPlayer,
  AnalysisTeam,
  AnalysisWinner,
  AppliedRule,
  MatchAnalysis,
  MissingPosition,
  PlayerComparison,
  PlayerSelection,
  PositionAdvantage,
  PositionDuel,
  ScoringLine,
} from "./types";

export class MatchAnalysisError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MatchAnalysisError";
  }
}

function getWinner(homePoints: number, awayPoints: number): AnalysisWinner {
  if (homePoints > awayPoints) {
    return "HOME";
  }

  if (homePoints < awayPoints) {
    return "AWAY";
  }

  return "TIED";
}

function toAnalysisPlayer(player: CalculatedPlayer): AnalysisPlayer {
  return {
    slotId: player.evaluatedForLineupId,
    sourceSlotId: player.lineupId,
    playerId: player.playerId,
    playerName: player.playerName,
    position: player.position,
    rating: player.kickerRating,
    goals: player.matchData.goals,
    yellowRedCard: player.matchData.yellowRedCard,
    redCard: player.matchData.redCard,
    teamOfTheWeek: player.matchData.teamOfTheWeek,
    ratingPoints: player.points.rating,
    appearancePoints: player.points.appearance,
    goalPoints: player.points.goals,
    cardPoints: player.points.cards,
    teamOfWeekPoints: player.points.teamOfTheWeek,
    totalPoints: player.totalPoints,
    wasReplacement: player.wasReplacement,
    usedAutomaticRating: player.usedAutomaticRating,
  };
}

function indexPlayersByOccupiedSlot(
  players: readonly AnalysisPlayer[],
  side: MatchTeamSide,
): Map<StarterLineupId, AnalysisPlayer> {
  const indexed = new Map<StarterLineupId, AnalysisPlayer>();

  for (const player of players) {
    if (indexed.has(player.slotId)) {
      throw new MatchAnalysisError(
        `${side} lineup contains multiple evaluated players for slot ${player.slotId}`,
      );
    }

    indexed.set(player.slotId, player);
  }

  return indexed;
}

function createPlayerComparisons(
  homePlayers: readonly AnalysisPlayer[],
  awayPlayers: readonly AnalysisPlayer[],
): PlayerComparison[] {
  const homeBySlot = indexPlayersByOccupiedSlot(homePlayers, "HOME");
  const awayBySlot = indexPlayersByOccupiedSlot(awayPlayers, "AWAY");

  return OFFICIAL_STARTER_IDS.map((slotId) => {
    const homePlayer = homeBySlot.get(slotId) ?? null;
    const awayPlayer = awayBySlot.get(slotId) ?? null;
    const homePoints = homePlayer?.totalPoints ?? 0;
    const awayPoints = awayPlayer?.totalPoints ?? 0;

    return {
      slotId,
      homePlayer,
      awayPlayer,
      winner: getWinner(homePoints, awayPoints),
      pointDifference: homePoints - awayPoints,
    };
  });
}

function createPositionAnalysis(
  homeTotals: PositionTotals,
  awayTotals: PositionTotals,
): PositionDuel[] {
  return POSITION_ORDER.map((position) => ({
    position,
    homePoints: homeTotals[position],
    awayPoints: awayTotals[position],
    difference: homeTotals[position] - awayTotals[position],
    winner: getWinner(homeTotals[position], awayTotals[position]),
  }));
}

function selectPlayer(
  players: readonly AnalysisPlayer[],
  direction: "BEST" | "WORST",
): AnalysisPlayer | null {
  return players.reduce<AnalysisPlayer | null>((selected, player) => {
    if (!selected) {
      return player;
    }

    if (direction === "BEST" && player.totalPoints > selected.totalPoints) {
      return player;
    }

    if (direction === "WORST" && player.totalPoints < selected.totalPoints) {
      return player;
    }

    return selected;
  }, null);
}

function selectOverallMatchwinner(
  homePlayer: AnalysisPlayer | null,
  awayPlayer: AnalysisPlayer | null,
): PlayerSelection | null {
  if (!homePlayer && !awayPlayer) {
    return null;
  }

  if (!awayPlayer || (homePlayer && homePlayer.totalPoints > awayPlayer.totalPoints)) {
    return {
      side: "HOME",
      player: homePlayer as AnalysisPlayer,
    };
  }

  if (!homePlayer || awayPlayer.totalPoints > homePlayer.totalPoints) {
    return {
      side: "AWAY",
      player: awayPlayer,
    };
  }

  return null;
}

function selectBiggestDuel(
  comparisons: readonly PlayerComparison[],
): MatchAnalysis["matchWinners"]["biggestIndividualDuel"] {
  return comparisons.reduce<MatchAnalysis["matchWinners"]["biggestIndividualDuel"]>(
    (selected, comparison) => {
      if (!comparison.homePlayer && !comparison.awayPlayer) {
        return selected;
      }

      const absolutePointDifference = Math.abs(comparison.pointDifference);

      if (!selected || absolutePointDifference > selected.absolutePointDifference) {
        return {
          comparison,
          absolutePointDifference,
        };
      }

      return selected;
    },
    null,
  );
}

function getPositionFactors(positionAnalysis: readonly PositionDuel[]): {
  largestPositionAdvantage: PositionAdvantage | null;
  largestPositionDisadvantage: PositionAdvantage | null;
} {
  let largestPositionAdvantage: PositionAdvantage | null = null;
  let largestPositionDisadvantage: PositionAdvantage | null = null;

  for (const duel of positionAnalysis) {
    if (
      duel.difference > 0
      && (!largestPositionAdvantage || duel.difference > largestPositionAdvantage.points)
    ) {
      largestPositionAdvantage = {
        position: duel.position,
        side: "HOME",
        points: duel.difference,
      };
    }

    if (
      duel.difference < 0
      && (!largestPositionDisadvantage || -duel.difference > largestPositionDisadvantage.points)
    ) {
      largestPositionDisadvantage = {
        position: duel.position,
        side: "HOME",
        points: -duel.difference,
      };
    }
  }

  return {
    largestPositionAdvantage,
    largestPositionDisadvantage,
  };
}

function selectScoringLine(
  positionAnalysis: readonly PositionDuel[],
  direction: "HIGHEST" | "LOWEST",
): ScoringLine {
  const lines = positionAnalysis.flatMap((duel): ScoringLine[] => [
    { position: duel.position, side: "HOME", points: duel.homePoints },
    { position: duel.position, side: "AWAY", points: duel.awayPoints },
  ]);

  return lines.reduce((selected, line) => {
    if (direction === "HIGHEST" && line.points > selected.points) {
      return line;
    }

    if (direction === "LOWEST" && line.points < selected.points) {
      return line;
    }

    return selected;
  });
}

function getMissingPositions(
  lineup: CalculatedMatchLineupResult,
  side: MatchTeamSide,
): MissingPosition[] {
  return lineup.replacements
    .filter((replacement) => replacement.replacementLineupId === null)
    .map((replacement) => ({
      side,
      slotId: replacement.starterLineupId,
      position: replacement.position,
    }));
}

function getLineupWarnings(
  lineup: CalculatedMatchLineupResult,
  side: MatchTeamSide,
): MatchAnalysis["matchFactors"]["lineupWarnings"] {
  const occupiedSlots = new Set(
    lineup.effectiveSquad.players.map((player) => player.lineupId),
  );

  return OFFICIAL_LINEUP_IDS
    .filter((slotId) => !occupiedSlots.has(slotId))
    .map((slotId) => ({
      side,
      slotId,
      position: getPositionForLineupId(slotId),
      message: `Slot ${slotId} fehlt / nicht gewertet`,
    }));
}

function ruleTargetsMatch(
  rule: BmsRule,
  officialResult: OfficialMatchResult,
): boolean {
  if (officialResult.appliedRuleIds.includes(rule.id)) {
    return true;
  }

  if (rule.type !== "ADMIN_NOTE") {
    return false;
  }

  const homeManagerId = officialResult.teams.home.managerId;
  const awayManagerId = officialResult.teams.away.managerId;

  return rule.managerId === homeManagerId
    || rule.managerId === awayManagerId
    || (
      rule.homeManagerId === homeManagerId
      && rule.awayManagerId === awayManagerId
    );
}

function getAppliedRules(
  matchday: OfficialMatchdayResult,
  officialResult: OfficialMatchResult,
): AppliedRule[] {
  return matchday.appliedRules
    .filter((rule) => ruleTargetsMatch(rule, officialResult))
    .map((rule) => ({
      rule,
      audit: matchday.auditTrail.find((entry) => (
        entry.ruleId === rule.id
        && entry.homeManagerId === officialResult.teams.home.managerId
        && entry.awayManagerId === officialResult.teams.away.managerId
      )) ?? null,
    }));
}

function getTeam(
  matchday: OfficialMatchdayResult,
  lineup: CalculatedMatchLineupResult,
  officialResult: OfficialMatchResult,
  side: "home" | "away",
): AnalysisTeam {
  const managerId = officialResult.teams[side].managerId;
  const tableRow = matchday.officialLeagueTable.rows.find(
    (row) => row.managerId === managerId,
  );

  if (!tableRow) {
    throw new MatchAnalysisError(`Official league table is missing manager ${managerId}`);
  }

  return {
    managerId,
    teamId: tableRow.teamId,
    teamName: tableRow.teamName,
    managerName: tableRow.managerName,
    officialScore: officialResult.officialGoals[side],
    leaguePoints: officialResult.leaguePoints[side],
    totalPoints: lineup.team.totalPoints,
    manualPenaltyPoints: lineup.team.manualPenaltyPoints,
  };
}

function assertCalculatedLineup(
  lineup: OfficialMatchdayResult["calculatedMatchday"]["calculatedLineups"][number]["homeTeam"],
  side: MatchTeamSide,
): asserts lineup is CalculatedMatchLineupResult {
  if (lineup.calculationStatus !== "CALCULATED") {
    throw new MatchAnalysisError(`${side} lineup was not calculated`);
  }
}

export function createMatchAnalysis(
  matchday: OfficialMatchdayResult,
  fixtureId: string,
): MatchAnalysis {
  const fixture = matchday.calculatedMatchday.calculatedLineups.find(
    (candidate) => candidate.fixtureId === fixtureId,
  );

  if (!fixture) {
    throw new MatchAnalysisError(`Unknown fixture ID: ${fixtureId}`);
  }

  assertCalculatedLineup(fixture.homeTeam, "HOME");
  assertCalculatedLineup(fixture.awayTeam, "AWAY");

  const officialResult = matchday.officialResults.find((result) => (
    result.teams.home.managerId === fixture.homeTeam.managerId
    && result.teams.away.managerId === fixture.awayTeam.managerId
  ));

  if (!officialResult) {
    throw new MatchAnalysisError(`Official result is missing for fixture ${fixtureId}`);
  }

  const homePlayers = fixture.homeTeam.evaluatedPlayers.map(toAnalysisPlayer);
  const awayPlayers = fixture.awayTeam.evaluatedPlayers.map(toAnalysisPlayer);
  const playerComparisons = createPlayerComparisons(homePlayers, awayPlayers);
  const positionAnalysis = createPositionAnalysis(
    fixture.homeTeam.team.positionTotals,
    fixture.awayTeam.team.positionTotals,
  );
  const bestPlayerHome = selectPlayer(homePlayers, "BEST");
  const bestPlayerAway = selectPlayer(awayPlayers, "BEST");
  const positionFactors = getPositionFactors(positionAnalysis);
  const winner = officialResult.winner?.side ?? null;

  return {
    fixtureId,
    competitionId: matchday.metadata.competitionId,
    matchday: matchday.metadata.matchday,
    calculationTimestamp: matchday.metadata.calculationTimestamp,
    publicationTimestamp: matchday.metadata.publicationTimestamp,
    homeTeam: getTeam(matchday, fixture.homeTeam, officialResult, "home"),
    awayTeam: getTeam(matchday, fixture.awayTeam, officialResult, "away"),
    officialScore: { ...officialResult.officialGoals },
    calculatedScore: { ...officialResult.calculatedGoals },
    outcome: officialResult.outcome,
    winner,
    players: {
      home: homePlayers,
      away: awayPlayers,
    },
    playerComparisons,
    positionAnalysis,
    matchWinners: {
      bestPlayerHome,
      bestPlayerAway,
      overallMatchwinner: selectOverallMatchwinner(bestPlayerHome, bestPlayerAway),
      worstPlayerHome: selectPlayer(homePlayers, "WORST"),
      worstPlayerAway: selectPlayer(awayPlayers, "WORST"),
      biggestIndividualDuel: selectBiggestDuel(playerComparisons),
    },
    matchFactors: {
      ...positionFactors,
      highestScoringLine: selectScoringLine(positionAnalysis, "HIGHEST"),
      lowestScoringLine: selectScoringLine(positionAnalysis, "LOWEST"),
      replacementPlayerCount: [...homePlayers, ...awayPlayers].filter(
        (player) => player.wasReplacement,
      ).length,
      missingPositions: [
        ...getMissingPositions(fixture.homeTeam, "HOME"),
        ...getMissingPositions(fixture.awayTeam, "AWAY"),
      ],
      lineupWarnings: [
        ...getLineupWarnings(fixture.homeTeam, "HOME"),
        ...getLineupWarnings(fixture.awayTeam, "AWAY"),
      ],
      appliedRules: getAppliedRules(matchday, officialResult),
      manualPenalties: [
        ...fixture.homeTeam.appliedPenalties.map((penalty) => ({
          side: "HOME" as const,
          penalty,
        })),
        ...fixture.awayTeam.appliedPenalties.map((penalty) => ({
          side: "AWAY" as const,
          penalty,
        })),
      ],
    },
  };
}

import type { OfficialMatchdayResult } from "../matchday-engine";
import type { MatchAnalysis } from "../match-analysis-engine";
import type { TeamOverviewData, TeamOverviewMatchResult } from "./types";

export class TeamOverviewError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TeamOverviewError";
  }
}

function getMatchResult(
  analysis: MatchAnalysis,
  managerId: string,
): TeamOverviewMatchResult {
  if (!analysis.winner) {
    return "DRAW";
  }

  const winnerManagerId = analysis.winner === "HOME"
    ? analysis.homeTeam.managerId
    : analysis.awayTeam.managerId;

  return winnerManagerId === managerId ? "WIN" : "LOSS";
}

export function createTeamOverviewData(
  officialMatchday: OfficialMatchdayResult,
  analysis: MatchAnalysis,
  managerId: string,
): TeamOverviewData {
  if (analysis.homeTeam.managerId !== managerId) {
    throw new TeamOverviewError(
      "The current team overview fixture expects the manager to be the home team",
    );
  }

  const leagueRow = officialMatchday.officialLeagueTable.rows.find(
    (row) => row.managerId === managerId,
  );

  if (!leagueRow) {
    throw new TeamOverviewError(`Official league table is missing manager ${managerId}`);
  }

  return {
    competitionId: officialMatchday.metadata.competitionId,
    matchday: officialMatchday.metadata.matchday,
    lastMatch: {
      result: getMatchResult(analysis, managerId),
      homeTeamName: analysis.homeTeam.teamName,
      awayTeamName: analysis.awayTeam.teamName,
      homeScore: analysis.officialScore.home,
      awayScore: analysis.officialScore.away,
      officialResultAdjusted: analysis.matchFactors.appliedRules.length > 0,
      href: `/team/spiele/${analysis.matchday}/analyse`,
    },
    league: {
      position: leagueRow.position,
      previousPosition: leagueRow.previousPosition,
      positionChange: leagueRow.positionChange,
      leaguePoints: leagueRow.leaguePoints,
      form: [...leagueRow.formLastFive],
    },
    nextMatch: {
      status: "NOT_SCHEDULED",
    },
    analysis: {
      why: analysis.matchFactors.largestPositionDisadvantage,
      positionDuels: [...analysis.positionAnalysis],
      bestPlayer: analysis.matchWinners.bestPlayerHome,
      disappointment: analysis.matchWinners.worstPlayerHome,
      replacementPlayerCount: analysis.matchFactors.replacementPlayerCount,
      missingPositionCount: analysis.matchFactors.missingPositions.length,
      biggestDuelSlot:
        analysis.matchWinners.biggestIndividualDuel?.comparison.slotId ?? null,
      manualPenaltyCount: analysis.matchFactors.manualPenalties.length,
    },
  };
}

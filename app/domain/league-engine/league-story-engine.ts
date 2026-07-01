import {
  generateLeagueEvents,
  getHeroEvent,
  rankEvents,
} from "../../services/event-engine";
import type {
  LeagueFixtureInput,
  LeagueStandingInput,
} from "../../services/event-engine";
import type { MatchResult } from "../match-engine";
import { calculateLeagueTable } from "./league-engine";
import type {
  CalculateLeagueStoryInput,
  CalculateLeagueStoryFromUpdatedTableInput,
  LeagueContext,
  LeaguePositionJump,
  LeagueScoringContext,
  LeagueStoryResult,
  LeagueTableRow,
  PreviousLeagueTableRow,
} from "./types";

export class LeagueStoryCalculationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LeagueStoryCalculationError";
  }
}

function getPreviousLeader(rows: readonly PreviousLeagueTableRow[]): PreviousLeagueTableRow {
  const rankedRows = rows
    .filter((row): row is PreviousLeagueTableRow & { position: number } => row.position !== undefined)
    .sort((first, second) => first.position - second.position);
  const leader = rankedRows[0];

  if (!leader) {
    throw new LeagueStoryCalculationError("Previous league table has no ranked leader");
  }

  return leader;
}

function createStandingInput(rows: readonly LeagueTableRow[]): LeagueStandingInput[] {
  return rows.map((row) => ({
    teamId: row.teamId,
    managerId: row.managerId,
    teamName: row.teamName,
    managerName: row.managerName,
    rank: row.position,
    previousRank: row.previousPosition ?? undefined,
    points: row.leaguePoints,
  }));
}

function createPreviousStandingInput(rows: readonly PreviousLeagueTableRow[]): LeagueStandingInput[] {
  return rows.flatMap((row) => {
    if (row.position === undefined) {
      return [];
    }

    return [{
      teamId: row.teamId,
      managerId: row.managerId,
      teamName: row.teamName,
      managerName: row.managerName,
      rank: row.position,
      points: row.leaguePoints,
    }];
  });
}

function createFixtureInput(
  results: readonly MatchResult[],
  previousRows: readonly PreviousLeagueTableRow[],
): LeagueFixtureInput[] {
  const previousRowByManagerId = new Map(previousRows.map((row) => [row.managerId, row]));

  return results.map((result) => {
    const home = previousRowByManagerId.get(result.teams.home.managerId);
    const away = previousRowByManagerId.get(result.teams.away.managerId);

    if (!home?.position || !away?.position) {
      throw new LeagueStoryCalculationError("Match result cannot be mapped to previous ranked teams");
    }

    return {
      homeTeamId: home.teamId,
      awayTeamId: away.teamId,
      homeRankBefore: home.position,
      awayRankBefore: away.position,
      homeScore: result.fantasyGoals.home,
      awayScore: result.fantasyGoals.away,
    };
  });
}

function getLargestPositionJump(rows: readonly LeagueTableRow[]): LeaguePositionJump | null {
  const jumps = rows.flatMap((row) => {
    if (row.previousPosition === null || row.previousPosition === row.position) {
      return [];
    }

    return [{
      team: row,
      from: row.previousPosition,
      to: row.position,
      places: Math.abs(row.previousPosition - row.position),
      direction: row.position < row.previousPosition ? "up" as const : "down" as const,
    }];
  });

  return jumps.sort((first, second) => {
    return second.places - first.places
      || first.to - second.to
      || (first.team.teamName < second.team.teamName ? -1 : 1);
  })[0] ?? null;
}

function getScoringContext(
  results: readonly MatchResult[],
  rows: readonly LeagueTableRow[],
  direction: "highest" | "lowest",
): LeagueScoringContext | null {
  const rowByManagerId = new Map(rows.map((row) => [row.managerId, row]));
  const scoringTeams = results.flatMap((result) => {
    const home = rowByManagerId.get(result.teams.home.managerId);
    const away = rowByManagerId.get(result.teams.away.managerId);

    return [
      ...(home ? [{ team: home, fantasyGoals: result.fantasyGoals.home }] : []),
      ...(away ? [{ team: away, fantasyGoals: result.fantasyGoals.away }] : []),
    ];
  });

  return scoringTeams.sort((first, second) => {
    const scoreDifference = direction === "highest"
      ? second.fantasyGoals - first.fantasyGoals
      : first.fantasyGoals - second.fantasyGoals;

    if (scoreDifference !== 0) {
      return scoreDifference;
    }

    return first.team.teamName < second.team.teamName ? -1 : 1;
  })[0] ?? null;
}

function getLeagueContext(
  rows: readonly LeagueTableRow[],
  results: readonly MatchResult[],
  relegationRanks: readonly number[],
): LeagueContext {
  const leader = rows[0];
  const lastPlace = rows.at(-1);

  if (!leader || !lastPlace) {
    throw new LeagueStoryCalculationError("Updated league table must contain at least one team");
  }

  const runnerUp = rows[1];
  const relegationTeams = rows.filter((row) => relegationRanks.includes(row.position));
  const relegationPoints = relegationTeams.map((row) => row.leaguePoints);

  return {
    leader,
    lastPlace,
    topFour: rows.slice(0, 4),
    relegationTeams,
    titleGap: runnerUp ? leader.leaguePoints - runnerUp.leaguePoints : 0,
    relegationGap: relegationPoints.length >= 2
      ? Math.max(...relegationPoints) - Math.min(...relegationPoints)
      : 0,
    largestPositionJump: getLargestPositionJump(rows),
    highestScoringTeam: getScoringContext(results, rows, "highest"),
    lowestScoringTeam: getScoringContext(results, rows, "lowest"),
  };
}

export function calculateLeagueStoryFromUpdatedTable(
  input: CalculateLeagueStoryFromUpdatedTableInput,
): LeagueStoryResult {
  if (
    input.updatedLeagueTable.competitionId !== input.competition.id
    || input.updatedLeagueTable.matchday !== input.matchday
  ) {
    throw new LeagueStoryCalculationError("Updated league table does not match competition and matchday");
  }

  const previousLeader = getPreviousLeader(input.previousLeagueTable);
  const generatedEvents = generateLeagueEvents({
    competitionId: input.competition.id,
    matchday: input.matchday,
    totalMatchdays: input.competition.totalMatchdays,
    pointsPerWin: input.competition.pointsPerWin,
    previousLeaderTeamId: previousLeader.teamId,
    standings: createStandingInput(input.updatedLeagueTable.rows),
    previousStandings: createPreviousStandingInput(input.previousLeagueTable),
    fixtures: createFixtureInput(input.matchResults, input.previousLeagueTable),
    europeRanks: [...input.competition.europeRanks],
    relegationRanks: [...input.competition.relegationRanks],
  });
  const allGeneratedEvents = rankEvents(generatedEvents);

  return {
    updatedLeagueTable: input.updatedLeagueTable,
    allGeneratedEvents,
    heroEvent: getHeroEvent(allGeneratedEvents),
    leagueContext: getLeagueContext(
      input.updatedLeagueTable.rows,
      input.matchResults,
      input.competition.relegationRanks,
    ),
  };
}

export function calculateLeagueStory(input: CalculateLeagueStoryInput): LeagueStoryResult {
  const updatedLeagueTable = calculateLeagueTable({
    previousLeagueTable: input.previousLeagueTable,
    matchResults: input.matchResults,
    competitionId: input.competition.id,
    matchday: input.matchday,
  });

  return calculateLeagueStoryFromUpdatedTable({
    ...input,
    updatedLeagueTable,
  });
}

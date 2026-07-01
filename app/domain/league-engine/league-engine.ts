import type { MatchOutcome, MatchResult, MatchTeamSide } from "../match-engine";
import type {
  CalculateLeagueTableInput,
  LeagueFormResult,
  LeagueTableRow,
  PositionChange,
  PreviousLeagueTableRow,
  UpdatedLeagueTable,
} from "./types";

type MutableLeagueRow = PreviousLeagueTableRow & {
  previousPosition: number | null;
};

export class LeagueCalculationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LeagueCalculationError";
  }
}

function getFormResult(outcome: MatchOutcome, side: MatchTeamSide): LeagueFormResult {
  if (outcome === "DRAW") {
    return "D";
  }

  const sideWon = (outcome === "HOME_WIN" && side === "HOME")
    || (outcome === "AWAY_WIN" && side === "AWAY");

  return sideWon ? "W" : "L";
}

function getPositionChange(previousPosition: number | null, position: number): PositionChange {
  if (previousPosition === null) {
    return "new";
  }

  if (position < previousPosition) {
    return "up";
  }

  if (position > previousPosition) {
    return "down";
  }

  return "unchanged";
}

function compareTeamNames(first: string, second: string): number {
  if (first === second) {
    return 0;
  }

  return first < second ? -1 : 1;
}

function sortLeagueRows(first: MutableLeagueRow, second: MutableLeagueRow): number {
  return second.leaguePoints - first.leaguePoints
    || second.fantasyGoalDifference - first.fantasyGoalDifference
    || second.fantasyGoalsFor - first.fantasyGoalsFor
    || compareTeamNames(first.teamName, second.teamName);
}

function validatePreviousTable(rows: readonly PreviousLeagueTableRow[]): void {
  const managerIds = new Set<string>();
  const teamIds = new Set<string>();

  for (const row of rows) {
    if (managerIds.has(row.managerId)) {
      throw new LeagueCalculationError(`Duplicate manager in previous table: ${row.managerId}`);
    }

    if (teamIds.has(row.teamId)) {
      throw new LeagueCalculationError(`Duplicate team in previous table: ${row.teamId}`);
    }

    if (row.position !== undefined && (!Number.isInteger(row.position) || row.position < 1)) {
      throw new LeagueCalculationError(`Invalid previous position for team: ${row.teamId}`);
    }

    managerIds.add(row.managerId);
    teamIds.add(row.teamId);
  }
}

function validateMatchResult(result: MatchResult, competitionId: string, matchday: number): void {
  if (result.competitionId !== competitionId) {
    throw new LeagueCalculationError(
      `Match belongs to competition ${result.competitionId}, expected ${competitionId}`,
    );
  }

  if (result.matchday !== matchday) {
    throw new LeagueCalculationError(`Match belongs to matchday ${result.matchday}, expected ${matchday}`);
  }

  // TODO: Handle invalid-team matchday penalties here after the final competition penalty rule is confirmed.
}

function applyTeamResult(
  row: MutableLeagueRow,
  result: MatchResult,
  side: MatchTeamSide,
): void {
  const teamResult = side === "HOME" ? result.teams.home : result.teams.away;
  const formResult = getFormResult(result.outcome, side);

  row.matchesPlayed += 1;
  row.wins += formResult === "W" ? 1 : 0;
  row.draws += formResult === "D" ? 1 : 0;
  row.losses += formResult === "L" ? 1 : 0;
  row.fantasyGoalsFor += teamResult.fantasyGoalsFor;
  row.fantasyGoalsAgainst += teamResult.fantasyGoalsAgainst;
  row.fantasyGoalDifference = row.fantasyGoalsFor - row.fantasyGoalsAgainst;
  row.leaguePoints += teamResult.leaguePoints;
  row.formLastFive = [...row.formLastFive, formResult].slice(-5);
}

export function calculateLeagueTable(input: CalculateLeagueTableInput): UpdatedLeagueTable {
  if (!Number.isInteger(input.matchday) || input.matchday < 1) {
    throw new LeagueCalculationError(`Invalid matchday: ${input.matchday}`);
  }

  if (!input.competitionId) {
    throw new LeagueCalculationError("Competition ID is required");
  }

  validatePreviousTable(input.previousLeagueTable);

  const rows = input.previousLeagueTable.map<MutableLeagueRow>((row) => ({
    ...row,
    formLastFive: [...row.formLastFive],
    previousPosition: row.position ?? null,
  }));
  const rowsByManagerId = new Map(rows.map((row) => [row.managerId, row]));
  const managersProcessedThisMatchday = new Set<string>();

  for (const result of input.matchResults) {
    validateMatchResult(result, input.competitionId, input.matchday);

    const homeManagerId = result.teams.home.managerId;
    const awayManagerId = result.teams.away.managerId;
    const homeRow = rowsByManagerId.get(homeManagerId);
    const awayRow = rowsByManagerId.get(awayManagerId);

    if (!homeRow || !awayRow) {
      const missingManagerId = !homeRow ? homeManagerId : awayManagerId;

      throw new LeagueCalculationError(`Manager is missing from previous table: ${missingManagerId}`);
    }

    if (managersProcessedThisMatchday.has(homeManagerId) || managersProcessedThisMatchday.has(awayManagerId)) {
      throw new LeagueCalculationError("A manager cannot appear in multiple matches on the same matchday");
    }

    managersProcessedThisMatchday.add(homeManagerId);
    managersProcessedThisMatchday.add(awayManagerId);
    applyTeamResult(homeRow, result, "HOME");
    applyTeamResult(awayRow, result, "AWAY");
  }

  const sortedRows = [...rows].sort(sortLeagueRows);
  const updatedRows: LeagueTableRow[] = sortedRows.map((row, index) => {
    const position = index + 1;
    const { previousPosition, ...tableData } = row;

    return {
      ...tableData,
      position,
      previousPosition,
      positionChange: getPositionChange(previousPosition, position),
    };
  });

  return {
    competitionId: input.competitionId,
    matchday: input.matchday,
    rows: updatedRows,
  };
}

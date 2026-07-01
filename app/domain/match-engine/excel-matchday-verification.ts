import { execFileSync } from "node:child_process";

import { excelCalculatedManagerSnapshots } from "../lineup-engine/excel-matchday-reality.fixture";

import { calculateMatchResult } from "./match-engine";
import type { MatchOutcome } from "./types";

const workbookPath = "/Users/patrickk/Downloads/TestSpieltag.xlsx";
const competitionId = "excel-full-matchday-reality";

type ParsedWorksheetRow = {
  rowNumber: number;
  cells: Record<string, string | number>;
};

export type OfficialMatchdayFixture = {
  matchday: number;
  homeManagerName: string;
  awayManagerName: string;
  homeFantasyGoals: number;
  awayFantasyGoals: number;
};

export type MatchVerification = {
  matchday: number;
  home: string;
  away: string;
  engineScore: {
    home: number;
    away: number;
  };
  excelScore: {
    home: number;
    away: number;
  };
  scoreDifference: {
    home: number;
    away: number;
  };
  scoreMatch: boolean;
  engineOutcome: MatchOutcome;
  excelOutcome: MatchOutcome;
  winnerMatch: boolean;
  engineLeaguePoints: {
    home: 0 | 1 | 3;
    away: 0 | 1 | 3;
  };
  excelLeaguePoints: {
    home: 0 | 1 | 3;
    away: 0 | 1 | 3;
  };
  leaguePointsMatch: boolean;
  goalDifferenceMatch: boolean;
};

export type MatchdayVerificationReport = {
  workbook: string;
  workbookPath: string;
  competitionId: string;
  matchday: number | null;
  matches: MatchVerification[];
  summary: {
    matchesProcessed: number;
    perfectMatches: number;
    differences: number;
    totalScoreDifference: number;
  };
};

export class ExcelMatchdayVerificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExcelMatchdayVerificationError";
  }
}

const expectedHeaders = {
  A: "spieltag",
  B: "heim",
  C: "auswarts",
  D: "hTore",
  E: "aTore",
} as const;

function readWorkbookEntry(path: string, entryPath: string): string {
  try {
    return execFileSync("unzip", ["-p", path, entryPath], {
      encoding: "utf8",
      maxBuffer: 10 * 1024 * 1024,
    });
  } catch {
    throw new ExcelMatchdayVerificationError(`Unable to read ${entryPath} from ${path}`);
  }
}

function decodeXml(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, "\"");
}

function parseSharedStrings(xml: string): string[] {
  return [...xml.matchAll(/<si>([\s\S]*?)<\/si>/g)].map((match) => (
    decodeXml(
      [...match[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)]
        .map((part) => part[1])
        .join(""),
    )
  ));
}

function parseWorksheetRows(xml: string, sharedStrings: readonly string[]): ParsedWorksheetRow[] {
  return [...xml.matchAll(/<row[^>]*r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g)].map((rowMatch) => {
    const cells: Record<string, string | number> = {};

    for (const cellMatch of rowMatch[2].matchAll(/<c[^>]*r="([A-Z]+)\d+"([^>]*)>([\s\S]*?)<\/c>/g)) {
      const valueMatch = cellMatch[3].match(/<v>([\s\S]*?)<\/v>/);

      if (!valueMatch) {
        continue;
      }

      cells[cellMatch[1]] = /t="s"/.test(cellMatch[2])
        ? sharedStrings[Number(valueMatch[1])]
        : Number(valueMatch[1]);
    }

    return {
      rowNumber: Number(rowMatch[1]),
      cells,
    };
  });
}

function getStringCell(row: ParsedWorksheetRow, column: string): string {
  const value = row.cells[column];

  if (typeof value !== "string" || value.trim() === "") {
    throw new ExcelMatchdayVerificationError(`Expected text in ${column}${row.rowNumber}`);
  }

  return value.trim();
}

function getNumberCell(row: ParsedWorksheetRow, column: string): number {
  const value = row.cells[column];

  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new ExcelMatchdayVerificationError(`Expected number in ${column}${row.rowNumber}`);
  }

  return value;
}

function parseMatchday(value: string, rowNumber: number): number {
  const match = value.match(/^(\d+)\.\s*Spieltag$/i);

  if (!match) {
    throw new ExcelMatchdayVerificationError(`Invalid matchday in A${rowNumber}: ${value}`);
  }

  return Number(match[1]);
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

export function extractOfficialMatchdayFixtures(
  path: string,
): OfficialMatchdayFixture[] {
  const sharedStrings = parseSharedStrings(
    readWorkbookEntry(path, "xl/sharedStrings.xml"),
  );
  const worksheetRows = parseWorksheetRows(
    readWorkbookEntry(path, "xl/worksheets/sheet1.xml"),
    sharedStrings,
  );
  const headerRow = worksheetRows[0];

  if (!headerRow) {
    throw new ExcelMatchdayVerificationError("Workbook worksheet is empty");
  }

  for (const [column, expectedValue] of Object.entries(expectedHeaders)) {
    if (headerRow.cells[column] !== expectedValue) {
      throw new ExcelMatchdayVerificationError(
        `Unexpected header ${column}1: ${String(headerRow.cells[column])}, expected ${expectedValue}`,
      );
    }
  }

  return worksheetRows.slice(1).map((row) => ({
    matchday: parseMatchday(getStringCell(row, "A"), row.rowNumber),
    homeManagerName: getStringCell(row, "B"),
    awayManagerName: getStringCell(row, "C"),
    homeFantasyGoals: getNumberCell(row, "D"),
    awayFantasyGoals: getNumberCell(row, "E"),
  }));
}

export function createMatchdayVerificationReport(
  fixtures: readonly OfficialMatchdayFixture[],
): MatchdayVerificationReport {
  const calculatedByManager = new Map(
    excelCalculatedManagerSnapshots.map(({ managerSnapshot, lineupResult }) => [
      managerSnapshot.managerName,
      lineupResult,
    ]),
  );
  const seenManagers = new Set<string>();
  const matches = fixtures.map((fixture) => {
    if (seenManagers.has(fixture.homeManagerName) || seenManagers.has(fixture.awayManagerName)) {
      throw new ExcelMatchdayVerificationError(
        `Manager appears in multiple fixtures: ${fixture.homeManagerName} or ${fixture.awayManagerName}`,
      );
    }

    seenManagers.add(fixture.homeManagerName);
    seenManagers.add(fixture.awayManagerName);

    const homeTeam = calculatedByManager.get(fixture.homeManagerName);
    const awayTeam = calculatedByManager.get(fixture.awayManagerName);

    if (!homeTeam || !awayTeam) {
      throw new ExcelMatchdayVerificationError(
        `Missing verified lineup result for ${!homeTeam ? fixture.homeManagerName : fixture.awayManagerName}`,
      );
    }

    if (homeTeam.matchday !== fixture.matchday || awayTeam.matchday !== fixture.matchday) {
      throw new ExcelMatchdayVerificationError(
        `Matchday mismatch for ${fixture.homeManagerName} vs ${fixture.awayManagerName}`,
      );
    }

    const result = calculateMatchResult({
      homeTeam,
      awayTeam,
      competitionId,
      matchday: fixture.matchday,
    });
    const excelOutcome = getOutcome(
      fixture.homeFantasyGoals,
      fixture.awayFantasyGoals,
    );
    const excelLeaguePoints = getLeaguePoints(excelOutcome);
    const homeDifference = result.fantasyGoals.home - fixture.homeFantasyGoals;
    const awayDifference = result.fantasyGoals.away - fixture.awayFantasyGoals;

    return {
      matchday: fixture.matchday,
      home: fixture.homeManagerName,
      away: fixture.awayManagerName,
      engineScore: result.fantasyGoals,
      excelScore: {
        home: fixture.homeFantasyGoals,
        away: fixture.awayFantasyGoals,
      },
      scoreDifference: {
        home: homeDifference,
        away: awayDifference,
      },
      scoreMatch: homeDifference === 0 && awayDifference === 0,
      engineOutcome: result.outcome,
      excelOutcome,
      winnerMatch: result.outcome === excelOutcome,
      engineLeaguePoints: result.leaguePoints,
      excelLeaguePoints,
      leaguePointsMatch:
        result.leaguePoints.home === excelLeaguePoints.home
        && result.leaguePoints.away === excelLeaguePoints.away,
      goalDifferenceMatch:
        result.teams.home.fantasyGoalDifference
          === fixture.homeFantasyGoals - fixture.awayFantasyGoals
        && result.teams.away.fantasyGoalDifference
          === fixture.awayFantasyGoals - fixture.homeFantasyGoals,
    };
  });
  const perfectMatches = matches.filter((match) => (
    match.scoreMatch
    && match.winnerMatch
    && match.leaguePointsMatch
    && match.goalDifferenceMatch
  )).length;

  return {
    workbook: "TestSpieltag.xlsx",
    workbookPath,
    competitionId,
    matchday: fixtures[0]?.matchday ?? null,
    matches,
    summary: {
      matchesProcessed: matches.length,
      perfectMatches,
      differences: matches.length - perfectMatches,
      totalScoreDifference: matches.reduce(
        (total, match) => (
          total
          + Math.abs(match.scoreDifference.home)
          + Math.abs(match.scoreDifference.away)
        ),
        0,
      ),
    },
  };
}

export const officialMatchdayFixtures = extractOfficialMatchdayFixtures(workbookPath);
export const excelMatchdayVerificationReport = createMatchdayVerificationReport(
  officialMatchdayFixtures,
);

export const excelMatchdayVerificationProof = {
  processesEveryHistoricalFixture:
    excelMatchdayVerificationReport.summary.matchesProcessed === 9,
  verifiesAllUnaffectedFixtures:
    excelMatchdayVerificationReport.summary.perfectMatches === 8,
  reportsObservedHistoricalException:
    excelMatchdayVerificationReport.summary.differences === 1
    && excelMatchdayVerificationReport.summary.totalScoreDifference === 13
    && excelMatchdayVerificationReport.matches.some((match) => (
      match.home === "Thomas"
      && match.engineScore.home === 13
      && match.excelScore.home === 0
      && match.scoreDifference.home === 13
    )),
  verifiesEveryOutcome:
    excelMatchdayVerificationReport.matches.every((match) => match.winnerMatch),
  verifiesEveryLeaguePointAssignment:
    excelMatchdayVerificationReport.matches.every((match) => match.leaguePointsMatch),
  reportsGoalDifferenceImpact:
    excelMatchdayVerificationReport.matches.filter(
      (match) => !match.goalDifferenceMatch,
    ).length === 1,
} as const;

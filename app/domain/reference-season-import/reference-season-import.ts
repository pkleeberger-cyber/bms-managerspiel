import path from "node:path";

import ExcelJS from "exceljs";

import {
  calculateMatchLineup,
  getPositionForLineupId,
  type ExcelMatchdaySnapshotRow,
  type LineupId,
  type PlayerPosition,
} from "../lineup-engine";
import { mapExcelMatchdaySnapshot } from "../lineup-engine/excel-matchday-snapshot.mapper";

import type {
  ReferenceAppliedRuleCandidate,
  ReferenceAppliedRuleCandidateReport,
  ReferenceAppliedRuleCandidateType,
  ReferenceDifferenceCategory,
  ReferenceDifferenceCategorySummary,
  ReferenceExcludedRuleIssue,
  ReferenceFixture,
  ReferenceFixtureDifferenceAudit,
  ReferenceFixtureDifference,
  ReferenceInvalidTeamCase,
  ReferenceManagerDifferenceAudit,
  ReferenceManagerEvaluation,
  ReferencePlayerComparison,
  ReferenceSeasonDifferenceAudit,
  ReferenceSeasonVerificationReport,
} from "./types";

const evaluationSheetName = "Bewertung";
const fixturesSheetName = "Paarungen";
const competitionId = "reference-season-liga-1";
const officialSlotIds = new Set<number>([
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18,
]);

const evaluationHeaders = [
  "spieltag",
  "manager",
  "position",
  "spieler",
  "verein",
  "note",
  "gelbRot",
  "rot",
  "tor",
  "kickerelf",
  "punkte",
  "spielernr",
] as const;

const fixtureHeaders = [
  "spieltag",
  "heim",
  "auswarts",
  "hTore",
  "aTore",
] as const;

export class ReferenceSeasonImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReferenceSeasonImportError";
  }
}

function getCellText(row: ExcelJS.Row, column: number): string {
  const value = row.getCell(column).value;

  if (typeof value !== "string" || value.trim() === "") {
    throw new ReferenceSeasonImportError(
      `Expected text in ${row.worksheet.name}!${row.getCell(column).address}`,
    );
  }

  return value.trim();
}

function getCellNumber(row: ExcelJS.Row, column: number): number {
  const value = row.getCell(column).value;

  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new ReferenceSeasonImportError(
      `Expected number in ${row.worksheet.name}!${row.getCell(column).address}`,
    );
  }

  return value;
}

function parseMatchday(value: string, location: string): number {
  const match = value.match(/^(\d+)\.\s*Spieltag$/i);

  if (!match) {
    throw new ReferenceSeasonImportError(`Invalid matchday in ${location}: ${value}`);
  }

  const matchday = Number(match[1]);

  if (!Number.isInteger(matchday) || matchday < 1 || matchday > 34) {
    throw new ReferenceSeasonImportError(`Matchday outside 1-34 in ${location}: ${value}`);
  }

  return matchday;
}

function parsePosition(value: string, location: string): PlayerPosition {
  const positionByLabel: Record<string, PlayerPosition> = {
    torwart: "goalkeeper",
    abwehr: "defender",
    mittelfeld: "midfielder",
    sturm: "forward",
  };
  const position = positionByLabel[value.trim().toLowerCase()];

  if (!position) {
    throw new ReferenceSeasonImportError(`Invalid position in ${location}: ${value}`);
  }

  return position;
}

function parseSlotId(value: number, location: string): LineupId {
  if (!Number.isInteger(value) || !officialSlotIds.has(value)) {
    throw new ReferenceSeasonImportError(`Invalid spielernr in ${location}: ${value}`);
  }

  return value as LineupId;
}

function validateHeaders(
  worksheet: ExcelJS.Worksheet,
  expectedHeaders: readonly string[],
): void {
  const headerRow = worksheet.getRow(1);

  expectedHeaders.forEach((expectedHeader, index) => {
    const actualHeader = headerRow.getCell(index + 1).value;

    if (actualHeader !== expectedHeader) {
      throw new ReferenceSeasonImportError(
        `Unexpected header ${worksheet.name}!${headerRow.getCell(index + 1).address}: `
        + `${String(actualHeader)}, expected ${expectedHeader}`,
      );
    }
  });
}

function parseEvaluationRows(worksheet: ExcelJS.Worksheet): ExcelMatchdaySnapshotRow[] {
  validateHeaders(worksheet, evaluationHeaders);
  const rows: ExcelMatchdaySnapshotRow[] = [];

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) {
      return;
    }

    const slotId = parseSlotId(
      getCellNumber(row, 12),
      `${worksheet.name}!${row.getCell(12).address}`,
    );
    const position = parsePosition(
      getCellText(row, 3),
      `${worksheet.name}!${row.getCell(3).address}`,
    );

    if (getPositionForLineupId(slotId) !== position) {
      throw new ReferenceSeasonImportError(
        `Position does not match spielernr in ${worksheet.name}!${rowNumber}`,
      );
    }

    const rawRating = getCellNumber(row, 6);

    rows.push({
      matchday: parseMatchday(
        getCellText(row, 1),
        `${worksheet.name}!${row.getCell(1).address}`,
      ),
      managerName: getCellText(row, 2),
      position,
      playerName: getCellText(row, 4),
      club: getCellText(row, 5),
      rating: rawRating >= 1 && rawRating <= 6 ? rawRating : null,
      yellowRedCard: getCellNumber(row, 7) !== 0,
      redCard: getCellNumber(row, 8) !== 0,
      goals: getCellNumber(row, 9),
      teamOfTheWeek: getCellNumber(row, 10) !== 0,
      oldExcelPoints: getCellNumber(row, 11),
      slotId,
    });
  });

  return rows;
}

function parseGoldenCompactEvaluationRows(worksheet: ExcelJS.Worksheet): ExcelMatchdaySnapshotRow[] {
  validateHeaders(worksheet, evaluationHeaders);
  const rows: ExcelMatchdaySnapshotRow[] = [];
  const rowSignaturesByManagerSlot = new Map<string, string>();

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) {
      return;
    }

    const slotId = parseSlotId(
      getRequiredResolvedNumber(row, 12),
      `${worksheet.name}!${row.getCell(12).address}`,
    );
    const positionLabel = getOptionalResolvedText(row, 3);
    const position = parsePosition(
      positionLabel ?? "",
      `${worksheet.name}!${row.getCell(3).address}`,
    );

    if (getPositionForLineupId(slotId) !== position) {
      throw new ReferenceSeasonImportError(
        `Position does not match spielernr in ${worksheet.name}!${rowNumber}`,
      );
    }

    const rawRating = getOptionalResolvedNumber(row, 6);
    const managerName = getOptionalResolvedText(row, 2);
    const playerName = getOptionalResolvedText(row, 4);
    const club = getOptionalResolvedText(row, 5);

    if (!managerName || !playerName || !club) {
      throw new ReferenceSeasonImportError(
        `Missing Golden evaluation text data in ${worksheet.name}!${rowNumber}`,
      );
    }

    const parsedRow = {
      matchday: parseMatchday(
        getOptionalResolvedText(row, 1) ?? "",
        `${worksheet.name}!${row.getCell(1).address}`,
      ),
      managerName,
      position,
      playerName,
      club,
      rating: rawRating !== null && rawRating >= 1 && rawRating <= 6 ? rawRating : null,
      yellowRedCard: (getOptionalResolvedNumber(row, 7) ?? 0) !== 0,
      redCard: (getOptionalResolvedNumber(row, 8) ?? 0) !== 0,
      goals: getOptionalResolvedNumber(row, 9) ?? 0,
      teamOfTheWeek: (getOptionalResolvedNumber(row, 10) ?? 0) !== 0,
      oldExcelPoints: getOptionalResolvedNumber(row, 11) ?? 0,
      slotId,
    };
    const signatureKey = `${parsedRow.matchday}:${parsedRow.managerName}:${parsedRow.slotId}`;
    const signature = JSON.stringify(parsedRow);
    const existingSignature = rowSignaturesByManagerSlot.get(signatureKey);

    if (existingSignature) {
      if (existingSignature === signature) {
        return;
      }

      throw new ReferenceSeasonImportError(
        `Conflicting duplicate Golden row for ${signatureKey}`,
      );
    }

    rowSignaturesByManagerSlot.set(signatureKey, signature);
    rows.push(parsedRow);
  });

  return rows;
}

function parseFixtures(worksheet: ExcelJS.Worksheet): ReferenceFixture[] {
  validateHeaders(worksheet, fixtureHeaders);
  const fixtures: ReferenceFixture[] = [];

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) {
      return;
    }

    fixtures.push({
      matchday: parseMatchday(
        getCellText(row, 1),
        `${worksheet.name}!${row.getCell(1).address}`,
      ),
      homeManager: getCellText(row, 2),
      awayManager: getCellText(row, 3),
      officialHomeScore: getCellNumber(row, 4),
      officialAwayScore: getCellNumber(row, 5),
    });
  });

  return fixtures;
}

function getResolvedCellValue(row: ExcelJS.Row, column: number): ExcelJS.CellValue {
  const value = row.getCell(column).value;

  if (
    value
    && typeof value === "object"
    && "result" in value
  ) {
    return value.result as ExcelJS.CellValue;
  }

  return value;
}

function getOptionalResolvedText(row: ExcelJS.Row, column: number): string | null {
  const value = getResolvedCellValue(row, column);

  return typeof value === "string" && value.trim() !== ""
    ? value.trim()
    : null;
}

function getOptionalResolvedNumber(row: ExcelJS.Row, column: number): number | null {
  const value = getResolvedCellValue(row, column);

  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function getRequiredResolvedNumber(row: ExcelJS.Row, column: number): number {
  const value = getOptionalResolvedNumber(row, column);

  if (value === null) {
    throw new ReferenceSeasonImportError(
      `Expected number in ${row.worksheet.name}!${row.getCell(column).address}`,
    );
  }

  return value;
}

const goldenManagerSlotRows = [
  { row: 3, position: "goalkeeper" },
  { row: 4, position: "goalkeeper" },
  { row: 6, position: "defender" },
  { row: 7, position: "defender" },
  { row: 8, position: "defender" },
  { row: 9, position: "defender" },
  { row: 10, position: "defender" },
  { row: 13, position: "midfielder" },
  { row: 14, position: "midfielder" },
  { row: 15, position: "midfielder" },
  { row: 16, position: "midfielder" },
  { row: 17, position: "midfielder" },
  { row: 18, position: "midfielder" },
  { row: 19, position: "midfielder" },
  { row: 22, position: "forward" },
  { row: 23, position: "forward" },
  { row: 24, position: "forward" },
  { row: 25, position: "forward" },
] as const satisfies readonly { row: number; position: PlayerPosition }[];

function parseGoldenReferenceFixtures(worksheet: ExcelJS.Worksheet): ReferenceFixture[] {
  const fixtures: ReferenceFixture[] = [];

  for (let matchday = 1; matchday <= 34; matchday += 1) {
    const startColumn = 13 + ((matchday - 1) * 6);

    for (let rowNumber = 24; rowNumber <= 32; rowNumber += 1) {
      const row = worksheet.getRow(rowNumber);
      const homeManager = getOptionalResolvedText(row, startColumn);
      const awayManager = getOptionalResolvedText(row, startColumn + 1);

      if (!homeManager || !awayManager) {
        throw new ReferenceSeasonImportError(
          `Missing Golden fixture managers for matchday ${matchday}, row ${rowNumber}`,
        );
      }

      fixtures.push({
        matchday,
        homeManager,
        awayManager,
        officialHomeScore: getOptionalResolvedNumber(row, startColumn + 2)
          ?? (homeManager === "Thomas" ? 0 : getRequiredResolvedNumber(row, startColumn + 2)),
        officialAwayScore: getOptionalResolvedNumber(row, startColumn + 3)
          ?? (awayManager === "Thomas" ? 0 : getRequiredResolvedNumber(row, startColumn + 3)),
      });
    }
  }

  return fixtures;
}

function parseGoldenReferenceEvaluationRows(
  workbook: ExcelJS.Workbook,
  leagueManagers: ReadonlySet<string>,
): ExcelMatchdaySnapshotRow[] {
  const rows: ExcelMatchdaySnapshotRow[] = [];

  for (const managerName of [...leagueManagers].sort((first, second) => first.localeCompare(second, "de"))) {
    const worksheet = workbook.getWorksheet(managerName);

    if (!worksheet) {
      throw new ReferenceSeasonImportError(`Golden workbook is missing manager sheet: ${managerName}`);
    }

    for (const [slotIndex, slot] of goldenManagerSlotRows.entries()) {
      const row = worksheet.getRow(slot.row);
      const playerName = getOptionalResolvedText(row, 1);
      const club = getOptionalResolvedText(row, 2);

      if (!playerName || !club) {
        throw new ReferenceSeasonImportError(
          `Golden workbook is missing player data for ${managerName}, slot ${slotIndex + 1}`,
        );
      }

      const slotId = (slotIndex + 1) as LineupId;

      if (getPositionForLineupId(slotId) !== slot.position) {
        throw new ReferenceSeasonImportError(
          `Golden slot position mismatch for ${managerName}, slot ${slotId}`,
        );
      }

      for (let matchday = 1; matchday <= 34; matchday += 1) {
        const startColumn = 6 + ((matchday - 1) * 6);
        const rating = getOptionalResolvedNumber(row, startColumn);
        const oldExcelPoints = getOptionalResolvedNumber(row, startColumn + 5) ?? 0;

        rows.push({
          matchday,
          managerName,
          position: slot.position,
          playerName,
          club,
          rating: rating !== null && rating >= 1 && rating <= 6 ? rating : null,
          yellowRedCard: getOptionalResolvedNumber(row, startColumn + 1) !== null,
          redCard: getOptionalResolvedNumber(row, startColumn + 2) !== null,
          goals: getOptionalResolvedNumber(row, startColumn + 3) ?? 0,
          teamOfTheWeek: getOptionalResolvedNumber(row, startColumn + 4) !== null,
          oldExcelPoints,
          slotId,
        });
      }
    }
  }

  return rows;
}

function createManagerEvaluationKey(matchday: number, managerName: string): string {
  return `${matchday}:${managerName}`;
}

function calculateManagerEvaluations(
  rows: readonly ExcelMatchdaySnapshotRow[],
  leagueManagers: ReadonlySet<string>,
): ReferenceManagerEvaluation[] {
  const rowsByMatchday = new Map<number, ExcelMatchdaySnapshotRow[]>();

  for (const row of rows) {
    if (!leagueManagers.has(row.managerName)) {
      continue;
    }

    const matchdayRows = rowsByMatchday.get(row.matchday) ?? [];
    matchdayRows.push(row);
    rowsByMatchday.set(row.matchday, matchdayRows);
  }

  return [...rowsByMatchday]
    .sort(([first], [second]) => first - second)
    .flatMap(([, matchdayRows]) => (
      mapExcelMatchdaySnapshot(matchdayRows, competitionId)
        .map((snapshot) => {
          const lineupResult = calculateMatchLineup({
            managerId: snapshot.managerId,
            competitionId,
            matchday: snapshot.matchday,
            teamValidity: "VALID",
            assignments: snapshot.assignments,
            matchData: snapshot.matchData,
          });

          if (lineupResult.calculationStatus !== "CALCULATED") {
            throw new ReferenceSeasonImportError(
              `Unexpected invalid calculation for ${snapshot.managerName}, matchday ${snapshot.matchday}`,
            );
          }

          const workbookScore = snapshot.sourceRows.reduce(
            (total, row) => total + row.oldExcelPoints,
            0,
          );
          const calculatedPlayerByLineupId = new Map(
            lineupResult.evaluatedPlayers.map((player) => [player.lineupId, player]),
          );
          const playerComparisons: ReferencePlayerComparison[] = snapshot.sourceRows.map((row) => {
            const calculatedPlayer = calculatedPlayerByLineupId.get(row.slotId);
            const enginePoints = calculatedPlayer?.totalPoints ?? 0;

            return {
              slotId: row.slotId,
              evaluatedForSlotId: calculatedPlayer?.evaluatedForLineupId ?? null,
              playerName: row.playerName,
              rating: row.rating,
              enginePoints,
              workbookPoints: row.oldExcelPoints,
              difference: enginePoints - row.oldExcelPoints,
              wasReplacement: calculatedPlayer?.wasReplacement ?? false,
            };
          });

          return {
            matchday: snapshot.matchday,
            managerName: snapshot.managerName,
            calculatedScore: lineupResult.team.totalPoints,
            workbookScore,
            scoreDifference: lineupResult.team.totalPoints - workbookScore,
            playerComparisons,
          };
        })
    ));
}

function createFixtureComparison(
  fixture: ReferenceFixture,
  evaluationByManager: ReadonlyMap<string, ReferenceManagerEvaluation>,
  invalidManagers: ReadonlySet<string>,
): {
  difference: ReferenceFixtureDifference | null;
  invalidCases: ReferenceInvalidTeamCase[];
  absoluteDifference: number;
} {
  const homeEvaluation = evaluationByManager.get(
    createManagerEvaluationKey(fixture.matchday, fixture.homeManager),
  );
  const awayEvaluation = evaluationByManager.get(
    createManagerEvaluationKey(fixture.matchday, fixture.awayManager),
  );

  if (!homeEvaluation || !awayEvaluation) {
    throw new ReferenceSeasonImportError(
      `Missing manager evaluation for matchday ${fixture.matchday}: `
      + `${!homeEvaluation ? fixture.homeManager : fixture.awayManager}`,
    );
  }

  const homeDifference = homeEvaluation.calculatedScore - fixture.officialHomeScore;
  const awayDifference = awayEvaluation.calculatedScore - fixture.officialAwayScore;
  const invalidCases: ReferenceInvalidTeamCase[] = [];

  if (
    invalidManagers.has(fixture.homeManager)
    && homeEvaluation.calculatedScore !== fixture.officialHomeScore
  ) {
    invalidCases.push({
      matchday: fixture.matchday,
      managerName: fixture.homeManager,
      calculatedScore: homeEvaluation.calculatedScore,
      officialScore: fixture.officialHomeScore,
      side: "HOME",
    });
  }

  if (
    invalidManagers.has(fixture.awayManager)
    && awayEvaluation.calculatedScore !== fixture.officialAwayScore
  ) {
    invalidCases.push({
      matchday: fixture.matchday,
      managerName: fixture.awayManager,
      calculatedScore: awayEvaluation.calculatedScore,
      officialScore: fixture.officialAwayScore,
      side: "AWAY",
    });
  }

  return {
    difference: homeDifference === 0 && awayDifference === 0
      ? null
      : {
          matchday: fixture.matchday,
          homeManager: fixture.homeManager,
          awayManager: fixture.awayManager,
          calculatedScore: {
            home: homeEvaluation.calculatedScore,
            away: awayEvaluation.calculatedScore,
          },
          officialScore: {
            home: fixture.officialHomeScore,
            away: fixture.officialAwayScore,
          },
          scoreDifference: {
            home: homeDifference,
            away: awayDifference,
          },
        },
    invalidCases,
    absoluteDifference: Math.abs(homeDifference) + Math.abs(awayDifference),
  };
}

function normalizeCandidateIdPart(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function createRuleCandidate(
  fixture: ReferenceFixtureDifferenceAudit,
  difference: ReferenceManagerDifferenceAudit,
): ReferenceAppliedRuleCandidate | null {
  if (
    difference.likelyCategory !== "TEAM_INVALID"
    && difference.likelyCategory !== "MANUAL_PENALTY"
    && difference.likelyCategory !== "POINT_ADJUSTMENT"
  ) {
    return null;
  }

  const proposedType: ReferenceAppliedRuleCandidateType = difference.likelyCategory === "MANUAL_PENALTY"
    ? "TEAM_PENALTY"
    : difference.likelyCategory;
  const adjustmentPoints = difference.officialTotal - difference.engineTotal;
  const value = proposedType === "TEAM_INVALID"
    ? { invalidFantasyGoals: difference.officialTotal }
    : { points: adjustmentPoints };

  return {
    candidateId: [
      "reference-season",
      `matchday-${fixture.matchday}`,
      normalizeCandidateIdPart(difference.manager),
      proposedType.toLowerCase().replaceAll("_", "-"),
    ].join(":"),
    reviewStatus: "REVIEW_REQUIRED",
    sourceCategory: difference.likelyCategory,
    proposedRule: {
      type: proposedType,
      competitionId,
      validFromMatchday: fixture.matchday,
      validToMatchday: fixture.matchday,
      managerReference: {
        displayName: difference.manager,
        managerId: null,
      },
      value,
      reason: `Reference season audit candidate from ${difference.likelyCategory}.`,
    },
    source: {
      fixture: fixture.fixture,
      side: difference.side,
      engineTotal: difference.engineTotal,
      officialTotal: difference.officialTotal,
      difference: difference.difference,
      workbookTotal: difference.workbookTotal,
      categoryEvidence: difference.categoryEvidence,
    },
  };
}

function createExcludedRuleIssue(
  fixture: ReferenceFixtureDifferenceAudit,
  difference: ReferenceManagerDifferenceAudit,
): ReferenceExcludedRuleIssue | null {
  if (
    difference.likelyCategory !== "PLAYER_MAPPING"
    && difference.likelyCategory !== "MISSING_RATING"
    && difference.likelyCategory !== "UNKNOWN"
  ) {
    return null;
  }

  return {
    category: difference.likelyCategory,
    matchday: fixture.matchday,
    fixture: fixture.fixture,
    manager: difference.manager,
    side: difference.side,
    engineTotal: difference.engineTotal,
    officialTotal: difference.officialTotal,
    difference: difference.difference,
    categoryEvidence: difference.categoryEvidence,
    differingPlayers: difference.playerLevelComparison.filter(
      (comparison) => comparison.difference !== 0,
    ),
  };
}

export function createReferenceAppliedRuleCandidateReport(
  audit: ReferenceSeasonDifferenceAudit,
): ReferenceAppliedRuleCandidateReport {
  const candidates = audit.fixtureDifferences.flatMap((fixture) => (
    fixture.managerDifferences
      .map((difference) => createRuleCandidate(fixture, difference))
      .filter((candidate): candidate is ReferenceAppliedRuleCandidate => candidate !== null)
  ));
  const excludedIssues = audit.fixtureDifferences.flatMap((fixture) => (
    fixture.managerDifferences
      .map((difference) => createExcludedRuleIssue(fixture, difference))
      .filter((issue): issue is ReferenceExcludedRuleIssue => issue !== null)
  ));
  const candidateTypes: ReferenceAppliedRuleCandidateType[] = [
    "TEAM_INVALID",
    "TEAM_PENALTY",
    "POINT_ADJUSTMENT",
  ];
  const excludedCategories: ReferenceExcludedRuleIssue["category"][] = [
    "PLAYER_MAPPING",
    "MISSING_RATING",
    "UNKNOWN",
  ];

  return {
    workbook: audit.workbook,
    competition: audit.competition,
    generatedAt: audit.processedAt,
    candidates,
    excludedIssues,
    summary: {
      candidates: candidates.length,
      byType: Object.fromEntries(candidateTypes.map((type) => [
        type,
        candidates.filter((candidate) => candidate.proposedRule.type === type).length,
      ])) as Record<ReferenceAppliedRuleCandidateType, number>,
      excludedIssues: excludedIssues.length,
      excludedByCategory: Object.fromEntries(excludedCategories.map((category) => [
        category,
        excludedIssues.filter((issue) => issue.category === category).length,
      ])) as Record<ReferenceExcludedRuleIssue["category"], number>,
    },
  };
}

export async function verifyReferenceSeason(
  workbookPath: string,
): Promise<ReferenceSeasonVerificationReport> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(workbookPath);
  const evaluationSheet = workbook.getWorksheet(evaluationSheetName);
  const fixturesSheet = workbook.getWorksheet(fixturesSheetName);

  if (!evaluationSheet || !fixturesSheet) {
    throw new ReferenceSeasonImportError(
      `Workbook must contain ${evaluationSheetName} and ${fixturesSheetName}`,
    );
  }

  const fixtures = parseFixtures(fixturesSheet);
  const evaluationRows = parseEvaluationRows(evaluationSheet);
  const leagueManagers = new Set(
    fixtures.flatMap((fixture) => [fixture.homeManager, fixture.awayManager]),
  );
  const allEvaluationManagers = new Set(
    evaluationRows.map((row) => row.managerName),
  );
  const managerEvaluations = calculateManagerEvaluations(
    evaluationRows,
    leagueManagers,
  );
  const evaluationByManager = new Map(
    managerEvaluations.map((evaluation) => [
      createManagerEvaluationKey(evaluation.matchday, evaluation.managerName),
      evaluation,
    ]),
  );
  const differences: ReferenceFixtureDifference[] = [];
  const invalidTeamCases: ReferenceInvalidTeamCase[] = [];
  const officialScoresByManager = new Map<string, number[]>();

  for (const fixture of fixtures) {
    officialScoresByManager.set(fixture.homeManager, [
      ...(officialScoresByManager.get(fixture.homeManager) ?? []),
      fixture.officialHomeScore,
    ]);
    officialScoresByManager.set(fixture.awayManager, [
      ...(officialScoresByManager.get(fixture.awayManager) ?? []),
      fixture.officialAwayScore,
    ]);
  }

  const invalidManagers = new Set(
    [...officialScoresByManager]
      .filter(([, scores]) => (
        scores.length === 34
        && scores.every((score) => score <= 0)
      ))
      .map(([managerName]) => managerName),
  );
  let totalScoreDifference = 0;

  for (const fixture of fixtures) {
    const comparison = createFixtureComparison(
      fixture,
      evaluationByManager,
      invalidManagers,
    );

    if (comparison.difference) {
      differences.push(comparison.difference);
    }

    invalidTeamCases.push(...comparison.invalidCases);
    totalScoreDifference += comparison.absoluteDifference;
  }

  const matchdays = new Set(fixtures.map((fixture) => fixture.matchday));

  if (matchdays.size !== 34 || Math.min(...matchdays) !== 1 || Math.max(...matchdays) !== 34) {
    throw new ReferenceSeasonImportError("Paarungen must contain all matchdays from 1 to 34");
  }

  return {
    workbook: path.basename(workbookPath),
    sheets: {
      evaluation: evaluationSheetName,
      fixtures: fixturesSheetName,
    },
    competition: "LEAGUE_1",
    processedAt: new Date().toISOString(),
    managers: [...leagueManagers].sort((first, second) => first.localeCompare(second, "de")),
    excludedEvaluationManagers: [...allEvaluationManagers]
      .filter((manager) => !leagueManagers.has(manager))
      .sort((first, second) => first.localeCompare(second, "de")),
    fixtures,
    managerEvaluations,
    differences,
    invalidTeamCases,
    summary: {
      matchdaysProcessed: matchdays.size,
      fixturesProcessed: fixtures.length,
      managerEvaluationsProcessed: managerEvaluations.length,
      exactMatches: fixtures.length - differences.length,
      differences: differences.length,
      invalidTeamCases: invalidTeamCases.length,
      totalScoreDifference,
    },
  };
}

export async function verifyGoldenReferenceSeason(
  workbookPath: string,
): Promise<ReferenceSeasonVerificationReport> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(workbookPath);
  const evaluationSheet = workbook.getWorksheet(evaluationSheetName);
  const compactFixturesSheet = workbook.getWorksheet(fixturesSheetName)
    ?? workbook.getWorksheet("Tabelle1");

  if (evaluationSheet && compactFixturesSheet) {
    const fixtures = parseFixtures(compactFixturesSheet);
    const evaluationRows = parseGoldenCompactEvaluationRows(evaluationSheet);
    const leagueManagers = new Set(
      fixtures.flatMap((fixture) => [fixture.homeManager, fixture.awayManager]),
    );
    const allEvaluationManagers = new Set(
      evaluationRows.map((row) => row.managerName),
    );
    const managerEvaluations = calculateManagerEvaluations(
      evaluationRows,
      leagueManagers,
    );
    const evaluationByManager = new Map(
      managerEvaluations.map((evaluation) => [
        createManagerEvaluationKey(evaluation.matchday, evaluation.managerName),
        evaluation,
      ]),
    );
    const differences: ReferenceFixtureDifference[] = [];
    const invalidTeamCases: ReferenceInvalidTeamCase[] = [];
    const officialScoresByManager = new Map<string, number[]>();

    for (const fixture of fixtures) {
      officialScoresByManager.set(fixture.homeManager, [
        ...(officialScoresByManager.get(fixture.homeManager) ?? []),
        fixture.officialHomeScore,
      ]);
      officialScoresByManager.set(fixture.awayManager, [
        ...(officialScoresByManager.get(fixture.awayManager) ?? []),
        fixture.officialAwayScore,
      ]);
    }

    const invalidManagers = new Set(
      [...officialScoresByManager]
        .filter(([, scores]) => (
          scores.length === 34
          && scores.every((score) => score <= 0)
        ))
        .map(([managerName]) => managerName),
    );
    let totalScoreDifference = 0;

    for (const fixture of fixtures) {
      const comparison = createFixtureComparison(
        fixture,
        evaluationByManager,
        invalidManagers,
      );

      if (comparison.difference) {
        differences.push(comparison.difference);
      }

      invalidTeamCases.push(...comparison.invalidCases);
      totalScoreDifference += comparison.absoluteDifference;
    }

    return {
      workbook: path.basename(workbookPath),
      sheets: {
        evaluation: evaluationSheet.name,
        fixtures: compactFixturesSheet.name,
      },
      competition: "LEAGUE_1",
      processedAt: new Date().toISOString(),
      managers: [...leagueManagers].sort((first, second) => first.localeCompare(second, "de")),
      excludedEvaluationManagers: [...allEvaluationManagers]
        .filter((manager) => !leagueManagers.has(manager))
        .sort((first, second) => first.localeCompare(second, "de")),
      fixtures,
      managerEvaluations,
      differences,
      invalidTeamCases,
      summary: {
        matchdaysProcessed: new Set(fixtures.map((fixture) => fixture.matchday)).size,
        fixturesProcessed: fixtures.length,
        managerEvaluationsProcessed: managerEvaluations.length,
        exactMatches: fixtures.length - differences.length,
        differences: differences.length,
        invalidTeamCases: invalidTeamCases.length,
        totalScoreDifference,
      },
    };
  }

  const fixturesSheet = workbook.getWorksheet("Ergebnisse");

  if (!fixturesSheet) {
    throw new ReferenceSeasonImportError(
      "Golden workbook must contain Bewertung plus Paarungen/Tabelle1, or Ergebnisse",
    );
  }

  const fixtures = parseGoldenReferenceFixtures(fixturesSheet);
  const leagueManagers = new Set(
    fixtures.flatMap((fixture) => [fixture.homeManager, fixture.awayManager]),
  );
  const evaluationRows = parseGoldenReferenceEvaluationRows(workbook, leagueManagers);
  const managerEvaluations = calculateManagerEvaluations(
    evaluationRows,
    leagueManagers,
  );
  const evaluationByManager = new Map(
    managerEvaluations.map((evaluation) => [
      createManagerEvaluationKey(evaluation.matchday, evaluation.managerName),
      evaluation,
    ]),
  );
  const differences: ReferenceFixtureDifference[] = [];
  const invalidTeamCases: ReferenceInvalidTeamCase[] = [];
  const officialScoresByManager = new Map<string, number[]>();

  for (const fixture of fixtures) {
    officialScoresByManager.set(fixture.homeManager, [
      ...(officialScoresByManager.get(fixture.homeManager) ?? []),
      fixture.officialHomeScore,
    ]);
    officialScoresByManager.set(fixture.awayManager, [
      ...(officialScoresByManager.get(fixture.awayManager) ?? []),
      fixture.officialAwayScore,
    ]);
  }

  const invalidManagers = new Set(
    [...officialScoresByManager]
      .filter(([, scores]) => (
        scores.length === 34
        && scores.every((score) => score <= 0)
      ))
      .map(([managerName]) => managerName),
  );
  let totalScoreDifference = 0;

  for (const fixture of fixtures) {
    const comparison = createFixtureComparison(
      fixture,
      evaluationByManager,
      invalidManagers,
    );

    if (comparison.difference) {
      differences.push(comparison.difference);
    }

    invalidTeamCases.push(...comparison.invalidCases);
    totalScoreDifference += comparison.absoluteDifference;
  }

  return {
    workbook: path.basename(workbookPath),
    sheets: {
      evaluation: "manager sheets",
      fixtures: "Ergebnisse",
    },
    competition: "LEAGUE_1",
    processedAt: new Date().toISOString(),
    managers: [...leagueManagers].sort((first, second) => first.localeCompare(second, "de")),
    excludedEvaluationManagers: workbook.worksheets
      .filter((worksheet) => !leagueManagers.has(worksheet.name))
      .filter((worksheet) => goldenManagerSlotRows.every(({ row }) => (
        getOptionalResolvedText(worksheet.getRow(row), 1)
      )))
      .map((worksheet) => worksheet.name)
      .sort((first, second) => first.localeCompare(second, "de")),
    fixtures,
    managerEvaluations,
    differences,
    invalidTeamCases,
    summary: {
      matchdaysProcessed: new Set(fixtures.map((fixture) => fixture.matchday)).size,
      fixturesProcessed: fixtures.length,
      managerEvaluationsProcessed: managerEvaluations.length,
      exactMatches: fixtures.length - differences.length,
      differences: differences.length,
      invalidTeamCases: invalidTeamCases.length,
      totalScoreDifference,
    },
  };
}

function classifyManagerDifference(
  manager: string,
  engineTotal: number,
  officialTotal: number,
  workbookTotal: number,
  playerComparisons: readonly ReferencePlayerComparison[],
): Pick<ReferenceManagerDifferenceAudit, "likelyCategory" | "categoryEvidence"> {
  if (manager === "Thomas") {
    return {
      likelyCategory: "TEAM_INVALID",
      categoryEvidence: [
        "Known historical invalid-team case for Thomas.",
        `Workbook official total is ${officialTotal} and is preserved as source truth.`,
      ],
    };
  }

  const playerDifferences = playerComparisons.filter(
    (comparison) => comparison.difference !== 0,
  );

  if (engineTotal !== workbookTotal && playerDifferences.length > 0) {
    const missingRatingDifferences = playerDifferences.filter(
      (comparison) => comparison.rating === null,
    );

    if (missingRatingDifferences.length > 0) {
      return {
        likelyCategory: "MISSING_RATING",
        categoryEvidence: [
          "Engine total differs from the sum of workbook player points.",
          `${missingRatingDifferences.length} differing player slot(s) have no valid Kicker rating.`,
        ],
      };
    }

    return {
      likelyCategory: "PLAYER_MAPPING",
      categoryEvidence: [
        "Engine total differs from the sum of workbook player points.",
        `${playerDifferences.length} player slot(s) have different engine and workbook points.`,
      ],
    };
  }

  if (engineTotal === workbookTotal && officialTotal < engineTotal) {
    return {
      likelyCategory: "MANUAL_PENALTY",
      categoryEvidence: [
        "Engine total equals the sum of workbook player points.",
        "Official total is lower without a player-level scoring difference.",
      ],
    };
  }

  if (engineTotal === workbookTotal && officialTotal > engineTotal) {
    return {
      likelyCategory: "POINT_ADJUSTMENT",
      categoryEvidence: [
        "Engine total equals the sum of workbook player points.",
        "Official total is higher without a player-level scoring difference.",
      ],
    };
  }

  return {
    likelyCategory: "UNKNOWN",
    categoryEvidence: [
      "The available worksheets do not provide enough evidence for a safer classification.",
    ],
  };
}

function createManagerDifferenceAudit(
  manager: string,
  side: "HOME" | "AWAY",
  officialTotal: number,
  evaluation: ReferenceManagerEvaluation,
): ReferenceManagerDifferenceAudit {
  const classification = classifyManagerDifference(
    manager,
    evaluation.calculatedScore,
    officialTotal,
    evaluation.workbookScore,
    evaluation.playerComparisons,
  );

  return {
    manager,
    side,
    engineTotal: evaluation.calculatedScore,
    officialTotal,
    difference: evaluation.calculatedScore - officialTotal,
    workbookTotal: evaluation.workbookScore,
    engineToWorkbookDifference: evaluation.scoreDifference,
    playerLevelComparison: evaluation.playerComparisons,
    ...classification,
  };
}

export function createReferenceSeasonDifferenceAudit(
  report: ReferenceSeasonVerificationReport,
): ReferenceSeasonDifferenceAudit {
  const evaluationByManager = new Map(
    report.managerEvaluations.map((evaluation) => [
      createManagerEvaluationKey(evaluation.matchday, evaluation.managerName),
      evaluation,
    ]),
  );
  const fixtureDifferences: ReferenceFixtureDifferenceAudit[] = report.differences.map(
    (difference) => {
      const managerDifferences: ReferenceManagerDifferenceAudit[] = [];
      const homeEvaluation = evaluationByManager.get(
        createManagerEvaluationKey(difference.matchday, difference.homeManager),
      );
      const awayEvaluation = evaluationByManager.get(
        createManagerEvaluationKey(difference.matchday, difference.awayManager),
      );

      if (!homeEvaluation || !awayEvaluation) {
        throw new ReferenceSeasonImportError(
          `Missing audit evaluation for matchday ${difference.matchday}: `
          + `${!homeEvaluation ? difference.homeManager : difference.awayManager}`,
        );
      }

      if (difference.scoreDifference.home !== 0) {
        managerDifferences.push(createManagerDifferenceAudit(
          difference.homeManager,
          "HOME",
          difference.officialScore.home,
          homeEvaluation,
        ));
      }

      if (difference.scoreDifference.away !== 0) {
        managerDifferences.push(createManagerDifferenceAudit(
          difference.awayManager,
          "AWAY",
          difference.officialScore.away,
          awayEvaluation,
        ));
      }

      return {
        matchday: difference.matchday,
        fixture: {
          homeManager: difference.homeManager,
          awayManager: difference.awayManager,
        },
        managerDifferences,
        likelyCategories: [
          ...new Set(managerDifferences.map(({ likelyCategory }) => likelyCategory)),
        ],
      };
    },
  );
  const categories: ReferenceDifferenceCategory[] = [
    "TEAM_INVALID",
    "MANUAL_PENALTY",
    "POINT_ADJUSTMENT",
    "PLAYER_MAPPING",
    "MISSING_RATING",
    "UNKNOWN",
  ];
  const allManagerDifferences = fixtureDifferences.flatMap(
    ({ managerDifferences }) => managerDifferences,
  );
  const byCategory: ReferenceDifferenceCategorySummary[] = categories.map((category) => ({
    category,
    managerDifferences: allManagerDifferences.filter(
      (difference) => difference.likelyCategory === category,
    ).length,
    fixtureDifferences: fixtureDifferences.filter(
      (difference) => difference.likelyCategories.includes(category),
    ).length,
    totalAbsoluteDifference: allManagerDifferences
      .filter((difference) => difference.likelyCategory === category)
      .reduce((total, difference) => total + Math.abs(difference.difference), 0),
  }));

  return {
    workbook: report.workbook,
    competition: report.competition,
    processedAt: report.processedAt,
    fixtureDifferences,
    summary: {
      fixtureDifferences: fixtureDifferences.length,
      managerDifferences: allManagerDifferences.length,
      byCategory,
      unknownDifferencesRemaining: byCategory.find(
        ({ category }) => category === "UNKNOWN",
      )?.managerDifferences ?? 0,
      totalAbsoluteDifference: allManagerDifferences.reduce(
        (total, difference) => total + Math.abs(difference.difference),
        0,
      ),
    },
  };
}

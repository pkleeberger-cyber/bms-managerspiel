import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import type { PrismaClient, SquadAssignmentReason } from "@prisma/client";
import ExcelJS from "exceljs";

import type { ExcelMatchdaySnapshotRow } from "@/domain/lineup-engine/excel-matchday-snapshot.mapper";
import {
  OFFICIAL_LINEUP_IDS,
  getPositionForLineupId,
  type LineupId,
  type PlayerPosition,
} from "@/domain/lineup-engine";
import {
  getPrismaClient,
  getPrismaInitializationError,
} from "@/infrastructure/prisma";

import { calculateMatchdayZero } from "./matchday-zero-service";

const defaultFromMatchday = 1;
const defaultToMatchday = 17;
const reportDirectory = path.join(process.cwd(), "reports", "backfill");
const markdownReportPath = path.join(reportDirectory, "matchday-1-17-backfill-report.md");
const jsonReportPath = path.join(reportDirectory, "matchday-1-17-backfill-report.json");

type ResolvedPlayer = {
  id: string;
  displayName: string;
  bundesligaClub: string;
};

type ResolvedManagerSeason = {
  id: string;
  managerId: string;
  displayName: string;
  shortName: string;
  league: "FIRST" | "SECOND";
};

type ResolvedContext = {
  season: { id: string; name: string };
  competition: { id: string; name: string };
  playersByWorkbookKey: ReadonlyMap<string, ResolvedPlayer>;
  playersByNameKey: ReadonlyMap<string, readonly ResolvedPlayer[]>;
  managersByKey: ReadonlyMap<string, ResolvedManagerSeason>;
};

type BackfillParsedRow = ExcelMatchdaySnapshotRow & {
  source: {
    sheetName: string;
    rowNumber: number;
    managerColumn: "B";
  };
};

type ParsedPlayerMatchData = {
  seasonId: string;
  matchday: number;
  playerId: string;
  playerName: string;
  managerName: string;
  slotId: number;
  rating: number | null;
  goals: number;
  yellowRed: boolean;
  red: boolean;
  teamOfTheWeek: boolean;
  source: BackfillSourceLocation;
};

type ParsedAssignment = {
  managerSeasonId: string;
  managerName: string;
  playerId: string;
  playerName: string;
  slotId: number;
  validFromMatchday: number;
  validToMatchday: number | null;
  reason: "INITIAL_SQUAD" | "REAL_TRANSFER_REPLACEMENT";
};

type ReportIssue = {
  type:
    | "UNKNOWN_PLAYER"
    | "UNKNOWN_MANAGER"
    | "DUPLICATE_SLOT"
    | "PLAYER_DATA_CONFLICT"
    | "EXISTING_PLAYER_DATA_CONFLICT"
    | "EXISTING_ASSIGNMENT_CONFLICT"
    | "MISSING_MATCHDAY";
  matchday?: number;
  managerName?: string;
  playerName?: string;
  slotId?: number;
  message: string;
  existingValue?: string;
  workbookValue?: string;
  replaceableWithReplaceBackfillData?: boolean;
  source?: BackfillSourceLocation;
};

type BackfillSourceLocation = {
  sheetName: string;
  rowNumber: number;
  column?: string;
};

type ManagerDebugEntry = {
  rawManagerValue: string;
  normalizedManagerValue: string;
  resolvedManagerSeason: boolean;
  resolvedDisplayName: string | null;
  resolvedShortName: string | null;
  resolvedLeague: "FIRST" | "SECOND" | null;
  sheetName: string;
  rowNumber: number;
  column: "B";
};

export type MatchdayBackfillMode = "DRY_RUN" | "APPLY";

export type MatchdayBackfillInput = {
  workbookPath: string;
  fromMatchday?: number;
  toMatchday?: number;
  mode?: MatchdayBackfillMode;
  calculate?: boolean;
  replaceBackfillData?: boolean;
};

export type MatchdayBackfillReport = {
  source: {
    workbookPath: string;
    workbookName: string;
  };
  generatedAt: string;
  mode: MatchdayBackfillMode;
  season: { id: string; name: string } | null;
  competition: { id: string; name: string } | null;
  range: {
    fromMatchday: number;
    toMatchday: number;
  };
  summary: {
    parsedRows: number;
    parsedMatchdays: number[];
    playerMatchDataCount: number;
    squadChangeCount: number;
    assignmentPeriods: number;
    unknownPlayers: number;
    unknownManagers: number;
    conflicts: number;
    appliedPlayerMatchData: number;
    appliedAssignments: number;
    calculatedMatchdays: number;
    blockedCalculations: number;
    importedResults: 0;
    importedLeagueTables: 0;
    publishedSimulationData: false;
  };
  issues: ReportIssue[];
  managerDebug: ManagerDebugEntry[];
  squadChanges: ParsedAssignment[];
  calculationResults: {
    matchday: number;
    status: "CALCULATED" | "BLOCKED";
    message: string;
    calculatedMatches: number;
  }[];
  reportPaths: {
    markdown: string;
    json: string;
  };
};

type BuildBackfillResult = {
  report: MatchdayBackfillReport;
  playerMatchData: ParsedPlayerMatchData[];
  assignments: ParsedAssignment[];
};

type BackfillTransactionClient = Parameters<
  Parameters<PrismaClient["$transaction"]>[0]
>[0];

export class MatchdayBackfillService {
  private readonly prisma = getPrismaClient();

  async run(input: MatchdayBackfillInput): Promise<MatchdayBackfillReport> {
    const fromMatchday = input.fromMatchday ?? defaultFromMatchday;
    const toMatchday = input.toMatchday ?? defaultToMatchday;
    const mode = input.mode ?? "DRY_RUN";
    const parsedRows = (await parseBackfillWorkbookRows(input.workbookPath))
      .filter((row) => row.matchday >= fromMatchday && row.matchday <= toMatchday);

    if (!this.prisma) {
      if (mode === "APPLY") {
        const initializationError = getPrismaInitializationError();
        const detail = initializationError instanceof Error
          ? ` ${initializationError.message}`
          : "";

        throw new Error(`Prisma ist nicht verfügbar.${detail}`);
      }

      const report = buildUnavailablePrismaReport({
        workbookPath: input.workbookPath,
        mode,
        fromMatchday,
        toMatchday,
        parsedRows,
      });

      await writeReports(report);
      return report;
    }

    const build = await this.buildBackfill({
      workbookPath: input.workbookPath,
      mode,
      fromMatchday,
      toMatchday,
      parsedRows,
    });
    const report = build.report;

    if (mode === "APPLY") {
      assertApplyIsSafe(report, Boolean(input.replaceBackfillData));
      const applied = await this.applyBackfill(build, {
        replaceBackfillData: Boolean(input.replaceBackfillData),
        fromMatchday,
        toMatchday,
      });
      report.summary.appliedPlayerMatchData = applied.playerMatchData;
      report.summary.appliedAssignments = applied.assignments;

      if (input.calculate) {
        for (let matchday = fromMatchday; matchday <= toMatchday; matchday += 1) {
          const result = await calculateMatchdayZero(matchday);

          report.calculationResults.push({
            matchday,
            status: result.status,
            message: result.message,
            calculatedMatches: result.calculatedMatches,
          });
        }

        report.summary.calculatedMatchdays = report.calculationResults
          .filter((result) => result.status === "CALCULATED").length;
        report.summary.blockedCalculations = report.calculationResults
          .filter((result) => result.status === "BLOCKED").length;
      }
    }

    await writeReports(report);
    return report;
  }

  private async buildBackfill(input: {
    workbookPath: string;
    mode: MatchdayBackfillMode;
    fromMatchday: number;
    toMatchday: number;
    parsedRows: BackfillParsedRow[];
  }): Promise<BuildBackfillResult> {
    const context = await this.loadContext();
    const issues: ReportIssue[] = [];
    const parsedMatchdays = [...new Set(input.parsedRows.map((row) => row.matchday))]
      .sort((first, second) => first - second);

    for (let matchday = input.fromMatchday; matchday <= input.toMatchday; matchday += 1) {
      if (!parsedMatchdays.includes(matchday)) {
        issues.push({
          type: "MISSING_MATCHDAY",
          matchday,
          message: `Workbook has no parsed rows for matchday ${matchday}.`,
        });
      }
    }

    const managerDebug = input.parsedRows.slice(0, 50).map((row) =>
      createManagerDebugEntry(row, context),
    );
    const resolvedRows = input.parsedRows.flatMap((row) => {
      const manager = resolveManager(row.managerName, context);
      const player = resolvePlayer(row, context);

      if (!manager) {
        issues.push({
          type: "UNKNOWN_MANAGER",
          matchday: row.matchday,
          managerName: row.managerName,
          slotId: row.slotId,
          message: `Unknown active Liga 1 manager: ${row.managerName}.`,
        });
      }

      if (!player) {
        const aliasTarget = resolvePlayerAlias(row, context);

        issues.push({
          type: "UNKNOWN_PLAYER",
          matchday: row.matchday,
          managerName: row.managerName,
          playerName: row.playerName,
          slotId: row.slotId,
          message: aliasTarget
            ? `Unknown player after alias review: ${row.playerName} (${row.club}). Candidate alias target ${aliasTarget.displayName} was not applied automatically.`
            : `Unknown player: ${row.playerName} (${row.club}).`,
          workbookValue: formatWorkbookPlayer(row),
          source: createPlayerSource(row),
        });
      }

      if (!manager || !player) {
        return [];
      }

      return [{
        row,
        manager,
        player,
      }];
    });
    const slotSignatures = new Set<string>();

    for (const item of resolvedRows) {
      const key = [
        item.row.matchday,
        item.manager.id,
        item.row.slotId,
      ].join(":");

      if (slotSignatures.has(key)) {
        issues.push({
          type: "DUPLICATE_SLOT",
          matchday: item.row.matchday,
          managerName: item.row.managerName,
          slotId: item.row.slotId,
          message: `Duplicate slot ${item.row.slotId} for ${item.row.managerName} on matchday ${item.row.matchday}.`,
        });
      }

      slotSignatures.add(key);
    }

    const playerMatchData = dedupePlayerMatchData(
      context.season.id,
      resolvedRows.map((item) => item.row),
      resolvedRows.map((item) => item.player),
      issues,
    );
    const assignments = deriveAssignments(resolvedRows, input.toMatchday);
    const squadChanges = assignments.filter(
      (assignment) => assignment.validFromMatchday > input.fromMatchday,
    );

    await this.collectExistingConflicts({
      context,
      playerMatchData,
      assignments,
      fromMatchday: input.fromMatchday,
      toMatchday: input.toMatchday,
      issues,
    });

    const report: MatchdayBackfillReport = {
      source: {
        workbookPath: input.workbookPath,
        workbookName: path.basename(input.workbookPath),
      },
      generatedAt: new Date().toISOString(),
      mode: input.mode,
      season: context.season,
      competition: context.competition,
      range: {
        fromMatchday: input.fromMatchday,
        toMatchday: input.toMatchday,
      },
      summary: {
        parsedRows: input.parsedRows.length,
        parsedMatchdays,
        playerMatchDataCount: playerMatchData.length,
        squadChangeCount: squadChanges.length,
        assignmentPeriods: assignments.length,
        unknownPlayers: issues.filter((issue) => issue.type === "UNKNOWN_PLAYER").length,
        unknownManagers: issues.filter((issue) => issue.type === "UNKNOWN_MANAGER").length,
        conflicts: issues.filter((issue) => isConflict(issue.type)).length,
        appliedPlayerMatchData: 0,
        appliedAssignments: 0,
        calculatedMatchdays: 0,
        blockedCalculations: 0,
        importedResults: 0,
        importedLeagueTables: 0,
        publishedSimulationData: false,
      },
      issues,
      managerDebug,
      squadChanges,
      calculationResults: [],
      reportPaths: {
        markdown: markdownReportPath,
        json: jsonReportPath,
      },
    };

    return { report, playerMatchData, assignments };
  }

  private async loadContext(): Promise<ResolvedContext> {
    if (!this.prisma) {
      throw new Error("Prisma ist nicht verfügbar.");
    }

    const season = await this.prisma.season.findFirst({
      where: { status: "ACTIVE" },
      orderBy: { yearStart: "desc" },
    });

    if (!season) {
      throw new Error("Keine aktive Saison gefunden.");
    }

    const competition = await this.prisma.competition.findFirst({
      where: {
        seasonId: season.id,
        type: "LEAGUE_1",
        name: "Erste Liga",
      },
    });

    if (!competition) {
      throw new Error("Erste Liga ist nicht angelegt.");
    }

    const [players, managerSeasons] = await Promise.all([
      this.prisma.player.findMany({
        orderBy: { displayName: "asc" },
      }),
      this.prisma.managerSeason.findMany({
        where: {
          seasonId: season.id,
          status: "ACTIVE",
          participation: "ACTIVE",
        },
        include: { manager: true },
      }),
    ]);
    const playersByWorkbookKey = new Map<string, ResolvedPlayer>();
    const playersByNameKey = new Map<string, ResolvedPlayer[]>();

    for (const player of players) {
      const resolved = {
        id: player.id,
        displayName: player.displayName,
        bundesligaClub: player.bundesligaClub,
      };
      const nameKey = normalizeKey(player.displayName);
      const workbookKey = createPlayerWorkbookKey(player.displayName, player.bundesligaClub);

      playersByWorkbookKey.set(workbookKey, resolved);
      playersByNameKey.set(nameKey, [...(playersByNameKey.get(nameKey) ?? []), resolved]);
    }

    return {
      season: { id: season.id, name: season.name },
      competition: { id: competition.id, name: competition.name },
      playersByWorkbookKey,
      playersByNameKey,
      managersByKey: new Map(
        managerSeasons.flatMap((managerSeason) => {
          const resolved = {
            id: managerSeason.id,
            managerId: managerSeason.managerId,
            displayName: managerSeason.manager.displayName,
            shortName: managerSeason.manager.shortName,
            league: managerSeason.league,
          };

          return createManagerLookupKeys(managerSeason.manager.displayName, managerSeason.manager.shortName)
            .map((key) => [key, resolved] as const);
        }),
      ),
    };
  }

  private async collectExistingConflicts(input: {
    context: ResolvedContext;
    playerMatchData: readonly ParsedPlayerMatchData[];
    assignments: readonly ParsedAssignment[];
    fromMatchday: number;
    toMatchday: number;
    issues: ReportIssue[];
  }) {
    if (!this.prisma) {
      return;
    }

    const [existingMatchData, existingAssignments] = await Promise.all([
      this.prisma.playerMatchData.findMany({
        where: {
          seasonId: input.context.season.id,
          matchday: { gte: input.fromMatchday, lte: input.toMatchday },
        },
        include: { player: true },
      }),
      this.prisma.squadAssignment.findMany({
        where: {
          managerSeasonId: {
            in: [...new Set(input.assignments.map((assignment) => assignment.managerSeasonId))],
          },
          validFromMatchday: { lte: input.toMatchday },
          OR: [
            { validToMatchday: null },
            { validToMatchday: { gte: input.fromMatchday } },
          ],
        },
        include: {
          managerSeason: { include: { manager: true } },
          player: true,
        },
      }),
    ]);
    const parsedMatchDataByKey = new Map(
      input.playerMatchData.map((entry) => [
        createPlayerMatchDataKey(entry.matchday, entry.playerId),
        entry,
      ]),
    );

    for (const existing of existingMatchData) {
      const parsed = parsedMatchDataByKey.get(
        createPlayerMatchDataKey(existing.matchday, existing.playerId),
      );

      if (parsed && !isSamePlayerMatchData(parsed, existing)) {
        const replaceable = existing.source === "KICKER";

        input.issues.push({
          type: "EXISTING_PLAYER_DATA_CONFLICT",
          matchday: existing.matchday,
          managerName: parsed.managerName,
          playerName: existing.player.displayName,
          slotId: parsed.slotId,
          message: `Existing PlayerMatchData differs for ${existing.player.displayName} on matchday ${existing.matchday}.`,
          existingValue: formatExistingPlayerMatchData(existing),
          workbookValue: formatPlayerMatchData(parsed),
          replaceableWithReplaceBackfillData: replaceable,
          source: parsed.source,
        });
      }
    }

    for (const existing of existingAssignments) {
      for (let matchday = input.fromMatchday; matchday <= input.toMatchday; matchday += 1) {
        if (!assignmentCovers(existing, matchday)) {
          continue;
        }

        const desired = input.assignments.find(
          (assignment) =>
            assignment.managerSeasonId === existing.managerSeasonId &&
            assignment.slotId === existing.slotId &&
            assignment.validFromMatchday <= matchday &&
            (assignment.validToMatchday === null || assignment.validToMatchday >= matchday),
        );

        if (desired && desired.playerId !== existing.playerId) {
          const replaceable = isReplaceableBackfillAssignment(existing, input.toMatchday);

          input.issues.push({
            type: "EXISTING_ASSIGNMENT_CONFLICT",
            matchday,
            managerName: existing.managerSeason?.manager.displayName ?? undefined,
            playerName: existing.player.displayName,
            slotId: existing.slotId,
            message: `Existing assignment differs on matchday ${matchday}, slot ${existing.slotId}: ${existing.player.displayName} vs ${desired.playerName}.`,
            existingValue: formatExistingAssignment(existing),
            workbookValue: formatAssignment(desired),
            replaceableWithReplaceBackfillData: replaceable,
          });
          break;
        }
      }
    }
  }

  private async applyBackfill(input: BuildBackfillResult, options: {
    replaceBackfillData: boolean;
    fromMatchday: number;
    toMatchday: number;
  }) {
    if (!this.prisma) {
      throw new Error("Prisma ist nicht verfügbar.");
    }

    let playerMatchData = 0;
    let assignments = 0;

    await this.prisma.$transaction(
      async (tx) => {
        if (options.replaceBackfillData) {
          await replaceExistingBackfillInputRows(tx, input, options);
        }

        playerMatchData = await applyPlayerMatchData(tx, input.playerMatchData);
        assignments = await applyAssignments(tx, input.assignments);
      },
      { maxWait: 10_000, timeout: 120_000 },
    );

    return { playerMatchData, assignments };
  }
}

function resolvePlayer(
  row: ExcelMatchdaySnapshotRow,
  context: ResolvedContext,
): ResolvedPlayer | null {
  const exact = context.playersByWorkbookKey.get(
    createPlayerWorkbookKey(row.playerName, row.club),
  );

  if (exact) {
    return exact;
  }

  const sameNamePlayers = context.playersByNameKey.get(normalizeKey(row.playerName)) ?? [];

  if (sameNamePlayers.length === 1) {
    return sameNamePlayers[0];
  }

  return resolvePlayerAlias(row, context);
}

function resolvePlayerAlias(
  row: ExcelMatchdaySnapshotRow,
  context: ResolvedContext,
): ResolvedPlayer | null {
  if (
    row.matchday === 5 &&
    row.managerName === "Ben" &&
    row.slotId === 15 &&
    normalizeKey(row.playerName) === "asslani" &&
    normalizeKey(row.club) === "na"
  ) {
    return context.playersByWorkbookKey.get(createPlayerWorkbookKey("Asllani", "Hoffenheim"))
      ?? null;
  }

  return null;
}

function resolveManager(
  managerName: string,
  context: ResolvedContext,
): ResolvedManagerSeason | null {
  for (const key of createManagerLookupKeys(managerName, managerName)) {
    const manager = context.managersByKey.get(key);

    if (manager) {
      return manager;
    }
  }

  return null;
}

function createManagerDebugEntry(
  row: BackfillParsedRow,
  context: ResolvedContext,
): ManagerDebugEntry {
  const manager = resolveManager(row.managerName, context);

  return {
    rawManagerValue: row.managerName,
    normalizedManagerValue: normalizeKey(row.managerName),
    resolvedManagerSeason: manager !== null,
    resolvedDisplayName: manager?.displayName ?? null,
    resolvedShortName: manager?.shortName ?? null,
    resolvedLeague: manager?.league ?? null,
    sheetName: row.source.sheetName,
    rowNumber: row.source.rowNumber,
    column: row.source.managerColumn,
  };
}

function buildUnavailablePrismaReport(input: {
  workbookPath: string;
  mode: MatchdayBackfillMode;
  fromMatchday: number;
  toMatchday: number;
  parsedRows: readonly BackfillParsedRow[];
}): MatchdayBackfillReport {
  const parsedMatchdays = [...new Set(input.parsedRows.map((row) => row.matchday))]
    .sort((first, second) => first - second);
  const managerNames = [...new Set(input.parsedRows.map((row) => row.managerName))]
    .sort((first, second) => first.localeCompare(second, "de"));
  const playerKeys = [
    ...new Map(
      input.parsedRows.map((row) => [
        createPlayerWorkbookKey(row.playerName, row.club),
        { playerName: row.playerName, club: row.club },
      ]),
    ).values(),
  ].sort((first, second) => first.playerName.localeCompare(second.playerName, "de"));
  const issues: ReportIssue[] = [
    ...managerNames.map((managerName) => ({
      type: "UNKNOWN_MANAGER" as const,
      managerName,
      message: `Prisma is unavailable; manager could not be resolved: ${managerName}.`,
    })),
    ...playerKeys.map((player) => ({
      type: "UNKNOWN_PLAYER" as const,
      playerName: player.playerName,
      message: `Prisma is unavailable; player could not be resolved: ${player.playerName} (${player.club}).`,
    })),
  ];

  for (let matchday = input.fromMatchday; matchday <= input.toMatchday; matchday += 1) {
    if (!parsedMatchdays.includes(matchday)) {
      issues.push({
        type: "MISSING_MATCHDAY",
        matchday,
        message: `Workbook has no parsed rows for matchday ${matchday}.`,
      });
    }
  }

  return {
    source: {
      workbookPath: input.workbookPath,
      workbookName: path.basename(input.workbookPath),
    },
    generatedAt: new Date().toISOString(),
    mode: input.mode,
    season: null,
    competition: null,
    range: {
      fromMatchday: input.fromMatchday,
      toMatchday: input.toMatchday,
    },
    summary: {
      parsedRows: input.parsedRows.length,
      parsedMatchdays,
      playerMatchDataCount: 0,
      squadChangeCount: 0,
      assignmentPeriods: 0,
      unknownPlayers: playerKeys.length,
      unknownManagers: managerNames.length,
      conflicts: issues.filter((issue) => isConflict(issue.type)).length,
      appliedPlayerMatchData: 0,
      appliedAssignments: 0,
      calculatedMatchdays: 0,
      blockedCalculations: 0,
      importedResults: 0,
      importedLeagueTables: 0,
      publishedSimulationData: false,
    },
    issues,
    managerDebug: input.parsedRows.slice(0, 50).map((row) => ({
      rawManagerValue: row.managerName,
      normalizedManagerValue: normalizeKey(row.managerName),
      resolvedManagerSeason: false,
      resolvedDisplayName: null,
      resolvedShortName: null,
      resolvedLeague: null,
      sheetName: row.source.sheetName,
      rowNumber: row.source.rowNumber,
      column: row.source.managerColumn,
    })),
    squadChanges: [],
    calculationResults: [],
    reportPaths: {
      markdown: markdownReportPath,
      json: jsonReportPath,
    },
  };
}

async function parseBackfillWorkbookRows(
  workbookPath: string,
): Promise<BackfillParsedRow[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(workbookPath);
  const worksheet = workbook.getWorksheet("Tabelle1") ?? workbook.worksheets[0];

  if (!worksheet) {
    throw new Error(`Workbook has no worksheet: ${workbookPath}`);
  }

  validateBackfillHeaders(worksheet);
  const rows: BackfillParsedRow[] = [];

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) {
      return;
    }

    const slotId = parseSlotId(getRequiredNumber(row, 12), row, 12);
    const position = parsePosition(getRequiredText(row, 3), row, 3);

    if (getPositionForLineupId(slotId) !== position) {
      throw new Error(
        `Position does not match spielernr in ${worksheet.name}!${rowNumber}`,
      );
    }

    const rating = getOptionalNumber(row, 6);

    rows.push({
      matchday: parseMatchday(getRequiredText(row, 1), row, 1),
      managerName: getRequiredText(row, 2),
      position,
      playerName: getRequiredText(row, 4),
      club: getRequiredText(row, 5),
      rating: rating !== null && rating >= 1 && rating <= 6 ? rating : null,
      yellowRedCard: (getOptionalNumber(row, 7) ?? 0) !== 0,
      redCard: (getOptionalNumber(row, 8) ?? 0) !== 0,
      goals: getOptionalNumber(row, 9) ?? 0,
      teamOfTheWeek: (getOptionalNumber(row, 10) ?? 0) !== 0,
      oldExcelPoints: getOptionalNumber(row, 11) ?? 0,
      slotId,
      source: {
        sheetName: worksheet.name,
        rowNumber,
        managerColumn: "B",
      },
    });
  });

  return rows;
}

function validateBackfillHeaders(worksheet: ExcelJS.Worksheet) {
  const expectedHeaders = [
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
  const headerRow = worksheet.getRow(1);

  expectedHeaders.forEach((expected, index) => {
    const actual = getResolvedCellValue(headerRow, index + 1);

    if (actual !== expected) {
      throw new Error(
        `Unexpected header ${worksheet.name}!${headerRow.getCell(index + 1).address}: `
        + `${String(actual)}, expected ${expected}`,
      );
    }
  });
}

function getResolvedCellValue(row: ExcelJS.Row, column: number): ExcelJS.CellValue {
  const value = row.getCell(column).value;

  if (value && typeof value === "object" && "result" in value) {
    return value.result as ExcelJS.CellValue;
  }

  return value;
}

function getRequiredText(row: ExcelJS.Row, column: number): string {
  const value = getResolvedCellValue(row, column);

  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(
      `Expected text in ${row.worksheet.name}!${row.getCell(column).address}`,
    );
  }

  return value.trim();
}

function getRequiredNumber(row: ExcelJS.Row, column: number): number {
  const value = getOptionalNumber(row, column);

  if (value === null) {
    throw new Error(
      `Expected number in ${row.worksheet.name}!${row.getCell(column).address}`,
    );
  }

  return value;
}

function getOptionalNumber(row: ExcelJS.Row, column: number): number | null {
  const value = getResolvedCellValue(row, column);

  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function parseMatchday(value: string, row: ExcelJS.Row, column: number): number {
  const match = value.match(/^(\d+)\.\s*Spieltag$/i);

  if (!match) {
    throw new Error(
      `Invalid matchday in ${row.worksheet.name}!${row.getCell(column).address}: ${value}`,
    );
  }

  return Number(match[1]);
}

function parsePosition(value: string, row: ExcelJS.Row, column: number): PlayerPosition {
  const positionByLabel: Record<string, PlayerPosition> = {
    torwart: "goalkeeper",
    abwehr: "defender",
    mittelfeld: "midfielder",
    sturm: "forward",
  };
  const position = positionByLabel[value.trim().toLowerCase()];

  if (!position) {
    throw new Error(
      `Invalid position in ${row.worksheet.name}!${row.getCell(column).address}: ${value}`,
    );
  }

  return position;
}

function parseSlotId(value: number, row: ExcelJS.Row, column: number): LineupId {
  if (!Number.isInteger(value) || !OFFICIAL_LINEUP_IDS.includes(value as LineupId)) {
    throw new Error(
      `Invalid spielernr in ${row.worksheet.name}!${row.getCell(column).address}: ${value}`,
    );
  }

  return value as LineupId;
}

function dedupePlayerMatchData(
  seasonId: string,
  rows: readonly ExcelMatchdaySnapshotRow[],
  players: readonly ResolvedPlayer[],
  issues: ReportIssue[],
): ParsedPlayerMatchData[] {
  const dataByKey = new Map<string, ParsedPlayerMatchData>();

  rows.forEach((row, index) => {
    const player = players[index];

    if (!player) {
      return;
    }

    const entry = {
      seasonId,
      matchday: row.matchday,
      playerId: player.id,
      playerName: player.displayName,
      managerName: row.managerName,
      slotId: row.slotId,
      rating: row.rating,
      goals: row.goals,
      yellowRed: row.yellowRedCard,
      red: row.redCard,
      teamOfTheWeek: row.teamOfTheWeek,
      source: createPlayerSource(row),
    };
    const key = createPlayerMatchDataKey(row.matchday, player.id);
    const existing = dataByKey.get(key);

    if (existing && !isSameParsedPlayerMatchData(existing, entry)) {
      issues.push({
        type: "PLAYER_DATA_CONFLICT",
        matchday: row.matchday,
        managerName: row.managerName,
        playerName: player.displayName,
        slotId: row.slotId,
        message: `Workbook has conflicting PlayerMatchData for ${player.displayName} on matchday ${row.matchday}.`,
        existingValue: formatPlayerMatchData(existing),
        workbookValue: formatPlayerMatchData(entry),
        replaceableWithReplaceBackfillData: false,
        source: createPlayerSource(row),
      });
      return;
    }

    dataByKey.set(key, entry);
  });

  return [...dataByKey.values()].sort((first, second) =>
    first.matchday - second.matchday || first.playerName.localeCompare(second.playerName, "de"),
  );
}

function deriveAssignments(
  rows: readonly {
    row: ExcelMatchdaySnapshotRow;
    manager: ResolvedManagerSeason;
    player: ResolvedPlayer;
  }[],
  toMatchday: number,
): ParsedAssignment[] {
  const rowsByManagerSlot = new Map<string, typeof rows>();

  for (const item of rows) {
    const key = `${item.manager.id}:${item.row.slotId}`;
    rowsByManagerSlot.set(key, [...(rowsByManagerSlot.get(key) ?? []), item]);
  }

  const assignments: ParsedAssignment[] = [];

  for (const [, slotRows] of rowsByManagerSlot) {
    const orderedRows = [...slotRows].sort((first, second) => first.row.matchday - second.row.matchday);
    let current = orderedRows[0];

    if (!current) {
      continue;
    }

    for (const row of orderedRows.slice(1)) {
      if (row.player.id === current.player.id) {
        continue;
      }

      assignments.push(createAssignmentPeriod(current, row.row.matchday - 1));
      current = row;
    }

    assignments.push(createAssignmentPeriod(current, toMatchday));
  }

  return assignments.sort((first, second) =>
    first.managerName.localeCompare(second.managerName, "de") ||
    first.slotId - second.slotId ||
    first.validFromMatchday - second.validFromMatchday,
  );
}

function createAssignmentPeriod(
  item: {
    row: ExcelMatchdaySnapshotRow;
    manager: ResolvedManagerSeason;
    player: ResolvedPlayer;
  },
  validToMatchday: number,
): ParsedAssignment {
  return {
    managerSeasonId: item.manager.id,
    managerName: item.manager.displayName,
    playerId: item.player.id,
    playerName: item.player.displayName,
    slotId: item.row.slotId,
    validFromMatchday: item.row.matchday,
    validToMatchday,
    reason: item.row.matchday === defaultFromMatchday
      ? "INITIAL_SQUAD"
      : "REAL_TRANSFER_REPLACEMENT",
  };
}

async function applyPlayerMatchData(
  tx: BackfillTransactionClient,
  entries: readonly ParsedPlayerMatchData[],
) {
  for (const entry of entries) {
    await tx.playerMatchData.upsert({
      where: {
        seasonId_matchday_playerId: {
          seasonId: entry.seasonId,
          matchday: entry.matchday,
          playerId: entry.playerId,
        },
      },
      update: {
        rating: entry.rating,
        goals: entry.goals,
        yellowRed: entry.yellowRed,
        red: entry.red,
        teamOfTheWeek: entry.teamOfTheWeek,
        source: "KICKER",
      },
      create: {
        seasonId: entry.seasonId,
        matchday: entry.matchday,
        playerId: entry.playerId,
        rating: entry.rating,
        goals: entry.goals,
        yellowRed: entry.yellowRed,
        red: entry.red,
        teamOfTheWeek: entry.teamOfTheWeek,
        source: "KICKER",
      },
    });
  }

  return entries.length;
}

async function applyAssignments(
  tx: BackfillTransactionClient,
  assignments: readonly ParsedAssignment[],
) {
  for (const assignment of assignments) {
    await tx.squadAssignment.upsert({
      where: {
        managerSeasonId_slotId_validFromMatchday: {
          managerSeasonId: assignment.managerSeasonId,
          slotId: assignment.slotId,
          validFromMatchday: assignment.validFromMatchday,
        },
      },
      update: {
        playerId: assignment.playerId,
        validToMatchday: assignment.validToMatchday,
        reason: assignment.reason,
      },
      create: {
        managerSeasonId: assignment.managerSeasonId,
        playerId: assignment.playerId,
        slotId: assignment.slotId,
        validFromMatchday: assignment.validFromMatchday,
        validToMatchday: assignment.validToMatchday,
        reason: assignment.reason,
      },
    });
  }

  return assignments.length;
}

async function replaceExistingBackfillInputRows(
  tx: BackfillTransactionClient,
  input: BuildBackfillResult,
  options: {
    fromMatchday: number;
    toMatchday: number;
  },
) {
  const playerIds = [...new Set(input.playerMatchData.map((entry) => entry.playerId))];
  const replaceableReasons: SquadAssignmentReason[] = [
    "INITIAL_SQUAD",
    "REAL_TRANSFER_REPLACEMENT",
  ];
  const assignmentFilters = input.assignments.map((assignment) => ({
    managerSeasonId: assignment.managerSeasonId,
    slotId: assignment.slotId,
    validFromMatchday: {
      gte: options.fromMatchday,
      lte: options.toMatchday,
    },
    validToMatchday: {
      not: null,
      lte: options.toMatchday,
    },
    reason: {
      in: replaceableReasons,
    },
  }));

  if (playerIds.length > 0) {
    await tx.playerMatchData.deleteMany({
      where: {
        seasonId: input.playerMatchData[0]?.seasonId,
        matchday: { gte: options.fromMatchday, lte: options.toMatchday },
        playerId: { in: playerIds },
        source: "KICKER",
      },
    });
  }

  if (assignmentFilters.length > 0) {
    await tx.squadAssignment.deleteMany({
      where: { OR: assignmentFilters },
    });
  }
}

function assertApplyIsSafe(report: MatchdayBackfillReport, replaceBackfillData: boolean) {
  const hardConflicts = report.issues.filter((issue) => {
    if (!isConflict(issue.type)) {
      return false;
    }

    if (!replaceBackfillData) {
      return true;
    }

    return issue.replaceableWithReplaceBackfillData !== true;
  });

  if (
    report.summary.unknownPlayers > 0 ||
    report.summary.unknownManagers > 0 ||
    hardConflicts.length > 0
  ) {
    throw new Error(
      "Backfill apply blocked. Resolve unknown players, unknown managers, and conflicts from the dry-run report first.",
    );
  }
}

function assignmentCovers(
  assignment: { validFromMatchday: number; validToMatchday: number | null },
  matchday: number,
) {
  return assignment.validFromMatchday <= matchday
    && (assignment.validToMatchday === null || assignment.validToMatchday >= matchday);
}

function isSamePlayerMatchData(
  parsed: ParsedPlayerMatchData,
  existing: {
    rating: number | null;
    goals: number;
    yellowRed: boolean;
    red: boolean;
    teamOfTheWeek: boolean;
  },
) {
  return parsed.rating === existing.rating
    && parsed.goals === existing.goals
    && parsed.yellowRed === existing.yellowRed
    && parsed.red === existing.red
    && parsed.teamOfTheWeek === existing.teamOfTheWeek;
}

function isSameParsedPlayerMatchData(
  first: ParsedPlayerMatchData,
  second: ParsedPlayerMatchData,
) {
  return first.rating === second.rating
    && first.goals === second.goals
    && first.yellowRed === second.yellowRed
    && first.red === second.red
    && first.teamOfTheWeek === second.teamOfTheWeek;
}

function isReplaceableBackfillAssignment(
  assignment: {
    validFromMatchday: number;
    validToMatchday: number | null;
    reason: "INITIAL_SQUAD" | "SUMMER_TRANSFER" | "WINTER_TRANSFER" | "REAL_TRANSFER_REPLACEMENT" | "ADMIN_CORRECTION";
  },
  toMatchday: number,
) {
  return assignment.validFromMatchday >= defaultFromMatchday
    && assignment.validFromMatchday <= toMatchday
    && assignment.validToMatchday !== null
    && assignment.validToMatchday <= toMatchday
    && (
      assignment.reason === "INITIAL_SQUAD" ||
      assignment.reason === "REAL_TRANSFER_REPLACEMENT"
    );
}

function createPlayerSource(row: ExcelMatchdaySnapshotRow): BackfillSourceLocation {
  const source = "source" in row ? row.source as BackfillParsedRow["source"] : null;

  return {
    sheetName: source?.sheetName ?? "unknown",
    rowNumber: source?.rowNumber ?? 0,
    column: "D/F-K",
  };
}

function formatWorkbookPlayer(row: ExcelMatchdaySnapshotRow) {
  return `${row.playerName} (${row.club}), ${formatPlayerMatchValues({
    rating: row.rating,
    goals: row.goals,
    yellowRed: row.yellowRedCard,
    red: row.redCard,
    teamOfTheWeek: row.teamOfTheWeek,
  })}`;
}

function formatPlayerMatchData(entry: {
  rating: number | null;
  goals: number;
  yellowRed: boolean;
  red: boolean;
  teamOfTheWeek: boolean;
}) {
  return formatPlayerMatchValues(entry);
}

function formatExistingPlayerMatchData(entry: {
  rating: number | null;
  goals: number;
  yellowRed: boolean;
  red: boolean;
  teamOfTheWeek: boolean;
  source: "KICKER" | "ADMIN";
}) {
  return `${formatPlayerMatchValues(entry)}, source=${entry.source}`;
}

function formatPlayerMatchValues(entry: {
  rating: number | null;
  goals: number;
  yellowRed: boolean;
  red: boolean;
  teamOfTheWeek: boolean;
}) {
  return [
    `rating=${entry.rating ?? "null"}`,
    `goals=${entry.goals}`,
    `yellowRed=${entry.yellowRed}`,
    `red=${entry.red}`,
    `teamOfTheWeek=${entry.teamOfTheWeek}`,
  ].join(", ");
}

function formatAssignment(assignment: ParsedAssignment) {
  return [
    `player=${assignment.playerName}`,
    `valid=${assignment.validFromMatchday}-${assignment.validToMatchday ?? "open"}`,
    `reason=${assignment.reason}`,
  ].join(", ");
}

function formatExistingAssignment(assignment: {
  player: { displayName: string };
  validFromMatchday: number;
  validToMatchday: number | null;
  reason: string;
}) {
  return [
    `player=${assignment.player.displayName}`,
    `valid=${assignment.validFromMatchday}-${assignment.validToMatchday ?? "open"}`,
    `reason=${assignment.reason}`,
  ].join(", ");
}

function isConflict(type: ReportIssue["type"]) {
  return type === "DUPLICATE_SLOT"
    || type === "PLAYER_DATA_CONFLICT"
    || type === "EXISTING_PLAYER_DATA_CONFLICT"
    || type === "EXISTING_ASSIGNMENT_CONFLICT"
    || type === "MISSING_MATCHDAY";
}

function createPlayerMatchDataKey(matchday: number, playerId: string) {
  return `${matchday}:${playerId}`;
}

function createPlayerWorkbookKey(playerName: string, club: string) {
  return `${normalizeKey(playerName)}:${normalizeKey(club)}`;
}

function createManagerLookupKeys(displayName: string, shortName: string) {
  return [
    normalizeKey(displayName),
    normalizeKey(shortName),
    normalizeKey(displayName.replace(/^team\s+/i, "")),
    normalizeKey(shortName.replace(/^team-?/i, "")),
  ].filter((key, index, keys) => key !== "" && keys.indexOf(key) === index);
}

function normalizeKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "");
}

async function writeReports(report: MatchdayBackfillReport) {
  await mkdir(reportDirectory, { recursive: true });
  await Promise.all([
    writeFile(jsonReportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8"),
    writeFile(markdownReportPath, renderMarkdownReport(report), "utf8"),
  ]);
}

function renderMarkdownReport(report: MatchdayBackfillReport) {
  const managerDebugRows = report.managerDebug.length === 0
    ? "Keine Manager-Debugdaten."
    : [
        "Raw | Normalized | Resolved | DisplayName | ShortName | Liga | Sheet | Row | Column",
        "--- | --- | --- | --- | --- | --- | --- | ---: | ---",
        ...report.managerDebug.map((entry) => [
          entry.rawManagerValue,
          entry.normalizedManagerValue,
          entry.resolvedManagerSeason ? "yes" : "no",
          entry.resolvedDisplayName ?? "",
          entry.resolvedShortName ?? "",
          entry.resolvedLeague ?? "",
          entry.sheetName,
          entry.rowNumber,
          entry.column,
        ].join(" | ")),
      ].join("\n");
  const issueRows = report.issues.length === 0
    ? "Keine Issues."
    : [
        "Typ | Spieltag | Manager | Slot | Spieler | DB-Wert | Workbook-Wert | Replace | Quelle | Meldung",
        "--- | ---: | --- | ---: | --- | --- | --- | --- | --- | ---",
        ...report.issues.slice(0, 200).map((issue) => [
          issue.type,
          issue.matchday ?? "",
          issue.managerName ?? "",
          issue.slotId ?? "",
          issue.playerName ?? "",
          issue.existingValue ?? "",
          issue.workbookValue ?? "",
          issue.replaceableWithReplaceBackfillData === undefined
            ? ""
            : issue.replaceableWithReplaceBackfillData ? "yes" : "no",
          issue.source
            ? `${issue.source.sheetName}!${issue.source.rowNumber}${issue.source.column ? ` ${issue.source.column}` : ""}`
            : "",
          issue.message,
        ].join(" | ")),
      ].join("\n");
  const calculationRows = report.calculationResults.length === 0
    ? "Nicht ausgeführt."
    : [
        "Spieltag | Status | Paarungen | Meldung",
        "---: | --- | ---: | ---",
        ...report.calculationResults.map((result) => [
          result.matchday,
          result.status,
          result.calculatedMatches,
          result.message,
        ].join(" | ")),
      ].join("\n");
  const squadRows = report.squadChanges.length === 0
    ? "Keine Slotwechsel im Backfill-Zeitraum."
    : [
        "Manager | Slot | Spieler | Von | Bis | Grund",
        "--- | ---: | --- | ---: | ---: | ---",
        ...report.squadChanges.slice(0, 200).map((assignment) => [
          assignment.managerName,
          assignment.slotId,
          assignment.playerName,
          assignment.validFromMatchday,
          assignment.validToMatchday ?? "offen",
          assignment.reason,
        ].join(" | ")),
      ].join("\n");

  return `# Matchday 1-17 Simulation Backfill Report

## Quelle

- Workbook: \`${report.source.workbookPath}\`
- Modus: \`${report.mode}\`
- Generiert: ${report.generatedAt}
- Saison: ${report.season?.name ?? "nicht aufgeloest"}
- Wettbewerb: ${report.competition?.name ?? "nicht aufgeloest"}

## Schutzgrenzen

- Importierte MatchResults: ${report.summary.importedResults}
- Importierte Tabellenstaende: ${report.summary.importedLeagueTables}
- Simulation veroeffentlicht: ${report.summary.publishedSimulationData ? "Ja" : "Nein"}

## Zusammenfassung

Kennzahl | Wert
--- | ---:
Geparste Zeilen | ${report.summary.parsedRows}
Spieltage | ${report.summary.parsedMatchdays.join(", ")}
PlayerMatchData | ${report.summary.playerMatchDataCount}
Assignment-Perioden | ${report.summary.assignmentPeriods}
Slotwechsel | ${report.summary.squadChangeCount}
Unbekannte Spieler | ${report.summary.unknownPlayers}
Unbekannte Manager | ${report.summary.unknownManagers}
Konflikte | ${report.summary.conflicts}
Geschriebene PlayerMatchData | ${report.summary.appliedPlayerMatchData}
Geschriebene SquadAssignments | ${report.summary.appliedAssignments}
Berechnete Spieltage | ${report.summary.calculatedMatchdays}
Blockierte Berechnungen | ${report.summary.blockedCalculations}

## Issues

${issueRows}

## Conflict Types

- \`PLAYER_DATA_CONFLICT\`: the workbook contains multiple rows for the same persisted player and matchday with different match data. This is not replaceable by \`--replace-backfill-data\` because the source workbook is internally ambiguous.
- \`EXISTING_PLAYER_DATA_CONFLICT\`: the database already has \`PlayerMatchData\` for the same season, matchday, and player, but the values differ from the workbook. \`--replace-backfill-data\` may only replace rows marked as replaceable in the table.
- \`EXISTING_ASSIGNMENT_CONFLICT\`: the database already has an overlapping \`SquadAssignment\` for the same manager slot and matchday, but the player differs from the derived workbook assignment. \`--replace-backfill-data\` may only replace rows marked as replaceable in the table.

## Manager Debug

${managerDebugRows}

## Squad Changes

${squadRows}

## Calculation

${calculationRows}
`;
}

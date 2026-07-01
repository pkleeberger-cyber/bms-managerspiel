import { execFileSync } from "node:child_process";

import {
  OFFICIAL_LINEUP_IDS,
  getPositionForLineupId,
} from "./lineup-structure";
import type {
  LineupId,
  ManagerSquadAssignment,
  PlayerMatchData,
  PlayerPosition,
} from "./types";

export type ExcelMatchdaySnapshotRow = {
  matchday: number;
  managerName: string;
  position: PlayerPosition;
  playerName: string;
  club: string;
  rating: number | null;
  yellowRedCard: boolean;
  redCard: boolean;
  goals: number;
  teamOfTheWeek: boolean;
  oldExcelPoints: number;
  slotId: LineupId;
};

export type ExcelMappedManagerSnapshot = {
  managerId: string;
  managerName: string;
  matchday: number;
  assignments: ManagerSquadAssignment[];
  matchData: PlayerMatchData[];
  sourceRows: ExcelMatchdaySnapshotRow[];
};

export class ExcelMatchdaySnapshotError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExcelMatchdaySnapshotError";
  }
}

type ParsedWorksheetRow = {
  rowNumber: number;
  cells: Record<string, string | number>;
};

const expectedHeaders = {
  A: "spieltag",
  B: "manager",
  C: "position",
  D: "spieler",
  E: "verein",
  F: "note",
  G: "gelbRot",
  H: "rot",
  I: "tor",
  J: "kickerelf",
  K: "punkte",
  L: "spielernr",
} as const;

const officialLineupIdSet = new Set<number>(OFFICIAL_LINEUP_IDS);

function readWorkbookEntry(workbookPath: string, entryPath: string): string {
  try {
    return execFileSync("unzip", ["-p", workbookPath, entryPath], {
      encoding: "utf8",
      maxBuffer: 10 * 1024 * 1024,
    });
  } catch {
    throw new ExcelMatchdaySnapshotError(`Unable to read ${entryPath} from ${workbookPath}`);
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
  return [...xml.matchAll(/<si>([\s\S]*?)<\/si>/g)].map((match) => {
    const text = [...match[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)]
      .map((part) => part[1])
      .join("");

    return decodeXml(text);
  });
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
    throw new ExcelMatchdaySnapshotError(`Expected text in ${column}${row.rowNumber}`);
  }

  return value.trim();
}

function getNumberCell(row: ParsedWorksheetRow, column: string): number {
  const value = row.cells[column];

  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new ExcelMatchdaySnapshotError(`Expected number in ${column}${row.rowNumber}`);
  }

  return value;
}

function parseMatchday(value: string, rowNumber: number): number {
  const match = value.match(/^(\d+)\.\s*Spieltag$/i);

  if (!match) {
    throw new ExcelMatchdaySnapshotError(`Invalid matchday in A${rowNumber}: ${value}`);
  }

  return Number(match[1]);
}

function parsePosition(value: string, rowNumber: number): PlayerPosition {
  const normalized = value.toLowerCase();

  if (normalized === "torwart") {
    return "goalkeeper";
  }

  if (normalized === "abwehr") {
    return "defender";
  }

  if (normalized === "mittelfeld") {
    return "midfielder";
  }

  if (normalized === "sturm") {
    return "forward";
  }

  throw new ExcelMatchdaySnapshotError(`Invalid position in C${rowNumber}: ${value}`);
}

function parseSlotId(value: number, rowNumber: number): LineupId {
  if (!Number.isInteger(value) || !officialLineupIdSet.has(value)) {
    throw new ExcelMatchdaySnapshotError(`Invalid spielernr in L${rowNumber}: ${value}`);
  }

  return value as LineupId;
}

function normalizeIdentifier(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function createSnapshotManagerId(managerName: string): string {
  return `excel-snapshot-manager-${normalizeIdentifier(managerName)}`;
}

function createSnapshotPlayerId(managerName: string, slotId: LineupId): string {
  // TODO: Production import must map workbook rows to stable persisted player IDs.
  return `excel-snapshot-${normalizeIdentifier(managerName)}-slot-${slotId}`;
}

function validateHeaders(headerRow: ParsedWorksheetRow): void {
  for (const [column, expectedValue] of Object.entries(expectedHeaders)) {
    if (headerRow.cells[column] !== expectedValue) {
      throw new ExcelMatchdaySnapshotError(
        `Unexpected header ${column}1: ${String(headerRow.cells[column])}, expected ${expectedValue}`,
      );
    }
  }
}

export function extractExcelMatchdaySnapshotRows(
  workbookPath: string,
): ExcelMatchdaySnapshotRow[] {
  const sharedStrings = parseSharedStrings(
    readWorkbookEntry(workbookPath, "xl/sharedStrings.xml"),
  );
  const worksheetRows = parseWorksheetRows(
    readWorkbookEntry(workbookPath, "xl/worksheets/sheet1.xml"),
    sharedStrings,
  );
  const headerRow = worksheetRows[0];

  if (!headerRow) {
    throw new ExcelMatchdaySnapshotError("Workbook worksheet is empty");
  }

  validateHeaders(headerRow);

  return worksheetRows.slice(1).map((row) => {
    const slotId = parseSlotId(getNumberCell(row, "L"), row.rowNumber);
    const position = parsePosition(getStringCell(row, "C"), row.rowNumber);
    const expectedPosition = getPositionForLineupId(slotId);

    if (position !== expectedPosition) {
      throw new ExcelMatchdaySnapshotError(
        `Position mismatch in row ${row.rowNumber}: slot ${slotId} is ${expectedPosition}, found ${position}`,
      );
    }

    const ratingValue = getNumberCell(row, "F");

    return {
      matchday: parseMatchday(getStringCell(row, "A"), row.rowNumber),
      managerName: getStringCell(row, "B"),
      position,
      playerName: getStringCell(row, "D"),
      club: getStringCell(row, "E"),
      rating: ratingValue >= 1 && ratingValue <= 6 ? ratingValue : null,
      yellowRedCard: getNumberCell(row, "G") !== 0,
      redCard: getNumberCell(row, "H") !== 0,
      goals: getNumberCell(row, "I"),
      teamOfTheWeek: getNumberCell(row, "J") !== 0,
      oldExcelPoints: getNumberCell(row, "K"),
      slotId,
    };
  });
}

export function mapExcelMatchdaySnapshot(
  rows: readonly ExcelMatchdaySnapshotRow[],
  competitionId: string,
): ExcelMappedManagerSnapshot[] {
  const rowsByManager = new Map<string, ExcelMatchdaySnapshotRow[]>();

  for (const row of rows) {
    const managerRows = rowsByManager.get(row.managerName) ?? [];
    managerRows.push(row);
    rowsByManager.set(row.managerName, managerRows);
  }

  return [...rowsByManager].map(([managerName, managerRows]) => {
    const rowsBySlot = new Map<LineupId, ExcelMatchdaySnapshotRow>();

    for (const row of managerRows) {
      if (rowsBySlot.has(row.slotId)) {
        throw new ExcelMatchdaySnapshotError(
          `Duplicate spielernr ${row.slotId} for manager ${managerName}`,
        );
      }

      rowsBySlot.set(row.slotId, row);
    }

    if (rowsBySlot.size !== OFFICIAL_LINEUP_IDS.length) {
      throw new ExcelMatchdaySnapshotError(
        `Manager ${managerName} has ${rowsBySlot.size} slots, expected ${OFFICIAL_LINEUP_IDS.length}`,
      );
    }

    const orderedRows = OFFICIAL_LINEUP_IDS.map((slotId) => {
      const row = rowsBySlot.get(slotId);

      if (!row) {
        throw new ExcelMatchdaySnapshotError(
          `Missing spielernr ${slotId} for manager ${managerName}`,
        );
      }

      return row;
    });
    const matchdays = new Set(orderedRows.map((row) => row.matchday));

    if (matchdays.size !== 1) {
      throw new ExcelMatchdaySnapshotError(`Manager ${managerName} has multiple matchdays`);
    }

    const managerId = createSnapshotManagerId(managerName);
    const matchday = orderedRows[0].matchday;

    return {
      managerId,
      managerName,
      matchday,
      assignments: orderedRows.map((row) => ({
        managerId,
        competitionId,
        playerId: createSnapshotPlayerId(managerName, row.slotId),
        playerName: row.playerName,
        slotId: row.slotId,
        validFromMatchday: matchday,
        validToMatchday: matchday,
        reason: "INITIAL_SQUAD" as const,
      })),
      matchData: orderedRows.map((row) => ({
        playerId: createSnapshotPlayerId(managerName, row.slotId),
        kickerRating: row.rating,
        goals: row.goals,
        yellowRedCard: row.yellowRedCard,
        redCard: row.redCard,
        teamOfTheWeek: row.teamOfTheWeek,
      })),
      sourceRows: orderedRows,
    };
  });
}

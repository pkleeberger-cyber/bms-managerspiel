import {
  OFFICIAL_LINEUP_IDS,
  getPositionForLineupId,
} from "./lineup-structure";
import type {
  ManagerSquadAssignment,
  PlayerMatchData,
  PlayerPosition,
} from "./types";

export type ExcelPositionCode = "t" | "a" | "m" | "s";

export type ExcelFlagValue = boolean | number | string | null;

export type ExcelKaderRow = {
  _id: number;
  manager: string;
  position: string;
  playerName: string;
};

export type ExcelAuswertungRow = {
  club: string;
  playerName: string;
  positionCode: ExcelPositionCode;
  rating: number | null;
  yellowRed: ExcelFlagValue;
  red: ExcelFlagValue;
  goals: number;
  teamOfTheWeek: ExcelFlagValue;
  oldExcelPoints: number;
};

export type ExcelMappedPlayerMatchData = {
  matchData: PlayerMatchData;
  club: string;
  positionCode: ExcelPositionCode;
  oldExcelPoints: number;
};

export class ExcelFixtureMappingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExcelFixtureMappingError";
  }
}

const excelPositionByCode: Record<ExcelPositionCode, PlayerPosition> = {
  t: "goalkeeper",
  a: "defender",
  m: "midfielder",
  s: "forward",
};

function normalizeIdentifier(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function normalizePositionLabel(value: string): PlayerPosition | null {
  const normalized = value.trim().toLowerCase();

  if (normalized === "torwart" || normalized === "t") {
    return "goalkeeper";
  }

  if (normalized === "abwehr" || normalized === "a") {
    return "defender";
  }

  if (normalized === "mittelfeld" || normalized === "m") {
    return "midfielder";
  }

  if (normalized === "sturm" || normalized === "s") {
    return "forward";
  }

  return null;
}

function mapExcelFlag(value: ExcelFlagValue): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value !== 0;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();

    return normalized !== "" && normalized !== "0" && normalized !== "false" && normalized !== "nein";
  }

  return false;
}

export function createExcelFixturePlayerId(playerName: string): string {
  // TODO: Production imports must resolve a stable player ID instead of matching by playerName.
  return `excel-player-${normalizeIdentifier(playerName)}`;
}

export function createExcelFixtureManagerId(managerName: string): string {
  return `excel-manager-${normalizeIdentifier(managerName)}`;
}

export function mapKaderRowsToAssignments(
  rows: readonly ExcelKaderRow[],
  competitionId: string,
  validFromMatchday: number,
): ManagerSquadAssignment[] {
  const rowsByManager = new Map<string, ExcelKaderRow[]>();

  for (const row of rows) {
    const managerRows = rowsByManager.get(row.manager) ?? [];
    managerRows.push(row);
    rowsByManager.set(row.manager, managerRows);
  }

  return [...rowsByManager].flatMap(([managerName, managerRows]) => {
    if (managerRows.length !== OFFICIAL_LINEUP_IDS.length) {
      throw new ExcelFixtureMappingError(
        `Manager ${managerName} has ${managerRows.length} Kader rows, expected ${OFFICIAL_LINEUP_IDS.length}`,
      );
    }

    return managerRows.map((row, index) => {
      const slotId = OFFICIAL_LINEUP_IDS[index];
      const expectedPosition = getPositionForLineupId(slotId);
      const excelPosition = normalizePositionLabel(row.position);

      if (excelPosition !== expectedPosition) {
        throw new ExcelFixtureMappingError(
          `Manager ${managerName}, derived slot ${slotId} has position ${row.position}, expected ${expectedPosition}`,
        );
      }

      return {
        managerId: createExcelFixtureManagerId(managerName),
        competitionId,
        playerId: createExcelFixturePlayerId(row.playerName),
        playerName: row.playerName.trim(),
        slotId,
        validFromMatchday,
        validToMatchday: null,
        reason: "INITIAL_SQUAD" as const,
      };
    });
  });
}

export function mapAuswertungRowsToMatchData(
  rows: readonly ExcelAuswertungRow[],
): ExcelMappedPlayerMatchData[] {
  const seenPlayerNames = new Set<string>();

  return rows.map((row) => {
    const playerName = row.playerName.trim();

    if (seenPlayerNames.has(playerName)) {
      throw new ExcelFixtureMappingError(`Duplicate Auswertung playerName: ${playerName}`);
    }

    if (!Number.isInteger(row.goals) || row.goals < 0) {
      throw new ExcelFixtureMappingError(`Invalid goals for ${playerName}: ${row.goals}`);
    }

    seenPlayerNames.add(playerName);

    return {
      matchData: {
        playerId: createExcelFixturePlayerId(playerName),
        kickerRating: row.rating !== null && row.rating >= 1 && row.rating <= 6
          ? row.rating
          : null,
        goals: row.goals,
        yellowRedCard: mapExcelFlag(row.yellowRed),
        redCard: mapExcelFlag(row.red),
        teamOfTheWeek: mapExcelFlag(row.teamOfTheWeek),
      },
      club: row.club.trim(),
      positionCode: row.positionCode,
      oldExcelPoints: row.oldExcelPoints,
    };
  });
}

export function getExcelPosition(positionCode: ExcelPositionCode): PlayerPosition {
  return excelPositionByCode[positionCode];
}

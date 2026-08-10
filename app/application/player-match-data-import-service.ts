import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import ExcelJS from "exceljs";
import type { Prisma, PrismaClient } from "@prisma/client";

import {
  MatchdayZeroService,
  type MatchdayZeroDataEntrySnapshot,
} from "@/application/matchday-zero-service";
import { getPrismaClient } from "@/infrastructure/prisma";

const previewDirectory = path.join(process.cwd(), "reports", "player-match-data-import");
const templateHeaders = [
  "playerId",
  "Spieler",
  "Verein",
  "Position",
  "Note",
  "Tore",
  "Gelb-Rot",
  "Rot",
  "Elf des Tages",
  "Keine Bewertung / Sonderfall",
] as const;

export type PlayerMatchDataImportRowStatus =
  | "NEW"
  | "UNCHANGED"
  | "UPDATE"
  | "UNKNOWN"
  | "INVALID"
  | "DUPLICATE_CONFLICT";

export type PlayerMatchDataImportRow = {
  rowNumber: number;
  playerId: string | null;
  displayName: string;
  club: string | null;
  position: string | null;
  status: PlayerMatchDataImportRowStatus;
  issue: string | null;
  existingValue: PlayerMatchDataValue | null;
  uploadedValue: PlayerMatchDataValue;
};

export type PlayerMatchDataValue = {
  rating: number | null;
  goals: number;
  yellowRed: boolean;
  red: boolean;
  teamOfTheWeek: boolean;
};

export type PlayerMatchDataImportPreview = {
  previewId: string;
  filename: string;
  seasonId: string;
  seasonName: string;
  competitionId: string;
  competitionName: string;
  matchday: number;
  rows: PlayerMatchDataImportRow[];
  summary: {
    uploadedRows: number;
    newRows: number;
    updatedRows: number;
    unchangedRows: number;
    unknownPlayers: number;
    invalidRows: number;
    duplicateConflicts: number;
    blockedRows: number;
  };
  createdAt: string;
};

export type PlayerMatchDataImportApplyResult = {
  preview: PlayerMatchDataImportPreview;
  rowsWritten: number;
  rowsVerified: number;
};

type PlayerLookup = {
  playerId: string;
  displayName: string;
  club: string;
  position: string;
  existingValue: PlayerMatchDataValue | null;
};

type ImportContext = {
  seasonId: string;
  seasonName: string;
  competitionId: string;
  competitionName: string;
  matchday: number;
  players: readonly PlayerLookup[];
};

type ImportTransactionClient = Parameters<
  Parameters<PrismaClient["$transaction"]>[0]
>[0];

type PlayerMatchDataImportAuditDelegate = {
  create(args: {
    data: {
      seasonId: string;
      competitionId: string;
      matchday: number;
      filename: string;
      importedRows: number;
      updatedRows: number;
      unchangedRows: number;
      conflictRows: number;
      unknownRows: number;
      summaryJson: Prisma.InputJsonValue;
    };
  }): Promise<{ id: string }>;
};

export class PlayerMatchDataImportService {
  private readonly prisma = getPrismaClient();

  async exportTemplate(matchday: number): Promise<Buffer> {
    const context = await this.loadContext(matchday);
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "BMS Managerspiel";
    workbook.created = new Date();
    const worksheet = workbook.addWorksheet("PlayerMatchData");

    worksheet.addRow([...templateHeaders]);
    worksheet.getColumn(1).hidden = true;
    worksheet.getRow(1).font = { bold: true };
    worksheet.views = [{ state: "frozen", ySplit: 1 }];

    for (const player of context.players) {
      worksheet.addRow([
        player.playerId,
        player.displayName,
        player.club,
        player.position,
        "",
        "",
        "",
        "",
        "",
        "",
      ]);
    }

    worksheet.columns.forEach((column, index) => {
      if (index === 0) {
        column.width = 28;
        return;
      }

      column.width = index === 1 ? 28 : 18;
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async createPreview(input: {
    matchday: number;
    filename: string;
    buffer: ArrayBuffer;
  }): Promise<PlayerMatchDataImportPreview> {
    const context = await this.loadContext(input.matchday);
    const rows = await parseWorkbook(input.buffer, context);
    const preview = createPreview({
      context,
      filename: input.filename,
      rows,
    });

    await writePreview(preview);
    return preview;
  }

  async loadPreview(previewId: string): Promise<PlayerMatchDataImportPreview | null> {
    try {
      const content = await readFile(createPreviewPath(previewId), "utf8");
      return JSON.parse(content) as PlayerMatchDataImportPreview;
    } catch {
      return null;
    }
  }

  async applyPreview(previewId: string): Promise<PlayerMatchDataImportApplyResult> {
    const preview = await this.loadPreview(previewId);

    if (!preview) {
      throw new Error("Import preview not found.");
    }

    if (preview.summary.blockedRows > 0) {
      throw new Error("Import preview contains blocking rows.");
    }

    const rowsToApply = preview.rows.filter(
      (row) =>
        row.playerId &&
        (row.status === "NEW" || row.status === "UPDATE"),
    );

    if (!this.prisma) {
      throw new Error("Prisma ist nicht verfügbar.");
    }

    assertAuditDelegateAvailable(this.prisma);

    await this.prisma.$transaction(async (tx) => {
      await createAudit(tx, preview);

      for (const row of rowsToApply) {
        await tx.playerMatchData.upsert({
          where: {
            seasonId_matchday_playerId: {
              seasonId: preview.seasonId,
              matchday: preview.matchday,
              playerId: row.playerId!,
            },
          },
          update: {
            rating: row.uploadedValue.rating,
            goals: row.uploadedValue.goals,
            yellowRed: row.uploadedValue.yellowRed,
            red: row.uploadedValue.red,
            teamOfTheWeek: row.uploadedValue.teamOfTheWeek,
            source: "ADMIN",
          },
          create: {
            seasonId: preview.seasonId,
            matchday: preview.matchday,
            playerId: row.playerId!,
            rating: row.uploadedValue.rating,
            goals: row.uploadedValue.goals,
            yellowRed: row.uploadedValue.yellowRed,
            red: row.uploadedValue.red,
            teamOfTheWeek: row.uploadedValue.teamOfTheWeek,
            source: "ADMIN",
          },
        });
      }
    });

    const rowsVerified = await verifyAppliedRows(this.prisma, preview, rowsToApply);

    if (rowsVerified !== rowsToApply.length) {
      throw new Error(
        `Excel-Import konnte nicht vollständig bestätigt werden. ${rowsVerified}/${rowsToApply.length} Datenbank-Zeilen entsprechen der Datei.`,
      );
    }

    return {
      preview,
      rowsWritten: rowsToApply.length,
      rowsVerified,
    };
  }

  private async loadContext(matchday: number): Promise<ImportContext> {
    const snapshot = await new MatchdayZeroService(matchday).loadDataEntry();
    const prisma = this.prisma;

    if (!prisma) {
      throw new Error("Prisma ist nicht verfügbar.");
    }

    const season = await prisma.season.findFirst({
      where: { status: "ACTIVE" },
      orderBy: { yearStart: "desc" },
    });

    if (!season) {
      throw new Error("Keine aktive Saison gefunden.");
    }

    const competition = await prisma.competition.findFirst({
      where: {
        seasonId: season.id,
        type: "LEAGUE_1",
        name: snapshot.competitionName,
      },
    });

    if (!competition) {
      throw new Error("Wettbewerb für PlayerMatchData-Import nicht gefunden.");
    }

    return {
      seasonId: season.id,
      seasonName: season.name,
      competitionId: competition.id,
      competitionName: competition.name,
      matchday,
      players: snapshotToPlayers(snapshot),
    };
  }
}

function snapshotToPlayers(snapshot: MatchdayZeroDataEntrySnapshot): PlayerLookup[] {
  return snapshot.relevantPlayers.map((player) => ({
    playerId: player.playerId,
    displayName: player.displayName,
    club: player.club,
    position: player.position,
    existingValue: player.status === "SAVED"
      ? {
          rating: player.rating,
          goals: player.goals,
          yellowRed: player.yellowRed,
          red: player.red,
          teamOfTheWeek: player.teamOfTheWeek,
        }
      : null,
  }));
}

async function parseWorkbook(
  buffer: ArrayBuffer,
  context: ImportContext,
): Promise<PlayerMatchDataImportRow[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const worksheet = workbook.getWorksheet("PlayerMatchData") ?? workbook.worksheets[0];

  if (!worksheet) {
    throw new Error("Workbook contains no worksheet.");
  }

  validateHeaders(worksheet);
  const playersById = new Map(context.players.map((player) => [player.playerId, player]));
  const playersByName = new Map<string, PlayerLookup[]>();

  for (const player of context.players) {
    const key = normalizeText(player.displayName);
    playersByName.set(key, [...(playersByName.get(key) ?? []), player]);
  }

  const rows: PlayerMatchDataImportRow[] = [];
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) {
      return;
    }

    const displayName = readText(row, 2);
    if (!displayName) {
      return;
    }

    const playerId = readText(row, 1);
    if (!hasEditableImportData(row)) {
      return;
    }

    const player = playerId
      ? playersById.get(playerId)
      : resolvePlayerByName(displayName, playersByName);
    const parsedValue = readPlayerMatchDataValue(row);
    const uploadedValue = parsedValue.value;

    if (!player) {
      rows.push({
        rowNumber,
        playerId: null,
        displayName,
        club: readText(row, 3),
        position: readText(row, 4),
        status: "UNKNOWN",
        issue: playerId
          ? `Unknown playerId ${playerId}.`
          : `Unknown or ambiguous player name ${displayName}.`,
        existingValue: null,
        uploadedValue,
      });
      return;
    }

    if (parsedValue.issues.length > 0) {
      rows.push({
        rowNumber,
        playerId: player.playerId,
        displayName: player.displayName,
        club: readText(row, 3) ?? player.club,
        position: readText(row, 4) ?? player.position,
        status: "INVALID",
        issue: parsedValue.issues.join(" "),
        existingValue: player.existingValue,
        uploadedValue,
      });
      return;
    }

    const existingValue = player.existingValue;
    const status = getImportStatus(existingValue, uploadedValue);

    rows.push({
      rowNumber,
      playerId: player.playerId,
      displayName: player.displayName,
      club: readText(row, 3) ?? player.club,
      position: readText(row, 4) ?? player.position,
      status,
      issue: status === "UPDATE" ? "Excel value differs from existing PlayerMatchData." : null,
      existingValue,
      uploadedValue,
    });
  });

  return markDuplicateConflicts(rows);
}

function validateHeaders(worksheet: ExcelJS.Worksheet) {
  const headerRow = worksheet.getRow(1);
  const requiredHeaders = ["playerId", "Spieler", "Note", "Tore"] as const;

  for (const header of requiredHeaders) {
    const found = templateHeaders.some((expected, index) => (
      expected === header && readText(headerRow, index + 1) === header
    ));

    if (!found) {
      throw new Error(`Workbook does not match PlayerMatchData template. Missing ${header}.`);
    }
  }
}

function createPreview(input: {
  context: ImportContext;
  filename: string;
  rows: PlayerMatchDataImportRow[];
}): PlayerMatchDataImportPreview {
  const summary = {
    uploadedRows: input.rows.length,
    newRows: input.rows.filter((row) => row.status === "NEW").length,
    updatedRows: input.rows.filter((row) => row.status === "UPDATE").length,
    unchangedRows: input.rows.filter((row) => row.status === "UNCHANGED").length,
    unknownPlayers: input.rows.filter((row) => row.status === "UNKNOWN").length,
    invalidRows: input.rows.filter((row) => row.status === "INVALID").length,
    duplicateConflicts: input.rows.filter((row) => row.status === "DUPLICATE_CONFLICT").length,
    blockedRows: input.rows.filter((row) => isBlockingImportStatus(row.status)).length,
  };

  return {
    previewId: randomUUID(),
    filename: input.filename,
    seasonId: input.context.seasonId,
    seasonName: input.context.seasonName,
    competitionId: input.context.competitionId,
    competitionName: input.context.competitionName,
    matchday: input.context.matchday,
    rows: input.rows,
    summary,
    createdAt: new Date().toISOString(),
  };
}

async function writePreview(preview: PlayerMatchDataImportPreview) {
  await mkdir(previewDirectory, { recursive: true });
  await writeFile(createPreviewPath(preview.previewId), `${JSON.stringify(preview, null, 2)}\n`, "utf8");
}

function createPreviewPath(previewId: string) {
  return path.join(previewDirectory, `${previewId}.json`);
}

function markDuplicateConflicts(rows: PlayerMatchDataImportRow[]) {
  const rowsByPlayerId = new Map<string, PlayerMatchDataImportRow[]>();

  for (const row of rows) {
    if (!row.playerId || isBlockingImportStatus(row.status)) {
      continue;
    }

    rowsByPlayerId.set(row.playerId, [...(rowsByPlayerId.get(row.playerId) ?? []), row]);
  }

  const duplicateConflictRows = new Set<PlayerMatchDataImportRow>();

  for (const group of rowsByPlayerId.values()) {
    if (group.length < 2) {
      continue;
    }

    const firstValue = group[0]?.uploadedValue;
    const hasDifferentValues = firstValue
      ? group.some((row) => !isSameValue(row.uploadedValue, firstValue))
      : false;

    if (hasDifferentValues) {
      for (const row of group) {
        duplicateConflictRows.add(row);
      }
    }
  }

  if (duplicateConflictRows.size === 0) {
    return rows;
  }

  return rows.map((row) => (
    duplicateConflictRows.has(row)
      ? {
          ...row,
          status: "DUPLICATE_CONFLICT" as const,
          issue: "Workbook contains multiple rows for this player with different values.",
        }
      : row
  ));
}

function resolvePlayerByName(
  displayName: string,
  playersByName: ReadonlyMap<string, readonly PlayerLookup[]>,
) {
  const matches = playersByName.get(normalizeText(displayName)) ?? [];
  return matches.length === 1 ? matches[0] : null;
}

function getImportStatus(
  existingValue: PlayerMatchDataValue | null,
  uploadedValue: PlayerMatchDataValue,
): PlayerMatchDataImportRowStatus {
  if (!existingValue) {
    return "NEW";
  }

  return isSameValue(existingValue, uploadedValue) ? "UNCHANGED" : "UPDATE";
}

function isBlockingImportStatus(status: PlayerMatchDataImportRowStatus) {
  return status === "UNKNOWN" || status === "INVALID" || status === "DUPLICATE_CONFLICT";
}

function isSameValue(first: PlayerMatchDataValue, second: PlayerMatchDataValue) {
  return first.rating === second.rating
    && first.goals === second.goals
    && first.yellowRed === second.yellowRed
    && first.red === second.red
    && first.teamOfTheWeek === second.teamOfTheWeek;
}

async function verifyAppliedRows(
  prisma: PrismaClient,
  preview: PlayerMatchDataImportPreview,
  rowsToApply: readonly PlayerMatchDataImportRow[],
) {
  if (rowsToApply.length === 0) {
    return 0;
  }

  const playerIds = rowsToApply.flatMap((row) => (row.playerId ? [row.playerId] : []));
  const persistedRows = await prisma.playerMatchData.findMany({
    where: {
      seasonId: preview.seasonId,
      matchday: preview.matchday,
      playerId: { in: playerIds },
    },
    select: {
      playerId: true,
      rating: true,
      goals: true,
      yellowRed: true,
      red: true,
      teamOfTheWeek: true,
    },
  });
  const persistedByPlayerId = new Map(persistedRows.map((row) => [row.playerId, row]));

  return rowsToApply.filter((row) => {
    if (!row.playerId) {
      return false;
    }

    const persisted = persistedByPlayerId.get(row.playerId);
    return persisted
      ? isSameValue(
          {
            rating: persisted.rating,
            goals: persisted.goals,
            yellowRed: persisted.yellowRed,
            red: persisted.red,
            teamOfTheWeek: persisted.teamOfTheWeek,
          },
          row.uploadedValue,
        )
      : false;
  }).length;
}

async function createAudit(
  tx: ImportTransactionClient,
  preview: PlayerMatchDataImportPreview,
) {
  const auditDelegate = getAuditDelegate(tx);

  if (!auditDelegate) {
    throw createMissingAuditDelegateError();
  }

  await auditDelegate.create({
    data: {
      seasonId: preview.seasonId,
      competitionId: preview.competitionId,
      matchday: preview.matchday,
      filename: preview.filename,
      importedRows: preview.summary.newRows,
      updatedRows: preview.summary.updatedRows,
      unchangedRows: preview.summary.unchangedRows,
      conflictRows: preview.summary.duplicateConflicts,
      unknownRows: preview.summary.unknownPlayers,
      summaryJson: preview as unknown as Prisma.InputJsonValue,
    },
  });
}

function assertAuditDelegateAvailable(client: PrismaClient) {
  if (!getAuditDelegate(client)) {
    throw createMissingAuditDelegateError();
  }
}

function getAuditDelegate(client: unknown): PlayerMatchDataImportAuditDelegate | null {
  if (!client || typeof client !== "object" || !("playerMatchDataImportAudit" in client)) {
    return null;
  }

  const delegate = (client as { playerMatchDataImportAudit?: unknown }).playerMatchDataImportAudit;

  if (!delegate || typeof delegate !== "object" || !("create" in delegate)) {
    return null;
  }

  const create = (delegate as { create?: unknown }).create;
  return typeof create === "function"
    ? (delegate as PlayerMatchDataImportAuditDelegate)
    : null;
}

function createMissingAuditDelegateError() {
  return new Error(
    "PlayerMatchDataImportAudit ist im Prisma Client nicht verfügbar. Bitte npm run db:generate und npm run db:push ausführen, bevor Excel-Importe angewendet werden.",
  );
}

function readText(row: ExcelJS.Row, column: number): string | null {
  const value = row.getCell(column).value;
  if (typeof value === "string" && value.trim() !== "") {
    return value.trim();
  }
  if (typeof value === "number") {
    return String(value);
  }
  return null;
}

function readPlayerMatchDataValue(row: ExcelJS.Row): {
  value: PlayerMatchDataValue;
  issues: string[];
} {
  const issues: string[] = [];
  const noRating = readBooleanCell(row, 10, "Keine Bewertung / Sonderfall", issues);

  return {
    value: {
      rating: readRatingCell(row, 5, noRating, issues),
      goals: readGoalsCell(row, 6, issues),
      yellowRed: readBooleanCell(row, 7, "Gelb-Rot", issues),
      red: readBooleanCell(row, 8, "Rot", issues),
      teamOfTheWeek: readBooleanCell(row, 9, "Elf des Tages", issues),
    },
    issues,
  };
}

function readGoalsCell(row: ExcelJS.Row, column: number, issues: string[]): number {
  const value = row.getCell(column).value;
  if (typeof value === "number" && Number.isFinite(value)) {
    if (value < 0 || !Number.isInteger(value)) {
      issues.push("Tore muss eine ganze Zahl ab 0 sein.");
      return 0;
    }
    return Math.max(0, Math.trunc(value));
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value.replace(",", "."));
    if (!Number.isFinite(parsed) || parsed < 0 || !Number.isInteger(parsed)) {
      issues.push("Tore muss eine ganze Zahl ab 0 sein.");
      return 0;
    }
    return parsed;
  }
  if (value !== null && value !== undefined) {
    issues.push("Tore enthält einen ungültigen Wert.");
  }
  return 0;
}

function readRatingCell(
  row: ExcelJS.Row,
  column: number,
  noRating: boolean,
  issues: string[],
): number | null {
  if (noRating) {
    return null;
  }

  const value = row.getCell(column).value;
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = typeof value === "number"
    ? value
    : typeof value === "string"
      ? Number(value.replace(",", "."))
      : null;

  if (parsed !== null && Number.isFinite(parsed) && parsed >= 1 && parsed <= 6) {
    return parsed;
  }

  issues.push("Note muss zwischen 1,0 und 6,0 liegen.");
  return null;
}

function readBooleanCell(
  row: ExcelJS.Row,
  column: number,
  label: string,
  issues: string[],
): boolean {
  const value = row.getCell(column).value;
  if (value === null || value === undefined || value === "") {
    return false;
  }
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    if (value !== 0 && value !== 1) {
      issues.push(`${label} muss leer, 0/1, ja/nein oder x sein.`);
    }
    return value !== 0;
  }
  if (typeof value === "string") {
    const normalized = normalizeText(value);
    if (["x", "ja", "yes", "true", "1"].includes(normalized)) {
      return true;
    }
    if (["nein", "no", "false", "0"].includes(normalized)) {
      return false;
    }
  }

  issues.push(`${label} muss leer, 0/1, ja/nein oder x sein.`);
  return false;
}

function normalizeText(value: string) {
  return value.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function hasEditableImportData(row: ExcelJS.Row) {
  for (let column = 5; column <= 10; column += 1) {
    const value = row.getCell(column).value;

    if (typeof value === "number" || typeof value === "boolean") {
      return true;
    }

    if (typeof value === "string" && value.trim() !== "") {
      return true;
    }
  }

  return false;
}

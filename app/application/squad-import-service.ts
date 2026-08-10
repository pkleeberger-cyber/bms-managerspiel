import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import ExcelJS from "exceljs";

import {
  PrismaManagerSeasonRepository,
  PrismaPlayerRepository,
  PrismaSquadRepository,
} from "@/infrastructure";
import type {
  ManagerSeasonRecord,
  ManagerSeasonRepository,
  PlayerRecord,
  PlayerRepository,
  SquadAssignmentRecord,
  SquadAssignmentUpsertRecord,
  SquadRepository,
} from "@/infrastructure";
import {
  OFFICIAL_LINEUP_IDS,
  getPositionForLineupId,
} from "@/domain/lineup-engine";
import type { LineupId, PlayerPosition } from "@/domain/lineup-engine";

const managerHeaderAliases = ["manager_name", "manager", "managername"] as const;
const managerIdHeaderAliases = ["manager_id", "managerid"] as const;
const slotHeaderAliases = ["slot", "slot_id", "slotid", "spielernr"] as const;
const playerHeaderAliases = ["spielername", "spieler", "player"] as const;
const playerIdHeaderAliases = ["spieler_id", "spielerid", "player_id"] as const;
const matchdayHeaderAliases = [
  "gültig_ab_spieltag",
  "gueltig_ab_spieltag",
  "spieltag",
  "matchday",
] as const;
const expectedPositionCounts = {
  goalkeeper: 2,
  defender: 5,
  midfielder: 7,
  forward: 4,
} as const satisfies Record<PlayerPosition, number>;

export type NormalizedImportedSquadSlot = {
  externalManagerId?: string;
  managerName: string;
  managerShortName: string;
  slotId: LineupId;
  externalPlayerId?: string;
  playerName: string;
  expectedPosition: PlayerPosition;
  sourceSheet: string;
  sourceRow: number;
};

export type ResolvedImportedSquadSlot = NormalizedImportedSquadSlot & {
  managerSeason: ManagerSeasonRecord;
  player: PlayerRecord;
};

export type SquadValidationIssue = {
  managerName: string;
  message: string;
};

export type SquadImportPreview = {
  workbookPath: string | null;
  workbookName: string | null;
  seasonId: string | null;
  seasonName: string | null;
  parsedManagers: number;
  parsedSlots: number;
  managersImported: number;
  squadsValid: number;
  newSquads: readonly ManagerSquadPreview[];
  changedSquads: readonly ManagerSquadPreview[];
  unchangedSquads: readonly ManagerSquadPreview[];
  missingPlayers: readonly NormalizedImportedSquadSlot[];
  unknownPlayers: readonly NormalizedImportedSquadSlot[];
  missingManagers: readonly string[];
  duplicateSlotAssignments: readonly SquadValidationIssue[];
  validationIssues: readonly SquadValidationIssue[];
  warnings: readonly string[];
};

export type ManagerSquadPreview = {
  managerSeasonId: string;
  managerName: string;
  league: ManagerSeasonRecord["league"];
  slots: readonly ResolvedImportedSquadSlot[];
};

export type SquadImportResult = {
  importedManagers: number;
  importedSlots: number;
  warnings: number;
  durationMs: number;
  timestamp: Date;
  workbookName: string;
};

export class SquadImportService {
  constructor(
    private readonly managerSeasonRepository: ManagerSeasonRepository =
      new PrismaManagerSeasonRepository(),
    private readonly playerRepository: PlayerRepository = new PrismaPlayerRepository(),
    private readonly squadRepository: SquadRepository = new PrismaSquadRepository(),
  ) {}

  async createPreview(workbookPath?: string): Promise<SquadImportPreview> {
    const [activeSeason, players, resolvedWorkbookPath] = await Promise.all([
      this.managerSeasonRepository.loadActiveSeason(),
      this.playerRepository.loadPlayers(),
      workbookPath ? Promise.resolve(workbookPath) : discoverSquadWorkbookPath(),
    ]);

    if (!activeSeason) {
      return createEmptyPreview({
        warning:
          "Kein aktiver Season-Datensatz gefunden. Anfangskader-Migration benötigt ManagerSeason-Daten.",
      });
    }

    const managerSeasons =
      await this.managerSeasonRepository.loadCurrentSeasonManagerSeasons(
        activeSeason.id,
      );

    if (!managerSeasons || !players) {
      return createEmptyPreview({
        seasonId: activeSeason.id,
        seasonName: activeSeason.name,
        warning:
          "Prisma ManagerSeason oder Player Master ist nicht erreichbar. Anfangskader-Migration kann nicht sicher verglichen werden.",
      });
    }

    if (!resolvedWorkbookPath) {
      return createEmptyPreview({
        seasonId: activeSeason.id,
        seasonName: activeSeason.name,
        warning:
          "Kein Saisonworkbook gefunden. Lade eine .xlsx-Datei hoch oder setze SQUAD_IMPORT_WORKBOOK_PATH.",
      });
    }

    const importedSlots = await parseSquadWorkbook(resolvedWorkbookPath);
    const managerSeasonIndex = createManagerSeasonIndex(managerSeasons);
    const playerIndex = createPlayerIndex(players);
    const missingManagers = getMissingManagers(
      importedSlots,
      managerSeasonIndex,
    );
    const resolvedSlots: ResolvedImportedSquadSlot[] = [];
    const missingPlayers: NormalizedImportedSquadSlot[] = [];
    const unknownPlayers: NormalizedImportedSquadSlot[] = [];

    for (const slot of importedSlots) {
      const managerSeason = resolveManagerSeason(slot, managerSeasonIndex);
      const player = resolvePlayer(slot, playerIndex);

      if (!managerSeason) {
        continue;
      }

      if (!player) {
        missingPlayers.push(slot);
        unknownPlayers.push(slot);
        continue;
      }

      resolvedSlots.push({
        ...slot,
        managerSeason,
        player,
      });
    }

    const duplicateSlotAssignments = findDuplicateSlotAssignments(importedSlots);
    const validationIssues = validateResolvedSquads(resolvedSlots);
    const squadGroups = groupResolvedSlotsByManager(resolvedSlots);
    const validSquads = squadGroups.filter(
      (squad) =>
        !validationIssues.some((issue) => issue.managerName === squad.managerName),
    );
    const existingSquads = await Promise.all(
      validSquads.map(async (squad) => ({
        squad,
        existing: await this.squadRepository.loadHistoricalSquad(
          squad.managerSeasonId,
        ),
      })),
    );
    const newSquads: ManagerSquadPreview[] = [];
    const changedSquads: ManagerSquadPreview[] = [];
    const unchangedSquads: ManagerSquadPreview[] = [];

    for (const { squad, existing } of existingSquads) {
      if (!existing || existing.length === 0) {
        newSquads.push(squad);
        continue;
      }

      if (isSquadChanged(squad, existing)) {
        changedSquads.push(squad);
      } else {
        unchangedSquads.push(squad);
      }
    }

    return {
      workbookPath: resolvedWorkbookPath,
      workbookName: path.basename(resolvedWorkbookPath),
      seasonId: activeSeason.id,
      seasonName: activeSeason.name,
      parsedManagers: new Set(importedSlots.map((slot) => slot.managerShortName)).size,
      parsedSlots: importedSlots.length,
      managersImported: validSquads.length,
      squadsValid: validSquads.length,
      newSquads,
      changedSquads,
      unchangedSquads,
      missingPlayers,
      unknownPlayers,
      missingManagers,
      duplicateSlotAssignments,
      validationIssues,
      warnings: [],
    };
  }

  async applyImport(workbookPath?: string): Promise<SquadImportResult> {
    const startedAt = Date.now();
    const preview = await this.createPreview(workbookPath);

    if (!preview.workbookPath || !preview.workbookName || !preview.seasonId) {
      throw new Error("Anfangskader-Migration abgebrochen: Workbook oder aktive Saison fehlt.");
    }

    const blockingIssues = [
      ...preview.missingPlayers.map(
        (slot) => `${slot.managerName} Slot ${slot.slotId}: Spieler fehlt`,
      ),
      ...preview.missingManagers,
      ...preview.duplicateSlotAssignments.map((issue) => issue.message),
      ...preview.validationIssues.map((issue) => issue.message),
      ...preview.warnings,
    ];

    if (blockingIssues.length > 0) {
      throw new Error(`Anfangskader-Migration abgebrochen: ${blockingIssues.join(" | ")}`);
    }

    const squadsToApply = [...preview.newSquads, ...preview.changedSquads];
    const assignments = squadsToApply.flatMap((squad) =>
      squad.slots.map(mapSlotToAssignment),
    );
    const result: SquadImportResult = {
      importedManagers: squadsToApply.length,
      importedSlots: assignments.length,
      warnings: preview.warnings.length,
      durationMs: Date.now() - startedAt,
      timestamp: new Date(),
      workbookName: preview.workbookName,
    };

    await this.squadRepository.applyImport({
      assignments,
      audit: {
        seasonId: preview.seasonId,
        workbookName: preview.workbookName,
        workbookPath: preview.workbookPath,
        importedManagers: result.importedManagers,
        importedSlots: result.importedSlots,
        warnings: preview.warnings,
        durationMs: result.durationMs,
        summary: {
          parsedManagers: preview.parsedManagers,
          parsedSlots: preview.parsedSlots,
          newSquads: preview.newSquads.length,
          changedSquads: preview.changedSquads.length,
          unchangedSquads: preview.unchangedSquads.length,
          missingPlayers: preview.missingPlayers.length,
          missingManagers: preview.missingManagers.length,
          duplicateSlotAssignments: preview.duplicateSlotAssignments.length,
          validationIssues: preview.validationIssues.length,
          timestamp: result.timestamp.toISOString(),
        },
      },
    });

    return result;
  }
}

export async function createSquadImportPreview(workbookPath?: string) {
  const service = new SquadImportService();

  return service.createPreview(workbookPath);
}

export async function applySquadImport(workbookPath?: string) {
  const service = new SquadImportService();

  return service.applyImport(workbookPath);
}

async function discoverSquadWorkbookPath(): Promise<string | null> {
  const configuredPath =
    process.env.SQUAD_IMPORT_WORKBOOK_PATH ?? process.env.IMPORT_WORKBOOK_PATH;

  if (configuredPath && (await isReadableFile(configuredPath))) {
    return configuredPath;
  }

  const candidateDirectories = [
    process.cwd(),
    path.resolve(process.cwd(), ".."),
    path.join(os.homedir(), "Downloads"),
  ];

  for (const directory of candidateDirectories) {
    const candidates = await findExcelFiles(directory);

    for (const candidate of candidates) {
      if (await looksLikeSquadWorkbook(candidate)) {
        return candidate;
      }
    }
  }

  return null;
}

async function findExcelFiles(directory: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    const files = entries
      .filter((entry) => entry.isFile())
      .map((entry) => path.join(directory, entry.name))
      .filter((filePath) => /\.(xlsx|xls)$/i.test(filePath));

    return files.sort((a, b) => b.localeCompare(a));
  } catch {
    return [];
  }
}

async function isReadableFile(filePath: string): Promise<boolean> {
  try {
    const stat = await fs.stat(filePath);
    return stat.isFile();
  } catch {
    return false;
  }
}

async function looksLikeSquadWorkbook(filePath: string): Promise<boolean> {
  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const squadSheet = workbook.worksheets.find(
      (worksheet) => normalizeText(worksheet.name) === "kader",
    );

    return Boolean(
      squadSheet &&
        findHeaderRow(squadSheet, [
          managerHeaderAliases,
          slotHeaderAliases,
          playerHeaderAliases,
          matchdayHeaderAliases,
        ]),
    );
  } catch {
    return false;
  }
}

async function parseSquadWorkbook(
  workbookPath: string,
): Promise<NormalizedImportedSquadSlot[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(workbookPath);
  const worksheet = workbook.worksheets.find(
    (sheet) => normalizeText(sheet.name) === "kader",
  );

  if (!worksheet) {
    return [];
  }

  const headerRow = findHeaderRow(worksheet, [
    managerHeaderAliases,
    slotHeaderAliases,
    playerHeaderAliases,
    matchdayHeaderAliases,
  ]);

  if (!headerRow) {
    return [];
  }

  const managerIdColumn = findColumnByHeaders(
    worksheet,
    headerRow,
    managerIdHeaderAliases,
  );
  const managerNameColumn = findColumnByHeaders(
    worksheet,
    headerRow,
    managerHeaderAliases,
  );
  const slotColumn = findColumnByHeaders(worksheet, headerRow, slotHeaderAliases);
  const playerIdColumn = findColumnByHeaders(
    worksheet,
    headerRow,
    playerIdHeaderAliases,
  );
  const playerNameColumn = findColumnByHeaders(
    worksheet,
    headerRow,
    playerHeaderAliases,
  );
  const matchdayColumn = findColumnByHeaders(
    worksheet,
    headerRow,
    matchdayHeaderAliases,
  );

  if (!managerNameColumn || !slotColumn || !playerNameColumn || !matchdayColumn) {
    return [];
  }

  const slots: NormalizedImportedSquadSlot[] = [];

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber <= headerRow) {
      return;
    }

    const managerName = readStringCell(row.getCell(managerNameColumn));
    const slotId = readNumberCell(row.getCell(slotColumn));
    const playerName = readStringCell(row.getCell(playerNameColumn));
    const matchday = readMatchdayCell(row.getCell(matchdayColumn));

    if (matchday !== 1) {
      return;
    }

    if (!managerName || !slotId || !playerName || !isLineupId(slotId)) {
      return;
    }

    slots.push({
      externalManagerId: managerIdColumn
        ? readStringCell(row.getCell(managerIdColumn))
        : undefined,
      managerName,
      managerShortName: createShortName(managerName),
      slotId,
      externalPlayerId: playerIdColumn
        ? readStringCell(row.getCell(playerIdColumn))
        : undefined,
      playerName,
      expectedPosition: getPositionForLineupId(slotId),
      sourceSheet: worksheet.name,
      sourceRow: rowNumber,
    });
  });

  return slots;
}

function findHeaderRow(
  worksheet: ExcelJS.Worksheet,
  requiredHeaders: readonly (string | readonly string[])[],
): number | null {
  for (let rowNumber = 1; rowNumber <= Math.min(12, worksheet.rowCount); rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    const values: string[] = [];

    row.eachCell((cell) => {
      values.push(normalizeText(readStringCell(cell)));
    });

    if (
      requiredHeaders.every((header) =>
        typeof header === "string"
          ? values.includes(normalizeText(header))
          : header.some((alias) => values.includes(normalizeText(alias))),
      )
    ) {
      return rowNumber;
    }
  }

  return null;
}

function findColumnByHeaders(
  worksheet: ExcelJS.Worksheet,
  headerRow: number,
  headers: readonly string[],
): number | null {
  const normalizedHeaders = new Set(headers.map(normalizeText));
  const row = worksheet.getRow(headerRow);

  for (let column = 1; column <= row.cellCount; column += 1) {
    if (normalizedHeaders.has(normalizeText(readStringCell(row.getCell(column))))) {
      return column;
    }
  }

  return null;
}

function readStringCell(cell: ExcelJS.Cell): string {
  return readCellValue(cell.value).trim();
}

function readNumberCell(cell: ExcelJS.Cell): number | null {
  const value = cell.value;

  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "object" && value && "result" in value) {
    const result = value.result;
    if (typeof result === "number") {
      return result;
    }
    if (typeof result === "string") {
      return parseNumber(result);
    }
  }

  if (typeof value === "string") {
    return parseNumber(value);
  }

  return null;
}

function readMatchdayCell(cell: ExcelJS.Cell): number | null {
  const directNumber = readNumberCell(cell);

  if (directNumber !== null) {
    return directNumber;
  }

  const rawValue = readStringCell(cell);
  const normalized = normalizeText(rawValue).replace(/\s+/g, "");

  if (normalized === "1.spieltag" || normalized === "spieltag1") {
    return 1;
  }

  return parseNumber(rawValue);
}

function parseNumber(value: string): number | null {
  const normalized = value.replace(",", ".").replace(/[^\d.-]/g, "");
  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : null;
}

function readCellValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  if (typeof value === "object" && "text" in value) {
    return String(value.text ?? "");
  }

  if (typeof value === "object" && "result" in value) {
    return readCellValue(value.result);
  }

  if (typeof value === "object" && "richText" in value && Array.isArray(value.richText)) {
    return value.richText.map((item: { text?: string }) => item.text ?? "").join("");
  }

  return "";
}

function createPlayerIndex(players: readonly PlayerRecord[]) {
  return {
    byKickerId: new Map(
      players
        .filter((player) => player.kickerId)
        .map((player) => [player.kickerId, player] as const),
    ),
    byDisplayName: new Map(
      players.map((player) => [normalizeText(player.displayName), player] as const),
    ),
  };
}

function resolvePlayer(
  slot: NormalizedImportedSquadSlot,
  index: ReturnType<typeof createPlayerIndex>,
): PlayerRecord | null {
  if (slot.externalPlayerId) {
    const byKickerId = index.byKickerId.get(slot.externalPlayerId);

    if (byKickerId) {
      return byKickerId;
    }
  }

  return index.byDisplayName.get(normalizeText(slot.playerName)) ?? null;
}

function getMissingManagers(
  slots: readonly NormalizedImportedSquadSlot[],
  managerSeasonIndex: ReturnType<typeof createManagerSeasonIndex>,
): readonly string[] {
  return [
    ...new Set(
      slots
        .filter((slot) => !resolveManagerSeason(slot, managerSeasonIndex))
        .map((slot) => slot.managerName),
    ),
  ].sort((a, b) => a.localeCompare(b, "de"));
}

function createManagerSeasonIndex(managerSeasons: readonly ManagerSeasonRecord[]) {
  return {
    byShortName: new Map(
      managerSeasons.map((managerSeason) => [
        normalizeText(managerSeason.shortName),
        managerSeason,
      ]),
    ),
    byDisplayName: new Map(
      managerSeasons.map((managerSeason) => [
        normalizeText(managerSeason.displayName),
        managerSeason,
      ]),
    ),
  };
}

function resolveManagerSeason(
  slot: NormalizedImportedSquadSlot,
  index: ReturnType<typeof createManagerSeasonIndex>,
): ManagerSeasonRecord | null {
  return (
    index.byShortName.get(normalizeText(slot.managerShortName)) ??
    index.byDisplayName.get(normalizeText(slot.managerName)) ??
    null
  );
}

function findDuplicateSlotAssignments(
  slots: readonly NormalizedImportedSquadSlot[],
): readonly SquadValidationIssue[] {
  const groups = new Map<string, NormalizedImportedSquadSlot[]>();

  for (const slot of slots) {
    const key = `${slot.managerShortName}:${slot.slotId}`;
    groups.set(key, [...(groups.get(key) ?? []), slot]);
  }

  return [...groups.values()]
    .filter((group) => group.length > 1)
    .map((group) => ({
      managerName: group[0]?.managerName ?? "Unbekannt",
      message: `${group[0]?.managerName ?? "Unbekannt"} Slot ${group[0]?.slotId ?? "?"} mehrfach belegt`,
    }));
}

function validateResolvedSquads(
  slots: readonly ResolvedImportedSquadSlot[],
): readonly SquadValidationIssue[] {
  const issues: SquadValidationIssue[] = [];
  const grouped = groupResolvedSlotsByManager(slots);

  for (const squad of grouped) {
    if (squad.slots.length !== OFFICIAL_LINEUP_IDS.length) {
      issues.push({
        managerName: squad.managerName,
        message: `${squad.managerName}: ${squad.slots.length} Slots gefunden, 18 erwartet`,
      });
    }

    const slotIds = new Set(squad.slots.map((slot) => slot.slotId));

    for (const officialSlotId of OFFICIAL_LINEUP_IDS) {
      if (!slotIds.has(officialSlotId)) {
        issues.push({
          managerName: squad.managerName,
          message: `${squad.managerName}: Slot ${officialSlotId} fehlt`,
        });
      }
    }

    if (new Set(squad.slots.map((slot) => slot.player.id)).size !== squad.slots.length) {
      issues.push({
        managerName: squad.managerName,
        message: `${squad.managerName}: Spieler mehrfach im Kader`,
      });
    }

    const positionCounts = countPositions(squad.slots);

    for (const [position, expectedCount] of Object.entries(expectedPositionCounts)) {
      const actualCount = positionCounts[position as PlayerPosition] ?? 0;

      if (actualCount !== expectedCount) {
        issues.push({
          managerName: squad.managerName,
          message: `${squad.managerName}: ${actualCount} ${formatPosition(position as PlayerPosition)} gefunden, ${expectedCount} erwartet`,
        });
      }
    }

    for (const slot of squad.slots) {
      if (mapPositionGroup(slot.player.positionGroup) !== slot.expectedPosition) {
        issues.push({
          managerName: squad.managerName,
          message: `${squad.managerName} Slot ${slot.slotId}: ${slot.player.displayName} hat Position ${slot.player.positionGroup}, erwartet ${slot.expectedPosition}`,
        });
      }
    }
  }

  return issues;
}

function countPositions(
  slots: readonly ResolvedImportedSquadSlot[],
): Record<PlayerPosition, number> {
  return slots.reduce(
    (counts, slot) => ({
      ...counts,
      [slot.expectedPosition]: counts[slot.expectedPosition] + 1,
    }),
    {
      goalkeeper: 0,
      defender: 0,
      midfielder: 0,
      forward: 0,
    } satisfies Record<PlayerPosition, number>,
  );
}

function formatPosition(position: PlayerPosition): string {
  switch (position) {
    case "goalkeeper":
      return "Torwart";
    case "defender":
      return "Abwehr";
    case "midfielder":
      return "Mittelfeld";
    case "forward":
      return "Sturm";
  }
}

function groupResolvedSlotsByManager(
  slots: readonly ResolvedImportedSquadSlot[],
): readonly ManagerSquadPreview[] {
  const groups = new Map<string, ResolvedImportedSquadSlot[]>();

  for (const slot of slots) {
    groups.set(slot.managerSeason.id, [
      ...(groups.get(slot.managerSeason.id) ?? []),
      slot,
    ]);
  }

  return [...groups.values()].map((group) => {
    const [firstSlot] = group;

    return {
      managerSeasonId: firstSlot.managerSeason.id,
      managerName: firstSlot.managerSeason.displayName,
      league: firstSlot.managerSeason.league,
      slots: [...group].sort((a, b) => a.slotId - b.slotId),
    };
  });
}

function isSquadChanged(
  squad: ManagerSquadPreview,
  existing: readonly SquadAssignmentRecord[],
): boolean {
  const initialExisting = existing.filter(
    (assignment) =>
      assignment.validFromMatchday === 1 && assignment.validToMatchday === null,
  );

  if (initialExisting.length !== squad.slots.length) {
    return true;
  }

  return squad.slots.some((slot) => {
    const existingSlot = initialExisting.find(
      (assignment) => assignment.slotId === slot.slotId,
    );

    return !existingSlot || existingSlot.playerId !== slot.player.id;
  });
}

function mapSlotToAssignment(
  slot: ResolvedImportedSquadSlot,
): SquadAssignmentUpsertRecord {
  return {
    managerSeasonId: slot.managerSeason.id,
    playerId: slot.player.id,
    slotId: slot.slotId,
    validFromMatchday: 1,
    validToMatchday: null,
    reason: "INITIAL_SQUAD",
  };
}

function mapPositionGroup(positionGroup: PlayerRecord["positionGroup"]): PlayerPosition {
  switch (positionGroup) {
    case "TW":
      return "goalkeeper";
    case "AB":
      return "defender";
    case "MF":
      return "midfielder";
    case "ST":
      return "forward";
  }
}

function isLineupId(value: number): value is LineupId {
  return OFFICIAL_LINEUP_IDS.includes(value as LineupId);
}

function createShortName(displayName: string): string {
  return normalizeText(displayName)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function normalizeText(value: string): string {
  return value.trim().toLowerCase();
}

function createEmptyPreview(input: {
  seasonId?: string;
  seasonName?: string;
  warning: string;
}): SquadImportPreview {
  return {
    workbookPath: null,
    workbookName: null,
    seasonId: input.seasonId ?? null,
    seasonName: input.seasonName ?? null,
    parsedManagers: 0,
    parsedSlots: 0,
    managersImported: 0,
    squadsValid: 0,
    newSquads: [],
    changedSquads: [],
    unchangedSquads: [],
    missingPlayers: [],
    unknownPlayers: [],
    missingManagers: [],
    duplicateSlotAssignments: [],
    validationIssues: [],
    warnings: [input.warning],
  };
}

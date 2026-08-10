import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import ExcelJS from "exceljs";
import type { Prisma } from "@prisma/client";

import { PrismaPlayerRepository } from "@/infrastructure";
import type {
  PlayerPositionGroup,
  PlayerRecord,
  PlayerRepository,
  PlayerUpsertRecord,
  PlayerListPhase,
  PlayerListVersionRecord,
} from "@/infrastructure";

export type NormalizedImportedPlayer = {
  displayName: string;
  positionGroup: PlayerPositionGroup;
  bundesligaClub: string;
  marketValue: number;
  status: "ACTIVE" | "LEFT_BUNDESLIGA";
  ignoredFields: {
    unterVertrag: string;
    kaufpreis: string;
  };
  sourceSheet: string;
  sourceRow: number;
};

export type PlayerImportChange = {
  imported: NormalizedImportedPlayer;
  existing: PlayerRecord;
  changes: readonly {
    field: "bundesligaClub" | "marketValue" | "positionGroup" | "status";
    before: string;
    after: string;
  }[];
};

export type PlayerImportDuplicateWarning = {
  key: string;
  players: readonly NormalizedImportedPlayer[];
};

export type PlayerImportPreview = {
  workbookPath: string | null;
  workbookName: string | null;
  selectedSheet: string | null;
  parsedPlayers: number;
  existingPlayers: number;
  newPlayers: readonly NormalizedImportedPlayer[];
  changedPlayers: readonly PlayerImportChange[];
  unchangedPlayers: readonly NormalizedImportedPlayer[];
  leftBundesliga: readonly PlayerRecord[];
  clubChanges: readonly PlayerImportChange[];
  marketValueChanges: readonly PlayerImportChange[];
  duplicateWarnings: readonly PlayerImportDuplicateWarning[];
  verification: PlayerImportVerification;
  importContext: PlayerImportVersionContext;
  warnings: readonly string[];
};

export type PlayerImportVerification = {
  importedPlayers: number;
  prismaPlayers: number;
  duplicateNames: readonly string[];
  missingClubs: readonly string[];
  missingPositions: readonly string[];
};

export type PlayerImportResult = {
  imported: number;
  updated: number;
  unchanged: number;
  departures: number;
  errors: number;
  durationMs: number;
  timestamp: Date;
  workbookName: string;
  verification: PlayerImportVerification;
  versionNumber?: number;
};

export type PlayerImportContextInput = {
  seasonId?: string;
  phase?: PlayerListPhase;
  note?: string;
  filename?: string;
  createdBy?: string;
};

export type PlayerImportPreviewOptions = {
  allowDiscovery?: boolean;
  context?: PlayerImportContextInput;
};

export type PlayerImportVersionContext = {
  seasons: readonly PlayerMasterSeasonOption[];
  selectedSeasonId?: string;
  selectedSeasonName?: string;
  phase: PlayerListPhase;
  note?: string;
  filename?: string;
  versionCandidate?: number;
  previousVersion?: PlayerListVersionRecord;
};

export type PlayerMasterSeasonOption = {
  id: string;
  name: string;
};

export class PlayerImportService {
  constructor(
    private readonly playerRepository: PlayerRepository = new PrismaPlayerRepository(),
  ) {}

  async createPreview(
    workbookPath?: string,
    options: PlayerImportPreviewOptions = {},
  ): Promise<PlayerImportPreview> {
    const resolvedWorkbookPath =
      workbookPath ??
      (options.allowDiscovery === false
        ? null
        : await discoverPlayerWorkbookPath());
    const existingPlayers = await this.playerRepository.loadPlayers();
    const importContext = await this.createImportContext(options.context);

    if (!resolvedWorkbookPath) {
      return createEmptyPreview({
        existingPlayers: existingPlayers?.length ?? 0,
        importContext,
        warning:
          options.allowDiscovery === false
            ? "Keine Excel-Datei ausgewählt. Wähle eine .xlsx-Datei aus und erstelle eine Vorschau."
            : "Kein Transfer-Workbook gefunden. Setze PLAYER_IMPORT_WORKBOOK_PATH oder lege ein Workbook mit Transferlisten bereit.",
      });
    }

    const existing = existingPlayers ?? [];
    const parsedWorkbook = await parsePlayerWorkbook(
      resolvedWorkbookPath,
      importContext.phase,
    );
    const importedPlayers = parsedWorkbook.players;
    const verification = createPlayerImportVerification(importedPlayers, existing);
    const duplicateWarnings = findDuplicateWarnings(importedPlayers);
    const uniqueImportedPlayers = dedupeImportedPlayers(importedPlayers);
    const existingByIdentity = createExistingPlayerIndex(existing);
    const importedIdentities = new Set(
      uniqueImportedPlayers.map((player) => createPlayerIdentity(player)),
    );
    const newPlayers: NormalizedImportedPlayer[] = [];
    const changedPlayers: PlayerImportChange[] = [];
    const unchangedPlayers: NormalizedImportedPlayer[] = [];

    for (const imported of uniqueImportedPlayers) {
      const existingPlayer = findExistingPlayer(imported, existingByIdentity);

      if (!existingPlayer) {
        newPlayers.push(imported);
        continue;
      }

      const changes = comparePlayer(imported, existingPlayer);

      if (changes.length > 0) {
        changedPlayers.push({
          imported,
          existing: existingPlayer,
          changes,
        });
      } else {
        unchangedPlayers.push(imported);
      }
    }

    return {
      workbookPath: resolvedWorkbookPath,
      workbookName: path.basename(resolvedWorkbookPath),
      selectedSheet: parsedWorkbook.selectedSheet,
      parsedPlayers: importedPlayers.length,
      existingPlayers: existing.length,
      newPlayers,
      changedPlayers,
      unchangedPlayers,
      leftBundesliga: existing.filter(
        (player) =>
          player.status !== "LEFT_BUNDESLIGA" &&
          !importedIdentities.has(createPlayerIdentity(player)),
      ),
      clubChanges: changedPlayers.filter((change) =>
        change.changes.some((item) => item.field === "bundesligaClub"),
      ),
      marketValueChanges: changedPlayers.filter((change) =>
        change.changes.some((item) => item.field === "marketValue"),
      ),
      duplicateWarnings,
      verification,
      importContext: {
        ...importContext,
        filename: options.context?.filename ?? path.basename(resolvedWorkbookPath),
      },
      warnings: [
        ...(existingPlayers
          ? []
          : ["Prisma Player Master ist nicht erreichbar. Preview nutzt nur Workbook-Daten."]),
        ...(importContext.selectedSeasonId
          ? []
          : ["Keine Saison ausgewählt. Der Import kann erst mit Saisonkontext übernommen werden."]),
      ],
    };
  }

  async applyImport(
    workbookPath?: string,
    context?: PlayerImportContextInput,
  ): Promise<PlayerImportResult> {
    const startedAt = Date.now();
    const preview = await this.createPreview(workbookPath, {
      allowDiscovery: false,
      context,
    });

    if (!preview.workbookPath || !preview.workbookName) {
      throw new Error("Player Import abgebrochen: Kein Workbook gefunden.");
    }

    if (!preview.importContext.selectedSeasonId) {
      throw new Error("Player Import abgebrochen: Keine Saison ausgewählt.");
    }

    if (preview.warnings.length > 0) {
      throw new Error(`Player Import abgebrochen: ${preview.warnings.join(" ")}`);
    }

    const newPlayers: PlayerUpsertRecord[] = preview.newPlayers.map((player) =>
      mapImportedPlayerToUpsert(player),
    );
    const updatedPlayers: PlayerUpsertRecord[] = preview.changedPlayers.map(
      (change) => ({
        ...mapImportedPlayerToUpsert(change.imported),
        id: change.existing.id,
      }),
    );
    const departures = preview.leftBundesliga.map((player) => ({
      id: player.id,
      status: "LEFT_BUNDESLIGA" as const,
    }));
    const timestamp = new Date();
    const durationBeforeWrite = Date.now() - startedAt;
    const applyResult = await this.playerRepository.applyImport({
      upserts: [...newPlayers, ...updatedPlayers],
      departures,
      audit: {
        workbookName: preview.workbookName,
        workbookPath: preview.workbookPath,
        imported: newPlayers.length,
        updated: updatedPlayers.length,
        unchanged: preview.unchangedPlayers.length,
        departures: departures.length,
        errors: 0,
        durationMs: durationBeforeWrite,
        summary: {
          parsedPlayers: preview.parsedPlayers,
          existingPlayers: preview.existingPlayers,
          verification: preview.verification,
          duplicateWarnings: preview.duplicateWarnings.length,
          clubChanges: preview.clubChanges.length,
          marketValueChanges: preview.marketValueChanges.length,
          timestamp: timestamp.toISOString(),
          selectedSheet: preview.selectedSheet,
        },
      },
      version: {
        seasonId: preview.importContext.selectedSeasonId,
        phase: preview.importContext.phase,
        filename: context?.filename ?? preview.workbookName,
        countsJson: createPlayerImportCountsJson(preview),
        ignoredColumnsJson: createIgnoredColumnsJson(),
        deltaJson: createPlayerImportDeltaJson(preview),
        note: context?.note,
        createdBy: context?.createdBy,
      },
    });

    const playersAfterImport = await this.playerRepository.loadPlayers();
    const durationMs = Date.now() - startedAt;
    const result: PlayerImportResult = {
      imported: newPlayers.length,
      updated: updatedPlayers.length,
      unchanged: preview.unchangedPlayers.length,
      departures: departures.length,
      errors: 0,
      durationMs,
      timestamp,
      workbookName: preview.workbookName,
      versionNumber: applyResult.playerListVersionNumber,
      verification: createPlayerImportVerification(
        [
          ...preview.newPlayers,
          ...preview.changedPlayers.map((change) => change.imported),
          ...preview.unchangedPlayers,
        ],
        playersAfterImport ?? [],
      ),
    };

    return result;
  }

  private async createImportContext(
    input?: PlayerImportContextInput,
  ): Promise<PlayerImportVersionContext> {
    const phase = input?.phase ?? "SUMMER";
    const [seasonsResult, activeSeason] = await Promise.all([
      this.playerRepository.loadSeasons(),
      this.playerRepository.loadActiveSeason(),
    ]);
    const seasons = seasonsResult ?? (activeSeason ? [activeSeason] : []);
    const selectedSeason =
      seasons.find((season) => season.id === input?.seasonId) ??
      activeSeason ??
      seasons[0];
    const previousVersion = selectedSeason
      ? await this.playerRepository.loadLatestPlayerListVersion(
          selectedSeason.id,
          phase,
        )
      : null;

    return {
      seasons,
      selectedSeasonId: selectedSeason?.id,
      selectedSeasonName: selectedSeason?.name,
      phase,
      note: input?.note,
      filename: input?.filename,
      versionCandidate: selectedSeason
        ? (previousVersion?.versionNumber ?? 0) + 1
        : undefined,
      previousVersion: previousVersion ?? undefined,
    };
  }
}

export async function createPlayerImportPreview(
  workbookPath?: string,
  options?: PlayerImportPreviewOptions,
) {
  const service = new PlayerImportService();

  return service.createPreview(workbookPath, options);
}

export async function applyPlayerImport(
  workbookPath?: string,
  context?: PlayerImportContextInput,
) {
  const service = new PlayerImportService();

  return service.applyImport(workbookPath, context);
}

async function discoverPlayerWorkbookPath(): Promise<string | null> {
  const configuredPath =
    process.env.PLAYER_IMPORT_WORKBOOK_PATH ?? process.env.IMPORT_WORKBOOK_PATH;

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
      if (await looksLikePlayerWorkbook(candidate)) {
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

async function looksLikePlayerWorkbook(filePath: string): Promise<boolean> {
  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    return workbook.worksheets.some(
      (worksheet) =>
        findHeaderRow(worksheet, [
          "verkaufspreis",
          "unter vertrag",
          "kaufpreis",
          "spieler",
          "verein",
          "position",
        ]) !== null ||
        normalizeText(worksheet.name).includes("transferliste") ||
        normalizeText(worksheet.name) === "spielerliste",
    );
  } catch {
    return false;
  }
}

async function parsePlayerWorkbook(
  workbookPath: string,
  phase: PlayerListPhase,
): Promise<{
  players: NormalizedImportedPlayer[];
  selectedSheet: string | null;
}> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(workbookPath);
  const phaseWorksheet = findPhaseWorksheet(workbook, phase);

  if (phaseWorksheet) {
    return {
      players: parseOfficialPlayerWorksheet(phaseWorksheet),
      selectedSheet: phaseWorksheet.name,
    };
  }

  const officialPlayers = parseOfficialPlayerSheets(workbook);

  if (officialPlayers.length > 0) {
    return {
      players: officialPlayers,
      selectedSheet: null,
    };
  }

  const transferPlayers = parseTransferListSheets(workbook);

  if (transferPlayers.length > 0) {
    return {
      players: transferPlayers,
      selectedSheet: null,
    };
  }

  return {
    players: parsePlayerListSheet(workbook),
    selectedSheet: null,
  };
}

function parseOfficialPlayerSheets(
  workbook: ExcelJS.Workbook,
): NormalizedImportedPlayer[] {
  return workbook.worksheets.flatMap((worksheet) =>
    parseOfficialPlayerWorksheet(worksheet),
  );
}

function parseOfficialPlayerWorksheet(
  worksheet: ExcelJS.Worksheet,
): NormalizedImportedPlayer[] {
  const headerRow = findHeaderRow(worksheet, [
    "verkaufspreis",
    "unter vertrag",
    "kaufpreis",
    "spieler",
    "verein",
    "position",
  ]);

  if (!headerRow) {
    return [];
  }

  const valueColumn = findColumnByHeader(worksheet, headerRow, "verkaufspreis");
  const contractColumn = findColumnByHeader(worksheet, headerRow, "unter vertrag");
  const purchaseColumn = findColumnByHeader(worksheet, headerRow, "kaufpreis");
  const playerColumn = findColumnByHeader(worksheet, headerRow, "spieler");
  const clubColumn = findColumnByHeader(worksheet, headerRow, "verein");
  const positionColumn = findColumnByHeader(worksheet, headerRow, "position");

  if (
    !valueColumn ||
    !contractColumn ||
    !purchaseColumn ||
    !playerColumn ||
    !clubColumn ||
    !positionColumn
  ) {
    return [];
  }

  const players: NormalizedImportedPlayer[] = [];

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber <= headerRow) {
      return;
    }

    const displayName = readStringCell(row.getCell(playerColumn));
    const bundesligaClub = readStringCell(row.getCell(clubColumn));
    const positionGroup = mapWorkbookPosition(
      readStringCell(row.getCell(positionColumn)),
    );
    const marketValue = readNumberCell(row.getCell(valueColumn));

    if (!displayName || !positionGroup || marketValue === null) {
      return;
    }

    players.push({
      displayName,
      positionGroup,
      bundesligaClub,
      marketValue,
      status: mapOfficialPlayerStatus(bundesligaClub),
      ignoredFields: {
        unterVertrag: readStringCell(row.getCell(contractColumn)),
        kaufpreis: readStringCell(row.getCell(purchaseColumn)),
      },
      sourceSheet: worksheet.name,
      sourceRow: rowNumber,
    });
  });

  return players;
}

function findPhaseWorksheet(
  workbook: ExcelJS.Workbook,
  phase: PlayerListPhase,
): ExcelJS.Worksheet | null {
  const expectedNames =
    phase === "SUMMER" ? ["vorrunde"] : ["ruckrunde", "rueckrunde"];

  return (
    workbook.worksheets.find((worksheet) =>
      expectedNames.includes(normalizeSheetName(worksheet.name)),
    ) ?? null
  );
}

function parseTransferListSheets(
  workbook: ExcelJS.Workbook,
): NormalizedImportedPlayer[] {
  return workbook.worksheets.flatMap((worksheet) => {
    const positionGroup = getPositionFromTransferSheet(worksheet.name);

    if (!positionGroup) {
      return [];
    }

    const headerRow = findHeaderRow(worksheet, ["spieler", "verein"]);

    if (!headerRow) {
      return [];
    }

    const playerColumn = findColumnByHeader(worksheet, headerRow, "spieler");
    const clubColumn = findColumnByHeader(worksheet, headerRow, "verein");
    const valueColumn = findColumnByHeader(worksheet, headerRow, "verkaufspreis");
    const contractColumn = findColumnByHeader(worksheet, headerRow, "unter vertrag");
    const purchaseColumn = findColumnByHeader(worksheet, headerRow, "kaufpreis");

    if (!playerColumn || !clubColumn || !valueColumn) {
      return [];
    }

    const players: NormalizedImportedPlayer[] = [];

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber <= headerRow) {
        return;
      }

      const displayName = readStringCell(row.getCell(playerColumn));
      const bundesligaClub = readStringCell(row.getCell(clubColumn));
      const marketValue = readNumberCell(row.getCell(valueColumn));

      if (!displayName || marketValue === null) {
        return;
      }

      players.push({
        displayName,
        positionGroup,
        bundesligaClub,
        marketValue,
        status: mapOfficialPlayerStatus(bundesligaClub),
        ignoredFields: {
          unterVertrag: contractColumn
            ? readStringCell(row.getCell(contractColumn))
            : "",
          kaufpreis: purchaseColumn ? readStringCell(row.getCell(purchaseColumn)) : "",
        },
        sourceSheet: worksheet.name,
        sourceRow: rowNumber,
      });
    });

    return players;
  });
}

function parsePlayerListSheet(
  workbook: ExcelJS.Workbook,
): NormalizedImportedPlayer[] {
  const worksheet = workbook.worksheets.find(
    (sheet) => normalizeText(sheet.name) === "spielerliste",
  );

  if (!worksheet) {
    return [];
  }

  const headerRow = findHeaderRow(worksheet, ["spielername", "verein", "position"]);

  if (!headerRow) {
    return [];
  }

  const playerColumn = findColumnByHeader(worksheet, headerRow, "spielername");
  const clubColumn = findColumnByHeader(worksheet, headerRow, "verein");
  const positionColumn = findColumnByHeader(worksheet, headerRow, "position");
  const valueColumn =
    findColumnByHeader(worksheet, headerRow, "preis(optional)") ??
    findColumnByHeader(worksheet, headerRow, "preis");

  if (!playerColumn || !clubColumn || !positionColumn || !valueColumn) {
    return [];
  }

  const players: NormalizedImportedPlayer[] = [];

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber <= headerRow) {
      return;
    }

    const displayName = readStringCell(row.getCell(playerColumn));
    const bundesligaClub = readStringCell(row.getCell(clubColumn));
    const positionGroup = mapWorkbookPosition(
      readStringCell(row.getCell(positionColumn)),
    );
    const marketValue = readNumberCell(row.getCell(valueColumn));

    if (!displayName || !positionGroup || marketValue === null) {
      return;
    }

    players.push({
      displayName,
      positionGroup,
      bundesligaClub,
      marketValue,
      status: mapOfficialPlayerStatus(bundesligaClub),
      ignoredFields: {
        unterVertrag: "",
        kaufpreis: "",
      },
      sourceSheet: worksheet.name,
      sourceRow: rowNumber,
    });
  });

  return players;
}

function findHeaderRow(
  worksheet: ExcelJS.Worksheet,
  requiredHeaders: readonly string[],
): number | null {
  for (let rowNumber = 1; rowNumber <= Math.min(12, worksheet.rowCount); rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    const values: string[] = [];

    row.eachCell((cell) => {
      values.push(normalizeText(readStringCell(cell)));
    });

    if (requiredHeaders.every((header) => values.includes(normalizeText(header)))) {
      return rowNumber;
    }
  }

  return null;
}

function findColumnByHeader(
  worksheet: ExcelJS.Worksheet,
  headerRow: number,
  header: string,
): number | null {
  const normalizedHeader = normalizeText(header);
  const row = worksheet.getRow(headerRow);

  for (let column = 1; column <= row.cellCount; column += 1) {
    if (normalizeText(readStringCell(row.getCell(column))) === normalizedHeader) {
      return column;
    }
  }

  return null;
}

function getPositionFromTransferSheet(
  sheetName: string,
): PlayerPositionGroup | null {
  const normalized = normalizeText(sheetName);

  if (!normalized.includes("transferliste")) {
    return null;
  }

  if (normalized.includes("torwart")) {
    return "TW";
  }

  if (normalized.includes("abwehr")) {
    return "AB";
  }

  if (normalized.includes("mittelfeld")) {
    return "MF";
  }

  if (normalized.includes("sturm")) {
    return "ST";
  }

  return null;
}

function mapWorkbookPosition(value: string): PlayerPositionGroup | null {
  const normalized = normalizeText(value);

  if (normalized === "tw" || normalized === "tor" || normalized === "torwart") {
    return "TW";
  }

  if (normalized === "ab" || normalized === "abw" || normalized === "abwehr") {
    return "AB";
  }

  if (
    normalized === "mf" ||
    normalized === "mit" ||
    normalized === "mittelfeld"
  ) {
    return "MF";
  }

  if (normalized === "st" || normalized === "stu" || normalized === "sturm") {
    return "ST";
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

function normalizeText(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeSheetName(value: string): string {
  return normalizeText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace("ü", "ue");
}

function createExistingPlayerIndex(players: readonly PlayerRecord[]) {
  return {
    byDisplayName: new Map(players.map((player) => [normalizeText(player.displayName), player] as const)),
  };
}

function findExistingPlayer(
  imported: NormalizedImportedPlayer,
  index: ReturnType<typeof createExistingPlayerIndex>,
): PlayerRecord | null {
  return index.byDisplayName.get(normalizeText(imported.displayName)) ?? null;
}

function comparePlayer(
  imported: NormalizedImportedPlayer,
  existing: PlayerRecord,
): PlayerImportChange["changes"] {
  return [
    ...(existing.bundesligaClub !== imported.bundesligaClub
      ? [
          {
            field: "bundesligaClub" as const,
            before: existing.bundesligaClub,
            after: imported.bundesligaClub,
          },
        ]
      : []),
    ...(existing.marketValue !== imported.marketValue
      ? [
          {
            field: "marketValue" as const,
            before: String(existing.marketValue),
            after: String(imported.marketValue),
          },
        ]
      : []),
    ...(existing.positionGroup !== imported.positionGroup
      ? [
          {
            field: "positionGroup" as const,
            before: existing.positionGroup,
            after: imported.positionGroup,
          },
        ]
      : []),
    ...(existing.status !== imported.status
      ? [
          {
            field: "status" as const,
            before: existing.status,
            after: imported.status,
          },
        ]
      : []),
  ];
}

function mapImportedPlayerToUpsert(
  player: NormalizedImportedPlayer,
): PlayerUpsertRecord {
  return {
    displayName: player.displayName,
    positionGroup: player.positionGroup,
    bundesligaClub: player.bundesligaClub,
    marketValue: player.marketValue,
    status: player.status,
  };
}

function findDuplicateWarnings(
  players: readonly NormalizedImportedPlayer[],
): PlayerImportDuplicateWarning[] {
  const groups = new Map<string, NormalizedImportedPlayer[]>();

  for (const player of players) {
    const key = createPlayerIdentity(player);
    groups.set(key, [...(groups.get(key) ?? []), player]);
  }

  return [...groups.entries()]
    .filter(([, group]) => group.length > 1)
    .map(([key, group]) => ({ key, players: group }));
}

function dedupeImportedPlayers(
  players: readonly NormalizedImportedPlayer[],
): readonly NormalizedImportedPlayer[] {
  const playersByIdentity = new Map<string, NormalizedImportedPlayer>();

  for (const player of players) {
    const key = createPlayerIdentity(player);
    const current = playersByIdentity.get(key);

    if (!current || shouldPreferImportedPlayer(player, current)) {
      playersByIdentity.set(key, player);
    }
  }

  return [...playersByIdentity.values()];
}

function shouldPreferImportedPlayer(
  candidate: NormalizedImportedPlayer,
  current: NormalizedImportedPlayer,
): boolean {
  if (
    isPositionChangeMarker(current.bundesligaClub) &&
    !isPositionChangeMarker(candidate.bundesligaClub)
  ) {
    return true;
  }

  if (
    current.status === "LEFT_BUNDESLIGA" &&
    candidate.status === "ACTIVE"
  ) {
    return true;
  }

  return false;
}

function createPlayerIdentity(player: {
  displayName: string;
}): string {
  return normalizeText(player.displayName);
}

function mapOfficialPlayerStatus(club: string): "ACTIVE" | "LEFT_BUNDESLIGA" {
  const normalizedClub = normalizeText(club);

  return normalizedClub.length === 0 || normalizedClub === "abgang"
    ? "LEFT_BUNDESLIGA"
    : "ACTIVE";
}

function isPositionChangeMarker(club: string): boolean {
  return normalizeText(club) === "positionswechsel";
}

function createPlayerImportVerification(
  importedPlayers: readonly NormalizedImportedPlayer[],
  prismaPlayers: readonly PlayerRecord[],
): PlayerImportVerification {
  return {
    importedPlayers: importedPlayers.length,
    prismaPlayers: prismaPlayers.length,
    duplicateNames: findDuplicateNames(importedPlayers),
    missingClubs: importedPlayers
      .filter((player) => player.bundesligaClub.trim().length === 0)
      .map((player) => player.displayName),
    missingPositions: importedPlayers
      .filter((player) => !player.positionGroup)
      .map((player) => player.displayName),
  };
}

function createPlayerImportCountsJson(
  preview: PlayerImportPreview,
): Prisma.InputJsonObject {
  return {
    selectedSheet: preview.selectedSheet,
    parsedPlayers: preview.parsedPlayers,
    existingPlayers: preview.existingPlayers,
    newPlayers: preview.newPlayers.length,
    changedPlayers: preview.changedPlayers.length,
    unchangedPlayers: preview.unchangedPlayers.length,
    departures: preview.leftBundesliga.length,
    duplicateWarnings: preview.duplicateWarnings.length,
    missingClubs: preview.verification.missingClubs.length,
    missingPositions: preview.verification.missingPositions.length,
  };
}

function createIgnoredColumnsJson(): Record<string, string> {
  return {
    unterVertrag:
      "Ignored. Wird später automatisch aus SquadAssignments berechnet.",
    kaufpreis:
      "Ignored. Wird später automatisch aus SquadAssignments berechnet.",
  };
}

function createPlayerImportDeltaJson(
  preview: PlayerImportPreview,
): Prisma.InputJsonObject {
  return {
    selectedSheet: preview.selectedSheet,
    previousActiveVersion:
      preview.importContext.previousVersion?.versionNumber ?? null,
    newPlayers: preview.newPlayers.map((player) => player.displayName),
    changedPlayers: preview.changedPlayers.map((change) => ({
      displayName: change.imported.displayName,
      changes: change.changes.map((item) => ({
        field: item.field,
        before: item.before,
        after: item.after,
      })),
    })),
    departures: preview.leftBundesliga.map((player) => player.displayName),
  };
}

function findDuplicateNames(
  players: readonly NormalizedImportedPlayer[],
): readonly string[] {
  const counts = new Map<string, number>();

  for (const player of players) {
    const key = normalizeText(player.displayName);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([name]) => name)
    .sort((first, second) => first.localeCompare(second, "de"));
}

function createEmptyPreview(input: {
  existingPlayers: number;
  importContext: PlayerImportVersionContext;
  warning: string;
}): PlayerImportPreview {
  return {
    workbookPath: null,
    workbookName: null,
    selectedSheet: null,
    parsedPlayers: 0,
    existingPlayers: input.existingPlayers,
    newPlayers: [],
    changedPlayers: [],
    unchangedPlayers: [],
    leftBundesliga: [],
    clubChanges: [],
    marketValueChanges: [],
    duplicateWarnings: [],
    importContext: input.importContext,
    verification: {
      importedPlayers: 0,
      prismaPlayers: input.existingPlayers,
      duplicateNames: [],
      missingClubs: [],
      missingPositions: [],
    },
    warnings: [input.warning],
  };
}

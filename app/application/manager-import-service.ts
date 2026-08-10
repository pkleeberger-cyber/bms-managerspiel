import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import ExcelJS from "exceljs";

import { PrismaManagerSeasonRepository } from "@/infrastructure";
import type {
  ActiveSeasonRecord,
  ManagerLeagueLevel,
  ManagerParticipationStatus,
  ManagerSeasonRecord,
  ManagerSeasonRepository,
  ManagerSeasonStatus,
  ManagerSeasonUpsertRecord,
  ManagerTransferStatus,
} from "@/infrastructure";

export type NormalizedImportedManagerSeason = {
  externalManagerId?: string;
  displayName: string;
  shortName: string;
  league: ManagerLeagueLevel;
  budget: number;
  status: ManagerSeasonStatus;
  participation: ManagerParticipationStatus;
  transferStatus: ManagerTransferStatus;
  currentLifecycle: "REGISTERED" | "ACTIVE";
  sourceSheet: string;
  sourceRow: number;
};

export type ManagerImportValidationIssue = {
  sourceSheet: string;
  sourceRow: number;
  field: "Manager_Name" | "Liga";
  message: string;
};

export type ManagerImportContextInput = {
  seasonId?: string;
  filename?: string;
};

export type ManagerImportPreviewOptions = {
  allowDiscovery?: boolean;
  context?: ManagerImportContextInput;
};

export type ManagerImportSeasonOption = {
  id: string;
  name: string;
};

export type ManagerImportChange = {
  imported: NormalizedImportedManagerSeason;
  existing: ManagerSeasonRecord;
  changes: readonly {
    field: "league" | "budget" | "status" | "participation" | "transferStatus";
    before: string;
    after: string;
  }[];
};

export type ManagerImportPreview = {
  workbookPath: string | null;
  workbookName: string | null;
  seasons: readonly ManagerImportSeasonOption[];
  seasonId: string | null;
  seasonName: string | null;
  parsedManagers: number;
  existingManagerSeasons: number;
  newManagers: readonly NormalizedImportedManagerSeason[];
  existingManagers: readonly NormalizedImportedManagerSeason[];
  leagueChanges: readonly ManagerImportChange[];
  budgetChanges: readonly ManagerImportChange[];
  pausedManagers: readonly ManagerSeasonRecord[];
  changedManagers: readonly ManagerImportChange[];
  unchangedManagers: readonly NormalizedImportedManagerSeason[];
  activeManagers: readonly NormalizedImportedManagerSeason[];
  pausedImportedManagers: readonly NormalizedImportedManagerSeason[];
  archivedImportedManagers: readonly NormalizedImportedManagerSeason[];
  missingRequiredData: readonly ManagerImportValidationIssue[];
  duplicateNames: readonly string[];
  warnings: readonly string[];
};

export type ManagerImportResult = {
  imported: number;
  existing: number;
  leagueChanges: number;
  budgetChanges: number;
  pausedManagers: number;
  errors: number;
  durationMs: number;
  timestamp: Date;
  workbookName: string;
};

export class ManagerImportService {
  constructor(
    private readonly managerSeasonRepository: ManagerSeasonRepository =
      new PrismaManagerSeasonRepository(),
  ) {}

  async createPreview(
    workbookPath?: string,
    options: ManagerImportPreviewOptions = {},
  ): Promise<ManagerImportPreview> {
    const [activeSeason, seasons, resolvedWorkbookPath] = await Promise.all([
      this.managerSeasonRepository.loadActiveSeason(),
      this.managerSeasonRepository.loadSeasons(),
      workbookPath
        ? Promise.resolve(workbookPath)
        : options.allowDiscovery === false
          ? Promise.resolve(null)
          : discoverManagerWorkbookPath(),
    ]);
    const availableSeasons = seasons ?? (activeSeason ? [activeSeason] : []);
    const selectedSeason = selectSeason(
      availableSeasons,
      activeSeason,
      options.context?.seasonId,
    );

    if (!selectedSeason) {
      return createEmptyPreview({
        seasons: availableSeasons,
        warning:
          "Kein Season-Datensatz gefunden. ManagerSeason Import benötigt eine Saison in Prisma.",
      });
    }

    const existingManagerSeasons =
      await this.managerSeasonRepository.loadCurrentSeasonManagerSeasons(
        selectedSeason.id,
      );

    if (!existingManagerSeasons) {
      return createEmptyPreview({
        seasons: availableSeasons,
        seasonId: selectedSeason.id,
        seasonName: selectedSeason.name,
        warning:
          "Prisma ManagerSeason Store ist nicht erreichbar. Import Preview kann nicht sicher verglichen werden.",
      });
    }

    if (!resolvedWorkbookPath) {
      return createEmptyPreview({
        seasons: availableSeasons,
        seasonId: selectedSeason.id,
        seasonName: selectedSeason.name,
        existingManagerSeasons: existingManagerSeasons.length,
        warning:
          options.allowDiscovery === false
            ? "Keine Excel-Datei ausgewählt. Wähle eine .xlsx-Datei aus und erstelle eine Vorschau."
            : "Kein Manager-Workbook gefunden. Setze MANAGER_IMPORT_WORKBOOK_PATH oder IMPORT_WORKBOOK_PATH.",
      });
    }

    const parsed = await parseManagerWorkbook(resolvedWorkbookPath);
    const importedManagers = dedupeManagers(parsed.managers);
    const existingByShortName = new Map(
      existingManagerSeasons.map((managerSeason) => [
        managerSeason.shortName,
        managerSeason,
      ]),
    );
    const importedShortNames = new Set(
      importedManagers.map((manager) => manager.shortName),
    );
    const newManagers: NormalizedImportedManagerSeason[] = [];
    const existingManagers: NormalizedImportedManagerSeason[] = [];
    const changedManagers: ManagerImportChange[] = [];
    const unchangedManagers: NormalizedImportedManagerSeason[] = [];

    for (const imported of importedManagers) {
      const existing = existingByShortName.get(imported.shortName);

      if (!existing) {
        newManagers.push(imported);
        continue;
      }

      existingManagers.push(imported);
      const changes = compareManagerSeason(imported, existing);

      if (changes.length > 0) {
        changedManagers.push({ imported, existing, changes });
      } else {
        unchangedManagers.push(imported);
      }
    }

    return {
      workbookPath: resolvedWorkbookPath,
      workbookName: options.context?.filename ?? path.basename(resolvedWorkbookPath),
      seasons: availableSeasons,
      seasonId: selectedSeason.id,
      seasonName: selectedSeason.name,
      parsedManagers: importedManagers.length,
      existingManagerSeasons: existingManagerSeasons.length,
      newManagers,
      existingManagers,
      leagueChanges: changedManagers.filter((change) =>
        change.changes.some((item) => item.field === "league"),
      ),
      budgetChanges: changedManagers.filter((change) =>
        change.changes.some((item) => item.field === "budget"),
      ),
      pausedManagers: existingManagerSeasons.filter(
        (managerSeason) =>
          managerSeason.participation === "ACTIVE" &&
          !importedShortNames.has(managerSeason.shortName),
      ),
      changedManagers,
      unchangedManagers,
      activeManagers: importedManagers.filter((manager) => manager.status === "ACTIVE"),
      pausedImportedManagers: importedManagers.filter(
        (manager) => manager.status === "PAUSED",
      ),
      archivedImportedManagers: importedManagers.filter(
        (manager) => manager.status === "ARCHIVED",
      ),
      missingRequiredData: parsed.missingRequiredData,
      duplicateNames: findDuplicateNames(
        parsed.managers.map((manager) => manager.displayName),
      ),
      warnings: [
        ...(parsed.missingRequiredData.length > 0
          ? ["Manager Import enthält fehlende Pflichtdaten."]
          : []),
      ],
    };
  }

  async applyImport(
    workbookPath?: string,
    context?: ManagerImportContextInput,
  ): Promise<ManagerImportResult> {
    const startedAt = Date.now();
    const preview = await this.createPreview(workbookPath, {
      allowDiscovery: false,
      context,
    });

    if (!preview.workbookPath || !preview.workbookName || !preview.seasonId) {
      throw new Error("Manager Import abgebrochen: Workbook oder aktive Saison fehlt.");
    }

    if (preview.warnings.length > 0) {
      throw new Error(`Manager Import abgebrochen: ${preview.warnings.join(" ")}`);
    }

    const seasonId = preview.seasonId;
    const upserts: ManagerSeasonUpsertRecord[] = [
      ...preview.newManagers,
      ...preview.changedManagers.map((change) => change.imported),
    ].map((manager) => mapImportedManagerToUpsert(manager, seasonId));
    const pausedManagers = preview.pausedManagers.map((managerSeason) => ({
      managerSeasonId: managerSeason.id,
    }));
    const result: ManagerImportResult = {
      imported: preview.newManagers.length,
      existing: preview.existingManagers.length,
      leagueChanges: preview.leagueChanges.length,
      budgetChanges: preview.budgetChanges.length,
      pausedManagers: pausedManagers.length,
      errors: 0,
      durationMs: Date.now() - startedAt,
      timestamp: new Date(),
      workbookName: preview.workbookName,
    };

    await this.managerSeasonRepository.applyImport({
      upserts,
      pausedManagers,
      audit: {
        seasonId: preview.seasonId,
        workbookName: preview.workbookName,
        workbookPath: preview.workbookPath,
        newManagers: result.imported,
        existing: result.existing,
        leagueChanges: result.leagueChanges,
        budgetChanges: result.budgetChanges,
        pausedManagers: result.pausedManagers,
        errors: result.errors,
        durationMs: result.durationMs,
        summary: {
          parsedManagers: preview.parsedManagers,
          changedManagers: preview.changedManagers.length,
          unchangedManagers: preview.unchangedManagers.length,
          timestamp: result.timestamp.toISOString(),
        },
      },
    });

    return result;
  }
}

export async function createManagerImportPreview(
  workbookPath?: string,
  options?: ManagerImportPreviewOptions,
) {
  const service = new ManagerImportService();

  return service.createPreview(workbookPath, options);
}

export async function applyManagerImport(
  workbookPath?: string,
  context?: ManagerImportContextInput,
) {
  const service = new ManagerImportService();

  return service.applyImport(workbookPath, context);
}

async function discoverManagerWorkbookPath(): Promise<string | null> {
  const configuredPath =
    process.env.MANAGER_IMPORT_WORKBOOK_PATH ?? process.env.IMPORT_WORKBOOK_PATH;

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
      if (await looksLikeManagerWorkbook(candidate)) {
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

async function looksLikeManagerWorkbook(filePath: string): Promise<boolean> {
  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const managerSheet = workbook.worksheets.find(
      (worksheet) => normalizeText(worksheet.name) === "manager",
    );

    return Boolean(managerSheet && findHeaderRow(managerSheet, ["manager_name"]));
  } catch {
    return false;
  }
}

async function parseManagerWorkbook(
  workbookPath: string,
): Promise<{
  managers: readonly NormalizedImportedManagerSeason[];
  missingRequiredData: readonly ManagerImportValidationIssue[];
}> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(workbookPath);
  const worksheet = workbook.worksheets.find(
    (sheet) => normalizeText(sheet.name) === "manager",
  );

  if (!worksheet) {
    return { managers: [], missingRequiredData: [] };
  }

  const headerRow = findHeaderRow(worksheet, ["manager_name"]);

  if (!headerRow) {
    return { managers: [], missingRequiredData: [] };
  }

  const idColumn = findColumnByHeader(worksheet, headerRow, "manager_id");
  const nameColumn = findColumnByHeader(worksheet, headerRow, "manager_name");
  const leagueColumn = findColumnByHeader(worksheet, headerRow, "liga");
  const budgetColumn = findColumnByHeader(worksheet, headerRow, "budget");
  const statusColumn = findColumnByHeader(worksheet, headerRow, "status");

  if (!nameColumn) {
    return { managers: [], missingRequiredData: [] };
  }

  const managers: NormalizedImportedManagerSeason[] = [];
  const missingRequiredData: ManagerImportValidationIssue[] = [];

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber <= headerRow) {
      return;
    }

    const displayName = readStringCell(row.getCell(nameColumn));
    const leagueValue = leagueColumn ? readStringCell(row.getCell(leagueColumn)) : "";

    if (!displayName) {
      missingRequiredData.push({
        sourceSheet: worksheet.name,
        sourceRow: rowNumber,
        field: "Manager_Name",
        message: "Manager_Name fehlt.",
      });
      return;
    }

    if (!leagueValue) {
      missingRequiredData.push({
        sourceSheet: worksheet.name,
        sourceRow: rowNumber,
        field: "Liga",
        message: "Liga fehlt.",
      });
      return;
    }

    const status = mapWorkbookStatus(
      statusColumn ? readStringCell(row.getCell(statusColumn)) : "",
    );

    managers.push({
      externalManagerId: idColumn ? readStringCell(row.getCell(idColumn)) : undefined,
      displayName,
      shortName: createManagerShortName(displayName),
      league: mapWorkbookLeague(leagueValue),
      budget: budgetColumn ? readNumberCell(row.getCell(budgetColumn)) ?? 0 : 0,
      status,
      participation: mapManagerParticipation(status),
      transferStatus: status === "ACTIVE" ? "OPEN" : "LOCKED",
      currentLifecycle: status === "ACTIVE" ? "ACTIVE" : "REGISTERED",
      sourceSheet: worksheet.name,
      sourceRow: rowNumber,
    });
  });

  return { managers, missingRequiredData };
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

function compareManagerSeason(
  imported: NormalizedImportedManagerSeason,
  existing: ManagerSeasonRecord,
): ManagerImportChange["changes"] {
  return [
    ...(existing.league !== imported.league
      ? [
          {
            field: "league" as const,
            before: existing.league,
            after: imported.league,
          },
        ]
      : []),
    ...(existing.budget !== imported.budget
      ? [
          {
            field: "budget" as const,
            before: String(existing.budget),
            after: String(imported.budget),
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
    ...(existing.participation !== imported.participation
      ? [
          {
            field: "participation" as const,
            before: existing.participation,
            after: imported.participation,
          },
        ]
      : []),
    ...(existing.transferStatus !== imported.transferStatus
      ? [
          {
            field: "transferStatus" as const,
            before: existing.transferStatus,
            after: imported.transferStatus,
          },
        ]
      : []),
  ];
}

function mapImportedManagerToUpsert(
  manager: NormalizedImportedManagerSeason,
  seasonId: string,
): ManagerSeasonUpsertRecord {
  return {
    displayName: manager.displayName,
    shortName: manager.shortName,
    managerStatus: manager.status,
    seasonId,
    league: manager.league,
    budget: manager.budget,
    status: manager.status,
    participation: manager.participation,
    transferStatus: manager.transferStatus,
    currentLifecycle: manager.currentLifecycle,
  };
}

function mapWorkbookLeague(value: string): ManagerLeagueLevel {
  const normalized = normalizeText(value);

  if (normalized === "2" || normalized.includes("zweite") || normalized.includes("second")) {
    return "SECOND";
  }

  return "FIRST";
}

function mapWorkbookStatus(value: string): ManagerSeasonStatus {
  const normalized = normalizeText(value);

  if (normalized.includes("archiv") || normalized.includes("archived")) {
    return "ARCHIVED";
  }

  if (normalized.includes("pause") || normalized.includes("paused")) {
    return "PAUSED";
  }

  return "ACTIVE";
}

function mapManagerParticipation(
  status: ManagerSeasonStatus,
): ManagerParticipationStatus {
  if (status === "ARCHIVED") {
    return "WITHDRAWN";
  }

  return status === "PAUSED" ? "PAUSED" : "ACTIVE";
}

function dedupeManagers(
  managers: readonly NormalizedImportedManagerSeason[],
): readonly NormalizedImportedManagerSeason[] {
  const seen = new Set<string>();

  return managers.filter((manager) => {
    if (seen.has(manager.shortName)) {
      return false;
    }

    seen.add(manager.shortName);
    return true;
  });
}

function createManagerShortName(displayName: string): string {
  return normalizeText(displayName)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function selectSeason(
  seasons: readonly ActiveSeasonRecord[],
  activeSeason: ActiveSeasonRecord | null,
  seasonId?: string,
): ActiveSeasonRecord | null {
  return (
    seasons.find((season) => season.id === seasonId) ??
    activeSeason ??
    seasons[0] ??
    null
  );
}

function findDuplicateNames(names: readonly string[]): readonly string[] {
  const counts = new Map<string, number>();

  for (const name of names) {
    const key = normalizeText(name);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([name]) => name)
    .sort((first, second) => first.localeCompare(second, "de"));
}

function normalizeText(value: string): string {
  return value.trim().toLowerCase();
}

function createEmptyPreview(input: {
  seasons?: readonly ManagerImportSeasonOption[];
  seasonId?: string;
  seasonName?: string;
  existingManagerSeasons?: number;
  warning: string;
}): ManagerImportPreview {
  return {
    workbookPath: null,
    workbookName: null,
    seasons: input.seasons ?? [],
    seasonId: input.seasonId ?? null,
    seasonName: input.seasonName ?? null,
    parsedManagers: 0,
    existingManagerSeasons: input.existingManagerSeasons ?? 0,
    newManagers: [],
    existingManagers: [],
    leagueChanges: [],
    budgetChanges: [],
    pausedManagers: [],
    changedManagers: [],
    unchangedManagers: [],
    activeManagers: [],
    pausedImportedManagers: [],
    archivedImportedManagers: [],
    missingRequiredData: [],
    duplicateNames: [],
    warnings: [input.warning],
  };
}

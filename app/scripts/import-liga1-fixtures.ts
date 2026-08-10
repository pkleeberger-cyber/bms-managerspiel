import path from "node:path";

import { config } from "dotenv";
import ExcelJS from "exceljs";

import { getPrismaClient } from "../infrastructure/prisma";

type FixtureRow = {
  matchday: number;
  homeName: string;
  awayName: string;
};

type ManagerIndexEntry = {
  id: string;
  displayName: string;
  shortName: string;
  managerId: string;
};

config({ path: path.resolve(process.cwd(), ".env.local") });
config();

const expectedMatchdays = 34;
const expectedFixturesPerMatchday = 9;
const expectedFixtures = expectedMatchdays * expectedFixturesPerMatchday;

async function importLiga1Fixtures() {
  const workbookPath = getWorkbookPath();
  const prisma = getPrismaClient();

  if (!workbookPath) {
    throw new Error(
      "Liga-1-Spielplanimport abgebrochen: Setze FIXTURE_IMPORT_WORKBOOK_PATH oder übergib --workbook /path/to/file.xlsx.",
    );
  }

  if (!prisma) {
    throw new Error("Liga-1-Spielplanimport abgebrochen: Prisma ist nicht verfügbar.");
  }

  const activeSeason = await prisma.season.findFirst({
    where: { status: "ACTIVE" },
    orderBy: { yearStart: "desc" },
  });

  if (!activeSeason) {
    throw new Error("Liga-1-Spielplanimport abgebrochen: Keine aktive Saison.");
  }

  const managerSeasons = await prisma.managerSeason.findMany({
    where: {
      seasonId: activeSeason.id,
      league: "FIRST",
      status: "ACTIVE",
      participation: "ACTIVE",
    },
    include: { manager: true },
  });

  const managerIndex = new Map<string, ManagerIndexEntry>();

  for (const managerSeason of managerSeasons) {
    const entry = {
      id: managerSeason.id,
      displayName: managerSeason.manager.displayName,
      shortName: managerSeason.manager.shortName,
      managerId: managerSeason.managerId,
    };
    managerIndex.set(normalizeText(managerSeason.manager.displayName), entry);
    managerIndex.set(normalizeText(managerSeason.manager.shortName), entry);
  }

  const fixtureRows = await parseFixtureWorkbook(workbookPath);
  validateFixtureRows(fixtureRows, managerIndex);

  await prisma.$transaction(async (tx) => {
    const competition = await tx.competition.upsert({
      where: {
        seasonId_type_name: {
          seasonId: activeSeason.id,
          type: "LEAGUE_1",
          name: "Erste Liga",
        },
      },
      update: { status: "ACTIVE" },
      create: {
        seasonId: activeSeason.id,
        type: "LEAGUE_1",
        name: "Erste Liga",
        status: "ACTIVE",
      },
    });

    const teamsByManagerName = new Map<string, { id: string }>();

    for (const managerSeason of managerSeasons) {
      const team = await tx.team.upsert({
        where: {
          seasonId_managerId: {
            seasonId: activeSeason.id,
            managerId: managerSeason.managerId,
          },
        },
        update: {
          name: managerSeason.manager.displayName,
          leagueLevel: "FIRST",
          status: "VALID",
        },
        create: {
          seasonId: activeSeason.id,
          managerId: managerSeason.managerId,
          name: managerSeason.manager.displayName,
          leagueLevel: "FIRST",
          status: "VALID",
        },
      });

      teamsByManagerName.set(normalizeText(managerSeason.manager.displayName), team);
      teamsByManagerName.set(normalizeText(managerSeason.manager.shortName), team);
    }

    await tx.fixture.deleteMany({
      where: { competitionId: competition.id },
    });

    const fixtureCreateData = fixtureRows.map((fixture) => {
      const homeTeam = teamsByManagerName.get(normalizeText(fixture.homeName));
      const awayTeam = teamsByManagerName.get(normalizeText(fixture.awayName));

      if (!homeTeam || !awayTeam) {
        throw new Error(
          `Interner Importfehler: Team fehlt für ${fixture.homeName} - ${fixture.awayName}.`,
        );
      }

      return {
        competitionId: competition.id,
        matchday: fixture.matchday,
        homeTeamId: homeTeam.id,
        awayTeamId: awayTeam.id,
        status: "SCHEDULED" as const,
      };
    });

    await tx.fixture.createMany({
      data: fixtureCreateData,
    });

    await tx.leagueTableSnapshot.upsert({
      where: {
        competitionId_matchday: {
          competitionId: competition.id,
          matchday: 0,
        },
      },
      update: {
        tableJson: createInitialTableSnapshot(managerSeasons, teamsByManagerName),
      },
      create: {
        competitionId: competition.id,
        matchday: 0,
        tableJson: createInitialTableSnapshot(managerSeasons, teamsByManagerName),
      },
    });
  }, { timeout: 20_000 });

  console.info(
    `Liga-1-Spielplan importiert: ${fixtureRows.length} Fixtures, ${expectedMatchdays} Spieltage, Saison ${activeSeason.name}.`,
  );
}

async function parseFixtureWorkbook(workbookPath: string): Promise<FixtureRow[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(workbookPath);
  const worksheet =
    workbook.getWorksheet("Spielplan_L1") ??
    workbook.getWorksheet("Paarungen") ??
    workbook.worksheets.find((sheet) =>
      ["spielplan", "paarungen"].some((name) =>
        normalizeText(sheet.name).includes(name),
      ),
    );

  if (!worksheet) {
    throw new Error(
      "Workbook enthält kein Spielplan_L1- oder Paarungen-Arbeitsblatt.",
    );
  }

  const headerRow = findHeaderRow(worksheet, ["spieltag"]);
  const matchdayColumn = findColumnByHeaders(worksheet, headerRow, ["spieltag"]);
  const homeNameColumn = findColumnByHeaders(worksheet, headerRow, [
    "heim",
    "heim_manager",
  ]);
  const awayNameColumn = findColumnByHeaders(worksheet, headerRow, [
    "auswärts",
    "auswaerts",
    "auswarts",
    "auswärts_manager",
    "auswaerts_manager",
    "auswarts_manager",
  ]);

  const rows: FixtureRow[] = [];

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber <= headerRow) {
      return;
    }

    const matchday = readNumber(row.getCell(matchdayColumn).value);
    const homeName = readText(row.getCell(homeNameColumn).value);
    const awayName = readText(row.getCell(awayNameColumn).value);

    if (!matchday && !homeName && !awayName) {
      return;
    }

    rows.push({
      matchday,
      homeName,
      awayName,
    });
  });

  return rows;
}

function validateFixtureRows(
  fixtureRows: readonly FixtureRow[],
  managerIndex: Map<string, ManagerIndexEntry>,
) {
  const errors: string[] = [];

  if (fixtureRows.length !== expectedFixtures) {
    errors.push(
      `Erwartet ${expectedFixtures} Fixtures, gefunden ${fixtureRows.length}.`,
    );
  }

  const matchdayCounts = new Map<number, number>();
  const duplicateKeys = new Set<string>();
  const seenKeys = new Set<string>();

  for (const fixture of fixtureRows) {
    if (fixture.matchday < 1 || fixture.matchday > expectedMatchdays) {
      errors.push(`Ungültiger Spieltag: ${fixture.matchday}.`);
    }

    if (!fixture.homeName || !fixture.awayName) {
      errors.push(`Fehlende Heim/Auswärts-Daten an Spieltag ${fixture.matchday}.`);
    }

    if (!managerIndex.has(normalizeText(fixture.homeName))) {
      errors.push(`Heim-Manager nicht gefunden: ${fixture.homeName}.`);
    }

    if (!managerIndex.has(normalizeText(fixture.awayName))) {
      errors.push(`Auswärts-Manager nicht gefunden: ${fixture.awayName}.`);
    }

    matchdayCounts.set(
      fixture.matchday,
      (matchdayCounts.get(fixture.matchday) ?? 0) + 1,
    );

    const key = `${fixture.matchday}:${normalizeText(fixture.homeName)}:${normalizeText(fixture.awayName)}`;

    if (seenKeys.has(key)) {
      duplicateKeys.add(key);
    }

    seenKeys.add(key);
  }

  for (let matchday = 1; matchday <= expectedMatchdays; matchday += 1) {
    const count = matchdayCounts.get(matchday) ?? 0;

    if (count !== expectedFixturesPerMatchday) {
      errors.push(
        `Spieltag ${matchday}: ${count}/${expectedFixturesPerMatchday} Fixtures.`,
      );
    }
  }

  if (duplicateKeys.size > 0) {
    errors.push(`Doppelte Paarungen: ${[...duplicateKeys].join(", ")}.`);
  }

  if (errors.length > 0) {
    throw new Error(`Liga-1-Spielplanimport abgebrochen: ${errors.join(" | ")}`);
  }
}

function createInitialTableSnapshot(
  managerSeasons: readonly {
    id: string;
    managerId: string;
    manager: { displayName: string; shortName: string };
  }[],
  teamsByManagerName: Map<string, { id: string }>,
) {
  return {
    matchday: 0,
    rows: managerSeasons
      .slice()
      .sort((first, second) =>
        first.manager.displayName.localeCompare(second.manager.displayName, "de"),
      )
      .map((managerSeason, index) => {
        const team = teamsByManagerName.get(
          normalizeText(managerSeason.manager.displayName),
        );

        if (!team) {
          throw new Error(`Team fehlt für ${managerSeason.manager.displayName}.`);
        }

        return {
          managerSeasonId: managerSeason.id,
          managerId: managerSeason.managerId,
          teamId: team.id,
          managerName: managerSeason.manager.displayName,
          rank: index + 1,
          previousRank: index + 1,
          played: 0,
          wins: 0,
          draws: 0,
          losses: 0,
          goalsFor: 0,
          goalsAgainst: 0,
          goalDifference: 0,
          points: 0,
          form: [],
          movement: 0,
        };
      }),
  };
}

function findHeaderRow(worksheet: ExcelJS.Worksheet, requiredHeaders: string[]) {
  for (let rowNumber = 1; rowNumber <= Math.min(10, worksheet.rowCount); rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    const headers: string[] = [];

    for (let column = 1; column <= worksheet.columnCount; column += 1) {
      headers.push(normalizeText(readText(row.getCell(column).value)));
    }

    if (requiredHeaders.every((header) => headers.includes(normalizeText(header)))) {
      return rowNumber;
    }
  }

  throw new Error(`Keine Header-Zeile gefunden in ${worksheet.name}.`);
}

function findColumnByHeaders(
  worksheet: ExcelJS.Worksheet,
  headerRow: number,
  headers: readonly string[],
) {
  const row = worksheet.getRow(headerRow);

  for (let column = 1; column <= worksheet.columnCount; column += 1) {
    const value = normalizeText(readText(row.getCell(column).value));

    if (headers.some((header) => normalizeText(header) === value)) {
      return column;
    }
  }

  throw new Error(
    `Keine Spalte ${headers.join("/")} gefunden in ${worksheet.name}.`,
  );
}

function readText(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "object" && "result" in value) {
    return readText((value as { result?: unknown }).result);
  }

  if (typeof value === "object" && "text" in value) {
    return readText((value as { text?: unknown }).text);
  }

  return String(value).trim();
}

function readNumber(value: unknown): number {
  const text = readText(value);
  const number = Number(text);

  if (Number.isFinite(number)) {
    return number;
  }

  const leadingNumber = text.match(/^\s*(\d+)/);

  return leadingNumber ? Number(leadingNumber[1]) : 0;
}

function getWorkbookPath() {
  const cliPathIndex = process.argv.findIndex((arg) => arg === "--workbook");
  const cliPath = cliPathIndex >= 0 ? process.argv[cliPathIndex + 1] : undefined;

  return cliPath ?? process.env.FIXTURE_IMPORT_WORKBOOK_PATH ?? null;
}

function normalizeText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

void importLiga1Fixtures()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });

import path from "node:path";

import { config } from "dotenv";

config({ path: path.resolve(process.cwd(), ".env.local") });
config();

function readArgument(name: string): string | null {
  const index = process.argv.indexOf(name);

  if (index === -1) {
    return null;
  }

  const value = process.argv[index + 1];

  if (!value || value.startsWith("--")) {
    throw new Error(`Missing value for ${name}`);
  }

  return value;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(name);
}

async function main() {
  const workbookPath = readArgument("--workbook")
    ?? path.join(process.env.HOME ?? "", "Downloads", "Spieltag1_17.xlsx");
  const apply = hasFlag("--apply");
  const dryRun = hasFlag("--dry-run");
  const calculate = hasFlag("--calculate");
  const replaceBackfillData = hasFlag("--replace-backfill-data");
  const [
    { MatchdayBackfillService },
    {
      getConfiguredDatabaseUrl,
      getPrismaClient,
      getPrismaInitializationError,
    },
  ] = await Promise.all([
    import("../application/matchday-backfill-service"),
    import("../infrastructure/prisma"),
  ]);
  const prisma = getPrismaClient();
  const diagnostics = await loadPrismaDiagnostics({
    configuredDatabaseUrlPresent: Boolean(getConfiguredDatabaseUrl()),
    prisma,
    initializationError: getPrismaInitializationError(),
  });

  printDiagnostics(diagnostics);

  if (apply && !prisma) {
    throw new Error(
      `Prisma ist nicht verfügbar. ${diagnostics.initializationError ?? "No Prisma client was initialized."}`,
    );
  }

  if (apply && !diagnostics.canQueryActiveSeason) {
    throw new Error(
      `Prisma cannot query the active season. ${diagnostics.activeSeasonError ?? "No active-season diagnostic was captured."}`,
    );
  }

  if (apply && dryRun) {
    throw new Error("Use either --apply or --dry-run, not both.");
  }

  const report = await new MatchdayBackfillService().run({
    workbookPath,
    mode: apply ? "APPLY" : "DRY_RUN",
    calculate,
    replaceBackfillData,
  });

  console.log(`Backfill ${report.mode.toLowerCase()} complete.`);
  console.log(`Parsed matchdays: ${report.summary.parsedMatchdays.join(", ")}`);
  console.log(`PlayerMatchData: ${report.summary.playerMatchDataCount}`);
  console.log(`Squad changes: ${report.summary.squadChangeCount}`);
  console.log(`Unknown players: ${report.summary.unknownPlayers}`);
  console.log(`Unknown managers: ${report.summary.unknownManagers}`);
  console.log(`Conflicts: ${report.summary.conflicts}`);
  console.log(`Reports: ${report.reportPaths.markdown}`);

  if (report.mode === "DRY_RUN") {
    console.log("No database writes were performed. Re-run with --apply after reviewing the report.");
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

async function loadPrismaDiagnostics(input: {
  configuredDatabaseUrlPresent: boolean;
  prisma: {
    season: {
      findFirst(args: {
        where: { status: "ACTIVE" };
        orderBy: { yearStart: "desc" };
        select: { id: true };
      }): Promise<{ id: string } | null>;
    };
  } | null;
  initializationError: unknown;
}) {
  if (!input.prisma) {
    return {
      databaseUrlPresent: Boolean(process.env.DATABASE_URL),
      configuredDatabaseUrlPresent: input.configuredDatabaseUrlPresent,
      prismaClientInitialized: false,
      canQueryActiveSeason: false,
      activeSeasonError: null,
      initializationError: formatDiagnosticError(input.initializationError),
    };
  }

  try {
    await input.prisma.season.findFirst({
      where: { status: "ACTIVE" },
      orderBy: { yearStart: "desc" },
      select: { id: true },
    });

    return {
      databaseUrlPresent: Boolean(process.env.DATABASE_URL),
      configuredDatabaseUrlPresent: input.configuredDatabaseUrlPresent,
      prismaClientInitialized: true,
      canQueryActiveSeason: true,
      activeSeasonError: null,
      initializationError: null,
    };
  } catch (error) {
    return {
      databaseUrlPresent: Boolean(process.env.DATABASE_URL),
      configuredDatabaseUrlPresent: input.configuredDatabaseUrlPresent,
      prismaClientInitialized: true,
      canQueryActiveSeason: false,
      activeSeasonError: formatDiagnosticError(error),
      initializationError: null,
    };
  }
}

function printDiagnostics(diagnostics: Awaited<ReturnType<typeof loadPrismaDiagnostics>>) {
  console.log("Diagnostics:");
  console.log(`DATABASE_URL present: ${diagnostics.databaseUrlPresent ? "yes" : "no"}`);
  console.log(`Configured DB URL present: ${diagnostics.configuredDatabaseUrlPresent ? "yes" : "no"}`);
  console.log(`Prisma client initialized: ${diagnostics.prismaClientInitialized ? "yes" : "no"}`);
  console.log(`Can query active season: ${diagnostics.canQueryActiveSeason ? "yes" : "no"}`);

  if (diagnostics.initializationError) {
    console.log(`Prisma initialization error: ${diagnostics.initializationError}`);
  }

  if (diagnostics.activeSeasonError) {
    console.log(`Active season query error: ${diagnostics.activeSeasonError}`);
  }
}

function formatDiagnosticError(error: unknown) {
  if (!error) {
    return null;
  }

  if (error instanceof Error) {
    return error.stack ?? error.message;
  }

  return String(error);
}

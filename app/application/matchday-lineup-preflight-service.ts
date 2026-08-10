import fs from "node:fs/promises";
import path from "node:path";

import {
  OFFICIAL_LINEUP_IDS,
  getPositionForLineupId,
} from "@/domain/lineup-engine";
import type { LineupId, PlayerPosition } from "@/domain/lineup-engine";
import { getPrismaClient } from "@/infrastructure/prisma";

export type MatchdayLineupAssignmentDiagnostic = {
  assignmentId: string;
  playerId: string;
  playerName: string;
  playerStatus: string;
  validFromMatchday: number;
  validToMatchday: number | null;
  reason: string;
};

export type MatchdayLineupMissingSlot = {
  managerSeasonId: string;
  managerId: string;
  managerName: string;
  managerShortName: string;
  matchday: number;
  slotId: LineupId;
  expectedPosition: PlayerPosition;
  existsOnMatchday1: boolean;
  matchday1Assignment: MatchdayLineupAssignmentDiagnostic | null;
  relatedAssignments: readonly MatchdayLineupAssignmentDiagnostic[];
  suggestedPlayer: {
    playerId: string;
    playerName: string;
    source: "MATCHDAY_1_ASSIGNMENT";
  } | null;
};

export type MatchdayLineupManagerPreflight = {
  managerSeasonId: string;
  managerId: string;
  managerName: string;
  managerShortName: string;
  missingSlots: readonly MatchdayLineupMissingSlot[];
};

export type MatchdayLineupPreflightReport = {
  generatedAt: string;
  incompleteTeamSeverity: "WARNING";
  seasonId: string;
  seasonName: string;
  competitionId: string;
  competitionName: string;
  matchday: number;
  activeManagers: number;
  checkedSlotsPerManager: number;
  missingSlotCount: number;
  managersWithMissingSlots: readonly MatchdayLineupManagerPreflight[];
  invalidTeamOverrides: readonly {
    managerSeasonId: string;
    managerId: string;
    managerName: string;
    reason: string;
    createdAt: string;
  }[];
  repairContext: {
    latestSquadImportAudit: {
      importedAt: string;
      workbookName: string;
      workbookPath: string | null;
      workbookPathAvailable: boolean;
    } | null;
  };
  reportPaths: {
    markdown: string;
    json: string;
  };
};

type LoadOptions = {
  writeReports?: boolean;
};

type Context = {
  season: { id: string; name: string };
  competition: { id: string; name: string };
};

const checkedSlots = OFFICIAL_LINEUP_IDS;

export async function loadMatchdayLineupPreflight(
  matchday = 1,
  options: LoadOptions = {},
): Promise<MatchdayLineupPreflightReport> {
  const service = new MatchdayLineupPreflightService(matchday);
  const report = await service.loadReport();

  if (options.writeReports) {
    await writeMatchdayLineupPreflightReports(report);
  }

  return report;
}

export async function writeMatchdayLineupPreflightReports(
  report: MatchdayLineupPreflightReport,
) {
  await fs.mkdir(path.dirname(report.reportPaths.markdown), { recursive: true });
  await Promise.all([
    fs.writeFile(report.reportPaths.json, `${JSON.stringify(report, null, 2)}\n`),
    fs.writeFile(report.reportPaths.markdown, renderMarkdownReport(report)),
  ]);
}

class MatchdayLineupPreflightService {
  private readonly prisma = getPrismaClient();

  constructor(private readonly matchday: number) {}

  async loadReport(): Promise<MatchdayLineupPreflightReport> {
    if (!this.prisma) {
      throw new Error("Prisma ist nicht verfügbar.");
    }

    const context = await this.loadContext();
    const [managerSeasons, latestSquadImportAudit, invalidTeamAdjustments] = await Promise.all([
      this.prisma.managerSeason.findMany({
        where: {
          seasonId: context.season.id,
          league: "FIRST",
          status: "ACTIVE",
          participation: "ACTIVE",
        },
        include: { manager: true },
        orderBy: { manager: { displayName: "asc" } },
      }),
      this.prisma.squadImportAudit.findFirst({
        where: { seasonId: context.season.id },
        orderBy: { importedAt: "desc" },
      }),
      this.prisma.manualMatchdayAdjustment.findMany({
        where: {
          seasonId: context.season.id,
          competitionId: context.competition.id,
          matchday: this.matchday,
          type: "INVALID_TEAM",
          status: "ACTIVE",
        },
        include: { managerSeason: { include: { manager: true } } },
      }),
    ]);
    const invalidManagerSeasonIds = new Set(
      invalidTeamAdjustments.map((adjustment) => adjustment.managerSeasonId),
    );
    const managerSeasonIds = managerSeasons.map((managerSeason) => managerSeason.id);
    const [assignments, departureEffectiveFromByPlayerId] = await Promise.all([
      this.prisma.squadAssignment.findMany({
        where: { managerSeasonId: { in: managerSeasonIds } },
        include: { player: true },
        orderBy: [
          { managerSeasonId: "asc" },
          { slotId: "asc" },
          { validFromMatchday: "asc" },
        ],
      }),
      this.loadDepartureEffectiveFromByPlayerId(context),
    ]);
    const activeAssignments = assignments.filter(
      (assignment) =>
        isPlayerUsableForMatchday({
          effectiveFromMatchday: departureEffectiveFromByPlayerId.get(
            assignment.playerId,
          ),
          matchday: this.matchday,
          playerStatus: assignment.player.status,
        }) &&
        assignment.validFromMatchday <= this.matchday &&
        (assignment.validToMatchday === null ||
          assignment.validToMatchday >= this.matchday),
    );
    const matchdayOneAssignments = assignments.filter(
      (assignment) =>
        assignment.validFromMatchday <= 1 &&
        (assignment.validToMatchday === null || assignment.validToMatchday >= 1),
    );
    const activeByManagerSlot = createAssignmentIndex(activeAssignments);
    const matchdayOneByManagerSlot = createAssignmentIndex(matchdayOneAssignments);
    const allByManagerSlot = createAssignmentGroups(assignments);
    const managersWithMissingSlots: MatchdayLineupManagerPreflight[] = [];

    for (const managerSeason of managerSeasons) {
      if (invalidManagerSeasonIds.has(managerSeason.id)) {
        continue;
      }

      const missingSlots: MatchdayLineupMissingSlot[] = [];

      for (const slotId of checkedSlots) {
        const key = createManagerSlotKey(managerSeason.id, slotId);

        if (activeByManagerSlot.has(key)) {
          continue;
        }

        const matchday1Assignment = matchdayOneByManagerSlot.get(key) ?? null;
        const relatedAssignments = allByManagerSlot.get(key) ?? [];

        missingSlots.push({
          managerSeasonId: managerSeason.id,
          managerId: managerSeason.managerId,
          managerName: managerSeason.manager.displayName,
          managerShortName: managerSeason.manager.shortName,
          matchday: this.matchday,
          slotId,
          expectedPosition: getPositionForLineupId(slotId),
          existsOnMatchday1: Boolean(matchday1Assignment),
          matchday1Assignment: matchday1Assignment
            ? mapAssignment(matchday1Assignment)
            : null,
          relatedAssignments: relatedAssignments.map(mapAssignment),
          suggestedPlayer: matchday1Assignment
            ? {
                playerId: matchday1Assignment.playerId,
                playerName: matchday1Assignment.player.displayName,
                source: "MATCHDAY_1_ASSIGNMENT",
              }
            : null,
        });
      }

      if (missingSlots.length > 0) {
        managersWithMissingSlots.push({
          managerSeasonId: managerSeason.id,
          managerId: managerSeason.managerId,
          managerName: managerSeason.manager.displayName,
          managerShortName: managerSeason.manager.shortName,
          missingSlots,
        });
      }
    }

    const reportPaths = getReportPaths();

    return {
      generatedAt: new Date().toISOString(),
      incompleteTeamSeverity: "WARNING",
      seasonId: context.season.id,
      seasonName: context.season.name,
      competitionId: context.competition.id,
      competitionName: context.competition.name,
      matchday: this.matchday,
      activeManagers: managerSeasons.length,
      checkedSlotsPerManager: checkedSlots.length,
      missingSlotCount: managersWithMissingSlots.reduce(
        (sum, manager) => sum + manager.missingSlots.length,
        0,
      ),
      managersWithMissingSlots,
      invalidTeamOverrides: invalidTeamAdjustments.map((adjustment) => ({
        managerSeasonId: adjustment.managerSeasonId,
        managerId: adjustment.managerSeason.managerId,
        managerName: adjustment.managerSeason.manager.displayName,
        reason: adjustment.reason,
        createdAt: adjustment.createdAt.toISOString(),
      })),
      repairContext: {
        latestSquadImportAudit: latestSquadImportAudit
          ? {
              importedAt: latestSquadImportAudit.importedAt.toISOString(),
              workbookName: latestSquadImportAudit.workbookName,
              workbookPath: latestSquadImportAudit.workbookPath,
              workbookPathAvailable: latestSquadImportAudit.workbookPath
                ? await fileExists(latestSquadImportAudit.workbookPath)
                : false,
            }
          : null,
      },
      reportPaths,
    };
  }

  private async loadContext(): Promise<Context> {
    const season = await this.prisma!.season.findFirst({
      where: { status: "ACTIVE" },
      orderBy: { yearStart: "desc" },
    });

    if (!season) {
      throw new Error("Keine aktive Saison gefunden.");
    }

    const competition = await this.prisma!.competition.findFirst({
      where: {
        seasonId: season.id,
        type: "LEAGUE_1",
        name: "Erste Liga",
      },
    });

    if (!competition) {
      throw new Error("Erste Liga ist nicht angelegt.");
    }

    return {
      season: { id: season.id, name: season.name },
      competition: { id: competition.id, name: competition.name },
    };
  }

  private async loadDepartureEffectiveFromByPlayerId(context: Context) {
    const events = await this.prisma!.playerDepartureEvent.findMany({
      where: {
        status: "ACTIVE",
        batch: {
          seasonId: context.season.id,
          status: "RELEASED",
        },
      },
      include: { batch: true },
    });
    const effectiveFromByPlayerId = new Map<string, number>();

    for (const event of events) {
      if (event.batch.effectiveFromMatchday === null) {
        continue;
      }

      const existing = effectiveFromByPlayerId.get(event.playerId);

      if (
        existing === undefined ||
        event.batch.effectiveFromMatchday < existing
      ) {
        effectiveFromByPlayerId.set(
          event.playerId,
          event.batch.effectiveFromMatchday,
        );
      }
    }

    return effectiveFromByPlayerId;
  }
}

function createAssignmentIndex<
  T extends {
    managerSeasonId: string | null;
    slotId: number;
  },
>(assignments: readonly T[]) {
  return new Map(
    assignments
      .filter((assignment) => assignment.managerSeasonId)
      .map((assignment) => [
        createManagerSlotKey(
          assignment.managerSeasonId ?? "",
          assignment.slotId as LineupId,
        ),
        assignment,
      ]),
  );
}

function createAssignmentGroups<
  T extends {
    managerSeasonId: string | null;
    slotId: number;
  },
>(assignments: readonly T[]) {
  const groups = new Map<string, T[]>();

  for (const assignment of assignments) {
    if (!assignment.managerSeasonId) {
      continue;
    }

    const key = createManagerSlotKey(
      assignment.managerSeasonId,
      assignment.slotId as LineupId,
    );
    const group = groups.get(key) ?? [];

    group.push(assignment);
    groups.set(key, group);
  }

  return groups;
}

function createManagerSlotKey(managerSeasonId: string, slotId: LineupId) {
  return `${managerSeasonId}:${slotId}`;
}

function mapAssignment(assignment: {
  id: string;
  playerId: string;
  slotId: number;
  validFromMatchday: number;
  validToMatchday: number | null;
  reason: string;
  player: {
    displayName: string;
    status: string;
  };
}): MatchdayLineupAssignmentDiagnostic {
  return {
    assignmentId: assignment.id,
    playerId: assignment.playerId,
    playerName: assignment.player.displayName,
    playerStatus: assignment.player.status,
    validFromMatchday: assignment.validFromMatchday,
    validToMatchday: assignment.validToMatchday,
    reason: assignment.reason,
  };
}

function isPlayerUsableForMatchday(input: {
  effectiveFromMatchday: number | undefined;
  matchday: number;
  playerStatus: string;
}) {
  if (input.playerStatus !== "LEFT_BUNDESLIGA") {
    return true;
  }

  return (
    input.effectiveFromMatchday !== undefined &&
    input.effectiveFromMatchday > input.matchday
  );
}

function getReportPaths() {
  const reportDirectory = path.resolve(
    process.cwd(),
    "..",
    "reports",
    "matchday-zero",
  );

  return {
    markdown: path.join(reportDirectory, "lineup-preflight-report.md"),
    json: path.join(reportDirectory, "lineup-preflight-report.json"),
  };
}

function renderMarkdownReport(report: MatchdayLineupPreflightReport) {
  const lines = [
    "# Lineup Preflight Report",
    "",
    `Generated: ${report.generatedAt}`,
    `Season: ${report.seasonName}`,
    `Competition: ${report.competitionName}`,
    `Matchday: ${report.matchday}`,
    `Active managers: ${report.activeManagers}`,
    `Checked slots per manager: ${report.checkedSlotsPerManager}`,
    `Missing slots: ${report.missingSlotCount}`,
    "",
    "## Initial Squad Workbook",
    "",
  ];
  const audit = report.repairContext.latestSquadImportAudit;

  if (audit) {
    lines.push(
      `Latest audit: ${audit.workbookName}`,
      `Imported at: ${audit.importedAt}`,
      `Workbook path: ${audit.workbookPath ?? "not stored"}`,
      `Workbook path available: ${audit.workbookPathAvailable ? "yes" : "no"}`,
      "",
    );
  } else {
    lines.push("No SquadImportAudit found.", "");
  }

  if (report.managersWithMissingSlots.length === 0) {
    lines.push("## Missing Slots", "", "No incomplete-team warnings found.", "");
    appendInvalidTeamOverrides(lines, report);
    return `${lines.join("\n")}\n`;
  }

  lines.push("## Missing Slots", "", "Severity: WARNING", "");

  for (const manager of report.managersWithMissingSlots) {
    lines.push(`### ${manager.managerName}`, "");

    for (const slot of manager.missingSlots) {
      lines.push(
        `- Slot ${slot.slotId} (${slot.expectedPosition}), Matchday ${slot.matchday}`,
        `  - ManagerSeason: ${slot.managerSeasonId}`,
        `  - Manager: ${slot.managerId}`,
        `  - Matchday 1 assignment exists: ${slot.existsOnMatchday1 ? "yes" : "no"}`,
      );

      if (slot.matchday1Assignment) {
        lines.push(
          `  - Matchday 1 player: ${slot.matchday1Assignment.playerName} (${slot.matchday1Assignment.playerStatus})`,
        );
      }

      if (slot.suggestedPlayer) {
        lines.push(
          `  - Suggested initial-migration repair candidate: ${slot.suggestedPlayer.playerName}`,
        );
      }

      if (slot.relatedAssignments.length > 0) {
        lines.push("  - Related assignment ranges:");
        for (const assignment of slot.relatedAssignments) {
          lines.push(
            `    - ${assignment.playerName}: ${assignment.validFromMatchday}-${assignment.validToMatchday ?? "open"} (${assignment.reason}, ${assignment.playerStatus})`,
          );
        }
      }
    }

    lines.push("");
  }

  appendInvalidTeamOverrides(lines, report);

  return `${lines.join("\n")}\n`;
}

function appendInvalidTeamOverrides(
  lines: string[],
  report: MatchdayLineupPreflightReport,
) {
  lines.push("## Invalid Team Overrides", "");

  if (report.invalidTeamOverrides.length === 0) {
    lines.push("No active INVALID_TEAM overrides.", "");
    return;
  }

  for (const override of report.invalidTeamOverrides) {
    lines.push(
      `- ${override.managerName}: ${override.reason}`,
      `  - ManagerSeason: ${override.managerSeasonId}`,
      `  - Manager: ${override.managerId}`,
      `  - Created at: ${override.createdAt}`,
    );
  }

  lines.push("");
}

async function fileExists(filePath: string) {
  try {
    const stat = await fs.stat(filePath);

    return stat.isFile();
  } catch {
    return false;
  }
}

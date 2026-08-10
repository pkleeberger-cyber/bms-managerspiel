import { revalidatePath } from "next/cache";
import type { MatchdayLifecycleStatus } from "@/domain/matchday-lifecycle";
import { getPrismaClient } from "@/infrastructure/prisma";
import { rebuildAccumulatedLeagueTableSnapshots } from "./league-table-snapshot-service";

const totalMatchdays = 34;
const expectedFixturesPerMatchday = 9;
const validLifecycleStatuses = [
  "DRAFT",
  "DATA_ENTRY_OPEN",
  "DATA_ENTERED",
  "DATA_ENTRY_COMPLETE",
  "CALCULATED",
  "PRELIMINARY_PUBLISHED",
  "PUBLISHED_PRELIMINARY",
  "MANUAL_REVIEW_CONFIRMED",
  "CORRECTIONS_CONFIRMED",
  "OFFICIALLY_CLOSED",
  "REOPENED",
  "PUBLISHED_OFFICIAL",
  "ARCHIVED",
] as const satisfies readonly MatchdayLifecycleStatus[];

export type MatchdayWorkflowRole = "DATA_MAINTAINER" | "GAME_DIRECTOR";

export type MatchdayWorkflowAction =
  | "OPEN_DATA_ENTRY"
  | "MARK_DATA_ENTERED"
  | "PUBLISH_PRELIMINARY"
  | "CONFIRM_MANUAL_REVIEW"
  | "CONFIRM_CORRECTIONS"
  | "CLOSE_OFFICIALLY";

export type MatchdayWorkflowStep = {
  id: string;
  number: string;
  title: string;
  responsibleRole: MatchdayWorkflowRole;
  responsibleRoleLabel: string;
  status: "DONE" | "OPEN" | "WAITING" | "BLOCKED";
  statusLabel: string;
  description: string;
  actionLabel: string;
  actionEnabled: boolean;
  actionReason: string;
  completedAt?: string;
  href?: string;
  action?: MatchdayWorkflowAction;
};

export type MatchdaySelectorItem = {
  matchday: number;
  label: string;
  href: string;
  status: MatchdayLifecycleStatus | "SCHEDULED";
  statusLabel: string;
  isSelected: boolean;
  isOperative: boolean;
  fixtureCount: number;
  resultCount: number;
};

export type MatchdayWorkflowSnapshot = {
  seasonId: string;
  seasonName: string;
  competitionId: string;
  competitionName: string;
  selectedMatchday: number;
  operativeMatchday: number;
  selectedStatus: MatchdayLifecycleStatus | "SCHEDULED";
  selectedStatusLabel: string;
  currentUserRole: MatchdayWorkflowRole;
  currentUserRoleLabel: string;
  dataSource: "DATABASE";
  warnings: readonly string[];
  selector: readonly MatchdaySelectorItem[];
  steps: readonly MatchdayWorkflowStep[];
  metrics: {
    fixtureCount: number;
    managerSeasonCount: number;
    squadAssignmentCount: number;
    relevantPlayerCount: number;
    playerMatchDataCount: number;
    resultCount: number;
    activeAdjustments: number;
  };
};

type WorkflowContext = {
  season: { id: string; name: string };
  competition: { id: string; name: string };
};

type LifecycleRecord = {
  id: string;
  status: MatchdayLifecycleStatus;
  matchday: number;
  lastCalculationAt: Date | null;
  lastPublishedAt: Date | null;
  versions: readonly {
    status: MatchdayLifecycleStatus;
    createdAt: Date;
  }[];
};

type LifecycleLoadResult = {
  lifecycles: readonly LifecycleRecord[];
  warnings: readonly string[];
};

type RawLifecycleDocument = {
  _id?: string | { $oid?: string };
  id?: string;
  status?: unknown;
  matchday?: unknown;
  lastCalculationAt?: unknown;
  lastPublishedAt?: unknown;
};

type RawMatchdayVersionDocument = {
  status?: unknown;
  matchday?: unknown;
  createdAt?: unknown;
};

export class MatchdayWorkflowService {
  private readonly prisma = getPrismaClient();

  async loadWorkflow(
    matchday?: number,
    role: MatchdayWorkflowRole = "GAME_DIRECTOR",
  ): Promise<MatchdayWorkflowSnapshot> {
    const context = await this.loadContext();
    const [fixtures, lifecycleLoadResult, managerSeasonCount, squadAssignmentCount] =
      await Promise.all([
        this.prisma!.fixture.findMany({
          where: { competitionId: context.competition.id },
          include: { result: true },
        }),
        this.loadLifecycles(context),
        this.prisma!.managerSeason.count({
          where: {
            seasonId: context.season.id,
            league: "FIRST",
            status: "ACTIVE",
            participation: "ACTIVE",
          },
        }),
        this.prisma!.squadAssignment.count({
          where: {
            managerSeason: {
              seasonId: context.season.id,
              league: "FIRST",
              status: "ACTIVE",
              participation: "ACTIVE",
            },
          },
        }),
      ]);
    const lifecycles = lifecycleLoadResult.lifecycles;
    const lifecycleByMatchday = new Map(
      lifecycles.map((lifecycle) => [lifecycle.matchday, lifecycle]),
    );
    const operativeMatchday = findOperativeMatchday(lifecycles);
    const selectedMatchday = normalizeMatchday(matchday) ?? operativeMatchday;
    const selectedLifecycle = lifecycleByMatchday.get(selectedMatchday) ?? null;
    const selectedFixtures = fixtures.filter(
      (fixture) => fixture.matchday === selectedMatchday,
    );
    const selectedStatus = selectedLifecycle?.status ?? "SCHEDULED";
    const [relevantPlayerCount, playerMatchDataCount, activeAdjustments] =
      await Promise.all([
        this.countRelevantPlayers(context, selectedMatchday),
        this.countRelevantPlayerMatchData(context, selectedMatchday),
        this.prisma!.manualMatchdayAdjustment.count({
          where: {
            competitionId: context.competition.id,
            matchday: selectedMatchday,
            status: "ACTIVE",
          },
        }),
      ]);
    const metrics = {
      fixtureCount: selectedFixtures.length,
      managerSeasonCount,
      squadAssignmentCount,
      relevantPlayerCount,
      playerMatchDataCount,
      resultCount: selectedFixtures.filter((fixture) => fixture.result).length,
      activeAdjustments,
    };

    return {
      seasonId: context.season.id,
      seasonName: context.season.name,
      competitionId: context.competition.id,
      competitionName: context.competition.name,
      selectedMatchday,
      operativeMatchday,
      selectedStatus,
      selectedStatusLabel: statusLabel(selectedStatus),
      currentUserRole: role,
      currentUserRoleLabel: roleLabel(role),
      dataSource: "DATABASE",
      warnings: lifecycleLoadResult.warnings,
      selector: Array.from({ length: totalMatchdays }, (_, index) => {
        const currentMatchday = index + 1;
        const lifecycle = lifecycleByMatchday.get(currentMatchday);
        const dayFixtures = fixtures.filter(
          (fixture) => fixture.matchday === currentMatchday,
        );
        const status = lifecycle?.status ?? "SCHEDULED";

        return {
          matchday: currentMatchday,
          label: `ST ${currentMatchday}`,
          href: `/admin/matchday?matchday=${currentMatchday}&role=${role}`,
          status,
          statusLabel: statusLabel(status),
          isSelected: currentMatchday === selectedMatchday,
          isOperative: currentMatchday === operativeMatchday,
          fixtureCount: dayFixtures.length,
          resultCount: dayFixtures.filter((fixture) => fixture.result).length,
        };
      }),
      steps: createWorkflowSteps({
        status: selectedStatus,
        matchday: selectedMatchday,
        metrics,
        lifecycle: selectedLifecycle,
        currentUserRole: role,
      }),
      metrics,
    };
  }

  async transition(formData: FormData): Promise<void> {
    const action = readWorkflowAction(formData);
    const matchday = readMatchday(formData);
    const role = readWorkflowRole(formData);

    if (!isActionAllowedForRole(action, role)) {
      throw new Error("Der aktuelle Workflow-Rolle darf diese Aktion nicht ausführen.");
    }

    const workflow = await this.loadWorkflow(matchday, role);
    const step = workflow.steps.find((item) => item.action === action);

    if (!step?.actionEnabled) {
      throw new Error(
        `Workflow: ${step?.actionReason ?? "Diese Aktion ist im aktuellen Workflowstatus nicht erlaubt."}`,
      );
    }

    const context = await this.loadContext();
    const status = statusForAction(action);
    const now = new Date();

    await this.prisma!.$transaction(async (tx) => {
      const lifecycle = await tx.matchdayLifecycle.upsert({
        where: {
          competitionId_matchday: {
            competitionId: context.competition.id,
            matchday,
          },
        },
        update: {
          status,
          ...(status === "OFFICIALLY_CLOSED" ? { lastPublishedAt: now } : {}),
        },
        create: {
          seasonId: context.season.id,
          competitionId: context.competition.id,
          matchday,
          status,
          correctionPending: false,
          ...(status === "OFFICIALLY_CLOSED" ? { lastPublishedAt: now } : {}),
        },
      });
      const existingVersions = await tx.matchdayVersion.count({
        where: {
          competitionId: context.competition.id,
          matchday,
        },
      });
      const version = await tx.matchdayVersion.create({
        data: {
          lifecycleId: lifecycle.id,
          seasonId: context.season.id,
          competitionId: context.competition.id,
          matchday,
          versionNumber: existingVersions + 1,
          status,
          createdBy: "matchday-workflow",
          reason: reasonForAction(action),
          publishedAt: status === "OFFICIALLY_CLOSED" ? now : undefined,
        },
      });

      await tx.matchdayLifecycle.update({
        where: { id: lifecycle.id },
        data: {
          latestVersionId: version.id,
          status,
        },
      });

      if (action === "PUBLISH_PRELIMINARY") {
        const fixtures = await tx.fixture.findMany({
          where: {
            competitionId: context.competition.id,
            matchday,
          },
          select: { id: true },
        });
        const fixtureIds = fixtures.map((fixture) => fixture.id);

        if (fixtureIds.length > 0) {
          await tx.fixture.updateMany({
            where: {
              id: { in: fixtureIds },
            },
            data: { status: "OFFICIAL" },
          });
          await tx.matchResult.updateMany({
            where: {
              fixtureId: { in: fixtureIds },
            },
            data: { status: "OFFICIAL" },
          });
        }

        await rebuildAccumulatedLeagueTableSnapshots({
          competitionId: context.competition.id,
          fromMatchday: matchday,
          tx,
        });
      }
    });

    revalidateMatchdayPaths(matchday);
  }

  private async loadContext(): Promise<WorkflowContext> {
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

    return {
      season: { id: season.id, name: season.name },
      competition: { id: competition.id, name: competition.name },
    };
  }

  private async loadLifecycles(
    context: WorkflowContext,
  ): Promise<LifecycleLoadResult> {
    try {
      const lifecycles = await this.prisma!.matchdayLifecycle.findMany({
        where: { competitionId: context.competition.id },
        include: { versions: { orderBy: { createdAt: "asc" } } },
        orderBy: { matchday: "asc" },
      }) as LifecycleRecord[];

      return { lifecycles, warnings: [] };
    } catch (error) {
      const fallback = await this.loadLifecyclesRaw(context);
      const message = error instanceof Error ? error.message : "Unbekannter Prisma-Fehler";

      return {
        lifecycles: fallback.lifecycles,
        warnings: [
          "MatchdayLifecycle wurde per Raw-Fallback geladen, weil Prisma einen Enum-Wert nicht lesen konnte.",
          message,
          ...fallback.warnings,
        ],
      };
    }
  }

  private async loadLifecyclesRaw(
    context: WorkflowContext,
  ): Promise<LifecycleLoadResult> {
    const warnings: string[] = [];
    const [rawLifecycles, rawVersions] = await Promise.all([
      this.prisma!.$runCommandRaw({
        find: "MatchdayLifecycle",
        filter: { competitionId: { $oid: context.competition.id } },
        sort: { matchday: 1 },
      }),
      this.prisma!.$runCommandRaw({
        find: "MatchdayVersion",
        filter: { competitionId: { $oid: context.competition.id } },
        sort: { matchday: 1, createdAt: 1 },
      }),
    ]);
    const versionsByMatchday = new Map<number, LifecycleRecord["versions"]>();

    for (const version of readRawBatch<RawMatchdayVersionDocument>(rawVersions)) {
      const matchday = normalizeRawMatchday(version.matchday);
      const status = normalizeLifecycleStatus(version.status);
      const createdAt = normalizeRawDate(version.createdAt);

      if (!matchday || !status || !createdAt) {
        if (matchday && !status) {
          warnings.push(`MatchdayVersion ST ${matchday} hat unbekannten Status ${String(version.status)}.`);
        }
        continue;
      }

      versionsByMatchday.set(matchday, [
        ...(versionsByMatchday.get(matchday) ?? []),
        { status, createdAt },
      ]);
    }

    const lifecycles = readRawBatch<RawLifecycleDocument>(rawLifecycles)
      .map((item) => {
        const matchday = normalizeRawMatchday(item.matchday);
        const status = normalizeLifecycleStatus(item.status);

        if (!matchday) {
          warnings.push(`MatchdayLifecycle ${readRawId(item)} hat keinen lesbaren Spieltag.`);
          return null;
        }

        if (!status) {
          warnings.push(
            `MatchdayLifecycle ST ${matchday} hat unbekannten Status ${String(item.status)} und wird als geplant behandelt.`,
          );
          return {
            id: readRawId(item),
            status: "DRAFT" as MatchdayLifecycleStatus,
            matchday,
            lastCalculationAt: normalizeRawDate(item.lastCalculationAt),
            lastPublishedAt: normalizeRawDate(item.lastPublishedAt),
            versions: versionsByMatchday.get(matchday) ?? [],
          };
        }

        return {
          id: readRawId(item),
          status,
          matchday,
          lastCalculationAt: normalizeRawDate(item.lastCalculationAt),
          lastPublishedAt: normalizeRawDate(item.lastPublishedAt),
          versions: versionsByMatchday.get(matchday) ?? [],
        };
      })
      .filter((item): item is LifecycleRecord => item !== null)
      .sort((first, second) => first.matchday - second.matchday);

    return { lifecycles, warnings };
  }

  private async countRelevantPlayers(context: WorkflowContext, matchday: number) {
    const playerIds = await this.loadRelevantPlayerIds(context, matchday);

    return playerIds.length;
  }

  private async countRelevantPlayerMatchData(
    context: WorkflowContext,
    matchday: number,
  ) {
    const playerIds = await this.loadRelevantPlayerIds(context, matchday);

    if (playerIds.length === 0) {
      return 0;
    }

    return this.prisma!.playerMatchData.count({
      where: {
        seasonId: context.season.id,
        matchday,
        playerId: { in: playerIds },
      },
    });
  }

  private async loadRelevantPlayerIds(
    context: WorkflowContext,
    matchday: number,
  ) {
    const assignments = await this.prisma!.squadAssignment.findMany({
      where: {
        managerSeason: {
          seasonId: context.season.id,
          league: "FIRST",
          status: "ACTIVE",
          participation: "ACTIVE",
        },
        player: {
          status: { not: "LEFT_BUNDESLIGA" },
        },
        validFromMatchday: { lte: matchday },
        OR: [{ validToMatchday: null }, { validToMatchday: { gte: matchday } }],
      },
      select: { playerId: true },
    });

    return Array.from(new Set(assignments.map((assignment) => assignment.playerId)));
  }
}

export async function loadMatchdayWorkflow(
  matchday?: number,
  role: MatchdayWorkflowRole = "GAME_DIRECTOR",
) {
  return new MatchdayWorkflowService().loadWorkflow(matchday, role);
}

export async function transitionMatchdayWorkflow(formData: FormData) {
  return new MatchdayWorkflowService().transition(formData);
}

export function parseMatchdayParam(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number(raw);

  return normalizeMatchday(parsed);
}

export function parseWorkflowRoleParam(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;

  return raw === "DATA_MAINTAINER" || raw === "GAME_DIRECTOR"
    ? raw
    : "GAME_DIRECTOR";
}

export function statusLabel(status: MatchdayLifecycleStatus | "SCHEDULED") {
  switch (status) {
    case "DATA_ENTRY_OPEN":
      return "Datenerfassung offen";
    case "DATA_ENTERED":
    case "DATA_ENTRY_COMPLETE":
      return "Datenerfassung abgeschlossen";
    case "CALCULATED":
      return "Berechnet";
    case "PRELIMINARY_PUBLISHED":
    case "PUBLISHED_PRELIMINARY":
      return "Malusprüfung offen";
    case "MANUAL_REVIEW_CONFIRMED":
      return "Korrekturen offen";
    case "CORRECTIONS_CONFIRMED":
      return "Offizieller Abschluss offen";
    case "OFFICIALLY_CLOSED":
    case "PUBLISHED_OFFICIAL":
      return "Offiziell abgeschlossen";
    case "REOPENED":
      return "Korrektur offen";
    case "ARCHIVED":
      return "Archiviert";
    case "DRAFT":
      return "Entwurf";
    case "SCHEDULED":
      return "Geplant";
  }
}

function createWorkflowSteps(input: {
  status: MatchdayLifecycleStatus | "SCHEDULED";
  matchday: number;
  metrics: MatchdayWorkflowSnapshot["metrics"];
  lifecycle: LifecycleRecord | null;
  currentUserRole: MatchdayWorkflowRole;
}): MatchdayWorkflowStep[] {
  const dataComplete = input.metrics.relevantPlayerCount > 0 &&
    input.metrics.playerMatchDataCount >= input.metrics.relevantPlayerCount;
  const dataEntered = isAtLeast(input.status, "DATA_ENTERED");
  const calculated = isAtLeast(input.status, "CALCULATED");
  const preliminaryPublished = isAtLeast(input.status, "PRELIMINARY_PUBLISHED");
  const manualConfirmed = isAtLeast(input.status, "MANUAL_REVIEW_CONFIRMED");
  const correctionsConfirmed = isAtLeast(input.status, "CORRECTIONS_CONFIRMED");
  const officiallyClosed = isAtLeast(input.status, "OFFICIALLY_CLOSED");
  const hasResults = input.metrics.resultCount === expectedFixturesPerMatchday;
  const calculationReady = dataEntered && dataComplete;

  const steps: Omit<
    MatchdayWorkflowStep,
    "actionEnabled" | "actionReason" | "responsibleRoleLabel" | "statusLabel"
  >[] = [
    {
      id: "data-entry",
      number: "01",
      title: "Datenerfassung",
      responsibleRole: "DATA_MAINTAINER",
      status: dataEntered ? "DONE" : dataComplete ? "OPEN" : "OPEN",
      description: dataEntered
        ? `${input.metrics.playerMatchDataCount}/${input.metrics.relevantPlayerCount} relevante PlayerMatchData bestätigt.`
        : `${input.metrics.playerMatchDataCount}/${input.metrics.relevantPlayerCount} relevante PlayerMatchData gespeichert.`,
      completedAt: latestTimestamp(input.lifecycle, ["DATA_ENTERED", "DATA_ENTRY_COMPLETE"]),
      href: `/admin/matchday/data-entry?matchday=${input.matchday}&role=${input.currentUserRole}`,
      action: dataComplete ? "MARK_DATA_ENTERED" : undefined,
      actionLabel: dataComplete ? "Daten bestätigen" : "Datenerfassung öffnen",
    },
    {
      id: "calculation",
      number: "02",
      title: "Berechnung",
      responsibleRole: "DATA_MAINTAINER",
      status: calculated ? "DONE" : calculationReady ? "OPEN" : "BLOCKED",
      description: calculated
        ? `${input.metrics.resultCount}/9 Fixtures berechnet.`
        : "Berechnung startet erst mit vollständiger Datenerfassung.",
      completedAt: latestTimestamp(input.lifecycle, ["CALCULATED"]),
      href: `/admin/matchday/calculate?matchday=${input.matchday}&role=${input.currentUserRole}`,
      actionLabel: "Berechnung starten",
    },
    {
      id: "preliminary",
      number: "03",
      title: "Vorläufiger Stand",
      responsibleRole: "DATA_MAINTAINER",
      status: preliminaryPublished ? "DONE" : calculated && hasResults ? "OPEN" : "WAITING",
      description: preliminaryPublished
        ? "Der vorläufige Stand ist für Review und Malusprüfung veröffentlicht."
        : "Veröffentlicht den berechneten Zwischenstand für Review.",
      completedAt: latestTimestamp(input.lifecycle, [
        "PRELIMINARY_PUBLISHED",
        "PUBLISHED_PRELIMINARY",
      ]),
      action: "PUBLISH_PRELIMINARY",
      actionLabel: "Vorläufig veröffentlichen",
    },
    {
      id: "manual-review",
      number: "04",
      title: "Malusprüfung",
      responsibleRole: "GAME_DIRECTOR",
      status: manualConfirmed ? "DONE" : preliminaryPublished ? "OPEN" : "WAITING",
      description: manualConfirmed
        ? `${input.metrics.activeAdjustments} aktive manuelle Anpassungen wurden geprüft.`
        : `${input.metrics.activeAdjustments} aktive manuelle Anpassungen prüfen.`,
      completedAt: latestTimestamp(input.lifecycle, ["MANUAL_REVIEW_CONFIRMED"]),
      href: `/admin/matchday/review?matchday=${input.matchday}&role=${input.currentUserRole}`,
      action: "CONFIRM_MANUAL_REVIEW",
      actionLabel: "Malusprüfung bestätigen",
    },
    {
      id: "corrections",
      number: "05",
      title: "Korrekturen",
      responsibleRole: "GAME_DIRECTOR",
      status: correctionsConfirmed ? "DONE" : manualConfirmed ? "OPEN" : "WAITING",
      description: correctionsConfirmed
        ? "Alle administrativen Korrekturen sind abgeschlossen."
        : "Bestätigt, dass keine weiteren Admin-Korrekturen offen sind.",
      completedAt: latestTimestamp(input.lifecycle, ["CORRECTIONS_CONFIRMED"]),
      action: "CONFIRM_CORRECTIONS",
      actionLabel: "Korrekturen abgeschlossen",
    },
    {
      id: "official",
      number: "06",
      title: "Offizieller Abschluss",
      responsibleRole: "GAME_DIRECTOR",
      status: officiallyClosed ? "DONE" : correctionsConfirmed ? "OPEN" : "WAITING",
      description: officiallyClosed
        ? "Der Spieltag ist offiziell abgeschlossen; der nächste Spieltag wird operativ."
        : "Schließt den Spieltag operativ ab und gibt den nächsten frei.",
      completedAt: latestTimestamp(input.lifecycle, [
        "OFFICIALLY_CLOSED",
        "PUBLISHED_OFFICIAL",
      ]),
      action: "CLOSE_OFFICIALLY",
      actionLabel: "Offiziell abschließen",
    },
  ];

  return steps.map((step) => enrichWorkflowStep(step, input.currentUserRole));
}

function findOperativeMatchday(lifecycles: readonly LifecycleRecord[]) {
  const closed = new Set(
    lifecycles
      .filter((lifecycle) => isAtLeast(lifecycle.status, "OFFICIALLY_CLOSED"))
      .map((lifecycle) => lifecycle.matchday),
  );

  for (let matchday = 1; matchday <= totalMatchdays; matchday += 1) {
    if (!closed.has(matchday)) {
      return matchday;
    }
  }

  return totalMatchdays;
}

function normalizeMatchday(value: number | undefined) {
  if (value === undefined || !Number.isInteger(value) || value < 1 || value > totalMatchdays) {
    return undefined;
  }

  return value;
}

function readWorkflowAction(formData: FormData): MatchdayWorkflowAction {
  const value = String(formData.get("action") ?? "");

  if (
    value === "OPEN_DATA_ENTRY" ||
    value === "MARK_DATA_ENTERED" ||
    value === "PUBLISH_PRELIMINARY" ||
    value === "CONFIRM_MANUAL_REVIEW" ||
    value === "CONFIRM_CORRECTIONS" ||
    value === "CLOSE_OFFICIALLY"
  ) {
    return value;
  }

  throw new Error("Unbekannte Matchday-Workflow-Aktion.");
}

function readWorkflowRole(formData: FormData): MatchdayWorkflowRole {
  return parseWorkflowRoleParam(String(formData.get("role") ?? ""));
}

function readMatchday(formData: FormData) {
  const matchday = normalizeMatchday(Number(formData.get("matchday")));

  if (!matchday) {
    throw new Error("Ungültiger Spieltag.");
  }

  return matchday;
}

function statusForAction(action: MatchdayWorkflowAction): MatchdayLifecycleStatus {
  switch (action) {
    case "OPEN_DATA_ENTRY":
      return "DATA_ENTRY_OPEN";
    case "MARK_DATA_ENTERED":
      return "DATA_ENTERED";
    case "PUBLISH_PRELIMINARY":
      return "PRELIMINARY_PUBLISHED";
    case "CONFIRM_MANUAL_REVIEW":
      return "MANUAL_REVIEW_CONFIRMED";
    case "CONFIRM_CORRECTIONS":
      return "CORRECTIONS_CONFIRMED";
    case "CLOSE_OFFICIALLY":
      return "OFFICIALLY_CLOSED";
  }
}

function reasonForAction(action: MatchdayWorkflowAction) {
  switch (action) {
    case "OPEN_DATA_ENTRY":
      return "Datenerfassung operativ geöffnet.";
    case "MARK_DATA_ENTERED":
      return "PlayerMatchData-Erfassung bestätigt.";
    case "PUBLISH_PRELIMINARY":
      return "Vorläufiger Stand veröffentlicht.";
    case "CONFIRM_MANUAL_REVIEW":
      return "Malusprüfung bestätigt.";
    case "CONFIRM_CORRECTIONS":
      return "Korrekturen abgeschlossen bestätigt.";
    case "CLOSE_OFFICIALLY":
      return "Spieltag offiziell abgeschlossen.";
  }
}

function enrichWorkflowStep(
  step: Omit<
    MatchdayWorkflowStep,
    "actionEnabled" | "actionReason" | "responsibleRoleLabel" | "statusLabel"
  >,
  currentUserRole: MatchdayWorkflowRole,
): MatchdayWorkflowStep {
  const allowed = step.action
    ? isActionAllowedForRole(step.action, currentUserRole)
    : canOpenStep(step.responsibleRole, currentUserRole);
  const actionEnabled = step.status === "OPEN" && allowed;

  return {
    ...step,
    responsibleRoleLabel: roleLabel(step.responsibleRole),
    statusLabel: stepStatusLabel(step.status),
    actionEnabled,
    actionReason: actionReason(step, allowed),
  };
}

function canOpenStep(
  responsibleRole: MatchdayWorkflowRole,
  currentUserRole: MatchdayWorkflowRole,
) {
  return currentUserRole === "GAME_DIRECTOR" || responsibleRole === "DATA_MAINTAINER";
}

function isActionAllowedForRole(
  action: MatchdayWorkflowAction,
  role: MatchdayWorkflowRole,
) {
  if (role === "GAME_DIRECTOR") {
    return true;
  }

  return (
    action === "OPEN_DATA_ENTRY" ||
    action === "MARK_DATA_ENTERED" ||
    action === "PUBLISH_PRELIMINARY"
  );
}

function actionReason(
  step: Pick<MatchdayWorkflowStep, "status" | "responsibleRole" | "action">,
  allowed: boolean,
) {
  if (!allowed && step.responsibleRole === "GAME_DIRECTOR") {
    return "Nur Spielleitung";
  }

  if (step.status === "DONE") {
    return "Abgeschlossen";
  }

  if (step.status === "WAITING") {
    return "Vorherige Schritte zuerst abschließen";
  }

  if (step.status === "BLOCKED") {
    return "Living-Daten noch unvollständig";
  }

  return allowed ? "Nächste erlaubte Aktion" : "Nicht berechtigt";
}

function roleLabel(role: MatchdayWorkflowRole) {
  return role === "GAME_DIRECTOR" ? "Spielleitung" : "Datenpflege";
}

function stepStatusLabel(status: MatchdayWorkflowStep["status"]) {
  switch (status) {
    case "DONE":
      return "Abgeschlossen";
    case "OPEN":
      return "Offen";
    case "WAITING":
      return "Wartet";
    case "BLOCKED":
      return "Blockiert";
  }
}

function latestTimestamp(
  lifecycle: LifecycleRecord | null,
  statuses: readonly MatchdayLifecycleStatus[],
) {
  const version = lifecycle?.versions
    .filter((entry) => statuses.includes(entry.status))
    .at(-1);

  return version ? formatDateTime(version.createdAt.toISOString()) : undefined;
}

function isAtLeast(
  status: MatchdayLifecycleStatus | "SCHEDULED",
  target: MatchdayLifecycleStatus,
) {
  return statusRank(status) >= statusRank(target);
}

function statusRank(status: MatchdayLifecycleStatus | "SCHEDULED") {
  const ranks: Record<MatchdayLifecycleStatus | "SCHEDULED", number> = {
    SCHEDULED: 0,
    DRAFT: 0,
    DATA_ENTRY_OPEN: 1,
    DATA_ENTERED: 2,
    DATA_ENTRY_COMPLETE: 2,
    CALCULATED: 3,
    PRELIMINARY_PUBLISHED: 4,
    PUBLISHED_PRELIMINARY: 4,
    MANUAL_REVIEW_CONFIRMED: 5,
    CORRECTIONS_CONFIRMED: 6,
    OFFICIALLY_CLOSED: 7,
    PUBLISHED_OFFICIAL: 7,
    REOPENED: 2,
    ARCHIVED: 8,
  };

  return ranks[status];
}

function normalizeLifecycleStatus(value: unknown): MatchdayLifecycleStatus | null {
  return typeof value === "string" && isLifecycleStatus(value) ? value : null;
}

function isLifecycleStatus(value: string): value is MatchdayLifecycleStatus {
  return validLifecycleStatuses.includes(value as MatchdayLifecycleStatus);
}

function readRawBatch<T>(result: unknown): T[] {
  if (!result || typeof result !== "object") {
    return [];
  }

  const cursor = "cursor" in result ? result.cursor : null;

  if (!cursor || typeof cursor !== "object") {
    return [];
  }

  const firstBatch = "firstBatch" in cursor ? cursor.firstBatch : null;

  return Array.isArray(firstBatch) ? firstBatch as T[] : [];
}

function normalizeRawMatchday(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) ? value : null;
}

function normalizeRawDate(value: unknown): Date | null {
  if (value instanceof Date) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = new Date(value);

    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  if (value && typeof value === "object" && "$date" in value) {
    return normalizeRawDate(value.$date);
  }

  return null;
}

function readRawId(item: RawLifecycleDocument) {
  if (typeof item.id === "string") {
    return item.id;
  }

  if (typeof item._id === "string") {
    return item._id;
  }

  if (item._id && typeof item._id === "object" && typeof item._id.$oid === "string") {
    return item._id.$oid;
  }

  return "unknown";
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "Noch offen";
  }

  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function revalidateMatchdayPaths(matchday: number) {
  const paths = [
    `/admin/matchday?matchday=${matchday}`,
    `/admin/matchday/data-entry?matchday=${matchday}`,
    `/admin/matchday/calculate?matchday=${matchday}`,
    `/admin/matchday/review?matchday=${matchday}`,
    "/admin/matchday",
  ];

  for (const path of paths) {
    try {
      revalidatePath(path);
    } catch {
      // Workflow transitions are also used by CLI validation scripts where
      // Next.js has no static generation store. The database transition must
      // remain successful even if cache revalidation is unavailable.
    }
  }
}

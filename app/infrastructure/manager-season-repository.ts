import type { Prisma, PrismaClient } from "@prisma/client";

import { getPrismaClient } from "./prisma";

export type ManagerLeagueLevel = "FIRST" | "SECOND";
export type ManagerSeasonStatus = "ACTIVE" | "PAUSED" | "ARCHIVED";
export type ManagerParticipationStatus = "ACTIVE" | "PAUSED" | "WITHDRAWN";
export type ManagerTransferStatus = "NOT_STARTED" | "OPEN" | "SUBMITTED" | "LOCKED";
export type ManagerSeasonLifecycleStatus =
  | "CREATED"
  | "REGISTERED"
  | "ACTIVE"
  | "COMPLETED";

export type ManagerSeasonRecord = {
  id: string;
  managerId: string;
  seasonId: string;
  displayName: string;
  shortName: string;
  managerCreatedAt: Date;
  managerStatus: "ACTIVE" | "PAUSED" | "ARCHIVED";
  linkedUser: {
    id: string;
    email: string;
    displayName: string;
  } | null;
  league: ManagerLeagueLevel;
  budget: number;
  status: ManagerSeasonStatus;
  participation: ManagerParticipationStatus;
  transferStatus: ManagerTransferStatus;
  currentLifecycle: ManagerSeasonLifecycleStatus;
};

export type ManagerSeasonHistoryRecord = ManagerSeasonRecord & {
  seasonName: string;
  yearStart: number;
  yearEnd: number;
};

export type OrphanedManagerSeasonRecord = {
  id: string;
  managerId: string;
  seasonId: string;
  league: ManagerLeagueLevel;
  status: ManagerSeasonStatus;
};

export type ManagerSeasonLoadResult = {
  managerSeasons: readonly ManagerSeasonRecord[];
  orphanedManagerSeasons: readonly OrphanedManagerSeasonRecord[];
};

export type ActiveSeasonRecord = {
  id: string;
  name: string;
  yearStart: number;
  yearEnd: number;
  status: "PLANNED" | "ACTIVE" | "COMPLETED" | "ARCHIVED";
};

export type ManagerSeasonUpsertRecord = {
  managerId?: string;
  displayName: string;
  shortName: string;
  managerStatus: "ACTIVE" | "PAUSED" | "ARCHIVED";
  seasonId: string;
  league: ManagerLeagueLevel;
  budget: number;
  status: ManagerSeasonStatus;
  participation: ManagerParticipationStatus;
  transferStatus: ManagerTransferStatus;
  currentLifecycle: ManagerSeasonLifecycleStatus;
};

export type ManagerSeasonPauseRecord = {
  managerSeasonId: string;
};

export type CreateManagerInput = {
  displayName: string;
  shortName: string;
  league: ManagerLeagueLevel;
  budget: number;
  status: "ACTIVE" | "PAUSED" | "ARCHIVED";
};

export type PauseManagerInput = {
  managerId: string;
  seasonId: string;
};

export type ArchiveManagerInput = {
  managerId: string;
};

export type ReactivateManagerInput = {
  managerId: string;
};

export type HardDeleteManagerInput = {
  managerId: string;
};

export type HardDeleteManagerResult = {
  managerSeasonsRemoved: number;
  squadAssignmentsRemoved: number;
  teamsRemoved: number;
  userLinksCleared: number;
};

export type AssignManagerLeagueInput = {
  managerSeasonId: string;
  league: ManagerLeagueLevel;
};

export type UpdateManagerSeasonBudgetInput = {
  managerSeasonId: string;
  budget: number;
};

export type ManagerImportAuditInput = {
  seasonId: string;
  workbookName: string;
  workbookPath?: string;
  newManagers: number;
  existing: number;
  leagueChanges: number;
  budgetChanges: number;
  pausedManagers: number;
  errors: number;
  durationMs: number;
  summary: Prisma.InputJsonValue;
};

export type ApplyManagerSeasonImportInput = {
  upserts: readonly ManagerSeasonUpsertRecord[];
  pausedManagers: readonly ManagerSeasonPauseRecord[];
  audit: ManagerImportAuditInput;
};

export interface ManagerSeasonRepository {
  applyImport(input: ApplyManagerSeasonImportInput): Promise<void>;
  archiveManager(input: ArchiveManagerInput): Promise<void>;
  assignLeague(input: AssignManagerLeagueInput): Promise<void>;
  createManager(input: CreateManagerInput): Promise<ManagerSeasonRecord>;
  hardDeleteManager(input: HardDeleteManagerInput): Promise<HardDeleteManagerResult>;
  loadActiveSeason(): Promise<ActiveSeasonRecord | null>;
  loadCurrentSeasonManagerSeasons(
    seasonId: string,
  ): Promise<readonly ManagerSeasonRecord[] | null>;
  loadCurrentSeasonManagerSeasonsWithDiagnostics(
    seasonId: string,
  ): Promise<ManagerSeasonLoadResult | null>;
  loadManagerSeasonHistory(
    managerId: string,
  ): Promise<readonly ManagerSeasonHistoryRecord[] | null>;
  loadSeasons(): Promise<readonly ActiveSeasonRecord[] | null>;
  pauseManager(input: PauseManagerInput): Promise<never>;
  reactivateManager(input: ReactivateManagerInput): Promise<void>;
  updateBudget(input: UpdateManagerSeasonBudgetInput): Promise<void>;
}

export class PrismaManagerSeasonRepository implements ManagerSeasonRepository {
  private readonly prisma = getPrismaClient();

  async loadActiveSeason(): Promise<ActiveSeasonRecord | null> {
    if (!this.prisma) {
      return null;
    }

    try {
      const season = await this.prisma.season.findFirst({
        where: { status: "ACTIVE" },
        orderBy: { yearStart: "desc" },
      });

      return season
        ? {
            id: season.id,
            name: season.name,
            yearStart: season.yearStart,
            yearEnd: season.yearEnd,
            status: season.status,
          }
        : null;
    } catch {
      return null;
    }
  }

  async loadSeasons(): Promise<readonly ActiveSeasonRecord[] | null> {
    if (!this.prisma) {
      return null;
    }

    try {
      const seasons = await this.prisma.season.findMany({
        orderBy: { yearStart: "desc" },
      });

      return seasons.map((season) => ({
        id: season.id,
        name: season.name,
        yearStart: season.yearStart,
        yearEnd: season.yearEnd,
        status: season.status,
      }));
    } catch {
      return null;
    }
  }

  async loadCurrentSeasonManagerSeasons(
    seasonId: string,
  ): Promise<readonly ManagerSeasonRecord[] | null> {
    const result = await this.loadCurrentSeasonManagerSeasonsWithDiagnostics(
      seasonId,
    );

    return result?.managerSeasons ?? null;
  }

  async loadCurrentSeasonManagerSeasonsWithDiagnostics(
    seasonId: string,
  ): Promise<ManagerSeasonLoadResult | null> {
    if (!this.prisma) {
      return null;
    }

    try {
      const managerSeasons = await this.prisma.managerSeason.findMany({
        where: { seasonId },
        orderBy: [{ league: "asc" }, { createdAt: "asc" }],
      });
      const managerIds = [...new Set(managerSeasons.map((item) => item.managerId))];
      const managers = await this.prisma.manager.findMany({
        where: { id: { in: managerIds } },
      });
      const managersById = new Map(
        managers.map((manager) => [manager.id, manager]),
      );
      const validManagerSeasons: ManagerSeasonRecord[] = [];
      const orphanedManagerSeasons: OrphanedManagerSeasonRecord[] = [];

      for (const managerSeason of managerSeasons) {
        const manager = managersById.get(managerSeason.managerId);

        if (!manager) {
          orphanedManagerSeasons.push({
            id: managerSeason.id,
            managerId: managerSeason.managerId,
            seasonId: managerSeason.seasonId,
            league: managerSeason.league,
            status: managerSeason.status,
          });
          continue;
        }

        validManagerSeasons.push(
          mapManagerSeasonRecord({
            ...managerSeason,
            manager,
          }),
        );
      }

      validManagerSeasons.sort(
        (first, second) =>
          first.league.localeCompare(second.league) ||
          first.displayName.localeCompare(second.displayName, "de"),
      );

      return {
        managerSeasons: validManagerSeasons,
        orphanedManagerSeasons,
      };
    } catch (error) {
      console.error("ManagerSeason load failed", error);
      return null;
    }
  }

  async loadManagerSeasonHistory(
    managerId: string,
  ): Promise<readonly ManagerSeasonHistoryRecord[] | null> {
    if (!this.prisma) {
      return null;
    }

    try {
      const managerSeasons = await this.prisma.managerSeason.findMany({
        where: { managerId },
        include: {
          manager: true,
          season: true,
        },
        orderBy: {
          season: {
            yearStart: "desc",
          },
        },
      });

      return managerSeasons.map((managerSeason) => ({
        ...mapManagerSeasonRecord(managerSeason),
        seasonName: managerSeason.season.name,
        yearStart: managerSeason.season.yearStart,
        yearEnd: managerSeason.season.yearEnd,
      }));
    } catch (error) {
      console.error("ManagerSeason history load failed", error);
      return null;
    }
  }

  async applyImport(input: ApplyManagerSeasonImportInput): Promise<void> {
    if (!this.prisma) {
      throw new Error("Prisma Manager Season store is not available.");
    }

    await this.prisma.$transaction(async (tx) => {
      for (const managerSeason of input.upserts) {
        const manager = await tx.manager.upsert({
          where: { shortName: managerSeason.shortName },
          update: {
            displayName: managerSeason.displayName,
            status: managerSeason.managerStatus,
          },
          create: {
            displayName: managerSeason.displayName,
            shortName: managerSeason.shortName,
            status: managerSeason.managerStatus,
          },
        });

        await tx.managerSeason.upsert({
          where: {
            seasonId_managerId: {
              seasonId: managerSeason.seasonId,
              managerId: manager.id,
            },
          },
          update: {
            league: managerSeason.league,
            budget: managerSeason.budget,
            status: managerSeason.status,
            participation: managerSeason.participation,
            transferStatus: managerSeason.transferStatus,
            currentLifecycle: managerSeason.currentLifecycle,
          },
          create: {
            managerId: manager.id,
            seasonId: managerSeason.seasonId,
            league: managerSeason.league,
            budget: managerSeason.budget,
            status: managerSeason.status,
            participation: managerSeason.participation,
            transferStatus: managerSeason.transferStatus,
            currentLifecycle: managerSeason.currentLifecycle,
          },
        });
      }

      await bulkPauseManagerSeasons(tx, input.pausedManagers);

      await tx.managerImportAudit.create({
        data: {
          seasonId: input.audit.seasonId,
          workbookName: input.audit.workbookName,
          workbookPath: input.audit.workbookPath,
          newManagers: input.audit.newManagers,
          existing: input.audit.existing,
          leagueChanges: input.audit.leagueChanges,
          budgetChanges: input.audit.budgetChanges,
          pausedManagers: input.audit.pausedManagers,
          errors: input.audit.errors,
          durationMs: input.audit.durationMs,
          summaryJson: input.audit.summary,
        },
      });
    });
  }

  async createManager(input: CreateManagerInput): Promise<ManagerSeasonRecord> {
    if (!this.prisma) {
      throw new Error("Prisma Manager Season store is not available.");
    }

    const activeSeason = await this.loadActiveSeason();

    if (!activeSeason) {
      throw new Error("Manager kann nicht ohne aktive Saison angelegt werden.");
    }

    try {
      const created = await this.prisma.$transaction(async (tx) => {
        const manager = await tx.manager.create({
          data: {
            displayName: input.displayName,
            shortName: input.shortName,
            status: input.status,
          },
        });

        const managerSeason = await tx.managerSeason.create({
          data: {
            managerId: manager.id,
            seasonId: activeSeason.id,
            league: input.league,
            budget: input.budget,
            status: input.status,
            participation: input.status === "ACTIVE" ? "ACTIVE" : "PAUSED",
            transferStatus: input.status === "ACTIVE" ? "OPEN" : "LOCKED",
            currentLifecycle: input.status === "ACTIVE" ? "ACTIVE" : "REGISTERED",
          },
          include: { manager: true },
        });

        return managerSeason;
      });

      return mapManagerSeasonRecord(created);
    } catch (error) {
      if (isKnownPrismaError(error, "P2002")) {
        throw new Error("Manager mit diesem ShortName existiert bereits.");
      }

      throw error;
    }
  }

  async pauseManager(): Promise<never> {
    throw new Error("Pause Manager is prepared but not implemented yet.");
  }

  async archiveManager(input: ArchiveManagerInput): Promise<void> {
    if (!this.prisma) {
      throw new Error("Prisma Manager Season store is not available.");
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.manager.update({
        where: { id: input.managerId },
        data: { status: "ARCHIVED" },
      });
      await tx.managerSeason.updateMany({
        where: { managerId: input.managerId },
        data: {
          status: "ARCHIVED",
          participation: "WITHDRAWN",
          transferStatus: "LOCKED",
          currentLifecycle: "COMPLETED",
        },
      });
    });
  }

  async reactivateManager(input: ReactivateManagerInput): Promise<void> {
    if (!this.prisma) {
      throw new Error("Prisma Manager Season store is not available.");
    }

    const activeSeason = await this.loadActiveSeason();

    await this.prisma.$transaction(async (tx) => {
      await tx.manager.update({
        where: { id: input.managerId },
        data: { status: "ACTIVE" },
      });

      const currentManagerSeason = await tx.managerSeason.findFirst({
        where: {
          managerId: input.managerId,
          ...(activeSeason ? { seasonId: activeSeason.id } : {}),
        },
        orderBy: { updatedAt: "desc" },
        select: { id: true },
      });

      if (!currentManagerSeason) {
        return;
      }

      await tx.managerSeason.update({
        where: { id: currentManagerSeason.id },
        data: {
          status: "ACTIVE",
          participation: "ACTIVE",
          transferStatus: "OPEN",
          currentLifecycle: "ACTIVE",
        },
      });
    });
  }

  async hardDeleteManager(
    input: HardDeleteManagerInput,
  ): Promise<HardDeleteManagerResult> {
    if (!this.prisma) {
      throw new Error("Prisma Manager Season store is not available.");
    }

    return this.prisma.$transaction(async (tx) => {
      const managerSeasons = await tx.managerSeason.findMany({
        where: { managerId: input.managerId },
        select: { id: true },
      });
      const teams = await tx.team.findMany({
        where: { managerId: input.managerId },
        select: { id: true },
      });
      const managerSeasonIds = managerSeasons.map((item) => item.id);
      const teamIds = teams.map((team) => team.id);
      const squadAssignmentFilters: Prisma.SquadAssignmentWhereInput[] = [];

      if (managerSeasonIds.length > 0) {
        squadAssignmentFilters.push({
          managerSeasonId: { in: managerSeasonIds },
        });
      }

      if (teamIds.length > 0) {
        squadAssignmentFilters.push({
          teamId: { in: teamIds },
        });
      }

      const squadAssignmentsRemoved =
        squadAssignmentFilters.length > 0
          ? await tx.squadAssignment.deleteMany({
              where: { OR: squadAssignmentFilters },
            })
          : { count: 0 };
      const managerSeasonsRemoved = await tx.managerSeason.deleteMany({
        where: { managerId: input.managerId },
      });
      const teamsRemoved = await tx.team.deleteMany({
        where: { managerId: input.managerId },
      });
      const userDelegate = getOptionalUserDelegate(tx);
      const userLinksCleared = userDelegate
        ? await userDelegate.updateMany({
            where: { managerId: input.managerId },
            data: { managerId: null },
          })
        : { count: 0 };

      if (!userDelegate) {
        console.warn(
          "Hard delete manager skipped user link cleanup because Prisma user delegate is unavailable.",
        );
      }

      await tx.manager.delete({
        where: { id: input.managerId },
      });

      return {
        managerSeasonsRemoved: managerSeasonsRemoved.count,
        squadAssignmentsRemoved: squadAssignmentsRemoved.count,
        teamsRemoved: teamsRemoved.count,
        userLinksCleared: userLinksCleared.count,
      };
    });
  }

  async assignLeague(input: AssignManagerLeagueInput): Promise<void> {
    if (!this.prisma) {
      throw new Error("Prisma Manager Season store is not available.");
    }

    await this.prisma.managerSeason.update({
      where: { id: input.managerSeasonId },
      data: { league: input.league },
    });
  }

  async updateBudget(input: UpdateManagerSeasonBudgetInput): Promise<void> {
    if (!this.prisma) {
      throw new Error("Prisma Manager Season store is not available.");
    }

    await this.prisma.managerSeason.update({
      where: { id: input.managerSeasonId },
      data: { budget: input.budget },
    });
  }
}

type ManagerSeasonTransactionClient = Parameters<
  Parameters<PrismaClient["$transaction"]>[0]
>[0];

type OptionalUserDelegate = {
  updateMany(input: {
    where: { managerId: string };
    data: { managerId: null };
  }): Promise<{ count: number }>;
};

function getOptionalUserDelegate(
  tx: ManagerSeasonTransactionClient,
): OptionalUserDelegate | null {
  const candidate = (tx as unknown as { user?: OptionalUserDelegate }).user;

  return typeof candidate?.updateMany === "function" ? candidate : null;
}

async function bulkPauseManagerSeasons(
  tx: ManagerSeasonTransactionClient,
  input: readonly ManagerSeasonPauseRecord[],
) {
  for (const managerSeason of input) {
    await tx.managerSeason.update({
      where: { id: managerSeason.managerSeasonId },
      data: {
        status: "PAUSED",
        participation: "PAUSED",
        transferStatus: "LOCKED",
      },
    });
  }
}

function mapManagerSeasonRecord(managerSeason: {
  id: string;
  managerId: string;
  seasonId: string;
  league: ManagerLeagueLevel;
  budget: number;
  status: ManagerSeasonStatus;
  participation: ManagerParticipationStatus;
  transferStatus: ManagerTransferStatus;
  currentLifecycle: ManagerSeasonLifecycleStatus;
  manager: {
    displayName: string;
    shortName: string;
    createdAt: Date;
    status: ManagerSeasonRecord["managerStatus"];
    user?: {
      id: string;
      email: string;
      displayName: string;
    } | null;
  };
}): ManagerSeasonRecord {
  return {
    id: managerSeason.id,
    managerId: managerSeason.managerId,
    seasonId: managerSeason.seasonId,
    displayName: managerSeason.manager.displayName,
    shortName: managerSeason.manager.shortName,
    managerCreatedAt: managerSeason.manager.createdAt,
    managerStatus: managerSeason.manager.status,
    linkedUser: managerSeason.manager.user
      ? {
          id: managerSeason.manager.user.id,
          email: managerSeason.manager.user.email,
          displayName: managerSeason.manager.user.displayName,
        }
      : null,
    league: managerSeason.league,
    budget: managerSeason.budget,
    status: managerSeason.status,
    participation: managerSeason.participation,
    transferStatus: managerSeason.transferStatus,
    currentLifecycle: managerSeason.currentLifecycle,
  };
}

function isKnownPrismaError(error: unknown, code: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === code
  );
}

import type { Prisma, PrismaClient } from "@prisma/client";

import { getPrismaClient } from "./prisma";

export type SquadAssignmentRecord = {
  id: string;
  managerSeasonId: string | null;
  managerId: string | null;
  managerName: string | null;
  playerId: string;
  playerName: string;
  playerStatus: "ACTIVE" | "LEFT_BUNDESLIGA" | "INACTIVE";
  positionGroup: "TW" | "AB" | "MF" | "ST";
  bundesligaClub: string;
  marketValue: number;
  slotId: number;
  validFromMatchday: number;
  validToMatchday: number | null;
  reason: "INITIAL_SQUAD" | "SUMMER_TRANSFER" | "WINTER_TRANSFER" | "REAL_TRANSFER_REPLACEMENT" | "ADMIN_CORRECTION";
};

export type SquadAssignmentUpsertRecord = {
  managerSeasonId: string;
  playerId: string;
  slotId: number;
  validFromMatchday: number;
  validToMatchday: number | null;
  reason: SquadAssignmentRecord["reason"];
};

export type SquadImportAuditInput = {
  seasonId: string;
  workbookName: string;
  workbookPath?: string;
  importedManagers: number;
  importedSlots: number;
  warnings: Prisma.InputJsonValue;
  durationMs: number;
  summary: Prisma.InputJsonValue;
};

export type ApplySquadImportInput = {
  assignments: readonly SquadAssignmentUpsertRecord[];
  audit: SquadImportAuditInput;
};

export interface SquadRepository {
  applyImport(input: ApplySquadImportInput): Promise<void>;
  bulkUpsertAssignments(
    assignments: readonly SquadAssignmentUpsertRecord[],
  ): Promise<void>;
  findSlot(input: {
    managerSeasonId: string;
    slotId: number;
    matchday: number;
  }): Promise<SquadAssignmentRecord | null>;
  loadCurrentSquad(
    managerSeasonId: string,
  ): Promise<readonly SquadAssignmentRecord[] | null>;
  loadHistoricalSquad(
    managerSeasonId: string,
  ): Promise<readonly SquadAssignmentRecord[] | null>;
  loadSquadByMatchday(input: {
    managerSeasonId: string;
    matchday: number;
  }): Promise<readonly SquadAssignmentRecord[] | null>;
  loadSquad(input: {
    managerSeasonId: string;
    matchday: number;
  }): Promise<readonly SquadAssignmentRecord[] | null>;
}

export class PrismaSquadRepository implements SquadRepository {
  private readonly prisma = getPrismaClient();

  async loadSquad(input: {
    managerSeasonId: string;
    matchday: number;
  }): Promise<readonly SquadAssignmentRecord[] | null> {
    if (!this.prisma) {
      return null;
    }

    try {
      const assignments = await this.prisma.squadAssignment.findMany({
        where: {
          managerSeasonId: input.managerSeasonId,
          validFromMatchday: { lte: input.matchday },
          OR: [
            { validToMatchday: null },
            { validToMatchday: { gte: input.matchday } },
          ],
        },
        include: {
          managerSeason: { include: { manager: true } },
          player: true,
        },
        orderBy: { slotId: "asc" },
      });

      return assignments.map(mapSquadAssignment);
    } catch {
      return null;
    }
  }

  async loadCurrentSquad(
    managerSeasonId: string,
  ): Promise<readonly SquadAssignmentRecord[] | null> {
    if (!this.prisma) {
      return null;
    }

    try {
      const assignments = await this.prisma.squadAssignment.findMany({
        where: {
          managerSeasonId,
          validToMatchday: null,
        },
        include: {
          managerSeason: { include: { manager: true } },
          player: true,
        },
        orderBy: { slotId: "asc" },
      });

      return assignments.map(mapSquadAssignment);
    } catch {
      return null;
    }
  }

  async loadSquadByMatchday(input: {
    managerSeasonId: string;
    matchday: number;
  }): Promise<readonly SquadAssignmentRecord[] | null> {
    return this.loadSquad(input);
  }

  async loadHistoricalSquad(
    managerSeasonId: string,
  ): Promise<readonly SquadAssignmentRecord[] | null> {
    if (!this.prisma) {
      return null;
    }

    try {
      const assignments = await this.prisma.squadAssignment.findMany({
        where: { managerSeasonId },
        include: {
          managerSeason: { include: { manager: true } },
          player: true,
        },
        orderBy: [{ slotId: "asc" }, { validFromMatchday: "asc" }],
      });

      return assignments.map(mapSquadAssignment);
    } catch {
      return null;
    }
  }

  async findSlot(input: {
    managerSeasonId: string;
    slotId: number;
    matchday: number;
  }): Promise<SquadAssignmentRecord | null> {
    const squad = await this.loadSquad({
      managerSeasonId: input.managerSeasonId,
      matchday: input.matchday,
    });

    return squad?.find((assignment) => assignment.slotId === input.slotId) ?? null;
  }

  async bulkUpsertAssignments(
    assignments: readonly SquadAssignmentUpsertRecord[],
  ): Promise<void> {
    if (!this.prisma) {
      throw new Error("Prisma Squad store is not available.");
    }

    await this.prisma.$transaction(
      async (tx) => {
        await bulkUpsertAssignments(tx, assignments);
      },
      createSquadImportTransactionOptions(),
    );
  }

  async applyImport(input: ApplySquadImportInput): Promise<void> {
    if (!this.prisma) {
      throw new Error("Prisma Squad store is not available.");
    }

    await this.prisma.$transaction(
      async (tx) => {
        await repairInitialSquadImportConflicts(tx, input.assignments);
        await createInitialSquadAssignments(tx, input.assignments);
        await tx.squadImportAudit.create({
          data: {
            seasonId: input.audit.seasonId,
            workbookName: input.audit.workbookName,
            workbookPath: input.audit.workbookPath,
            importedManagers: input.audit.importedManagers,
            importedSlots: input.audit.importedSlots,
            warningsJson: input.audit.warnings,
            durationMs: input.audit.durationMs,
            summaryJson: input.audit.summary,
          },
        });
      },
      createSquadImportTransactionOptions(),
    );
  }
}

function createSquadImportTransactionOptions() {
  return {
    maxWait: 10_000,
    timeout: 60_000,
  };
}

type SquadTransactionClient = Parameters<
  Parameters<PrismaClient["$transaction"]>[0]
>[0];

async function bulkUpsertAssignments(
  tx: SquadTransactionClient,
  assignments: readonly SquadAssignmentUpsertRecord[],
) {
  for (const assignment of assignments) {
    await tx.squadAssignment.upsert({
      where: {
        managerSeasonId_slotId_validFromMatchday: {
          managerSeasonId: assignment.managerSeasonId,
          slotId: assignment.slotId,
          validFromMatchday: assignment.validFromMatchday,
        },
      },
      update: {
        playerId: assignment.playerId,
        validToMatchday: assignment.validToMatchday,
        reason: assignment.reason,
      },
      create: {
        managerSeasonId: assignment.managerSeasonId,
        playerId: assignment.playerId,
        slotId: assignment.slotId,
        validFromMatchday: assignment.validFromMatchday,
        validToMatchday: assignment.validToMatchday,
        reason: assignment.reason,
      },
    });
  }
}

async function repairInitialSquadImportConflicts(
  tx: SquadTransactionClient,
  assignments: readonly SquadAssignmentUpsertRecord[],
) {
  const initialAssignments = assignments.filter(
    (assignment) =>
      assignment.reason === "INITIAL_SQUAD" &&
      assignment.validFromMatchday === 1 &&
      assignment.validToMatchday === null,
  );

  if (initialAssignments.length === 0) {
    return;
  }

  await tx.squadAssignment.deleteMany({
    where: {
      OR: initialAssignments.map((assignment) => ({
        managerSeasonId: assignment.managerSeasonId,
        slotId: assignment.slotId,
        validFromMatchday: assignment.validFromMatchday,
      })),
    },
  });
}

async function createInitialSquadAssignments(
  tx: SquadTransactionClient,
  assignments: readonly SquadAssignmentUpsertRecord[],
) {
  if (assignments.length === 0) {
    return;
  }

  await tx.squadAssignment.createMany({
    data: assignments.map((assignment) => ({
      managerSeasonId: assignment.managerSeasonId,
      playerId: assignment.playerId,
      slotId: assignment.slotId,
      validFromMatchday: assignment.validFromMatchday,
      validToMatchday: assignment.validToMatchday,
      reason: assignment.reason,
    })),
  });
}

function mapSquadAssignment(assignment: {
  id: string;
  managerSeasonId: string | null;
  playerId: string;
  slotId: number;
  validFromMatchday: number;
  validToMatchday: number | null;
  reason: SquadAssignmentRecord["reason"];
  managerSeason: {
    managerId: string;
    manager: { displayName: string };
  } | null;
  player: {
    displayName: string;
    status: SquadAssignmentRecord["playerStatus"];
    positionGroup: SquadAssignmentRecord["positionGroup"];
    bundesligaClub: string;
    marketValue: number;
  };
}): SquadAssignmentRecord {
  return {
    id: assignment.id,
    managerSeasonId: assignment.managerSeasonId,
    managerId: assignment.managerSeason?.managerId ?? null,
    managerName: assignment.managerSeason?.manager.displayName ?? null,
    playerId: assignment.playerId,
    playerName: assignment.player.displayName,
    playerStatus: assignment.player.status,
    positionGroup: assignment.player.positionGroup,
    bundesligaClub: assignment.player.bundesligaClub,
    marketValue: assignment.player.marketValue,
    slotId: assignment.slotId,
    validFromMatchday: assignment.validFromMatchday,
    validToMatchday: assignment.validToMatchday,
    reason: assignment.reason,
  };
}

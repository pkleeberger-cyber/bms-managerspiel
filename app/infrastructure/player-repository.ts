import type { Prisma, PrismaClient } from "@prisma/client";

import { getPrismaClient } from "./prisma";

export type PlayerPositionGroup = "TW" | "AB" | "MF" | "ST";
export type PlayerStatus = "ACTIVE" | "LEFT_BUNDESLIGA" | "INACTIVE";

export type PlayerRecord = {
  id: string;
  kickerId?: string;
  firstName?: string;
  lastName?: string;
  displayName: string;
  positionGroup: PlayerPositionGroup;
  bundesligaClub: string;
  marketValue: number;
  status: PlayerStatus;
};

export type PlayerMasterSeasonRecord = {
  id: string;
  name: string;
};

export type PlayerListPhase = "SUMMER" | "WINTER";
export type PlayerListVersionStatus = "PREVIEWED" | "APPLIED" | "SUPERSEDED";

export type PlayerListVersionRecord = {
  id: string;
  seasonId: string;
  phase: PlayerListPhase;
  versionNumber: number;
  status: PlayerListVersionStatus;
  filename: string;
  importedAt: Date;
  appliedAt?: Date;
  countsJson: Prisma.JsonValue;
  ignoredColumnsJson: Prisma.JsonValue;
  deltaJson: Prisma.JsonValue;
  note?: string;
  createdBy?: string;
};

export type PlayerUpsertRecord = Omit<PlayerRecord, "id"> & {
  id?: string;
};

export type PlayerImportAuditInput = {
  workbookName: string;
  workbookPath?: string;
  imported: number;
  updated: number;
  unchanged: number;
  departures: number;
  errors: number;
  durationMs: number;
  summary: Prisma.InputJsonValue;
};

export type ApplyPlayerImportInput = {
  upserts: readonly PlayerUpsertRecord[];
  departures: readonly { id: string; status: PlayerStatus }[];
  audit: PlayerImportAuditInput;
  version?: PlayerListVersionApplyInput;
};

export type ApplyPlayerImportResult = {
  playerListVersionNumber?: number;
};

export type PlayerListVersionApplyInput = {
  seasonId: string;
  phase: PlayerListPhase;
  filename: string;
  countsJson: Prisma.InputJsonValue;
  ignoredColumnsJson: Prisma.InputJsonValue;
  deltaJson: Prisma.InputJsonValue;
  note?: string;
  createdBy?: string;
};

export interface PlayerRepository {
  applyImport(input: ApplyPlayerImportInput): Promise<ApplyPlayerImportResult>;
  bulkStatusUpdate(
    input: readonly { id: string; status: PlayerStatus }[],
  ): Promise<void>;
  bulkUpsert(input: readonly PlayerUpsertRecord[]): Promise<void>;
  findByDisplayNameAndClub(
    displayName: string,
    bundesligaClub: string,
  ): Promise<PlayerRecord | null>;
  findByKickerId(kickerId: string): Promise<PlayerRecord | null>;
  loadActiveSeason(): Promise<PlayerMasterSeasonRecord | null>;
  loadLatestPlayerListVersion(
    seasonId: string,
    phase: PlayerListPhase,
  ): Promise<PlayerListVersionRecord | null>;
  loadPlayers(): Promise<readonly PlayerRecord[] | null>;
  loadTransferMarketPlayers(input: {
    seasonId: string;
    phase: PlayerListPhase;
    includeLeftBundesliga?: boolean;
  }): Promise<readonly PlayerRecord[] | null>;
  loadSeasons(): Promise<readonly PlayerMasterSeasonRecord[] | null>;
}

export class PrismaPlayerRepository implements PlayerRepository {
  private readonly prisma = getPrismaClient();

  async findByKickerId(kickerId: string): Promise<PlayerRecord | null> {
    if (!this.prisma) {
      return null;
    }

    try {
      const player = await this.prisma.player.findFirst({
        where: { kickerId },
      });

      return player ? mapPrismaPlayer(player) : null;
    } catch {
      return null;
    }
  }

  async findByDisplayNameAndClub(
    displayName: string,
    bundesligaClub: string,
  ): Promise<PlayerRecord | null> {
    if (!this.prisma) {
      return null;
    }

    try {
      const player = await this.prisma.player.findFirst({
        where: {
          displayName,
          bundesligaClub,
        },
      });

      return player ? mapPrismaPlayer(player) : null;
    } catch {
      return null;
    }
  }

  async loadActiveSeason(): Promise<PlayerMasterSeasonRecord | null> {
    if (!this.prisma) {
      return null;
    }

    try {
      const season = await this.prisma.season.findFirst({
        where: { status: "ACTIVE" },
        orderBy: { yearStart: "desc" },
        select: {
          id: true,
          name: true,
        },
      });

      return season;
    } catch {
      return null;
    }
  }

  async loadSeasons(): Promise<readonly PlayerMasterSeasonRecord[] | null> {
    if (!this.prisma) {
      return null;
    }

    try {
      return await this.prisma.season.findMany({
        orderBy: { yearStart: "desc" },
        select: {
          id: true,
          name: true,
        },
      });
    } catch {
      return null;
    }
  }

  async loadLatestPlayerListVersion(
    seasonId: string,
    phase: PlayerListPhase,
  ): Promise<PlayerListVersionRecord | null> {
    if (!this.prisma) {
      return null;
    }

    try {
      const version = await this.prisma.playerListVersion.findFirst({
        where: {
          seasonId,
          phase,
          status: "APPLIED",
        },
        orderBy: { versionNumber: "desc" },
      });

      return version ? mapPrismaPlayerListVersion(version) : null;
    } catch {
      return null;
    }
  }

  async loadPlayers(): Promise<readonly PlayerRecord[] | null> {
    if (!this.prisma) {
      return null;
    }

    try {
      const players = await this.prisma.player.findMany({
        orderBy: [
          { positionGroup: "asc" },
          { bundesligaClub: "asc" },
          { displayName: "asc" },
        ],
      });

      return players.map(mapPrismaPlayer);
    } catch {
      return null;
    }
  }

  async loadTransferMarketPlayers(input: {
    seasonId: string;
    phase: PlayerListPhase;
    includeLeftBundesliga?: boolean;
  }): Promise<readonly PlayerRecord[] | null> {
    if (!this.prisma) {
      return null;
    }

    try {
      const activeVersion = await this.prisma.playerListVersion.findFirst({
        where: {
          seasonId: input.seasonId,
          phase: input.phase,
          status: "APPLIED",
        },
        orderBy: { versionNumber: "desc" },
        select: { id: true },
      });

      if (!activeVersion) {
        return [];
      }

      const players = await this.prisma.player.findMany({
        where: input.includeLeftBundesliga
          ? undefined
          : { status: { not: "LEFT_BUNDESLIGA" } },
        orderBy: [
          { positionGroup: "asc" },
          { bundesligaClub: "asc" },
          { displayName: "asc" },
        ],
      });

      return players.map(mapPrismaPlayer);
    } catch {
      return null;
    }
  }

  async bulkUpsert(input: readonly PlayerUpsertRecord[]): Promise<void> {
    if (!this.prisma) {
      throw new Error("Prisma Player Master is not available.");
    }

    await this.prisma.$transaction(
      async (tx) => {
        await bulkUpsertPlayersByIdentity(tx, input);
      },
      createPlayerImportTransactionOptions(),
    );
  }

  async bulkStatusUpdate(
    input: readonly { id: string; status: PlayerStatus }[],
  ): Promise<void> {
    if (!this.prisma) {
      throw new Error("Prisma Player Master is not available.");
    }

    await this.prisma.$transaction(
      async (tx) => {
        await bulkUpdatePlayerStatus(tx, input);
      },
      createPlayerImportTransactionOptions(),
    );
  }

  async applyImport(input: ApplyPlayerImportInput): Promise<ApplyPlayerImportResult> {
    if (!this.prisma) {
      throw new Error("Prisma Player Master is not available.");
    }

    const result = await this.prisma.$transaction(
      async (tx) => {
        await bulkWritePlayerImportChanges(tx, input.upserts);
        await bulkUpdatePlayerStatus(tx, input.departures);
        let playerListVersionNumber: number | undefined;
        if (input.version) {
          playerListVersionNumber = await activatePlayerListVersion(
            tx,
            input.version,
          );
        }
        await tx.playerImportAudit.create({
          data: {
            workbookName: input.audit.workbookName,
            workbookPath: input.audit.workbookPath,
            imported: input.audit.imported,
            updated: input.audit.updated,
            unchanged: input.audit.unchanged,
            departures: input.audit.departures,
            errors: input.audit.errors,
            durationMs: input.audit.durationMs,
            summaryJson: input.audit.summary,
          },
        });

        return { playerListVersionNumber };
      },
      createPlayerImportTransactionOptions(),
    );

    return result;
  }
}

function createPlayerImportTransactionOptions() {
  return {
    maxWait: 10_000,
    timeout: 60_000,
  };
}

type PlayerTransactionClient = Parameters<
  Parameters<PrismaClient["$transaction"]>[0]
>[0];

async function bulkUpsertPlayersByIdentity(
  tx: PlayerTransactionClient,
  input: readonly PlayerUpsertRecord[],
) {
  for (const player of input) {
    const data = {
      displayName: player.displayName,
      positionGroup: player.positionGroup,
      bundesligaClub: player.bundesligaClub,
      marketValue: player.marketValue,
      status: player.status,
    };

    await tx.player.upsert({
      where: {
        displayName: player.displayName,
      },
      create: data,
      update: data,
    });
  }
}

async function bulkWritePlayerImportChanges(
  tx: PlayerTransactionClient,
  input: readonly PlayerUpsertRecord[],
) {
  const createPlayers = input.filter((player) => !player.id);
  const updatePlayers = input.filter((player) => player.id);

  if (createPlayers.length > 0) {
    await tx.player.createMany({
      data: createPlayers.map((player) => ({
        displayName: player.displayName,
        positionGroup: player.positionGroup,
        bundesligaClub: player.bundesligaClub,
        marketValue: player.marketValue,
        status: player.status,
      })),
    });
  }

  for (const player of updatePlayers) {
    await tx.player.update({
      where: { id: player.id },
      data: {
        displayName: player.displayName,
        positionGroup: player.positionGroup,
        bundesligaClub: player.bundesligaClub,
        marketValue: player.marketValue,
        status: player.status,
      },
    });
  }
}

async function bulkUpdatePlayerStatus(
  tx: PlayerTransactionClient,
  input: readonly { id: string; status: PlayerStatus }[],
) {
  const leftBundesligaPlayerIds = input
    .filter((player) => player.status === "LEFT_BUNDESLIGA")
    .map((player) => player.id);

  if (leftBundesligaPlayerIds.length > 0) {
    await tx.player.updateMany({
      where: {
        id: { in: leftBundesligaPlayerIds },
      },
      data: { status: "LEFT_BUNDESLIGA" },
    });
  }

  for (const player of input.filter(
    (item) => item.status !== "LEFT_BUNDESLIGA",
  )) {
    await tx.player.update({
      where: { id: player.id },
      data: { status: player.status },
    });
  }
}

async function activatePlayerListVersion(
  tx: PlayerTransactionClient,
  input: PlayerListVersionApplyInput,
): Promise<number> {
  const latestVersion = await tx.playerListVersion.findFirst({
    where: {
      seasonId: input.seasonId,
      phase: input.phase,
    },
    orderBy: { versionNumber: "desc" },
    select: { versionNumber: true },
  });
  const versionNumber = (latestVersion?.versionNumber ?? 0) + 1;

  await tx.playerListVersion.updateMany({
    where: {
      seasonId: input.seasonId,
      phase: input.phase,
      status: "APPLIED",
    },
    data: { status: "SUPERSEDED" },
  });

  await tx.playerListVersion.create({
    data: {
      seasonId: input.seasonId,
      phase: input.phase,
      versionNumber,
      status: "APPLIED",
      filename: input.filename,
      appliedAt: new Date(),
      countsJson: input.countsJson,
      ignoredColumnsJson: input.ignoredColumnsJson,
      deltaJson: input.deltaJson,
      note: input.note,
      createdBy: input.createdBy,
    },
  });

  return versionNumber;
}

function mapPrismaPlayerListVersion(version: {
  id: string;
  seasonId: string;
  phase: PlayerListPhase;
  versionNumber: number;
  status: PlayerListVersionStatus;
  filename: string;
  importedAt: Date;
  appliedAt: Date | null;
  countsJson: Prisma.JsonValue;
  ignoredColumnsJson: Prisma.JsonValue;
  deltaJson: Prisma.JsonValue;
  note: string | null;
  createdBy: string | null;
}): PlayerListVersionRecord {
  return {
    id: version.id,
    seasonId: version.seasonId,
    phase: version.phase,
    versionNumber: version.versionNumber,
    status: version.status,
    filename: version.filename,
    importedAt: version.importedAt,
    appliedAt: version.appliedAt ?? undefined,
    countsJson: version.countsJson,
    ignoredColumnsJson: version.ignoredColumnsJson,
    deltaJson: version.deltaJson,
    note: version.note ?? undefined,
    createdBy: version.createdBy ?? undefined,
  };
}

function mapPrismaPlayer(player: {
  id: string;
  kickerId: string | null;
  firstName: string | null;
  lastName: string | null;
  displayName: string;
  positionGroup: PlayerPositionGroup;
  bundesligaClub: string;
  marketValue: number;
  status: PlayerStatus;
}): PlayerRecord {
  return {
    id: player.id,
    kickerId: player.kickerId ?? undefined,
    firstName: player.firstName ?? undefined,
    lastName: player.lastName ?? undefined,
    displayName: player.displayName,
    positionGroup: player.positionGroup,
    bundesligaClub: player.bundesligaClub,
    marketValue: player.marketValue,
    status: player.status,
  };
}

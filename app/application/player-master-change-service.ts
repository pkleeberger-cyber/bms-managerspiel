import { revalidatePath } from "next/cache";
import type { PlayerMasterChangeType, PlayerStatus, PositionGroup } from "@prisma/client";

import { getPrismaClient } from "@/infrastructure/prisma";

export type PlayerMasterChangeAffectedAssignment = {
  managerSeasonId: string;
  managerName: string;
  playerId: string;
  playerName: string;
  positionGroup: PositionGroup;
  slotId: number;
  validFromMatchday: number;
  validToMatchday: number | null;
};

export type PlayerMasterChangeWarning = {
  managerSeasonId: string;
  managerName: string;
  message: string;
  tone: "warning" | "danger";
};

export type PlayerMasterDraftChange = {
  id: string;
  playerId: string;
  playerName: string;
  type: PlayerMasterChangeType;
  oldValue: string;
  newValue: string;
  reason: string;
  affectedAssignments: readonly PlayerMasterChangeAffectedAssignment[];
  warnings: readonly PlayerMasterChangeWarning[];
};

export type PlayerMasterOperationsSnapshot = {
  latestOfficiallyClosedMatchday: number;
  estimatedEffectiveFromMatchday: number;
  batch: {
    id: string;
    status: "DRAFT" | "RELEASED" | "VOIDED";
  };
  draftChanges: readonly PlayerMasterDraftChange[];
  draftPlayerIds: readonly string[];
};

type Context = {
  season: { id: string; name: string };
  competition: { id: string };
};

const officialClosedStatuses = [
  "OFFICIALLY_CLOSED",
  "PUBLISHED_OFFICIAL",
  "ARCHIVED",
] as const;

export class PlayerMasterChangeService {
  private readonly prisma = getPrismaClient();

  async loadOperationsSnapshot(): Promise<PlayerMasterOperationsSnapshot> {
    const context = await this.loadContext();
    const batch = await this.ensureDraftBatch(context);
    const latestOfficiallyClosedMatchday =
      await this.loadLatestOfficiallyClosedMatchday(context);
    const estimatedEffectiveFromMatchday = latestOfficiallyClosedMatchday + 1;
    const changes = await this.prisma!.playerMasterChange.findMany({
      where: {
        batchId: batch.id,
        status: "DRAFT",
      },
      include: { player: true },
      orderBy: { createdAt: "asc" },
    });
    const affectedByPlayerId = await this.loadAffectedAssignmentsByPlayerId(
      changes.map((change) => change.playerId),
      estimatedEffectiveFromMatchday,
    );

    return {
      latestOfficiallyClosedMatchday,
      estimatedEffectiveFromMatchday,
      batch: {
        id: batch.id,
        status: batch.status,
      },
      draftChanges: changes.map((change) => {
        const affectedAssignments = affectedByPlayerId.get(change.playerId) ?? [];

        return {
          id: change.id,
          playerId: change.playerId,
          playerName: change.player.displayName,
          type: change.type,
          oldValue: formatChangeValue(change, "old"),
          newValue: formatChangeValue(change, "new"),
          reason: change.reason,
          affectedAssignments,
          warnings: createWarnings(change, affectedAssignments),
        };
      }),
      draftPlayerIds: changes.map((change) => change.playerId),
    };
  }

  async createDraftChange(formData: FormData): Promise<void> {
    const context = await this.loadContext();
    const batch = await this.ensureDraftBatch(context);
    const playerId = readRequiredString(formData, "playerId");
    const type = readRequiredString(formData, "type") as PlayerMasterChangeType;
    const reason = readRequiredString(formData, "reason");
    const player = await this.prisma!.player.findUnique({ where: { id: playerId } });

    if (!player) {
      throw new Error("Spieler nicht gefunden.");
    }

    await this.prisma!.playerMasterChange.create({
      data: createDraftChangeData({
        batchId: batch.id,
        formData,
        player,
        reason,
        type,
      }),
    });

    revalidatePlayerMasterPaths();
  }

  async voidDraftChange(formData: FormData): Promise<void> {
    const changeId = readRequiredString(formData, "changeId");

    await this.prisma!.playerMasterChange.update({
      where: { id: changeId },
      data: { status: "VOIDED" },
    });

    revalidatePlayerMasterPaths();
  }

  async releaseDraftBatch(formData: FormData): Promise<void> {
    const context = await this.loadContext();
    const batchId = readRequiredString(formData, "batchId");
    const note = readOptionalString(formData, "note");
    const batch = await this.prisma!.playerMasterChangeBatch.findUnique({
      where: { id: batchId },
      include: { changes: { include: { player: true } } },
    });

    if (!batch || batch.status !== "DRAFT") {
      throw new Error("Kein freigabefähiger Player-Master-Draft gefunden.");
    }

    const draftChanges = batch.changes.filter((change) => change.status === "DRAFT");

    if (draftChanges.length === 0) {
      throw new Error("Keine Player-Master-Änderungen im Draft.");
    }

    const latestOfficiallyClosedMatchday =
      await this.loadLatestOfficiallyClosedMatchday(context);
    const effectiveFromMatchday = latestOfficiallyClosedMatchday + 1;
    const affectedByPlayerId = await this.loadAffectedAssignmentsByPlayerId(
      draftChanges.map((change) => change.playerId),
      effectiveFromMatchday,
    );

    await this.prisma!.$transaction(async (tx) => {
      await tx.playerMasterChangeBatch.update({
        where: { id: batch.id },
        data: {
          effectiveFromMatchday,
          note,
          releasedAt: new Date(),
          status: "RELEASED",
        },
      });

      let departureBatchId: string | null = null;

      for (const change of draftChanges) {
        const affectedAssignments = affectedByPlayerId.get(change.playerId) ?? [];

        await tx.player.update({
          where: { id: change.playerId },
          data: createPlayerUpdateData(change),
        });

        await tx.playerMasterChange.update({
          where: { id: change.id },
          data: {
            impactWarningsJson: createWarnings(change, affectedAssignments),
            releasedAt: new Date(),
            status: "ACTIVE",
          },
        });

        if (change.newStatus === "LEFT_BUNDESLIGA") {
          if (!departureBatchId) {
            const departureBatch = await tx.playerDepartureBatch.create({
              data: {
                effectiveFromMatchday,
                note,
                phaseLabel: "Player Master",
                releasedAt: new Date(),
                seasonId: context.season.id,
                status: "RELEASED",
              },
            });

            departureBatchId = departureBatch.id;
          }

          const departureEvent = await tx.playerDepartureEvent.create({
            data: {
              batchId: departureBatchId,
              playerId: change.playerId,
              reason: change.reason,
              releasedAt: new Date(),
              status: "ACTIVE",
            },
          });

          for (const assignment of affectedAssignments) {
            const existingOpenTransfer = await tx.managerMandatoryTransfer.findFirst({
              where: {
                managerSeasonId: assignment.managerSeasonId,
                outgoingPlayerId: assignment.playerId,
                slotId: assignment.slotId,
                status: "OPEN",
              },
              select: { id: true },
            });

            if (existingOpenTransfer) {
              await tx.managerMandatoryTransfer.update({
                where: { id: existingOpenTransfer.id },
                data: { effectiveFromMatchday },
              });
              continue;
            }

            await tx.managerMandatoryTransfer.create({
              data: {
                effectiveFromMatchday,
                managerSeasonId: assignment.managerSeasonId,
                outgoingPlayerId: assignment.playerId,
                playerDepartureEventId: departureEvent.id,
                positionGroup: assignment.positionGroup,
                slotId: assignment.slotId,
                status: "OPEN",
              },
            });
          }
        }
      }
    });

    revalidatePlayerMasterPaths();
  }

  private async loadContext(): Promise<Context> {
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
      competition: { id: competition.id },
    };
  }

  private async ensureDraftBatch(context: Context) {
    const existing = await this.prisma!.playerMasterChangeBatch.findFirst({
      where: {
        seasonId: context.season.id,
        status: "DRAFT",
      },
      orderBy: { createdAt: "desc" },
    });

    if (existing) {
      return existing;
    }

    return this.prisma!.playerMasterChangeBatch.create({
      data: {
        seasonId: context.season.id,
        status: "DRAFT",
      },
    });
  }

  private async loadLatestOfficiallyClosedMatchday(context: Context) {
    const lifecycle = await this.prisma!.matchdayLifecycle.findFirst({
      where: {
        competitionId: context.competition.id,
        status: { in: [...officialClosedStatuses] },
      },
      orderBy: { matchday: "desc" },
      select: { matchday: true },
    });

    return lifecycle?.matchday ?? 0;
  }

  private async loadAffectedAssignmentsByPlayerId(
    playerIds: readonly string[],
    effectiveFromMatchday: number,
  ) {
    const affectedByPlayerId = new Map<string, PlayerMasterChangeAffectedAssignment[]>();

    if (playerIds.length === 0) {
      return affectedByPlayerId;
    }

    const assignments = await this.prisma!.squadAssignment.findMany({
      where: {
        playerId: { in: [...playerIds] },
        validFromMatchday: { lte: effectiveFromMatchday },
        OR: [
          { validToMatchday: null },
          { validToMatchday: { gte: effectiveFromMatchday } },
        ],
      },
      include: {
        managerSeason: { include: { manager: true } },
        player: true,
      },
      orderBy: [{ managerSeasonId: "asc" }, { slotId: "asc" }],
    });

    for (const assignment of assignments) {
      if (!assignment.managerSeason) {
        continue;
      }

      const affectedAssignment = {
        managerSeasonId: assignment.managerSeason.id,
        managerName: assignment.managerSeason.manager.displayName,
        playerId: assignment.playerId,
        playerName: assignment.player.displayName,
        positionGroup: assignment.player.positionGroup,
        slotId: assignment.slotId,
        validFromMatchday: assignment.validFromMatchday,
        validToMatchday: assignment.validToMatchday,
      };

      affectedByPlayerId.set(assignment.playerId, [
        ...(affectedByPlayerId.get(assignment.playerId) ?? []),
        affectedAssignment,
      ]);
    }

    return affectedByPlayerId;
  }
}

export async function loadPlayerMasterOperationsSnapshot() {
  return new PlayerMasterChangeService().loadOperationsSnapshot();
}

export async function createPlayerMasterDraftChange(formData: FormData) {
  return new PlayerMasterChangeService().createDraftChange(formData);
}

export async function voidPlayerMasterDraftChange(formData: FormData) {
  return new PlayerMasterChangeService().voidDraftChange(formData);
}

export async function releasePlayerMasterDraftBatch(formData: FormData) {
  return new PlayerMasterChangeService().releaseDraftBatch(formData);
}

function createDraftChangeData(input: {
  batchId: string;
  formData: FormData;
  player: {
    bundesligaClub: string;
    id: string;
    marketValue: number;
    positionGroup: PositionGroup;
    status: PlayerStatus;
  };
  reason: string;
  type: PlayerMasterChangeType;
}) {
  const base = {
    batchId: input.batchId,
    playerId: input.player.id,
    reason: input.reason,
    status: "DRAFT" as const,
    type: input.type,
  };

  if (input.type === "STATUS_CHANGE") {
    return {
      ...base,
      oldStatus: input.player.status,
      newStatus: readRequiredString(input.formData, "newStatus") as PlayerStatus,
    };
  }

  if (input.type === "CLUB_CHANGE") {
    return {
      ...base,
      oldClub: input.player.bundesligaClub,
      newClub: readRequiredString(input.formData, "newClub"),
    };
  }

  if (input.type === "MARKET_VALUE_CHANGE") {
    return {
      ...base,
      oldMarketValue: input.player.marketValue,
      newMarketValue: readRequiredNumber(input.formData, "newMarketValue"),
    };
  }

  return {
    ...base,
    oldPositionGroup: input.player.positionGroup,
    newPositionGroup: readRequiredString(
      input.formData,
      "newPositionGroup",
    ) as PositionGroup,
  };
}

function createPlayerUpdateData(change: {
  newClub: string | null;
  newMarketValue: number | null;
  newPositionGroup: PositionGroup | null;
  newStatus: PlayerStatus | null;
  type: PlayerMasterChangeType;
}) {
  if (change.type === "STATUS_CHANGE") {
    return { status: change.newStatus ?? undefined };
  }

  if (change.type === "CLUB_CHANGE") {
    return { bundesligaClub: change.newClub ?? undefined };
  }

  if (change.type === "MARKET_VALUE_CHANGE") {
    return { marketValue: change.newMarketValue ?? undefined };
  }

  return { positionGroup: change.newPositionGroup ?? undefined };
}

function createWarnings(
  change: {
    newClub: string | null;
    newPositionGroup: PositionGroup | null;
    newStatus: PlayerStatus | null;
    type: PlayerMasterChangeType;
  },
  affectedAssignments: readonly PlayerMasterChangeAffectedAssignment[],
): readonly PlayerMasterChangeWarning[] {
  if (change.type === "STATUS_CHANGE" && change.newStatus === "LEFT_BUNDESLIGA") {
    return affectedAssignments.map((assignment) => ({
      managerSeasonId: assignment.managerSeasonId,
      managerName: assignment.managerName,
      message: "Bundesliga-Abgang erzeugt Pflichttransfer.",
      tone: "danger" as const,
    }));
  }

  if (change.type === "CLUB_CHANGE") {
    return affectedAssignments.map((assignment) => ({
      managerSeasonId: assignment.managerSeasonId,
      managerName: assignment.managerName,
      message: `Vereinswechsel zu ${change.newClub ?? "neuem Verein"} kann das 3-Spieler-Club-Limit berühren.`,
      tone: "warning" as const,
    }));
  }

  if (change.type === "POSITION_CHANGE") {
    return affectedAssignments.map((assignment) => ({
      managerSeasonId: assignment.managerSeasonId,
      managerName: assignment.managerName,
      message: `Positionswechsel zu ${change.newPositionGroup ?? "neuer Position"} kann die Kaderstruktur berühren.`,
      tone: "warning" as const,
    }));
  }

  if (change.type === "MARKET_VALUE_CHANGE" && affectedAssignments.length > 0) {
    return [
      {
        managerSeasonId: affectedAssignments[0].managerSeasonId,
        managerName: "Transfermarkt",
        message: "Marktwertänderung beeinflusst Budget- und Kaufpreis-Anzeigen.",
        tone: "warning" as const,
      },
    ];
  }

  return [];
}

function formatChangeValue(
  change: {
    oldClub: string | null;
    oldMarketValue: number | null;
    oldPositionGroup: PositionGroup | null;
    oldStatus: PlayerStatus | null;
    newClub: string | null;
    newMarketValue: number | null;
    newPositionGroup: PositionGroup | null;
    newStatus: PlayerStatus | null;
    type: PlayerMasterChangeType;
  },
  side: "old" | "new",
) {
  if (change.type === "STATUS_CHANGE") {
    return side === "old" ? change.oldStatus ?? "-" : change.newStatus ?? "-";
  }

  if (change.type === "CLUB_CHANGE") {
    return side === "old" ? change.oldClub ?? "-" : change.newClub ?? "-";
  }

  if (change.type === "MARKET_VALUE_CHANGE") {
    const value = side === "old" ? change.oldMarketValue : change.newMarketValue;

    return typeof value === "number" ? `${value.toLocaleString("de-DE")} Mio.` : "-";
  }

  return side === "old"
    ? change.oldPositionGroup ?? "-"
    : change.newPositionGroup ?? "-";
}

function readRequiredString(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${key} fehlt.`);
  }

  return value.trim();
}

function readRequiredNumber(formData: FormData, key: string) {
  const value = Number(readRequiredString(formData, key).replace(",", "."));

  if (!Number.isFinite(value)) {
    throw new Error(`${key} ist keine gueltige Zahl.`);
  }

  return value;
}

function readOptionalString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" && value.trim() !== ""
    ? value.trim()
    : undefined;
}

function revalidatePlayerMasterPaths() {
  for (const path of [
    "/admin",
    "/admin/players",
    "/admin/transfers/departures",
    "/team/transfers",
    "/team/transfers/workspace",
  ]) {
    try {
      revalidatePath(path);
    } catch {
      // CLI validation has no Next.js static generation store.
    }
  }
}

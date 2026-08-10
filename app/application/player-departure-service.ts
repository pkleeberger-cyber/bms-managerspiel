import { revalidatePath } from "next/cache";
import type { PositionGroup } from "@prisma/client";

import { getPrismaClient } from "@/infrastructure/prisma";

export type DeparturePlayerOption = {
  id: string;
  displayName: string;
  club: string;
  positionGroup: PositionGroup;
  status: string;
};

export type DepartureDraftEvent = {
  id: string;
  playerId: string;
  playerName: string;
  club: string;
  positionGroup: PositionGroup;
  reason: string;
  status: "DRAFT" | "ACTIVE" | "VOIDED";
};

export type DepartureAffectedAssignment = {
  managerSeasonId: string;
  managerName: string;
  playerId: string;
  playerName: string;
  positionGroup: PositionGroup;
  slotId: number;
  validFromMatchday: number;
  validToMatchday: number | null;
};

export type DepartureAdminSnapshot = {
  seasonId: string;
  seasonName: string;
  batch: {
    id: string;
    status: "DRAFT" | "RELEASED" | "VOIDED";
    phaseLabel: string | null;
    note: string | null;
    effectiveFromMatchday: number | null;
  };
  latestOfficiallyClosedMatchday: number;
  estimatedEffectiveFromMatchday: number;
  playerOptions: readonly DeparturePlayerOption[];
  draftEvents: readonly DepartureDraftEvent[];
  affectedAssignments: readonly DepartureAffectedAssignment[];
};

export type MandatoryTransferRecord = {
  id: string;
  managerSeasonId: string;
  outgoingPlayerId: string;
  outgoingPlayerName: string;
  club: string;
  positionGroup: PositionGroup;
  slotId: number;
  effectiveFromMatchday: number;
  reason: string;
};

type DepartureContext = {
  season: { id: string; name: string };
  competition: { id: string };
};

const officialClosedStatuses = [
  "OFFICIALLY_CLOSED",
  "PUBLISHED_OFFICIAL",
  "ARCHIVED",
] as const;

export class PlayerDepartureService {
  private readonly prisma = getPrismaClient();

  async loadAdminSnapshot(): Promise<DepartureAdminSnapshot> {
    const context = await this.loadContext();
    const batch = await this.ensureDraftBatch(context);
    const events = await this.loadBatchEvents(batch.id);
    const latestOfficiallyClosedMatchday =
      await this.loadLatestOfficiallyClosedMatchday(context);
    const estimatedEffectiveFromMatchday = latestOfficiallyClosedMatchday + 1;
    const [playerOptions, affectedAssignments] = await Promise.all([
      this.loadPlayerOptions(),
      this.loadAffectedAssignments(
        events.map((event) => event.playerId),
        estimatedEffectiveFromMatchday,
      ),
    ]);

    return {
      seasonId: context.season.id,
      seasonName: context.season.name,
      batch: {
        id: batch.id,
        status: batch.status,
        phaseLabel: batch.phaseLabel,
        note: batch.note,
        effectiveFromMatchday: batch.effectiveFromMatchday,
      },
      latestOfficiallyClosedMatchday,
      estimatedEffectiveFromMatchday,
      playerOptions,
      draftEvents: events.map((event) => ({
        id: event.id,
        playerId: event.playerId,
        playerName: event.player.displayName,
        club: event.player.bundesligaClub,
        positionGroup: event.player.positionGroup,
        reason: event.reason,
        status: event.status,
      })),
      affectedAssignments,
    };
  }

  async addDraftEvent(formData: FormData): Promise<void> {
    const context = await this.loadContext();
    const batch = await this.ensureDraftBatch(context);
    const playerId = readRequiredString(formData, "playerId");
    const reason = readRequiredString(formData, "reason");

    const existing = await this.prisma!.playerDepartureEvent.findFirst({
      where: {
        batchId: batch.id,
        playerId,
        status: "DRAFT",
      },
    });

    if (existing) {
      await this.prisma!.playerDepartureEvent.update({
        where: { id: existing.id },
        data: { reason },
      });
    } else {
      await this.prisma!.playerDepartureEvent.create({
        data: {
          batchId: batch.id,
          playerId,
          reason,
          status: "DRAFT",
        },
      });
    }

    revalidateDeparturePaths();
  }

  async voidDraftEvent(formData: FormData): Promise<void> {
    const eventId = readRequiredString(formData, "eventId");

    await this.prisma!.playerDepartureEvent.update({
      where: { id: eventId },
      data: { status: "VOIDED" },
    });

    revalidateDeparturePaths();
  }

  async releaseDraftBatch(formData: FormData): Promise<void> {
    const context = await this.loadContext();
    const batchId = readRequiredString(formData, "batchId");
    const note = readOptionalString(formData, "note");
    const phaseLabel = readOptionalString(formData, "phaseLabel");
    const batch = await this.prisma!.playerDepartureBatch.findUnique({
      where: { id: batchId },
      include: { events: { include: { player: true } } },
    });

    if (!batch || batch.status !== "DRAFT") {
      throw new Error("Kein freigabefähiger Draft-Batch gefunden.");
    }

    const draftEvents = batch.events.filter((event) => event.status === "DRAFT");

    if (draftEvents.length === 0) {
      throw new Error("Keine Abgangsänderungen im Draft.");
    }

    const latestOfficiallyClosedMatchday =
      await this.loadLatestOfficiallyClosedMatchday(context);
    const effectiveFromMatchday = latestOfficiallyClosedMatchday + 1;
    const affectedAssignments = await this.loadAffectedAssignments(
      draftEvents.map((event) => event.playerId),
      effectiveFromMatchday,
    );
    const affectedByPlayerId = new Map<string, DepartureAffectedAssignment[]>();

    for (const assignment of affectedAssignments) {
      affectedByPlayerId.set(assignment.playerId, [
        ...(affectedByPlayerId.get(assignment.playerId) ?? []),
        assignment,
      ]);
    }

    await this.prisma!.$transaction(async (tx) => {
      await tx.playerDepartureBatch.update({
        where: { id: batch.id },
        data: {
          status: "RELEASED",
          releasedAt: new Date(),
          effectiveFromMatchday,
          note,
          phaseLabel,
        },
      });

      await tx.playerDepartureEvent.updateMany({
        where: {
          batchId: batch.id,
          status: "DRAFT",
        },
        data: {
          status: "ACTIVE",
          releasedAt: new Date(),
        },
      });

      await tx.player.updateMany({
        where: { id: { in: draftEvents.map((event) => event.playerId) } },
        data: { status: "LEFT_BUNDESLIGA" },
      });

      for (const event of draftEvents) {
        const assignments = affectedByPlayerId.get(event.playerId) ?? [];

        for (const assignment of assignments) {
          await tx.managerMandatoryTransfer.upsert({
            where: {
              managerSeasonId_playerDepartureEventId_slotId: {
                managerSeasonId: assignment.managerSeasonId,
                playerDepartureEventId: event.id,
                slotId: assignment.slotId,
              },
            },
            update: {
              status: "OPEN",
              effectiveFromMatchday,
            },
            create: {
              managerSeasonId: assignment.managerSeasonId,
              playerDepartureEventId: event.id,
              outgoingPlayerId: assignment.playerId,
              positionGroup: assignment.positionGroup,
              slotId: assignment.slotId,
              effectiveFromMatchday,
              status: "OPEN",
            },
          });
        }
      }
    });

    revalidateDeparturePaths();
  }

  async loadOpenMandatoryTransfers(
    managerSeasonId?: string | null,
  ): Promise<readonly MandatoryTransferRecord[]> {
    if (!managerSeasonId || !this.prisma) {
      return [];
    }

    const transfers = await this.prisma.managerMandatoryTransfer.findMany({
      where: {
        managerSeasonId,
        status: "OPEN",
      },
      include: {
        outgoingPlayer: true,
        playerDepartureEvent: true,
      },
      orderBy: [{ effectiveFromMatchday: "asc" }, { slotId: "asc" }],
    });

    return transfers.map((transfer) => ({
      id: transfer.id,
      managerSeasonId: transfer.managerSeasonId,
      outgoingPlayerId: transfer.outgoingPlayerId,
      outgoingPlayerName: transfer.outgoingPlayer.displayName,
      club: transfer.outgoingPlayer.bundesligaClub,
      positionGroup: transfer.positionGroup,
      slotId: transfer.slotId,
      effectiveFromMatchday: transfer.effectiveFromMatchday,
      reason: transfer.playerDepartureEvent.reason,
    }));
  }

  async completeMandatoryTransfer(input: {
    mandatoryTransferId: string;
    incomingPlayerId: string;
    managerSeasonId?: string;
  }): Promise<void> {
    if (!this.prisma) {
      throw new Error("Prisma ist nicht verfügbar.");
    }

    const transfer = await this.prisma.managerMandatoryTransfer.findUnique({
      where: { id: input.mandatoryTransferId },
      include: {
        managerSeason: true,
        outgoingPlayer: true,
      },
    });

    if (!transfer || transfer.status !== "OPEN") {
      throw new Error("Pflichttransfer ist nicht offen.");
    }

    if (
      input.managerSeasonId &&
      transfer.managerSeasonId !== input.managerSeasonId
    ) {
      throw new Error("Pflichttransfer gehört nicht zum ausgewählten Manager.");
    }

    const incomingPlayer = await this.prisma.player.findUnique({
      where: { id: input.incomingPlayerId },
    });

    if (!incomingPlayer || incomingPlayer.positionGroup !== transfer.positionGroup) {
      throw new Error("Ersatzspieler muss dieselbe Position haben.");
    }

    if (incomingPlayer.status === "LEFT_BUNDESLIGA") {
      throw new Error("Ersatzspieler darf kein Bundesliga-Abgang sein.");
    }

    const existingIncomingAssignment = await this.prisma.squadAssignment.findFirst({
      where: {
        managerSeasonId: transfer.managerSeasonId,
        playerId: incomingPlayer.id,
        validFromMatchday: { lte: transfer.effectiveFromMatchday },
        OR: [
          { validToMatchday: null },
          { validToMatchday: { gte: transfer.effectiveFromMatchday } },
        ],
      },
      select: { id: true },
    });

    if (existingIncomingAssignment) {
      throw new Error("Ersatzspieler ist bereits im Managerkader.");
    }

    const currentAssignment = await this.prisma.squadAssignment.findFirst({
      where: {
        managerSeasonId: transfer.managerSeasonId,
        playerId: transfer.outgoingPlayerId,
        slotId: transfer.slotId,
        validFromMatchday: { lte: transfer.effectiveFromMatchday },
        OR: [
          { validToMatchday: null },
          { validToMatchday: { gte: transfer.effectiveFromMatchday } },
        ],
      },
      orderBy: { validFromMatchday: "desc" },
    });

    if (!currentAssignment) {
      throw new Error("Aktuelle SquadAssignment für Pflichttransfer fehlt.");
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.squadAssignment.update({
        where: { id: currentAssignment.id },
        data: { validToMatchday: transfer.effectiveFromMatchday - 1 },
      });
      await tx.squadAssignment.create({
        data: {
          teamId: currentAssignment.teamId,
          managerSeasonId: currentAssignment.managerSeasonId,
          playerId: incomingPlayer.id,
          slotId: currentAssignment.slotId,
          validFromMatchday: transfer.effectiveFromMatchday,
          validToMatchday: null,
          reason: "REAL_TRANSFER_REPLACEMENT",
        },
      });
      await tx.managerMandatoryTransfer.update({
        where: { id: transfer.id },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
        },
      });
    });

    revalidateDeparturePaths();
  }

  private async loadContext(): Promise<DepartureContext> {
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

  private async ensureDraftBatch(context: DepartureContext) {
    const existing = await this.prisma!.playerDepartureBatch.findFirst({
      where: {
        seasonId: context.season.id,
        status: "DRAFT",
      },
      orderBy: { createdAt: "desc" },
    });

    if (existing) {
      return existing;
    }

    return this.prisma!.playerDepartureBatch.create({
      data: {
        seasonId: context.season.id,
        status: "DRAFT",
      },
    });
  }

  private async loadBatchEvents(batchId: string) {
    return this.prisma!.playerDepartureEvent.findMany({
      where: {
        batchId,
        status: "DRAFT",
      },
      include: { player: true },
      orderBy: { createdAt: "asc" },
    });
  }

  private async loadPlayerOptions() {
    const players = await this.prisma!.player.findMany({
      orderBy: [
        { positionGroup: "asc" },
        { bundesligaClub: "asc" },
        { displayName: "asc" },
      ],
    });

    return players.map((player) => ({
      id: player.id,
      displayName: player.displayName,
      club: player.bundesligaClub,
      positionGroup: player.positionGroup,
      status: player.status,
    }));
  }

  private async loadLatestOfficiallyClosedMatchday(context: DepartureContext) {
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

  private async loadAffectedAssignments(
    playerIds: readonly string[],
    effectiveFromMatchday: number,
  ): Promise<readonly DepartureAffectedAssignment[]> {
    if (playerIds.length === 0) {
      return [];
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

    return assignments.flatMap((assignment) => {
      if (!assignment.managerSeason) {
        return [];
      }

      return {
        managerSeasonId: assignment.managerSeason.id,
        managerName: assignment.managerSeason.manager.displayName,
        playerId: assignment.playerId,
        playerName: assignment.player.displayName,
        positionGroup: assignment.player.positionGroup,
        slotId: assignment.slotId,
        validFromMatchday: assignment.validFromMatchday,
        validToMatchday: assignment.validToMatchday,
      };
    });
  }
}

export async function loadPlayerDepartureAdminSnapshot() {
  return new PlayerDepartureService().loadAdminSnapshot();
}

export async function addPlayerDepartureDraftEvent(formData: FormData) {
  return new PlayerDepartureService().addDraftEvent(formData);
}

export async function voidPlayerDepartureDraftEvent(formData: FormData) {
  return new PlayerDepartureService().voidDraftEvent(formData);
}

export async function releasePlayerDepartureDraftBatch(formData: FormData) {
  return new PlayerDepartureService().releaseDraftBatch(formData);
}

export async function loadOpenMandatoryTransfers(managerSeasonId?: string | null) {
  return new PlayerDepartureService().loadOpenMandatoryTransfers(managerSeasonId);
}

export async function completeManagerMandatoryTransfer(input: {
  mandatoryTransferId: string;
  incomingPlayerId: string;
  managerSeasonId?: string;
}) {
  return new PlayerDepartureService().completeMandatoryTransfer(input);
}

function readRequiredString(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${key} fehlt.`);
  }

  return value.trim();
}

function readOptionalString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" && value.trim() !== ""
    ? value.trim()
    : undefined;
}

function revalidateDeparturePaths() {
  for (const path of [
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

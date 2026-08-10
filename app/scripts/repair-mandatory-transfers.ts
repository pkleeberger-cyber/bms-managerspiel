import path from "node:path";

import { PrismaClient } from "@prisma/client";
import { config } from "dotenv";

config({ path: path.resolve(process.cwd(), ".env.local") });
config();

process.env.DATABASE_URL ??= process.env.MONGODB_URI ?? process.env.MONGDODB_URI;

const prisma = new PrismaClient();

type MissingMandatoryTransfer = {
  assignmentId: string;
  effectiveFromMatchday: number;
  eventId: string;
  managerName: string;
  managerSeasonId: string;
  playerId: string;
  playerName: string;
  positionGroup: "TW" | "AB" | "MF" | "ST";
  slotId: number;
};

async function repairMandatoryTransfers() {
  const playerQuery = readStringArg("--player");
  const apply = process.argv.includes("--apply");

  if (!playerQuery) {
    throw new Error('Missing required argument: --player "Openda"');
  }

  const players = await prisma.player.findMany({
    where: {
      displayName: { contains: playerQuery, mode: "insensitive" },
    },
    orderBy: { displayName: "asc" },
  });

  if (players.length === 0) {
    console.log(`No player found for "${playerQuery}".`);
    return;
  }

  console.log(`Mandatory transfer repair (${apply ? "apply" : "dry-run"})`);

  for (const player of players) {
    const diagnosis = await diagnosePlayer(player.id);

    console.log(`\n${player.displayName}`);
    console.log(`- playerId: ${player.id}`);
    console.log(`- status: ${player.status}`);
    console.log(`- departure events: ${diagnosis.eventCount}`);
    console.log(`- affected assignments: ${diagnosis.affectedAssignmentCount}`);
    console.log(`- existing open mandatory transfers: ${diagnosis.existingOpenCount}`);
    console.log(`- missing mandatory transfers: ${diagnosis.missing.length}`);

    for (const missing of diagnosis.missing) {
      console.log(
        `  - ${missing.managerName}, slot ${missing.slotId}, ST ${missing.effectiveFromMatchday}`,
      );
    }

    if (!apply || diagnosis.missing.length === 0) {
      continue;
    }

    for (const missing of diagnosis.missing) {
      const existing = await prisma.managerMandatoryTransfer.findFirst({
        where: {
          managerSeasonId: missing.managerSeasonId,
          outgoingPlayerId: missing.playerId,
          slotId: missing.slotId,
          status: "OPEN",
        },
        select: { id: true },
      });

      if (existing) {
        continue;
      }

      await prisma.managerMandatoryTransfer.create({
        data: {
          effectiveFromMatchday: missing.effectiveFromMatchday,
          managerSeasonId: missing.managerSeasonId,
          outgoingPlayerId: missing.playerId,
          playerDepartureEventId: missing.eventId,
          positionGroup: missing.positionGroup,
          slotId: missing.slotId,
          status: "OPEN",
        },
      });
    }

    console.log(`  created: ${diagnosis.missing.length}`);
  }
}

async function diagnosePlayer(playerId: string) {
  const events = await prisma.playerDepartureEvent.findMany({
    where: {
      playerId,
      status: "ACTIVE",
      batch: {
        status: "RELEASED",
      },
    },
    include: { batch: true, player: true },
    orderBy: [{ releasedAt: "desc" }, { createdAt: "desc" }],
  });
  const primaryEvent = events.find((event) => event.batch.effectiveFromMatchday !== null);

  if (!primaryEvent || primaryEvent.batch.effectiveFromMatchday === null) {
    return {
      affectedAssignmentCount: 0,
      eventCount: events.length,
      existingOpenCount: 0,
      missing: [] as MissingMandatoryTransfer[],
    };
  }

  const effectiveFromMatchday = primaryEvent.batch.effectiveFromMatchday;
  const assignments = await prisma.squadAssignment.findMany({
    where: {
      playerId,
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
  const existingOpenTransfers = await prisma.managerMandatoryTransfer.findMany({
    where: {
      outgoingPlayerId: playerId,
      status: "OPEN",
    },
    select: {
      managerSeasonId: true,
      slotId: true,
    },
  });
  const existingKeys = new Set(
    existingOpenTransfers.map(
      (transfer) => `${transfer.managerSeasonId}:${transfer.slotId}`,
    ),
  );
  const missing = assignments.flatMap((assignment) => {
    if (!assignment.managerSeasonId || !assignment.managerSeason) {
      return [];
    }

    if (existingKeys.has(`${assignment.managerSeasonId}:${assignment.slotId}`)) {
      return [];
    }

    return {
      assignmentId: assignment.id,
      effectiveFromMatchday,
      eventId: primaryEvent.id,
      managerName: assignment.managerSeason.manager.displayName,
      managerSeasonId: assignment.managerSeasonId,
      playerId: assignment.playerId,
      playerName: assignment.player.displayName,
      positionGroup: assignment.player.positionGroup,
      slotId: assignment.slotId,
    };
  });

  return {
    affectedAssignmentCount: assignments.filter((assignment) => assignment.managerSeasonId).length,
    eventCount: events.length,
    existingOpenCount: existingOpenTransfers.length,
    missing,
  };
}

function readStringArg(name: string) {
  const prefix = `${name}=`;
  const inline = process.argv.find((argument) => argument.startsWith(prefix));

  if (inline) {
    return inline.slice(prefix.length);
  }

  const index = process.argv.indexOf(name);

  if (index >= 0) {
    return process.argv[index + 1] ?? null;
  }

  return null;
}

void repairMandatoryTransfers()
  .catch((error) => {
    console.error("Mandatory transfer repair failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

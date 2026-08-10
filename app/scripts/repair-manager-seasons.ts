import path from "node:path";

import { config } from "dotenv";

import { getPrismaClient } from "../infrastructure/prisma";

config({ path: path.resolve(process.cwd(), ".env.local") });
config();

async function repairManagerSeasons() {
  const apply = process.argv.includes("--apply");
  const prisma = getPrismaClient();

  if (!prisma) {
    console.log(
      "ManagerSeason repair skipped: Prisma is not configured. Set DATABASE_URL or MONGODB_URI.",
    );
    return;
  }

  try {
    const managerSeasons = await prisma.managerSeason.findMany({
      orderBy: [{ seasonId: "asc" }, { league: "asc" }, { createdAt: "asc" }],
    });
    const managerIds = [...new Set(managerSeasons.map((item) => item.managerId))];
    const managers = await prisma.manager.findMany({
      where: { id: { in: managerIds } },
      select: { id: true },
    });
    const existingManagerIds = new Set(managers.map((manager) => manager.id));
    const orphaned = managerSeasons.filter(
      (managerSeason) => !existingManagerIds.has(managerSeason.managerId),
    );

    console.log(
      `ManagerSeason repair ${apply ? "apply" : "dry-run"}: ${orphaned.length} orphaned records found.`,
    );

    for (const item of orphaned) {
      console.log(
        `- ${item.id} season=${item.seasonId} manager=${item.managerId} league=${item.league} status=${item.status}`,
      );
    }

    if (!apply) {
      console.log("No records removed. Run npm run repair:manager-seasons -- --apply to delete orphans.");
      return;
    }

    if (orphaned.length === 0) {
      console.log("No repair needed.");
      return;
    }

    const result = await prisma.managerSeason.deleteMany({
      where: { id: { in: orphaned.map((item) => item.id) } },
    });

    console.log(`Removed ${result.count} orphaned ManagerSeason records.`);
  } finally {
    await prisma.$disconnect();
  }
}

void repairManagerSeasons().catch((error) => {
  console.error("ManagerSeason repair failed", error);
  process.exitCode = 1;
});

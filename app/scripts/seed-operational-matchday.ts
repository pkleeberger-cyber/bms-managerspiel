import path from "node:path";

import { config } from "dotenv";

import { getPrismaClient } from "../infrastructure/prisma";

type SeedRecord = {
  id: string;
};

type SeedVersionRecord = SeedRecord & {
  versionNumber: number;
};

type SeedPrismaClient = {
  season: {
    upsert(args: unknown): Promise<SeedRecord & { name: string }>;
  };
  competition: {
    upsert(args: unknown): Promise<SeedRecord & { name: string }>;
  };
  matchdayLifecycle: {
    upsert(args: unknown): Promise<SeedRecord>;
    update(args: unknown): Promise<SeedRecord>;
  };
  matchdayVersion: {
    upsert(args: unknown): Promise<SeedVersionRecord>;
  };
  $disconnect(): Promise<void>;
};

config({ path: path.resolve(process.cwd(), ".env.local") });
config();

const operationalMatchdaySeed = {
  season: {
    name: "2026/27",
    yearStart: 2026,
    yearEnd: 2027,
    status: "ACTIVE",
  },
  competition: {
    type: "LEAGUE_1",
    name: "Erste Liga",
    status: "ACTIVE",
  },
  matchday: 18,
  status: "PUBLISHED_PRELIMINARY",
  currentVersionNumber: 3,
  versions: [
    {
      versionNumber: 1,
      status: "CALCULATED",
      reason: "Erstberechnung",
      publishedAt: null,
    },
    {
      versionNumber: 2,
      status: "PUBLISHED_PRELIMINARY",
      reason: "Vorläufig veröffentlicht",
      publishedAt: new Date("2027-01-18T09:30:00.000Z"),
    },
    {
      versionNumber: 3,
      status: "PUBLISHED_PRELIMINARY",
      reason: "Strafe ergänzt",
      publishedAt: new Date("2027-01-18T12:55:00.000Z"),
    },
  ],
} as const;

async function seedOperationalMatchday() {
  const prisma = getPrismaClient() as SeedPrismaClient | null;

  if (!prisma) {
    console.info(
      [
        "Operational matchday seed skipped.",
        "No MongoDB connection string is configured.",
        "Configure DATABASE_URL or MONGODB_URI, then run npm run seed:operational-matchday again.",
        "Fixture fallback remains unaffected.",
      ].join(" "),
    );
    return;
  }

  try {
    const seededAt = new Date();
    const season = await prisma.season.upsert({
      where: {
        yearStart_yearEnd: {
          yearStart: operationalMatchdaySeed.season.yearStart,
          yearEnd: operationalMatchdaySeed.season.yearEnd,
        },
      },
      update: {
        name: operationalMatchdaySeed.season.name,
        status: operationalMatchdaySeed.season.status,
      },
      create: operationalMatchdaySeed.season,
    });

    const competition = await prisma.competition.upsert({
      where: {
        seasonId_type_name: {
          seasonId: season.id,
          type: operationalMatchdaySeed.competition.type,
          name: operationalMatchdaySeed.competition.name,
        },
      },
      update: {
        status: operationalMatchdaySeed.competition.status,
      },
      create: {
        seasonId: season.id,
        ...operationalMatchdaySeed.competition,
      },
    });

    const lifecycle = await prisma.matchdayLifecycle.upsert({
      where: {
        competitionId_matchday: {
          competitionId: competition.id,
          matchday: operationalMatchdaySeed.matchday,
        },
      },
      update: {
        seasonId: season.id,
        status: operationalMatchdaySeed.status,
        lastCalculationAt: seededAt,
        lastPublishedAt: seededAt,
        correctionPending: false,
        correctionReason: null,
        correctionPlanJson: null,
      },
      create: {
        seasonId: season.id,
        competitionId: competition.id,
        matchday: operationalMatchdaySeed.matchday,
        status: operationalMatchdaySeed.status,
        lastCalculationAt: seededAt,
        lastPublishedAt: seededAt,
        correctionPending: false,
      },
    });

    const versions = await Promise.all(
      operationalMatchdaySeed.versions.map((version) =>
        prisma.matchdayVersion.upsert({
          where: {
            competitionId_matchday_versionNumber: {
              competitionId: competition.id,
              matchday: operationalMatchdaySeed.matchday,
              versionNumber: version.versionNumber,
            },
          },
          update: {
            lifecycleId: lifecycle.id,
            seasonId: season.id,
            status: version.status,
            reason: version.reason,
            publishedAt: version.publishedAt,
          },
          create: {
            lifecycleId: lifecycle.id,
            seasonId: season.id,
            competitionId: competition.id,
            matchday: operationalMatchdaySeed.matchday,
            versionNumber: version.versionNumber,
            status: version.status,
            reason: version.reason,
            publishedAt: version.publishedAt,
          },
        }),
      ),
    );

    const currentVersion = versions.find(
      (version) => version.versionNumber === operationalMatchdaySeed.currentVersionNumber,
    );

    if (!currentVersion) {
      throw new Error("Operational matchday seed could not resolve current version 3.");
    }

    await prisma.matchdayLifecycle.update({
      where: { id: lifecycle.id },
      data: {
        latestVersionId: currentVersion.id,
      },
    });

    console.info(
      `Operational matchday seed complete: ${season.name}, ${competition.name}, Spieltag ${operationalMatchdaySeed.matchday}, Version ${operationalMatchdaySeed.currentVersionNumber}.`,
    );
  } catch (error) {
    console.info(
      [
        "Operational matchday seed skipped because Prisma could not reach the configured database.",
        error instanceof Error ? error.message : String(error),
        "Fixture fallback remains unaffected.",
      ].join(" "),
    );
  } finally {
    await prisma.$disconnect().catch(() => undefined);
  }
}

void seedOperationalMatchday();

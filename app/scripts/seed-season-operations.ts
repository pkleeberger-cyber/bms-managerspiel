import path from "node:path";

import { config } from "dotenv";

import {
  createCompetitionLifecycleSnapshot,
} from "../domain/competition-lifecycle";
import type {
  CompetitionLifecycleStatus,
  CompetitionLifecycleTimelineEntry,
  CompetitionType,
} from "../domain/competition-lifecycle";
import { getPrismaClient } from "../infrastructure/prisma";

type SeedRecord = {
  id: string;
};

type SeedCompetitionRecord = SeedRecord & {
  name: string;
  type: CompetitionType;
};

type SeedPrismaClient = {
  season: {
    upsert(args: unknown): Promise<SeedRecord & { name: string }>;
  };
  competition: {
    upsert(args: unknown): Promise<SeedCompetitionRecord>;
  };
  competitionLifecycle: {
    upsert(args: unknown): Promise<SeedRecord>;
  };
  $disconnect(): Promise<void>;
};

type CompetitionSeed = {
  type: CompetitionType;
  name: string;
  competitionStatus: "ACTIVE";
  lifecycleStatus: CompetitionLifecycleStatus;
  timelineEntries: readonly CompetitionLifecycleTimelineEntry[];
};

config({ path: path.resolve(process.cwd(), ".env.local") });
config();

const seasonOperationsSeed = {
  season: {
    name: "2026/27",
    yearStart: 2026,
    yearEnd: 2027,
    status: "ACTIVE",
  },
  competitions: [
    {
      type: "LEAGUE_1",
      name: "Erste Liga",
      competitionStatus: "ACTIVE",
      lifecycleStatus: "READY",
      timelineEntries: [
        {
          time: "08:20",
          action: "CREATE_SEASON",
          user: "admin:league-office",
          description: "Neue Saison angelegt",
        },
        {
          time: "08:44",
          action: "CONFIRM_PARTICIPANTS",
          user: "admin:league-office",
          description: "Erste Liga Teilnehmer bestätigt",
        },
        {
          time: "09:05",
          action: "GENERATE_FIXTURE",
          user: "admin:league-office",
          description: "Erste Liga Spielplan erzeugt",
        },
      ],
    },
    {
      type: "LEAGUE_2",
      name: "Zweite Liga",
      competitionStatus: "ACTIVE",
      lifecycleStatus: "FIXTURE_GENERATED",
      timelineEntries: [
        {
          time: "08:51",
          action: "CONFIRM_PARTICIPANTS",
          user: "admin:league-office",
          description: "Zweite Liga Teilnehmer bestätigt",
        },
        {
          time: "09:11",
          action: "GENERATE_FIXTURE",
          user: "admin:league-office",
          description: "Zweite Liga Spielplan erzeugt",
        },
      ],
    },
    {
      type: "CUP",
      name: "Pokal",
      competitionStatus: "ACTIVE",
      lifecycleStatus: "DRAW_REQUIRED",
      timelineEntries: [
        {
          time: "09:18",
          action: "WAIT_FOR_DRAW",
          user: "admin:league-office",
          description: "Pokal-Auslosung ausstehend",
        },
      ],
    },
    {
      type: "EUROPE",
      name: "Europapokal",
      competitionStatus: "ACTIVE",
      lifecycleStatus: "PARTICIPANTS_REQUIRED",
      timelineEntries: [
        {
          time: "09:27",
          action: "CREATE_COMPETITION",
          user: "admin:league-office",
          description: "Europapokal angelegt",
        },
        {
          time: "09:31",
          action: "WAIT_FOR_PARTICIPANTS",
          user: "admin:league-office",
          description: "Europapokal Teilnehmer ausstehend",
        },
      ],
    },
    {
      type: "SUPERCUP",
      name: "Supercup",
      competitionStatus: "ACTIVE",
      lifecycleStatus: "READY",
      timelineEntries: [
        {
          time: "09:42",
          action: "GENERATE_SUPERCUP_FIXTURE",
          user: "admin:league-office",
          description: "Supercup-Spiel vorbereitet",
        },
        {
          time: "09:48",
          action: "MARK_READY",
          user: "admin:league-office",
          description: "Supercup bereit zur Freigabe",
        },
      ],
    },
  ] satisfies readonly CompetitionSeed[],
} as const;

async function seedSeasonOperations() {
  const prisma = getPrismaClient() as SeedPrismaClient | null;

  if (!prisma) {
    console.info(
      [
        "Season operations seed skipped.",
        "No MongoDB connection string is configured.",
        "Configure DATABASE_URL or MONGODB_URI, then run npm run seed:season again.",
        "Fixture fallback remains unaffected.",
      ].join(" "),
    );
    return;
  }

  try {
    const season = await prisma.season.upsert({
      where: {
        yearStart_yearEnd: {
          yearStart: seasonOperationsSeed.season.yearStart,
          yearEnd: seasonOperationsSeed.season.yearEnd,
        },
      },
      update: {
        name: seasonOperationsSeed.season.name,
        status: seasonOperationsSeed.season.status,
      },
      create: seasonOperationsSeed.season,
    });

    const seededCompetitions = await Promise.all(
      seasonOperationsSeed.competitions.map(async (competitionSeed) => {
        const competition = await prisma.competition.upsert({
          where: {
            seasonId_type_name: {
              seasonId: season.id,
              type: competitionSeed.type,
              name: competitionSeed.name,
            },
          },
          update: {
            status: competitionSeed.competitionStatus,
          },
          create: {
            seasonId: season.id,
            type: competitionSeed.type,
            name: competitionSeed.name,
            status: competitionSeed.competitionStatus,
          },
        });

        const lifecycle = createCompetitionLifecycleSnapshot({
          competitionId: competition.id,
          competitionType: competition.type,
          status: competitionSeed.lifecycleStatus,
          timelineEntries: competitionSeed.timelineEntries,
        });

        await prisma.competitionLifecycle.upsert({
          where: {
            competitionId: competition.id,
          },
          update: {
            status: lifecycle.status,
            progressPercent: lifecycle.progressPercent,
            availableActionsJson: lifecycle.availableActions,
            completedActionsJson: lifecycle.completedActions,
            nextRecommendedAction: lifecycle.nextRecommendedAction,
            timelineEntriesJson: lifecycle.timelineEntries,
          },
          create: {
            competitionId: competition.id,
            status: lifecycle.status,
            progressPercent: lifecycle.progressPercent,
            availableActionsJson: lifecycle.availableActions,
            completedActionsJson: lifecycle.completedActions,
            nextRecommendedAction: lifecycle.nextRecommendedAction,
            timelineEntriesJson: lifecycle.timelineEntries,
          },
        });

        return competition;
      }),
    );

    console.info(
      `Season operations seed complete: ${season.name}, ${seededCompetitions.length} competitions with lifecycle snapshots.`,
    );
  } catch (error) {
    console.info(
      [
        "Season operations seed skipped because Prisma could not reach the configured database.",
        error instanceof Error ? error.message : String(error),
        "Fixture fallback remains unaffected.",
      ].join(" "),
    );
  } finally {
    await prisma.$disconnect().catch(() => undefined);
  }
}

void seedSeasonOperations();

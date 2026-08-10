import type { OperationalMatchdayLifecycleSnapshot } from "@/domain/matchday-lifecycle";
import { loadNextScheduledMatchday } from "./living-fixtures-service";
import {
  FixtureMatchdayRepository,
  PrismaMatchdayRepository,
} from "@/infrastructure";
import type { MatchdayRepository } from "@/infrastructure";

export type MatchdayLifecycleDataSource = "DATABASE" | "FIXTURE";

export type MatchdayOperationsLifecycleResult = {
  dataSource: MatchdayLifecycleDataSource;
  lifecycle: OperationalMatchdayLifecycleSnapshot;
};

export class MatchdayOperationsService {
  constructor(
    private readonly matchdayRepository: MatchdayRepository = new PrismaMatchdayRepository(),
    private readonly fallbackRepository: MatchdayRepository = new FixtureMatchdayRepository(),
  ) {}

  async loadCurrentLifecycle(): Promise<MatchdayOperationsLifecycleResult> {
    const snapshot = await this.matchdayRepository.loadCurrentMatchday();

    if (snapshot) {
      console.info(
        `[MatchdayOperationsService] Repository -> Prisma -> Lifecycle found -> Loaded version ${snapshot.currentVersion.versionNumber} -> Returned to UI`,
      );

      return {
        dataSource: "DATABASE",
        lifecycle: snapshot,
      };
    }

    const scheduledMatchday = await loadNextScheduledMatchday();

    if (scheduledMatchday.matchday) {
      return {
        dataSource: "DATABASE",
        lifecycle: createScheduledMatchdayLifecycle(scheduledMatchday.matchday),
      };
    }

    const fallbackSnapshot = await this.fallbackRepository.loadCurrentMatchday();

    if (!fallbackSnapshot) {
      throw new Error("No matchday lifecycle snapshot available.");
    }

    console.info(
      `[MatchdayOperationsService] Repository -> Fixture -> Lifecycle found -> Loaded version ${fallbackSnapshot.currentVersion.versionNumber} -> Returned to UI`,
    );

    return {
      dataSource: "FIXTURE",
      lifecycle: fallbackSnapshot,
    };
  }
}

export async function loadCurrentMatchdayLifecycle() {
  const service = new MatchdayOperationsService();

  return service.loadCurrentLifecycle();
}

function createScheduledMatchdayLifecycle(input: {
  seasonId: string;
  seasonName: string;
  competitionId: string;
  competitionName: string;
  matchday: number;
  fixtures: number;
}): OperationalMatchdayLifecycleSnapshot {
  const createdAt = new Date(0).toISOString();

  return {
    seasonName: input.seasonName,
    competitionName: input.competitionName,
    matchday: input.matchday,
    currentStatus: "DRAFT",
    currentVersion: {
      id: `scheduled-${input.competitionId}-${input.matchday}`,
      seasonId: input.seasonId,
      competitionId: input.competitionId,
      matchday: input.matchday,
      versionNumber: 0,
      status: "DRAFT",
      createdAt,
      createdBy: "living-fixtures",
      reason: `${input.fixtures} geplante Fixtures aus Prisma. Noch keine Berechnung.`,
    },
    versions: [],
    versionHistory: [
      {
        versionNumber: 0,
        title: "Geplanter Spieltag",
        status: "DRAFT",
        createdAt,
        reason: "Aus dem importierten Liga-1-Spielplan abgeleitet.",
      },
    ],
    lastCalculationAt: undefined,
    lastPublishedAt: undefined,
    correctionPending: false,
  };
}

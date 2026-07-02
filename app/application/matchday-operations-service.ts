import type { OperationalMatchdayLifecycleSnapshot } from "@/domain/matchday-lifecycle";
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

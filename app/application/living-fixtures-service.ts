import { PrismaLivingFixtureRepository } from "@/infrastructure/living-fixture-repository";
import type {
  LivingCompetitionOverview,
  LivingFixtureRepository,
  LivingManagerFixture,
  LivingScheduledMatchday,
} from "@/infrastructure/living-fixture-repository";

export type LivingFixturesDataSource = "DATABASE" | "UNAVAILABLE";

export type LivingCompetitionFixturesResult = {
  dataSource: LivingFixturesDataSource;
  overview: LivingCompetitionOverview | null;
};

export type LivingManagerFixturesResult = {
  dataSource: LivingFixturesDataSource;
  fixtures: readonly LivingManagerFixture[];
};

export type LivingNextMatchdayResult = {
  dataSource: LivingFixturesDataSource;
  matchday: LivingScheduledMatchday | null;
};

export class LivingFixturesService {
  constructor(
    private readonly fixtureRepository: LivingFixtureRepository =
      new PrismaLivingFixtureRepository(),
  ) {}

  async loadLeagueOneOverview(
    matchday?: number,
  ): Promise<LivingCompetitionFixturesResult> {
    const overview = await this.fixtureRepository.loadCompetitionOverview(
      "LEAGUE_1",
      { matchday },
    );

    return {
      dataSource: overview ? "DATABASE" : "UNAVAILABLE",
      overview,
    };
  }

  async loadManagerFixtures(
    managerSeasonId?: string,
  ): Promise<LivingManagerFixturesResult> {
    if (!managerSeasonId) {
      return {
        dataSource: "UNAVAILABLE",
        fixtures: [],
      };
    }

    const fixtures =
      await this.fixtureRepository.loadManagerFixtures(managerSeasonId);

    return {
      dataSource: fixtures ? "DATABASE" : "UNAVAILABLE",
      fixtures: fixtures ?? [],
    };
  }

  async loadNextScheduledMatchday(): Promise<LivingNextMatchdayResult> {
    const matchday = await this.fixtureRepository.loadNextScheduledMatchday(
      "LEAGUE_1",
    );

    return {
      dataSource: matchday ? "DATABASE" : "UNAVAILABLE",
      matchday,
    };
  }
}

export async function loadLeagueOneFixtures(matchday?: number) {
  const service = new LivingFixturesService();

  return service.loadLeagueOneOverview(matchday);
}

export async function loadManagerFixtures(managerSeasonId?: string) {
  const service = new LivingFixturesService();

  return service.loadManagerFixtures(managerSeasonId);
}

export async function loadNextScheduledMatchday() {
  const service = new LivingFixturesService();

  return service.loadNextScheduledMatchday();
}

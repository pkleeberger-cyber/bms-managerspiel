import { competitionLifecycleFixture } from "@/domain/competition-lifecycle";
import type { CompetitionLifecycleSnapshot } from "@/domain/competition-lifecycle";
import {
  FixtureCompetitionRepository,
  PrismaCompetitionRepository,
  PrismaManagerSeasonRepository,
} from "@/infrastructure";
import type {
  CompetitionRepository,
  ManagerSeasonRepository,
  SeasonStatusRecord,
} from "@/infrastructure";

export type SeasonOperationsDataSource = "DATABASE" | "FIXTURE";

export type SeasonOperationsSnapshot = {
  activeSeason: SeasonStatusRecord;
  competitions: readonly CompetitionLifecycleSnapshot[];
  managerStats: SeasonManagerStats;
};

export type SeasonManagerStats = {
  totalManagers: number;
  activeParticipants: number;
  firstLeagueManagers: number;
  secondLeagueManagers: number;
};

export type SeasonOperationsResult = {
  dataSource: SeasonOperationsDataSource;
  snapshot: SeasonOperationsSnapshot;
};

export class SeasonOperationsService {
  constructor(
    private readonly competitionRepository: CompetitionRepository = new PrismaCompetitionRepository(),
    private readonly fallbackRepository: CompetitionRepository = new FixtureCompetitionRepository(),
    private readonly managerSeasonRepository: ManagerSeasonRepository =
      new PrismaManagerSeasonRepository(),
  ) {}

  async loadCurrentSeason(): Promise<SeasonOperationsResult> {
    const databaseSnapshot = await this.loadFromRepository(
      this.competitionRepository,
    );

    if (databaseSnapshot) {
      console.info("[SeasonOperationsService] Loaded Season from Prisma");

      return {
        dataSource: "DATABASE",
        snapshot: databaseSnapshot,
      };
    }

    const fixtureSnapshot = await this.loadFromRepository(this.fallbackRepository);

    if (!fixtureSnapshot) {
      throw new Error("No season operations snapshot available.");
    }

    console.info("[SeasonOperationsService] Fixture fallback used");

    return {
      dataSource: "FIXTURE",
      snapshot: fixtureSnapshot,
    };
  }

  private async loadFromRepository(
    repository: CompetitionRepository,
  ): Promise<SeasonOperationsSnapshot | null> {
    const activeSeason = await repository.loadActiveSeasonStatus();

    if (!activeSeason) {
      return null;
    }

    const competitions = await repository.loadActiveCompetitions(activeSeason.id);

    if (!competitions || competitions.length === 0) {
      return null;
    }

    const lifecycles = await Promise.all(
      competitions.map((competition) =>
        repository.loadCompetitionLifecycle(competition.id),
      ),
    );
    const competitionSnapshots = lifecycles.filter(
      (lifecycle): lifecycle is CompetitionLifecycleSnapshot => Boolean(lifecycle),
    );

    if (competitionSnapshots.length !== competitions.length) {
      return null;
    }

    const managerStats = await this.loadManagerStats(activeSeason.id);

    return {
      activeSeason,
      competitions: sortCompetitionSnapshots(competitionSnapshots),
      managerStats,
    };
  }

  private async loadManagerStats(seasonId: string): Promise<SeasonManagerStats> {
    const managerSeasons =
      await this.managerSeasonRepository.loadCurrentSeasonManagerSeasons(seasonId);

    if (!managerSeasons || managerSeasons.length === 0) {
      return emptyManagerStats;
    }

    return {
      totalManagers: managerSeasons.length,
      activeParticipants: managerSeasons.filter(
        (managerSeason) => managerSeason.participation === "ACTIVE",
      ).length,
      firstLeagueManagers: managerSeasons.filter(
        (managerSeason) =>
          managerSeason.league === "FIRST" &&
          managerSeason.participation === "ACTIVE",
      ).length,
      secondLeagueManagers: managerSeasons.filter(
        (managerSeason) =>
          managerSeason.league === "SECOND" &&
          managerSeason.participation === "ACTIVE",
      ).length,
    };
  }
}

export async function loadCurrentSeasonOperations() {
  const service = new SeasonOperationsService();

  return service.loadCurrentSeason();
}

function sortCompetitionSnapshots(
  snapshots: readonly CompetitionLifecycleSnapshot[],
): readonly CompetitionLifecycleSnapshot[] {
  const order = ["LEAGUE_1", "LEAGUE_2", "CUP", "EUROPE", "SUPERCUP"];

  return [...snapshots].sort(
    (a, b) =>
      order.indexOf(a.competitionType) - order.indexOf(b.competitionType),
  );
}

export const fixtureSeasonOperationsSnapshot: SeasonOperationsSnapshot = {
  activeSeason: {
    id: "season-2026-27",
    name: "2026/27",
    yearStart: 2026,
    yearEnd: 2027,
    status: "ACTIVE",
  },
  competitions: competitionLifecycleFixture,
  managerStats: {
    totalManagers: 0,
    activeParticipants: 0,
    firstLeagueManagers: 0,
    secondLeagueManagers: 0,
  },
};

const emptyManagerStats: SeasonManagerStats = {
  totalManagers: 0,
  activeParticipants: 0,
  firstLeagueManagers: 0,
  secondLeagueManagers: 0,
};

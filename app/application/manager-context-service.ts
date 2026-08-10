import {
  PrismaLivingFixtureRepository,
  PrismaManagerSeasonRepository,
  PrismaSquadRepository,
} from "@/infrastructure";
import type {
  LivingFixtureRepository,
  LivingManagerFixture,
  ManagerSeasonRecord,
  ManagerSeasonRepository,
  SquadRepository,
} from "@/infrastructure";

export type ManagerContextFixtureSummary = {
  matchday: number;
  opponent: string;
  venue: "HOME" | "AWAY";
  status: string;
} | null;

export type ManagerContextTeamSummary = {
  managerSeasonId: string;
  managerName: string;
  shortName: string;
  league: ManagerSeasonRecord["league"];
  status: ManagerSeasonRecord["status"];
  budget: number;
  seasonName: string;
  currentMatchday: number | null;
  teamValue: number | null;
  squadCount: number | null;
  nextFixture: ManagerContextFixtureSummary;
  lastFixture: ManagerContextFixtureSummary;
};

export type ManagerContextSnapshot = {
  activeManagerSeasons: readonly ManagerSeasonRecord[];
  selectedManagerSeason: ManagerSeasonRecord | null;
  selectedManagerSeasonId: string | null;
  teamSummaries: readonly ManagerContextTeamSummary[];
};

export class ManagerContextService {
  constructor(
    private readonly managerSeasonRepository: ManagerSeasonRepository =
      new PrismaManagerSeasonRepository(),
    private readonly squadRepository: SquadRepository = new PrismaSquadRepository(),
    private readonly fixtureRepository: LivingFixtureRepository =
      new PrismaLivingFixtureRepository(),
  ) {}

  async loadContext(
    selectedManagerSeasonId?: string,
  ): Promise<ManagerContextSnapshot> {
    const activeSeason = await this.managerSeasonRepository.loadActiveSeason();

    if (!activeSeason) {
      return emptyContext;
    }

    const managerSeasons =
      await this.managerSeasonRepository.loadCurrentSeasonManagerSeasons(
        activeSeason.id,
      );

    if (!managerSeasons || managerSeasons.length === 0) {
      return emptyContext;
    }

    const activeManagerSeasons = managerSeasons.filter(isActiveManagerSeason);
    const selectedManagerSeason =
      activeManagerSeasons.find(
        (managerSeason) => managerSeason.id === selectedManagerSeasonId,
      ) ?? activeManagerSeasons.at(0) ?? null;
    const teamSummaries = await Promise.all(
      activeManagerSeasons.map((managerSeason) =>
        this.loadTeamSummary(managerSeason, activeSeason.name),
      ),
    );

    return {
      activeManagerSeasons,
      selectedManagerSeason,
      selectedManagerSeasonId: selectedManagerSeason?.id ?? null,
      teamSummaries,
    };
  }

  private async loadTeamSummary(
    managerSeason: ManagerSeasonRecord,
    seasonName: string,
  ): Promise<ManagerContextTeamSummary> {
    const [squad, fixtures] = await Promise.all([
      this.squadRepository.loadCurrentSquad(managerSeason.id),
      this.fixtureRepository.loadManagerFixtures(managerSeason.id),
    ]);
    const nextFixture =
      fixtures?.find((fixture) => fixture.status === "SCHEDULED") ?? null;

    return {
      managerSeasonId: managerSeason.id,
      managerName: managerSeason.displayName,
      shortName: managerSeason.shortName,
      league: managerSeason.league,
      status: managerSeason.status,
      budget: managerSeason.budget,
      seasonName,
      currentMatchday: nextFixture?.matchday ?? fixtures?.at(0)?.matchday ?? null,
      teamValue: squad
        ? squad.reduce((sum, assignment) => sum + assignment.marketValue, 0)
        : null,
      squadCount: squad?.length ?? null,
      nextFixture: mapContextFixture(nextFixture),
      lastFixture: mapContextFixture(
        fixtures
          ?.slice()
          .reverse()
          .find((fixture) => fixture.status !== "SCHEDULED") ?? null,
      ),
    };
  }
}

export async function loadManagerContext(selectedManagerSeasonId?: string) {
  const service = new ManagerContextService();

  return service.loadContext(selectedManagerSeasonId);
}

const emptyContext: ManagerContextSnapshot = {
  activeManagerSeasons: [],
  selectedManagerSeason: null,
  selectedManagerSeasonId: null,
  teamSummaries: [],
};

function mapContextFixture(
  fixture: LivingManagerFixture | null,
): ManagerContextFixtureSummary {
  if (!fixture) {
    return null;
  }

  return {
    matchday: fixture.matchday,
    opponent: fixture.opponent.managerName,
    venue: fixture.venue,
    status: fixture.status,
  };
}

function isActiveManagerSeason(managerSeason: ManagerSeasonRecord): boolean {
  return (
    managerSeason.managerStatus === "ACTIVE" &&
    managerSeason.status === "ACTIVE" &&
    managerSeason.participation === "ACTIVE"
  );
}

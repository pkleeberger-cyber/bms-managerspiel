import {
  PrismaLivingFixtureRepository,
  PrismaManagerRepository,
  PrismaManagerSeasonRepository,
  PrismaSquadRepository,
  PrismaUserRepository,
} from "@/infrastructure";
import type {
  LivingFixtureRepository,
  LivingManagerFixture,
  ManagerRecord,
  ManagerRepository,
  ManagerLeagueLevel,
  ManagerSeasonHistoryRecord,
  ManagerSeasonRecord,
  ManagerSeasonRepository,
  ManagerSeasonStatus,
  HardDeleteManagerResult,
  OrphanedManagerSeasonRecord,
  SquadAssignmentRecord,
  SquadRepository,
  UserRepository,
} from "@/infrastructure";
import {
  loadOpenMandatoryTransfers,
  type MandatoryTransferRecord,
} from "./player-departure-service";

export type ManagerMasterDatabaseStatus = "CONNECTED" | "UNAVAILABLE";

export type CreateManagerCommand = {
  displayName: string;
  shortName: string;
  league: ManagerLeagueLevel;
  budget: number;
  status: ManagerSeasonStatus;
};

export type ManagerMasterSnapshot = {
  currentSeason: string;
  databaseStatus: ManagerMasterDatabaseStatus;
  managers: readonly ManagerSeasonRecord[];
  archivedManagers: readonly ManagerSeasonRecord[];
  verification: ManagerVerificationReport;
  managerCount: number;
  totalManagerCount: number;
  activeParticipants: number;
  firstLeagueCount: number;
  secondLeagueCount: number;
  leagues: readonly ManagerLeagueLevel[];
};

export type ManagerDetailSnapshot = {
  currentSeason: string;
  databaseStatus: ManagerMasterDatabaseStatus;
  manager: ManagerSeasonRecord;
  currentSquad: readonly SquadAssignmentRecord[];
  matchdaySquad: readonly SquadAssignmentRecord[];
  selectedMatchday: number;
  squadValue: number;
  openMandatoryTransfers: readonly MandatoryTransferRecord[];
  lastMatchday: {
    matchday: number;
    opponent: string;
    status: string;
    score: string | null;
  } | null;
  profile: ManagerProfileSnapshot;
};

export type ManagerProfileStatisticStatus = "READY" | "NOT_CALCULATED";

export type ManagerProfileStatistics = {
  status: ManagerProfileStatisticStatus;
  matches: number | null;
  wins: number | null;
  draws: number | null;
  losses: number | null;
  goalsFor: number | null;
  goalsAgainst: number | null;
  points: number | null;
  winPercentage: number | null;
};

export type ManagerProfileAchievement = {
  id: "champion" | "cupWinner" | "europeanChampion" | "superCup";
  label: string;
  value: number | null;
  status: "READY" | "NOT_CALCULATED";
};

export type ManagerProfileCareerSeason = {
  managerSeasonId: string;
  seasonName: string;
  league: ManagerLeagueLevel;
  status: ManagerSeasonStatus;
  participation: ManagerSeasonRecord["participation"];
  budget: number;
  squadValue: number | null;
  note: string | null;
};

export type ManagerProfileSnapshot = {
  identity: {
    managerSeasonId: string;
    managerId: string;
    name: string;
    shortName: string;
    league: ManagerLeagueLevel;
    status: ManagerSeasonStatus;
    managerStatus: ManagerSeasonRecord["managerStatus"];
    currentSeason: string;
    since: Date;
    titles: number | null;
    titlesStatus: "NOT_CALCULATED";
    squadValue: number;
    budget: number;
  };
  statistics: ManagerProfileStatistics;
  career: {
    seasons: readonly ManagerProfileCareerSeason[];
    leagueHistoryStatus: "READY" | "PARTIAL";
    titlesStatus: "NOT_CALCULATED";
    promotionsStatus: "NOT_CALCULATED";
    relegationsStatus: "NOT_CALCULATED";
  };
  achievements: readonly ManagerProfileAchievement[];
  currentTeam: {
    players: readonly SquadAssignmentRecord[];
    totalPlayers: number;
  };
  future: readonly {
    label: string;
    value: string;
  }[];
};

export type ManagerVerificationReport = {
  managersImported: number;
  activeManagers: number;
  pausedManagers: number;
  archivedManagers: number;
  missingSeasonAssignments: readonly ManagerRecord[];
  duplicateNames: readonly string[];
  orphanedManagerSeasons: readonly OrphanedManagerSeasonRecord[];
};

export class ManagerService {
  constructor(
    private readonly managerSeasonRepository: ManagerSeasonRepository =
      new PrismaManagerSeasonRepository(),
    private readonly managerRepository: ManagerRepository =
      new PrismaManagerRepository(),
    private readonly userRepository: UserRepository = new PrismaUserRepository(),
    private readonly squadRepository: SquadRepository = new PrismaSquadRepository(),
    private readonly fixtureRepository: LivingFixtureRepository =
      new PrismaLivingFixtureRepository(),
  ) {}

  async loadManagerMaster(): Promise<ManagerMasterSnapshot> {
    const activeSeason = await this.managerSeasonRepository.loadActiveSeason();

    if (!activeSeason) {
      return createUnavailableSnapshot("Keine aktive Saison");
    }

    const managerSeasonResult =
      await this.managerSeasonRepository.loadCurrentSeasonManagerSeasonsWithDiagnostics(
        activeSeason.id,
      );

    if (!managerSeasonResult) {
      return createUnavailableSnapshot(activeSeason.name);
    }
    const managers = managerSeasonResult.managerSeasons;
    const managerIdentities = await this.managerRepository.loadManagers();

    if (!managerIdentities) {
      return createUnavailableSnapshot(activeSeason.name);
    }
    const users = await this.userRepository.listUsers();
    const managersWithLinkedUsers = users
      ? attachLinkedUsers(managers, users)
      : managers;
    const activeManagers = managersWithLinkedUsers.filter(
      (manager) => !isArchivedManager(manager),
    );
    const archivedManagers = managersWithLinkedUsers.filter(isArchivedManager);
    const verification = createManagerVerificationReport(
      managerIdentities,
      managersWithLinkedUsers,
      managerSeasonResult.orphanedManagerSeasons,
    );

    return {
      currentSeason: activeSeason.name,
      databaseStatus: "CONNECTED",
      managers: activeManagers,
      archivedManagers,
      verification,
      managerCount: activeManagers.length,
      totalManagerCount: managersWithLinkedUsers.length,
      activeParticipants: activeManagers.filter(
        (manager) => manager.participation === "ACTIVE",
      ).length,
      firstLeagueCount: activeManagers.filter(
        (manager) => manager.league === "FIRST",
      ).length,
      secondLeagueCount: activeManagers.filter(
        (manager) => manager.league === "SECOND",
      ).length,
      leagues: ["FIRST", "SECOND"],
    };
  }

  async createManager(command: CreateManagerCommand): Promise<ManagerSeasonRecord> {
    return this.managerSeasonRepository.createManager({
      displayName: command.displayName.trim(),
      shortName: command.shortName.trim(),
      league: command.league,
      budget: command.budget,
      status: command.status,
    });
  }

  async archiveManager(managerId: string): Promise<void> {
    return this.managerSeasonRepository.archiveManager({ managerId });
  }

  async reactivateManager(managerId: string): Promise<void> {
    return this.managerSeasonRepository.reactivateManager({ managerId });
  }

  async hardDeleteManager(managerId: string): Promise<HardDeleteManagerResult> {
    return this.managerSeasonRepository.hardDeleteManager({ managerId });
  }

  async loadManagerDetail(input: {
    managerSeasonId: string;
    matchday?: number;
  }): Promise<ManagerDetailSnapshot | null> {
    const master = await this.loadManagerMaster();

    if (master.databaseStatus !== "CONNECTED") {
      return null;
    }

    const manager = [...master.managers, ...master.archivedManagers].find(
      (candidate) => candidate.id === input.managerSeasonId,
    );

    if (!manager) {
      return null;
    }

    const selectedMatchday = normalizeMatchday(input.matchday);
    const [currentSquad, matchdaySquad, mandatoryTransfers, fixtures] =
      await Promise.all([
        this.squadRepository.loadCurrentSquad(input.managerSeasonId),
        this.squadRepository.loadSquad({
          managerSeasonId: input.managerSeasonId,
          matchday: selectedMatchday,
        }),
        loadOpenMandatoryTransfers(input.managerSeasonId),
        this.fixtureRepository.loadManagerFixtures(input.managerSeasonId),
      ]);
    const seasonHistory =
      await this.managerSeasonRepository.loadManagerSeasonHistory(manager.managerId);
    const safeCurrentSquad = currentSquad ?? [];
    const lastFixture =
      (fixtures ?? [])
        .slice()
        .reverse()
        .find((fixture) => fixture.status !== "SCHEDULED" || fixture.result) ?? null;

    return {
      currentSeason: master.currentSeason,
      databaseStatus: "CONNECTED",
      manager,
      currentSquad: safeCurrentSquad,
      matchdaySquad: matchdaySquad ?? [],
      selectedMatchday,
      squadValue: safeCurrentSquad.reduce(
        (sum, assignment) => sum + assignment.marketValue,
        0,
      ),
      openMandatoryTransfers: mandatoryTransfers,
      lastMatchday: lastFixture
        ? {
            matchday: lastFixture.matchday,
            opponent: lastFixture.opponent.managerName,
            status: lastFixture.visibilityStatus,
            score: lastFixture.result
              ? lastFixture.venue === "HOME"
                ? `${lastFixture.result.officialHomeGoals}:${lastFixture.result.officialAwayGoals}`
                : `${lastFixture.result.officialAwayGoals}:${lastFixture.result.officialHomeGoals}`
              : null,
          }
        : null,
      profile: createManagerProfileSnapshot({
        currentSeason: master.currentSeason,
        currentSquad: safeCurrentSquad,
        fixtures: fixtures ?? [],
        manager,
        seasonHistory,
        squadValue: safeCurrentSquad.reduce(
          (sum, assignment) => sum + assignment.marketValue,
          0,
        ),
      }),
    };
  }

  async updateManagerSeasonBudget(input: {
    managerSeasonId: string;
    budget: number;
  }): Promise<void> {
    return this.managerSeasonRepository.updateBudget(input);
  }

  async assignManagerSeasonLeague(input: {
    managerSeasonId: string;
    league: ManagerLeagueLevel;
  }): Promise<void> {
    return this.managerSeasonRepository.assignLeague(input);
  }
}

export async function loadManagerMaster() {
  const service = new ManagerService();

  return service.loadManagerMaster();
}

export async function createManager(command: CreateManagerCommand) {
  const service = new ManagerService();

  return service.createManager(command);
}

export async function archiveManager(managerId: string) {
  const service = new ManagerService();

  return service.archiveManager(managerId);
}

export async function reactivateManager(managerId: string) {
  const service = new ManagerService();

  return service.reactivateManager(managerId);
}

export async function hardDeleteManager(managerId: string) {
  const service = new ManagerService();

  return service.hardDeleteManager(managerId);
}

export async function loadManagerDetail(input: {
  managerSeasonId: string;
  matchday?: number;
}) {
  const service = new ManagerService();

  return service.loadManagerDetail(input);
}

export async function updateManagerSeasonBudget(input: {
  managerSeasonId: string;
  budget: number;
}) {
  const service = new ManagerService();

  return service.updateManagerSeasonBudget(input);
}

export async function assignManagerSeasonLeague(input: {
  managerSeasonId: string;
  league: ManagerLeagueLevel;
}) {
  const service = new ManagerService();

  return service.assignManagerSeasonLeague(input);
}

function createUnavailableSnapshot(currentSeason: string): ManagerMasterSnapshot {
  return {
    currentSeason,
    databaseStatus: "UNAVAILABLE",
    managers: [],
    archivedManagers: [],
    verification: {
      managersImported: 0,
      activeManagers: 0,
      pausedManagers: 0,
      archivedManagers: 0,
      missingSeasonAssignments: [],
      duplicateNames: [],
      orphanedManagerSeasons: [],
    },
    managerCount: 0,
    totalManagerCount: 0,
    activeParticipants: 0,
    firstLeagueCount: 0,
    secondLeagueCount: 0,
    leagues: ["FIRST", "SECOND"],
  };
}

function createManagerVerificationReport(
  managerIdentities: readonly ManagerRecord[],
  managerSeasons: readonly ManagerSeasonRecord[],
  orphanedManagerSeasons: readonly OrphanedManagerSeasonRecord[],
): ManagerVerificationReport {
  const assignedManagerIds = new Set(
    managerSeasons.map((managerSeason) => managerSeason.managerId),
  );
  const activeManagerSeasons = managerSeasons.filter(
    (managerSeason) => !isArchivedManager(managerSeason),
  );
  const archivedManagerSeasons = managerSeasons.filter(isArchivedManager);

  return {
    managersImported: managerIdentities.length,
    activeManagers: activeManagerSeasons.filter(
      (managerSeason) =>
        managerSeason.managerStatus === "ACTIVE" &&
        managerSeason.status === "ACTIVE" &&
        managerSeason.participation === "ACTIVE",
    ).length,
    pausedManagers: activeManagerSeasons.filter(
      (managerSeason) =>
        managerSeason.managerStatus === "PAUSED" ||
        managerSeason.status === "PAUSED" ||
        managerSeason.participation === "PAUSED",
    ).length,
    archivedManagers: archivedManagerSeasons.length,
    missingSeasonAssignments: managerIdentities.filter(
      (manager) => !assignedManagerIds.has(manager.id),
    ),
    duplicateNames: findDuplicateNames(
      managerIdentities.map((manager) => manager.displayName),
    ),
    orphanedManagerSeasons,
  };
}

function attachLinkedUsers(
  managerSeasons: readonly ManagerSeasonRecord[],
  users: NonNullable<Awaited<ReturnType<UserRepository["listUsers"]>>>,
): readonly ManagerSeasonRecord[] {
  const usersByManagerId = new Map(
    users.flatMap((user) =>
      user.manager ? [[user.manager.id, user] as const] : [],
    ),
  );

  return managerSeasons.map((managerSeason) => {
    const linkedUser = usersByManagerId.get(managerSeason.managerId);

    return linkedUser
      ? {
          ...managerSeason,
          linkedUser: {
            id: linkedUser.id,
            email: linkedUser.email,
            displayName: linkedUser.displayName,
          },
        }
      : managerSeason;
  });
}

function findDuplicateNames(names: readonly string[]): readonly string[] {
  const counts = new Map<string, number>();

  for (const name of names) {
    const key = name.trim().toLowerCase();
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([name]) => name)
    .sort((first, second) => first.localeCompare(second, "de"));
}

function isArchivedManager(manager: ManagerSeasonRecord): boolean {
  return (
    manager.managerStatus === "ARCHIVED" ||
    manager.status === "ARCHIVED" ||
    manager.participation === "WITHDRAWN"
  );
}

function normalizeMatchday(matchday: number | undefined): number {
  return typeof matchday === "number" &&
    Number.isInteger(matchday) &&
    matchday >= 1 &&
    matchday <= 34
    ? matchday
    : 1;
}

function createManagerProfileSnapshot(input: {
  currentSeason: string;
  currentSquad: readonly SquadAssignmentRecord[];
  fixtures: readonly LivingManagerFixture[];
  manager: ManagerSeasonRecord;
  seasonHistory: readonly ManagerSeasonHistoryRecord[] | null;
  squadValue: number;
}): ManagerProfileSnapshot {
  const seasonHistory = input.seasonHistory ?? [];

  return {
    identity: {
      managerSeasonId: input.manager.id,
      managerId: input.manager.managerId,
      name: input.manager.displayName,
      shortName: input.manager.shortName,
      league: input.manager.league,
      status: input.manager.status,
      managerStatus: input.manager.managerStatus,
      currentSeason: input.currentSeason,
      since: input.manager.managerCreatedAt,
      titles: null,
      titlesStatus: "NOT_CALCULATED",
      squadValue: input.squadValue,
      budget: input.manager.budget,
    },
    statistics: createStatistics(input.fixtures),
    career: {
      seasons:
        seasonHistory.length > 0
          ? seasonHistory.map((season) => ({
              managerSeasonId: season.id,
              seasonName: season.seasonName,
              league: season.league,
              status: season.status,
              participation: season.participation,
              budget: season.budget,
              squadValue:
                season.id === input.manager.id ? input.squadValue : null,
              note:
                season.id === input.manager.id
                  ? "Aktuelle Saison"
                  : "Historische Statistik noch nicht berechnet",
            }))
          : [
              {
                managerSeasonId: input.manager.id,
                seasonName: input.currentSeason,
                league: input.manager.league,
                status: input.manager.status,
                participation: input.manager.participation,
                budget: input.manager.budget,
                squadValue: input.squadValue,
                note: "Aktuelle Saison",
              },
            ],
      leagueHistoryStatus: seasonHistory.length > 1 ? "READY" : "PARTIAL",
      titlesStatus: "NOT_CALCULATED",
      promotionsStatus: "NOT_CALCULATED",
      relegationsStatus: "NOT_CALCULATED",
    },
    achievements: [
      {
        id: "champion",
        label: "Champion",
        value: null,
        status: "NOT_CALCULATED",
      },
      {
        id: "cupWinner",
        label: "Cup Winner",
        value: null,
        status: "NOT_CALCULATED",
      },
      {
        id: "europeanChampion",
        label: "European Champion",
        value: null,
        status: "NOT_CALCULATED",
      },
      {
        id: "superCup",
        label: "Super Cup",
        value: null,
        status: "NOT_CALCULATED",
      },
    ],
    currentTeam: {
      players: input.currentSquad.slice(0, 8),
      totalPlayers: input.currentSquad.length,
    },
    future: [
      { label: "Favourite formation", value: "Noch nicht erfasst" },
      { label: "Favourite player", value: "Noch nicht erfasst" },
      { label: "Club records", value: "Noch nicht berechnet" },
    ],
  };
}

function createStatistics(
  fixtures: readonly LivingManagerFixture[],
): ManagerProfileStatistics {
  const fixturesWithResult = fixtures.filter((fixture) => fixture.result);

  if (fixturesWithResult.length === 0) {
    return {
      status: "NOT_CALCULATED",
      matches: null,
      wins: null,
      draws: null,
      losses: null,
      goalsFor: null,
      goalsAgainst: null,
      points: null,
      winPercentage: null,
    };
  }

  let wins = 0;
  let draws = 0;
  let losses = 0;
  let goalsFor = 0;
  let goalsAgainst = 0;

  for (const fixture of fixturesWithResult) {
    const result = fixture.result;

    if (!result) {
      continue;
    }

    const ownGoals =
      fixture.venue === "HOME"
        ? result.officialHomeGoals
        : result.officialAwayGoals;
    const opponentGoals =
      fixture.venue === "HOME"
        ? result.officialAwayGoals
        : result.officialHomeGoals;

    goalsFor += ownGoals;
    goalsAgainst += opponentGoals;

    if (ownGoals > opponentGoals) {
      wins += 1;
    } else if (ownGoals < opponentGoals) {
      losses += 1;
    } else {
      draws += 1;
    }
  }

  const matches = fixturesWithResult.length;
  const points = wins * 3 + draws;

  return {
    status: "READY",
    matches,
    wins,
    draws,
    losses,
    goalsFor,
    goalsAgainst,
    points,
    winPercentage: matches > 0 ? Math.round((wins / matches) * 100) : null,
  };
}

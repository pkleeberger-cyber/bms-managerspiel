import {
  PrismaLivingFixtureRepository,
  PrismaManagerSeasonRepository,
  PrismaSquadRepository,
  getPrismaClient,
} from "@/infrastructure";
import { ManagerContextService } from "./manager-context-service";
import type {
  LivingFixtureRepository,
  LivingManagerFixture,
  FixtureVisibilityStatus,
  ManagerSeasonRecord,
  ManagerSeasonRepository,
  SquadAssignmentRecord,
  SquadRepository,
} from "@/infrastructure";
import { teamOverviewExcelFixture } from "@/domain/team-overview/fixture";
import type { TeamOverviewData } from "@/domain/team-overview";
import { lineupEngineFixtureAssignments } from "@/domain/lineup-engine/fixture";

export type TeamDataSource = "DATABASE" | "FIXTURE";

export type TeamSquadSlot = {
  slotId: number;
  playerId: string;
  displayName: string;
  bundesligaClub: string;
  status: "ACTIVE" | "LEFT_BUNDESLIGA" | "INACTIVE";
  positionGroup: "TW" | "AB" | "MF" | "ST";
  marketValue: number;
  validFromMatchday: number;
  validToMatchday: number | null;
  stats: TeamSquadPlayerStats | null;
};

export type TeamSquadPlayerStats = {
  appearances: number;
  goals: number;
  yellowRedCards: number;
  redCards: number;
  teamOfTheWeek: number;
  averageRating: number | null;
  totalPoints: number | null;
};

export type TeamPositionCode = TeamSquadSlot["positionGroup"];

export type TeamPositionSummary = {
  position: TeamPositionCode;
  count: number;
  expectedCount: number;
  marketValue: number;
};

export type TeamOverviewLiveSummary = {
  totalMarketValue: number;
  playerCount: number;
  expectedPlayerCount: number;
  positions: readonly TeamPositionSummary[];
  starters: {
    status: "NOT_AVAILABLE";
    reason: string;
  };
};

export type TeamFixtureSummary = {
  id: string;
  matchday: number;
  opponent: string;
  venue: "HOME" | "AWAY";
  status: string;
  visibilityStatus: FixtureVisibilityStatus;
  result: {
    goalsFor: number;
    goalsAgainst: number;
    label: string;
    invalidTeam: "SELF" | "OPPONENT" | null;
  } | null;
};

export type TeamOverviewSnapshot = {
  dataSource: TeamDataSource;
  manager: {
    managerSeasonId: string | null;
    id: string;
    displayName: string;
    shortName: string;
    league: ManagerSeasonRecord["league"] | "FIRST";
    budget: number | null;
    status: ManagerSeasonRecord["status"] | "ACTIVE";
    participation: ManagerSeasonRecord["participation"] | "ACTIVE";
    transferStatus: ManagerSeasonRecord["transferStatus"] | "NOT_STARTED";
    currentLifecycle: ManagerSeasonRecord["currentLifecycle"] | "ACTIVE";
  };
  season: {
    id: string;
    name: string;
  };
  matchday: number;
  squad: readonly TeamSquadSlot[];
  fixtures: {
    all: readonly TeamFixtureSummary[];
    next: TeamFixtureSummary | null;
    last: TeamFixtureSummary | null;
  };
  liveSummary: TeamOverviewLiveSummary;
  overview: TeamOverviewData;
};

const currentMatchday = 1;

export type LoadCurrentTeamOverviewInput = {
  managerSeasonId?: string;
};

const expectedPositionCounts = [
  { position: "TW", expectedCount: 2 },
  { position: "AB", expectedCount: 5 },
  { position: "MF", expectedCount: 7 },
  { position: "ST", expectedCount: 4 },
] as const satisfies readonly {
  position: TeamPositionCode;
  expectedCount: number;
}[];

export class TeamService {
  constructor(
    private readonly managerSeasonRepository: ManagerSeasonRepository =
      new PrismaManagerSeasonRepository(),
    private readonly squadRepository: SquadRepository = new PrismaSquadRepository(),
    private readonly fixtureRepository: LivingFixtureRepository =
      new PrismaLivingFixtureRepository(),
    private readonly managerContextService = new ManagerContextService(
      managerSeasonRepository,
    ),
  ) {}

  async loadCurrentTeamOverview(
    input: LoadCurrentTeamOverviewInput = {},
  ): Promise<TeamOverviewSnapshot> {
    const activeSeason = await this.managerSeasonRepository.loadActiveSeason();

    if (!activeSeason) {
      return fixtureSnapshot;
    }

    const managerSeasons =
      await this.managerSeasonRepository.loadCurrentSeasonManagerSeasons(
        activeSeason.id,
      );
    const selectedContext = await this.managerContextService.loadContext(
      input.managerSeasonId,
    );
    const managerSeason =
      selectedContext.selectedManagerSeason ??
      managerSeasons?.find((season) => season.managerStatus === "ACTIVE");

    if (!managerSeason) {
      return fixtureSnapshot;
    }

    const squad = await this.squadRepository.loadCurrentSquad(managerSeason.id);
    const fixtures = await this.fixtureRepository.loadManagerFixtures(
      managerSeason.id,
    );

    if (!squad || squad.length === 0) {
      return fixtureSnapshot;
    }

    const playerStatsById = await loadSquadPlayerStats({
      playerIds: squad.map((assignment) => assignment.playerId),
      seasonId: activeSeason.id,
    });
    const mappedSquad = squad.map((assignment) =>
      mapSquadRecordToSlot(assignment, playerStatsById.get(assignment.playerId) ?? null),
    );
    const mappedFixtures = (fixtures ?? []).map(mapManagerFixture);
    const nextFixture =
      mappedFixtures.find((fixture) => fixture.status === "SCHEDULED") ?? null;
    const lastFixture =
      mappedFixtures
        .slice()
        .reverse()
        .find((fixture) => fixture.status !== "SCHEDULED") ?? null;

    return {
      dataSource: "DATABASE",
      manager: {
        managerSeasonId: managerSeason.id,
        id: managerSeason.managerId,
        displayName: managerSeason.displayName,
        shortName: managerSeason.shortName,
        league: managerSeason.league,
        budget: managerSeason.budget,
        status: managerSeason.status,
        participation: managerSeason.participation,
        transferStatus: managerSeason.transferStatus,
        currentLifecycle: managerSeason.currentLifecycle,
      },
      season: {
        id: activeSeason.id,
        name: activeSeason.name,
      },
      matchday: nextFixture?.matchday ?? mappedFixtures.at(0)?.matchday ?? currentMatchday,
      squad: mappedSquad,
      fixtures: {
        all: mappedFixtures,
        next: nextFixture,
        last: lastFixture,
      },
      liveSummary: createLiveSummary(mappedSquad),
      overview: teamOverviewExcelFixture,
    };
  }
}

export async function loadCurrentTeamOverview(
  input: LoadCurrentTeamOverviewInput = {},
) {
  const service = new TeamService();

  return service.loadCurrentTeamOverview(input);
}

const fixtureSnapshot: TeamOverviewSnapshot = {
  dataSource: "FIXTURE",
  manager: {
    managerSeasonId: null,
    id: "fixture-manager",
    displayName: "Fixture-Fallback",
    shortName: "fixture",
    league: "FIRST",
    budget: null,
    status: "ACTIVE",
    participation: "ACTIVE",
    transferStatus: "NOT_STARTED",
    currentLifecycle: "ACTIVE",
  },
  season: {
    id: "fixture-season",
    name: "2026/27",
  },
  matchday: currentMatchday,
  squad: lineupEngineFixtureAssignments.map((assignment) => ({
    slotId: assignment.slotId,
    playerId: assignment.playerId,
    displayName: assignment.playerName,
    bundesligaClub: "Fixture",
    status: "ACTIVE",
    positionGroup: mapSlotToPositionGroup(assignment.slotId),
    marketValue: 0,
    validFromMatchday: assignment.validFromMatchday,
    validToMatchday: assignment.validToMatchday,
    stats: null,
  })),
  fixtures: {
    all: [],
    next: null,
    last: null,
  },
  liveSummary: createLiveSummary(
    lineupEngineFixtureAssignments.map((assignment) => ({
      slotId: assignment.slotId,
      playerId: assignment.playerId,
      displayName: assignment.playerName,
      bundesligaClub: "Fixture",
      status: "ACTIVE",
      positionGroup: mapSlotToPositionGroup(assignment.slotId),
      marketValue: 0,
      validFromMatchday: assignment.validFromMatchday,
      validToMatchday: assignment.validToMatchday,
      stats: null,
    })),
  ),
  overview: teamOverviewExcelFixture,
};

function mapSquadRecordToSlot(
  record: SquadAssignmentRecord,
  stats: TeamSquadPlayerStats | null,
): TeamSquadSlot {
  return {
    slotId: record.slotId,
    playerId: record.playerId,
    displayName: record.playerName,
    bundesligaClub: record.bundesligaClub,
    status: record.playerStatus,
    positionGroup: record.positionGroup,
    marketValue: record.marketValue,
    validFromMatchday: record.validFromMatchday,
    validToMatchday: record.validToMatchday,
    stats,
  };
}

async function loadSquadPlayerStats(input: {
  playerIds: readonly string[];
  seasonId: string;
}): Promise<Map<string, TeamSquadPlayerStats>> {
  const prisma = getPrismaClient();

  if (!prisma || input.playerIds.length === 0) {
    return new Map();
  }

  try {
    const rows = await prisma.playerMatchData.findMany({
      where: {
        seasonId: input.seasonId,
        playerId: { in: [...new Set(input.playerIds)] },
      },
      orderBy: { matchday: "asc" },
    });
    const grouped = new Map<string, typeof rows>();

    for (const row of rows) {
      grouped.set(row.playerId, [...(grouped.get(row.playerId) ?? []), row]);
    }

    return new Map(
      [...grouped.entries()].map(([playerId, playerRows]) => {
        const ratedRows = playerRows.filter((row) => row.rating !== null);
        const averageRating =
          ratedRows.length === 0
            ? null
            : ratedRows.reduce((sum, row) => sum + (row.rating ?? 0), 0) /
              ratedRows.length;

        return [
          playerId,
          {
            appearances: playerRows.length,
            goals: playerRows.reduce((sum, row) => sum + row.goals, 0),
            yellowRedCards: playerRows.filter((row) => row.yellowRed).length,
            redCards: playerRows.filter((row) => row.red).length,
            teamOfTheWeek: playerRows.filter((row) => row.teamOfTheWeek).length,
            averageRating,
            totalPoints: null,
          },
        ];
      }),
    );
  } catch {
    return new Map();
  }
}

function mapManagerFixture(fixture: LivingManagerFixture): TeamFixtureSummary {
  return {
    id: fixture.id,
    matchday: fixture.matchday,
    opponent: fixture.opponent.managerName,
    venue: fixture.venue,
    status: fixture.status,
    visibilityStatus: fixture.visibilityStatus,
    result: fixture.result
      ? {
          goalsFor:
            fixture.venue === "HOME"
              ? fixture.result.officialHomeGoals
              : fixture.result.officialAwayGoals,
          goalsAgainst:
            fixture.venue === "HOME"
              ? fixture.result.officialAwayGoals
              : fixture.result.officialHomeGoals,
          label:
            fixture.venue === "HOME"
              ? `${fixture.result.officialHomeGoals}:${fixture.result.officialAwayGoals}`
              : `${fixture.result.officialAwayGoals}:${fixture.result.officialHomeGoals}`,
          invalidTeam:
            fixture.venue === "HOME"
              ? fixture.result.invalidTeam.home
                ? "SELF"
                : fixture.result.invalidTeam.away
                  ? "OPPONENT"
                  : null
              : fixture.result.invalidTeam.away
                ? "SELF"
                : fixture.result.invalidTeam.home
                  ? "OPPONENT"
                  : null,
        }
      : null,
  };
}

function mapSlotToPositionGroup(slotId: number): TeamSquadSlot["positionGroup"] {
  if (slotId <= 2) {
    return "TW";
  }

  if (slotId <= 7) {
    return "AB";
  }

  if (slotId <= 14) {
    return "MF";
  }

  return "ST";
}

function createLiveSummary(
  squad: readonly TeamSquadSlot[],
): TeamOverviewLiveSummary {
  const positions = expectedPositionCounts.map(({ position, expectedCount }) => {
    const slots = squad.filter((slot) => slot.positionGroup === position);

    return {
      position,
      count: slots.length,
      expectedCount,
      marketValue: slots.reduce((sum, slot) => sum + slot.marketValue, 0),
    };
  });

  return {
    totalMarketValue: squad.reduce((sum, slot) => sum + slot.marketValue, 0),
    playerCount: squad.length,
    expectedPlayerCount: 18,
    positions,
    starters: {
      status: "NOT_AVAILABLE",
      reason: "Keine Live-Quelle für Stamm- und Ersatzrollen vorhanden.",
    },
  };
}

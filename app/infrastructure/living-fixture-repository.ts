import type {
  CompetitionType,
  FixtureStatus,
  MatchdayLifecycleStatus,
} from "@prisma/client";

import { getPrismaClient } from "./prisma";

export type LivingFixtureTeam = {
  teamId: string;
  managerId: string;
  managerSeasonId: string | null;
  name: string;
  managerName: string;
};

export type LivingFixture = {
  id: string;
  competitionId: string;
  matchday: number;
  status: FixtureStatus;
  visibilityStatus: FixtureVisibilityStatus;
  result: {
    calculatedHomeGoals: number;
    calculatedAwayGoals: number;
    officialHomeGoals: number;
    officialAwayGoals: number;
    status: "CALCULATED" | "OFFICIAL";
    invalidTeam: {
      home: boolean;
      away: boolean;
      reasons: string[];
    };
  } | null;
  home: LivingFixtureTeam;
  away: LivingFixtureTeam;
};

export type FixtureVisibilityStatus =
  | "SCHEDULED"
  | "CALCULATED_UNPUBLISHED"
  | "PUBLISHED_PRELIMINARY"
  | "PUBLISHED_OFFICIAL";

export type LivingTableRow = {
  managerSeasonId: string | null;
  managerId: string;
  teamId: string;
  managerName: string;
  rank: number;
  played: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  movement: number;
};

export type LivingCompetitionOverview = {
  competitionId: string;
  seasonId: string;
  seasonName: string;
  competitionName: string;
  currentMatchday: number;
  latestPublishedMatchday: number;
  selectedMatchdayPublished: boolean;
  matchdays: readonly LivingCompetitionMatchday[];
  fixtures: readonly LivingFixture[];
  table: readonly LivingTableRow[];
};

export type LivingCompetitionMatchday = {
  matchday: number;
  label: string;
  status: FixtureVisibilityStatus;
  isSelected: boolean;
  isPublished: boolean;
  fixtureCount: number;
  resultCount: number;
};

export type LivingManagerFixture = LivingFixture & {
  venue: "HOME" | "AWAY";
  opponent: LivingFixtureTeam;
};

export type LivingScheduledMatchday = {
  seasonId: string;
  seasonName: string;
  competitionId: string;
  competitionName: string;
  matchday: number;
  fixtures: number;
};

export interface LivingFixtureRepository {
  loadCompetitionOverview(
    competitionType: CompetitionType,
    options?: { matchday?: number },
  ): Promise<LivingCompetitionOverview | null>;
  loadManagerFixtures(
    managerSeasonId: string,
  ): Promise<readonly LivingManagerFixture[] | null>;
  loadNextScheduledMatchday(
    competitionType: CompetitionType,
  ): Promise<LivingScheduledMatchday | null>;
}

export class PrismaLivingFixtureRepository implements LivingFixtureRepository {
  private readonly prisma = getPrismaClient();

  async loadCompetitionOverview(
    competitionType: CompetitionType,
    options: { matchday?: number } = {},
  ): Promise<LivingCompetitionOverview | null> {
    if (!this.prisma) {
      return null;
    }

    try {
      const season = await this.prisma.season.findFirst({
        where: { status: "ACTIVE" },
        orderBy: { yearStart: "desc" },
      });

      if (!season) {
        return null;
      }

      const competition = await this.prisma.competition.findFirst({
        where: {
          seasonId: season.id,
          type: competitionType,
        },
      });

      if (!competition) {
        return null;
      }

      const fixtures = await this.prisma.fixture.findMany({
        where: { competitionId: competition.id },
        include: fixtureInclude,
        orderBy: [{ matchday: "asc" }, { homeTeamId: "asc" }],
      });
      const lifecycleByMatchday = await this.loadLifecycleByMatchday(
        competition.id,
      );
      const mappedFixtures = fixtures.map((fixture) =>
        mapFixture(fixture, lifecycleByMatchday),
      );
      const latestVisibleMatchday =
        mappedFixtures
          .filter((fixture) => fixture.result)
          .map((fixture) => fixture.matchday)
          .sort((first, second) => second - first)
          .at(0) ?? null;
      const selectedMatchday = normalizeMatchday(options.matchday) ??
        latestVisibleMatchday ??
        fixtures.find((fixture) => fixture.status === "SCHEDULED")?.matchday ??
        fixtures.at(0)?.matchday ??
        1;
      const currentMatchday =
        selectedMatchday;
      const selectedMatchdayPublished = selectedMatchday === 0 ||
        mappedFixtures.some(
          (fixture) => fixture.matchday === selectedMatchday && fixture.result,
        );
      const tableSnapshot = await this.prisma.leagueTableSnapshot.findUnique({
        where: {
          competitionId_matchday: {
            competitionId: competition.id,
            matchday: selectedMatchdayPublished ? selectedMatchday : 0,
          },
        },
      });

      if (fixtures.length === 0) {
        return null;
      }

      return {
        competitionId: competition.id,
        seasonId: season.id,
        seasonName: season.name,
        competitionName: competition.name,
        currentMatchday,
        latestPublishedMatchday: latestVisibleMatchday ?? 0,
        selectedMatchdayPublished,
        matchdays: createMatchdayHistory(mappedFixtures, selectedMatchday),
        fixtures: mappedFixtures,
        table: selectedMatchdayPublished
          ? readTableRows(tableSnapshot?.tableJson)
          : [],
      };
    } catch {
      return null;
    }
  }

  async loadManagerFixtures(
    managerSeasonId: string,
  ): Promise<readonly LivingManagerFixture[] | null> {
    if (!this.prisma) {
      return null;
    }

    try {
      const managerSeason = await this.prisma.managerSeason.findUnique({
        where: { id: managerSeasonId },
      });

      if (!managerSeason) {
        return null;
      }

      const team = await this.prisma.team.findUnique({
        where: {
          seasonId_managerId: {
            seasonId: managerSeason.seasonId,
            managerId: managerSeason.managerId,
          },
        },
      });

      if (!team) {
        return null;
      }

      const fixtures = await this.prisma.fixture.findMany({
        where: {
          OR: [{ homeTeamId: team.id }, { awayTeamId: team.id }],
        },
        include: fixtureInclude,
        orderBy: [{ matchday: "asc" }],
      });
      const competitionIds = Array.from(
        new Set(fixtures.map((fixture) => fixture.competitionId)),
      );
      const lifecycleByCompetition = new Map<
        string,
        Map<number, MatchdayLifecycleStatus>
      >();

      for (const competitionId of competitionIds) {
        lifecycleByCompetition.set(
          competitionId,
          await this.loadLifecycleByMatchday(competitionId),
        );
      }

      return fixtures.map((fixture) => {
        const mapped = mapFixture(
          fixture,
          lifecycleByCompetition.get(fixture.competitionId) ?? new Map(),
        );
        const isHome = mapped.home.teamId === team.id;

        return {
          ...mapped,
          venue: isHome ? "HOME" : "AWAY",
          opponent: isHome ? mapped.away : mapped.home,
        };
      });
    } catch {
      return null;
    }
  }

  async loadNextScheduledMatchday(
    competitionType: CompetitionType,
  ): Promise<LivingScheduledMatchday | null> {
    if (!this.prisma) {
      return null;
    }

    try {
      const season = await this.prisma.season.findFirst({
        where: { status: "ACTIVE" },
        orderBy: { yearStart: "desc" },
      });

      if (!season) {
        return null;
      }

      const competition = await this.prisma.competition.findFirst({
        where: {
          seasonId: season.id,
          type: competitionType,
        },
      });

      if (!competition) {
        return null;
      }

      const nextFixture = await this.prisma.fixture.findFirst({
        where: {
          competitionId: competition.id,
          status: "SCHEDULED",
        },
        orderBy: { matchday: "asc" },
      });

      if (!nextFixture) {
        return null;
      }

      const fixtures = await this.prisma.fixture.count({
        where: {
          competitionId: competition.id,
          matchday: nextFixture.matchday,
          status: "SCHEDULED",
        },
      });

      return {
        seasonId: season.id,
        seasonName: season.name,
        competitionId: competition.id,
        competitionName: competition.name,
        matchday: nextFixture.matchday,
        fixtures,
      };
    } catch {
      return null;
    }
  }

  private async loadLifecycleByMatchday(competitionId: string) {
    const lifecycles = await this.prisma!.matchdayLifecycle.findMany({
      where: { competitionId },
      select: { matchday: true, status: true },
    });

    return new Map(
      lifecycles.map((lifecycle) => [lifecycle.matchday, lifecycle.status]),
    );
  }
}

function normalizeMatchday(value: number | undefined) {
  if (value === undefined || !Number.isInteger(value) || value < 0 || value > 34) {
    return undefined;
  }

  return value;
}

function createMatchdayHistory(
  fixtures: readonly LivingFixture[],
  selectedMatchday: number,
): readonly LivingCompetitionMatchday[] {
  return Array.from({ length: 35 }, (_, matchday) => {
    const dayFixtures = fixtures.filter((fixture) => fixture.matchday === matchday);
    const resultCount = dayFixtures.filter((fixture) => fixture.result).length;
    const status = dayFixtures.some(
      (fixture) => fixture.visibilityStatus === "PUBLISHED_OFFICIAL",
    )
      ? "PUBLISHED_OFFICIAL"
      : dayFixtures.some((fixture) => fixture.visibilityStatus === "PUBLISHED_PRELIMINARY")
        ? "PUBLISHED_PRELIMINARY"
        : dayFixtures.some((fixture) => fixture.visibilityStatus === "CALCULATED_UNPUBLISHED")
          ? "CALCULATED_UNPUBLISHED"
          : "SCHEDULED";

    return {
      matchday,
      label: matchday === 0 ? "ST 0" : `ST ${matchday}`,
      status,
      isSelected: matchday === selectedMatchday,
      isPublished: matchday === 0 || resultCount > 0,
      fixtureCount: dayFixtures.length,
      resultCount,
    };
  });
}

const fixtureInclude = {
  homeTeam: { include: { manager: true, season: true } },
  awayTeam: { include: { manager: true, season: true } },
  result: true,
} as const;

type FixtureWithTeams = {
  id: string;
  competitionId: string;
  matchday: number;
  status: FixtureStatus;
  result: {
    calculatedHomeGoals: number;
    calculatedAwayGoals: number;
    officialHomeGoals: number;
    officialAwayGoals: number;
    status: "CALCULATED" | "OFFICIAL";
    auditJson?: unknown;
  } | null;
  homeTeam: {
    id: string;
    managerId: string;
    name: string;
    manager: { displayName: string };
  };
  awayTeam: {
    id: string;
    managerId: string;
    name: string;
    manager: { displayName: string };
  };
};

function mapFixture(
  fixture: FixtureWithTeams,
  lifecycleByMatchday: ReadonlyMap<number, MatchdayLifecycleStatus>,
): LivingFixture {
  const visibilityStatus = getFixtureVisibilityStatus(
    fixture,
    lifecycleByMatchday.get(fixture.matchday),
  );
  const result = isVisibleResult(visibilityStatus) ? fixture.result : null;

  return {
    id: fixture.id,
    competitionId: fixture.competitionId,
    matchday: fixture.matchday,
    status: fixture.status,
    visibilityStatus,
    result: result
      ? {
          calculatedHomeGoals: result.calculatedHomeGoals,
          calculatedAwayGoals: result.calculatedAwayGoals,
          officialHomeGoals: result.officialHomeGoals,
          officialAwayGoals: result.officialAwayGoals,
          status: result.status,
          invalidTeam: readInvalidTeamAudit(result.auditJson),
        }
      : null,
    home: mapFixtureTeam(fixture.homeTeam),
    away: mapFixtureTeam(fixture.awayTeam),
  };
}

function getFixtureVisibilityStatus(
  fixture: FixtureWithTeams,
  lifecycleStatus: MatchdayLifecycleStatus | undefined,
): FixtureVisibilityStatus {
  if (!fixture.result) {
    return "SCHEDULED";
  }

  if (
    lifecycleStatus === "OFFICIALLY_CLOSED" ||
    lifecycleStatus === "PUBLISHED_OFFICIAL" ||
    lifecycleStatus === "ARCHIVED"
  ) {
    return "PUBLISHED_OFFICIAL";
  }

  if (isPublishedLifecycleStatus(lifecycleStatus)) {
    return "PUBLISHED_PRELIMINARY";
  }

  return "CALCULATED_UNPUBLISHED";
}

function isPublishedLifecycleStatus(
  status: MatchdayLifecycleStatus | undefined,
) {
  return status === "PRELIMINARY_PUBLISHED" ||
    status === "PUBLISHED_PRELIMINARY" ||
    status === "MANUAL_REVIEW_CONFIRMED" ||
    status === "CORRECTIONS_CONFIRMED" ||
    status === "OFFICIALLY_CLOSED" ||
    status === "PUBLISHED_OFFICIAL" ||
    status === "ARCHIVED";
}

function isVisibleResult(status: FixtureVisibilityStatus) {
  return status === "PUBLISHED_PRELIMINARY" || status === "PUBLISHED_OFFICIAL";
}

function readInvalidTeamAudit(auditJson: unknown) {
  const matchAnalysis = auditJson && typeof auditJson === "object" && "matchAnalysis" in auditJson
    ? (auditJson as { matchAnalysis?: unknown }).matchAnalysis
    : null;
  const homeTeam = matchAnalysis && typeof matchAnalysis === "object" && "homeTeam" in matchAnalysis
    ? (matchAnalysis as { homeTeam?: { teamStatus?: unknown; invalidReason?: unknown } }).homeTeam
    : null;
  const awayTeam = matchAnalysis && typeof matchAnalysis === "object" && "awayTeam" in matchAnalysis
    ? (matchAnalysis as { awayTeam?: { teamStatus?: unknown; invalidReason?: unknown } }).awayTeam
    : null;
  const home = homeTeam?.teamStatus === "INVALID";
  const away = awayTeam?.teamStatus === "INVALID";

  return {
    home,
    away,
    reasons: [
      ...(home && typeof homeTeam?.invalidReason === "string"
        ? [homeTeam.invalidReason]
        : []),
      ...(away && typeof awayTeam?.invalidReason === "string"
        ? [awayTeam.invalidReason]
        : []),
    ],
  };
}

function mapFixtureTeam(team: FixtureWithTeams["homeTeam"]): LivingFixtureTeam {
  return {
    teamId: team.id,
    managerId: team.managerId,
    managerSeasonId: null,
    name: team.name,
    managerName: team.manager.displayName,
  };
}

function readTableRows(value: unknown): readonly LivingTableRow[] {
  if (!value || typeof value !== "object" || !("rows" in value)) {
    return [];
  }

  const rows = (value as { rows?: unknown }).rows;

  if (!Array.isArray(rows)) {
    return [];
  }

  return rows.map(mapLivingTableRow).filter((row) => row !== null);
}

function mapLivingTableRow(value: unknown): LivingTableRow | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const row = value as Partial<LivingTableRow> & {
    position?: number;
    matchesPlayed?: number;
    fantasyGoalsFor?: number;
    fantasyGoalsAgainst?: number;
    leaguePoints?: number;
    positionChange?: string;
  };

  if (
    typeof row.managerId !== "string" ||
    typeof row.teamId !== "string" ||
    typeof row.managerName !== "string"
  ) {
    return null;
  }

  return {
    managerSeasonId:
      typeof row.managerSeasonId === "string" ? row.managerSeasonId : null,
    managerId: row.managerId,
    teamId: row.teamId,
    managerName: row.managerName,
    rank: row.rank ?? row.position ?? 0,
    played: row.played ?? row.matchesPlayed ?? 0,
    points: row.points ?? row.leaguePoints ?? 0,
    goalsFor: row.goalsFor ?? row.fantasyGoalsFor ?? 0,
    goalsAgainst: row.goalsAgainst ?? row.fantasyGoalsAgainst ?? 0,
    movement: row.movement ?? mapPositionMovement(row.positionChange),
  };
}

function mapPositionMovement(value: string | undefined) {
  if (value === "up") {
    return 1;
  }

  if (value === "down") {
    return -1;
  }

  return 0;
}

import type { MatchAnalysis } from "@/domain/match-analysis-engine";
import type { MatchdayLifecycleStatus } from "@/domain/matchday-lifecycle";
import { getPrismaClient } from "@/infrastructure/prisma";

export type PersistedMatchAnalysisResult = {
  analysis: MatchAnalysis | null;
  fixture: {
    id: string;
    competitionName: string;
    matchday: number;
    homeManagerName: string;
    awayManagerName: string;
  } | null;
  reason: "FOUND" | "NO_FIXTURE" | "NO_RESULT" | "NO_ANALYSIS" | "UNPUBLISHED";
};

export type LoadPersistedMatchAnalysisInput = {
  fixtureId?: string;
  managerSeasonId?: string;
  matchday: number;
};

export class MatchAnalysisService {
  private readonly prisma = getPrismaClient();

  async loadPersistedAnalysis(
    input: LoadPersistedMatchAnalysisInput,
  ): Promise<PersistedMatchAnalysisResult> {
    if (!this.prisma) {
      return { analysis: null, fixture: null, reason: "NO_FIXTURE" };
    }

    const fixture = input.fixtureId
      ? await this.loadFixtureById(input.fixtureId)
      : await this.loadFixtureForManager(input);

    if (!fixture) {
      return { analysis: null, fixture: null, reason: "NO_FIXTURE" };
    }

    const mappedFixture = {
      id: fixture.id,
      competitionName: fixture.competition.name,
      matchday: fixture.matchday,
      homeManagerName: fixture.homeTeam.manager.displayName,
      awayManagerName: fixture.awayTeam.manager.displayName,
    };

    if (!fixture.result) {
      return { analysis: null, fixture: mappedFixture, reason: "NO_RESULT" };
    }

    const lifecycle = await this.prisma.matchdayLifecycle.findUnique({
      where: {
        competitionId_matchday: {
          competitionId: fixture.competitionId,
          matchday: fixture.matchday,
        },
      },
      select: { status: true },
    });

    if (!isPublishedLifecycleStatus(lifecycle?.status)) {
      return { analysis: null, fixture: mappedFixture, reason: "UNPUBLISHED" };
    }

    const analysis = readMatchAnalysis(fixture.result.auditJson);

    if (!analysis) {
      return { analysis: null, fixture: mappedFixture, reason: "NO_ANALYSIS" };
    }

    return { analysis, fixture: mappedFixture, reason: "FOUND" };
  }

  private async loadFixtureById(fixtureId: string) {
    return this.prisma!.fixture.findUnique({
      where: { id: fixtureId },
      include: fixtureInclude,
    });
  }

  private async loadFixtureForManager(input: LoadPersistedMatchAnalysisInput) {
    if (!input.managerSeasonId) {
      return this.prisma!.fixture.findFirst({
        where: {
          matchday: input.matchday,
          result: { isNot: null },
        },
        include: fixtureInclude,
        orderBy: { id: "asc" },
      });
    }

    const managerSeason = await this.prisma!.managerSeason.findUnique({
      where: { id: input.managerSeasonId },
    });

    if (!managerSeason) {
      return null;
    }

    const team = await this.prisma!.team.findUnique({
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

    return this.prisma!.fixture.findFirst({
      where: {
        matchday: input.matchday,
        OR: [{ homeTeamId: team.id }, { awayTeamId: team.id }],
      },
      include: fixtureInclude,
      orderBy: { id: "asc" },
    });
  }
}

export async function loadPersistedMatchAnalysis(
  input: LoadPersistedMatchAnalysisInput,
) {
  return new MatchAnalysisService().loadPersistedAnalysis(input);
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

const fixtureInclude = {
  competition: true,
  homeTeam: { include: { manager: true } },
  awayTeam: { include: { manager: true } },
  result: true,
} as const;

function readMatchAnalysis(value: unknown): MatchAnalysis | null {
  if (!value || typeof value !== "object" || !("matchAnalysis" in value)) {
    return null;
  }

  const analysis = (value as { matchAnalysis?: unknown }).matchAnalysis;

  if (!analysis || typeof analysis !== "object") {
    return null;
  }

  if (
    "fixtureId" in analysis &&
    "homeTeam" in analysis &&
    "awayTeam" in analysis &&
    "players" in analysis &&
    "officialScore" in analysis
  ) {
    return analysis as MatchAnalysis;
  }

  return null;
}

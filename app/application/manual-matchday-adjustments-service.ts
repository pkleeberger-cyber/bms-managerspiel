import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";

import type { MatchOutcome, MatchResult } from "@/domain/match-engine";
import type { MatchAnalysis } from "@/domain/match-analysis-engine";
import { getPrismaClient } from "@/infrastructure/prisma";
import { rebuildAccumulatedLeagueTableSnapshots } from "./league-table-snapshot-service";

const defaultMatchday = 1;

export type ManualAdjustmentType =
  | "INVALID_TEAM"
  | "TEAM_PENALTY"
  | "POINT_ADJUSTMENT"
  | "BONUS"
  | "OTHER";

export type ManualAdjustmentStatus = "ACTIVE" | "VOIDED";

export type ManualAdjustmentManagerOption = {
  managerSeasonId: string;
  managerName: string;
};

export type ManualAdjustmentRow = {
  id: string;
  managerSeasonId: string;
  managerName: string;
  type: ManualAdjustmentType;
  points: number;
  reason: string;
  status: ManualAdjustmentStatus;
  createdAt: string;
  createdBy: string | null;
};

export type ManualAdjustmentScoreRow = {
  managerSeasonId: string;
  managerName: string;
  engineScore: number;
  manualAdjustment: number;
  finalScore: number;
  teamStatus: "VALID" | "INVALID";
};

export type ManualAdjustmentTeamStatusRow = {
  managerSeasonId: string;
  managerName: string;
  status: "VALID" | "INVALID";
  activeInvalidAdjustmentId: string | null;
  reason: string | null;
  createdAt: string | null;
  createdBy: string | null;
};

export type ManualAdjustmentFixtureRow = {
  fixtureId: string;
  homeManager: string;
  awayManager: string;
  engineScore: string;
  finalScore: string;
  status: string;
};

export type ManualAdjustmentReviewSnapshot = {
  seasonId: string;
  seasonName: string;
  competitionId: string;
  competitionName: string;
  matchday: number;
  managers: readonly ManualAdjustmentManagerOption[];
  teamStatuses: readonly ManualAdjustmentTeamStatusRow[];
  adjustments: readonly ManualAdjustmentRow[];
  scores: readonly ManualAdjustmentScoreRow[];
  fixtures: readonly ManualAdjustmentFixtureRow[];
};

type ManualAdjustmentContext = {
  season: { id: string; name: string };
  competition: { id: string; name: string };
  matchday: number;
};

type MatchResultAuditJson = {
  officialResult?: unknown;
  matchAnalysis?: unknown;
  manualAdjustments?: unknown;
};

type StoredOfficialResult = {
  calculatedResult: MatchResult;
  officialResult: MatchResult;
  calculatedGoals: { home: number; away: number };
  officialGoals: { home: number; away: number };
  outcome: MatchOutcome;
  winner: MatchResult["winner"];
  leaguePoints: MatchResult["leaguePoints"];
  teams: MatchResult["teams"];
  appliedRuleIds: string[];
};

type AdjustmentPoints = {
  managerSeasonId: string;
  points: number;
};

type FullAdjustment = AdjustmentPoints & {
  id: string;
  type: ManualAdjustmentType;
  reason: string;
  createdAt: Date;
  createdBy: string | null;
};

export class ManualMatchdayAdjustmentsService {
  private readonly prisma = getPrismaClient();

  constructor(private readonly selectedMatchday?: number) {}

  async loadReview(): Promise<ManualAdjustmentReviewSnapshot> {
    const context = await this.loadContext(this.selectedMatchday);
    const [managerSeasons, adjustments, fixtures] = await Promise.all([
      this.loadManagerSeasons(context),
      this.loadAdjustments(context),
      this.loadFixtures(context),
    ]);
    const activeAdjustments = adjustments.filter(
      (adjustment) => adjustment.status === "ACTIVE",
    );
    const activeInvalidByManagerSeasonId = new Map(
      activeAdjustments
        .filter((adjustment) => adjustment.type === "INVALID_TEAM")
        .map((adjustment) => [adjustment.managerSeasonId, adjustment]),
    );
    const scores = createScoreRows(fixtures, managerSeasons, activeAdjustments);

    return {
      seasonId: context.season.id,
      seasonName: context.season.name,
      competitionId: context.competition.id,
      competitionName: context.competition.name,
      matchday: context.matchday,
      managers: managerSeasons.map((managerSeason) => ({
        managerSeasonId: managerSeason.id,
        managerName: managerSeason.manager.displayName,
      })),
      teamStatuses: managerSeasons.map((managerSeason) => {
        const invalidAdjustment = activeInvalidByManagerSeasonId.get(managerSeason.id);

        return {
          managerSeasonId: managerSeason.id,
          managerName: managerSeason.manager.displayName,
          status: invalidAdjustment ? "INVALID" : "VALID",
          activeInvalidAdjustmentId: invalidAdjustment?.id ?? null,
          reason: invalidAdjustment?.reason ?? null,
          createdAt: invalidAdjustment?.createdAt.toISOString() ?? null,
          createdBy: invalidAdjustment?.createdBy ?? null,
        };
      }),
      adjustments: adjustments.map((adjustment) => ({
        id: adjustment.id,
        managerSeasonId: adjustment.managerSeasonId,
        managerName: adjustment.managerSeason.manager.displayName,
        type: adjustment.type,
        points: adjustment.points,
        reason: adjustment.reason,
        status: adjustment.status,
        createdAt: adjustment.createdAt.toISOString(),
        createdBy: adjustment.createdBy,
      })),
      scores,
      fixtures: fixtures.map((fixture) => {
        const homeManagerSeason = managerSeasons.find(
          (managerSeason) => managerSeason.managerId === fixture.homeTeam.managerId,
        );
        const awayManagerSeason = managerSeasons.find(
          (managerSeason) => managerSeason.managerId === fixture.awayTeam.managerId,
        );
        const invalidScores = createInvalidTeamScoreContext(
          fixtures,
          managerSeasons,
          activeAdjustments,
        );
        const homeAdjustment = sumPointAdjustments(activeAdjustments, homeManagerSeason?.id);
        const awayAdjustment = sumPointAdjustments(activeAdjustments, awayManagerSeason?.id);
        const homeFinalScore = homeManagerSeason && isInvalidManagerSeason(
          activeAdjustments,
          homeManagerSeason.id,
        )
          ? invalidScores.invalidScore
          : fixture.result
            ? fixture.result.calculatedHomeGoals + homeAdjustment
            : null;
        const awayFinalScore = awayManagerSeason && isInvalidManagerSeason(
          activeAdjustments,
          awayManagerSeason.id,
        )
          ? invalidScores.invalidScore
          : fixture.result
            ? fixture.result.calculatedAwayGoals + awayAdjustment
            : null;

        return {
          fixtureId: fixture.id,
          homeManager: fixture.homeTeam.manager.displayName,
          awayManager: fixture.awayTeam.manager.displayName,
          engineScore: fixture.result
            ? `${fixture.result.calculatedHomeGoals}:${fixture.result.calculatedAwayGoals}`
            : "–",
          finalScore:
            homeFinalScore !== null && awayFinalScore !== null
              ? `${homeFinalScore}:${awayFinalScore}`
              : "–",
          status: fixture.result?.status ?? fixture.status,
        };
      }),
    };
  }

  async addAdjustment(formData: FormData): Promise<void> {
    const context = await this.loadContext(readOptionalMatchday(formData) ?? this.selectedMatchday);
    const managerSeasonId = readRequiredString(formData, "managerSeasonId");
    const type = readAdjustmentType(formData);
    const points = readPoints(formData);
    const reason = readRequiredString(formData, "reason");
    const createdBy = readOptionalString(formData, "createdBy");

    await this.prisma!.manualMatchdayAdjustment.create({
      data: {
        seasonId: context.season.id,
        competitionId: context.competition.id,
        matchday: context.matchday,
        managerSeasonId,
        type,
        points,
        reason,
        createdBy,
        status: "ACTIVE",
      },
    });

    await this.republish(context);
    revalidateReviewPaths();
  }

  async markInvalidTeam(formData: FormData): Promise<void> {
    const context = await this.loadContext(readOptionalMatchday(formData) ?? this.selectedMatchday);
    const managerSeasonId = readRequiredString(formData, "managerSeasonId");
    const reason = readRequiredString(formData, "reason");
    const createdBy = readOptionalString(formData, "createdBy");

    await this.prisma!.manualMatchdayAdjustment.create({
      data: {
        seasonId: context.season.id,
        competitionId: context.competition.id,
        matchday: context.matchday,
        managerSeasonId,
        type: "INVALID_TEAM",
        points: 0,
        reason,
        createdBy,
        status: "ACTIVE",
      },
    });

    await this.republish(context);
    revalidateReviewPaths();
  }

  async voidAdjustment(formData: FormData): Promise<void> {
    const context = await this.loadContext(readOptionalMatchday(formData) ?? this.selectedMatchday);
    const adjustmentId = readRequiredString(formData, "adjustmentId");

    await this.prisma!.manualMatchdayAdjustment.update({
      where: { id: adjustmentId },
      data: { status: "VOIDED" },
    });

    await this.republish(context);
    revalidateReviewPaths();
  }

  private async republish(context: ManualAdjustmentContext) {
    const [managerSeasons, activeAdjustments, fixtures] =
      await Promise.all([
        this.loadManagerSeasons(context),
        this.loadAdjustments(context, "ACTIVE"),
        this.loadFixtures(context),
      ]);
    const invalidScoreContext = createInvalidTeamScoreContext(
      fixtures,
      managerSeasons,
      activeAdjustments,
    );

    await this.prisma!.$transaction(async (tx) => {
      for (const fixture of fixtures) {
        if (!fixture.result) {
          continue;
        }

        const adjusted = createAdjustedResultPayload(
          fixture,
          managerSeasons,
          activeAdjustments,
          invalidScoreContext.invalidScore,
        );

        await tx.matchResult.update({
          where: { fixtureId: fixture.id },
          data: {
            officialHomeGoals: adjusted.officialGoals.home,
            officialAwayGoals: adjusted.officialGoals.away,
            auditJson: adjusted.auditJson,
          },
        });
      }

      await rebuildAccumulatedLeagueTableSnapshots({
        competitionId: context.competition.id,
        fromMatchday: context.matchday,
        tx,
      });
    });
  }

  private async loadContext(matchday?: number): Promise<ManualAdjustmentContext> {
    if (!this.prisma) {
      throw new Error("Prisma ist nicht verfügbar.");
    }

    const season = await this.prisma.season.findFirst({
      where: { status: "ACTIVE" },
      orderBy: { yearStart: "desc" },
    });

    if (!season) {
      throw new Error("Keine aktive Saison gefunden.");
    }

    const competition = await this.prisma.competition.findFirst({
      where: {
        seasonId: season.id,
        type: "LEAGUE_1",
        name: "Erste Liga",
      },
    });

    if (!competition) {
      throw new Error("Erste Liga ist nicht angelegt.");
    }

    const lifecycle = await this.prisma.matchdayLifecycle.findFirst({
      where: {
        competitionId: competition.id,
        status: { in: ["CALCULATED", "PUBLISHED_PRELIMINARY", "PUBLISHED_OFFICIAL"] },
      },
      orderBy: { matchday: "desc" },
    });
    const latestCalculatedFixture = await this.prisma.fixture.findFirst({
      where: {
        competitionId: competition.id,
        result: { isNot: null },
      },
      orderBy: { matchday: "desc" },
    });

    return {
      season: { id: season.id, name: season.name },
      competition: { id: competition.id, name: competition.name },
      matchday: matchday ?? latestCalculatedFixture?.matchday ?? lifecycle?.matchday ?? defaultMatchday,
    };
  }

  private async loadManagerSeasons(context: ManualAdjustmentContext) {
    return this.prisma!.managerSeason.findMany({
      where: {
        seasonId: context.season.id,
        league: "FIRST",
        status: "ACTIVE",
        participation: "ACTIVE",
      },
      include: { manager: true },
      orderBy: { manager: { displayName: "asc" } },
    });
  }

  private async loadAdjustments(
    context: ManualAdjustmentContext,
    status?: ManualAdjustmentStatus,
  ) {
    return this.prisma!.manualMatchdayAdjustment.findMany({
      where: {
        competitionId: context.competition.id,
        matchday: context.matchday,
        ...(status ? { status } : {}),
      },
      include: {
        managerSeason: { include: { manager: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  private async loadFixtures(context: ManualAdjustmentContext) {
    return this.prisma!.fixture.findMany({
      where: {
        competitionId: context.competition.id,
        matchday: context.matchday,
      },
      include: {
        homeTeam: { include: { manager: true } },
        awayTeam: { include: { manager: true } },
        result: true,
      },
      orderBy: { id: "asc" },
    });
  }

}

export async function loadManualAdjustmentReview(matchday?: number) {
  return new ManualMatchdayAdjustmentsService(matchday).loadReview();
}

export async function addManualMatchdayAdjustment(formData: FormData) {
  return new ManualMatchdayAdjustmentsService().addAdjustment(formData);
}

export async function markInvalidTeamOverride(formData: FormData) {
  return new ManualMatchdayAdjustmentsService().markInvalidTeam(formData);
}

export async function voidManualMatchdayAdjustment(formData: FormData) {
  return new ManualMatchdayAdjustmentsService().voidAdjustment(formData);
}

function createScoreRows(
  fixtures: readonly {
    result: {
      calculatedHomeGoals: number;
      calculatedAwayGoals: number;
    } | null;
    homeTeam: { managerId: string; manager: { displayName: string } };
    awayTeam: { managerId: string; manager: { displayName: string } };
  }[],
  managerSeasons: readonly {
    id: string;
    managerId: string;
    manager: { displayName: string };
  }[],
  adjustments: readonly FullAdjustment[],
): ManualAdjustmentScoreRow[] {
  const invalidScores = createInvalidTeamScoreContext(
    fixtures,
    managerSeasons,
    adjustments,
  );

  return fixtures.flatMap((fixture) => {
    if (!fixture.result) {
      return [];
    }

    return (["homeTeam", "awayTeam"] as const).flatMap((side) => {
      const managerSeason = managerSeasons.find(
        (candidate) => candidate.managerId === fixture[side].managerId,
      );

      if (!managerSeason) {
        return [];
      }

      const engineScore = side === "homeTeam"
        ? fixture.result!.calculatedHomeGoals
        : fixture.result!.calculatedAwayGoals;
      const invalidTeam = isInvalidManagerSeason(adjustments, managerSeason.id);
      const manualAdjustment = invalidTeam
        ? invalidScores.invalidScore - engineScore
        : sumPointAdjustments(adjustments, managerSeason.id);

      return {
        managerSeasonId: managerSeason.id,
        managerName: managerSeason.manager.displayName,
        engineScore,
        manualAdjustment,
        finalScore: engineScore + manualAdjustment,
        teamStatus: invalidTeam ? "INVALID" : "VALID",
      };
    });
  });
}

function createAdjustedResultPayload(
  fixture: Parameters<typeof createAdjustedDomainMatchResult>[0],
  managerSeasons: Parameters<typeof createAdjustedDomainMatchResult>[1],
  adjustments: readonly FullAdjustment[],
  invalidScore: number,
) {
  const adjustedDomainResult = createAdjustedDomainMatchResult(
    fixture,
    managerSeasons,
    adjustments,
    invalidScore,
  );
  const officialGoals = {
    home: adjustedDomainResult.fantasyGoals.home,
    away: adjustedDomainResult.fantasyGoals.away,
  };
  const auditJson = readAuditJson(fixture.result?.auditJson);
  const storedOfficialResult = readStoredOfficialResult(auditJson.officialResult);
  const manualAdjustments = createFixtureManualAdjustments(
    fixture,
    managerSeasons,
    adjustments,
  );
  const officialResult = storedOfficialResult
    ? {
        ...storedOfficialResult,
        officialResult: adjustedDomainResult,
        officialGoals,
        outcome: adjustedDomainResult.outcome,
        winner: adjustedDomainResult.winner,
        leaguePoints: adjustedDomainResult.leaguePoints,
        teams: adjustedDomainResult.teams,
      }
    : auditJson.officialResult;
  const matchAnalysis = updateMatchAnalysis(
    auditJson.matchAnalysis,
    adjustedDomainResult,
    manualAdjustments,
  );

  return {
    officialGoals,
    auditJson: {
      officialResult: toInputJson(officialResult),
      matchAnalysis: toInputJson(matchAnalysis),
      manualAdjustments: toInputJson(manualAdjustments),
    } satisfies Prisma.InputJsonObject,
  };
}

function createAdjustedDomainMatchResult(
  fixture: {
    competitionId: string;
    matchday: number;
    result: {
      calculatedHomeGoals: number;
      calculatedAwayGoals: number;
      auditJson?: unknown;
    } | null;
    homeTeam: { managerId: string };
    awayTeam: { managerId: string };
  },
  managerSeasons: readonly { id: string; managerId: string }[],
  adjustments: readonly FullAdjustment[],
  invalidScore: number,
): MatchResult {
  if (!fixture.result) {
    throw new Error("Fixture has no MatchResult.");
  }

  const homeManagerSeason = managerSeasons.find(
    (managerSeason) => managerSeason.managerId === fixture.homeTeam.managerId,
  );
  const awayManagerSeason = managerSeasons.find(
    (managerSeason) => managerSeason.managerId === fixture.awayTeam.managerId,
  );
  const officialGoals = {
    home: getFinalScoreForManager({
      managerSeasonId: homeManagerSeason?.id,
      engineScore: fixture.result.calculatedHomeGoals,
      adjustments,
      invalidScore,
    }),
    away: getFinalScoreForManager({
      managerSeasonId: awayManagerSeason?.id,
      engineScore: fixture.result.calculatedAwayGoals,
      adjustments,
      invalidScore,
    }),
  };
  const outcome = getOutcome(officialGoals.home, officialGoals.away);
  const leaguePoints = getLeaguePoints(outcome);
  const winner =
    outcome === "DRAW"
      ? null
      : {
          side: outcome === "HOME_WIN" ? "HOME" as const : "AWAY" as const,
          managerId:
            outcome === "HOME_WIN"
              ? fixture.homeTeam.managerId
              : fixture.awayTeam.managerId,
        };
  const baseResult = readStoredOfficialResult(
    readAuditJson(fixture.result.auditJson).officialResult,
  )?.officialResult;

  return {
    competitionId: fixture.competitionId,
    matchday: fixture.matchday,
    outcome,
    winner,
    fantasyGoals: officialGoals,
    leaguePoints,
    teams: {
      home: {
        managerId: fixture.homeTeam.managerId,
        fantasyGoalsFor: officialGoals.home,
        fantasyGoalsAgainst: officialGoals.away,
        fantasyGoalDifference: officialGoals.home - officialGoals.away,
        leaguePoints: leaguePoints.home,
      },
      away: {
        managerId: fixture.awayTeam.managerId,
        fantasyGoalsFor: officialGoals.away,
        fantasyGoalsAgainst: officialGoals.home,
        fantasyGoalDifference: officialGoals.away - officialGoals.home,
        leaguePoints: leaguePoints.away,
      },
    },
    positionComparison: baseResult?.positionComparison ?? {
      goalkeeper: 0,
      defender: 0,
      midfielder: 0,
      forward: 0,
    },
    topPerformers: baseResult?.topPerformers ?? {
      bestPlayer: null,
      worstPlayer: null,
      bestTeamLine: { team: "HOME", position: "goalkeeper", points: 0 },
      worstTeamLine: { team: "HOME", position: "goalkeeper", points: 0 },
      highestScoringTeam: "TIED",
      lowestScoringTeam: "TIED",
    },
  };
}

function updateMatchAnalysis(
  value: unknown,
  adjustedResult: MatchResult,
  manualAdjustments: ReturnType<typeof createFixtureManualAdjustments>,
) {
  const analysis = readMatchAnalysis(value);

  if (!analysis) {
    return value;
  }

  return {
    ...analysis,
    officialScore: { ...adjustedResult.fantasyGoals },
    outcome: adjustedResult.outcome,
    winner: adjustedResult.winner?.side ?? null,
    homeTeam: {
      ...analysis.homeTeam,
      officialScore: adjustedResult.fantasyGoals.home,
      leaguePoints: adjustedResult.leaguePoints.home,
      manualPenaltyPoints: manualAdjustments.homeTotal,
    },
    awayTeam: {
      ...analysis.awayTeam,
      officialScore: adjustedResult.fantasyGoals.away,
      leaguePoints: adjustedResult.leaguePoints.away,
      manualPenaltyPoints: manualAdjustments.awayTotal,
    },
    matchFactors: {
      ...analysis.matchFactors,
      manualPenalties: manualAdjustments.items.map((item) => ({
        side: item.side,
        penalty: {
          managerId: item.managerId,
          competitionId: analysis.competitionId,
          validFromMatchday: analysis.matchday,
          validToMatchday: analysis.matchday,
          points: item.points,
          reason: item.reason,
        },
      })),
    },
  };
}

function createFixtureManualAdjustments(
  fixture: {
    homeTeam: { managerId: string };
    awayTeam: { managerId: string };
  },
  managerSeasons: readonly { id: string; managerId: string }[],
  adjustments: readonly FullAdjustment[],
) {
  const homeManagerSeason = managerSeasons.find(
    (managerSeason) => managerSeason.managerId === fixture.homeTeam.managerId,
  );
  const awayManagerSeason = managerSeasons.find(
    (managerSeason) => managerSeason.managerId === fixture.awayTeam.managerId,
  );
  const items = adjustments.flatMap((adjustment) => {
    const managerSeason = managerSeasons.find(
      (candidate) => candidate.id === adjustment.managerSeasonId,
    );

    if (!managerSeason) {
      return [];
    }

    if (managerSeason.id === homeManagerSeason?.id) {
      return {
        ...adjustment,
        side: "HOME" as const,
        managerId: managerSeason.managerId,
      };
    }

    if (managerSeason.id === awayManagerSeason?.id) {
      return {
        ...adjustment,
        side: "AWAY" as const,
        managerId: managerSeason.managerId,
      };
    }

    return [];
  });

  return {
    homeTotal: items
      .filter((item) => item.side === "HOME")
      .reduce((total, item) => total + item.points, 0),
    awayTotal: items
      .filter((item) => item.side === "AWAY")
      .reduce((total, item) => total + item.points, 0),
    items,
  };
}

function getOutcome(home: number, away: number): MatchOutcome {
  if (home > away) {
    return "HOME_WIN";
  }

  if (home < away) {
    return "AWAY_WIN";
  }

  return "DRAW";
}

function getLeaguePoints(outcome: MatchOutcome) {
  if (outcome === "HOME_WIN") {
    return { home: 3, away: 0 } as const;
  }

  if (outcome === "AWAY_WIN") {
    return { home: 0, away: 3 } as const;
  }

  return { home: 1, away: 1 } as const;
}

function createInvalidTeamScoreContext(
  fixtures: readonly {
    result: {
      calculatedHomeGoals: number;
      calculatedAwayGoals: number;
    } | null;
    homeTeam: { managerId: string };
    awayTeam: { managerId: string };
  }[],
  managerSeasons: readonly { id: string; managerId: string }[],
  adjustments: readonly { managerSeasonId: string; type: ManualAdjustmentType }[],
) {
  const invalidManagerSeasonIds = new Set(
    adjustments
      .filter((adjustment) => adjustment.type === "INVALID_TEAM")
      .map((adjustment) => adjustment.managerSeasonId),
  );
  const managerSeasonByManagerId = new Map(
    managerSeasons.map((managerSeason) => [managerSeason.managerId, managerSeason]),
  );
  const validScores = fixtures.flatMap((fixture) => {
    if (!fixture.result) {
      return [];
    }

    const homeManagerSeason = managerSeasonByManagerId.get(fixture.homeTeam.managerId);
    const awayManagerSeason = managerSeasonByManagerId.get(fixture.awayTeam.managerId);
    const scores: number[] = [];

    if (homeManagerSeason && !invalidManagerSeasonIds.has(homeManagerSeason.id)) {
      scores.push(fixture.result.calculatedHomeGoals);
    }

    if (awayManagerSeason && !invalidManagerSeasonIds.has(awayManagerSeason.id)) {
      scores.push(fixture.result.calculatedAwayGoals);
    }

    return scores;
  });

  return {
    invalidManagerSeasonIds,
    invalidScore: validScores.length > 0 ? Math.min(0, ...validScores) : 0,
  };
}

function isInvalidManagerSeason(
  adjustments: readonly { managerSeasonId: string; type: ManualAdjustmentType }[],
  managerSeasonId: string,
) {
  return adjustments.some(
    (adjustment) =>
      adjustment.type === "INVALID_TEAM" &&
      adjustment.managerSeasonId === managerSeasonId,
  );
}

function getFinalScoreForManager(input: {
  managerSeasonId: string | undefined;
  engineScore: number;
  adjustments: readonly FullAdjustment[];
  invalidScore: number;
}) {
  if (!input.managerSeasonId) {
    return input.engineScore;
  }

  if (isInvalidManagerSeason(input.adjustments, input.managerSeasonId)) {
    return input.invalidScore;
  }

  return (
    input.engineScore +
    sumPointAdjustments(input.adjustments, input.managerSeasonId)
  );
}

function sumPointAdjustments(
  adjustments: readonly { managerSeasonId: string; points: number; type: ManualAdjustmentType }[],
  managerSeasonId: string | undefined,
) {
  if (!managerSeasonId) {
    return 0;
  }

  return adjustments
    .filter(
      (adjustment) =>
        adjustment.managerSeasonId === managerSeasonId &&
        adjustment.type !== "INVALID_TEAM",
    )
    .reduce((total, adjustment) => total + adjustment.points, 0);
}

function readAuditJson(value: unknown): MatchResultAuditJson {
  return value && typeof value === "object" ? { ...value } : {};
}

function toInputJson(value: unknown): Prisma.InputJsonValue | null {
  if (value === undefined) {
    return null;
  }

  return value as Prisma.InputJsonValue;
}

function readStoredOfficialResult(value: unknown): StoredOfficialResult | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<StoredOfficialResult>;

  if (
    !candidate.officialResult ||
    !candidate.calculatedResult ||
    !candidate.officialGoals ||
    !candidate.calculatedGoals
  ) {
    return null;
  }

  return candidate as StoredOfficialResult;
}

function readMatchAnalysis(value: unknown): MatchAnalysis | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<MatchAnalysis>;

  if (
    !candidate.fixtureId ||
    !candidate.homeTeam ||
    !candidate.awayTeam ||
    !candidate.matchFactors
  ) {
    return null;
  }

  return candidate as MatchAnalysis;
}

function readRequiredString(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${key} fehlt.`);
  }

  return value.trim();
}

function readOptionalMatchday(formData: FormData) {
  const value = Number(formData.get("matchday"));

  return Number.isInteger(value) && value >= 1 && value <= 34 ? value : undefined;
}

function readOptionalString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

function readAdjustmentType(formData: FormData): ManualAdjustmentType {
  const value = readRequiredString(formData, "type");

  if (
    value === "TEAM_PENALTY" ||
    value === "POINT_ADJUSTMENT" ||
    value === "BONUS" ||
    value === "OTHER"
  ) {
    return value;
  }

  throw new Error(`Ungültiger Adjustment-Typ: ${value}`);
}

function readPoints(formData: FormData) {
  const value = Number(readRequiredString(formData, "points"));

  if (!Number.isFinite(value) || !Number.isInteger(value) || value === 0) {
    throw new Error("Punkte müssen eine ganze Zahl ungleich 0 sein.");
  }

  return value;
}

function revalidateReviewPaths() {
  revalidatePath("/admin/matchday/review");
  revalidatePath("/admin/matchday");
  revalidatePath("/competitions/erste-liga");
  revalidatePath("/team/overview");
  revalidatePath("/team/spiele");
}

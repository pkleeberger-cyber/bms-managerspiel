import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createMatchAnalysis } from "@/domain/match-analysis-engine";
import type { MatchAnalysis } from "@/domain/match-analysis-engine";
import {
  calculateLeagueStoryFromUpdatedTable,
  calculateLeagueTable,
} from "@/domain/league-engine";
import { calculateMatchResult } from "@/domain/match-engine";
import type { MatchTeamSide } from "@/domain/match-engine";
import {
  OfficialMatchdayValidationError,
  processOfficialMatchday,
} from "@/domain/matchday-engine";
import type {
  CalculatedFixtureLineups,
  OfficialMatchdayResult,
  ProcessOfficialMatchdayInput,
} from "@/domain/matchday-engine";
import { applyRulesToMatchday } from "@/domain/rules-engine";
import type { BmsRule } from "@/domain/rules-engine";
import type { MatchResult } from "@/domain/match-engine";
import type {
  CalculatedMatchLineupResult,
  CalculatedPlayer,
  InvalidMatchLineupResult,
  ManagerSquadAssignment,
  PlayerMatchData,
  SquadAssignmentReason,
} from "@/domain/lineup-engine";
import {
  calculateMatchLineup,
  OFFICIAL_LINEUP_IDS,
  OFFICIAL_STARTER_IDS,
  getPositionForLineupId,
} from "@/domain/lineup-engine";
import { MatchdayValidationError } from "@/domain/matchday-engine";
import {
  loadMatchdayLineupPreflight,
  type MatchdayLineupPreflightReport,
} from "@/application/matchday-lineup-preflight-service";
import { getPrismaClient } from "@/infrastructure/prisma";

const expectedFixtureCount = 9;
const totalMatchdays = 34;

export type MatchdayZeroPlayerEntry = {
  playerId: string;
  displayName: string;
  club: string;
  position: string;
  managerCount: number;
  rating: number | null;
  goals: number;
  yellowRed: boolean;
  red: boolean;
  teamOfTheWeek: boolean;
  status: "OPEN" | "SAVED";
};

export type MatchdayZeroDataEntrySnapshot = {
  seasonName: string;
  competitionName: string;
  matchday: number;
  relevantPlayers: readonly MatchdayZeroPlayerEntry[];
  savedCount: number;
  openCount: number;
  fixtureCount: number;
};

export type MatchdayZeroCalculationResult = {
  status: "CALCULATED" | "BLOCKED";
  message: string;
  missingPlayers: readonly MatchdayZeroPlayerEntry[];
  lineupPreflight: MatchdayLineupPreflightReport | null;
  calculatedMatches: number;
  officialMatches: number;
  comparisonReportPath: string | null;
};

type MatchdayZeroContext = {
  season: { id: string; name: string };
  competition: { id: string; name: string };
};

type InvalidTeamOverride = {
  id: string;
  managerSeasonId: string;
  managerId: string;
  managerName: string;
  reason: string;
  createdAt: string;
  createdBy: string | null;
};

type FixtureLineupsWithInvalid = {
  fixtureId: string;
  homeTeam: CalculatedMatchLineupResult | InvalidMatchLineupResult;
  awayTeam: CalculatedMatchLineupResult | InvalidMatchLineupResult;
};

type TableJsonRow = {
  rank?: number;
  managerId: string;
  teamId: string;
  managerName: string;
  played?: number;
  wins?: number;
  draws?: number;
  losses?: number;
  goalsFor?: number;
  goalsAgainst?: number;
  goalDifference?: number;
  points?: number;
  form?: string[];
};

export class MatchdayZeroService {
  private readonly prisma = getPrismaClient();

  constructor(private readonly matchday = 1) {}

  async loadDataEntry(): Promise<MatchdayZeroDataEntrySnapshot> {
    const context = await this.loadContext();
    const [relevantPlayers, fixtureCount] = await Promise.all([
      this.loadRelevantPlayers(context),
      this.prisma!.fixture.count({
        where: {
          competitionId: context.competition.id,
          matchday: this.matchday,
        },
      }),
    ]);

    return {
      seasonName: context.season.name,
      competitionName: context.competition.name,
      matchday: this.matchday,
      relevantPlayers,
      savedCount: relevantPlayers.filter((player) => player.status === "SAVED")
        .length,
      openCount: relevantPlayers.filter((player) => player.status === "OPEN")
        .length,
      fixtureCount,
    };
  }

  async savePlayerMatchData(formData: FormData): Promise<void> {
    const context = await this.loadContext();
    const relevantPlayers = await this.loadRelevantPlayers(context);
    const submittedPlayers = resolveSubmittedPlayerRowsForSave(
      formData,
      relevantPlayers,
    );

    await this.prisma!.$transaction(
      submittedPlayers.map((player) =>
        this.prisma!.playerMatchData.upsert({
          where: {
            seasonId_matchday_playerId: {
              seasonId: context.season.id,
              matchday: this.matchday,
              playerId: player.playerId,
            },
          },
          update: {
            rating: readRating(formData, player.playerId),
            goals: readNumber(formData, `${player.playerId}:goals`),
            yellowRed: formData.get(`${player.playerId}:yellowRed`) === "on",
            red: formData.get(`${player.playerId}:red`) === "on",
            teamOfTheWeek:
              formData.get(`${player.playerId}:teamOfTheWeek`) === "on",
            source: "ADMIN",
          },
          create: {
            seasonId: context.season.id,
            matchday: this.matchday,
            playerId: player.playerId,
            rating: readRating(formData, player.playerId),
            goals: readNumber(formData, `${player.playerId}:goals`),
            yellowRed: formData.get(`${player.playerId}:yellowRed`) === "on",
            red: formData.get(`${player.playerId}:red`) === "on",
            teamOfTheWeek:
              formData.get(`${player.playerId}:teamOfTheWeek`) === "on",
            source: "ADMIN",
          },
        }),
      ),
    );

    const club = readOptionalFormString(formData, "club");
    const redirectParams = new URLSearchParams({
      matchday: String(this.matchday),
      saved: "1",
      savedCount: String(submittedPlayers.length),
    });

    if (club) {
      redirectParams.set("club", club);
    }

    revalidatePath(`/admin/matchday/data-entry?matchday=${this.matchday}`);
    revalidatePath(`/admin/matchday/calculate?matchday=${this.matchday}`);
    redirect(`/admin/matchday/data-entry?${redirectParams.toString()}`);
  }

  async calculate(): Promise<MatchdayZeroCalculationResult> {
    const context = await this.loadContext();
    const relevantPlayers = await this.loadRelevantPlayers(context);
    const missingPlayers = relevantPlayers.filter(
      (player) => player.status === "OPEN",
    );

    if (missingPlayers.length > 0) {
      return {
        status: "BLOCKED",
        message: `${missingPlayers.length} relevante PlayerMatchData-Einträge fehlen.`,
        missingPlayers,
        lineupPreflight: null,
        calculatedMatches: 0,
        officialMatches: 0,
        comparisonReportPath: null,
      };
    }

    const lineupPreflight = await loadMatchdayLineupPreflight(this.matchday, {
      writeReports: true,
    });

    const input = await this.createOfficialInput(context);
    const invalidTeamOverrides = await this.loadInvalidTeamOverrides(context);
    const officialMatchday = invalidTeamOverrides.length > 0
      ? this.processOfficialMatchdayWithInvalidTeams(input, invalidTeamOverrides)
      : processOfficialMatchday(input);
    const matchAnalyses = this.createMatchAnalyses(
      officialMatchday,
      input,
      invalidTeamOverrides,
    );

    await this.persistOfficialMatchday(context, officialMatchday, matchAnalyses);

    safeRevalidatePath("/admin/matchday");
    safeRevalidatePath("/admin/matchday/calculate");
    safeRevalidatePath("/competitions/erste-liga");
    safeRevalidatePath("/team/overview");
    safeRevalidatePath("/team/spiele");

    return {
      status: "CALCULATED",
      message: lineupPreflight.missingSlotCount > 0
        ? `Spieltag ${this.matchday} wurde mit offenen Hinweisen berechnet. ${createOpenLineupDecisionMessage(lineupPreflight)}`
        : `Spieltag ${this.matchday} wurde aus Living-Daten berechnet.`,
      missingPlayers: [],
      lineupPreflight,
      calculatedMatches: officialMatchday.metadata.calculatedMatchCount,
      officialMatches: officialMatchday.metadata.officialMatchCount,
      comparisonReportPath: null,
    };
  }

  private async loadContext(): Promise<MatchdayZeroContext> {
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

    return {
      season: { id: season.id, name: season.name },
      competition: { id: competition.id, name: competition.name },
    };
  }

  private async loadRelevantPlayers(
    context: MatchdayZeroContext,
  ): Promise<readonly MatchdayZeroPlayerEntry[]> {
    const [assignments, existingMatchData, departureEffectiveFromByPlayerId] =
      await Promise.all([
        this.prisma!.squadAssignment.findMany({
          where: {
            managerSeason: {
              seasonId: context.season.id,
              league: "FIRST",
              status: "ACTIVE",
              participation: "ACTIVE",
            },
            validFromMatchday: { lte: this.matchday },
            OR: [
              { validToMatchday: null },
              { validToMatchday: { gte: this.matchday } },
            ],
          },
          include: {
            player: true,
          },
          orderBy: [{ player: { displayName: "asc" } }, { slotId: "asc" }],
        }),
        this.prisma!.playerMatchData.findMany({
          where: {
            seasonId: context.season.id,
            matchday: this.matchday,
          },
        }),
        this.loadDepartureEffectiveFromByPlayerId(context),
      ]);
    const existingByPlayerId = new Map(
      existingMatchData.map((entry) => [entry.playerId, entry]),
    );
    const playersById = new Map<string, MatchdayZeroPlayerEntry>();

    for (const assignment of assignments) {
      if (
        !isPlayerUsableForMatchday({
          effectiveFromMatchday: departureEffectiveFromByPlayerId.get(
            assignment.playerId,
          ),
          matchday: this.matchday,
          playerStatus: assignment.player.status,
        })
      ) {
        continue;
      }

      const existing = playersById.get(assignment.playerId);
      const matchData = existingByPlayerId.get(assignment.playerId);

      if (existing) {
        playersById.set(assignment.playerId, {
          ...existing,
          managerCount: existing.managerCount + 1,
        });
        continue;
      }

      playersById.set(assignment.playerId, {
        playerId: assignment.playerId,
        displayName: assignment.player.displayName,
        club: assignment.player.bundesligaClub,
        position: assignment.player.positionGroup,
        managerCount: 1,
        rating: matchData?.rating ?? null,
        goals: matchData?.goals ?? 0,
        yellowRed: matchData?.yellowRed ?? false,
        red: matchData?.red ?? false,
        teamOfTheWeek: matchData?.teamOfTheWeek ?? false,
        status: matchData ? "SAVED" : "OPEN",
      });
    }

    return [...playersById.values()].sort((first, second) =>
      first.displayName.localeCompare(second.displayName, "de"),
    );
  }

  private async createOfficialInput(
    context: MatchdayZeroContext,
  ): Promise<ProcessOfficialMatchdayInput> {
    const [
      fixtures,
      squadAssignments,
      playerMatchData,
      previousTable,
      rules,
    ] = await Promise.all([
      this.loadFixtures(context),
      this.loadSquadAssignments(context),
      this.loadPlayerMatchData(context),
      this.loadPreviousTable(context),
      this.loadRules(context),
    ]);
    const now = new Date().toISOString();

    return {
      competition: {
        id: context.competition.id,
        totalMatchdays,
        pointsPerWin: 3,
        europeRanks: [1, 2, 3, 4],
        relegationRanks: [16, 17, 18],
      },
      matchday: this.matchday,
      previousLeagueTable: previousTable,
      fixtures,
      squadAssignments,
      kickerMatchData: playerMatchData,
      manualPenalties: [],
      teamValidity: previousTable.map((row) => ({
        managerId: row.managerId,
        validity: "VALID",
      })),
      rules,
      calculationTimestamp: now,
      publicationTimestamp: now,
    };
  }

  private processOfficialMatchdayWithInvalidTeams(
    input: ProcessOfficialMatchdayInput,
    invalidTeamOverrides: readonly InvalidTeamOverride[],
  ): OfficialMatchdayResult {
    const invalidManagerIds = new Set(
      invalidTeamOverrides.map((override) => override.managerId),
    );
    const calculatedLineups = input.fixtures.map((fixture) =>
      this.calculateFixtureLineupsWithInvalidTeams(
        input,
        fixture,
        invalidManagerIds,
      ),
    );
    const matchResults = calculatedLineups.map((fixtureLineups) =>
      createMatchResultWithInvalidTeams(
        input.competition.id,
        input.matchday,
        fixtureLineups,
      ),
    );
    const calculatedTable = calculateLeagueTable({
      previousLeagueTable: input.previousLeagueTable,
      matchResults,
      competitionId: input.competition.id,
      matchday: input.matchday,
    });
    const calculatedStory = calculateLeagueStoryFromUpdatedTable({
      competition: input.competition,
      matchday: input.matchday,
      previousLeagueTable: input.previousLeagueTable,
      matchResults,
      updatedLeagueTable: calculatedTable,
    });
    const validScores = calculatedLineups.flatMap((fixture) => [
      ...(fixture.homeTeam.calculationStatus === "CALCULATED"
        ? [fixture.homeTeam.team.totalPoints]
        : []),
      ...(fixture.awayTeam.calculationStatus === "CALCULATED"
        ? [fixture.awayTeam.team.totalPoints]
        : []),
    ]);
    const invalidScore = validScores.length > 0 ? Math.min(0, ...validScores) : 0;
    const invalidRules = invalidTeamOverrides.map((override): BmsRule => ({
      id: override.id,
      type: "TEAM_INVALID",
      competitionId: input.competition.id,
      validFromMatchday: input.matchday,
      validToMatchday: input.matchday,
      reason: override.reason,
      createdAt: override.createdAt,
      ...(override.createdBy ? { administrator: override.createdBy } : {}),
      managerId: override.managerId,
      invalidFantasyGoals: invalidScore,
    }));
    const calculatedMatchday = {
      competition: { ...input.competition },
      matchday: input.matchday,
      calculatedLineups: calculatedLineups as unknown as CalculatedFixtureLineups[],
      matchResults,
      updatedLeagueTable: calculatedTable,
      leagueContext: calculatedStory.leagueContext,
      allEvents: calculatedStory.allGeneratedEvents,
      heroEvent: calculatedStory.heroEvent,
      calculationTimestamp: input.calculationTimestamp,
    };
    const rulesResult = applyRulesToMatchday({
      calculatedMatchday,
      rules: [...input.rules, ...invalidRules],
      publicationTimestamp: input.publicationTimestamp,
    });
    const officialMatchResults = rulesResult.officialResults.map(
      (result) => result.officialResult,
    );
    const officialLeagueTable = calculateLeagueTable({
      previousLeagueTable: input.previousLeagueTable,
      matchResults: officialMatchResults,
      competitionId: input.competition.id,
      matchday: input.matchday,
    });
    const officialStory = calculateLeagueStoryFromUpdatedTable({
      competition: input.competition,
      matchday: input.matchday,
      previousLeagueTable: input.previousLeagueTable,
      matchResults: officialMatchResults,
      updatedLeagueTable: officialLeagueTable,
    });

    return {
      calculatedMatchday,
      officialResults: rulesResult.officialResults,
      officialLeagueTable,
      officialLeagueContext: officialStory.leagueContext,
      officialEvents: officialStory.allGeneratedEvents,
      heroEvent: officialStory.heroEvent,
      appliedRules: rulesResult.appliedRules,
      ruleLog: rulesResult.ruleLog,
      auditTrail: rulesResult.auditTrail,
      metadata: {
        competitionId: input.competition.id,
        matchday: input.matchday,
        calculationTimestamp: input.calculationTimestamp,
        publicationTimestamp: input.publicationTimestamp,
        calculatedMatchCount: calculatedLineups.length,
        officialMatchCount: rulesResult.officialResults.length,
      },
    };
  }

  private calculateFixtureLineupsWithInvalidTeams(
    input: ProcessOfficialMatchdayInput,
    fixture: ProcessOfficialMatchdayInput["fixtures"][number],
    invalidManagerIds: ReadonlySet<string>,
  ): FixtureLineupsWithInvalid {
    return {
      fixtureId: fixture.fixtureId,
      homeTeam: invalidManagerIds.has(fixture.homeManagerId)
        ? createInvalidLineup(input, fixture.homeManagerId)
        : calculateMatchLineup({
            managerId: fixture.homeManagerId,
            competitionId: input.competition.id,
            matchday: input.matchday,
            teamValidity: "VALID",
            assignments: input.squadAssignments,
            matchData: input.kickerMatchData,
            penalties: input.manualPenalties,
            scoringConfig: input.scoringConfig,
          }),
      awayTeam: invalidManagerIds.has(fixture.awayManagerId)
        ? createInvalidLineup(input, fixture.awayManagerId)
        : calculateMatchLineup({
            managerId: fixture.awayManagerId,
            competitionId: input.competition.id,
            matchday: input.matchday,
            teamValidity: "VALID",
            assignments: input.squadAssignments,
            matchData: input.kickerMatchData,
            penalties: input.manualPenalties,
            scoringConfig: input.scoringConfig,
          }),
    };
  }

  private createMatchAnalyses(
    officialMatchday: OfficialMatchdayResult,
    input: ProcessOfficialMatchdayInput,
    invalidTeamOverrides: readonly InvalidTeamOverride[],
  ) {
    return officialMatchday.officialResults.map((result) => {
      const fixture = input.fixtures.find(
        (candidate) =>
          candidate.homeManagerId === result.teams.home.managerId &&
          candidate.awayManagerId === result.teams.away.managerId,
      );

      if (!fixture) {
        throw new Error("Calculated result without fixture mapping.");
      }

      const calculatedLineups = (
        officialMatchday.calculatedMatchday.calculatedLineups as unknown as FixtureLineupsWithInvalid[]
      ).find(
        (candidate) => candidate.fixtureId === fixture.fixtureId,
      );

      if (
        calculatedLineups?.homeTeam.calculationStatus === "SKIPPED_INVALID_TEAM" ||
        calculatedLineups?.awayTeam.calculationStatus === "SKIPPED_INVALID_TEAM"
      ) {
        return createInvalidTeamMatchAnalysis(
          officialMatchday,
          fixture.fixtureId,
          invalidTeamOverrides,
        );
      }

      return createMatchAnalysis(officialMatchday, fixture.fixtureId);
    });
  }

  private async loadFixtures(context: MatchdayZeroContext) {
    const fixtures = await this.prisma!.fixture.findMany({
      where: {
        competitionId: context.competition.id,
        matchday: this.matchday,
      },
      include: {
        homeTeam: true,
        awayTeam: true,
      },
      orderBy: { id: "asc" },
    });

    if (fixtures.length !== expectedFixtureCount) {
      throw new Error(
        `Spieltag ${this.matchday} benötigt ${expectedFixtureCount} Fixtures, gefunden ${fixtures.length}.`,
      );
    }

    return fixtures.map((fixture) => ({
      fixtureId: fixture.id,
      homeManagerId: fixture.homeTeam.managerId,
      awayManagerId: fixture.awayTeam.managerId,
    }));
  }

  private async loadSquadAssignments(
    context: MatchdayZeroContext,
  ): Promise<ManagerSquadAssignment[]> {
    const [assignments, departureEffectiveFromByPlayerId] = await Promise.all([
      this.prisma!.squadAssignment.findMany({
        where: {
          managerSeason: {
            seasonId: context.season.id,
            league: "FIRST",
            status: "ACTIVE",
            participation: "ACTIVE",
          },
          validFromMatchday: { lte: this.matchday },
          OR: [
            { validToMatchday: null },
            { validToMatchday: { gte: this.matchday } },
          ],
        },
        include: {
          managerSeason: true,
          player: true,
        },
        orderBy: [{ managerSeasonId: "asc" }, { slotId: "asc" }],
      }),
      this.loadDepartureEffectiveFromByPlayerId(context),
    ]);

    return assignments
      .filter((assignment) =>
        isPlayerUsableForMatchday({
          effectiveFromMatchday: departureEffectiveFromByPlayerId.get(
            assignment.playerId,
          ),
          matchday: this.matchday,
          playerStatus: assignment.player.status,
        }),
      )
      .map((assignment) => ({
        managerId: assignment.managerSeason?.managerId ?? "",
        competitionId: context.competition.id,
        playerId: assignment.playerId,
        playerName: assignment.player.displayName,
        slotId: assignment.slotId as ManagerSquadAssignment["slotId"],
        validFromMatchday: assignment.validFromMatchday,
        validToMatchday: assignment.validToMatchday,
        reason: mapSquadAssignmentReason(assignment.reason),
      }));
  }

  private async loadDepartureEffectiveFromByPlayerId(
    context: MatchdayZeroContext,
  ) {
    const events = await this.prisma!.playerDepartureEvent.findMany({
      where: {
        status: "ACTIVE",
        batch: {
          seasonId: context.season.id,
          status: "RELEASED",
        },
      },
      include: { batch: true },
    });
    const effectiveFromByPlayerId = new Map<string, number>();

    for (const event of events) {
      if (event.batch.effectiveFromMatchday === null) {
        continue;
      }

      const existing = effectiveFromByPlayerId.get(event.playerId);

      if (
        existing === undefined ||
        event.batch.effectiveFromMatchday < existing
      ) {
        effectiveFromByPlayerId.set(
          event.playerId,
          event.batch.effectiveFromMatchday,
        );
      }
    }

    return effectiveFromByPlayerId;
  }

  private async loadPlayerMatchData(
    context: MatchdayZeroContext,
  ): Promise<PlayerMatchData[]> {
    const rows = await this.prisma!.playerMatchData.findMany({
      where: {
        seasonId: context.season.id,
        matchday: this.matchday,
      },
      orderBy: { playerId: "asc" },
    });

    return rows.map((row) => ({
      playerId: row.playerId,
      kickerRating: row.rating,
      goals: row.goals,
      yellowRedCard: row.yellowRed,
      redCard: row.red,
      teamOfTheWeek: row.teamOfTheWeek,
    }));
  }

  private async loadPreviousTable(context: MatchdayZeroContext) {
    const snapshot = await this.prisma!.leagueTableSnapshot.findUnique({
      where: {
        competitionId_matchday: {
          competitionId: context.competition.id,
          matchday: this.matchday - 1,
        },
      },
    });
    const rows = asTableRows(snapshot?.tableJson);

    if (rows.length === 0) {
      throw new Error(`Tabelle für Matchday ${this.matchday - 1} fehlt.`);
    }

    return rows.map((row, index) => ({
      position: row.rank ?? index + 1,
      managerId: row.managerId,
      teamId: row.teamId,
      teamName: row.managerName,
      managerName: row.managerName,
      matchesPlayed: row.played ?? 0,
      wins: row.wins ?? 0,
      draws: row.draws ?? 0,
      losses: row.losses ?? 0,
      fantasyGoalsFor: row.goalsFor ?? 0,
      fantasyGoalsAgainst: row.goalsAgainst ?? 0,
      fantasyGoalDifference: row.goalDifference ?? 0,
      leaguePoints: row.points ?? 0,
      formLastFive: [],
    }));
  }

  private async loadRules(context: MatchdayZeroContext) {
    const rules = await this.prisma!.appliedRule.findMany({
      where: {
        competitionId: context.competition.id,
        matchday: this.matchday,
      },
      orderBy: { createdAt: "asc" },
    });

    return rules.map((rule) => ({
      id: rule.id,
      type: rule.type,
      competitionId: rule.competitionId,
      validFromMatchday: rule.matchday,
      validToMatchday: rule.matchday,
      reason: rule.reason,
      createdAt: rule.createdAt.toISOString(),
      ...(rule.valueJson as Record<string, unknown>),
    })) as ProcessOfficialMatchdayInput["rules"];
  }

  private async loadInvalidTeamOverrides(
    context: MatchdayZeroContext,
  ): Promise<InvalidTeamOverride[]> {
    const overrides = await this.prisma!.manualMatchdayAdjustment.findMany({
      where: {
        seasonId: context.season.id,
        competitionId: context.competition.id,
        matchday: this.matchday,
        type: "INVALID_TEAM",
        status: "ACTIVE",
      },
      include: {
        managerSeason: { include: { manager: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    return overrides.map((override) => ({
      id: override.id,
      managerSeasonId: override.managerSeasonId,
      managerId: override.managerSeason.managerId,
      managerName: override.managerSeason.manager.displayName,
      reason: override.reason,
      createdAt: override.createdAt.toISOString(),
      createdBy: override.createdBy,
    }));
  }

  private async persistOfficialMatchday(
    context: MatchdayZeroContext,
    officialMatchday: ReturnType<typeof processOfficialMatchday>,
    matchAnalyses: readonly unknown[],
  ) {
    await this.prisma!.$transaction(async (tx) => {
      for (const result of officialMatchday.officialResults) {
        const fixture = await tx.fixture.findFirst({
          where: {
            competitionId: context.competition.id,
            matchday: this.matchday,
            homeTeam: { managerId: result.teams.home.managerId },
            awayTeam: { managerId: result.teams.away.managerId },
          },
        });

        if (!fixture) {
          throw new Error("Fixture fehlt für berechnetes Ergebnis.");
        }

        await tx.matchResult.upsert({
          where: { fixtureId: fixture.id },
          update: {
            calculatedHomeGoals: result.calculatedGoals.home,
            calculatedAwayGoals: result.calculatedGoals.away,
            officialHomeGoals: result.officialGoals.home,
            officialAwayGoals: result.officialGoals.away,
            status: "CALCULATED",
            auditJson: {
              officialResult: result,
              matchAnalysis: matchAnalyses.find(
                (analysis) =>
                  typeof analysis === "object" &&
                  analysis !== null &&
                  "fixtureId" in analysis &&
                  analysis.fixtureId === fixture.id,
              ) ?? null,
            },
          },
          create: {
            fixtureId: fixture.id,
            calculatedHomeGoals: result.calculatedGoals.home,
            calculatedAwayGoals: result.calculatedGoals.away,
            officialHomeGoals: result.officialGoals.home,
            officialAwayGoals: result.officialGoals.away,
            status: "CALCULATED",
            auditJson: {
              officialResult: result,
              matchAnalysis: matchAnalyses.find(
                (analysis) =>
                  typeof analysis === "object" &&
                  analysis !== null &&
                  "fixtureId" in analysis &&
                  analysis.fixtureId === fixture.id,
              ) ?? null,
            },
          },
        });

        await tx.fixture.update({
          where: { id: fixture.id },
          data: { status: "CALCULATED" },
        });
      }

      await tx.leagueTableSnapshot.upsert({
        where: {
          competitionId_matchday: {
            competitionId: context.competition.id,
            matchday: this.matchday,
          },
        },
        update: {
          tableJson: officialMatchday.officialLeagueTable,
        },
        create: {
          competitionId: context.competition.id,
          matchday: this.matchday,
          tableJson: officialMatchday.officialLeagueTable,
        },
      });

      const lifecycle = await tx.matchdayLifecycle.upsert({
        where: {
          competitionId_matchday: {
            competitionId: context.competition.id,
            matchday: this.matchday,
          },
        },
        update: {
          status: "CALCULATED",
          lastCalculationAt: new Date(officialMatchday.metadata.calculationTimestamp),
          correctionPending: false,
        },
        create: {
          seasonId: context.season.id,
          competitionId: context.competition.id,
          matchday: this.matchday,
          status: "CALCULATED",
          lastCalculationAt: new Date(officialMatchday.metadata.calculationTimestamp),
          correctionPending: false,
        },
      });
      const existingVersions = await tx.matchdayVersion.count({
        where: {
          competitionId: context.competition.id,
          matchday: this.matchday,
        },
      });
      const version = await tx.matchdayVersion.create({
        data: {
          lifecycleId: lifecycle.id,
          seasonId: context.season.id,
          competitionId: context.competition.id,
          matchday: this.matchday,
          versionNumber: existingVersions + 1,
          status: "CALCULATED",
          createdBy: "matchday-zero",
          reason: "Living Matchday calculation from Prisma data.",
          calculationSnapshotJson: officialMatchday.calculatedMatchday,
          officialMatchdayJson: officialMatchday,
        },
      });

      await tx.matchdayLifecycle.update({
        where: { id: lifecycle.id },
        data: {
          latestVersionId: version.id,
          status: "CALCULATED",
        },
      });
    });
  }
}

function mapSquadAssignmentReason(reason: string): SquadAssignmentReason {
  if (reason === "SUMMER_TRANSFER") {
    return "INITIAL_SQUAD";
  }

  if (
    reason === "INITIAL_SQUAD" ||
    reason === "REAL_TRANSFER_REPLACEMENT" ||
    reason === "WINTER_TRANSFER" ||
    reason === "ADMIN_CORRECTION"
  ) {
    return reason;
  }

  return "ADMIN_CORRECTION";
}

function isPlayerUsableForMatchday(input: {
  effectiveFromMatchday: number | undefined;
  matchday: number;
  playerStatus: string;
}) {
  if (input.playerStatus !== "LEFT_BUNDESLIGA") {
    return true;
  }

  return (
    input.effectiveFromMatchday !== undefined &&
    input.effectiveFromMatchday > input.matchday
  );
}

function createInvalidLineup(
  input: ProcessOfficialMatchdayInput,
  managerId: string,
): InvalidMatchLineupResult {
  return {
    managerId,
    competitionId: input.competition.id,
    matchday: input.matchday,
    teamValidity: "INVALID",
    calculationStatus: "SKIPPED_INVALID_TEAM",
    effectiveSquad: {
      managerId,
      competitionId: input.competition.id,
      matchday: input.matchday,
      players: [],
    },
    appliedPenalties: [],
    evaluatedPlayers: [],
    team: null,
    replacements: [],
    statistics: null,
  };
}

function createMatchResultWithInvalidTeams(
  competitionId: string,
  matchday: number,
  fixtureLineups: FixtureLineupsWithInvalid,
): MatchResult {
  if (
    fixtureLineups.homeTeam.calculationStatus === "CALCULATED" &&
    fixtureLineups.awayTeam.calculationStatus === "CALCULATED"
  ) {
    return calculateMatchResult({
      homeTeam: fixtureLineups.homeTeam,
      awayTeam: fixtureLineups.awayTeam,
      competitionId,
      matchday,
    });
  }

  const homeGoals = getLineupCalculatedScore(fixtureLineups.homeTeam);
  const awayGoals = getLineupCalculatedScore(fixtureLineups.awayTeam);
  const outcome = getOutcome(homeGoals, awayGoals);
  const leaguePoints = getLeaguePoints(outcome);

  return {
    competitionId,
    matchday,
    outcome,
    winner:
      outcome === "DRAW"
        ? null
        : {
            side: outcome === "HOME_WIN" ? "HOME" : "AWAY",
            managerId:
              outcome === "HOME_WIN"
                ? fixtureLineups.homeTeam.managerId
                : fixtureLineups.awayTeam.managerId,
          },
    fantasyGoals: {
      home: homeGoals,
      away: awayGoals,
    },
    leaguePoints,
    teams: {
      home: {
        managerId: fixtureLineups.homeTeam.managerId,
        fantasyGoalsFor: homeGoals,
        fantasyGoalsAgainst: awayGoals,
        fantasyGoalDifference: homeGoals - awayGoals,
        leaguePoints: leaguePoints.home,
      },
      away: {
        managerId: fixtureLineups.awayTeam.managerId,
        fantasyGoalsFor: awayGoals,
        fantasyGoalsAgainst: homeGoals,
        fantasyGoalDifference: awayGoals - homeGoals,
        leaguePoints: leaguePoints.away,
      },
    },
    positionComparison: {
      goalkeeper: getLineupPositionScore(fixtureLineups.homeTeam, "goalkeeper") -
        getLineupPositionScore(fixtureLineups.awayTeam, "goalkeeper"),
      defender: getLineupPositionScore(fixtureLineups.homeTeam, "defender") -
        getLineupPositionScore(fixtureLineups.awayTeam, "defender"),
      midfielder: getLineupPositionScore(fixtureLineups.homeTeam, "midfielder") -
        getLineupPositionScore(fixtureLineups.awayTeam, "midfielder"),
      forward: getLineupPositionScore(fixtureLineups.homeTeam, "forward") -
        getLineupPositionScore(fixtureLineups.awayTeam, "forward"),
    },
    topPerformers: {
      bestPlayer: null,
      worstPlayer: null,
      bestTeamLine: { team: "HOME", position: "goalkeeper", points: 0 },
      worstTeamLine: { team: "HOME", position: "goalkeeper", points: 0 },
      highestScoringTeam: homeGoals === awayGoals ? "TIED" : homeGoals > awayGoals ? "HOME" : "AWAY",
      lowestScoringTeam: homeGoals === awayGoals ? "TIED" : homeGoals < awayGoals ? "HOME" : "AWAY",
    },
  };
}

function createInvalidTeamMatchAnalysis(
  matchday: OfficialMatchdayResult,
  fixtureId: string,
  invalidTeamOverrides: readonly InvalidTeamOverride[],
): MatchAnalysis {
  const fixture = matchday.calculatedMatchday.calculatedLineups.find(
    (candidate) => candidate.fixtureId === fixtureId,
  );
  const officialResult = fixture
    ? matchday.officialResults.find(
        (result) =>
          result.teams.home.managerId === fixture.homeTeam.managerId &&
          result.teams.away.managerId === fixture.awayTeam.managerId,
      )
    : null;

  if (!fixture || !officialResult) {
    throw new Error(`Invalid-team analysis cannot resolve fixture ${fixtureId}.`);
  }

  const homeInvalid = invalidTeamOverrides.find(
    (override) => override.managerId === fixture.homeTeam.managerId,
  );
  const awayInvalid = invalidTeamOverrides.find(
    (override) => override.managerId === fixture.awayTeam.managerId,
  );
  const homeTeam = createInvalidAnalysisTeam(
    matchday,
    fixture.homeTeam,
    officialResult,
    "home",
    homeInvalid,
  );
  const awayTeam = createInvalidAnalysisTeam(
    matchday,
    fixture.awayTeam,
    officialResult,
    "away",
    awayInvalid,
  );
  const homePlayers = fixture.homeTeam.calculationStatus === "CALCULATED"
    ? fixture.homeTeam.evaluatedPlayers.map(toInvalidAnalysisPlayer)
    : [];
  const awayPlayers = fixture.awayTeam.calculationStatus === "CALCULATED"
    ? fixture.awayTeam.evaluatedPlayers.map(toInvalidAnalysisPlayer)
    : [];
  const playerComparisons = createInvalidPlayerComparisons(homePlayers, awayPlayers);
  const bestPlayerHome = selectInvalidAnalysisPlayer(homePlayers, "BEST");
  const bestPlayerAway = selectInvalidAnalysisPlayer(awayPlayers, "BEST");
  const worstPlayerHome = selectInvalidAnalysisPlayer(homePlayers, "WORST");
  const worstPlayerAway = selectInvalidAnalysisPlayer(awayPlayers, "WORST");
  const positionAnalysis = [
    createPositionDuel(fixture, "goalkeeper"),
    createPositionDuel(fixture, "defender"),
    createPositionDuel(fixture, "midfielder"),
    createPositionDuel(fixture, "forward"),
  ];

  return {
    fixtureId,
    competitionId: matchday.metadata.competitionId,
    matchday: matchday.metadata.matchday,
    calculationTimestamp: matchday.metadata.calculationTimestamp,
    publicationTimestamp: matchday.metadata.publicationTimestamp,
    homeTeam,
    awayTeam,
    officialScore: { ...officialResult.officialGoals },
    calculatedScore: { ...officialResult.calculatedGoals },
    outcome: officialResult.outcome,
    winner: officialResult.winner?.side ?? null,
    players: { home: homePlayers, away: awayPlayers },
    playerComparisons,
    positionAnalysis,
    matchWinners: {
      bestPlayerHome,
      bestPlayerAway,
      overallMatchwinner: selectInvalidOverallMatchwinner(bestPlayerHome, bestPlayerAway),
      worstPlayerHome,
      worstPlayerAway,
      biggestIndividualDuel: selectInvalidBiggestDuel(playerComparisons),
    },
    matchFactors: {
      largestPositionAdvantage: selectInvalidPositionAdvantage(positionAnalysis, "HIGHEST"),
      largestPositionDisadvantage: selectInvalidPositionAdvantage(positionAnalysis, "LOWEST"),
      highestScoringLine: selectInvalidScoringLine(positionAnalysis, "HIGHEST"),
      lowestScoringLine: selectInvalidScoringLine(positionAnalysis, "LOWEST"),
      replacementPlayerCount: [...homePlayers, ...awayPlayers].filter(
        (player) => player.wasReplacement,
      ).length,
      missingPositions: [],
      lineupWarnings: [
        ...(fixture.homeTeam.calculationStatus === "CALCULATED"
          ? getInvalidAnalysisLineupWarnings(fixture.homeTeam, "HOME")
          : []),
        ...(fixture.awayTeam.calculationStatus === "CALCULATED"
          ? getInvalidAnalysisLineupWarnings(fixture.awayTeam, "AWAY")
          : []),
      ],
      appliedRules: matchday.appliedRules
        .filter((rule) => officialResult.appliedRuleIds.includes(rule.id))
        .map((rule) => ({
          rule,
          audit: matchday.auditTrail.find((entry) => entry.ruleId === rule.id) ?? null,
        })),
      manualPenalties: [
        ...(homeInvalid
          ? [{
              side: "HOME" as const,
              penalty: {
                managerId: homeInvalid.managerId,
                competitionId: matchday.metadata.competitionId,
                validFromMatchday: matchday.metadata.matchday,
                validToMatchday: matchday.metadata.matchday,
                points: officialResult.officialGoals.home -
                  officialResult.calculatedGoals.home,
                reason: `Team ungültig: ${homeInvalid.reason}`,
              },
            }]
          : []),
        ...(awayInvalid
          ? [{
              side: "AWAY" as const,
              penalty: {
                managerId: awayInvalid.managerId,
                competitionId: matchday.metadata.competitionId,
                validFromMatchday: matchday.metadata.matchday,
                validToMatchday: matchday.metadata.matchday,
                points: officialResult.officialGoals.away -
                  officialResult.calculatedGoals.away,
                reason: `Team ungültig: ${awayInvalid.reason}`,
              },
            }]
          : []),
      ],
    },
  };
}

function toInvalidAnalysisPlayer(
  player: CalculatedPlayer,
): MatchAnalysis["players"]["home"][number] {
  return {
    slotId: player.evaluatedForLineupId,
    sourceSlotId: player.lineupId,
    playerId: player.playerId,
    playerName: player.playerName,
    position: player.position,
    rating: player.kickerRating,
    goals: player.matchData.goals,
    yellowRedCard: player.matchData.yellowRedCard,
    redCard: player.matchData.redCard,
    teamOfTheWeek: player.matchData.teamOfTheWeek,
    ratingPoints: player.points.rating,
    appearancePoints: player.points.appearance,
    goalPoints: player.points.goals,
    cardPoints: player.points.cards,
    teamOfWeekPoints: player.points.teamOfTheWeek,
    totalPoints: player.totalPoints,
    wasReplacement: player.wasReplacement,
    usedAutomaticRating: player.usedAutomaticRating,
  };
}

function createInvalidPlayerComparisons(
  homePlayers: readonly MatchAnalysis["players"]["home"][number][],
  awayPlayers: readonly MatchAnalysis["players"]["away"][number][],
): MatchAnalysis["playerComparisons"] {
  const homeBySlot = new Map(homePlayers.map((player) => [player.slotId, player]));
  const awayBySlot = new Map(awayPlayers.map((player) => [player.slotId, player]));

  return OFFICIAL_STARTER_IDS.map((slotId) => {
    const homePlayer = homeBySlot.get(slotId) ?? null;
    const awayPlayer = awayBySlot.get(slotId) ?? null;
    const homePoints = homePlayer?.totalPoints ?? 0;
    const awayPoints = awayPlayer?.totalPoints ?? 0;

    return {
      slotId,
      homePlayer,
      awayPlayer,
      winner: homePoints > awayPoints ? "HOME" as const : awayPoints > homePoints ? "AWAY" as const : "TIED" as const,
      pointDifference: homePoints - awayPoints,
    };
  });
}

function getInvalidAnalysisLineupWarnings(
  lineup: CalculatedMatchLineupResult,
  side: MatchTeamSide,
): MatchAnalysis["matchFactors"]["lineupWarnings"] {
  const occupiedSlots = new Set(
    lineup.effectiveSquad.players.map((player) => player.lineupId),
  );

  return OFFICIAL_LINEUP_IDS
    .filter((slotId) => !occupiedSlots.has(slotId))
    .map((slotId) => ({
      side,
      slotId,
      position: getPositionForLineupId(slotId),
      message: `Slot ${slotId} fehlt / nicht gewertet`,
    }));
}

function selectInvalidAnalysisPlayer(
  players: readonly MatchAnalysis["players"]["home"][number][],
  direction: "BEST" | "WORST",
) {
  return players.reduce<MatchAnalysis["players"]["home"][number] | null>(
    (selected, player) => {
      if (!selected) {
        return player;
      }

      if (direction === "BEST" && player.totalPoints > selected.totalPoints) {
        return player;
      }

      if (direction === "WORST" && player.totalPoints < selected.totalPoints) {
        return player;
      }

      return selected;
    },
    null,
  );
}

function selectInvalidOverallMatchwinner(
  homePlayer: MatchAnalysis["players"]["home"][number] | null,
  awayPlayer: MatchAnalysis["players"]["away"][number] | null,
): MatchAnalysis["matchWinners"]["overallMatchwinner"] {
  if (!homePlayer && !awayPlayer) {
    return null;
  }

  if (homePlayer && (!awayPlayer || homePlayer.totalPoints > awayPlayer.totalPoints)) {
    return { side: "HOME", player: homePlayer };
  }

  return awayPlayer ? { side: "AWAY", player: awayPlayer } : null;
}

function selectInvalidBiggestDuel(
  comparisons: MatchAnalysis["playerComparisons"],
): MatchAnalysis["matchWinners"]["biggestIndividualDuel"] {
  const biggest = comparisons.reduce<MatchAnalysis["playerComparisons"][number] | null>(
    (selected, comparison) => {
      if (!selected) {
        return comparison;
      }

      return Math.abs(comparison.pointDifference) > Math.abs(selected.pointDifference)
        ? comparison
        : selected;
    },
    null,
  );

  return biggest
    ? {
        comparison: biggest,
        absolutePointDifference: Math.abs(biggest.pointDifference),
      }
    : null;
}

function selectInvalidPositionAdvantage(
  positionAnalysis: readonly MatchAnalysis["positionAnalysis"][number][],
  direction: "HIGHEST" | "LOWEST",
): MatchAnalysis["matchFactors"]["largestPositionAdvantage"] {
  const candidates = positionAnalysis.flatMap((duel) => [
    { position: duel.position, side: "HOME" as const, points: duel.homePoints },
    { position: duel.position, side: "AWAY" as const, points: duel.awayPoints },
  ]);

  return candidates.reduce((selected, candidate) => {
    if (!selected) {
      return candidate;
    }

    return direction === "HIGHEST"
      ? candidate.points > selected.points ? candidate : selected
      : candidate.points < selected.points ? candidate : selected;
  }, null as MatchAnalysis["matchFactors"]["largestPositionAdvantage"]);
}

function selectInvalidScoringLine(
  positionAnalysis: readonly MatchAnalysis["positionAnalysis"][number][],
  direction: "HIGHEST" | "LOWEST",
): MatchAnalysis["matchFactors"]["highestScoringLine"] {
  return selectInvalidPositionAdvantage(positionAnalysis, direction) ?? {
    position: "goalkeeper",
    side: "HOME",
    points: 0,
  };
}

function createInvalidAnalysisTeam(
  matchday: OfficialMatchdayResult,
  lineup: FixtureLineupsWithInvalid["homeTeam"],
  officialResult: OfficialMatchdayResult["officialResults"][number],
  side: "home" | "away",
  invalidOverride: InvalidTeamOverride | undefined,
): MatchAnalysis["homeTeam"] {
  const managerId = officialResult.teams[side].managerId;
  const tableRow = matchday.officialLeagueTable.rows.find(
    (row) => row.managerId === managerId,
  );

  if (!tableRow) {
    throw new Error(`Official league table is missing manager ${managerId}.`);
  }

  return {
    managerId,
    teamId: tableRow.teamId,
    teamName: tableRow.teamName,
    managerName: tableRow.managerName,
    teamStatus: invalidOverride ? "INVALID" : "VALID",
    ...(invalidOverride ? { invalidReason: invalidOverride.reason } : {}),
    officialScore: officialResult.officialGoals[side],
    leaguePoints: officialResult.leaguePoints[side],
    totalPoints: getLineupCalculatedScore(lineup),
    manualPenaltyPoints:
      officialResult.officialGoals[side] - officialResult.calculatedGoals[side],
  };
}

function createPositionDuel(
  fixture: FixtureLineupsWithInvalid,
  position: "goalkeeper" | "defender" | "midfielder" | "forward",
) {
  const homePoints = getLineupPositionScore(fixture.homeTeam, position);
  const awayPoints = getLineupPositionScore(fixture.awayTeam, position);

  return {
    position,
    homePoints,
    awayPoints,
    difference: homePoints - awayPoints,
    winner: homePoints > awayPoints ? "HOME" as const : awayPoints > homePoints ? "AWAY" as const : "TIED" as const,
  };
}

function getLineupCalculatedScore(
  lineup: CalculatedMatchLineupResult | InvalidMatchLineupResult,
) {
  return lineup.calculationStatus === "CALCULATED" ? lineup.team.totalPoints : 0;
}

function getLineupPositionScore(
  lineup: CalculatedMatchLineupResult | InvalidMatchLineupResult,
  position: "goalkeeper" | "defender" | "midfielder" | "forward",
) {
  return lineup.calculationStatus === "CALCULATED"
    ? lineup.team.positionTotals[position]
    : 0;
}

function getOutcome(home: number, away: number) {
  if (home > away) {
    return "HOME_WIN" as const;
  }

  if (home < away) {
    return "AWAY_WIN" as const;
  }

  return "DRAW" as const;
}

function getLeaguePoints(outcome: ReturnType<typeof getOutcome>) {
  if (outcome === "HOME_WIN") {
    return { home: 3, away: 0 } as const;
  }

  if (outcome === "AWAY_WIN") {
    return { home: 0, away: 3 } as const;
  }

  return { home: 1, away: 1 } as const;
}

function safeRevalidatePath(pathname: string) {
  try {
    revalidatePath(pathname);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("static generation store missing")
    ) {
      return;
    }

    throw error;
  }
}

export async function loadMatchdayZeroDataEntry(matchday = 1) {
  return new MatchdayZeroService(matchday).loadDataEntry();
}

export async function saveMatchdayZeroPlayerData(formData: FormData) {
  return new MatchdayZeroService(readFormMatchday(formData)).savePlayerMatchData(formData);
}

export function resolveSubmittedPlayerRowsForSave(
  formData: FormData,
  relevantPlayers: readonly MatchdayZeroPlayerEntry[],
) {
  const submittedPlayerIds = formData
    .getAll("submittedPlayerId")
    .filter((value): value is string => typeof value === "string" && value !== "");

  if (submittedPlayerIds.length === 0) {
    return relevantPlayers;
  }

  const submittedPlayerIdSet = new Set(submittedPlayerIds);

  return relevantPlayers.filter((player) =>
    submittedPlayerIdSet.has(player.playerId),
  );
}

export async function calculateMatchdayZero(matchday = 1) {
  try {
    return await new MatchdayZeroService(matchday).calculate();
  } catch (error) {
    if (
      error instanceof MatchdayValidationError ||
      error instanceof OfficialMatchdayValidationError
    ) {
      return {
        status: "BLOCKED" as const,
        message: error.issues.map((issue) => issue.message).join(" | "),
        missingPlayers: [],
        lineupPreflight: null,
        calculatedMatches: 0,
        officialMatches: 0,
        comparisonReportPath: null,
      };
    }

    throw error;
  }
}

function createOpenLineupDecisionMessage(report: MatchdayLineupPreflightReport) {
  const firstManager = report.managersWithMissingSlots[0];
  const firstSlot = firstManager?.missingSlots[0];

  if (!firstManager || !firstSlot) {
    return "Offene Review-Entscheidung für unvollständige Teamabgabe.";
  }

  const suffix =
    report.managersWithMissingSlots.length > 1
      ? ` Weitere ${report.managersWithMissingSlots.length - 1} Manager stehen im Review.`
      : "";

  return `${report.managersWithMissingSlots.length} offene Entscheidung${
    report.managersWithMissingSlots.length === 1 ? "" : "en"
  }: ${firstManager.managerName}, Slot ${firstSlot.slotId} fehlt.${suffix}`;
}

function readFormMatchday(formData: FormData) {
  const parsed = Number(formData.get("matchday") ?? 1);

  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 34 ? parsed : 1;
}

function readRating(formData: FormData, playerId: string) {
  const value = String(formData.get(`${playerId}:rating`) ?? "");

  if (!value) {
    return null;
  }

  const parsed = Number(value.replace(",", "."));

  return Number.isFinite(parsed) ? parsed : null;
}

function readNumber(formData: FormData, key: string) {
  const parsed = Number(formData.get(key) ?? 0);

  return Number.isFinite(parsed) ? parsed : 0;
}

function readOptionalFormString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" && value.trim() !== ""
    ? value.trim()
    : null;
}

function asTableRows(value: unknown): TableJsonRow[] {
  if (
    typeof value === "object" &&
    value !== null &&
    "rows" in value &&
    Array.isArray(value.rows)
  ) {
    return value.rows.filter(isTableJsonRow);
  }

  return [];
}

function isTableJsonRow(value: unknown): value is TableJsonRow {
  return (
    typeof value === "object" &&
    value !== null &&
    "managerId" in value &&
    "teamId" in value &&
    "managerName" in value
  );
}

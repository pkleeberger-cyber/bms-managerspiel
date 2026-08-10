import {
  competitionLifecycleFixture,
} from "@/domain/competition-lifecycle";
import type {
  CompetitionLifecycleAction,
  CompetitionLifecycleSnapshot,
  CompetitionLifecycleTimelineEntry,
  CompetitionType,
} from "@/domain/competition-lifecycle";
import { operationalMatchdayLifecycleFixture } from "@/domain/matchday-lifecycle";
import { getPrismaClient } from "./prisma";

export type CompetitionRecord = {
  id: string;
  seasonId: string;
  type: CompetitionType;
  name: string;
  status: "PLANNED" | "ACTIVE" | "COMPLETED";
};

export type SeasonStatusRecord = {
  id: string;
  name: string;
  yearStart: number;
  yearEnd: number;
  status: "PLANNED" | "ACTIVE" | "COMPLETED" | "ARCHIVED";
};

export type CurrentMatchdayRecord = {
  seasonId: string;
  competitionId: string;
  matchday: number;
};

export type CreateCompetitionInput = {
  seasonId: string;
  type: CompetitionType;
  name: string;
};

export type UpdateCompetitionInput = {
  competitionId: string;
  name?: string;
  status?: CompetitionRecord["status"];
};

export interface CompetitionRepository {
  loadActiveCompetitions(seasonId: string): Promise<CompetitionRecord[] | null>;
  loadActiveSeasonStatus(): Promise<SeasonStatusRecord | null>;
  loadCompetition(competitionId: string): Promise<CompetitionRecord | null>;
  loadCompetitionLifecycle(
    competitionId: string,
  ): Promise<CompetitionLifecycleSnapshot | null>;
  loadCurrentMatchday(competitionId: string): Promise<CurrentMatchdayRecord | null>;
  createCompetition(input: CreateCompetitionInput): Promise<CompetitionRecord>;
  updateCompetition(input: UpdateCompetitionInput): Promise<CompetitionRecord>;
  deleteCompetition(competitionId: string): Promise<void>;
}

export class FixtureCompetitionRepository implements CompetitionRepository {
  private readonly competition: CompetitionRecord = {
    id: operationalMatchdayLifecycleFixture.currentVersion.competitionId,
    seasonId: operationalMatchdayLifecycleFixture.currentVersion.seasonId,
    type: "LEAGUE_1",
    name: operationalMatchdayLifecycleFixture.competitionName,
    status: "ACTIVE",
  };

  private readonly activeSeason: SeasonStatusRecord = {
    id: operationalMatchdayLifecycleFixture.currentVersion.seasonId,
    name: operationalMatchdayLifecycleFixture.seasonName,
    yearStart: 2026,
    yearEnd: 2027,
    status: "ACTIVE",
  };

  async loadActiveSeasonStatus(): Promise<SeasonStatusRecord | null> {
    return this.activeSeason;
  }

  async loadActiveCompetitions(
    seasonId: string,
  ): Promise<CompetitionRecord[] | null> {
    if (seasonId !== this.activeSeason.id) {
      return null;
    }

    return competitionLifecycleFixture.map((snapshot) =>
      mapLifecycleSnapshotToCompetitionRecord(
        snapshot,
        this.activeSeason.id,
      ),
    );
  }

  async loadCompetition(
    competitionId: string,
  ): Promise<CompetitionRecord | null> {
    if (competitionId !== this.competition.id) {
      return null;
    }

    return this.competition;
  }

  async loadCompetitionLifecycle(
    competitionId: string,
  ): Promise<CompetitionLifecycleSnapshot | null> {
    return (
      competitionLifecycleFixture.find(
        (snapshot) => snapshot.competitionId === competitionId,
      ) ?? null
    );
  }

  async loadCurrentMatchday(
    competitionId: string,
  ): Promise<CurrentMatchdayRecord | null> {
    if (competitionId !== this.competition.id) {
      return null;
    }

    return {
      seasonId: this.competition.seasonId,
      competitionId: this.competition.id,
      matchday: operationalMatchdayLifecycleFixture.matchday,
    };
  }

  async createCompetition(): Promise<CompetitionRecord> {
    throw new Error("Competition creation is not implemented yet.");
  }

  async updateCompetition(): Promise<CompetitionRecord> {
    throw new Error("Competition update is not implemented yet.");
  }

  async deleteCompetition(): Promise<void> {
    throw new Error("Competition deletion is not implemented yet.");
  }
}

export class PrismaCompetitionRepository implements CompetitionRepository {
  private readonly prisma = getPrismaClient();

  async loadActiveSeasonStatus(): Promise<SeasonStatusRecord | null> {
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

      return {
        id: season.id,
        name: season.name,
        yearStart: season.yearStart,
        yearEnd: season.yearEnd,
        status: season.status,
      };
    } catch {
      return null;
    }
  }

  async loadActiveCompetitions(
    seasonId: string,
  ): Promise<CompetitionRecord[] | null> {
    if (!this.prisma) {
      return null;
    }

    try {
      const competitions = await this.prisma.competition.findMany({
        where: {
          seasonId,
          status: { in: ["PLANNED", "ACTIVE"] },
        },
        orderBy: { type: "asc" },
      });

      if (competitions.length === 0) {
        return null;
      }

      return competitions.map((competition) => ({
        id: competition.id,
        seasonId: competition.seasonId,
        type: competition.type,
        name: competition.name,
        status: competition.status,
      }));
    } catch {
      return null;
    }
  }

  async loadCompetition(
    competitionId: string,
  ): Promise<CompetitionRecord | null> {
    if (!this.prisma) {
      return null;
    }

    try {
      const competition = await this.prisma.competition.findUnique({
        where: { id: competitionId },
      });

      if (!competition) {
        return null;
      }

      return {
        id: competition.id,
        seasonId: competition.seasonId,
        type: competition.type,
        name: competition.name,
        status: competition.status,
      };
    } catch {
      return null;
    }
  }

  async loadCompetitionLifecycle(
    competitionId: string,
  ): Promise<CompetitionLifecycleSnapshot | null> {
    if (!this.prisma) {
      return null;
    }

    try {
      const lifecycle = await this.prisma.competitionLifecycle.findUnique({
        where: { competitionId },
        include: { competition: true },
      });

      if (!lifecycle) {
        return null;
      }

      return {
        competitionId: lifecycle.competitionId,
        competitionType: lifecycle.competition.type,
        status: lifecycle.status,
        progressPercent: lifecycle.progressPercent,
        availableActions: readLifecycleActions(lifecycle.availableActionsJson),
        completedActions: readLifecycleActions(lifecycle.completedActionsJson),
        nextRecommendedAction: readLifecycleAction(
          lifecycle.nextRecommendedAction,
        ),
        timelineEntries: readTimelineEntries(lifecycle.timelineEntriesJson),
      };
    } catch {
      return null;
    }
  }

  async loadCurrentMatchday(
    competitionId: string,
  ): Promise<CurrentMatchdayRecord | null> {
    if (!this.prisma) {
      return null;
    }

    try {
      const lifecycle = await this.prisma.matchdayLifecycle.findFirst({
        where: { competitionId },
        orderBy: { matchday: "desc" },
      });

      if (!lifecycle) {
        return null;
      }

      return {
        seasonId: lifecycle.seasonId,
        competitionId: lifecycle.competitionId,
        matchday: lifecycle.matchday,
      };
    } catch {
      return null;
    }
  }

  async createCompetition(): Promise<CompetitionRecord> {
    throw new Error("Competition creation is not implemented yet.");
  }

  async updateCompetition(): Promise<CompetitionRecord> {
    throw new Error("Competition update is not implemented yet.");
  }

  async deleteCompetition(): Promise<void> {
    throw new Error("Competition deletion is not implemented yet.");
  }
}

function mapLifecycleSnapshotToCompetitionRecord(
  snapshot: CompetitionLifecycleSnapshot,
  seasonId: string,
): CompetitionRecord {
  return {
    id: snapshot.competitionId,
    seasonId,
    type: snapshot.competitionType,
    name: mapCompetitionTypeToName(snapshot.competitionType),
    status: snapshot.status === "COMPLETED" ? "COMPLETED" : "ACTIVE",
  };
}

function mapCompetitionTypeToName(type: CompetitionType): string {
  switch (type) {
    case "LEAGUE_1":
      return "Erste Liga";
    case "LEAGUE_2":
      return "Zweite Liga";
    case "CUP":
      return "Pokal";
    case "EUROPE":
      return "Europapokal";
    case "SUPERCUP":
      return "Supercup";
  }
}

function readLifecycleActions(value: unknown): readonly CompetitionLifecycleAction[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isCompetitionLifecycleAction);
}

function readLifecycleAction(
  value: string | null,
): CompetitionLifecycleAction | null {
  if (!value) {
    return null;
  }

  return isCompetitionLifecycleAction(value) ? value : null;
}

function isCompetitionLifecycleAction(
  value: unknown,
): value is CompetitionLifecycleAction {
  return (
    value === "CONFIRM_PARTICIPANTS" ||
    value === "GENERATE_FIXTURE" ||
    value === "MARK_READY" ||
    value === "ACTIVATE_LEAGUE" ||
    value === "RUN_DRAW" ||
    value === "GENERATE_NEXT_ROUND" ||
    value === "ACTIVATE_CUP" ||
    value === "GENERATE_EUROPE_PARTICIPANTS" ||
    value === "START_LEAGUE_PHASE" ||
    value === "PREPARE_KNOCKOUT" ||
    value === "GENERATE_SUPERCUP_FIXTURE" ||
    value === "COMPLETE_COMPETITION"
  );
}

function readTimelineEntries(
  value: unknown,
): readonly CompetitionLifecycleTimelineEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => {
    if (
      typeof entry !== "object" ||
      entry === null ||
      !("time" in entry) ||
      !("action" in entry) ||
      !("description" in entry)
    ) {
      return [];
    }

    const record = entry as Record<string, unknown>;

    if (
      typeof record.time !== "string" ||
      typeof record.action !== "string" ||
      typeof record.description !== "string"
    ) {
      return [];
    }

    return [
      {
        time: record.time,
        action: record.action,
        user: typeof record.user === "string" ? record.user : undefined,
        description: record.description,
      },
    ];
  });
}

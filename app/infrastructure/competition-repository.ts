import { operationalMatchdayLifecycleFixture } from "@/domain/matchday-lifecycle";

export type CompetitionRecord = {
  id: string;
  seasonId: string;
  type: "LEAGUE_1" | "LEAGUE_2" | "CUP" | "EUROPE" | "SUPERCUP";
  name: string;
  status: "PLANNED" | "ACTIVE" | "COMPLETED";
};

export type CurrentMatchdayRecord = {
  seasonId: string;
  competitionId: string;
  matchday: number;
};

export interface CompetitionRepository {
  loadCompetition(competitionId: string): Promise<CompetitionRecord | null>;
  loadCurrentMatchday(competitionId: string): Promise<CurrentMatchdayRecord | null>;
}

export class FixtureCompetitionRepository implements CompetitionRepository {
  private readonly competition: CompetitionRecord = {
    id: operationalMatchdayLifecycleFixture.currentVersion.competitionId,
    seasonId: operationalMatchdayLifecycleFixture.currentVersion.seasonId,
    type: "LEAGUE_1",
    name: operationalMatchdayLifecycleFixture.competitionName,
    status: "ACTIVE",
  };

  async loadCompetition(
    competitionId: string,
  ): Promise<CompetitionRecord | null> {
    if (competitionId !== this.competition.id) {
      return null;
    }

    return this.competition;
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
}

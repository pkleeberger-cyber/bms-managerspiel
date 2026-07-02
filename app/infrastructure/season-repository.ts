import { operationalMatchdayLifecycleFixture } from "@/domain/matchday-lifecycle";

export type SeasonRecord = {
  id: string;
  name: string;
  yearStart: number;
  yearEnd: number;
  status: "PLANNED" | "ACTIVE" | "COMPLETED" | "ARCHIVED";
};

export interface SeasonRepository {
  loadActiveSeason(): Promise<SeasonRecord | null>;
  loadSeason(seasonId: string): Promise<SeasonRecord | null>;
}

export class FixtureSeasonRepository implements SeasonRepository {
  private readonly activeSeason: SeasonRecord = {
    id: operationalMatchdayLifecycleFixture.currentVersion.seasonId,
    name: operationalMatchdayLifecycleFixture.seasonName,
    yearStart: 2026,
    yearEnd: 2027,
    status: "ACTIVE",
  };

  async loadActiveSeason(): Promise<SeasonRecord | null> {
    return this.activeSeason;
  }

  async loadSeason(seasonId: string): Promise<SeasonRecord | null> {
    if (seasonId !== this.activeSeason.id) {
      return null;
    }

    return this.activeSeason;
  }
}

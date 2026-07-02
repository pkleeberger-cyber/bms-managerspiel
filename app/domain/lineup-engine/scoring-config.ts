import type { CompetitionScoringConfig } from "./types";

export function createDefaultCompetitionScoringConfig(
  competitionId: string,
  phaseId = "league",
): CompetitionScoringConfig {
  return {
    competitionId,
    phaseId,
    useKickerRatings: true,
    countAppearanceWithoutRating: false,
    goalsCountWithoutRating: true,
    teamOfWeekEnabled: true,
    yellowRedEnabled: true,
    redEnabled: true,
  };
}

export const pokalRoundsOneAndTwoScoringConfig = {
  competitionId: "pokal",
  phaseId: "rounds-1-2",
  useKickerRatings: false,
  defaultRatingIfNoRating: 3.5,
  countAppearanceWithoutRating: false,
  goalsCountWithoutRating: true,
  teamOfWeekEnabled: false,
  yellowRedEnabled: true,
  redEnabled: true,
} as const satisfies CompetitionScoringConfig;

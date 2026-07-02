import type {
  CompetitionScoringConfig,
  KickerRating,
  PlayerMatchData,
  PlayerPointBreakdown,
  PlayerPosition,
} from "./types";

export type EffectiveRating = {
  rating: KickerRating;
  usedAutomaticRating: boolean;
  source: "KICKER" | "LEGACY_GOAL_OR_RED" | "CONFIG_DEFAULT";
};

const goalPointsByPosition: Record<PlayerPosition, number> = {
  goalkeeper: 6,
  defender: 5,
  midfielder: 4,
  forward: 3,
};

export function isValidKickerRating(rating: number | null): rating is KickerRating {
  return rating !== null && rating >= 1 && rating <= 6 && Number.isInteger(rating * 2);
}

export function getRatingPoints(rating: KickerRating): number {
  return 14 - (rating * 4);
}

export function getEffectiveRating(
  matchData: PlayerMatchData,
  config: CompetitionScoringConfig,
): EffectiveRating | null {
  if (config.useKickerRatings && isValidKickerRating(matchData.kickerRating)) {
    return {
      rating: matchData.kickerRating,
      usedAutomaticRating: false,
      source: "KICKER",
    };
  }

  if (
    config.defaultRatingIfNoRating !== undefined
    && isValidKickerRating(config.defaultRatingIfNoRating)
  ) {
    return {
      rating: config.defaultRatingIfNoRating,
      usedAutomaticRating: true,
      source: "CONFIG_DEFAULT",
    };
  }

  if (
    (config.redEnabled && matchData.redCard)
    || (config.goalsCountWithoutRating && matchData.goals > 0)
  ) {
    return {
      rating: 3.5,
      usedAutomaticRating: true,
      source: "LEGACY_GOAL_OR_RED",
    };
  }

  return null;
}

export function calculatePointBreakdown(
  position: PlayerPosition,
  rating: KickerRating,
  matchData: PlayerMatchData,
  config: CompetitionScoringConfig,
  ratingSource: EffectiveRating["source"],
): PlayerPointBreakdown {
  const hasSourceRating = ratingSource === "KICKER";
  const hasLegacyAutomaticRating = ratingSource === "LEGACY_GOAL_OR_RED";

  return {
    rating: getRatingPoints(rating),
    appearance:
      hasSourceRating
      || hasLegacyAutomaticRating
      || config.countAppearanceWithoutRating
        ? 1
        : 0,
    goals:
      hasSourceRating
      || config.goalsCountWithoutRating
        ? matchData.goals * goalPointsByPosition[position]
        : 0,
    cards:
      (config.yellowRedEnabled && matchData.yellowRedCard ? -3 : 0)
      + (config.redEnabled && matchData.redCard ? -6 : 0),
    teamOfTheWeek:
      config.teamOfWeekEnabled && matchData.teamOfTheWeek ? 2 : 0,
  };
}

export function sumPointBreakdown(points: PlayerPointBreakdown): number {
  return points.rating + points.appearance + points.goals + points.cards + points.teamOfTheWeek;
}

import type {
  KickerRating,
  PlayerMatchData,
  PlayerPointBreakdown,
  PlayerPosition,
} from "./types";

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
): { rating: KickerRating; usedAutomaticRating: boolean } | null {
  if (isValidKickerRating(matchData.kickerRating)) {
    return {
      rating: matchData.kickerRating,
      usedAutomaticRating: false,
    };
  }

  if (matchData.redCard || matchData.goals > 0) {
    return {
      rating: 3.5,
      usedAutomaticRating: true,
    };
  }

  return null;
}

export function calculatePointBreakdown(
  position: PlayerPosition,
  rating: KickerRating,
  matchData: PlayerMatchData,
): PlayerPointBreakdown {
  return {
    rating: getRatingPoints(rating),
    appearance: 1,
    goals: matchData.goals * goalPointsByPosition[position],
    cards: (matchData.yellowRedCard ? -3 : 0) + (matchData.redCard ? -6 : 0),
    teamOfTheWeek: matchData.teamOfTheWeek ? 2 : 0,
  };
}

export function sumPointBreakdown(points: PlayerPointBreakdown): number {
  return points.rating + points.appearance + points.goals + points.cards + points.teamOfTheWeek;
}

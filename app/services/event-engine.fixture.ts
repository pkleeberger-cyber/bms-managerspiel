import type { BmsEvent } from "@/types/events";

import { generateLeagueEvents, getHeroEvent, rankEvents } from "./event-engine";

export type EventEngineDemoResult = {
  events: BmsEvent[];
  rankedEvents: BmsEvent[];
  heroEvent: BmsEvent | null;
  isSortedByPriority: boolean;
  heroIsHighestPriority: boolean;
};

export function createEventEngineDemoResult(): EventEngineDemoResult {
  const events = generateLeagueEvents({
    competitionId: "erste-liga",
    matchday: 14,
    totalMatchdays: 34,
    pointsPerWin: 3,
    previousLeaderTeamId: "borussia",
    standings: [
      { teamId: "fc-adler", managerId: "adler-manager", rank: 1, previousRank: 2, points: 36 },
      { teamId: "borussia", managerId: "borussia-manager", rank: 2, previousRank: 1, points: 35 },
      { teamId: "bms-united", managerId: "patrick", rank: 3, previousRank: 3, points: 34 },
      { teamId: "bochum", managerId: "bochum-manager", rank: 4, previousRank: 4, points: 32 },
      { teamId: "muenchen", managerId: "bayern-manager", rank: 5, previousRank: 5, points: 31 },
      { teamId: "freiburg", managerId: "freiburg-manager", rank: 6, previousRank: 6, points: 31 },
      { teamId: "mainz", managerId: "mainz-manager", rank: 15, previousRank: 15, points: 14 },
      { teamId: "koeln", managerId: "koeln-manager", rank: 16, previousRank: 16, points: 13 },
      { teamId: "hamburg", managerId: "hamburg-manager", rank: 17, previousRank: 17, points: 12 },
      { teamId: "bremen", managerId: "bremen-manager", rank: 18, previousRank: 18, points: 11 },
    ],
    fixtures: [
      {
        homeTeamId: "mainz",
        awayTeamId: "borussia",
        homeRankBefore: 15,
        awayRankBefore: 1,
        homeScore: 11,
        awayScore: 9,
      },
    ],
    relegationRanks: [16, 17, 18],
  });
  const rankedEvents = rankEvents(events);
  const heroEvent = getHeroEvent(events);
  const isSortedByPriority = rankedEvents.every((event, index) => {
    const previousEvent = rankedEvents[index - 1];

    return !previousEvent || previousEvent.priority >= event.priority;
  });

  return {
    events,
    rankedEvents,
    heroEvent,
    isSortedByPriority,
    heroIsHighestPriority: heroEvent?.id === rankedEvents[0]?.id,
  };
}

export const eventEngineDemoResult = createEventEngineDemoResult();

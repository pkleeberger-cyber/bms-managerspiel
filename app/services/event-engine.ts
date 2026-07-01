import type { BmsEvent, BmsEventType, EventCategory, EventPayload, EventSeverity, EventValidity } from "../types/events";

export type LeagueStandingInput = {
  teamId: string;
  managerId?: string;
  teamName?: string;
  managerName?: string;
  rank: number;
  previousRank?: number;
  points: number;
};

export type LeagueFixtureInput = {
  homeTeamId: string;
  awayTeamId: string;
  homeRankBefore: number;
  awayRankBefore: number;
  homeScore: number;
  awayScore: number;
};

export type GenerateLeagueEventsInput = {
  competitionId: string;
  matchday: number;
  totalMatchdays: number;
  pointsPerWin: number;
  standings: LeagueStandingInput[];
  previousStandings?: LeagueStandingInput[];
  previousLeaderTeamId?: string;
  fixtures?: LeagueFixtureInput[];
  europeRanks?: number[];
  relegationRanks?: number[];
};

export type CupPhase = "round" | "draw" | "final";

export type GenerateCupEventsInput = {
  competitionId: string;
  matchday: number;
  phase: CupPhase;
  currentRound: string;
  roundCompleted?: boolean;
  drawReady?: boolean;
  finalSet?: boolean;
  winnerTeamId?: string;
};

export type EuropeanPhase = "league_phase" | "semifinal" | "final";

export type EuropeanStandingInput = {
  teamId: string;
  managerId?: string;
  rank: number;
  points: number;
};

export type GenerateEuropeanEventsInput = {
  competitionId: string;
  matchday: number;
  phase: EuropeanPhase;
  standings?: EuropeanStandingInput[];
  semifinalsSet?: boolean;
  finalSet?: boolean;
  winnerTeamId?: string;
};

type CreateEventInput = {
  type: BmsEventType;
  category: EventCategory;
  title: string;
  priority: number;
  severity: EventSeverity;
  competitionId: string;
  matchday: number;
  relatedManagerIds?: string[];
  relatedTeamIds?: string[];
  validFor?: EventValidity;
  payload?: EventPayload;
};

const defaultMatchdayValidity: EventValidity = { type: "matchdays", count: 1 };

function createEvent(input: CreateEventInput): BmsEvent {
  return {
    id: [
      input.competitionId,
      input.matchday,
      input.type,
      ...(input.relatedTeamIds ?? []),
    ].join(":"),
    type: input.type,
    category: input.category,
    title: input.title,
    priority: input.priority,
    severity: input.severity,
    scope: input.category === "matchday" ? "matchday" : "competition",
    validFor: input.validFor ?? defaultMatchdayValidity,
    relatedCompetitionId: input.competitionId,
    relatedManagerIds: input.relatedManagerIds ?? [],
    relatedTeamIds: input.relatedTeamIds ?? [],
    matchday: input.matchday,
    payload: input.payload ?? {},
  };
}

function sortStandingsByRank<T extends { rank: number }>(standings: T[]): T[] {
  return [...standings].sort((first, second) => first.rank - second.rank);
}

function getPointSpread(standings: Array<{ points: number }>): number | null {
  if (standings.length === 0) {
    return null;
  }

  const points = standings.map((team) => team.points);

  return Math.max(...points) - Math.min(...points);
}

function getManagers(standings: Array<{ managerId?: string }>): string[] {
  return standings.flatMap((team) => (team.managerId ? [team.managerId] : []));
}

function getTeamIds(standings: Array<{ teamId: string }>): string[] {
  return standings.map((team) => team.teamId);
}

function getLeagueTeamPayload(team: LeagueStandingInput): EventPayload {
  return {
    teamId: team.teamId,
    managerId: team.managerId ?? null,
    teamName: team.teamName ?? null,
    managerName: team.managerName ?? null,
    rank: team.rank,
    previousRank: team.previousRank ?? null,
    points: team.points,
  };
}

export function generateLeagueEvents(input: GenerateLeagueEventsInput): BmsEvent[] {
  const events: BmsEvent[] = [];
  const standings = sortStandingsByRank(input.standings);
  const leader = standings[0];
  const second = standings[1];

  if (!leader || !second) {
    return events;
  }

  const leaderGap = leader.points - second.points;
  const maximumRemainingPoints = Math.max(0, input.totalMatchdays - input.matchday) * input.pointsPerWin;

  if (leaderGap > maximumRemainingPoints) {
    events.push(createEvent({
      type: "CHAMPIONSHIP_DECIDED",
      category: "league",
      title: "Meisterschaft entschieden",
      priority: 1000,
      severity: "critical",
      competitionId: input.competitionId,
      matchday: input.matchday,
      relatedManagerIds: getManagers([leader]),
      relatedTeamIds: [leader.teamId],
      validFor: { type: "season" },
      payload: {
        leaderTeamId: leader.teamId,
        leaderPoints: leader.points,
        secondPlaceTeamId: second.teamId,
        secondPlacePoints: second.points,
        gap: leaderGap,
        maximumRemainingPoints,
        remainingMatchdays: Math.max(0, input.totalMatchdays - input.matchday),
        champion: getLeagueTeamPayload(leader),
        runnerUp: getLeagueTeamPayload(second),
        matchday: input.matchday,
      },
    }));
  }

  if (input.previousLeaderTeamId && input.previousLeaderTeamId !== leader.teamId) {
    const previousLeader = (input.previousStandings ?? standings)
      .find((team) => team.teamId === input.previousLeaderTeamId);

    events.push(createEvent({
      type: "LEADER_CHANGED",
      category: "league",
      title: "Tabellenführung gewechselt",
      priority: 120,
      severity: "high",
      competitionId: input.competitionId,
      matchday: input.matchday,
      relatedManagerIds: getManagers([leader]),
      relatedTeamIds: [leader.teamId, input.previousLeaderTeamId],
      payload: {
        newLeaderTeamId: leader.teamId,
        previousLeaderTeamId: input.previousLeaderTeamId,
        oldLeader: previousLeader ? getLeagueTeamPayload(previousLeader) : {
          teamId: input.previousLeaderTeamId,
        },
        newLeader: getLeagueTeamPayload(leader),
        gap: leaderGap,
        matchday: input.matchday,
      },
    }));
  }

  if (leaderGap <= 3) {
    events.push(createEvent({
      type: "TITLE_RACE_CLOSE",
      category: "league",
      title: "Meisterrennen spitzt sich zu",
      priority: 95,
      severity: "high",
      competitionId: input.competitionId,
      matchday: input.matchday,
      relatedManagerIds: getManagers([leader, second]),
      relatedTeamIds: getTeamIds([leader, second]),
      payload: {
        leaderTeamId: leader.teamId,
        challengerTeamId: second.teamId,
        gap: leaderGap,
        leader: getLeagueTeamPayload(leader),
        runnerUp: getLeagueTeamPayload(second),
        matchday: input.matchday,
      },
    }));
  }

  if (leaderGap >= 6) {
    events.push(createEvent({
      type: "LEADER_PULLS_AWAY",
      category: "league",
      title: "Tabellenführer setzt sich ab",
      priority: 90,
      severity: "medium",
      competitionId: input.competitionId,
      matchday: input.matchday,
      relatedManagerIds: getManagers([leader]),
      relatedTeamIds: [leader.teamId],
      payload: {
        leaderTeamId: leader.teamId,
        gap: leaderGap,
        leader: getLeagueTeamPayload(leader),
        runnerUp: getLeagueTeamPayload(second),
        matchday: input.matchday,
      },
    }));
  }

  const europeRanks = input.europeRanks ?? [3, 4, 5, 6];
  const europeTeams = standings.filter((team) => europeRanks.includes(team.rank));
  const europeSpread = getPointSpread(europeTeams);

  if (europeTeams.length === europeRanks.length && europeSpread !== null && europeSpread <= 3) {
    events.push(createEvent({
      type: "EUROPE_BATTLE_CLOSE",
      category: "league",
      title: "Kampf um Europa",
      priority: 85,
      severity: "medium",
      competitionId: input.competitionId,
      matchday: input.matchday,
      relatedManagerIds: getManagers(europeTeams),
      relatedTeamIds: getTeamIds(europeTeams),
      payload: {
        ranks: europeRanks,
        pointSpread: europeSpread,
        teams: europeTeams.map(getLeagueTeamPayload),
        matchday: input.matchday,
      },
    }));
  }

  const fallbackRelegationRanks = standings.slice(-3).map((team) => team.rank);
  const relegationRanks = input.relegationRanks ?? fallbackRelegationRanks;
  const relegationTeams = standings.filter((team) => relegationRanks.includes(team.rank));
  const relegationSpread = getPointSpread(relegationTeams);

  if (relegationTeams.length >= 2 && relegationSpread !== null && relegationSpread <= 3) {
    events.push(createEvent({
      type: "RELEGATION_BATTLE_CLOSE",
      category: "league",
      title: "Abstiegskampf wird dramatisch",
      priority: 90,
      severity: "high",
      competitionId: input.competitionId,
      matchday: input.matchday,
      relatedManagerIds: getManagers(relegationTeams),
      relatedTeamIds: getTeamIds(relegationTeams),
      payload: {
        ranks: relegationRanks,
        pointSpread: relegationSpread,
        teams: relegationTeams.map(getLeagueTeamPayload),
        matchday: input.matchday,
      },
    }));
  }

  for (const fixture of input.fixtures ?? []) {
    if (fixture.homeScore === fixture.awayScore) {
      continue;
    }

    const homeWon = fixture.homeScore > fixture.awayScore;
    const winnerTeamId = homeWon ? fixture.homeTeamId : fixture.awayTeamId;
    const loserTeamId = homeWon ? fixture.awayTeamId : fixture.homeTeamId;
    const winnerRank = homeWon ? fixture.homeRankBefore : fixture.awayRankBefore;
    const loserRank = homeWon ? fixture.awayRankBefore : fixture.homeRankBefore;

    if (loserRank <= 3 && winnerRank - loserRank >= 10) {
      const winner = standings.find((team) => team.teamId === winnerTeamId);
      const loser = standings.find((team) => team.teamId === loserTeamId);

      events.push(createEvent({
        type: "MATCHDAY_SURPRISE",
        category: "matchday",
        title: "Überraschung des Spieltags",
        priority: 80,
        severity: "medium",
        competitionId: input.competitionId,
        matchday: input.matchday,
        relatedManagerIds: getManagers([winner, loser].filter((team): team is LeagueStandingInput => Boolean(team))),
        relatedTeamIds: [winnerTeamId, loserTeamId],
        payload: {
          winnerTeamId,
          loserTeamId,
          winnerRank,
          loserRank,
          result: `${fixture.homeScore}:${fixture.awayScore}`,
          winner: winner ? getLeagueTeamPayload(winner) : { teamId: winnerTeamId },
          loser: loser ? getLeagueTeamPayload(loser) : { teamId: loserTeamId },
          homeScore: fixture.homeScore,
          awayScore: fixture.awayScore,
          matchday: input.matchday,
        },
      }));
    }
  }

  return events;
}

export function generateCupEvents(input: GenerateCupEventsInput): BmsEvent[] {
  const events: BmsEvent[] = [];

  if (input.roundCompleted) {
    events.push(createEvent({
      type: "CUP_ROUND_COMPLETED",
      category: "cup",
      title: "Pokalrunde abgeschlossen",
      priority: 70,
      severity: "medium",
      competitionId: input.competitionId,
      matchday: input.matchday,
      payload: { currentRound: input.currentRound },
    }));
  }

  if (input.drawReady) {
    events.push(createEvent({
      type: "CUP_DRAW_READY",
      category: "cup",
      title: "Auslosung bereit",
      priority: 75,
      severity: "medium",
      competitionId: input.competitionId,
      matchday: input.matchday,
      payload: { currentRound: input.currentRound },
    }));
  }

  if (input.finalSet) {
    events.push(createEvent({
      type: "CUP_FINAL_SET",
      category: "cup",
      title: "Pokalfinale steht fest",
      priority: 140,
      severity: "high",
      competitionId: input.competitionId,
      matchday: input.matchday,
      payload: { currentRound: input.currentRound },
    }));
  }

  if (input.winnerTeamId) {
    events.push(createEvent({
      type: "CUP_WINNER_DECIDED",
      category: "cup",
      title: "Pokalsieger steht fest",
      priority: 1000,
      severity: "critical",
      competitionId: input.competitionId,
      matchday: input.matchday,
      relatedTeamIds: [input.winnerTeamId],
      validFor: { type: "permanent" },
      payload: {
        winnerTeamId: input.winnerTeamId,
        currentRound: input.currentRound,
      },
    }));
  }

  return events;
}

export function generateEuropeanEvents(input: GenerateEuropeanEventsInput): BmsEvent[] {
  const events: BmsEvent[] = [];
  const standings = sortStandingsByRank(input.standings ?? []);

  if (input.phase === "league_phase") {
    const topFour = standings.filter((team) => team.rank >= 1 && team.rank <= 4);
    const topFourSpread = getPointSpread(topFour);
    const fourth = standings.find((team) => team.rank === 4);
    const fifth = standings.find((team) => team.rank === 5);

    if (topFour.length === 4 && topFourSpread !== null && topFourSpread <= 3) {
      events.push(createEvent({
        type: "EURO_TOP4_CLOSE",
        category: "european",
        title: "Kampf um die Top 4 bleibt offen",
        priority: 85,
        severity: "medium",
        competitionId: input.competitionId,
        matchday: input.matchday,
        relatedManagerIds: getManagers(topFour),
        relatedTeamIds: getTeamIds(topFour),
        payload: { pointSpread: topFourSpread },
      }));
    }

    if (fourth && fifth && fourth.points - fifth.points <= 3) {
      events.push(createEvent({
        type: "EURO_QUALIFICATION_LINE_CLOSE",
        category: "european",
        title: "Qualifikationslinie bleibt eng",
        priority: 95,
        severity: "high",
        competitionId: input.competitionId,
        matchday: input.matchday,
        relatedManagerIds: getManagers([fourth, fifth]),
        relatedTeamIds: getTeamIds([fourth, fifth]),
        payload: {
          fourthTeamId: fourth.teamId,
          fifthTeamId: fifth.teamId,
          gap: fourth.points - fifth.points,
        },
      }));
    }
  }

  if (input.phase === "semifinal" && input.semifinalsSet) {
    events.push(createEvent({
      type: "EURO_SEMIFINALS_SET",
      category: "european",
      title: "Halbfinals stehen fest",
      priority: 120,
      severity: "high",
      competitionId: input.competitionId,
      matchday: input.matchday,
      payload: { phase: input.phase },
    }));
  }

  if (input.phase === "final" && input.finalSet) {
    events.push(createEvent({
      type: "EURO_FINAL_SET",
      category: "european",
      title: "Europapokal-Finale steht fest",
      priority: 160,
      severity: "high",
      competitionId: input.competitionId,
      matchday: input.matchday,
      payload: { phase: input.phase },
    }));
  }

  if (input.winnerTeamId) {
    events.push(createEvent({
      type: "EURO_WINNER_DECIDED",
      category: "european",
      title: "Europapokalsieger steht fest",
      priority: 1000,
      severity: "critical",
      competitionId: input.competitionId,
      matchday: input.matchday,
      relatedTeamIds: [input.winnerTeamId],
      validFor: { type: "permanent" },
      payload: { winnerTeamId: input.winnerTeamId },
    }));
  }

  return events;
}

export function rankEvents(events: BmsEvent[]): BmsEvent[] {
  return [...events].sort((first, second) => {
    if (second.priority !== first.priority) {
      return second.priority - first.priority;
    }

    return first.id.localeCompare(second.id);
  });
}

export function getHeroEvent(events: BmsEvent[]): BmsEvent | null {
  return rankEvents(events)[0] ?? null;
}

import type { LeagueFormResult } from "../league-engine";
import type { BmsEvent } from "../../types/events";

export type CompetitionFixtureView = {
  home: string;
  homeManager: string;
  homeTeamId: string;
  away: string;
  awayManager: string;
  awayTeamId: string;
  result: string;
  status: string;
  href?: string;
};

export type CompetitionStandingView = {
  teamId: string;
  rank: number;
  club: string;
  manager: string;
  played: number;
  goals: string;
  points: number;
  form: LeagueFormResult[];
  zone:
    | "leader"
    | "international"
    | "relegation"
    | "bottom"
    | "neutral";
};

export type CompetitionTensionZoneView = {
  label: string;
  story: string;
  context: string;
};

export type CompetitionLeaderboardView = {
  label: string;
  value: string;
  detail: string;
};

export type OfficialCompetitionOverview = {
  competitionId: string;
  matchday: number;
  heroEvent: BmsEvent | null;
  fixtures: CompetitionFixtureView[];
  standings: CompetitionStandingView[];
  tensionZones: CompetitionTensionZoneView[];
  leaderboards: CompetitionLeaderboardView[];
  eventBadges: Array<{
    fixtureKey: string;
    label: string;
  }>;
};

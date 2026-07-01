import type { MatchResult } from "../match-engine";
import type { BmsEvent } from "../../types/events";

export type LeagueFormResult = "W" | "D" | "L";

export type PositionChange = "up" | "down" | "unchanged" | "new";

export type PreviousLeagueTableRow = {
  position?: number;
  managerId: string;
  teamId: string;
  teamName: string;
  managerName: string;
  matchesPlayed: number;
  wins: number;
  draws: number;
  losses: number;
  fantasyGoalsFor: number;
  fantasyGoalsAgainst: number;
  fantasyGoalDifference: number;
  leaguePoints: number;
  formLastFive: LeagueFormResult[];
};

export type LeagueTableRow = Omit<PreviousLeagueTableRow, "position"> & {
  position: number;
  previousPosition: number | null;
  positionChange: PositionChange;
};

export type CalculateLeagueTableInput = {
  previousLeagueTable: readonly PreviousLeagueTableRow[];
  matchResults: readonly MatchResult[];
  competitionId: string;
  matchday: number;
};

export type UpdatedLeagueTable = {
  competitionId: string;
  matchday: number;
  rows: LeagueTableRow[];
};

export type LeagueCompetitionConfig = {
  id: string;
  totalMatchdays: number;
  pointsPerWin: number;
  europeRanks: readonly number[];
  relegationRanks: readonly number[];
};

export type LeaguePositionJump = {
  team: LeagueTableRow;
  from: number;
  to: number;
  places: number;
  direction: "up" | "down";
};

export type LeagueScoringContext = {
  team: LeagueTableRow;
  fantasyGoals: number;
};

export type LeagueContext = {
  leader: LeagueTableRow;
  lastPlace: LeagueTableRow;
  topFour: LeagueTableRow[];
  relegationTeams: LeagueTableRow[];
  titleGap: number;
  relegationGap: number;
  largestPositionJump: LeaguePositionJump | null;
  highestScoringTeam: LeagueScoringContext | null;
  lowestScoringTeam: LeagueScoringContext | null;
};

export type CalculateLeagueStoryInput = {
  competition: LeagueCompetitionConfig;
  matchday: number;
  previousLeagueTable: readonly PreviousLeagueTableRow[];
  matchResults: readonly MatchResult[];
};

export type CalculateLeagueStoryFromUpdatedTableInput = CalculateLeagueStoryInput & {
  updatedLeagueTable: UpdatedLeagueTable;
};

export type LeagueStoryResult = {
  updatedLeagueTable: UpdatedLeagueTable;
  allGeneratedEvents: BmsEvent[];
  heroEvent: BmsEvent | null;
  leagueContext: LeagueContext;
};

import type {
  CalculatedMatchLineupResult,
  CalculatedPlayer,
  MatchLineupResult,
  PlayerPosition,
} from "../lineup-engine";

export type MatchTeamSide = "HOME" | "AWAY";

export type MatchOutcome = "HOME_WIN" | "DRAW" | "AWAY_WIN";

export type MatchWinner = {
  side: MatchTeamSide;
  managerId: string;
} | null;

export type MatchTeamResult = {
  managerId: string;
  fantasyGoalsFor: number;
  fantasyGoalsAgainst: number;
  fantasyGoalDifference: number;
  leaguePoints: 0 | 1 | 3;
};

export type PositionComparison = Record<PlayerPosition, number>;

export type MatchPlayerPerformance = {
  team: MatchTeamSide;
  player: CalculatedPlayer;
};

export type MatchTeamLine = {
  team: MatchTeamSide;
  position: PlayerPosition;
  points: number;
};

export type MatchTopPerformers = {
  bestPlayer: MatchPlayerPerformance | null;
  worstPlayer: MatchPlayerPerformance | null;
  bestTeamLine: MatchTeamLine;
  worstTeamLine: MatchTeamLine;
  highestScoringTeam: MatchTeamSide | "TIED";
  lowestScoringTeam: MatchTeamSide | "TIED";
};

export type CalculateMatchResultInput = {
  homeTeam: MatchLineupResult;
  awayTeam: MatchLineupResult;
  competitionId: string;
  matchday: number;
};

export type ValidatedMatchResultInput = Omit<CalculateMatchResultInput, "homeTeam" | "awayTeam"> & {
  homeTeam: CalculatedMatchLineupResult;
  awayTeam: CalculatedMatchLineupResult;
};

export type MatchResult = {
  competitionId: string;
  matchday: number;
  outcome: MatchOutcome;
  winner: MatchWinner;
  fantasyGoals: {
    home: number;
    away: number;
  };
  leaguePoints: {
    home: 0 | 1 | 3;
    away: 0 | 1 | 3;
  };
  teams: {
    home: MatchTeamResult;
    away: MatchTeamResult;
  };
  positionComparison: PositionComparison;
  topPerformers: MatchTopPerformers;
};

import type { LeagueFormResult, PositionChange } from "../league-engine";
import type {
  AnalysisPlayer,
  MatchAnalysis,
  PositionDuel,
} from "../match-analysis-engine";

export type TeamOverviewMatchResult = "WIN" | "DRAW" | "LOSS";

export type TeamOverviewData = {
  competitionId: string;
  matchday: number;
  lastMatch: {
    result: TeamOverviewMatchResult;
    homeTeamName: string;
    awayTeamName: string;
    homeScore: number;
    awayScore: number;
    officialResultAdjusted: boolean;
    href: string;
  };
  league: {
    position: number;
    previousPosition: number | null;
    positionChange: PositionChange;
    leaguePoints: number;
    form: LeagueFormResult[];
  };
  nextMatch: {
    status: "NOT_SCHEDULED";
  };
  analysis: {
    why: MatchAnalysis["matchFactors"]["largestPositionDisadvantage"];
    positionDuels: PositionDuel[];
    bestPlayer: AnalysisPlayer | null;
    disappointment: AnalysisPlayer | null;
    replacementPlayerCount: number;
    missingPositionCount: number;
    biggestDuelSlot: number | null;
    manualPenaltyCount: number;
  };
};

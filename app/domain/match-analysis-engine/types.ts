import type {
  LineupId,
  ManagerMatchdayPenalty,
  PlayerPosition,
  StarterLineupId,
} from "../lineup-engine";
import type { MatchOutcome, MatchTeamSide } from "../match-engine";
import type { BmsRule, RuleAuditEntry } from "../rules-engine";

export type AnalysisWinner = MatchTeamSide | "TIED";

export type AnalysisTeam = {
  managerId: string;
  teamId: string;
  teamName: string;
  managerName: string;
  teamStatus?: "VALID" | "INVALID";
  invalidReason?: string;
  officialScore: number;
  leaguePoints: 0 | 1 | 3;
  totalPoints: number;
  manualPenaltyPoints: number;
};

export type AnalysisPlayer = {
  slotId: StarterLineupId;
  sourceSlotId: LineupId;
  playerId: string;
  playerName: string;
  position: PlayerPosition;
  rating: number;
  goals: number;
  yellowRedCard: boolean;
  redCard: boolean;
  teamOfTheWeek: boolean;
  ratingPoints: number;
  appearancePoints: number;
  goalPoints: number;
  cardPoints: number;
  teamOfWeekPoints: number;
  totalPoints: number;
  wasReplacement: boolean;
  usedAutomaticRating: boolean;
};

export type PlayerComparison = {
  slotId: StarterLineupId;
  homePlayer: AnalysisPlayer | null;
  awayPlayer: AnalysisPlayer | null;
  winner: AnalysisWinner;
  pointDifference: number;
};

export type PositionDuel = {
  position: PlayerPosition;
  homePoints: number;
  awayPoints: number;
  difference: number;
  winner: AnalysisWinner;
};

export type PlayerSelection = {
  side: MatchTeamSide;
  player: AnalysisPlayer;
};

export type BiggestIndividualDuel = {
  comparison: PlayerComparison;
  absolutePointDifference: number;
};

export type MatchWinners = {
  bestPlayerHome: AnalysisPlayer | null;
  bestPlayerAway: AnalysisPlayer | null;
  overallMatchwinner: PlayerSelection | null;
  worstPlayerHome: AnalysisPlayer | null;
  worstPlayerAway: AnalysisPlayer | null;
  biggestIndividualDuel: BiggestIndividualDuel | null;
};

export type PositionAdvantage = {
  position: PlayerPosition;
  side: MatchTeamSide;
  points: number;
};

export type ScoringLine = {
  position: PlayerPosition;
  side: MatchTeamSide;
  points: number;
};

export type MissingPosition = {
  side: MatchTeamSide;
  slotId: StarterLineupId;
  position: PlayerPosition;
};

export type LineupWarning = {
  side: MatchTeamSide;
  slotId: LineupId;
  position: PlayerPosition;
  message: string;
};

export type AppliedRule = {
  rule: BmsRule;
  audit: RuleAuditEntry | null;
};

export type ManualPenalty = {
  side: MatchTeamSide;
  penalty: ManagerMatchdayPenalty;
};

export type MatchFactors = {
  largestPositionAdvantage: PositionAdvantage | null;
  largestPositionDisadvantage: PositionAdvantage | null;
  highestScoringLine: ScoringLine;
  lowestScoringLine: ScoringLine;
  replacementPlayerCount: number;
  missingPositions: MissingPosition[];
  lineupWarnings: LineupWarning[];
  appliedRules: AppliedRule[];
  manualPenalties: ManualPenalty[];
};

export type MatchAnalysis = {
  fixtureId: string;
  competitionId: string;
  matchday: number;
  calculationTimestamp: string;
  publicationTimestamp: string;
  homeTeam: AnalysisTeam;
  awayTeam: AnalysisTeam;
  officialScore: {
    home: number;
    away: number;
  };
  calculatedScore: {
    home: number;
    away: number;
  };
  outcome: MatchOutcome;
  winner: MatchTeamSide | null;
  players: {
    home: AnalysisPlayer[];
    away: AnalysisPlayer[];
  };
  playerComparisons: PlayerComparison[];
  positionAnalysis: PositionDuel[];
  matchWinners: MatchWinners;
  matchFactors: MatchFactors;
};

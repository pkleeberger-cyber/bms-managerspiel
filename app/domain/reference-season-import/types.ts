export type ReferenceFixture = {
  matchday: number;
  homeManager: string;
  awayManager: string;
  officialHomeScore: number;
  officialAwayScore: number;
};

export type ReferenceManagerEvaluation = {
  matchday: number;
  managerName: string;
  calculatedScore: number;
  workbookScore: number;
  scoreDifference: number;
  playerComparisons: ReferencePlayerComparison[];
};

export type ReferenceDifferenceCategory =
  | "TEAM_INVALID"
  | "MANUAL_PENALTY"
  | "POINT_ADJUSTMENT"
  | "PLAYER_MAPPING"
  | "MISSING_RATING"
  | "UNKNOWN";

export type ReferencePlayerComparison = {
  slotId: number;
  evaluatedForSlotId: number | null;
  playerName: string;
  rating: number | null;
  enginePoints: number;
  workbookPoints: number;
  difference: number;
  wasReplacement: boolean;
};

export type ReferenceManagerDifferenceAudit = {
  manager: string;
  side: "HOME" | "AWAY";
  engineTotal: number;
  officialTotal: number;
  difference: number;
  workbookTotal: number;
  engineToWorkbookDifference: number;
  playerLevelComparison: ReferencePlayerComparison[];
  likelyCategory: ReferenceDifferenceCategory;
  categoryEvidence: string[];
};

export type ReferenceFixtureDifferenceAudit = {
  matchday: number;
  fixture: {
    homeManager: string;
    awayManager: string;
  };
  managerDifferences: ReferenceManagerDifferenceAudit[];
  likelyCategories: ReferenceDifferenceCategory[];
};

export type ReferenceDifferenceCategorySummary = {
  category: ReferenceDifferenceCategory;
  managerDifferences: number;
  fixtureDifferences: number;
  totalAbsoluteDifference: number;
};

export type ReferenceSeasonDifferenceAudit = {
  workbook: string;
  competition: "LEAGUE_1";
  processedAt: string;
  fixtureDifferences: ReferenceFixtureDifferenceAudit[];
  summary: {
    fixtureDifferences: number;
    managerDifferences: number;
    byCategory: ReferenceDifferenceCategorySummary[];
    unknownDifferencesRemaining: number;
    totalAbsoluteDifference: number;
  };
};

export type ReferenceAppliedRuleCandidateType =
  | "TEAM_INVALID"
  | "TEAM_PENALTY"
  | "POINT_ADJUSTMENT";

export type ReferenceAppliedRuleCandidate = {
  candidateId: string;
  reviewStatus: "REVIEW_REQUIRED";
  sourceCategory: "TEAM_INVALID" | "MANUAL_PENALTY" | "POINT_ADJUSTMENT";
  proposedRule: {
    type: ReferenceAppliedRuleCandidateType;
    competitionId: "reference-season-liga-1";
    validFromMatchday: number;
    validToMatchday: number;
    managerReference: {
      displayName: string;
      managerId: null;
    };
    value: {
      invalidFantasyGoals?: number;
      points?: number;
    };
    reason: string;
  };
  source: {
    fixture: {
      homeManager: string;
      awayManager: string;
    };
    side: "HOME" | "AWAY";
    engineTotal: number;
    officialTotal: number;
    difference: number;
    workbookTotal: number;
    categoryEvidence: string[];
  };
};

export type ReferenceExcludedRuleIssue = {
  category: "PLAYER_MAPPING" | "MISSING_RATING" | "UNKNOWN";
  matchday: number;
  fixture: {
    homeManager: string;
    awayManager: string;
  };
  manager: string;
  side: "HOME" | "AWAY";
  engineTotal: number;
  officialTotal: number;
  difference: number;
  categoryEvidence: string[];
  differingPlayers: ReferencePlayerComparison[];
};

export type ReferenceAppliedRuleCandidateReport = {
  workbook: string;
  competition: "LEAGUE_1";
  generatedAt: string;
  candidates: ReferenceAppliedRuleCandidate[];
  excludedIssues: ReferenceExcludedRuleIssue[];
  summary: {
    candidates: number;
    byType: Record<ReferenceAppliedRuleCandidateType, number>;
    excludedIssues: number;
    excludedByCategory: Record<ReferenceExcludedRuleIssue["category"], number>;
  };
};

export type ReferenceFinalFixtureVerification = {
  matchday: number;
  fixture: {
    homeManager: string;
    awayManager: string;
  };
  calculatedScore: {
    home: number;
    away: number;
  };
  officialEngineScore: {
    home: number;
    away: number;
  };
  historicalScore: {
    home: number;
    away: number;
  };
  remainingDifference: {
    home: number;
    away: number;
    absolute: number;
  };
  exactMatch: boolean;
  appliedRuleIds: string[];
  remainingManagerDifferences: ReferenceFinalManagerDifference[];
  remainingCategories: ReferenceDifferenceCategory[];
};

export type ReferenceFinalManagerDifference = {
  manager: string;
  side: "HOME" | "AWAY";
  officialEngineTotal: number;
  historicalTotal: number;
  difference: number;
  category: ReferenceDifferenceCategory;
};

export type ReferenceFinalDifferenceCategorySummary = {
  category: ReferenceDifferenceCategory;
  managerDifferences: number;
  totalAbsoluteDifference: number;
};

export type ReferenceFinalLeagueTableRow = {
  position: number;
  manager: string;
  matchesPlayed: number;
  wins: number;
  draws: number;
  losses: number;
  fantasyGoalsFor: number;
  fantasyGoalsAgainst: number;
  fantasyGoalDifference: number;
  leaguePoints: number;
};

export type ReferenceFinalSeasonVerificationReport = {
  workbook: string;
  competition: "LEAGUE_1";
  generatedAt: string;
  verificationAssumption: "ALL_RULE_CANDIDATES_REVIEWED";
  fixtures: ReferenceFinalFixtureVerification[];
  finalLeagueTable: ReferenceFinalLeagueTableRow[];
  remainingIssues: ReferenceExcludedRuleIssue[];
  summary: {
    totalFixtures: number;
    perfectFixtureMatches: number;
    remainingDifferences: number;
    remainingTotalScoreDifference: number;
    rulesApplied: Record<ReferenceAppliedRuleCandidateType, number>;
    differencesByCategory: ReferenceFinalDifferenceCategorySummary[];
    remainingByCategory: Record<ReferenceExcludedRuleIssue["category"], number>;
  };
};

export type ReferenceFixtureDifference = {
  matchday: number;
  homeManager: string;
  awayManager: string;
  calculatedScore: {
    home: number;
    away: number;
  };
  officialScore: {
    home: number;
    away: number;
  };
  scoreDifference: {
    home: number;
    away: number;
  };
};

export type ReferenceInvalidTeamCase = {
  matchday: number;
  managerName: string;
  calculatedScore: number;
  officialScore: number;
  side: "HOME" | "AWAY";
};

export type ReferenceSeasonVerificationReport = {
  workbook: string;
  sheets: {
    evaluation: string;
    fixtures: string;
  };
  competition: "LEAGUE_1";
  processedAt: string;
  managers: string[];
  excludedEvaluationManagers: string[];
  fixtures: ReferenceFixture[];
  managerEvaluations: ReferenceManagerEvaluation[];
  differences: ReferenceFixtureDifference[];
  invalidTeamCases: ReferenceInvalidTeamCase[];
  summary: {
    matchdaysProcessed: number;
    fixturesProcessed: number;
    managerEvaluationsProcessed: number;
    exactMatches: number;
    differences: number;
    invalidTeamCases: number;
    totalScoreDifference: number;
  };
};

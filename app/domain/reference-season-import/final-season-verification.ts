import { calculateLeagueTable } from "../league-engine";
import type { PreviousLeagueTableRow } from "../league-engine";
import type { MatchOutcome, MatchResult } from "../match-engine";
import { applyRulesToMatchday } from "../rules-engine";
import type { BmsRule } from "../rules-engine";

import type {
  ReferenceAppliedRuleCandidate,
  ReferenceAppliedRuleCandidateReport,
  ReferenceAppliedRuleCandidateType,
  ReferenceDifferenceCategory,
  ReferenceExcludedRuleIssue,
  ReferenceFinalManagerDifference,
  ReferenceFinalFixtureVerification,
  ReferenceFinalSeasonVerificationReport,
  ReferenceSeasonVerificationReport,
} from "./types";

const competitionId = "reference-season-liga-1";

function createEvaluationKey(matchday: number, manager: string): string {
  return `${matchday}:${manager}`;
}

function getOutcome(home: number, away: number): MatchOutcome {
  if (home > away) {
    return "HOME_WIN";
  }

  if (home < away) {
    return "AWAY_WIN";
  }

  return "DRAW";
}

function getLeaguePoints(outcome: MatchOutcome): { home: 0 | 1 | 3; away: 0 | 1 | 3 } {
  if (outcome === "HOME_WIN") {
    return { home: 3, away: 0 };
  }

  if (outcome === "AWAY_WIN") {
    return { home: 0, away: 3 };
  }

  return { home: 1, away: 1 };
}

function createCalculatedMatchResult(
  matchday: number,
  homeManager: string,
  awayManager: string,
  homeScore: number,
  awayScore: number,
): MatchResult {
  const outcome = getOutcome(homeScore, awayScore);
  const leaguePoints = getLeaguePoints(outcome);

  return {
    competitionId,
    matchday,
    outcome,
    winner: outcome === "DRAW"
      ? null
      : {
          side: outcome === "HOME_WIN" ? "HOME" : "AWAY",
          managerId: outcome === "HOME_WIN" ? homeManager : awayManager,
        },
    fantasyGoals: {
      home: homeScore,
      away: awayScore,
    },
    leaguePoints,
    teams: {
      home: {
        managerId: homeManager,
        fantasyGoalsFor: homeScore,
        fantasyGoalsAgainst: awayScore,
        fantasyGoalDifference: homeScore - awayScore,
        leaguePoints: leaguePoints.home,
      },
      away: {
        managerId: awayManager,
        fantasyGoalsFor: awayScore,
        fantasyGoalsAgainst: homeScore,
        fantasyGoalDifference: awayScore - homeScore,
        leaguePoints: leaguePoints.away,
      },
    },
    positionComparison: {
      goalkeeper: 0,
      defender: 0,
      midfielder: 0,
      forward: 0,
    },
    topPerformers: {
      bestPlayer: null,
      worstPlayer: null,
      bestTeamLine: {
        team: "HOME",
        position: "goalkeeper",
        points: 0,
      },
      worstTeamLine: {
        team: "HOME",
        position: "goalkeeper",
        points: 0,
      },
      highestScoringTeam: homeScore === awayScore
        ? "TIED"
        : homeScore > awayScore ? "HOME" : "AWAY",
      lowestScoringTeam: homeScore === awayScore
        ? "TIED"
        : homeScore < awayScore ? "HOME" : "AWAY",
    },
  };
}

function candidateToRule(candidate: ReferenceAppliedRuleCandidate): BmsRule {
  const base = {
    id: candidate.candidateId,
    competitionId: candidate.proposedRule.competitionId,
    validFromMatchday: candidate.proposedRule.validFromMatchday,
    validToMatchday: candidate.proposedRule.validToMatchday,
    managerId: candidate.proposedRule.managerReference.displayName,
    reason: candidate.proposedRule.reason,
    createdAt: "2026-07-01T00:00:00.000Z",
    administrator: "REFERENCE_SEASON_REVIEW",
  };

  if (candidate.proposedRule.type === "TEAM_INVALID") {
    return {
      ...base,
      type: "TEAM_INVALID",
      invalidFantasyGoals: candidate.proposedRule.value.invalidFantasyGoals ?? 0,
    };
  }

  return {
    ...base,
    type: candidate.proposedRule.type,
    points: candidate.proposedRule.value.points ?? 0,
  };
}

function createInitialLeagueTable(
  managers: readonly string[],
): PreviousLeagueTableRow[] {
  return managers.map((manager) => ({
    managerId: manager,
    teamId: `reference-team:${manager}`,
    teamName: manager,
    managerName: manager,
    matchesPlayed: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    fantasyGoalsFor: 0,
    fantasyGoalsAgainst: 0,
    fantasyGoalDifference: 0,
    leaguePoints: 0,
    formLastFive: [],
  }));
}

function countByType(
  rules: readonly BmsRule[],
): Record<ReferenceAppliedRuleCandidateType, number> {
  return {
    TEAM_INVALID: rules.filter((rule) => rule.type === "TEAM_INVALID").length,
    TEAM_PENALTY: rules.filter((rule) => rule.type === "TEAM_PENALTY").length,
    POINT_ADJUSTMENT: rules.filter((rule) => rule.type === "POINT_ADJUSTMENT").length,
  };
}

function countRemainingIssues(
  issues: readonly ReferenceExcludedRuleIssue[],
): Record<ReferenceExcludedRuleIssue["category"], number> {
  return {
    PLAYER_MAPPING: issues.filter((issue) => issue.category === "PLAYER_MAPPING").length,
    MISSING_RATING: issues.filter((issue) => issue.category === "MISSING_RATING").length,
    UNKNOWN: issues.filter((issue) => issue.category === "UNKNOWN").length,
  };
}

function getSourceCategoryByManager(
  candidates: ReferenceAppliedRuleCandidateReport,
): Map<string, ReferenceDifferenceCategory> {
  return new Map([
    ...candidates.candidates.map((candidate) => [
      createEvaluationKey(
        candidate.proposedRule.validFromMatchday,
        candidate.proposedRule.managerReference.displayName,
      ),
      candidate.sourceCategory,
    ] as const),
    ...candidates.excludedIssues.map((issue) => [
      createEvaluationKey(issue.matchday, issue.manager),
      issue.category,
    ] as const),
  ]);
}

export function verifyFinalReferenceSeason(
  verification: ReferenceSeasonVerificationReport,
  candidates: ReferenceAppliedRuleCandidateReport,
): ReferenceFinalSeasonVerificationReport {
  const evaluations = new Map(
    verification.managerEvaluations.map((evaluation) => [
      createEvaluationKey(evaluation.matchday, evaluation.managerName),
      evaluation,
    ]),
  );
  const rules = candidates.candidates.map(candidateToRule);
  const sourceCategoryByManager = getSourceCategoryByManager(candidates);
  const fixturesByMatchday = new Map<number, typeof verification.fixtures>();

  for (const fixture of verification.fixtures) {
    const matchdayFixtures = fixturesByMatchday.get(fixture.matchday) ?? [];
    matchdayFixtures.push(fixture);
    fixturesByMatchday.set(fixture.matchday, matchdayFixtures);
  }

  let previousLeagueTable = createInitialLeagueTable(verification.managers);
  const fixtureVerifications: ReferenceFinalFixtureVerification[] = [];
  const appliedRules: BmsRule[] = [];

  for (let matchday = 1; matchday <= 34; matchday += 1) {
    const fixtures = fixturesByMatchday.get(matchday) ?? [];
    const calculatedResults = fixtures.map((fixture) => {
      const homeEvaluation = evaluations.get(
        createEvaluationKey(matchday, fixture.homeManager),
      );
      const awayEvaluation = evaluations.get(
        createEvaluationKey(matchday, fixture.awayManager),
      );

      if (!homeEvaluation || !awayEvaluation) {
        throw new Error(
          `Missing reference evaluation for matchday ${matchday}: `
          + `${!homeEvaluation ? fixture.homeManager : fixture.awayManager}`,
        );
      }

      return createCalculatedMatchResult(
        matchday,
        fixture.homeManager,
        fixture.awayManager,
        homeEvaluation.calculatedScore,
        awayEvaluation.calculatedScore,
      );
    });
    const rulesResult = applyRulesToMatchday({
      calculatedMatchday: {
        competition: {
          id: competitionId,
        },
        matchday,
        matchResults: calculatedResults,
        calculationTimestamp: verification.processedAt,
      },
      rules,
      publicationTimestamp: verification.processedAt,
    });
    const officialMatchResults = rulesResult.officialResults.map(
      (result) => result.officialResult,
    );

    appliedRules.push(...rulesResult.appliedRules);
    previousLeagueTable = calculateLeagueTable({
      previousLeagueTable,
      matchResults: officialMatchResults,
      competitionId,
      matchday,
    }).rows;

    fixtures.forEach((fixture, index) => {
      const officialResult = rulesResult.officialResults[index];
      const homeDifference = officialResult.officialGoals.home - fixture.officialHomeScore;
      const awayDifference = officialResult.officialGoals.away - fixture.officialAwayScore;
      const remainingManagerDifferences: ReferenceFinalManagerDifference[] = [];

      if (homeDifference !== 0) {
        remainingManagerDifferences.push({
          manager: fixture.homeManager,
          side: "HOME",
          officialEngineTotal: officialResult.officialGoals.home,
          historicalTotal: fixture.officialHomeScore,
          difference: homeDifference,
          category: sourceCategoryByManager.get(
            createEvaluationKey(matchday, fixture.homeManager),
          ) ?? "UNKNOWN",
        });
      }

      if (awayDifference !== 0) {
        remainingManagerDifferences.push({
          manager: fixture.awayManager,
          side: "AWAY",
          officialEngineTotal: officialResult.officialGoals.away,
          historicalTotal: fixture.officialAwayScore,
          difference: awayDifference,
          category: sourceCategoryByManager.get(
            createEvaluationKey(matchday, fixture.awayManager),
          ) ?? "UNKNOWN",
        });
      }

      fixtureVerifications.push({
        matchday,
        fixture: {
          homeManager: fixture.homeManager,
          awayManager: fixture.awayManager,
        },
        calculatedScore: officialResult.calculatedGoals,
        officialEngineScore: officialResult.officialGoals,
        historicalScore: {
          home: fixture.officialHomeScore,
          away: fixture.officialAwayScore,
        },
        remainingDifference: {
          home: homeDifference,
          away: awayDifference,
          absolute: Math.abs(homeDifference) + Math.abs(awayDifference),
        },
        exactMatch: homeDifference === 0 && awayDifference === 0,
        appliedRuleIds: officialResult.appliedRuleIds,
        remainingManagerDifferences,
        remainingCategories: [
          ...new Set(remainingManagerDifferences.map(({ category }) => category)),
        ],
      });
    });
  }

  const remainingDifferences = fixtureVerifications.filter(
    (fixture) => !fixture.exactMatch,
  );
  const remainingManagerDifferences = remainingDifferences.flatMap(
    (fixture) => fixture.remainingManagerDifferences,
  );
  const differenceCategories: ReferenceDifferenceCategory[] = [
    "TEAM_INVALID",
    "MANUAL_PENALTY",
    "POINT_ADJUSTMENT",
    "PLAYER_MAPPING",
    "MISSING_RATING",
    "UNKNOWN",
  ];

  return {
    workbook: verification.workbook,
    competition: verification.competition,
    generatedAt: verification.processedAt,
    verificationAssumption: "ALL_RULE_CANDIDATES_REVIEWED",
    fixtures: fixtureVerifications,
    finalLeagueTable: previousLeagueTable.map((row) => ({
      position: row.position ?? 0,
      manager: row.managerName,
      matchesPlayed: row.matchesPlayed,
      wins: row.wins,
      draws: row.draws,
      losses: row.losses,
      fantasyGoalsFor: row.fantasyGoalsFor,
      fantasyGoalsAgainst: row.fantasyGoalsAgainst,
      fantasyGoalDifference: row.fantasyGoalDifference,
      leaguePoints: row.leaguePoints,
    })),
    remainingIssues: candidates.excludedIssues,
    summary: {
      totalFixtures: fixtureVerifications.length,
      perfectFixtureMatches: fixtureVerifications.length - remainingDifferences.length,
      remainingDifferences: remainingDifferences.length,
      remainingTotalScoreDifference: remainingDifferences.reduce(
        (total, fixture) => total + fixture.remainingDifference.absolute,
        0,
      ),
      rulesApplied: countByType(appliedRules),
      differencesByCategory: differenceCategories.map((category) => ({
        category,
        managerDifferences: remainingManagerDifferences.filter(
          (difference) => difference.category === category,
        ).length,
        totalAbsoluteDifference: remainingManagerDifferences
          .filter((difference) => difference.category === category)
          .reduce((total, difference) => total + Math.abs(difference.difference), 0),
      })),
      remainingByCategory: countRemainingIssues(candidates.excludedIssues),
    },
  };
}

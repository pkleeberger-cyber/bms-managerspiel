import { officialMatchdayExcelFixtureResult } from "../matchday-engine/official-matchday-excel.fixture";
import { OFFICIAL_STARTER_IDS, POSITION_ORDER } from "../lineup-engine";
import { createMatchAnalysis } from "./match-analysis-engine";

const thomasMatch = officialMatchdayExcelFixtureResult.officialResults.find(
  (result) => result.officialGoals.home === 0
    && result.officialGoals.away === 28
    && result.appliedRuleIds.includes("historical-matchday-34-thomas-invalid"),
);

if (!thomasMatch) {
  throw new Error("Validated Excel fixture is missing the historical Thomas match");
}

const thomasFixture = officialMatchdayExcelFixtureResult.calculatedMatchday.calculatedLineups.find(
  (fixture) => fixture.homeTeam.managerId === thomasMatch.teams.home.managerId
    && fixture.awayTeam.managerId === thomasMatch.teams.away.managerId,
);

if (!thomasFixture) {
  throw new Error("Validated Excel fixture is missing the historical Thomas lineups");
}

const historicalResultSnapshot = JSON.stringify(officialMatchdayExcelFixtureResult);

export const matchAnalysisExcelFixture = createMatchAnalysis(
  officialMatchdayExcelFixtureResult,
  thomasFixture.fixtureId,
);

const sourceReplacementCount = [
  ...thomasFixture.homeTeam.evaluatedPlayers,
  ...thomasFixture.awayTeam.evaluatedPlayers,
].filter((player) => player.wasReplacement).length;

export const matchAnalysisExcelFixtureProof = {
  comparesEveryOfficialSlot:
    matchAnalysisExcelFixture.playerComparisons.length === 11
    && matchAnalysisExcelFixture.playerComparisons.every((comparison, index) => (
      comparison.slotId === OFFICIAL_STARTER_IDS[index]
      && (
        comparison.homePlayer === null
        || comparison.homePlayer.slotId === comparison.slotId
      )
      && (
        comparison.awayPlayer === null
        || comparison.awayPlayer.slotId === comparison.slotId
      )
    )),
  comparesEveryPosition:
    matchAnalysisExcelFixture.positionAnalysis.length === 4
    && matchAnalysisExcelFixture.positionAnalysis.every((duel, index) => (
      duel.position === POSITION_ORDER[index]
      && duel.homePoints === thomasFixture.homeTeam.team?.positionTotals[duel.position]
      && duel.awayPoints === thomasFixture.awayTeam.team?.positionTotals[duel.position]
    )),
  determinesMatchwinner:
    matchAnalysisExcelFixture.matchWinners.overallMatchwinner !== null,
  preservesReplacementUsage:
    matchAnalysisExcelFixture.matchFactors.replacementPlayerCount
      === sourceReplacementCount,
  exposesHistoricalRule:
    matchAnalysisExcelFixture.matchFactors.appliedRules.length === 1
    && matchAnalysisExcelFixture.matchFactors.appliedRules[0].rule.id
      === "historical-matchday-34-thomas-invalid"
    && matchAnalysisExcelFixture.matchFactors.appliedRules[0].audit?.oldValue.home === 13
    && matchAnalysisExcelFixture.matchFactors.appliedRules[0].audit?.newValue.home === 0,
  preservesOfficialScore:
    matchAnalysisExcelFixture.officialScore.home === 0
    && matchAnalysisExcelFixture.officialScore.away === 28
    && matchAnalysisExcelFixture.calculatedScore.home === 13
    && matchAnalysisExcelFixture.calculatedScore.away === 28,
  exposesEveryPlayerCategory:
    [
      ...matchAnalysisExcelFixture.players.home,
      ...matchAnalysisExcelFixture.players.away,
    ].every((player) => (
      Number.isFinite(player.rating)
      && Number.isFinite(player.ratingPoints)
      && Number.isFinite(player.appearancePoints)
      && Number.isFinite(player.goals)
      && typeof player.yellowRedCard === "boolean"
      && typeof player.redCard === "boolean"
      && typeof player.teamOfTheWeek === "boolean"
      && Number.isFinite(player.totalPoints)
    )),
  preservesHistoricalSnapshot:
    JSON.stringify(officialMatchdayExcelFixtureResult) === historicalResultSnapshot,
} as const;

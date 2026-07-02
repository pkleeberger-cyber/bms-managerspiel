import { officialMatchdayExcelFixtureResult } from "../matchday-engine/official-matchday-excel.fixture";
import { secondLeagueOfficialFixtureResult } from "../matchday-engine/second-league-official.fixture";
import { createOfficialCompetitionOverview } from "./competition-overview";

export const officialCompetitionExcelFixture =
  createOfficialCompetitionOverview(officialMatchdayExcelFixtureResult);

export const secondLeagueCompetitionFixture =
  createOfficialCompetitionOverview(secondLeagueOfficialFixtureResult);

export const officialCompetitionExcelFixtureProof = {
  usesEveryOfficialResult:
    officialCompetitionExcelFixture.fixtures.length
      === officialMatchdayExcelFixtureResult.officialResults.length,
  preservesOfficialScores:
    officialCompetitionExcelFixture.fixtures.every((fixture, index) => {
      const result = officialMatchdayExcelFixtureResult.officialResults[index];

      return fixture.result
        === `${result.officialGoals.home} : ${result.officialGoals.away}`;
    }),
  usesOfficialTable:
    officialCompetitionExcelFixture.standings.length
      === officialMatchdayExcelFixtureResult.officialLeagueTable.rows.length
    && officialCompetitionExcelFixture.standings.every((standing, index) => (
      standing.teamId
        === officialMatchdayExcelFixtureResult.officialLeagueTable.rows[index].teamId
    )),
  usesOfficialHero:
    officialCompetitionExcelFixture.heroEvent?.id
      === officialMatchdayExcelFixtureResult.heroEvent?.id,
  exposesOfficialContext:
    officialCompetitionExcelFixture.tensionZones.length === 3
    && officialCompetitionExcelFixture.leaderboards.length === 4,
} as const;

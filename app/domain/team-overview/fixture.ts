import { matchAnalysisExcelFixture } from "../match-analysis-engine/fixture";
import { officialMatchdayExcelFixtureResult } from "../matchday-engine/official-matchday-excel.fixture";
import { createTeamOverviewData } from "./team-overview";

export const teamOverviewExcelFixture = createTeamOverviewData(
  officialMatchdayExcelFixtureResult,
  matchAnalysisExcelFixture,
  matchAnalysisExcelFixture.homeTeam.managerId,
);

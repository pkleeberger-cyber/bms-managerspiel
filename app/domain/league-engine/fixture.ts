import type { MatchOutcome, MatchResult } from "../match-engine";
import { calculateLeagueTable } from "./league-engine";
import type { PreviousLeagueTableRow } from "./types";

const competitionId = "erste-liga";
const matchday = 9;

export const previousLeagueTableFixture: PreviousLeagueTableRow[] = [
  {
    position: 1,
    managerId: "manager-alpha",
    teamId: "team-alpha",
    teamName: "Alpha FC",
    managerName: "Anna",
    matchesPlayed: 8,
    wins: 5,
    draws: 3,
    losses: 0,
    fantasyGoalsFor: 100,
    fantasyGoalsAgainst: 80,
    fantasyGoalDifference: 20,
    leaguePoints: 18,
    formLastFive: ["W", "W", "D", "W", "W"],
  },
  {
    position: 2,
    managerId: "manager-beta",
    teamId: "team-beta",
    teamName: "Beta 04",
    managerName: "Ben",
    matchesPlayed: 8,
    wins: 5,
    draws: 2,
    losses: 1,
    fantasyGoalsFor: 95,
    fantasyGoalsAgainst: 82,
    fantasyGoalDifference: 13,
    leaguePoints: 17,
    formLastFive: ["W", "D", "W", "W", "D"],
  },
  {
    position: 3,
    managerId: "manager-gamma",
    teamId: "team-gamma",
    teamName: "Gamma United",
    managerName: "Greta",
    matchesPlayed: 8,
    wins: 4,
    draws: 3,
    losses: 1,
    fantasyGoalsFor: 90,
    fantasyGoalsAgainst: 85,
    fantasyGoalDifference: 5,
    leaguePoints: 15,
    formLastFive: ["D", "W", "W", "D", "W"],
  },
  {
    position: 4,
    managerId: "manager-delta",
    teamId: "team-delta",
    teamName: "Delta SV",
    managerName: "David",
    matchesPlayed: 8,
    wins: 3,
    draws: 3,
    losses: 2,
    fantasyGoalsFor: 80,
    fantasyGoalsAgainst: 90,
    fantasyGoalDifference: -10,
    leaguePoints: 12,
    formLastFive: ["L", "W", "D", "W", "D"],
  },
  {
    position: 5,
    managerId: "manager-epsilon",
    teamId: "team-epsilon",
    teamName: "Epsilon Köln",
    managerName: "Eva",
    matchesPlayed: 8,
    wins: 3,
    draws: 1,
    losses: 4,
    fantasyGoalsFor: 78,
    fantasyGoalsAgainst: 95,
    fantasyGoalDifference: -17,
    leaguePoints: 10,
    formLastFive: ["L", "W", "L", "D", "W"],
  },
  {
    position: 6,
    managerId: "manager-zeta",
    teamId: "team-zeta",
    teamName: "Zeta Bremen",
    managerName: "Zoe",
    matchesPlayed: 8,
    wins: 2,
    draws: 2,
    losses: 4,
    fantasyGoalsFor: 70,
    fantasyGoalsAgainst: 100,
    fantasyGoalDifference: -30,
    leaguePoints: 8,
    formLastFive: ["L", "D", "L", "W", "L"],
  },
];

function createMatchResult(
  homeManagerId: string,
  awayManagerId: string,
  homeGoals: number,
  awayGoals: number,
): MatchResult {
  const outcome: MatchOutcome = homeGoals > awayGoals
    ? "HOME_WIN"
    : homeGoals < awayGoals
      ? "AWAY_WIN"
      : "DRAW";
  const leaguePoints = outcome === "HOME_WIN"
    ? { home: 3 as const, away: 0 as const }
    : outcome === "AWAY_WIN"
      ? { home: 0 as const, away: 3 as const }
      : { home: 1 as const, away: 1 as const };

  return {
    competitionId,
    matchday,
    outcome,
    winner: outcome === "DRAW"
      ? null
      : {
          side: outcome === "HOME_WIN" ? "HOME" : "AWAY",
          managerId: outcome === "HOME_WIN" ? homeManagerId : awayManagerId,
        },
    fantasyGoals: {
      home: homeGoals,
      away: awayGoals,
    },
    leaguePoints,
    teams: {
      home: {
        managerId: homeManagerId,
        fantasyGoalsFor: homeGoals,
        fantasyGoalsAgainst: awayGoals,
        fantasyGoalDifference: homeGoals - awayGoals,
        leaguePoints: leaguePoints.home,
      },
      away: {
        managerId: awayManagerId,
        fantasyGoalsFor: awayGoals,
        fantasyGoalsAgainst: homeGoals,
        fantasyGoalDifference: awayGoals - homeGoals,
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
      bestTeamLine: { team: "HOME", position: "goalkeeper", points: 0 },
      worstTeamLine: { team: "HOME", position: "goalkeeper", points: 0 },
      highestScoringTeam: homeGoals === awayGoals ? "TIED" : homeGoals > awayGoals ? "HOME" : "AWAY",
      lowestScoringTeam: homeGoals === awayGoals ? "TIED" : homeGoals < awayGoals ? "HOME" : "AWAY",
    },
  };
}

export const leagueMatchResultsFixture = [
  createMatchResult("manager-alpha", "manager-beta", 10, 20),
  createMatchResult("manager-gamma", "manager-delta", -5, -5),
  createMatchResult("manager-epsilon", "manager-zeta", 15, 5),
] as const satisfies readonly MatchResult[];

const previousTableSnapshot = JSON.stringify(previousLeagueTableFixture);

export const leagueEngineFixtureResult = calculateLeagueTable({
  previousLeagueTable: previousLeagueTableFixture,
  matchResults: leagueMatchResultsFixture,
  competitionId,
  matchday,
});

const rowByTeamId = new Map(leagueEngineFixtureResult.rows.map((row) => [row.teamId, row]));

export const leagueEngineFixtureProof = {
  updatesPoints:
    rowByTeamId.get("team-beta")?.leaguePoints === 20
    && rowByTeamId.get("team-gamma")?.leaguePoints === 16,
  updatesFantasyGoals:
    rowByTeamId.get("team-alpha")?.fantasyGoalsFor === 110
    && rowByTeamId.get("team-alpha")?.fantasyGoalsAgainst === 100,
  supportsNegativeFantasyGoals:
    rowByTeamId.get("team-gamma")?.fantasyGoalsFor === 85
    && rowByTeamId.get("team-gamma")?.fantasyGoalsAgainst === 80,
  changesSorting:
    leagueEngineFixtureResult.rows[0]?.teamId === "team-beta"
    && leagueEngineFixtureResult.rows[1]?.teamId === "team-alpha"
    && leagueEngineFixtureResult.rows[3]?.teamId === "team-epsilon",
  calculatesPositionChange:
    rowByTeamId.get("team-beta")?.positionChange === "up"
    && rowByTeamId.get("team-alpha")?.positionChange === "down"
    && rowByTeamId.get("team-gamma")?.positionChange === "unchanged",
  updatesLatestFiveForm:
    rowByTeamId.get("team-alpha")?.formLastFive.join("") === "WDWWL"
    && rowByTeamId.get("team-beta")?.formLastFive.join("") === "DWWDW",
  doesNotMutatePreviousTable: JSON.stringify(previousLeagueTableFixture) === previousTableSnapshot,
} as const;

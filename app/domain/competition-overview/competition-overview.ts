import type { LeagueTableRow } from "../league-engine";
import type { OfficialMatchdayResult } from "../matchday-engine";
import type {
  CompetitionFixtureView,
  CompetitionStandingView,
  OfficialCompetitionOverview,
} from "./types";

function getZone(
  row: LeagueTableRow,
  rows: readonly LeagueTableRow[],
  europeRanks: readonly number[],
  relegationRanks: readonly number[],
): CompetitionStandingView["zone"] {
  if (row.position === 1) {
    return "leader";
  }

  if (europeRanks.includes(row.position)) {
    return "international";
  }

  if (relegationRanks.includes(row.position)) {
    return row.position === rows.length ? "bottom" : "relegation";
  }

  return "neutral";
}

function createStandings(
  officialMatchday: OfficialMatchdayResult,
): CompetitionStandingView[] {
  const { europeRanks, relegationRanks } =
    officialMatchday.calculatedMatchday.competition;
  const rows = officialMatchday.officialLeagueTable.rows;

  return rows.map((row) => ({
    teamId: row.teamId,
    rank: row.position,
    club: row.teamName,
    manager: row.managerName,
    played: row.matchesPlayed,
    goals: `${row.fantasyGoalsFor}:${row.fantasyGoalsAgainst}`,
    points: row.leaguePoints,
    form: [...row.formLastFive],
    zone: getZone(row, rows, europeRanks, relegationRanks),
  }));
}

function createFixtures(
  officialMatchday: OfficialMatchdayResult,
  rowByManagerId: ReadonlyMap<string, LeagueTableRow>,
): CompetitionFixtureView[] {
  return officialMatchday.officialResults.map((result) => {
    const home = rowByManagerId.get(result.teams.home.managerId);
    const away = rowByManagerId.get(result.teams.away.managerId);

    if (!home || !away) {
      throw new Error("Official match result cannot be mapped to league table teams");
    }

    return {
      home: home.teamName,
      homeManager: home.managerName,
      homeTeamId: home.teamId,
      away: away.teamName,
      awayManager: away.managerName,
      awayTeamId: away.teamId,
      result: `${result.officialGoals.home} : ${result.officialGoals.away}`,
      status: result.appliedRuleIds.length > 0
        ? "Offiziell angepasst"
        : "Ausgewertet",
      ...(result.appliedRuleIds.length > 0
        ? { href: `/team/spiele/${officialMatchday.metadata.matchday}/analyse` }
        : {}),
    };
  });
}

function getFixtureKey(fixture: CompetitionFixtureView): string {
  return `${fixture.home}|${fixture.away}`;
}

export function createOfficialCompetitionOverview(
  officialMatchday: OfficialMatchdayResult,
): OfficialCompetitionOverview {
  const rows = officialMatchday.officialLeagueTable.rows;
  const rowByManagerId = new Map(rows.map((row) => [row.managerId, row]));
  const fixtures = createFixtures(officialMatchday, rowByManagerId);
  const eventBadges = officialMatchday.officialEvents.flatMap((event) => {
    const fixture = fixtures.find((candidate) => (
      event.relatedTeamIds.includes(candidate.homeTeamId)
      || event.relatedTeamIds.includes(candidate.awayTeamId)
    ));

    return fixture
      ? [{ fixtureKey: getFixtureKey(fixture), label: event.title }]
      : [];
  });
  const context = officialMatchday.officialLeagueContext;
  const topFourPoints = context.topFour.map((row) => row.leaguePoints);
  const topFourSpread = topFourPoints.length > 0
    ? Math.max(...topFourPoints) - Math.min(...topFourPoints)
    : 0;
  const bestOffense = [...rows].sort(
    (first, second) => second.fantasyGoalsFor - first.fantasyGoalsFor,
  )[0];
  const bestDefense = [...rows].sort(
    (first, second) => first.fantasyGoalsAgainst - second.fantasyGoalsAgainst,
  )[0];

  return {
    competitionId: officialMatchday.metadata.competitionId,
    matchday: officialMatchday.metadata.matchday,
    heroEvent: officialMatchday.heroEvent,
    fixtures,
    standings: createStandings(officialMatchday),
    tensionZones: [
      {
        label: "🏆 Meisterschaft",
        story: `${context.leader.teamName} führt mit ${context.titleGap} Punkt${context.titleGap === 1 ? "" : "en"}.`,
        context: "Offizieller Tabellenstand.",
      },
      {
        label: "🌍 Internationale Plätze",
        story: `${context.topFour.length} Teams liegen über ${topFourSpread} Punkte verteilt.`,
        context: "Offizielle Top-4-Zone.",
      },
      {
        label: "⬇ Abstieg",
        story: `${context.relegationTeams.length} Teams liegen in der Abstiegszone.`,
        context: `Abstand innerhalb der Zone: ${context.relegationGap} Punkte.`,
      },
    ],
    leaderboards: [
      {
        label: "Beste Offensive",
        value: bestOffense?.teamName ?? "—",
        detail: `${bestOffense?.fantasyGoalsFor ?? 0} Tore`,
      },
      {
        label: "Beste Defensive",
        value: bestDefense?.teamName ?? "—",
        detail: `${bestDefense?.fantasyGoalsAgainst ?? 0} Gegentore`,
      },
      {
        label: "Höchster Spieltagswert",
        value: context.highestScoringTeam?.team.teamName ?? "—",
        detail: `${context.highestScoringTeam?.fantasyGoals ?? 0} Tore`,
      },
      {
        label: "Größter Positionssprung",
        value: context.largestPositionJump?.team.teamName ?? "—",
        detail: context.largestPositionJump
          ? `${context.largestPositionJump.from}. → ${context.largestPositionJump.to}.`
          : "Keine Veränderung",
      },
    ],
    eventBadges,
  };
}

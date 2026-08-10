import type { MatchdayLifecycleStatus, Prisma, PrismaClient } from "@prisma/client";

import { calculateLeagueTable } from "@/domain/league-engine";
import type { PreviousLeagueTableRow } from "@/domain/league-engine";
import type { MatchOutcome, MatchResult } from "@/domain/match-engine";
import { getPrismaClient } from "@/infrastructure/prisma";

type SnapshotClient = PrismaClient | Prisma.TransactionClient;

type TableJsonRow = {
  rank?: number;
  position?: number;
  managerId: string;
  teamId: string;
  managerName: string;
  teamName?: string;
  played?: number;
  matchesPlayed?: number;
  wins?: number;
  draws?: number;
  losses?: number;
  goalsFor?: number;
  fantasyGoalsFor?: number;
  goalsAgainst?: number;
  fantasyGoalsAgainst?: number;
  goalDifference?: number;
  fantasyGoalDifference?: number;
  points?: number;
  leaguePoints?: number;
  form?: string[];
  formLastFive?: ("W" | "D" | "L")[];
};

type PublishedResultFixture = {
  id: string;
  competitionId: string;
  matchday: number;
  homeTeam: { id: string; managerId: string; name: string; manager: { displayName: string } };
  awayTeam: { id: string; managerId: string; name: string; manager: { displayName: string } };
  result: {
    officialHomeGoals: number;
    officialAwayGoals: number;
  } | null;
};

const totalMatchdays = 34;

export async function rebuildAccumulatedLeagueTableSnapshots(
  input: {
    competitionId: string;
    fromMatchday: number;
    tx?: SnapshotClient;
  },
) {
  const prisma = input.tx ?? getPrismaClient();

  if (!prisma) {
    throw new Error("Prisma ist nicht verfügbar.");
  }

  const publishedMatchdays = await loadPublishedMatchdays(prisma, input.competitionId);
  const maxPublishedMatchday = Math.max(0, ...publishedMatchdays);

  if (maxPublishedMatchday === 0) {
    return;
  }

  let previousRows = await loadTableRows(prisma, input.competitionId, 0);

  for (let matchday = 1; matchday <= maxPublishedMatchday; matchday += 1) {
    if (!publishedMatchdays.includes(matchday)) {
      continue;
    }

    const fixtures = await prisma.fixture.findMany({
      where: {
        competitionId: input.competitionId,
        matchday,
      },
      include: {
        homeTeam: { include: { manager: true } },
        awayTeam: { include: { manager: true } },
        result: true,
      },
      orderBy: { id: "asc" },
    });
    const matchResults = fixtures.flatMap((fixture) =>
      fixture.result ? [mapFixtureToMatchResult({
        id: fixture.id,
        competitionId: fixture.competitionId,
        matchday: fixture.matchday,
        homeTeam: fixture.homeTeam,
        awayTeam: fixture.awayTeam,
        result: {
          officialHomeGoals: fixture.result.officialHomeGoals,
          officialAwayGoals: fixture.result.officialAwayGoals,
        },
      })] : [],
    );
    const updatedTable = calculateLeagueTable({
      previousLeagueTable: previousRows,
      matchResults,
      competitionId: input.competitionId,
      matchday,
    });

    if (matchday >= input.fromMatchday) {
      await prisma.leagueTableSnapshot.upsert({
        where: {
          competitionId_matchday: {
            competitionId: input.competitionId,
            matchday,
          },
        },
        update: {
          tableJson: updatedTable,
        },
        create: {
          competitionId: input.competitionId,
          matchday,
          tableJson: updatedTable,
        },
      });
    }

    previousRows = updatedTable.rows.map((row) => ({
      ...row,
      position: row.position,
    }));
  }
}

async function loadPublishedMatchdays(
  prisma: SnapshotClient,
  competitionId: string,
) {
  const lifecycles = await prisma.matchdayLifecycle.findMany({
    where: { competitionId },
    select: { matchday: true, status: true },
    orderBy: { matchday: "asc" },
  });

  return lifecycles
    .filter((lifecycle) => isPublishedLifecycleStatus(lifecycle.status))
    .map((lifecycle) => lifecycle.matchday)
    .filter((matchday) => matchday >= 1 && matchday <= totalMatchdays);
}

async function loadTableRows(
  prisma: SnapshotClient,
  competitionId: string,
  matchday: number,
): Promise<PreviousLeagueTableRow[]> {
  const snapshot = await prisma.leagueTableSnapshot.findUnique({
    where: {
      competitionId_matchday: {
        competitionId,
        matchday,
      },
    },
  });
  const rows = asTableRows(snapshot?.tableJson);

  if (rows.length === 0) {
    throw new Error(`Tabelle für Spieltag ${matchday} fehlt.`);
  }

  return rows.map((row, index) => ({
    position: row.rank ?? row.position ?? index + 1,
    managerId: row.managerId,
    teamId: row.teamId,
    teamName: row.teamName ?? row.managerName,
    managerName: row.managerName,
    matchesPlayed: row.played ?? row.matchesPlayed ?? 0,
    wins: row.wins ?? 0,
    draws: row.draws ?? 0,
    losses: row.losses ?? 0,
    fantasyGoalsFor: row.goalsFor ?? row.fantasyGoalsFor ?? 0,
    fantasyGoalsAgainst: row.goalsAgainst ?? row.fantasyGoalsAgainst ?? 0,
    fantasyGoalDifference:
      row.goalDifference ??
      row.fantasyGoalDifference ??
      (row.goalsFor ?? row.fantasyGoalsFor ?? 0) -
        (row.goalsAgainst ?? row.fantasyGoalsAgainst ?? 0),
    leaguePoints: row.points ?? row.leaguePoints ?? 0,
    formLastFive: row.formLastFive ?? normalizeForm(row.form),
  }));
}

function mapFixtureToMatchResult(
  fixture: PublishedResultFixture & {
    result: NonNullable<PublishedResultFixture["result"]>;
  },
): MatchResult {
  const goals = {
    home: fixture.result.officialHomeGoals,
    away: fixture.result.officialAwayGoals,
  };
  const outcome = getOutcome(goals.home, goals.away);
  const leaguePoints = getLeaguePoints(outcome);

  return {
    competitionId: fixture.competitionId,
    matchday: fixture.matchday,
    outcome,
    winner:
      outcome === "DRAW"
        ? null
        : {
            side: outcome === "HOME_WIN" ? "HOME" : "AWAY",
            managerId:
              outcome === "HOME_WIN"
                ? fixture.homeTeam.managerId
                : fixture.awayTeam.managerId,
          },
    fantasyGoals: goals,
    leaguePoints,
    teams: {
      home: {
        managerId: fixture.homeTeam.managerId,
        fantasyGoalsFor: goals.home,
        fantasyGoalsAgainst: goals.away,
        fantasyGoalDifference: goals.home - goals.away,
        leaguePoints: leaguePoints.home,
      },
      away: {
        managerId: fixture.awayTeam.managerId,
        fantasyGoalsFor: goals.away,
        fantasyGoalsAgainst: goals.home,
        fantasyGoalDifference: goals.away - goals.home,
        leaguePoints: leaguePoints.away,
      },
    },
    positionComparison: { goalkeeper: 0, defender: 0, midfielder: 0, forward: 0 },
    topPerformers: {
      bestPlayer: null,
      worstPlayer: null,
      bestTeamLine: { team: "HOME", position: "goalkeeper", points: 0 },
      worstTeamLine: { team: "HOME", position: "goalkeeper", points: 0 },
      highestScoringTeam: goals.home === goals.away ? "TIED" : goals.home > goals.away ? "HOME" : "AWAY",
      lowestScoringTeam: goals.home === goals.away ? "TIED" : goals.home < goals.away ? "HOME" : "AWAY",
    },
  };
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

function getLeaguePoints(outcome: MatchOutcome) {
  if (outcome === "HOME_WIN") {
    return { home: 3 as const, away: 0 as const };
  }

  if (outcome === "AWAY_WIN") {
    return { home: 0 as const, away: 3 as const };
  }

  return { home: 1 as const, away: 1 as const };
}

function isPublishedLifecycleStatus(status: MatchdayLifecycleStatus) {
  return status === "PRELIMINARY_PUBLISHED" ||
    status === "PUBLISHED_PRELIMINARY" ||
    status === "MANUAL_REVIEW_CONFIRMED" ||
    status === "CORRECTIONS_CONFIRMED" ||
    status === "OFFICIALLY_CLOSED" ||
    status === "PUBLISHED_OFFICIAL" ||
    status === "ARCHIVED";
}

function asTableRows(value: unknown): TableJsonRow[] {
  if (!value || typeof value !== "object" || !("rows" in value)) {
    return [];
  }

  const rows = (value as { rows?: unknown }).rows;

  return Array.isArray(rows) ? rows.filter(isTableRow) : [];
}

function isTableRow(value: unknown): value is TableJsonRow {
  return Boolean(
    value &&
      typeof value === "object" &&
      "managerId" in value &&
      "teamId" in value &&
      "managerName" in value,
  );
}

function normalizeForm(value: string[] | undefined) {
  if (!value) {
    return [];
  }

  return value.filter(
    (item): item is "W" | "D" | "L" =>
      item === "W" || item === "D" || item === "L",
  );
}

import {
  createExcelFixtureManagerId,
  getExcelPosition,
  mapAuswertungRowsToMatchData,
  mapKaderRowsToAssignments,
} from "./excel-fixture-mapper";
import type {
  ExcelAuswertungRow,
  ExcelKaderRow,
} from "./excel-fixture-mapper";
import { calculateMatchLineup } from "./lineup-engine";
import { OFFICIAL_STARTER_IDS } from "./lineup-structure";
import type {
  CalculatedPlayer,
  StarterLineupId,
} from "./types";

const competitionId = "excel-reality-test";
const matchday = 1;
const managerName = "Patrick";
const managerId = createExcelFixtureManagerId(managerName);

export const excelKaderRowsFixture = [
  { _id: 235, manager: "Patrick", position: "Torwart", playerName: "Vasilj" },
  { _id: 236, manager: "Patrick", position: "Torwart", playerName: "Flekken" },
  { _id: 237, manager: "Patrick", position: "Abwehr", playerName: "Doekhi" },
  { _id: 238, manager: "Patrick", position: "Abwehr", playerName: "Grimaldo" },
  { _id: 239, manager: "Patrick", position: "Abwehr", playerName: "N. Schlotterbeck" },
  { _id: 240, manager: "Patrick", position: "Abwehr", playerName: "Svensson" },
  { _id: 241, manager: "Patrick", position: "Abwehr", playerName: "Rosenfelder" },
  { _id: 242, manager: "Patrick", position: "Mittelfeld", playerName: "Olise" },
  { _id: 243, manager: "Patrick", position: "Mittelfeld", playerName: "Musiala" },
  { _id: 244, manager: "Patrick", position: "Mittelfeld", playerName: "M. Tillman" },
  { _id: 245, manager: "Patrick", position: "Mittelfeld", playerName: "Baumgartner" },
  { _id: 246, manager: "Patrick", position: "Mittelfeld", playerName: "Doan" },
  { _id: 247, manager: "Patrick", position: "Mittelfeld", playerName: "S. El mala" },
  { _id: 248, manager: "Patrick", position: "Mittelfeld", playerName: "Uzun" },
  { _id: 249, manager: "Patrick", position: "Sturm", playerName: "Burkhardt" },
  { _id: 250, manager: "Patrick", position: "Sturm", playerName: "Kane" },
  { _id: 251, manager: "Patrick", position: "Sturm", playerName: "Diomande" },
  { _id: 252, manager: "Patrick", position: "Sturm", playerName: "Bakayoko" },
] as const satisfies readonly ExcelKaderRow[];

export const excelAuswertungRowsFixture = [
  {
    club: "Bayern",
    playerName: "Olise",
    positionCode: "m",
    rating: 3.5,
    yellowRed: 0,
    red: 0,
    goals: 0,
    teamOfTheWeek: 0,
    oldExcelPoints: 1,
  },
  {
    club: "Leipzig",
    playerName: "Baumgartner",
    positionCode: "m",
    rating: 4,
    yellowRed: 0,
    red: 0,
    goals: 0,
    teamOfTheWeek: 0,
    oldExcelPoints: -1,
  },
  {
    club: "Leverkusen",
    playerName: "Grimaldo",
    positionCode: "a",
    rating: 2.5,
    yellowRed: 0,
    red: 0,
    goals: 0,
    teamOfTheWeek: 0,
    oldExcelPoints: 5,
  },
] as const satisfies readonly ExcelAuswertungRow[];

export const excelRealityAssignments = mapKaderRowsToAssignments(
  excelKaderRowsFixture,
  competitionId,
  matchday,
);
export const excelRealityMappedMatchData = mapAuswertungRowsToMatchData(
  excelAuswertungRowsFixture,
);

export const excelRealityLineupResult = calculateMatchLineup({
  managerId,
  competitionId,
  matchday,
  teamValidity: "VALID",
  assignments: excelRealityAssignments,
  matchData: excelRealityMappedMatchData.map((record) => record.matchData),
});

const sourceByPlayerId = new Map(
  excelRealityMappedMatchData.map((record) => [record.matchData.playerId, record]),
);
const assignmentBySlot = new Map(
  excelRealityAssignments.map((assignment) => [assignment.slotId, assignment]),
);
const evaluatedByStarterSlot = new Map(
  excelRealityLineupResult.evaluatedPlayers.map((player) => [player.evaluatedForLineupId, player]),
);

export const excelRealityPlayerPointComparison = excelRealityLineupResult.evaluatedPlayers.map((player) => {
  const source = sourceByPlayerId.get(player.playerId);

  if (!source) {
    throw new Error(`Missing Excel source row for evaluated player: ${player.playerName}`);
  }

  return {
    lineupId: player.lineupId,
    evaluatedForLineupId: player.evaluatedForLineupId,
    playerName: player.playerName,
    position: player.position,
    excelPosition: getExcelPosition(source.positionCode),
    calculatedNewPoints: player.totalPoints,
    oldExcelPoints: source.oldExcelPoints,
    difference: player.totalPoints - source.oldExcelPoints,
  };
});

export const excelRealityStarterSlotAudit = OFFICIAL_STARTER_IDS.map((starterSlotId) => {
  const evaluatedPlayer = evaluatedByStarterSlot.get(starterSlotId);
  const assignedPlayer = assignmentBySlot.get(starterSlotId);

  return {
    starterSlotId,
    assignedPlayerName: assignedPlayer?.playerName ?? null,
    status: evaluatedPlayer ? "EVALUATED" as const : "MISSING" as const,
    evaluatedPlayer: evaluatedPlayer ?? null,
  };
});

export const excelRealityFixtureResult = {
  workbook: "Test_Auswertung.xlsx",
  managerId,
  managerName,
  evaluatedPlayers: excelRealityLineupResult.evaluatedPlayers,
  evaluatedPlayerCount: excelRealityLineupResult.evaluatedPlayers.length,
  requestedStarterSlots: OFFICIAL_STARTER_IDS.length,
  replacementsUsed: excelRealityLineupResult.replacements.filter(
    (replacement) => replacement.replacementLineupId !== null,
  ),
  missingPositions: excelRealityLineupResult.replacements
    .filter((replacement) => replacement.replacementLineupId === null)
    .map((replacement) => replacement.starterLineupId),
  starterSlotAudit: excelRealityStarterSlotAudit,
  playerPointComparison: excelRealityPlayerPointComparison,
  teamTotal: excelRealityLineupResult.team.totalPoints,
};

function hasMatchingPosition(player: CalculatedPlayer): boolean {
  return excelRealityPlayerPointComparison.some((comparison) => (
    comparison.playerName === player.playerName && comparison.position === comparison.excelPosition
  ));
}

export const excelRealityFixtureProof = {
  ignoresGlobalRowIdForSlots:
    excelKaderRowsFixture[0]._id === 235
    && excelRealityAssignments[0]?.slotId === 1
    && excelRealityAssignments[17]?.slotId === 18,
  mapsAllEighteenSquadRows: excelRealityAssignments.length === 18,
  mapsRealEvaluationRows: excelRealityMappedMatchData.length === 3,
  evaluatesAvailableWorkbookPlayers:
    excelRealityFixtureResult.evaluatedPlayerCount === 3
    && excelRealityFixtureResult.missingPositions.length === 8,
  matchesHistoricalAppearanceBonus:
    excelRealityPlayerPointComparison.every((comparison) => comparison.difference === 0),
  matchesExcelPositions:
    excelRealityLineupResult.evaluatedPlayers.every(hasMatchingPosition),
  calculatesExpectedTeamTotal: excelRealityFixtureResult.teamTotal === 5,
} as const;

export type ExcelRealityStarterSlot = {
  starterSlotId: StarterLineupId;
  assignedPlayerName: string | null;
  status: "EVALUATED" | "MISSING";
  evaluatedPlayer: CalculatedPlayer | null;
};

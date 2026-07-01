import {
  extractExcelMatchdaySnapshotRows,
  mapExcelMatchdaySnapshot,
} from "./excel-matchday-snapshot.mapper";
import { calculateMatchLineup } from "./lineup-engine";

const workbookPath = "/Users/patrickk/Downloads/Test_Auswertung2.xlsx";
const competitionId = "excel-full-matchday-reality";

export const excelMatchdaySnapshotRows = extractExcelMatchdaySnapshotRows(workbookPath);
export const excelMappedManagerSnapshots = mapExcelMatchdaySnapshot(
  excelMatchdaySnapshotRows,
  competitionId,
);

export const excelCalculatedManagerSnapshots = excelMappedManagerSnapshots.map((managerSnapshot) => ({
  managerSnapshot,
  lineupResult: calculateMatchLineup({
    managerId: managerSnapshot.managerId,
    competitionId,
    matchday: managerSnapshot.matchday,
    teamValidity: "VALID",
    assignments: managerSnapshot.assignments,
    matchData: managerSnapshot.matchData,
  }),
}));

export const excelMatchdayManagerAudits = excelCalculatedManagerSnapshots.map(({
  managerSnapshot,
  lineupResult,
}) => {
  const sourceBySlot = new Map(
    managerSnapshot.sourceRows.map((row) => [row.slotId, row]),
  );
  const playerComparisons = lineupResult.evaluatedPlayers.map((player) => {
    const source = sourceBySlot.get(player.lineupId);

    if (!source) {
      throw new Error(
        `Missing snapshot source for ${managerSnapshot.managerName}, slot ${player.lineupId}`,
      );
    }

    return {
      slotId: player.lineupId,
      evaluatedForSlotId: player.evaluatedForLineupId,
      playerName: player.playerName,
      enginePoints: player.totalPoints,
      oldExcelPoints: source.oldExcelPoints,
      difference: player.totalPoints - source.oldExcelPoints,
    };
  });
  const oldExcelTotal = managerSnapshot.sourceRows.reduce(
    (total, row) => total + row.oldExcelPoints,
    0,
  );
  const engineTotal = lineupResult.team.totalPoints;

  return {
    managerName: managerSnapshot.managerName,
    evaluatedPlayerCount: lineupResult.evaluatedPlayers.length,
    missingPositions: lineupResult.replacements
      .filter((replacement) => replacement.replacementLineupId === null)
      .map((replacement) => replacement.starterLineupId),
    replacementsUsed: lineupResult.replacements
      .filter((replacement) => replacement.replacementLineupId !== null),
    engineTotal,
    oldExcelTotal,
    difference: engineTotal - oldExcelTotal,
    playerComparisons,
  };
});

const likelyAppearanceBonusDifferenceCount = excelMatchdayManagerAudits.reduce(
  (total, manager) => total + manager.playerComparisons.filter(
    (comparison) => comparison.difference === 1,
  ).length,
  0,
);

export const excelMatchdayAuditReport = {
  workbook: "Test_Auswertung2.xlsx",
  workbookPath,
  competitionId,
  matchday: excelMappedManagerSnapshots[0]?.matchday ?? null,
  managers: excelMatchdayManagerAudits,
  summary: {
    managersProcessed: excelMatchdayManagerAudits.length,
    managersWithPerfectMatch: excelMatchdayManagerAudits.filter(
      (manager) => manager.difference === 0,
    ).length,
    managersWithDifferences: excelMatchdayManagerAudits.filter(
      (manager) => manager.difference !== 0,
    ).length,
    totalDifference: excelMatchdayManagerAudits.reduce(
      (total, manager) => total + manager.difference,
      0,
    ),
    likelyAppearanceBonusDifferenceCount,
  },
};

export const excelMatchdayRealityFixtureProof = {
  extractsCompleteWorkbook:
    excelMatchdaySnapshotRows.length === 432
    && excelMatchdayAuditReport.summary.managersProcessed === 24,
  usesOfficialSlotIds:
    excelMappedManagerSnapshots.every((manager) => (
      manager.assignments.every((assignment, index) => assignment.slotId === index + 1)
    )),
  processesEveryManager:
    excelMatchdayManagerAudits.every((manager) => manager.evaluatedPlayerCount > 0),
  reportsExpectedAppearanceDifference:
    excelMatchdayAuditReport.summary.managersWithPerfectMatch === 24
    && excelMatchdayAuditReport.summary.managersWithDifferences === 0
    && excelMatchdayAuditReport.summary.totalDifference === 0
    && excelMatchdayAuditReport.summary.likelyAppearanceBonusDifferenceCount === 0,
  explainsEveryManagerDifference:
    excelMatchdayManagerAudits.every((manager) => (
      manager.difference === 0
      && manager.playerComparisons.every((comparison) => comparison.difference === 0)
    )),
} as const;

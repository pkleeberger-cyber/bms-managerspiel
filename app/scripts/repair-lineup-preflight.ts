import path from "node:path";

import { config } from "dotenv";

import {
  loadMatchdayLineupPreflight,
  writeMatchdayLineupPreflightReports,
} from "../application/matchday-lineup-preflight-service";
import { createSquadImportPreview } from "../application/squad-import-service";

config({ path: path.resolve(process.cwd(), ".env.local") });
config();

type WorkbookSuggestion = {
  managerSeasonId: string;
  slotId: number;
  playerName: string;
  playerId: string;
  workbookName: string;
};

async function repairLineupPreflight() {
  const matchday = readNumberArg("--matchday") ?? 2;
  const workbookPath = readStringArg("--workbook");
  const report = await loadMatchdayLineupPreflight(matchday);

  await writeMatchdayLineupPreflightReports(report);

  console.log(`Lineup preflight for matchday ${matchday}`);
  console.log(`- active managers: ${report.activeManagers}`);
  console.log(`- checked slots per manager: ${report.checkedSlotsPerManager}`);
  console.log(`- missing slots: ${report.missingSlotCount}`);
  console.log(`- markdown report: ${report.reportPaths.markdown}`);
  console.log(`- json report: ${report.reportPaths.json}`);

  const workbookSuggestions = await loadWorkbookSuggestions(workbookPath);

  if (report.missingSlotCount === 0) {
    console.log("No missing lineup assignments found.");
    return;
  }

  console.log("\nMissing slots");
  for (const manager of report.managersWithMissingSlots) {
    console.log(`\n${manager.managerName}`);

    for (const slot of manager.missingSlots) {
      const workbookSuggestion = workbookSuggestions.find(
        (suggestion) =>
          suggestion.managerSeasonId === manager.managerSeasonId &&
          suggestion.slotId === slot.slotId,
      );

      console.log(
        `- Slot ${slot.slotId} (${slot.expectedPosition}), ST ${slot.matchday}`,
      );
      console.log(
        `  Matchday 1 assignment: ${
          slot.matchday1Assignment
            ? `${slot.matchday1Assignment.playerName} (${slot.matchday1Assignment.validFromMatchday}-${slot.matchday1Assignment.validToMatchday ?? "open"})`
            : "none"
        }`,
      );
      console.log(
        `  Initial workbook candidate: ${
          workbookSuggestion
            ? `${workbookSuggestion.playerName} (${workbookSuggestion.workbookName})`
            : "none"
        }`,
      );
      console.log(
        `  Suggested player: ${
          workbookSuggestion?.playerName ??
          slot.suggestedPlayer?.playerName ??
          "none"
        }`,
      );
    }
  }

  console.log(
    "\nNo SquadAssignment records were changed. Apply the repair only after confirming the suggested player against the initial migration source.",
  );
}

async function loadWorkbookSuggestions(
  workbookPath: string | null,
): Promise<WorkbookSuggestion[]> {
  try {
    const preview = await createSquadImportPreview(workbookPath ?? undefined);
    const workbookName = preview.workbookName ?? "initial squad workbook";

    return [...preview.newSquads, ...preview.changedSquads, ...preview.unchangedSquads]
      .flatMap((squad) =>
        squad.slots.map((slot) => ({
          managerSeasonId: squad.managerSeasonId,
          slotId: slot.slotId,
          playerName: slot.player.displayName,
          playerId: slot.player.id,
          workbookName,
        })),
      );
  } catch (error) {
    console.log(
      `Initial squad workbook comparison skipped: ${
        error instanceof Error ? error.message : "unknown error"
      }`,
    );

    return [];
  }
}

function readStringArg(name: string) {
  const prefix = `${name}=`;
  const inline = process.argv.find((argument) => argument.startsWith(prefix));

  if (inline) {
    return inline.slice(prefix.length);
  }

  const index = process.argv.indexOf(name);

  if (index >= 0) {
    return process.argv[index + 1] ?? null;
  }

  return null;
}

function readNumberArg(name: string) {
  const raw = readStringArg(name);

  if (!raw) {
    return null;
  }

  const parsed = Number(raw);

  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 34 ? parsed : null;
}

void repairLineupPreflight().catch((error) => {
  console.error("Lineup preflight repair failed", error);
  process.exitCode = 1;
});

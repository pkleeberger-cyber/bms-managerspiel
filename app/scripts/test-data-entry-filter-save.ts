import {
  resolveSubmittedPlayerRowsForSave,
  type MatchdayZeroPlayerEntry,
} from "../application/matchday-zero-service";

const players = [
  createPlayer("club-a-player-1", "Club A Spieler", "Club A"),
  createPlayer("club-a-player-2", "Club A Spieler 2", "Club A"),
  createPlayer("club-b-player-1", "Club B Spieler", "Club B"),
] satisfies readonly MatchdayZeroPlayerEntry[];

const formData = new FormData();

formData.append("submittedPlayerId", "club-a-player-1");
formData.append("submittedPlayerId", "club-a-player-2");
formData.set("club-a-player-1:rating", "2.5");
formData.set("club-a-player-1:goals", "1");
formData.set("club-a-player-2:rating", "3");
formData.set("club-a-player-2:goals", "0");

const rowsToSave = resolveSubmittedPlayerRowsForSave(formData, players);
const rowIdsToSave = rowsToSave.map((player) => player.playerId);

assert(rowIdsToSave.includes("club-a-player-1"), "Club A player 1 missing");
assert(rowIdsToSave.includes("club-a-player-2"), "Club A player 2 missing");
assert(
  !rowIdsToSave.includes("club-b-player-1"),
  "Club B player must not be saved when hidden by filter",
);

console.log("Data-entry filtered save regression passed.");
console.log(`Rows selected for save: ${rowIdsToSave.length}`);
console.log("Hidden Club B row remained outside the submitted save set.");

function createPlayer(
  playerId: string,
  displayName: string,
  club: string,
): MatchdayZeroPlayerEntry {
  return {
    club,
    displayName,
    goals: 0,
    managerCount: 1,
    playerId,
    position: "ST",
    rating: null,
    red: false,
    status: "SAVED",
    teamOfTheWeek: false,
    yellowRed: false,
  };
}

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

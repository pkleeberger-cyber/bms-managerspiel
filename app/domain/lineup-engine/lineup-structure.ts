import type { BackupLineupId, LineupId, PlayerPosition, StarterLineupId } from "./types";

export const OFFICIAL_STARTER_IDS = [1, 3, 4, 5, 8, 9, 10, 11, 12, 15, 16] as const satisfies readonly StarterLineupId[];

export const OFFICIAL_BACKUP_IDS = [2, 6, 7, 13, 14, 17, 18] as const satisfies readonly BackupLineupId[];

export const OFFICIAL_LINEUP_IDS = [
  1, 2,
  3, 4, 5, 6, 7,
  8, 9, 10, 11, 12, 13, 14,
  15, 16, 17, 18,
] as const satisfies readonly LineupId[];

export const POSITION_ORDER = ["goalkeeper", "defender", "midfielder", "forward"] as const satisfies readonly PlayerPosition[];

export const BACKUP_IDS_BY_POSITION: Record<PlayerPosition, readonly BackupLineupId[]> = {
  goalkeeper: [2],
  defender: [6, 7],
  midfielder: [13, 14],
  forward: [17, 18],
};

export function getPositionForLineupId(lineupId: LineupId): PlayerPosition {
  if (lineupId <= 2) {
    return "goalkeeper";
  }

  if (lineupId <= 7) {
    return "defender";
  }

  if (lineupId <= 14) {
    return "midfielder";
  }

  return "forward";
}

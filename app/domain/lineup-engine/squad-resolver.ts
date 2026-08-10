import { OFFICIAL_LINEUP_IDS } from "./lineup-structure";
import type {
  EffectiveSquad,
  ManagerSquadAssignment,
  ResolveEffectiveSquadInput,
} from "./types";

export class SquadResolutionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SquadResolutionError";
  }
}

function isAssignmentValidForMatchday(assignment: ManagerSquadAssignment, matchday: number): boolean {
  return assignment.validFromMatchday <= matchday
    && (assignment.validToMatchday === null || assignment.validToMatchday >= matchday);
}

function validateAssignmentPeriod(assignment: ManagerSquadAssignment): void {
  if (!Number.isInteger(assignment.validFromMatchday) || assignment.validFromMatchday < 1) {
    throw new SquadResolutionError(`Invalid start matchday for slot ${assignment.slotId}`);
  }

  if (
    assignment.validToMatchday !== null
    && (!Number.isInteger(assignment.validToMatchday) || assignment.validToMatchday < assignment.validFromMatchday)
  ) {
    throw new SquadResolutionError(`Invalid assignment period for slot ${assignment.slotId}`);
  }
}

export function getEffectiveSquad(input: ResolveEffectiveSquadInput): EffectiveSquad {
  if (!Number.isInteger(input.matchday) || input.matchday < 1) {
    throw new SquadResolutionError(`Invalid matchday: ${input.matchday}`);
  }

  const relevantAssignments = input.assignments.filter((assignment) => {
    validateAssignmentPeriod(assignment);

    return assignment.managerId === input.managerId
      && assignment.competitionId === input.competitionId
      && isAssignmentValidForMatchday(assignment, input.matchday);
  });

  const players = OFFICIAL_LINEUP_IDS.flatMap((slotId) => {
    const assignmentsForSlot = relevantAssignments.filter((assignment) => assignment.slotId === slotId);

    if (assignmentsForSlot.length === 0) {
      return [];
    }

    if (assignmentsForSlot.length > 1) {
      throw new SquadResolutionError(
        `Expected at most one assignment for slot ${slotId} on matchday ${input.matchday}, found ${assignmentsForSlot.length}`,
      );
    }

    const [assignment] = assignmentsForSlot;

    return {
      lineupId: slotId,
      playerId: assignment.playerId,
      playerName: assignment.playerName,
    };
  });

  const uniquePlayerIds = new Set(players.map((player) => player.playerId));

  if (uniquePlayerIds.size !== players.length) {
    throw new SquadResolutionError(`Effective squad contains duplicate players on matchday ${input.matchday}`);
  }

  return {
    managerId: input.managerId,
    competitionId: input.competitionId,
    matchday: input.matchday,
    players,
  };
}

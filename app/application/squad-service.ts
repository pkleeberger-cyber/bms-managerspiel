import {
  PrismaManagerSeasonRepository,
  PrismaSquadRepository,
} from "@/infrastructure";
import type {
  ManagerSeasonRepository,
  SquadAssignmentRecord,
  SquadRepository,
} from "@/infrastructure";
import type { ManagerSquadAssignment } from "@/domain/lineup-engine";
import { lineupEngineFixtureAssignments } from "@/domain/lineup-engine/fixture";

export type SquadDataSource = "DATABASE" | "FIXTURE";

export type HistoricalSquadSnapshot = {
  dataSource: SquadDataSource;
  assignments: readonly ManagerSquadAssignment[];
};

export class SquadService {
  constructor(
    private readonly managerSeasonRepository: ManagerSeasonRepository =
      new PrismaManagerSeasonRepository(),
    private readonly squadRepository: SquadRepository = new PrismaSquadRepository(),
  ) {}

  async loadHistoricalSquadByManagerShortName(
    managerShortName: string,
  ): Promise<HistoricalSquadSnapshot> {
    const activeSeason = await this.managerSeasonRepository.loadActiveSeason();

    if (!activeSeason) {
      return fixtureSnapshot;
    }

    const managerSeasons =
      await this.managerSeasonRepository.loadCurrentSeasonManagerSeasons(
        activeSeason.id,
      );
    const managerSeason = managerSeasons?.find(
      (season) => season.shortName === managerShortName,
    );

    if (!managerSeason) {
      return fixtureSnapshot;
    }

    const assignments = await this.squadRepository.loadHistoricalSquad(
      managerSeason.id,
    );

    if (!assignments || assignments.length === 0) {
      return fixtureSnapshot;
    }

    return {
      dataSource: "DATABASE",
      assignments: assignments.map(mapRecordToEngineAssignment),
    };
  }
}

export async function loadHistoricalSquadByManagerShortName(
  managerShortName: string,
) {
  const service = new SquadService();

  return service.loadHistoricalSquadByManagerShortName(managerShortName);
}

const fixtureSnapshot: HistoricalSquadSnapshot = {
  dataSource: "FIXTURE",
  assignments: lineupEngineFixtureAssignments,
};

function mapRecordToEngineAssignment(
  assignment: SquadAssignmentRecord,
): ManagerSquadAssignment {
  return {
    managerId: assignment.managerId ?? assignment.managerSeasonId ?? "unknown-manager",
    competitionId: "erste-liga",
    playerId: assignment.playerId,
    playerName: assignment.playerName,
    slotId: assignment.slotId as ManagerSquadAssignment["slotId"],
    validFromMatchday: assignment.validFromMatchday,
    validToMatchday: assignment.validToMatchday,
    reason:
      assignment.reason === "SUMMER_TRANSFER"
        ? "REAL_TRANSFER_REPLACEMENT"
        : assignment.reason,
  };
}

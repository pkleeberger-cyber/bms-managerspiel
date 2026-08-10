import { PrismaPlayerRepository } from "@/infrastructure";
import { getPrismaClient } from "@/infrastructure/prisma";
import type {
  PlayerListPhase,
  PlayerListVersionRecord,
  PlayerPositionGroup,
  PlayerRecord,
  PlayerRepository,
  PlayerStatus,
} from "@/infrastructure";

export type PlayerMasterDatabaseStatus = "CONNECTED" | "UNAVAILABLE";

export type PlayerMasterCard = PlayerRecord & {
  currentSeason: string;
  hasOpenChange: boolean;
  managersUnderContract: number;
  openChangeLabel: string | null;
};

export type PlayerMasterSnapshot = {
  currentSeason: string;
  databaseStatus: PlayerMasterDatabaseStatus;
  importedPlayers: number;
  lastImport: string;
  players: readonly PlayerMasterCard[];
  clubs: readonly string[];
  statuses: readonly PlayerStatus[];
  positionGroups: readonly PlayerPositionGroup[];
};

export type TransferMarketPlayer = {
  id: string;
  displayName: string;
  club: string;
  position: PlayerPositionGroup;
  marketValue: number;
  status: PlayerStatus;
};

export type TransferMarketSnapshot = {
  dataSource: "DATABASE" | "UNAVAILABLE";
  season: {
    id: string | null;
    name: string;
  };
  phase: PlayerListPhase;
  activeVersion: PlayerListVersionRecord | null;
  players: readonly TransferMarketPlayer[];
  hiddenLeftBundesliga: boolean;
  developerMode: boolean;
};

export class PlayerService {
  constructor(
    private readonly playerRepository: PlayerRepository = new PrismaPlayerRepository(),
  ) {}

  async loadPlayerMaster(): Promise<PlayerMasterSnapshot> {
    const [season, players] = await Promise.all([
      this.playerRepository.loadActiveSeason(),
      this.playerRepository.loadPlayers(),
    ]);

    const currentSeason = season?.name ?? "Keine aktive Saison";
    const databaseStatus = players ? "CONNECTED" : "UNAVAILABLE";
    const [managerCounts, openChanges] = season
      ? await Promise.all([
          loadManagersUnderContractByPlayerId(season.id),
          loadOpenPlayerMasterChangesByPlayerId(season.id),
        ])
      : [new Map<string, number>(), new Map<string, string>()];
    const playerCards = (players ?? []).map((player) => ({
      ...player,
      currentSeason,
      hasOpenChange: openChanges.has(player.id),
      managersUnderContract: managerCounts.get(player.id) ?? 0,
      openChangeLabel: openChanges.get(player.id) ?? null,
    }));

    return {
      currentSeason,
      databaseStatus,
      importedPlayers: playerCards.length,
      lastImport: playerCards.length > 0 ? "Prisma Player Master" : "Kein Import",
      players: playerCards,
      clubs: getUniqueSortedValues(playerCards.map((player) => player.bundesligaClub)),
      statuses: getUniqueSortedValues(playerCards.map((player) => player.status)),
      positionGroups: ["TW", "AB", "MF", "ST"],
    };
  }

  async loadTransferMarket(input: {
    phase?: PlayerListPhase;
    developerMode?: boolean;
  } = {}): Promise<TransferMarketSnapshot> {
    const phase = input.phase ?? "SUMMER";
    const season = await this.playerRepository.loadActiveSeason();

    if (!season) {
      return {
        dataSource: "UNAVAILABLE",
        season: {
          id: null,
          name: "Keine aktive Saison",
        },
        phase,
        activeVersion: null,
        players: [],
        hiddenLeftBundesliga: !input.developerMode,
        developerMode: input.developerMode ?? false,
      };
    }

    const [activeVersion, players] = await Promise.all([
      this.playerRepository.loadLatestPlayerListVersion(season.id, phase),
      this.playerRepository.loadTransferMarketPlayers({
        seasonId: season.id,
        phase,
        includeLeftBundesliga: input.developerMode,
      }),
    ]);

    return {
      dataSource: players && activeVersion ? "DATABASE" : "UNAVAILABLE",
      season,
      phase,
      activeVersion,
      players: (players ?? []).map((player) => ({
        id: player.id,
        displayName: player.displayName,
        club: player.bundesligaClub,
        position: player.positionGroup,
        marketValue: player.marketValue,
        status: player.status,
      })),
      hiddenLeftBundesliga: !input.developerMode,
      developerMode: input.developerMode ?? false,
    };
  }
}

export async function loadPlayerMaster() {
  const service = new PlayerService();

  return service.loadPlayerMaster();
}

export async function loadTransferMarket(input: {
  phase?: PlayerListPhase;
  developerMode?: boolean;
} = {}) {
  const service = new PlayerService();

  return service.loadTransferMarket(input);
}

function getUniqueSortedValues<T extends string>(values: readonly T[]): readonly T[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

async function loadManagersUnderContractByPlayerId(seasonId: string) {
  const prisma = getPrismaClient();
  const counts = new Map<string, number>();

  if (!prisma) {
    return counts;
  }

  const assignments = await prisma.squadAssignment.findMany({
    where: {
      managerSeason: {
        seasonId,
        status: "ACTIVE",
        participation: "ACTIVE",
      },
      OR: [{ validToMatchday: null }, { validToMatchday: { gte: 1 } }],
    },
    select: {
      managerSeasonId: true,
      playerId: true,
    },
  });
  const seen = new Set<string>();

  for (const assignment of assignments) {
    const key = `${assignment.playerId}:${assignment.managerSeasonId ?? ""}`;

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    counts.set(assignment.playerId, (counts.get(assignment.playerId) ?? 0) + 1);
  }

  return counts;
}

async function loadOpenPlayerMasterChangesByPlayerId(seasonId: string) {
  const prisma = getPrismaClient();
  const changes = new Map<string, string>();

  if (!prisma) {
    return changes;
  }

  const draftChanges = await prisma.playerMasterChange.findMany({
    where: {
      status: "DRAFT",
      batch: {
        seasonId,
        status: "DRAFT",
      },
    },
    orderBy: { createdAt: "desc" },
  });

  for (const change of draftChanges) {
    if (!changes.has(change.playerId)) {
      changes.set(change.playerId, formatOpenChangeLabel(change.type));
    }
  }

  return changes;
}

function formatOpenChangeLabel(type: string) {
  if (type === "STATUS_CHANGE") {
    return "Status";
  }

  if (type === "CLUB_CHANGE") {
    return "Verein";
  }

  if (type === "MARKET_VALUE_CHANGE") {
    return "Marktwert";
  }

  return "Position";
}

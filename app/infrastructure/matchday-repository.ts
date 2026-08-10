import {
  operationalMatchdayLifecycleFixture,
  visibleMatchday17Version,
} from "@/domain/matchday-lifecycle";
import type {
  JsonValue,
  MatchdayLifecycleStatus,
  MatchdayVersion,
  OperationalMatchdayLifecycleSnapshot,
} from "@/domain/matchday-lifecycle";
import type { OfficialMatchdayResult } from "@/domain/matchday-engine";
import { getPrismaClient } from "./prisma";

export type MatchdayIdentity = {
  seasonId: string;
  competitionId: string;
  matchday: number;
};

export type PersistedMatchdayLifecycle = {
  seasonId: string;
  competitionId: string;
  matchday: number;
  status: MatchdayLifecycleStatus;
  latestVersionId: string | null;
  lastCalculationAt: string | null;
  lastPublishedAt: string | null;
  correctionPending: boolean;
  correctionReason: string | null;
  correctionPlanJson: JsonValue | null;
};

export type PersistedMatchdayVersion = MatchdayVersion & {
  lifecycleId?: string;
  officialMatchdayJson?: JsonValue;
};

export type SaveMatchdayVersionInput = {
  lifecycleId?: string;
  version: MatchdayVersion;
};

export type SaveOfficialMatchdayInput = {
  version: MatchdayVersion;
  officialMatchday: OfficialMatchdayResult | JsonValue;
};

export type SaveCalculationSnapshotInput = {
  version: MatchdayVersion;
  calculationSnapshotJson: JsonValue;
};

export interface MatchdayRepository {
  loadCurrentMatchday(): Promise<OperationalMatchdayLifecycleSnapshot | null>;
  loadMatchday(
    identity: MatchdayIdentity,
  ): Promise<OperationalMatchdayLifecycleSnapshot | null>;
  loadLatestVersion(identity: MatchdayIdentity): Promise<MatchdayVersion | null>;
  loadLifecycle(
    identity: MatchdayIdentity,
  ): Promise<PersistedMatchdayLifecycle | null>;
  saveVersion(input: SaveMatchdayVersionInput): Promise<MatchdayVersion>;
  saveOfficialMatchday(
    input: SaveOfficialMatchdayInput,
  ): Promise<PersistedMatchdayVersion>;
  saveCalculationSnapshot(
    input: SaveCalculationSnapshotInput,
  ): Promise<MatchdayVersion>;
}

export class FixtureMatchdayRepository implements MatchdayRepository {
  private snapshot: OperationalMatchdayLifecycleSnapshot;

  constructor(snapshot = operationalMatchdayLifecycleFixture) {
    this.snapshot = snapshot;
  }

  async loadCurrentMatchday(): Promise<OperationalMatchdayLifecycleSnapshot | null> {
    return this.snapshot;
  }

  async loadMatchday(
    identity: MatchdayIdentity,
  ): Promise<OperationalMatchdayLifecycleSnapshot | null> {
    if (!matchesSnapshot(identity, this.snapshot)) {
      return null;
    }

    return this.snapshot;
  }

  async loadLatestVersion(
    identity: MatchdayIdentity,
  ): Promise<MatchdayVersion | null> {
    if (!matchesSnapshot(identity, this.snapshot)) {
      return null;
    }

    return visibleMatchday17Version ?? this.snapshot.currentVersion;
  }

  async loadLifecycle(
    identity: MatchdayIdentity,
  ): Promise<PersistedMatchdayLifecycle | null> {
    if (!matchesSnapshot(identity, this.snapshot)) {
      return null;
    }

    return mapLifecycleSnapshotToPersistence(this.snapshot);
  }

  async saveVersion(input: SaveMatchdayVersionInput): Promise<MatchdayVersion> {
    this.snapshot = {
      ...this.snapshot,
      currentStatus: input.version.status,
      currentVersion: input.version,
      versions: [...this.snapshot.versions, input.version],
      lastCalculationAt:
        input.version.calculationSnapshotJson === undefined
          ? this.snapshot.lastCalculationAt
          : input.version.createdAt,
      lastPublishedAt: input.version.publishedAt ?? this.snapshot.lastPublishedAt,
    };

    return input.version;
  }

  async saveOfficialMatchday(
    input: SaveOfficialMatchdayInput,
  ): Promise<PersistedMatchdayVersion> {
    return {
      ...input.version,
      officialMatchdayJson: toJsonValue(input.officialMatchday),
    };
  }

  async saveCalculationSnapshot(
    input: SaveCalculationSnapshotInput,
  ): Promise<MatchdayVersion> {
    return {
      ...input.version,
      calculationSnapshotJson: input.calculationSnapshotJson,
    };
  }
}

type PrismaFindFirstArgs = {
  where?: Record<string, unknown>;
  orderBy?: Record<string, unknown>;
  include?: Record<string, unknown>;
};

type PrismaMatchdayClient = {
  season: {
    findFirst(args: PrismaFindFirstArgs): Promise<PrismaSeasonRecord | null>;
  };
  competition: {
    findFirst(args: PrismaFindFirstArgs): Promise<PrismaCompetitionRecord | null>;
  };
  matchdayLifecycle: {
    findFirst(args: PrismaFindFirstArgs): Promise<PrismaLifecycleRecord | null>;
  };
};

type PrismaSeasonRecord = {
  id: string;
  name: string;
};

type PrismaCompetitionRecord = {
  id: string;
  name: string;
};

type PrismaLifecycleRecord = {
  seasonId: string;
  competitionId: string;
  matchday: number;
  status: MatchdayLifecycleStatus;
  latestVersionId: string | null;
  lastCalculationAt: Date | string | null;
  lastPublishedAt: Date | string | null;
  correctionPending: boolean;
  correctionReason: string | null;
  correctionPlanJson: JsonValue | null;
  versions: readonly PrismaVersionRecord[];
  latestVersion?: PrismaVersionRecord | null;
  season?: PrismaSeasonRecord | null;
  competition?: PrismaCompetitionRecord | null;
};

type PrismaVersionRecord = {
  id: string;
  seasonId: string;
  competitionId: string;
  matchday: number;
  versionNumber: number;
  status: MatchdayLifecycleStatus;
  createdAt: Date | string;
  createdBy: string | null;
  reason: string | null;
  calculationSnapshotJson: JsonValue | null;
  publishedAt: Date | string | null;
};

export class PrismaMatchdayRepository implements MatchdayRepository {
  constructor(
    private readonly prisma: PrismaMatchdayClient | null = getPrismaClient() as PrismaMatchdayClient | null,
  ) {}

  async loadCurrentMatchday(): Promise<OperationalMatchdayLifecycleSnapshot | null> {
    if (!this.prisma) {
      return null;
    }

    try {
      const activeSeason = await this.prisma.season.findFirst({
        where: { status: "ACTIVE" },
        orderBy: { yearStart: "desc" },
      });

      if (!activeSeason) {
        return null;
      }

      const activeCompetition = await this.prisma.competition.findFirst({
        where: {
          seasonId: activeSeason.id,
          status: "ACTIVE",
        },
        orderBy: { type: "asc" },
      });

      if (!activeCompetition) {
        return null;
      }

      const lifecycle = await this.prisma.matchdayLifecycle.findFirst({
        where: {
          seasonId: activeSeason.id,
          competitionId: activeCompetition.id,
        },
        orderBy: { matchday: "desc" },
        include: {
          latestVersion: true,
          versions: {
            orderBy: { versionNumber: "asc" },
          },
          season: true,
          competition: true,
        },
      });

      if (!lifecycle) {
        return null;
      }

      return mapPrismaLifecycleToSnapshot(lifecycle);
    } catch {
      return null;
    }
  }

  async loadMatchday(
    identity: MatchdayIdentity,
  ): Promise<OperationalMatchdayLifecycleSnapshot | null> {
    if (!this.prisma) {
      return null;
    }

    try {
      const lifecycle = await this.prisma.matchdayLifecycle.findFirst({
        where: identity,
        include: {
          latestVersion: true,
          versions: {
            orderBy: { versionNumber: "asc" },
          },
          season: true,
          competition: true,
        },
      });

      if (!lifecycle) {
        return null;
      }

      return mapPrismaLifecycleToSnapshot(lifecycle);
    } catch {
      return null;
    }
  }

  async loadLatestVersion(
    identity: MatchdayIdentity,
  ): Promise<MatchdayVersion | null> {
    const snapshot = await this.loadMatchday(identity);

    return snapshot?.currentVersion ?? null;
  }

  async loadLifecycle(
    identity: MatchdayIdentity,
  ): Promise<PersistedMatchdayLifecycle | null> {
    const snapshot = await this.loadMatchday(identity);

    if (!snapshot) {
      return null;
    }

    return mapLifecycleSnapshotToPersistence(snapshot);
  }

  async saveVersion(input: SaveMatchdayVersionInput): Promise<MatchdayVersion> {
    return new FixtureMatchdayRepository().saveVersion(input);
  }

  async saveOfficialMatchday(
    input: SaveOfficialMatchdayInput,
  ): Promise<PersistedMatchdayVersion> {
    return new FixtureMatchdayRepository().saveOfficialMatchday(input);
  }

  async saveCalculationSnapshot(
    input: SaveCalculationSnapshotInput,
  ): Promise<MatchdayVersion> {
    return new FixtureMatchdayRepository().saveCalculationSnapshot(input);
  }
}

export function mapLifecycleSnapshotToPersistence(
  snapshot: OperationalMatchdayLifecycleSnapshot,
): PersistedMatchdayLifecycle {
  return {
    seasonId: snapshot.currentVersion.seasonId,
    competitionId: snapshot.currentVersion.competitionId,
    matchday: snapshot.matchday,
    status: snapshot.currentStatus,
    latestVersionId: snapshot.currentVersion.id,
    lastCalculationAt: snapshot.lastCalculationAt ?? null,
    lastPublishedAt: snapshot.lastPublishedAt ?? null,
    correctionPending: snapshot.correctionPending,
    correctionReason: snapshot.correctionReason ?? null,
    correctionPlanJson: snapshot.correctionPropagationPlan ?? null,
  };
}

export function mapMatchdayVersionToPersistence(
  version: MatchdayVersion,
  lifecycleId?: string,
): PersistedMatchdayVersion {
  return {
    ...version,
    lifecycleId,
  };
}

function matchesSnapshot(
  identity: MatchdayIdentity,
  snapshot: OperationalMatchdayLifecycleSnapshot,
) {
  return (
    identity.seasonId === snapshot.currentVersion.seasonId &&
    identity.competitionId === snapshot.currentVersion.competitionId &&
    identity.matchday === snapshot.matchday
  );
}

function toJsonValue(value: OfficialMatchdayResult | JsonValue): JsonValue {
  return value as JsonValue;
}

function mapPrismaLifecycleToSnapshot(
  lifecycle: PrismaLifecycleRecord,
): OperationalMatchdayLifecycleSnapshot | null {
  const versions = lifecycle.versions.map(mapPrismaVersion);
  const currentVersion =
    lifecycle.latestVersion === null || lifecycle.latestVersion === undefined
      ? versions.at(-1)
      : mapPrismaVersion(lifecycle.latestVersion);

  if (!currentVersion) {
    return null;
  }

  return {
    seasonName: lifecycle.season?.name ?? lifecycle.seasonId,
    competitionName: lifecycle.competition?.name ?? lifecycle.competitionId,
    matchday: lifecycle.matchday,
    currentStatus: lifecycle.status,
    currentVersion,
    versions,
    versionHistory: versions.map((version) => ({
      versionNumber: version.versionNumber,
      title: createVersionHistoryTitle(version.status),
      status: version.status,
      createdAt: version.createdAt,
      reason: version.reason ?? "Persisted matchday version.",
    })),
    lastCalculationAt: toIsoString(lifecycle.lastCalculationAt),
    lastPublishedAt: toIsoString(lifecycle.lastPublishedAt),
    correctionPending: lifecycle.correctionPending,
    correctionReason: lifecycle.correctionReason ?? undefined,
    correctionPropagationPlan:
      lifecycle.correctionPlanJson === null
        ? undefined
        : (lifecycle.correctionPlanJson as OperationalMatchdayLifecycleSnapshot["correctionPropagationPlan"]),
  };
}

function mapPrismaVersion(version: PrismaVersionRecord): MatchdayVersion {
  return {
    id: version.id,
    seasonId: version.seasonId,
    competitionId: version.competitionId,
    matchday: version.matchday,
    versionNumber: version.versionNumber,
    status: version.status,
    createdAt: toIsoString(version.createdAt) ?? new Date(0).toISOString(),
    createdBy: version.createdBy ?? undefined,
    reason: version.reason ?? undefined,
    calculationSnapshotJson: version.calculationSnapshotJson ?? undefined,
    publishedAt: toIsoString(version.publishedAt),
  };
}

function toIsoString(value: Date | string | null | undefined) {
  if (!value) {
    return undefined;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return value;
}

function createVersionHistoryTitle(status: MatchdayLifecycleStatus) {
  switch (status) {
    case "CALCULATED":
      return "Berechnung";
    case "PRELIMINARY_PUBLISHED":
    case "PUBLISHED_PRELIMINARY":
      return "Vorläufig veröffentlicht";
    case "MANUAL_REVIEW_CONFIRMED":
      return "Malusprüfung bestätigt";
    case "CORRECTIONS_CONFIRMED":
      return "Korrekturen bestätigt";
    case "REOPENED":
      return "Zur Korrektur geöffnet";
    case "OFFICIALLY_CLOSED":
    case "PUBLISHED_OFFICIAL":
      return "Offiziell veröffentlicht";
    case "ARCHIVED":
      return "Archiviert";
    case "DATA_ENTERED":
    case "DATA_ENTRY_COMPLETE":
      return "Datenerfassung abgeschlossen";
    case "DATA_ENTRY_OPEN":
      return "Datenerfassung geöffnet";
    case "DRAFT":
      return "Entwurf";
  }
}

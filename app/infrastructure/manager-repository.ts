import { getPrismaClient } from "./prisma";

export type ManagerRecord = {
  id: string;
  displayName: string;
  shortName: string;
  status: "ACTIVE" | "PAUSED" | "ARCHIVED";
  createdAt: Date;
};

export interface ManagerRepository {
  findByShortName(shortName: string): Promise<ManagerRecord | null>;
  loadManagers(): Promise<readonly ManagerRecord[] | null>;
}

export class PrismaManagerRepository implements ManagerRepository {
  private readonly prisma = getPrismaClient();

  async findByShortName(shortName: string): Promise<ManagerRecord | null> {
    if (!this.prisma) {
      return null;
    }

    try {
      const manager = await this.prisma.manager.findUnique({
        where: { shortName },
      });

      return manager ? mapManager(manager) : null;
    } catch {
      return null;
    }
  }

  async loadManagers(): Promise<readonly ManagerRecord[] | null> {
    if (!this.prisma) {
      return null;
    }

    try {
      const managers = await this.prisma.manager.findMany({
        orderBy: { displayName: "asc" },
      });

      return managers.map(mapManager);
    } catch {
      return null;
    }
  }
}

function mapManager(manager: {
  id: string;
  displayName: string;
  shortName: string;
  status: ManagerRecord["status"];
  createdAt: Date;
}): ManagerRecord {
  return {
    id: manager.id,
    displayName: manager.displayName,
    shortName: manager.shortName,
    status: manager.status,
    createdAt: manager.createdAt,
  };
}

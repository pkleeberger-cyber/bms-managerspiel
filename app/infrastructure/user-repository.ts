import { getPrismaClient } from "./prisma";

export type UserRole = "ADMIN" | "DATA_MAINTAINER" | "MANAGER";
export type UserStatus = "ACTIVE" | "INVITED" | "DISABLED";

export type LinkedManagerRecord = {
  id: string;
  displayName: string;
  shortName: string;
};

export type UserRecord = {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  status: UserStatus;
  manager: LinkedManagerRecord | null;
  createdAt: Date;
};

export type CreateInvitedUserInput = {
  email: string;
  displayName: string;
  role: UserRole;
};

export type LinkUserToManagerInput = {
  userId: string;
  managerId: string;
};

export interface UserRepository {
  createInvitedUser(input: CreateInvitedUserInput): Promise<UserRecord>;
  findUnlinkedManagers(): Promise<readonly LinkedManagerRecord[] | null>;
  linkUserToManager(input: LinkUserToManagerInput): Promise<UserRecord>;
  listUsers(): Promise<readonly UserRecord[] | null>;
  unlinkUserFromManager(userId: string): Promise<UserRecord>;
}

export class PrismaUserRepository implements UserRepository {
  private readonly prisma = getPrismaClient();

  async listUsers(): Promise<readonly UserRecord[] | null> {
    if (!this.prisma) {
      return null;
    }

    try {
      const users = await this.prisma.user.findMany({
        include: { manager: true },
        orderBy: [{ role: "asc" }, { displayName: "asc" }],
      });

      return users.map(mapUserRecord);
    } catch {
      return null;
    }
  }

  async findUnlinkedManagers(): Promise<readonly LinkedManagerRecord[] | null> {
    if (!this.prisma) {
      return null;
    }

    try {
      const [managers, linkedUsers] = await Promise.all([
        this.prisma.manager.findMany({
          orderBy: { displayName: "asc" },
        }),
        this.prisma.user.findMany({
          where: { managerId: { not: null } },
          select: { managerId: true },
        }),
      ]);
      const linkedManagerIds = new Set(
        linkedUsers.flatMap((user) => (user.managerId ? [user.managerId] : [])),
      );

      return managers
        .filter((manager) => !linkedManagerIds.has(manager.id))
        .map((manager) => ({
          id: manager.id,
          displayName: manager.displayName,
          shortName: manager.shortName,
        }));
    } catch {
      return null;
    }
  }

  async createInvitedUser(input: CreateInvitedUserInput): Promise<UserRecord> {
    if (!this.prisma) {
      throw new Error("Prisma User store is not available.");
    }

    try {
      const user = await this.prisma.user.create({
        data: {
          email: input.email,
          displayName: input.displayName,
          role: input.role,
          status: "INVITED",
        },
        include: { manager: true },
      });

      return mapUserRecord(user);
    } catch (error) {
      if (isKnownPrismaError(error, "P2002")) {
        throw new Error("Benutzer mit dieser E-Mail existiert bereits.");
      }

      throw error;
    }
  }

  async linkUserToManager(input: LinkUserToManagerInput): Promise<UserRecord> {
    if (!this.prisma) {
      throw new Error("Prisma User store is not available.");
    }

    const user = await this.prisma.user.update({
      where: { id: input.userId },
      data: { managerId: input.managerId },
      include: { manager: true },
    });

    return mapUserRecord(user);
  }

  async unlinkUserFromManager(userId: string): Promise<UserRecord> {
    if (!this.prisma) {
      throw new Error("Prisma User store is not available.");
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { managerId: null },
      include: { manager: true },
    });

    return mapUserRecord(user);
  }
}

function mapUserRecord(user: {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  status: UserStatus;
  createdAt: Date;
  manager: LinkedManagerRecord | null;
}): UserRecord {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    status: user.status,
    manager: user.manager
      ? {
          id: user.manager.id,
          displayName: user.manager.displayName,
          shortName: user.manager.shortName,
        }
      : null,
    createdAt: user.createdAt,
  };
}

function isKnownPrismaError(error: unknown, code: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === code
  );
}
